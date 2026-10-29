import assert from 'node:assert/strict';
import {CoopRoomHub} from '../server/coop-hub.mjs';
let clock=1000,steps=0,next=1000;const original=Date.now;Date.now=()=>clock;
try{
 const hub=new CoopRoomHub({storage:{get:async()=>undefined},blockConcurrencyWhile:fn=>fn()},{});await hub.loading;hub.checkedAt=clock;
 const sockets=['a','b'].map(actorId=>({deserializeAttachment:()=>({actorId})}));hub.games=()=>sockets;hub.record={nextAlarm:1000};
 hub.mission={meta:{expiresAt:1e9,members:[{id:'a'},{id:'b'}]},progress:()=>({phase:'relay'}),setStatus(){},step(snapshotResult){assert.equal(snapshotResult,false);steps++;clock+=10;}};
 hub.save=async deadline=>{next=deadline;clock+=20;hub.record={nextAlarm:deadline};};hub.broadcastState=()=>{};
 for(let i=0;i<10;i++){clock=1000+i*100;await hub.frame();assert.equal(next,1100+i*100,'work time does not stretch the simulation period');}
 assert.equal(steps,30);console.log('server cadence: 30 ticks per second despite 50ms of simulated work per broadcast passed');
}finally{Date.now=original;}
