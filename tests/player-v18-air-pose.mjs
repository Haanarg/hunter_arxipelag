import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three-r186.module.mjs';
import {V18_AIR_POSES,applyNativeV18AirPose} from '../src/player-native-air-pose.mjs';
const skeleton=()=>Object.fromEntries(Object.keys(V18_AIR_POSES.fall).map(id=>[id,new T.Group()]));
for(const mode of ['fall','parachute']){
 const joints=skeleton();
 for(const joint of Object.values(joints))joint.rotation.set(-1,.3,.8);
 const legacy=skeleton();
 for(const joint of Object.values(legacy))joint.scale.setScalar(2/3);
 assert(applyNativeV18AirPose(joints,mode,1));
 for(const [id,angles] of Object.entries(V18_AIR_POSES[mode]))
  for(const [i,axis] of ['x','y','z'].entries())
   assert(Math.abs(joints[id].rotation[axis]-angles[i])<1e-10,
    'V18 independent del rig antic '+mode+'/'+id+'/'+axis);
 const half=skeleton();
 assert(applyNativeV18AirPose(half,mode,.5));
 assert(Math.abs(half.shoulderR.rotation.x-V18_AIR_POSES[mode].shoulderR[0]/2)<1e-10);
 assert(!applyNativeV18AirPose(half,mode,0));
}
assert.throws(()=>applyNativeV18AirPose({},'fall',1),/articulació/);
assert.throws(()=>applyNativeV18AirPose(skeleton(),'invalid',1),/Mode/);
assert.throws(()=>applyNativeV18AirPose(skeleton(),'fall',NaN),/Pes/);
const characters=readFileSync(new URL('../src/characters.js',import.meta.url),'utf8');
const air=characters.split('if(airborne||parachuting){')[1]?.split('if(swimming&&!inVehicle){')[0];
assert(air?.includes('humanGameNativeAirPose'));
assert(!/\b(?:tx|tz)\(u\.(?:al|ar|ael|aer|ll|lr|lkl|lkr)\b/.test(air),
 'Sense braços ni cames escrits al V17 durant el salt');
const render=readFileSync(new URL('../src/human-game-runtime-v17.mjs',import.meta.url),'utf8');
assert(render.includes('applyNativeV18AirPose(j,airPose.mode,airPose.blend)'));
const coop=readFileSync(new URL('../src/coop-world-runtime.js',import.meta.url),'utf8');
assert(coop.includes('airborne:!!other.fall,parachuting:!!other.fall?.parachute'));
console.log('PASS postura aèria V18, paracaigudes i rèpliques COOP');
