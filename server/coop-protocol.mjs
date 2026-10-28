import {COOP_PROTOCOL,COOP_TICK_RATE} from '../src/player-simulation.mjs';
import {GAME_VERSION} from '../src/version.mjs';
export function prepareCoopManifest(room,body){
  function fail(code,message){const e=new Error(message);Object.assign(e,{status:409,code});throw e;}
  if(!room||room.revision!==body.revision)fail('ROOM_CHANGED','La sala ha canviat. Actualitza-la.');
  if(body.protocol!==COOP_PROTOCOL||body.gameVersion!==GAME_VERSION)fail('VERSION_MISMATCH','Cal recarregar el joc per tenir la mateixa versió.');
  if(!room.allReady)fail('NOT_READY','Calen dos participants aprovats, connectats i preparats.');
  return {protocol:COOP_PROTOCOL,gameVersion:GAME_VERSION,generatorVersion:'world:0.6.2',
    epoch:room.id+':'+room.revision,roomId:room.id,revision:room.revision,seed:room.seed,mapScale:room.mapScale,difficulty:room.difficulty,
    tickRate:COOP_TICK_RATE,participants:room.members.map((m,slot)=>({actorId:m.id,slot})),phase:'prepared',playable:false};
}
