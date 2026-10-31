import assert from 'node:assert/strict';
import {CoopRoomHub} from '../server/coop-hub.mjs';

// D1 real conserva host/guest i last_seen. Emulam les consultes
// rellevants per provar l'autorització, sense Durable Object remot.
const now=Date.now(),member={
 a:{name:'HOST',slot:0,ready:false,last_seen:now},
 b:{name:'GUEST',slot:1,ready:true,last_seen:now}
};
const roomId='private-room',revision=2;
const env={DB:{prepare(sql){return {bind(...params){return {
 async all(){
  if(!sql.includes('FROM hunter_coop_rooms r'))throw Error('Unexpected SQL '+sql);
  const owner=params[0];if(!member[owner])return {results:[]};
  return {results:Object.entries(member).map(([id,m])=>({
   id:roomId,code:'ABCD',host:'a',seed:123,map_scale:1,difficulty:1,
   revision,expires_at:now+600000,
   owner:id,slot:m.slot,ready:Number(m.ready),last_seen:m.last_seen,
   name:m.name,status:'approved'
  }))};
 },
 async run(){
  if(!sql.includes('UPDATE hunter_coop_members SET ready=1'))throw Error('Unexpected UPDATE');
  assert.equal(params[1],'a');
  member.a.ready=true;member.a.last_seen=Date.now();
  return {success:true};
 }
 };}}}}};
const memory=new Map();
const ctx={blockConcurrencyWhile(fn){return fn()},
 storage:{get:key=>Promise.resolve(memory.get(key)),put:(key,val)=>{memory.set(key,val);return Promise.resolve()},
  delete:key=>{memory.delete(key);return Promise.resolve()}},
 getWebSockets:()=>[]};
const hub=new CoopRoomHub(ctx,env);await hub.loading;
let broadcasts=0;hub.publish=async()=>{broadcasts++};
const start=async(actor)=>hub.fetchInner(new Request('https://coop.internal/start',{
 method:'POST',headers:{'X-Coop-Actor':actor,'X-Coop-Revision':String(revision)}
}));
const blocked=await start('b');assert.equal(blocked.status,403);
assert.equal((await blocked.json()).code,'HOST_ONLY');
assert.equal(memory.size,0,'Guest cannot start or persist launch');
member.b.ready=false;
const waiting=await start('a');assert.equal(waiting.status,409);
assert.equal((await waiting.json()).code,'GUEST_NOT_READY');
assert.equal(member.a.ready,false,'Host must not be marked ready on failed start');
member.b.ready=true;
const launched=await start('a');assert.equal(launched.status,200);
const result=await launched.json();
assert.equal(result.room.phase,'starting');assert.equal(result.room.allReady,true);
assert.equal(member.a.ready,true,'Host confirmation is implicit');
assert.equal(broadcasts,1);
assert.equal(memory.get('native-start').id,roomId);
assert.equal(memory.get('native-start').revision,revision);
// Reconnect del guest: room fase starting fins que la sala canviï.
let messages=[];
ctx.getWebSockets=()=>[{readyState:1,deserializeAttachment:()=>({actorId:'b',roomId}),
 send:text=>messages.push(JSON.parse(text))}];
hub.publish=CoopRoomHub.prototype.publish;
hub.authorized=async ws=>ws.deserializeAttachment();
hub.send=(ws,data)=>{messages.push(data);return true;};
await hub.publish();
assert.equal(messages[0].room.phase,'starting');
member.b.ready=false;messages=[];
await hub.publish();
assert.equal(messages[0].room.phase,'lobby');
assert.equal(memory.has('native-start'),false,'No iniciar si el guest anul·la Preparat');
console.log('coop host start: guest forbidden, ready gate, host launch, reconnect and unready cancellation passed');
