import assert from 'node:assert/strict';
import {createPlayerSimulation,fallLandingDamage} from '../src/player-simulation.mjs';
const idle={forward:0,turn:0,strafe:0,run:false},actors=[{id:'a',x:-2,z:0,y:.06,hd:0,hp:20},{id:'b',x:2,z:0,y:.06,hd:0,hp:20}];
const flat={locomotionAt:()=>({floor:0,terrain:0,interior:false,basement:false,drop:false}),resolveBody:(p,c)=>({...c,y:p.y}),roofLanding:()=>null};
const make=(options={})=>createPlayerSimulation({epoch:'vertical',actors,limit:100,world:flat,vertical:{surfaceAt:()=>-100},...options});
function send(sim,id,sequence,input=idle,extra={}){return sim.accept(id,{protocol:1,epoch:'vertical',sequence,input,...extra});}
const land=make();send(land,'a',1,{...idle,forward:1,run:true});send(land,'b',1,{...idle,strafe:1});
let state=land.step();assert.equal(state.players[0].z,-19/30);assert.equal(state.players[1].x,2+9/30);assert.equal(state.players[0].fall,null);
const water=make({world:{...flat,locomotionAt:()=>({...flat.locomotionAt(),floor:-20,terrain:-20})},actors:actors.map(a=>({...a,y:-2.1})),vertical:{surfaceAt:()=>0}});
assert.equal(water.snapshot().players[0].swimming,true,'initial snapshot derives swimming from trusted world');
send(water,'a',1,{...idle,forward:1,run:true});state=water.step();assert.equal(state.players[0].z,-8.5/30);assert.equal(state.players[0].y,-2.1);
const basement=make({world:{...flat,locomotionAt:()=>({floor:-10,terrain:0,interior:true,basement:true,drop:false})},actors:actors.map(a=>({...a,y:-9.94})),vertical:{surfaceAt:()=>0}});
send(basement,'a',1,{...idle,forward:1});state=basement.step();assert.equal(state.players[0].swimming,false);assert.equal(state.players[0].y,-9.94);assert.equal(state.players[0].z,-12/30);

// Leaving a ledge must start a trajectory, rather than snapping to its foot.
const ledge=make({actors:[{...actors[0],x:-.1,y:10.06},{...actors[1],x:-2,y:10.06}],world:{...flat,locomotionAt:x=>({...flat.locomotionAt(),floor:x<0?10:0,terrain:x<0?10:0})}});
send(ledge,'a',1,{...idle,strafe:1});state=ledge.step();assert.equal(state.players[0].y,10.06);assert.equal(state.players[0].fall.kind,'shaft');assert.equal(state.players[1].fall,null);
let airborne=0,previousY=state.players[0].y;
while(ledge.snapshot().players[0].fall&&airborne<200){state=ledge.step();assert.ok(state.players[0].y<=previousY);previousY=state.players[0].y;airborne++;}
assert.ok(airborne>10&&airborne<200);assert.equal(state.players[0].fall,null);assert.equal(state.players[0].y,.06);assert.ok(state.players[0].hp<20);assert.equal(state.players[1].hp,20);
const landedHp=state.players[0].hp;for(let k=0;k<40;k++)ledge.step();assert.equal(ledge.snapshot().players[0].hp,landedHp,'landing damage only once');

function falling(y,parachute=false){return {kind:'air',y,vy:0,vx:0,vz:0,t:0,leanF:0,leanS:0,startHeight:y,parachute};}
const roofWorld={...flat,locomotionAt:(x,z,y)=>({...flat.locomotionAt(),floor:y>=9.78?10.05:0,interior:y<9.5}),roofLanding:(from,to)=>from.y>=10&&to.y<=10?10:null};
const roof=make({world:roofWorld,actors:actors.map(a=>({...a,y:30,fall:falling(30,true)}))});
for(let k=0;k<250&&roof.snapshot().players[0].fall;k++)roof.step();
state=roof.snapshot();assert.equal(state.players[0].fall,null);assert.equal(state.players[0].y,10.05+.06);assert.equal(state.players[0].hp,20,'parachute landing does no damage');
// A single large descent can cross the entire roof thickness and must still land on top.
const fastFall={...falling(10.1),vy:-100},fast=make({world:roofWorld,actors:actors.map(a=>({...a,y:10.1,fall:fastFall}))});
state=fast.step();assert.equal(state.players[0].y,10.05+.06);assert.equal(state.players[0].fall,null);

