import assert from 'node:assert/strict';
import {barrierRam,vehicleRamThreshold,fenceVehicleContact} from '../src/combat-rules.mjs';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
const fence={barbed:true,hp:4,rammable:true},wall={hp:12,rammable:true};
for(const [type,wire,threshold] of [['cotxe',true,16],['cotxe',false,22],['camio',true,12]]){
 assert.equal(vehicleRamThreshold({t:type,v:1},wire),threshold);assert.equal(barrierRam({t:type,v:threshold},wire?fence:wall),null);assert.ok(barrierRam({t:type,v:threshold+.1},wire?fence:wall));
 assert.equal(barrierRam({t:type,v:-(threshold+4)},wire?fence:wall),null,'reverse requires five more m/s');
}
assert.equal(barrierRam({t:'cotxe',v:30},fence,.1),null,'ordinary vehicle recovery blocks another ram');
assert.ok(barrierRam({t:'camio',v:20},fence,.1),'truck can keep breaking fence');
assert.equal(barrierRam({t:'tanc',v:.1},wall,1).damage,0);assert.equal(barrierRam({t:'camio',v:20},fence).speedFactor,1);
assert.equal(barrierRam({t:'cotxe',v:30},{hp:12}),null,'non-rammable structures stay solid');
assert.equal(fenceVehicleContact({barbed:true,ax:-10,az:-10,bx:10,bz:10},{x:-8,z:8,hd:0,w:2,d:2}),null,'diagonal fence uses its segment rather than broad AABB');
const generated=generateRelayMission({id:'ram',revision:1,seed:67,mapScale:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]},{mode:'proving'});
function fixture(type,{wire=false,speed=30,rammable=true,life=20}={}){
 const r=structuredClone(generated.record),geometry=structuredClone(generated.geometry);r.status='running';r.meta.doors=[];r.meta.targets=[];
 const v={...r.meta.vehicles.find(v=>v.t===type),x:0,z:0,y:2.06,hd:0,v:speed,life,seats:['a',null]};r.meta.vehicles=[v];Object.assign(r.checkpoint.players[0],{x:0,z:0,y:2.06});r.checkpoint.players[1].x=100;
 geometry.walls=[{x0:-15,x1:15,z0:-12,z1:-11.8,y0:2,y1:6,hp:wire?4:12,barbed:wire,rammable,...(wire?{ax:-15,az:-11.9,bx:15,bz:-11.9}:{})}];geometry.buildings=[];geometry.stairs=[];
 return {m:restoreRelayMission(r,geometry),geometry};
}
function step(m,i,forward=1){m.accept('a',{protocol:1,epoch:m.meta.id,sequence:i,input:{forward,turn:0,strafe:0,run:false},interact:false});m.step();}
for(const [type,wire] of [['cotxe',true],['cotxe',false],['camio',true],['tanc',false]]){
 let {m,geometry}=fixture(type,{wire});for(let i=1;i<=30&&!m.snapshot().removedWalls.length;i++)step(m,i);
 assert.deepEqual(m.snapshot().removedWalls,[0],type+' breaches '+(wire?'wire':'wall'));
 const state=m.snapshot(),vehicle=state.vehicles[0];assert.equal(vehicle.life,20-(type==='tanc'||type==='camio'&&wire?0:wire?2:3),'original chassis penalty');
 const restored=restoreRelayMission(m.checkpoint(0),geometry);assert.deepEqual(restored.snapshot(),state,'ram cooldown and breach restore');assert.equal(restored.setup('a').geometry.walls[0].open,true);
}
for(const options of [{speed:8},{speed:30,rammable:false}]){const {m}=fixture('cotxe',options);for(let i=1;i<=30;i++)step(m,i,0);assert.deepEqual(m.snapshot().removedWalls,[],'slow or indestructible contact leaves barrier');}
const {m,geometry}=fixture('cotxe',{wire:true,life:1});for(let i=1;i<=30&&!m.snapshot().vehicles[0].destroyed;i++)step(m,i);assert.equal(m.snapshot().vehicles[0].destroyed,true,'fragile hull can die while breaching');assert.deepEqual(m.snapshot().removedWalls,[0]);
const entranceRecord=structuredClone(generated.record);entranceRecord.status='running';entranceRecord.meta.targets=[];entranceRecord.meta.vehicles=[{...entranceRecord.meta.vehicles.find(v=>v.t==='cotxe'),x:55,z:84,y:2.06,hd:0,v:30,life:20,seats:['a',null]}];Object.assign(entranceRecord.checkpoint.players[0],{x:55,z:84,y:2.06});entranceRecord.checkpoint.players[1].x=100;
const entrance=restoreRelayMission(entranceRecord,generated.geometry);for(let i=1;i<=40&&!entrance.snapshot().removedWalls.length;i++)step(entrance,i);
const door=generated.record.meta.doors[0],doorWall=generated.geometry.walls[door.wallIndex];for(const id of doorWall.assemblyIds){const index=generated.geometry.walls.findIndex(w=>w.id===id);assert.ok(entrance.snapshot().removedWalls.includes(index),'ram destroys doorway atomically');}
assert.equal(entrance.snapshot().doors.find(d=>d.id===door.id).destroyed,true);
console.log('shared original barrier rules: forward/reverse thresholds, recovery, tank/truck exemptions, fence segment, wall/wire breaches, chassis cost, lethal impact and checkpoint passed');
