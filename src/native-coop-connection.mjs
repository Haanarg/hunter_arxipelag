import {applyCoopDelta} from './coop-state-delta.mjs';
import {createCoopSocket} from './coop-socket.mjs';
import {GAME_VERSION} from './version.mjs?v=0.6.53';
// Transport adapter for the original runtime. No scene, renderer or controls.
export function createNativeCoopConnection({room,getInput,onRoom,onMission,onState,onStatus,onError,onAction,onInput,now=Date.now,WebSocketImpl=globalThis.WebSocket,origin=globalThis.location?.origin,setInputTimer=setInterval,clearInputTimer=clearInterval,setTimer=setTimeout,clearTimer=clearTimeout}){
 const url=new URL('/api/coop/socket',origin);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('room',room.id);
 let epoch=null,state=null,stateRevision=0,timer=null,sequence=0,prepared=null,readyRoom=false,published=false,lastMessage=0;
 const socket=createCoopSocket({url:url.href,WebSocketImpl,setTimer,clearTimer,maxPayload:1000000,onStatus,onDisconnect(){clearInputTimer(timer);timer=null;state=null;readyRoom=false;published=false;},
  fatal:{1008:'ended',4001:'replaced',4003:'ended',4004:'ended',4005:'version'},onOpen({send}){lastMessage=now();send({type:'hello',protocol:1,gameVersion:GAME_VERSION});timer=setInputTimer(()=>{if(epoch&&state?.status==='running'){const message={type:'input',protocol:1,epoch,sequence:++sequence,...(()=>{const {interact=false,...input}=getInput();return {input,interact};})()};if(send(message))onInput?.(message);}},50);},
  onBeat({send,close}){if(now()-lastMessage>30000){close(1011,'Sense resposta');return false;}send({type:'heartbeat',protocol:1});},onData(data){
   if(!['room','native-mission','state','state-delta','action','waiting','error','ended'].includes(data.type))throw Error('Resposta invàlida');lastMessage=now();
   if(data.type==='room'){readyRoom=!!data.room?.allReady&&data.room.revision===room.revision;onRoom?.(data.room);if(readyRoom&&prepared&&!published)publish(prepared);}
   else if(data.type==='native-mission'){if(!data.meta?.id||!Array.isArray(data.state?.players)||!data.state.players.some(p=>p.id===data.self))throw Error('Missió invàlida');if(epoch!==data.meta.id)sequence=0;epoch=data.meta.id;state=data.state;stateRevision=data.stateRevision??0;sequence=Math.max(sequence,state.players.find(p=>p.id===data.self)?.acknowledged||0);onMission(data);}
   else if(data.type==='state'&&data.state?.missionId===epoch){state=data.state;onState(data.state);}
   else if(data.type==='state-delta'&&data.missionId===epoch){if(data.baseRevision!==stateRevision||data.revision!==stateRevision+1)throw Error('Cal resincronitzar');state=applyCoopDelta(state,data.delta);stateRevision=data.revision;onState(state);}
   else if(data.type==='action'){onAction?.(data);}
   else if(data.type==='error'||data.type==='ended'){if(data.type==='ended'){state=null;epoch=null;}onError?.(data.message);}
  }});
 function publish(p){
  if(!readyRoom||published)return;published=true;
  if(p.host){const text=JSON.stringify(p.payload),size=45000,total=Math.ceil(text.length/size);if(total>192){onError?.('El món supera el límit de sincronització.');return;}for(let index=0;index<total;index++)socket.send({type:'native-world',protocol:1,revision:room.revision,fingerprint:p.fingerprint,index,total,chunk:text.slice(index*size,(index+1)*size)});}
  socket.send({type:'native-ready',protocol:1,revision:room.revision,fingerprint:p.fingerprint});
 }
 function command(type,extra){if(!epoch||state?.status!=='running')return false;return socket.send({type,protocol:1,epoch,commandId:crypto.randomUUID(),...extra});}
 return {start:socket.start,stop:socket.stop,prepare(p){prepared=p;if(readyRoom)publish(p);},combat:(weapon,power,seconds)=>command('combat',{weapon,...(weapon==='grenade'&&Number.isFinite(power)?{power}:{} ),...(weapon==='c4'&&Number.isInteger(seconds)?{seconds}:{})}),vehicle:(vehicleId,operation)=>command('vehicle',{vehicleId,operation}),door:(doorId,open)=>command('door',{doorId,open}),inventory:(operation,target)=>command('inventory',{operation,target})};
}
