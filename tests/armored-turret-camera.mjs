// Regressió càmera de torreta, suavitat manual i límits d'elevació.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from '../vendor/three-r186.module.mjs';
import {turretSpecs,stepManualTurret,stepVehicleTurret} from '../src/vehicle-turret-core.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';

const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
for(const type of ['tanc','tanqueta']){
 const spec=turretSpecs[type];
 assert(spec.turretMinPitch<0&&spec.turretMinPitch>-.2,
  'La depressió ha de ser limitada pel casc: '+type);
 assert(spec.manualYawRate<spec.turretYawRate*.6);
 assert(spec.manualPitchRate<.4);
 const state={t:type,hd:0,turretYaw:0,turretPitch:0};
 const start=stepManualTurret(state,type,1,-1,.1);
 assert(start.yaw>0&&start.yaw<spec.manualYawRate*.1,'Arrencada amortida');
 for(let i=0;i<150;i++)stepManualTurret(state,type,1,-1,.05);
 assert(Math.abs(state.turretPitch-spec.turretMinPitch)<1e-9,'Límit inferior manual');
 assert(state.manualTurretYawSpeed>0);
 const yaw=state.turretYaw;
 stepManualTurret(state,type,0,0,.05);
 assert(wrap(state.turretYaw-yaw)<spec.manualYawRate*.05,'Aturada amortida');
 assert(state.manualTurretYawSpeed<spec.manualYawRate);
 stepVehicleTurret(state,[0,0,-1],.1);
 assert.equal(state.manualTurretYawSpeed,0);
 assert.equal(state.manualTurretPitchSpeed,0);
 assert(state.turretPitch>=spec.turretMinPitch,'Límit inferior automàtic');
}
const create=vehicleModels.createFactory(THREE,{
 box:(g,w,h,d,color)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color}));g.add(m);return m},
 material:color=>new THREE.MeshBasicMaterial({color}),
 shadows:false,batching:playerBatching
});
for(const type of ['tanc','tanqueta']){
 const rig=create(type);
 vehicleModels.manualTurret(rig,type,1,0,.05);
 assert(rig.userData.turretPivot.rotation.y>0);
 assert(rig.userData.manualTurretYawSpeed>0);
 const speed=rig.userData.manualTurretYawSpeed;
 vehicleModels.manualTurret(rig,type,0,0,.05);
 assert(rig.userData.manualTurretYawSpeed<speed);
 for(let i=0;i<200;i++)vehicleModels.manualTurret(rig,type,0,-1,.05);
 assert(Math.abs(rig.userData.turretPitch.rotation.x-turretSpecs[type].turretMinPitch)<1e-6);
}
const cameraSource=readFileSync(new URL('../src/camera-controls.js',import.meta.url),'utf8');
const sandbox={window:{}};
runInNewContext(cameraSource,sandbox);
const follow=sandbox.window.HUNTER_CAMERA_CONTROLS.createTurretFollow();
const vehicle={hd:.8};
assert(Math.abs(follow.heading(vehicle,.4,.016)-1.2)<1e-10);
const stepped=follow.heading(vehicle,.8,.016);
assert(stepped>1.2&&stepped<1.6,'Càmera suau en seguir la torreta');
let at=stepped;
for(let i=0;i<100;i++)at=follow.heading(vehicle,.8,.016);
assert(Math.abs(at-1.6)<.001);
follow.reset();
assert.equal(follow.heading(vehicle,-.8,.016),0);
follow.reset();
const crossing={hd:Math.PI-.05};
follow.heading(crossing,0,.016);
crossing.hd=-Math.PI+.05;
assert(Math.abs(wrap(follow.heading(crossing,0,.016)-(Math.PI-.05)))<.1,'Pas suau ±π');
const game=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
const coop=readFileSync(new URL('../src/coop-world-runtime.js',import.meta.url),'utf8');
assert(game.includes("role==='gunner'||role!=='driver-locked'&&armoredManualActive()"));
assert(game.includes('heading=turretMode?turretLook.heading(cv,'));
assert(game.includes('turretCameraPivot.y+.35*viewScale'));
assert(game.includes('turretMode?.72:1'));
assert(coop.includes('updatePlayerCamera(dt)'),'COOP ha de reutilitzar la càmera original');
console.log('PASS torretes: manual precís, depressió limitada, càmera darrere i seients COOP');
