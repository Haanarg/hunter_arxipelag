// Shared authenticated channel lifecycle. Message schemas remain in their adapters.
export function createCoopSocket({url,onData,onStatus=()=>{},onOpen=()=>{},onDisconnect=()=>{},onBeat=()=>{},isActive=()=>true,
 WebSocketImpl=globalThis.WebSocket,setTimer=setTimeout,clearTimer=clearTimeout,maxPayload=65536,retryLimit=15000,fatal={},stopStatus=null,beforeConnect=false}){
 let socket=null,retry=null,heartbeat=null,stopped=true,generation=0,attempt=0;
 const clear=()=>{if(retry!==null)clearTimer(retry);if(heartbeat!==null)clearTimer(heartbeat);retry=heartbeat=null;};
 const send=body=>{if(stopped||socket?.readyState!==1)return false;socket.send(JSON.stringify(body));return true;};
 function stop(){stopped=true;generation++;clear();onDisconnect();const old=socket;socket=null;try{old?.close(1000,'Sortida del canal');}catch(_){}if(stopStatus)onStatus(stopStatus);}
 function schedule(){if(stopped||!isActive())return;onStatus('retrying');retry=setTimer(()=>{retry=null;connect();},Math.min(retryLimit,1000*2**Math.min(attempt++,4)));}
 function connect(){
  if(stopped||!isActive())return;const token=++generation;if(beforeConnect)onStatus('connecting');let ws;
  try{ws=new WebSocketImpl(url);}catch(_){schedule();return;}socket=ws;if(!beforeConnect)onStatus('connecting');const valid=()=>!stopped&&token===generation&&socket===ws;
  ws.onopen=()=>{if(!valid()){try{ws.close();}catch(_){}return;}attempt=0;onStatus('open');onOpen({valid,send});
   function beat(){if(!valid())return;if(!isActive()){stop();return;}if(onBeat({send,close:(code,reason)=>ws.close(code,reason)})===false)return;heartbeat=setTimer(beat,20000);}heartbeat=setTimer(beat,20000);
  };
  ws.onmessage=e=>{if(!valid()||!isActive())return;try{if(typeof e.data!=='string'||e.data.length>maxPayload)throw Error();onData(JSON.parse(e.data),e.data.length);}catch(_){try{ws.close(1002,'Protocol invàlid');}catch(_){} }};
  ws.onerror=()=>{};
  ws.onclose=e=>{if(!valid())return;socket=null;clear();onDisconnect();if(Object.hasOwn(fatal,e.code)){stopped=true;onStatus(fatal[e.code]);return;}schedule();};
 }
 return Object.freeze({start(){if(!stopped)return;stopped=false;attempt=0;connect();},stop,send,isOpen:()=>!stopped&&socket?.readyState===1});
}
