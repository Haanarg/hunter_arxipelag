// Cookie-authenticated, same-origin room channel. Never puts credentials in URLs.
export function createCoopConnection({url,onRoom,onStatus=()=>{},isActive=()=>true,
  WebSocketImpl=globalThis.WebSocket,setTimer=setTimeout,clearTimer=clearTimeout}){
  let socket=null,timer=null,heartbeat=null,stopped=true,generation=0,attempt=0,awaitingHeartbeat=false;
  const clear=()=>{if(timer!==null)clearTimer(timer);if(heartbeat!==null)clearTimer(heartbeat);timer=heartbeat=null;};
  function stop(){stopped=true;generation++;clear();const old=socket;socket=null;try{old?.close(1000,'Panell tancat');}catch(_){}onStatus('closed');}
  function connect(){
    if(stopped||!isActive())return;
    const version=++generation;let ws;
    try{ws=new WebSocketImpl(url);}catch(_){retry();return;}
    socket=ws;onStatus('connecting');
    const valid=()=>!stopped&&version===generation&&socket===ws;
    function beat(){
      if(!valid())return;
      if(!isActive()){stop();return;}
      if(awaitingHeartbeat){try{ws.close(1011,'Sense resposta');}catch(_){}return;}
      awaitingHeartbeat=true;
      try{ws.send(JSON.stringify({type:'heartbeat',protocol:1}));}catch(_){try{ws.close();}catch(_){}return;}
      heartbeat=setTimer(beat,20000);
    }
    ws.onopen=()=>{if(!valid()){try{ws.close();}catch(_){}return;}attempt=0;awaitingHeartbeat=false;onStatus('open');heartbeat=setTimer(beat,20000);};
    ws.onmessage=event=>{
      if(!valid()||!isActive())return;
      try{if(typeof event.data!=='string'||event.data.length>65536)throw new Error();const data=JSON.parse(event.data);
        if(data.type!=='room'||!(data.room===null||data.room&&typeof data.room.id==='string'&&Array.isArray(data.room.members)))throw new Error();
        awaitingHeartbeat=false;onRoom({room:data.room});
      }catch(_){try{ws.close(1002,'Protocol invàlid');}catch(_){} }
    };
    ws.onerror=()=>{}; // Close drives retry; browsers intentionally hide handshake details.
    ws.onclose=event=>{
      if(!valid())return;socket=null;if(heartbeat!==null)clearTimer(heartbeat);heartbeat=null;
      if([4001,4003,4004].includes(event.code)){stopped=true;onStatus(event.code===4001?'replaced':'unauthorized');return;}
      retry();
    };
  }
  function retry(){
    if(stopped||!isActive())return;
    onStatus('retrying');timer=setTimer(()=>{timer=null;connect();},Math.min(15000,1000*2**Math.min(attempt++,4)));
  }
  return Object.freeze({start(){if(!stopped)return;stopped=false;attempt=0;connect();},stop,isOpen:()=>!stopped&&socket?.readyState===1});
}
