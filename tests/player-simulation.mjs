import assert from 'node:assert/strict';
import {moveOnFoot,damageHealth,createPlayerSimulation,PLAYER_MAX_HEALTH} from '../src/player-simulation.mjs';
assert.equal(PLAYER_MAX_HEALTH,25);
const clamp=(v,l)=>Math.max(-l,Math.min(l,v));
// Independent copy of the previous runtime equations, across its actual modes.
for(const swimming of [false,true])for(const crouched of [false,true])for(const run of [false,true])for(const forward of [-1,0,.4,1])for(const strafe of [-1,0,.7,1])for(const hd of [-3,0,1.4]){
 const state={x:2,z:-3,hd},dt=1/60,limit=10,length=Math.max(1,Math.hypot(forward,strafe)),ss=(swimming?(run?8.5:5):crouched?4.5:run?19:12)*forward*dt/length,lateral=(swimming?(run?6.5:4.5):crouched?3.8:9)*strafe*dt/length;
 const expected={x:clamp(state.x-Math.sin(hd)*ss+Math.cos(hd)*lateral,limit),z:clamp(state.z-Math.cos(hd)*ss-Math.sin(hd)*lateral,limit),hd};
 assert.deepEqual(moveOnFoot(state,{forward,strafe,run},dt,{limit,swimming,crouched}),expected);
}
for(const damage of [NaN,Infinity,-1,0,.1,1,3.5,100])assert.equal(damageHealth(8.5,damage),Number.isFinite(damage)&&damage>0?Math.max(0,9-Math.ceil(damage)):8.5);
assert.equal(damageHealth(8,5,{immune:true}),8);
const actors=[{id:'a',x:0,z:0,hd:0,hp:PLAYER_MAX_HEALTH},{id:'b',x:0,z:0,hd:Math.PI,hp:PLAYER_MAX_HEALTH}],options={epoch:'epoch:1',actors,limit:100};
const engine=createPlayerSimulation(options),message={protocol:1,epoch:'epoch:1',sequence:1,input:{forward:1,turn:0,strafe:0,run:false}};
assert.equal(engine.accept('outsider',message),false);assert.equal(engine.accept('a',{...message,epoch:'old'}),false);
assert.equal(engine.accept('a',{...message,input:{...message.input,forward:NaN}}),false);
assert.equal(engine.accept('a',{...message,input:{...message.input,x:100}}),false,'positions are not accepted as input');
assert.equal(engine.accept('a',message),true);assert.equal(engine.accept('a',message),false,'sequence replay');assert.equal(engine.accept('b',message),true);
let state=engine.step();assert.equal(state.tick,1);assert.ok(state.players[0].z<0&&state.players[1].z>0);assert.equal(state.players[0].acknowledged,1);
for(let i=0;i<10;i++)engine.step();const stopped=engine.snapshot();engine.step();assert.deepEqual(engine.snapshot().players,stopped.players,'stale input times out');
engine.damage('a',100);engine.accept('a',{...message,sequence:2});const dead=engine.step().players[0];assert.equal(dead.hp,0);engine.step();assert.deepEqual(engine.snapshot().players[0],dead,'dead actor cannot move');
const detached=engine.snapshot();detached.players[0].hp=999;assert.equal(engine.snapshot().players[0].hp,0,'snapshots do not mutate authority');
let fail=false;
const collision=createPlayerSimulation({...options,world:{resolve:(old,candidate)=>old.id==='b'&&fail?{...candidate,x:Infinity}:{...candidate,x:Math.max(0,candidate.x)}}});
collision.accept('a',{...message,input:{forward:0,turn:0,strafe:-1,run:false}});collision.step();assert.equal(collision.snapshot().players[0].x,0,'world adapter constrains movement');
const before=collision.snapshot();fail=true;assert.throws(()=>collision.step());assert.deepEqual(collision.snapshot(),before,'invalid world result cannot commit half a tick');
console.log('player simulation: legacy movement parity, health, two actors, validated inputs, sequence/epoch/identity, timeout, fixed ticks, death, world constraints and atomic tick passed');

const reverse=createPlayerSimulation(options);reverse.accept('a',{...message,input:{...message.input,forward:-1,run:true}});assert.equal(reverse.step().players[0].z,.4,'client cannot sprint backwards');
const blockedRun=createPlayerSimulation({...options,world:{context:()=>({canRun:false})}});blockedRun.accept('a',{...message,input:{...message.input,run:true}});assert.equal(blockedRun.step().players[0].z,-.4,'world decides sprint permission');

const immunePlayers=createPlayerSimulation({...options,immune:()=>true});
assert.equal(immunePlayers.damage('a',10),false,
 'COOP immune prevents authoritative damage on both identities');
assert.equal(immunePlayers.damage('b',15),false);
assert.equal(immunePlayers.snapshot().players[0].hp,PLAYER_MAX_HEALTH);
assert.equal(immunePlayers.snapshot().players[1].hp,PLAYER_MAX_HEALTH);
