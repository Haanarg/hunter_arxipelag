import assert from 'node:assert/strict';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
import {vehicleGunPose} from '../src/vehicle-turret-core.mjs';
import {createVehicleView} from '../src/coop-vehicle-view.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import * as T from '../vendor/three-r186.module.mjs';
const g=generateRelayMission({id:'turrets',revision:1,seed:67,mapScale:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]},{mode:'proving'});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(const type of ['tanc','tanqueta']){
 const r=structuredClone(g.record),v=r.meta.vehicles.find(v=>v.t===type);r.status='running';r.meta.vehicles=[v];v.seats[0]='a';
 Object.assign(r.checkpoint.players[0],{x:v.x,y:v.y,z:v.z});r.checkpoint.players[1].x=100;
 r.meta.targets=[{id:'off-axis',t:'soldat',x:v.x+8,y:v.y,z:v.z-45,hp:40}];
 let m=restoreRelayMission(r,g.geometry);const fire=id=>m.combatCommand('a',{epoch:m.meta.id,weapon:'pistol',commandId:id});
 const initialGun=vehicleGunPose(v);assert.equal(fire('early').code,'FIRED');const early=m.snapshot().combat.projectiles[0];near(early.x,initialGun.origin.x);near(early.y,initialGun.origin.y);near(early.z,initialGun.origin.z);near(early.vx,0);
 assert.ok(Math.abs(early.x-r.meta.targets[0].x)>1,'shooting cannot snap turret onto target');
 for(let i=0;i<6;i++)m.step();const before=m.snapshot().vehicles[0];assert.notEqual(before.turretYaw,0);assert.notEqual(before.turretYawSpeed,0);
 const saved=m.checkpoint(0),restored=restoreRelayMission(saved,g.geometry);for(let i=0;i<24;i++){m.step();restored.step();}assert.deepEqual(restored.snapshot(),m.snapshot(),'angles and angular velocities restore without a jump');
 m.setStatus('paused');const paused=m.snapshot();for(let i=0;i<12;i++)m.step();assert.deepEqual(m.snapshot(),paused,'turret and flights freeze with simulation');m.setStatus('running');
 for(let i=0;i<90;i++)m.step();const aimed=m.snapshot().vehicles[0];assert.ok(aimed.turretYaw<-.05);assert.ok(aimed.turretPitch<0);
 const gun=vehicleGunPose(aimed);assert.equal(fire('aligned').code,'FIRED');const actual=m.snapshot().combat.projectiles.at(-1),speed=Math.hypot(actual.vx,actual.vy,actual.vz);for(const k of ['x','y','z'])near(actual[k],gun.origin[k]);[actual.vx,actual.vy,actual.vz].forEach((n,i)=>near(n/speed,gun.direction[i]));
 for(let i=0;i<20;i++)m.step();assert.ok(m.snapshot().combat.targets[0].hp<40,'settled cannon hits off-axis target');
 for(let i=0;i<20;i++){m.accept('a',{protocol:1,epoch:m.meta.id,sequence:i+1,input:{forward:.3,turn:.4,strafe:0,run:false},interact:false});m.step();}
 const moving=m.snapshot().vehicles[0];assert.notEqual(moving.hd,0);const scene=new T.Scene(),view=await createVehicleView(T,scene);view.update([moving]);scene.updateMatrixWorld(true);
 const rendered=vehicleModels.turretShot(T,scene.children[0].children[0]),expected=vehicleGunPose(moving);for(const k of ['x','y','z'])near(rendered.origin[k],expected.origin[k]);rendered.direction.toArray().forEach((n,i)=>near(n,expected.direction[i]));view.destroy();
}
console.log('cooperative tank/tankette: true muzzle, no fire-time snap, damped aim, pause, exact checkpoint, off-axis damage, moving chassis and rendered barrel direction passed');
