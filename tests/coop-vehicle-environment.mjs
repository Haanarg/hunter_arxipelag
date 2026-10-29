import assert from 'node:assert/strict';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
import {firstVehicleContact} from '../server/coop-vehicle-contacts.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
import {palmImpact,rockImpact,palmCrushRadius,rockVerticalBand} from '../src/vehicle-environment-core.mjs';
const g=generateRelayMission({id:'forest',revision:1,seed:67,mapScale:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]},{mode:'proving'});
function fixture(type,speed,{rock=false,y=2.06,obstacleZ=-8}={}){
 const r=structuredClone(g.record),geometry=structuredClone(g.geometry);r.status='running';r.meta.doors=[];r.meta.targets=[];
 r.meta.vehicles=[{...r.meta.vehicles.find(v=>v.t===type),x:0,z:0,y,alt:y,hd:0,v:speed,life:20,seats:['a',null]}];Object.assign(r.checkpoint.players[0],{x:0,z:0,y});r.checkpoint.players[1].x=100;
 geometry.walls=[];geometry.buildings=[];geometry.stairs=[];geometry.trees=[rock?{x:0,z:obstacleZ,r:1.5,rock:true,topY:4,bottomY:1}:{x:0,z:obstacleZ,r:.7,p:true,y:2,s:1,yaw:0}];
 return {m:restoreRelayMission(r,geometry),geometry};
}
function step(m,n=40){for(let i=1;i<=n;i++){m.accept('a',{protocol:1,epoch:m.meta.id,sequence:i,input:{forward:1,turn:0,strafe:0,run:false},interact:false});m.step();}}
for(const type of ['tanc','tanqueta','camio']){
 const {m,geometry}=fixture(type,4);step(m);assert.deepEqual(m.snapshot().palmHealth,[[0,0]],type+' crushes palm');assert.equal(m.snapshot().vehicles[0].life,20);assert.ok(m.snapshot().vehicles[0].z<-5);
 assert.deepEqual(restoreRelayMission(m.checkpoint(0),geometry).snapshot(),m.snapshot(),'crushing checkpoint');
}
let {m}=fixture('cotxe',25);step(m,12);assert.deepEqual(m.snapshot().palmHealth,[[0,0]]);assert.ok(m.snapshot().vehicles[0].life<20,'fast light chassis pays original impact damage');
({m}=fixture('cotxe',3,{obstacleZ:-2.7}));for(let i=1;i<=8;i++){m.accept('a',{protocol:1,epoch:m.meta.id,sequence:i,input:{forward:0,turn:0,strafe:0,run:false},interact:false});m.step();}assert.deepEqual(m.snapshot().palmHealth,[]);assert.equal(m.snapshot().vehicles[0].life,20);assert.ok(m.snapshot().vehicles[0].z>-.3,'slow contact stops before trunk');
for(const type of ['cotxe','tanc']){({m}=fixture(type,25,{rock:true}));step(m,18);assert.deepEqual(m.snapshot().palmHealth,[]);assert.ok(m.snapshot().vehicles[0].z>-8,'rock stays solid');assert.ok(m.snapshot().vehicles[0].life<20,'original rock damage');}
for(const type of ['cotxe','camio','tanc'])for(const speed of [0,2.5,10,10.1,25]){
 const heavy=['tanc','camio'].includes(type),r=palmImpact(type,speed,2);
 assert.equal(r.destroy,heavy||speed>10);assert.equal(r.damage,heavy||speed<=10?0:Math.min(3,Math.max(1,Math.ceil(speed/(18*Math.sqrt(2))))));
 assert.equal(rockImpact(speed,2).damage,speed>10?Math.min(5,Math.max(1,Math.ceil(speed/(9*Math.sqrt(2))))):0);
}
assert.equal(palmCrushRadius('tanqueta',2),4.8);assert.deepEqual(rockVerticalBand('a',0,20,1),{baseY:19,topY:22});
console.log('vehicle environment: shared solo thresholds/damage, heavy crushing, light impact, solid rocks and checkpoint passed');

const {geometry}=fixture('cotxe',30,{rock:true});const world=createStaticWorldAdapter(geometry);
for(const [type,y,hit] of [['heli',20,false],['heli',3,true],['llanxa',0,true]]){
 const vehicle={t:type,id:'sweep',x:0,z:-16,y,hd:0,v:60};
 assert.equal(!!firstVehicleContact(vehicle,{x:0,z:0,y,hd:0},[],geometry,true,world),hit,type+' rock height band');
}
