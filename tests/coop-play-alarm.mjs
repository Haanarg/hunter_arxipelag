import assert from 'node:assert/strict';
import {CoopRoomHub} from '../server/coop-hub.mjs';
import {generateRelayMission} from '../server/coop-mission.mjs';
import {GAME_VERSION} from '../src/version.mjs';
const room={id:'alarm-room',revision:4,seed:67,mapScale:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]},generated=generateRelayMission(room);
generated.record.nextAlarm=Date.now()-1;
const values=new Map([['world',generated.geometry],['mission',generated.record]]),messages=[];let fail=false,alarm=null;
const sockets=room.members.map(m=>({readyState:1,deserializeAttachment:()=>({actorId:m.id,gameClient:true,gameVersion:GAME_VERSION}),send:s=>messages.push(JSON.parse(s))})),
 storage={async get(k){return structuredClone(values.get(k));},async put(k,v){if(fail)throw Error('Simulated storage failure');values.set(k,structuredClone(v));},async setAlarm(v){alarm=v;},async deleteAlarm(){alarm=null;},async delete(keys){for(const k of keys)values.delete(k);}},
 ctx={storage,getWebSockets:()=>sockets,blockConcurrencyWhile:fn=>fn()},hub=new CoopRoomHub(ctx,{});
await hub.loading;hub.checkedAt=Date.now();await hub.alarm();assert.equal(hub.mission.snapshot().tick,3);assert.ok(alarm>Date.now());
const first=hub.mission.snapshot(),count=messages.length;await hub.alarm();assert.deepEqual(hub.mission.snapshot(),first,'duplicate/early alarm cannot apply another batch');assert.equal(messages.length,count);
hub.record.nextAlarm=Date.now()-1;fail=true;
await assert.rejects(()=>hub.alarm(),/storage failure/);assert.deepEqual(hub.mission.snapshot(),first,'unpersisted simulation batch rolls back');assert.equal(messages.length,count,'no unpersisted state reaches clients');assert.ok(alarm>Date.now(),'failure schedules recovery');
fail=false;hub.record.nextAlarm=Date.now()-1;hub.checkedAt=Date.now();await hub.alarm();assert.equal(hub.mission.snapshot().tick,6);
sockets[1].readyState=3;hub.record.nextAlarm=Date.now()-1;hub.checkedAt=Date.now();await hub.alarm();assert.equal(hub.mission.snapshot().status,'paused');assert.equal(hub.mission.snapshot().tick,6);assert.equal(alarm,hub.mission.meta.expiresAt,'inactive mission schedules cleanup only');
console.log('mission alarm: fixed batches, duplicate protection, persistence rollback/no uncommitted broadcast, retry and disconnected pause/cleanup passed');
