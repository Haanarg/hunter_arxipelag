import {diffCoopState} from '../src/coop-state-delta.mjs';
import {writeCoopCheckpoint,readCoopCheckpoint} from './coop-checkpoint.mjs';
import {generateNativeMission,nativeFingerprint} from './coop-native.mjs';
import {combatCommands,personalWeapons,inventoryCaps} from '../src/weapon-catalog.mjs';
import {readCoopRoom} from './coop-room-state.mjs';
import {generateRelayMission,restoreRelayMission,MISSION_VERSION} from './coop-mission.mjs';
import {GAME_VERSION} from '../src/version.mjs';
import {validatePlayerInput} from '../src/player-simulation.mjs';

// Private lobby and reduced authoritative two-player relay mission.
export class CoopRoomHub {
  constructor(ctx,env){
    this.ctx=ctx;this.env=env;this.stateBaselines=new WeakMap();this.queue=Promise.resolve();this.votes=new Map();this.mission=null;this.record=null;this.geometry=null;this.checkedAt=0;this.nativeVotes=new Map();this.nativeUpload=null;
    // Rate limits per connexió en memòria efímera (també si el DO hiberna).
    // L'attachment continua reservat a la identitat i a la verificació.
    this.inputRates=new WeakMap();this.combatRates=new WeakMap();this.pingRates=new WeakMap();
    this.frameMetrics={tickMs:0,saveMs:0,broadcastMs:0,tick:0};
    this.loading=ctx.blockConcurrencyWhile(async()=>{
      const record=await readCoopCheckpoint(ctx.storage);
      if(record){
        if(record.meta.generator===MISSION_VERSION&&record.meta.gameVersion===GAME_VERSION&&record.meta.expiresAt>Date.now()){
          this.geometry=await ctx.storage.get('world');if(this.geometry?.nativeChunks){let text='';for(let i=0;i<this.geometry.nativeChunks;i++)text+=await ctx.storage.get('native-world:'+i);this.geometry=JSON.parse(text);}
          this.mission=restoreRelayMission(record,this.geometry);this.record=record;
        }else{await ctx.storage.delete(['mission','world']);await ctx.storage.deleteAlarm();}
      }
    });
  }
  serial(fn){const task=this.queue.then(()=>this.loading).then(fn);this.queue=task.catch(()=>{});return task;}
  rateAllowed(table,ws,now,max){
    let entry=table.get(ws);
    if(!entry||now-entry.since>=1000||now<entry.since){
      entry={since:now,count:0};table.set(ws,entry);
    }
    entry.count++;
    return entry.count<=max;
  }
  fetch(request){return this.serial(()=>this.fetchInner(request));}
  webSocketMessage(ws,message){return this.serial(()=>this.messageInner(ws,message));}
  webSocketClose(ws,code,reason){return this.serial(()=>this.closeInner(ws,code,reason));}
  alarm(){return this.serial(async()=>{try{await this.frame();}catch(e){await this.ctx.storage.setAlarm(Date.now()+1000);throw e;}});}
  async authorized(ws){
    const a=ws.deserializeAttachment();
    if(!a||![a.actorId,a.sessionId,a.roomId].every(v=>typeof v==='string'&&v.length>0)||!Number.isFinite(a.expiresAt)||a.expiresAt<=Date.now())return null;
    const row=await this.env.DB.prepare(`SELECT s.expiresAt FROM session s JOIN hunter_access a ON a.owner=s.userId
      JOIN hunter_coop_members m ON m.owner=s.userId JOIN hunter_coop_rooms r ON r.id=m.room
      WHERE s.id=? AND s.userId=? AND a.status='approved' AND m.room=? AND r.expires_at>?`).bind(a.sessionId,a.actorId,a.roomId,Date.now()).first();
    if(!row||Number(row.expiresAt)<=Date.now())return null;
    return a;
  }
  send(ws,data){try{ws.send(JSON.stringify(data));if(data.type==='native-mission')this.stateBaselines.set(ws,{revision:0,state:data.state});return true;}catch(_){try{ws.close(1011,'Connexió interrompuda');}catch(_){}return false;}}
  async publish(){
    for(const ws of this.ctx.getWebSockets()){
      if(ws.readyState!==1)continue;
      const a=await this.authorized(ws);
      if(!a){this.send(ws,{type:'room',room:null});ws.close(4003,'Accés finalitzat');continue;}
      const room=await readCoopRoom(this.env,a.actorId);
      if(!room||room.id!==a.roomId){if(this.mission)await this.abort('La sala s’ha tancat.');this.send(ws,{type:'room',room:null});ws.close(4004,'Sala tancada');continue;}
      if(this.mission&&!this.matches(room))await this.abort('La sala ha canviat. Cal tornar a preparar la missió.');
      this.send(ws,{type:'room',room});
    }
  }
  async fetchInner(request){
    const path=new URL(request.url).pathname;
    if(path==='/notify'&&request.method==='POST'){await this.publish();return new Response(null,{status:204});}
    if(path!=='/connect'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('Not found',{status:404});
    const a={actorId:request.headers.get('X-Coop-Actor'),sessionId:request.headers.get('X-Coop-Session'),roomId:request.headers.get('X-Coop-Room'),expiresAt:Number(request.headers.get('X-Coop-Expiry')),window:Date.now(),count:0};
    // Headers come only from the authenticated Worker, but recheck against D1.
    if(!await this.authorized({deserializeAttachment:()=>a}))return new Response('Forbidden',{status:403});
    const pair=new WebSocketPair(),[client,server]=Object.values(pair);
    for(const ws of this.ctx.getWebSockets())if(ws.readyState===1&&ws.deserializeAttachment()?.actorId===a.actorId)ws.close(4001,'Connexió substituïda');
    this.ctx.acceptWebSocket(server);server.serializeAttachment(a);
    await this.env.DB.prepare('UPDATE hunter_coop_members SET last_seen=? WHERE owner=? AND room=?').bind(Date.now(),a.actorId,a.roomId).run();
    await this.publish();
    return new Response(null,{status:101,webSocket:client});
  }
  async messageInner(ws,message){
    if(ws.readyState!==1)return;
    let body;
    try{if(typeof message!=='string'||message.length>65000)throw Error();body=JSON.parse(message);if(!body||Array.isArray(body)||body.protocol!==1)throw Error();}
    catch(_){ws.close(1008,'Missatge invàlid');return;}
    const a=ws.deserializeAttachment(),now=Date.now();if(!a){ws.close(4003,'Accés finalitzat');return;}
    if(body.type==='native-world'||body.type==='native-ready'){try{await this.nativeMessage(ws,body);}catch(error){this.send(ws,{type:'error',message:error.message||'No s’ha pogut preparar el món original.'});}return;}
    if(message.length>1024){ws.close(1008,'Missatge massa gran');return;}
    if(body.type==='input'){
      if(!a.gameClient||a.gameVersion!==GAME_VERSION||Object.keys(body).length!==6||typeof body.interact!=='boolean'||!validatePlayerInput(body.input)||!Number.isSafeInteger(body.sequence)||body.sequence<1){ws.close(1008,'Entrada invàlida');return;}
      if(!this.rateAllowed(this.inputRates,ws,now,45)){ws.close(1008,'Massa entrades');return;}
      if(!await this.verify(ws)){ws.close(4003,'Accés finalitzat');return;}
      if(this.mission&&body.epoch===this.mission.meta.id)this.mission.accept(a.actorId,body);
      return;
    }
    if(body.type==='combat'){
      if(!a.gameClient||a.gameVersion!==GAME_VERSION||![5,6].includes(Object.keys(body).length)||Object.keys(body).some(k=>!['type','protocol','epoch','weapon','commandId','power','seconds'].includes(k))||(body.seconds!==undefined&&(body.weapon!=='c4'||!Number.isInteger(body.seconds)||body.seconds<0||body.seconds>59))||(body.power!==undefined&&(body.weapon!=='grenade'||!Number.isFinite(body.power)||body.power<0||body.power>1))||typeof body.epoch!=='string'||body.epoch.length>64||!combatCommands.includes(body.weapon)||typeof body.commandId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(body.commandId)){ws.close(1008,'Ordre de combat invàlida');return;}
      if(!this.rateAllowed(this.combatRates,ws,now,12)){ws.close(1008,'Massa ordres de combat');return;}
      if(!await this.verify(ws)){ws.close(4003,'Accés finalitzat');return;}
      if(!this.mission||body.epoch!==this.mission.meta.id){this.send(ws,{type:'action',kind:'combat',commandId:body.commandId,ok:false,code:'NOT_ACTIVE'});return;}
      try{const result=this.mission.combatCommand(a.actorId,body);await this.save(this.record.nextAlarm);this.broadcastState();this.send(ws,{type:'action',...result});}
      catch(_){if(this.record)this.mission=restoreRelayMission(this.record,this.geometry);this.send(ws,{type:'action',kind:'combat',commandId:body.commandId,ok:false,code:'SAVE_FAILED'});}return;
    }
    if(body.type==='latency-ping'){
      const valid=Object.keys(body).length===5&&a.gameClient&&a.gameVersion===GAME_VERSION&&
        body.epoch===this.mission?.meta.id&&Number.isSafeInteger(body.nonce)&&body.nonce>=1&&
        Number.isSafeInteger(body.clientTime)&&body.clientTime>=0;
      if(!valid){ws.close(1008,'Sonda invàlida');return;}
      if(!this.rateAllowed(this.pingRates,ws,now,2)){ws.close(1008,'Massa sondes');return;}
      if(!await this.verify(ws)){ws.close(4003,'Accés finalitzat');return;}
      this.send(ws,{type:'latency-pong',nonce:body.nonce,clientTime:body.clientTime,
        server:{...this.frameMetrics}});
      return;
    }
    if(now-a.window>=60000){a.window=now;a.count=0;}a.count++;ws.serializeAttachment(a);
    if(a.count>120){ws.close(1008,'Massa missatges');return;}
    if(!await this.verify(ws,true)){ws.close(4003,'Accés finalitzat');return;}
    if(body.type==='hello'&&Object.keys(body).length===3){
      if(body.gameVersion!==GAME_VERSION){this.send(ws,{type:'error',message:'Cal recarregar la pàgina per actualitzar el joc.'});ws.close(4005,'Versió incompatible');return;}
      this.votes.delete(a.actorId);const attachment=ws.deserializeAttachment();attachment.gameClient=true;attachment.gameVersion=GAME_VERSION;ws.serializeAttachment(attachment);
      await this.env.DB.prepare('UPDATE hunter_coop_members SET last_seen=? WHERE owner=? AND room=?').bind(now,a.actorId,a.roomId).run();
      await this.publish();if(this.mission){this.send(ws,this.setupClient(a.actorId));await this.wake();}return;
    }
    if(body.type==='inventory'){
      if(!a.gameClient||a.gameVersion!==GAME_VERSION||Object.keys(body).length!==6||!['drop','disguise','weapon','use'].includes(body.operation)||(body.operation==='use'?body.target!=='medkits':body.operation==='drop'?!Object.hasOwn(inventoryCaps,body.target):body.operation==='weapon'?!personalWeapons.includes(body.target):typeof body.target!=='boolean')||typeof body.commandId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(body.commandId)){ws.close(1008,'Ordre d’inventari invàlida');return;}
      if(!this.mission||body.epoch!==this.mission.meta.id){this.send(ws,{type:'action',commandId:body.commandId,ok:false,code:'NOT_ACTIVE'});return;}
      try{const result=this.mission.inventoryCommand(a.actorId,body);await this.save(this.record.nextAlarm);this.broadcastState();this.send(ws,{type:'action',...result});}
      catch(_){if(this.record)this.mission=restoreRelayMission(this.record,this.geometry);this.send(ws,{type:'action',commandId:body.commandId,ok:false,code:'SAVE_FAILED'});}return;
    }
    if(body.type==='vehicle'){
      if(!a.gameClient||a.gameVersion!==GAME_VERSION||Object.keys(body).length!==6||typeof body.epoch!=='string'||body.epoch.length>64||typeof body.vehicleId!=='string'||body.vehicleId.length>64||!['enter','exit'].includes(body.operation)||typeof body.commandId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(body.commandId)){ws.close(1008,'Ordre de vehicle invàlida');return;}
      if(!this.mission||body.epoch!==this.mission.meta.id){this.send(ws,{type:'action',kind:'vehicle',commandId:body.commandId,ok:false,code:'NOT_ACTIVE'});return;}
      try{const result=this.mission.vehicleCommand(a.actorId,body);await this.save(this.record.nextAlarm);this.broadcastState();this.send(ws,{type:'action',...result});}
      catch(_){if(this.record)this.mission=restoreRelayMission(this.record,this.geometry);this.send(ws,{type:'action',kind:'vehicle',commandId:body.commandId,ok:false,code:'SAVE_FAILED'});}return;
    }
    if(body.type==='door'){
      if(!a.gameClient||a.gameVersion!==GAME_VERSION||Object.keys(body).length!==6||typeof body.doorId!=='string'||body.doorId.length>200||typeof body.open!=='boolean'||typeof body.commandId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(body.commandId)){ws.close(1008,'Ordre de porta invàlida');return;}
      if(!this.mission||body.epoch!==this.mission.meta.id){this.send(ws,{type:'action',commandId:body.commandId,ok:false,code:'NOT_ACTIVE'});return;}
      try{
        const result=this.mission.doorCommand(a.actorId,body);await this.save(this.record.nextAlarm);this.broadcastState();this.send(ws,{type:'action',...result});
      }catch(_){if(this.record)this.mission=restoreRelayMission(this.record,this.geometry);this.send(ws,{type:'action',commandId:body.commandId,ok:false,code:'SAVE_FAILED'});}
      return;
    }
    if(body.type==='launch'&&[4,5].includes(Object.keys(body).length)&&Object.keys(body).every(k=>['type','protocol','gameVersion','revision','mode'].includes(k))&&(body.mode===undefined||['relay','proving','world'].includes(body.mode))&&a.gameClient&&body.gameVersion===GAME_VERSION){await this.launch(ws,body);return;}
    if(body.type!=='heartbeat'||Object.keys(body).length!==2){ws.close(1008,'Missatge invàlid');return;}
    await this.env.DB.prepare('UPDATE hunter_coop_members SET last_seen=? WHERE owner=? AND room=?').bind(now,a.actorId,a.roomId).run();
    await this.publish();if(this.mission)await this.wake();
  }

  setupClient(actorId){
    if(this.mission.meta.mode==='native')return {type:'native-mission',self:actorId,meta:structuredClone(this.mission.meta),state:this.mission.snapshot()};return this.mission.setup(actorId);
  }
  nativeRoom(actorId){return readCoopRoom(this.env,actorId);}
  async nativeMessage(ws,body){
    const a=await this.verify(ws);if(!a?.gameClient||a.gameVersion!==GAME_VERSION){ws.close(4003,'Sessió invàlida');return;}
    const now=Date.now();if(now-(a.nativeWindow||0)>60000){a.nativeWindow=now;a.nativeCount=0;}a.nativeCount=(a.nativeCount||0)+1;ws.serializeAttachment(a);if(a.nativeCount>400){ws.close(1008,'Massa dades de món');return;}
    const room=await this.nativeRoom(a.actorId);
    if(!room?.allReady||room.revision!==body.revision||!(/^[a-f0-9]{64}$/).test(body.fingerprint)){this.send(ws,{type:'error',message:'La sala o el món han canviat.'});return;}
    const keys=Object.keys(body),allowed=body.type==='native-world'?['type','protocol','revision','fingerprint','index','total','chunk']:['type','protocol','revision','fingerprint'];
    if(keys.length!==allowed.length||keys.some(k=>!allowed.includes(k))){ws.close(1008,'Ordre de món invàlida');return;}
    const key=room.id+':'+room.revision;
    if(body.type==='native-world'){
      if(room.host!==a.actorId||!Number.isInteger(body.index)||!Number.isInteger(body.total)||body.total<1||body.total>192||body.index<0||body.index>=body.total||typeof body.chunk!=='string'||body.chunk.length>45000){ws.close(1008,'Món invàlid');return;}
      if(this.mission?.meta.mode==='native'&&this.matches(room)&&this.mission.meta.fingerprint===body.fingerprint)return;

      const previous=await this.ctx.storage.get('native-upload');
      const upload=body.index===0?{key,fingerprint:body.fingerprint,total:body.total,received:0,expiresAt:Date.now()+300000}:previous;
      if(!upload||upload.key!==key||upload.fingerprint!==body.fingerprint||upload.total!==body.total||body.index!==upload.received||upload.expiresAt<Date.now()){this.send(ws,{type:'error',message:'Cal tornar a preparar el món.'});return;}
      upload.received++;await this.ctx.storage.transaction(async storage=>{await storage.put('native-prepare:'+body.index,body.chunk);await storage.put('native-upload',upload);});return;
    }
    a.nativeKey=key;a.nativeFingerprint=body.fingerprint;ws.serializeAttachment(a);
    if(!room.members.every(m=>this.games().some(client=>{const member=client.deserializeAttachment();return member.actorId===m.id&&member.nativeKey===key;})))return;
    if(!room.members.every(m=>this.games().some(client=>{const member=client.deserializeAttachment();return member.actorId===m.id&&member.nativeKey===key&&member.nativeFingerprint===body.fingerprint;}))){this.send(ws,{type:'error',message:'Els mons generats no coincideixen. Recarregueu tots dos.'});return;}

    if(this.mission?.meta.mode==='native'&&this.matches(room)&&this.mission.meta.fingerprint===body.fingerprint){this.send(ws,this.setupClient(a.actorId));await this.wake();return;}
    const upload=await this.ctx.storage.get('native-upload');if(!upload||upload.key!==key||upload.received!==upload.total||upload.expiresAt<Date.now()){this.send(ws,{type:'error',message:'Esperant el món de l’amfitrió.'});return;}
    let text='';for(let i=0;i<upload.total;i++)text+=await this.ctx.storage.get('native-prepare:'+i);
    if(await nativeFingerprint(text)!==body.fingerprint)throw Error('Identitat del món invàlida');
    const generated=generateNativeMission(room,JSON.parse(text),body.fingerprint),mission=restoreRelayMission(generated.record,generated.geometry),worldText=JSON.stringify(generated.geometry),chunks=[];
    for(let i=0;i<worldText.length;i+=45000)chunks.push(worldText.slice(i,i+45000));
    await this.ctx.storage.transaction(async storage=>{for(let i=0;i<chunks.length;i++)await storage.put('native-world:'+i,chunks[i]);await storage.put('world',{nativeChunks:chunks.length});await writeCoopCheckpoint(storage,generated.record);const obsolete=[...Array(upload.total).keys()].map(i=>'native-prepare:'+i).concat('native-upload');for(let i=0;i<obsolete.length;i+=128)await storage.delete(obsolete.slice(i,i+128));});
    this.mission=mission;this.record=generated.record;this.geometry=generated.geometry;this.nativeUpload=null;
    for(const client of this.games())this.send(client,this.setupClient(client.deserializeAttachment().actorId));await this.wake();
  }
  async closeInner(ws,code,reason){
    const a=ws.deserializeAttachment();if(a)this.votes.delete(a.actorId);
    if(a&&!this.ctx.getWebSockets().some(other=>other!==ws&&other.readyState===1&&other.deserializeAttachment()?.actorId===a.actorId))
      await this.env.DB.prepare('UPDATE hunter_coop_members SET last_seen=? WHERE owner=? AND room=?').bind(Date.now()-60000,a.actorId,a.roomId).run();
    await this.publish();
    if(this.mission&&!this.mission.meta.members.every(m=>this.games().some(s=>s.deserializeAttachment().actorId===m.id))){this.mission.setStatus('paused');await this.save(this.mission.meta.expiresAt);this.broadcastState();}
  }
  async verify(ws,force=false){
    const a=ws.deserializeAttachment();if(!a)return null;
    if(!force&&a.verifiedAt>Date.now()-1000&&a.expiresAt>Date.now())return a;
    const valid=await this.authorized(ws);if(!valid)return null;
    valid.verifiedAt=Date.now();ws.serializeAttachment(valid);return valid;
  }
  games(){return this.ctx.getWebSockets().filter(ws=>ws.readyState===1&&ws.deserializeAttachment()?.gameClient&&ws.deserializeAttachment()?.gameVersion===GAME_VERSION);}
  matches(room){return room&&room.id===this.mission.meta.roomId&&room.revision===this.mission.meta.revision&&room.members.length===2&&this.mission.meta.members.every(m=>room.members.some(r=>r.id===m.id));}
  broadcastState(){
    if(!this.mission)return;const state=this.mission.snapshot(),diffs=new Map();
    for(const ws of this.games()){
      if(this.mission.meta.mode!=='native'){this.send(ws,{type:'state',state});continue;}
      const baseline=this.stateBaselines.get(ws);
      if(!baseline||baseline.state.missionId!==state.missionId){this.send(ws,{type:'native-mission',self:ws.deserializeAttachment().actorId,meta:this.mission.meta,state,stateRevision:0});continue;}
      let delta=diffs.get(baseline.state);if(delta===undefined){delta=diffCoopState(baseline.state,state);diffs.set(baseline.state,delta);}if(!delta)continue;
      const revision=baseline.revision+1;if(this.send(ws,{type:'state-delta',missionId:state.missionId,baseRevision:baseline.revision,revision,delta}))this.stateBaselines.set(ws,{revision,state});
    }
  }
  async abort(message){
    const clients=this.games();await this.ctx.storage.delete(['mission','world']);await this.ctx.storage.deleteAlarm();
    this.mission=null;this.record=null;this.geometry=null;this.votes.clear();this.nativeVotes.clear();this.nativeUpload=null;
    for(const ws of clients)this.send(ws,{type:'ended',message});
  }
  async save(nextAlarm){
    const record=this.mission.checkpoint(nextAlarm);if(record.meta.mode==='native')await this.ctx.storage.transaction(storage=>writeCoopCheckpoint(storage,record));else await this.ctx.storage.put('mission',record);this.record=record;await this.ctx.storage.setAlarm(nextAlarm);
  }
  async wake(){if(this.mission){if(this.record?.status==='running'){await this.ctx.storage.setAlarm(Math.max(Date.now()+1,this.record.nextAlarm));return;}await this.save(Date.now()+1);}}
  async launch(ws,body){
    const a=ws.deserializeAttachment(),room=await readCoopRoom(this.env,a.actorId),mode=body.mode||'relay';
    if(!room||!room.allReady||body.revision!==room.revision){this.send(ws,{type:'error',message:'Calen dos jugadors preparats i una sala actualitzada.'});return;}
    if(mode==='relay'&&this.mission&&this.matches(room)&&(this.mission.meta.mode||'relay')===mode&&['relay','extract'].includes(this.mission.snapshot().phase)){this.send(ws,this.setupClient(a.actorId));await this.wake();return;}
    this.votes.set(a.actorId,room.revision+':'+mode);
    const games=this.games();
    if(!room.members.every(m=>this.votes.get(m.id)===room.revision+':'+mode&&games.some(s=>s.deserializeAttachment().actorId===m.id))){this.send(ws,{type:'waiting',message:'Esperant que el company també premi Iniciar missió.'});return;}
    for(const client of games)if(!await this.verify(client,true)){client.close(4003,'Accés finalitzat');return;}
    try{
      const generated=generateRelayMission(room,{mode}),mission=restoreRelayMission(generated.record,generated.geometry);
      await this.ctx.storage.transaction(async storage=>{await storage.put('world',generated.geometry);await writeCoopCheckpoint(storage,generated.record);const upload=await storage.get('native-upload');if(upload){const obsolete=[...Array(upload.total).keys()].map(i=>'native-prepare:'+i).concat('native-upload');for(let i=0;i<obsolete.length;i+=128)await storage.delete(obsolete.slice(i,i+128));}});
      this.mission=mission;this.geometry=generated.geometry;this.record=generated.record;this.checkedAt=0;this.nativeVotes=new Map();this.nativeUpload=null;this.votes.clear();
      for(const client of games)this.send(client,mission.setup(client.deserializeAttachment().actorId));await this.wake();
    }catch(e){for(const client of games)this.send(client,{type:'error',message:e.message||'No s’ha pogut iniciar la missió.'});}
  }
  async frame(){
    if(!this.mission){await this.ctx.storage.deleteAlarm();return;}
    const now=Date.now();if(now>=this.mission.meta.expiresAt){await this.abort('La sessió ha caducat. Podeu preparar una altra missió.');return;}
    // A duplicate/early alarm cannot apply a second batch of ticks.
    if(this.record.nextAlarm>now+10){await this.ctx.storage.setAlarm(this.record.nextAlarm);return;}
    const games=this.games(),members=this.mission.meta.members;
    if(now-this.checkedAt>=1000){
      for(const ws of games)if(!await this.verify(ws,true))ws.close(4003,'Accés finalitzat');
      const room=games[0]?await readCoopRoom(this.env,games[0].deserializeAttachment().actorId):null;
      if(games.length&& !this.matches(room)){await this.abort('La sala o els participants han canviat.');return;}
      this.checkedAt=now;
    }
    const live=this.games(),both=members.every(m=>live.some(ws=>ws.deserializeAttachment().actorId===m.id));
    try{
      const sampleStart=Date.now();
      const phase=this.mission.progress?this.mission.progress().phase:this.mission.snapshot().phase;
      this.mission.setStatus(both&&['relay','extract'].includes(phase)?'running':both?'finished':'paused');
      if(both)for(let i=0;i<3;i++)this.mission.step(false);
      const running=both&&['relay','extract'].includes(this.mission.progress?this.mission.progress().phase:this.mission.snapshot().phase);
      const afterTick=Date.now();
      await this.save(running?Math.max(Date.now()+1,this.record.nextAlarm+100):this.mission.meta.expiresAt);
      const afterSave=Date.now();
      this.broadcastState();
      const afterBroadcast=Date.now();
      this.frameMetrics={tickMs:Math.max(0,afterTick-sampleStart),
        saveMs:Math.max(0,afterSave-afterTick),
        broadcastMs:Math.max(0,afterBroadcast-afterSave),
        tick:this.record?.checkpoint?.tick??0};
    }catch(e){
      // Never broadcast a partially persisted result. Resume from the last commit.
      if(this.record)this.mission=restoreRelayMission(this.record,this.geometry);throw e;
    }
  }
  async webSocketError(ws){ws.close(1011,'Connexió interrompuda');}
}
export async function notifyCoopRoom(env,roomId){
  if(!env.COOP_ROOMS||!roomId)return;
  const id=env.COOP_ROOMS.idFromName(roomId);await env.COOP_ROOMS.get(id).fetch('https://coop.internal/notify',{method:'POST'});
}