const seaWorld={...flat,locomotionAt:()=>({...flat.locomotionAt(),floor:-30,terrain:-30})},sea=make({world:seaWorld,actors:actors.map(a=>({...a,y:20,fall:falling(20)})),vertical:{surfaceAt:()=>0}});
let lastFall;
for(let k=0;k<150&&sea.snapshot().players[0].fall;k++){lastFall=sea.snapshot().players[0].fall;sea.step();}
state=sea.snapshot();assert.equal(state.players[0].fall,null);assert.equal(state.players[0].swimming,true);assert.equal(state.players[0].y,-2.1);
assert.equal(state.players[0].hp,20-fallLandingDamage({...lastFall,vy:lastFall.vy-24/30},{water:true,maxHealth:20}));
send(sea,'a',1,{...idle,forward:1});assert.equal(sea.step().players[0].z,-5/30);

// Snapshots and constructor arguments cannot mutate the authoritative fall.
const initialActors=actors.map(a=>({...a,y:100,fall:falling(100,true)})),chute=make({actors:initialActors});
initialActors[0].fall.parachute=false;const detached=chute.snapshot();detached.players[0].fall.vy=-999;
assert.equal(chute.snapshot().players[0].fall.parachute,true);assert.equal(chute.snapshot().players[0].fall.vy,0);
assert.equal(send(chute,'a',1,{...idle,y:0}),false);assert.equal(send(chute,'a',1,{...idle,parachute:false}),false);
assert.equal(send(chute,'a',1,{...idle,turn:1},{hp:999,y:0,fall:null}),true,'extra envelope fields never become actor state');
for(let k=0;k<20;k++)chute.step();const timed=chute.snapshot().players[0];chute.step();assert.equal(chute.snapshot().players[0].hd,timed.hd);assert.ok(chute.snapshot().players[0].y<timed.y,'gravity continues after input timeout');
chute.damage('a',20);send(chute,'a',2,{...idle,turn:1,forward:1});const dead=chute.step().players[0];assert.equal(dead.hp,0);assert.equal(dead.hd,timed.hd,'dead actor cannot steer');assert.ok(dead.fall,'dead actor still obeys gravity');

// Even if actor A would land and lose health, failure for B commits nothing.
let fail=false;
const atomic=make({actors:actors.map(a=>({...a,y:.2,fall:{...falling(.2),vy:-20,startHeight:20}})),vertical:{surfaceAt:x=>fail&&x>0?NaN:-100}});
const before=atomic.snapshot();fail=true;assert.throws(()=>atomic.step(),/support/);assert.deepEqual(atomic.snapshot(),before);fail=false;
assert.equal(atomic.step().tick,1);assert.ok(atomic.snapshot().players[0].hp<20);
assert.throws(()=>make({vertical:{}}),/requires trusted/);
assert.throws(()=>make({actors:actors.map(a=>({...a,fall:{...falling(a.y),vy:NaN}}))}),/falling actor/);
assert.throws(()=>make({actors:actors.map(a=>({...a,fall:falling(100)}))}),/Inconsistent/);
let waterTick=0;const wave=make({world:seaWorld,actors:actors.map(a=>({...a,y:-2.1})),vertical:{surfaceAt:(x,z,t)=>{waterTick=t;return t*.1;}}});
wave.step();assert.equal(waterTick,1/30);assert.equal(wave.snapshot().players[0].y,(1/30)*.1-2.1);
console.log('two-actor vertical simulation: land/sea speeds, ledge gravity, roof crossing, damage once, parachute, swimming/basement, timeout/death, trusted input, copies, fixed water time and atomic tick passed');
