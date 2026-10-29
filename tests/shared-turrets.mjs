import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three-r186.module.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {turretSpecs,stepVehicleTurret,vehicleGunPose} from '../src/vehicle-turret-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
import {turretTraces} from './helpers/turret-trace.mjs';
const frozen=JSON.parse(readFileSync(new URL('./fixtures/turret-traces.json',import.meta.url)));
assert.deepEqual(turretTraces(vehicleModels),frozen);
const material=c=>new T.MeshStandardMaterial({color:c}),box=(g,w,h,d,c,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);g.add(m);return m;},create=vehicleModels.createFactory(T,{box,material,shadows:false,batching:playerBatching});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(const t of Object.keys(turretSpecs)){
 const model=create(t),v={t,x:23,y:2.06,z:-31,hd:0};model.position.set(v.x,v.y,v.z);
 for(let i=0;i<600;i++){
  v.hd=i*.031;model.rotation.y=v.hd;
  const d=new T.Vector3(Math.sin(i*.11),Math.sin(i*.17)*3,-Math.cos(i*.11)).normalize(),dt=[1/30,1/60,.12,0][i%4];
  const aligned=stepVehicleTurret(v,d.toArray(),dt),reference=vehicleModels.aimTurret(T,model,d,dt),pose=vehicleGunPose(v),rendered=vehicleModels.turretShot(T,model);
  assert.equal(aligned,reference);close(v.turretYaw,model.userData.turretPivot.rotation.y);close(v.turretPitch,model.userData.turretPitch.rotation.x);
  for(const [key,n] of Object.entries(pose.origin))close(n,rendered.origin[key]);pose.direction.forEach((n,j)=>close(n,rendered.direction.toArray()[j]));
 }
}
console.log('turrets: 1,200 frozen original controller frames, plus 1,200 server/Three muzzle and direction comparisons while chassis turns passed');
