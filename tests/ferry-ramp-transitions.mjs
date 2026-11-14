import assert from 'node:assert/strict';
import {ferryForVehicle,ferryPedestrianAt,ferryRampAngle,ferryVehiclePose,ferryCabinPush} from '../src/ferry-deck-core.mjs';
const f={id:'f',t:'ferry',x:0,z:0,y:0,hd:0,v:0};
const ground=(x,z)=>Math.abs(z)>=31?0:-12;
f.rampAngles=Object.fromEntries([-1,1].map(s=>[s,ferryRampAngle(f,s,ground,()=>0)]));
for(const side of [-1,1]){
 let previous=0;
 for(let z=31.7;z>=20;z-=.1){
  const deck=ferryPedestrianAt(f,0,side*z,previous);
  assert(deck,'walkable ramp at '+z);previous=deck.y;
 }
 assert(Math.abs(previous-2.2)<1e-8);
 for(const t of ['cotxe','camio']){
  const v={t,x:0,z:0,hd:0};
  for(let z=side*34;Math.abs(z)>=18;z-=side*.1){
   v.z=z;assert.equal(ferryForVehicle(v,[f]),f,'continuous '+t+' at '+z);
   v.carrierId=f.id;
   const pose=ferryVehiclePose(v,f,ground);
   assert(Number.isFinite(pose.y)&&Math.abs(pose.pitch)<=.45);
   assert(pose.y>=-.65);
  }
  v.z=side*45;assert.equal(ferryForVehicle(v,[f]),null);
 }
}
assert(!ferryPedestrianAt(f,0,0,-8));
assert(!ferryPedestrianAt(f,13,31,0));
assert(!ferryForVehicle({t:'camio',x:0,z:20,hd:0,sunk:true},[f]));
const q=ferryCabinPush(f,11.5,1.8);assert(q.x!==11.5||q.z!==1.8);
f.v=5;assert(!ferryForVehicle({t:'cotxe',x:0,z:32,hd:0},[f]));
console.log('Ferry ramp geometry: walking, truck/GAZ transitions, cabin and submerged vehicles OK');
