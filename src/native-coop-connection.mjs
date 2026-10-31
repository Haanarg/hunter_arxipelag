import {applyCoopDelta} from './coop-state-delta.mjs?delta=5';
import {createCoopSocket} from './coop-socket.mjs?net=2';
import {GAME_VERSION} from './version.mjs?v=0.6.65';
// Transport adapter for the original runtime. No scene, renderer or controls.
export function createNativeCoopConnection({room,getInput,onRoom,onMission,onState,onStatus,onError,onAction,onInput,now=Date.now,WebSocketImpl=globalThis.WebSocket,origin=globalThis.location?.origin,setInputTimer=setInterval,clearInputTimer=clearInterval,setTimer=setTimeout,clearTimer=clearTimeout}){
 const url=new URL('/api/coop/socket',origin);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('room',room.id);
 let epoch=null,state=null,stateRevision=0,timer=null,sequence=0,prepared=null,readyRoom=false,published=false,lastMessage=0,lastPing=0,pingSequence=0,canProbe=false,lastFrameAt=null;
 const stats={rttMs:null,rttJitterMs:0,serverTickMs:null,serverSaveMs:null,
   serverBroadcastMs:null,serverTick:null,stateFrames:0,stateBytes:0,
   avgStateGapMs:null,maxStateGapMs:0,lastStateAt:null,
   fullStateFrames:0,deltaFrames:0,deltaProfile:{samples:0,averageChars:0,bySection:Object.create(null)},
   clientFrame:{samples:0,averageGapMs:null,maxGapMs:0,over33Ms:0,over50Ms:0}};
 // Mesura la regularitat del fotograma al navegador, no el temps de
 // CPU del Worker. Exclou canvis de pestanya i pauses >250 ms.
 function noteFrame(active=true){
   if(!active){lastFrameAt=null;return;}
   const stamp=now();
   if(lastFrameAt!==null){
     const ms=stamp-lastFrameAt;
     if(ms>=0&&ms<=250){
       const f=stats.clientFrame;f.samples++;
       f.averageGapMs=f.averageGapMs===null?ms:f.averageGapMs*.95+ms*.05;
       f.maxGapMs=Math.max(f.maxGapMs,ms);
       if(ms>33.34)f.over33Ms++;
       if(ms>50)f.over50Ms++;
     }
   }
   lastFrameAt=stamp;
 }
 function noteState(bytes){
   const stamp=now();stats.stateFrames++;stats.stateBytes+=bytes||0;
   if(stats.lastStateAt!=null){
     const gap=Math.max(0,stamp-stats.lastStateAt);
     stats.avgStateGapMs=stats.avgStateGapMs==null?gap:stats.avgStateGapMs*.85+gap*.15;
     stats.maxStateGapMs=Math.max(stats.maxStateGapMs,gap);
   }
   stats.lastStateAt=stamp;
 }
 // Mostreig d'un de cada 16 deltes; no serialitza estats sencers.
 // Les mides són caràcters JSON aproximats i no bytes UTF-8.
 function profileDelta(delta,chars){
   if(stats.stateFrames%16!==0||!delta?.p)return;
   const p=stats.deltaProfile;
   p.samples++;
   p.averageChars+=((chars||0)-p.averageChars)/p.samples;
   for(const [key,patch] of Object.entries(delta.p)){
     if(!Object.hasOwn(p.bySection,key))p.bySection[key]=0;
     p.bySection[key]+=(JSON.stringify(patch)||'').length;
   }
 }
 const socket=createCoopSocket({url:url.href,WebSocketImpl,setTimer,clearTimer,maxPayload:1000000,onStatus,onDisconnect(){clearInputTimer(timer);timer=null;state=null;readyRoom=false;published=false;canProbe=false;},
  fatal:{1008:'ended',4001:'replaced',4003:'ended',4004:'ended',4005:'version'},onOpen({send}){lastMessage=now();lastPing=lastMessage;send({type:'hello',protocol:1,gameVersion:GAME_VERSION});timer=setInputTimer(()=>{if(epoch&&state?.status==='running'){
    const stamp=now();if(canProbe&&stamp-lastPing>=2000){
      lastPing=stamp;send({type:'latency-ping',protocol:1,epoch,nonce:++pingSequence,clientTime:stamp});
    }
    const message={type:'input',protocol:1,epoch,sequence:++sequence,...(()=>{const {interact=false,...input}=getInput();return {input,interact};})()};
    if(send(message))onInput?.(message);
  }},50);},
  onBeat({send,close}){if(now()-lastMessage>30000){close(1011,'Sense resposta');return false;}send({type:'heartbeat',protocol:1});},onData(data,bytes){
   if(!['room','native-mission','state','state-delta','latency-pong','action','waiting','error','ended'].includes(data.type))throw Error('Resposta invàlida');lastMessage=now();
   if(data.type==='latency-pong'){
     if(!Number.isSafeInteger(data.nonce)||!Number.isSafeInteger(data.clientTime)||
       !data.server||typeof data.server!=='object')throw Error('Sonda de latència invàlida');
     const sample=now()-data.clientTime;
     if(sample>=0&&sample<60000){
       if(stats.rttMs!=null)stats.rttJitterMs=stats.rttJitterMs*.8+Math.abs(sample-stats.rttMs)*.2;
       stats.rttMs=stats.rttMs==null?sample:stats.rttMs*.8+sample*.2;
       for(const [dst,src] of [['serverTickMs','tickMs'],['serverSaveMs','saveMs'],['serverBroadcastMs','broadcastMs'],['serverTick','tick']])
         if(Number.isFinite(data.server[src])&&data.server[src]>=0)stats[dst]=data.server[src];
     }
     return;
   }
   if(data.type==='room'){readyRoom=!!data.room?.allReady&&data.room.revision===room.revision;onRoom?.(data.room);if(readyRoom&&prepared&&!published)publish(prepared);}
   else if(data.type==='native-mission'){if(!data.meta?.id||!Array.isArray(data.state?.players)||!data.state.players.some(p=>p.id===data.self))throw Error('Missió invàlida');if(epoch!==data.meta.id)sequence=0;epoch=data.meta.id;state=data.state;stateRevision=data.stateRevision??0;canProbe=data.telemetry===1;stats.fullStateFrames++;sequence=Math.max(sequence,state.players.find(p=>p.id===data.self)?.acknowledged||0);noteState(bytes);onMission(data);}
   else if(data.type==='state'&&data.state?.missionId===epoch){state=data.state;stats.fullStateFrames++;noteState(bytes);onState(data.state);}
   else if(data.type==='state-delta'&&data.missionId===epoch){if(data.baseRevision!==stateRevision||data.revision!==stateRevision+1)throw Error('Cal resincronitzar');state=applyCoopDelta(state,data.delta);stateRevision=data.revision;stats.deltaFrames++;noteState(bytes);profileDelta(data.delta,bytes);onState(state);}
   else if(data.type==='action'){onAction?.(data);}
   else if(data.type==='error'||data.type==='ended'){if(data.type==='ended'){state=null;epoch=null;}onError?.(data.message);}
  }});
 function publish(p){
  if(!readyRoom||published)return;published=true;
  if(p.host){const text=JSON.stringify(p.payload),size=45000,total=Math.ceil(text.length/size);if(total>192){onError?.('El món supera el límit de sincronització.');return;}for(let index=0;index<total;index++)socket.send({type:'native-world',protocol:1,revision:room.revision,fingerprint:p.fingerprint,index,total,chunk:text.slice(index*size,(index+1)*size)});}
  socket.send({type:'native-ready',protocol:1,revision:room.revision,fingerprint:p.fingerprint});
 }
 function command(type,extra){if(!epoch||state?.status!=='running')return false;return socket.send({type,protocol:1,epoch,commandId:crypto.randomUUID(),...extra});}
 return {start:socket.start,stop:socket.stop,stats,noteFrame,prepare(p){prepared=p;if(readyRoom)publish(p);},combat:(weapon,power,seconds)=>command('combat',{weapon,...(weapon==='grenade'&&Number.isFinite(power)?{power}:{} ),...(weapon==='c4'&&Number.isInteger(seconds)?{seconds}:{})}),vehicle:(vehicleId,operation)=>command('vehicle',{vehicleId,operation}),door:(doorId,open)=>command('door',{doorId,open}),inventory:(operation,target)=>command('inventory',{operation,target}),cheat:(cheat,enabled)=>command('cheat',{cheat,enabled})};
}
