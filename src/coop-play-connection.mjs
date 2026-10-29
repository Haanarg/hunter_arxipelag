import {createCoopSocket} from './coop-socket.mjs';
export function createPlayConnection({url,version,getInput,onMessage,onStatus=()=>{},WebSocketImpl=globalThis.WebSocket,setTimer=setTimeout,clearTimer=clearTimeout,now=Date.now}){
  let inputTimer=null,epoch=null,sequence=0,state=null,lastMessage=0;
  const channel=createCoopSocket({url,WebSocketImpl,setTimer,clearTimer,onStatus,maxPayload:1000000,retryLimit:10000,beforeConnect:true,
    fatal:{1008:'ended',4001:'replaced',4003:'ended',4004:'ended',4005:'ended'},
    onDisconnect(){if(inputTimer!==null)clearTimer(inputTimer);inputTimer=null;state=null;},
    onOpen({valid,send}){lastMessage=now();send({type:'hello',protocol:1,gameVersion:version});
      function input(){if(!valid())return;if(epoch&&state?.status==='running'&&['relay','extract'].includes(state.phase)){const {interact=false,...movement}=getInput();send({type:'input',protocol:1,epoch,sequence:++sequence,input:movement,interact});}inputTimer=setTimer(input,50);}inputTimer=setTimer(input,50);
    },
    onBeat({send,close}){if(now()-lastMessage>30000){close(1011,'Sense resposta');return false;}send({type:'heartbeat',protocol:1});},
    onData(data){
      if(!['room','mission','state','waiting','error','ended','action'].includes(data.type))throw Error();lastMessage=now();
      if(data.type==='mission'){
        if(!data.meta?.id||!data.geometry||!Array.isArray(data.state?.players)||!data.state.players.some(p=>p.id===data.self))throw Error();
        if(epoch!==data.meta.id)sequence=0;epoch=data.meta.id;state=data.state;sequence=Math.max(sequence,data.state.players.find(p=>p.id===data.self).acknowledged);
      }else if(data.type==='state'&&data.state?.missionId===epoch)state=data.state;
      if(data.type==='ended'){state=null;epoch=null;}onMessage(data);
    }
  });
  const send=channel.send;
  return {start:channel.start,launch(revision,mode='relay'){return send({...(mode==='proving'?{mode}:{}),type:'launch',protocol:1,gameVersion:version,revision});},
    combat(weapon,commandId){if(!epoch||state?.status!=='running'||!['relay','extract'].includes(state.phase))return false;return send({type:'combat',protocol:1,epoch,weapon,commandId});},
    inventory(operation,target,commandId){if(!epoch||state?.status!=='running'||!['relay','extract'].includes(state.phase))return false;return send({type:'inventory',protocol:1,epoch,operation,target,commandId});},
    vehicle(vehicleId,operation,commandId){if(!epoch||state?.status!=='running'||!['relay','extract'].includes(state.phase))return false;return send({type:'vehicle',protocol:1,epoch,vehicleId,operation,commandId});},
    door(doorId,open,commandId){if(!epoch||state?.status!=='running'||!['relay','extract'].includes(state.phase))return false;return send({type:'door',protocol:1,epoch,doorId,open,commandId});},
    stop:channel.stop};
}
export function playInput(keys,hidden=false){
  const has=(...values)=>!hidden&&values.some(k=>keys.has(k));
  return {...(has('PageUp','PageDown')?{climb:Number(has('PageUp'))-Number(has('PageDown'))}:{}),forward:Number(has('KeyW','ArrowUp'))-Number(has('KeyS','ArrowDown')),turn:Number(has('KeyA','ArrowLeft'))-Number(has('KeyD','ArrowRight')),
    strafe:Number(has('KeyU'))-Number(has('KeyY')),run:has('ShiftLeft','ShiftRight'),interact:has('KeyE','Space')};
}
