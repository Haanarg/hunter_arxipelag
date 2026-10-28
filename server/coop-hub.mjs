import {readCoopRoom} from './coop.mjs';
import {generateRelayMission,restoreRelayMission} from './coop-mission.mjs';
import {GAME_VERSION} from '../src/version.mjs';
import {validatePlayerInput} from '../src/player-simulation.mjs';

// Private lobby and reduced authoritative two-player relay mission.
export class CoopRoomHub {
  constructor(ctx,env){
    this.ctx=ctx;this.env=env;this.queue=Promise.resolve();this.votes=new Map();this.mission=null;this.record=null;this.geometry=null;this.checkedAt=0;
    this.loading=ctx.blockConcurrencyWhile(async()=>{
      const record=await ctx.storage.get('mission');
      if(record){
        if(record.meta.gameVersion===GAME_VERSION&&record.meta.expiresAt>Date.now()){
          this.geometry=await ctx.storage.get('world');this.mission=restoreRelayMission(record,this.geometry);this.record=record;
        }else{await ctx.storage.delete(['mission','world']);await ctx.storage.deleteAlarm();}
      }
    });
  }
  serial(fn){const task=this.queue.then(()=>this.loading).then(fn);this.queue=task.catch(()=>{});return task;}
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
  send(ws,data){try{ws.send(JSON.stringify(data));return true;}catch(_){try{ws.close(1011,'Connexió interrompuda');}catch(_){}return false;}}
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
    try{if(typeof message!=='string'||message.length>1024)throw Error();body=JSON.parse(message);if(!body||Array.isArray(body)||body.protocol!==1)throw Error();}
    catch(_){ws.close(1008,'Missatge invàlid');return;}
    const a=ws.deserializeAttachment(),now=Date.now();if(!a){ws.close(4003,'Accés finalitzat');return;}
    if(body.type==='input'){
      if(!a.gameClient||a.gameVersion!==GAME_VERSION||Object.keys(body).length!==6||typeof body.interact!=='boolean'||!validatePlayerInput(body.input)||!Number.isSafeInteger(body.sequence)||body.sequence<1){ws.close(1008,'Entrada invàlida');return;}
      if(now-(a.inputWindow||0)>=1000){a.inputWindow=now;a.inputs=0;}a.inputs=(a.inputs||0)+1;
      if(a.inputs>45){ws.close(1008,'Massa entrades');return;}ws.serializeAttachment(a);
      if(!await this.verify(ws)){ws.close(4003,'Accés finalitzat');return;}
      if(this.mission&&body.epoch===this.mission.meta.id)this.mission.accept(a.actorId,body);
      return;
    }
    if(body.type==='combat'){
      if(!a.gameClient||a.gameVersion!==GAME_VERSION||Object.keys(body).length!==5||typeof body.epoch!=='string'||body.epoch.length>64||!['pistol','grenade'].includes(body.weapon)||typeof body.commandId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(body.commandId)){ws.close(1008,'Ordre de combat invàlida');return;}
      if(now-(a.combatWindow||0)>=1000){a.combatWindow=now;a.combatCount=0;}a.combatCount=(a.combatCount||0)+1;ws.serializeAttachment(a);
      if(a.combatCount>12){ws.close(1008,'Massa ordres de combat');return;}
      if(!await this.verify(ws)){ws.close(4003,'Accés finalitzat');return;}
      if(!this.mission||body.epoch!==this.mission.meta.id){this.send(ws,{type:'action',kind:'combat',commandId:body.commandId,ok:false,code:'NOT_ACTIVE'});return;}
      try{const result=this.mission.combatCommand(a.actorId,body);await this.save(this.record.nextAlarm);this.broadcastState();this.send(ws,{type:'action',...result});}
      catch(_){if(this.record)this.mission=restoreRelayMission(this.record,this.geometry);this.send(ws,{type:'action',kind:'combat',commandId:body.commandId,ok:false,code:'SAVE_FAILED'});}return;
    }
    if(now-a.window>=60000){a.window=now;a.count=0;}a.count++;ws.serializeAttachment(a);
    if(a.count>20){ws.close(1008,'Massa missatges');return;}
    if(!await this.verify(ws,true)){ws.close(4003,'Accés finalitzat');return;}
    if(body.type==='hello'&&Object.keys(body).length===3){
      if(body.gameVersion!==GAME_VERSION){this.send(ws,{type:'error',message:'Cal recarregar la pàgina per actualitzar el joc.'});ws.close(4005,'Versió incompatible');return;}
      this.votes.delete(a.actorId);const attachment=ws.deserializeAttachment();attachment.gameClient=true;attachment.gameVersion=GAME_VERSION;ws.serializeAttachment(attachment);
      await this.env.DB.prepare('UPDATE hunter_coop_members SET last_seen=? WHERE owner=? AND room=?').bind(now,a.actorId,a.roomId).run();
      await this.publish();if(this.mission){this.send(ws,this.mission.setup(a.actorId));await this.wake();}return;
    }
    if(body.type==='inventory'){
      if(!a.gameClient||a.gameVersion!==GAME_VERSION||Object.keys(body).length!==6||!['drop','disguise'].includes(body.operation)||(body.operation==='drop'?!['bullets','grenades','disguise'].includes(body.target):typeof body.target!=='boolean')||typeof body.commandId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(body.commandId)){ws.close(1008,'Ordre d’inventari invàlida');return;}
      if(!this.mission||body.epoch!==this.mission.meta.id){this.send(ws,{type:'action',commandId:body.commandId,ok:false,code:'NOT_ACTIVE'});return;}
      try{const result=this.mission.inventoryCommand(a.actorId,body);await this.save(this.record.nextAlarm);this.broadcastState();this.send(ws,{type:'action',...result});}
      catch(_){if(this.record)this.mission=restoreRelayMission(this.record,this.geometry);this.send(ws,{type:'action',commandId:body.commandId,ok:false,code:'SAVE_FAILED'});}return;
    }
    if(body.type==='door'){
      if(!a.gameClient||a.gameVersion!==GAME_VERSION||Object.keys(body).length!==6||typeof body.doorId!=='string'||body.doorId.length>200||typeof body.open!=='boolean'||typeof body.commandId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(body.commandId)){ws.close(1008,'Ordre de porta invàlida');return;}
      if(!this.mission||body.epoch!==this.mission.meta.id){this.send(ws,{type:'action',commandId:body.commandId,ok:false,code:'NOT_ACTIVE'});return;}
      try{
        const result=this.mission.doorCommand(a.actorId,body);await this.save(this.record.nextAlarm);this.broadcastState();this.send(ws,{type:'action',...result});
      }catch(_){if(this.record)this.mission=restoreRelayMission(this.record,this.geometry);this.send(ws,{type:'action',commandId:body.commandId,ok:false,code:'SAVE_FAILED'});}
      return;
    }
    if(body.type==='launch'&&Object.keys(body).length===4&&a.gameClient&&body.gameVersion===GAME_VERSION){await this.launch(ws,body);return;}
    if(body.type!=='heartbeat'||Object.keys(body).length!==2){ws.close(1008,'Missatge invàlid');return;}
    await this.env.DB.prepare('UPDATE hunter_coop_members SET last_seen=? WHERE owner=? AND room=?').bind(now,a.actorId,a.roomId).run();
    await this.publish();if(this.mission)await this.wake();
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
  broadcastState(){if(this.mission)for(const ws of this.games())this.send(ws,{type:'state',state:this.mission.snapshot()});}
  async abort(message){
    const clients=this.games();await this.ctx.storage.delete(['mission','world']);await this.ctx.storage.deleteAlarm();
    this.mission=null;this.record=null;this.geometry=null;this.votes.clear();
    for(const ws of clients)this.send(ws,{type:'ended',message});
  }
  async save(nextAlarm){
    const record=this.mission.checkpoint(nextAlarm);await this.ctx.storage.put('mission',record);this.record=record;await this.ctx.storage.setAlarm(nextAlarm);
  }
  async wake(){if(this.mission){await this.save(Date.now()+100);}}
  async launch(ws,body){
    const a=ws.deserializeAttachment(),room=await readCoopRoom(this.env,a.actorId);
    if(!room||!room.allReady||body.revision!==room.revision){this.send(ws,{type:'error',message:'Calen dos jugadors preparats i una sala actualitzada.'});return;}
    if(this.mission&&this.matches(room)&&['relay','extract'].includes(this.mission.snapshot().phase)){this.send(ws,this.mission.setup(a.actorId));await this.wake();return;}
    this.votes.set(a.actorId,room.revision);
    const games=this.games();
    if(!room.members.every(m=>this.votes.get(m.id)===room.revision&&games.some(s=>s.deserializeAttachment().actorId===m.id))){this.send(ws,{type:'waiting',message:'Esperant que el company també premi Iniciar missió.'});return;}
    for(const client of games)if(!await this.verify(client,true)){client.close(4003,'Accés finalitzat');return;}
    try{
      const generated=generateRelayMission(room),mission=restoreRelayMission(generated.record,generated.geometry);
      await this.ctx.storage.transaction(async storage=>{await storage.put('world',generated.geometry);await storage.put('mission',generated.record);});
      this.mission=mission;this.geometry=generated.geometry;this.record=generated.record;this.checkedAt=0;this.votes.clear();
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
      const phase=this.mission.snapshot().phase;
      this.mission.setStatus(both&&['relay','extract'].includes(phase)?'running':both?'finished':'paused');
      if(both)for(let i=0;i<3;i++)this.mission.step();
      const running=both&&['relay','extract'].includes(this.mission.snapshot().phase);
      await this.save(running?Date.now()+100:this.mission.meta.expiresAt);this.broadcastState();
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
