import {createCoopSocket} from './coop-socket.mjs';
// Room schema and reply policy; socket lifecycle is shared with the playable mission.
export function createCoopConnection({onRoom,...options}){
 let awaiting=false;
 const channel=createCoopSocket({...options,stopStatus:'closed',fatal:{4001:'replaced',4003:'unauthorized',4004:'unauthorized'},
  onOpen:()=>{awaiting=false;},
  onBeat:({send,close})=>{if(awaiting){close(1011,'Sense resposta');return false;}awaiting=true;try{send({type:'heartbeat',protocol:1});}catch(_){close();return false;}},
  onData:data=>{if(data.type!=='room'||!(data.room===null||data.room&&typeof data.room.id==='string'&&Array.isArray(data.room.members)))throw Error();awaiting=false;onRoom({room:data.room});}
 });return Object.freeze({start:channel.start,stop:channel.stop,isOpen:channel.isOpen});
}
