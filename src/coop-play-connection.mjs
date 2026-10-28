export function createPlayConnection({url,version,getInput,onMessage,onStatus=()=>{},WebSocketImpl=globalThis.WebSocket,setTimer=setTimeout,clearTimer=clearTimeout,now=Date.now}){
  let ws=null,stopped=true,generation=0,retry=null,beat=null,inputTimer=null,attempt=0,epoch=null,sequence=0,state=null,lastMessage=0;
  const clear=()=>{for(const id of [retry,beat,inputTimer])if(id!==null)clearTimer(id);retry=beat=inputTimer=null;};
  function send(body){if(ws?.readyState!==1||stopped)return false;ws.send(JSON.stringify(body));return true;}
  function connect(){
    if(stopped)return;const token=++generation;onStatus('connecting');
    try{ws=new WebSocketImpl(url);}catch(_){schedule();return;}const socket=ws,valid=()=>!stopped&&generation===token&&ws===socket;
    socket.onopen=()=>{
      if(!valid()){socket.close();return;}attempt=0;lastMessage=now();onStatus('open');send({type:'hello',protocol:1,gameVersion:version});
      function heartbeat(){if(!valid())return;if(now()-lastMessage>30000){socket.close(1011,'Sense resposta');return;}send({type:'heartbeat',protocol:1});beat=setTimer(heartbeat,20000);}beat=setTimer(heartbeat,20000);
      function input(){
        if(!valid())return;
        if(epoch&&state?.status==='running'&&['relay','extract'].includes(state.phase)){
          const {interact=false,...movement}=getInput();send({type:'input',protocol:1,epoch,sequence:++sequence,input:movement,interact});
        }
        inputTimer=setTimer(input,50);
      }inputTimer=setTimer(input,50);
    };
    socket.onmessage=e=>{
      if(!valid())return;
      try{
        if(typeof e.data!=='string'||e.data.length>1000000)throw Error();const data=JSON.parse(e.data);
        if(!['room','mission','state','waiting','error','ended','action'].includes(data.type))throw Error();lastMessage=now();
        if(data.type==='mission'){
          if(!data.meta?.id||!data.geometry||!Array.isArray(data.state?.players)||!data.state.players.some(p=>p.id===data.self))throw Error();
          if(epoch!==data.meta.id)sequence=0;epoch=data.meta.id;state=data.state;
          sequence=Math.max(sequence,data.state.players.find(p=>p.id===data.self).acknowledged);
        }else if(data.type==='state'&&data.state?.missionId===epoch)state=data.state;
        if(data.type==='ended'){state=null;epoch=null;}
        onMessage(data);
      }catch(_){socket.close(1002,'Protocol invàlid');}
    };
    socket.onerror=()=>{};
    socket.onclose=e=>{if(!valid())return;ws=null;clear();state=null;
      if([1008,4001,4003,4004,4005].includes(e.code)){stopped=true;onStatus(e.code===4001?'replaced':'ended');return;}schedule();};
  }
  function schedule(){if(stopped)return;onStatus('retrying');retry=setTimer(connect,Math.min(10000,1000*2**Math.min(attempt++,4)));}
  return {start(){if(!stopped)return;stopped=false;connect();},launch(revision){return send({type:'launch',protocol:1,gameVersion:version,revision});},
    door(doorId,open,commandId){if(!epoch||state?.status!=='running'||!['relay','extract'].includes(state.phase))return false;return send({type:'door',protocol:1,epoch,doorId,open,commandId});},
    stop(){stopped=true;generation++;clear();try{ws?.close(1000,'Sortida de missió');}catch(_){}ws=null;}};
}
export function playInput(keys,hidden=false){
  const has=(...values)=>!hidden&&values.some(k=>keys.has(k));
  return {forward:Number(has('KeyW','ArrowUp'))-Number(has('KeyS','ArrowDown')),turn:Number(has('KeyA','ArrowLeft'))-Number(has('KeyD','ArrowRight')),
    strafe:Number(has('KeyU'))-Number(has('KeyY')),run:has('ShiftLeft','ShiftRight'),interact:has('KeyE','Space')};
}
