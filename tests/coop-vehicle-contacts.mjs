import assert from 'node:assert/strict';
import {firstVehicleContact,contactBox,vehicleContactDamage} from '../server/coop-vehicle-contacts.mjs';
import {obbOverlap,runoverSweepHit,impactDamage} from '../src/combat-rules.mjs';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
const wall={x0:-10,x1:10,z0:-10,z1:-9.95,y0:1,y1:8,playerBlock:true};
const vehicle={id:'a',t:'cotxe',x:0,y:2.06,z:-20,hd:0,v:38},from={...vehicle,z:0};
const contact=firstVehicleContact(vehicle,from,[],{walls:[wall]});assert.equal(contact.kind,'wall');assert.ok(contact.safe.z>-10,'swept car stops before thin wall');
assert.equal(firstVehicleContact({...vehicle,y:40},{...from,y:40},[],{walls:[wall]}),null,'altitude clears walls');
assert.equal(firstVehicleContact(vehicle,from,[],{walls:[{...wall,open:true}]}),null,'destroyed/open obstacle no longer blocks');
const other={...vehicle,id:'b',z:-10,hd:Math.PI,v:20};assert.equal(firstVehicleContact(vehicle,from,[other],{walls:[]}).kind,'vehicle');
const damage=vehicleContactDamage(vehicle,other);assert.ok(damage.relative>50);assert.equal(damage.own,impactDamage(damage.relative,1,1));assert.equal(vehicleContactDamage({...vehicle,t:'tanc'},other).own,0,'original tank collision immunity');
assert.ok(runoverSweepHit(0,0,0,-20,0,-10,1));assert.ok(!runoverSweepHit(0,0,0,-20,5,-10,1));
assert.ok(!obbOverlap({x:0,z:0,hd:0,w:1,d:10},{x:2,z:0,hd:0,w:1,d:10}),'SAT rejects parallel thin footprints');
const g=generateRelayMission({id:'contacts',revision:1,seed:67,mapScale:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]},{mode:'proving'});
function fixture({type='cotxe',target=true,obstacle=false}={}){
 const r=structuredClone(g.record),geo=structuredClone(g.geometry);r.status='running';r.meta.doors=[];r.meta.targets=target?[{id:'runover',t:'soldat',x:0,y:2.06,z:-1,hp:40}]:[];
 const v={...r.meta.vehicles.find(v=>v.t===type),x:0,y:2.06,z:0,v:30,life:20,hd:0,seats:['a',null]};r.meta.vehicles=[v];r.checkpoint.players[0]={...r.checkpoint.players[0],x:0,y:2.06,z:0};r.checkpoint.players[1].x=100;
 geo.walls=obstacle?[{...wall,z0:-5,z1:-4.95}]:[];geo.buildings=[];geo.stairs=[];
 return {r,geo,m:restoreRelayMission(r,geo)};
}
function drive(m,sequence=1){m.accept('a',{protocol:1,epoch:m.meta.id,sequence,input:{forward:1,turn:0,strafe:0,run:false},interact:false});return m.step();}
let {m,geo}=fixture();drive(m);assert.ok(m.snapshot().combat.targets[0].hp<40,'authoritative travel damages enemy');const hp=m.snapshot().combat.targets[0].hp;drive(m,2);assert.equal(m.snapshot().combat.targets[0].hp,hp,'runover cooldown prevents repeat damage');
let r=m.checkpoint(0),restored=restoreRelayMission(r,geo);assert.deepEqual(restored.snapshot(),m.snapshot(),'collision and runover state restores');
m.setStatus('paused');const paused=m.snapshot();m.step();assert.deepEqual(m.snapshot(),paused);
({m,geo}=fixture({obstacle:true,target:false}));for(let i=1;i<=5;i++)drive(m,i);assert.ok(m.snapshot().vehicles[0].z>-4.95,'vehicle cannot drive through proving-ground wall');assert.ok(m.snapshot().vehicles[0].life<20,'fast obstacle contact damages hull');
({m}=fixture({type:'bici',obstacle:true,target:false}));let bike=m.checkpoint(0);bike.vehicles.vehicles[0].life=1;m=restoreRelayMission(bike,geo);let destruction=null;
for(let i=1;i<=12;i++){drive(m,i);destruction=m.snapshot().combat.effects.find(e=>e.kind==='vehicle-destroyed');if(destruction)break;}
assert.ok(destruction,'fast bicycle collision destroys its one-point hull');assert.equal(destruction.explosive,false,'bicycles never explode after contact');
let pair=fixture({target:false}),pairRecord=pair.m.checkpoint(0);pairRecord.vehicles.vehicles.push({...pairRecord.vehicles.vehicles[0],id:'parked',z:-10,seats:[null,null],v:0,life:20});m=restoreRelayMission(pairRecord,pair.geo);
for(let i=1;i<=6;i++)drive(m,i);assert.ok(m.snapshot().vehicles.every(v=>v.life<20),'moving and parked hulls take mass-based damage');assert.ok(m.snapshot().vehicles[0].z>-10,'car cannot pass through parked vehicle');
const tankFixture=fixture({type:'tanc',target:false}),tankRecord=tankFixture.m.checkpoint(0);tankRecord.vehicles.vehicles.push({...tankRecord.vehicles.vehicles[0],id:'light-car',t:'cotxe',z:-15,seats:[null,null],v:0,life:5});m=restoreRelayMission(tankRecord,tankFixture.geo);
for(let i=1;i<=15;i++){drive(m,i);if(m.snapshot().vehicles[1].destroyed)break;}assert.equal(m.snapshot().vehicles[1].destroyed,true,'tank crushes lighter vehicle with original rule');
const friendly=fixture(),friendlyRecord=friendly.m.checkpoint(0);Object.assign(friendlyRecord.checkpoint.players[1],{x:0,z:-1,y:2.06});m=restoreRelayMission(friendlyRecord,friendly.geo);const friendlyHp=m.snapshot().players[1].hp;drive(m);assert.equal(m.snapshot().players[1].hp,friendlyHp,'direct runover keeps cooperative no-friendly-fire policy');
console.log('shared SAT/sweep/relative mass damage: thin wall, altitude, open walls, vehicle pair, tank immunity, runover sweep/cooldown, pause, checkpoint and non-explosive bicycle destruction passed');
