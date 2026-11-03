import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../src/characters.js',import.meta.url),'utf8');
for(const needle of [
  'assault.userData.stockAnchor=new THREE.Vector3(',
  'assault.userData.stockToReceiver=new THREE.Vector3(',
  'sniper.userData.stockAnchor=new THREE.Vector3(',
  'sniper.userData.stockToReceiver=new THREE.Vector3(',
  'group.position.copy(anchor)',
  '.add(u.weaponPoseOffset.copy(offset).applyQuaternion(group.quaternion))',
  'rig.q3.copy(shoulder.quaternion).invert()',
  'const yaw=Math.atan2(-d.x,-d.z)',
  'aimPlayerPistolArm(u.ar,u.aer,rig.right,1,rig,handBlend,true)'
])assert.ok(code.includes(needle),'Shouldered weapon animation missing: '+needle);
// The rear stock geometry must remain outside the torso and inside a
// 20 cm shoulder-contact zone, for every barrel yaw and elevation.
const configs=[
 {name:'assault',offset:[-.12,.04,-1.11],scale:.84,rear:1.32,
  right:[-.04,-.2,.25],left:[-.52,-.2,.06],anchor:[.65,3.48,-.17]},
 {name:'sniper',offset:[-.05,.12,-1.20],scale:.82,rear:1.46,
  right:[-.04,-.19,.28],left:[-.67,-.23,.22],anchor:[.73,3.48,-.17]}
];
const rotate=([x,y,z],yaw,pitch)=>{
 const yy=y*Math.cos(pitch)-z*Math.sin(pitch),
       zz=y*Math.sin(pitch)+z*Math.cos(pitch);
 return [x*Math.cos(yaw)+zz*Math.sin(yaw),yy,-x*Math.sin(yaw)+zz*Math.cos(yaw)];
};
for(const gun of configs){
 for(const yaw of [-.6,-.3,0,.3,.6])for(const pitch of [-.25,0,.25]){
   const local=[
    gun.offset[0],gun.offset[1],gun.offset[2]+gun.rear*gun.scale
   ];
   const stock=rotate(local,yaw,pitch);
   assert.ok(Math.hypot(...stock)<.20,gun.name+' stock must stay at shoulder pivot');
 }
 const reach=([x,y,z],shoulderX)=>{
   const off=gun.offset.map((n,i)=>n+[x,y,z][i]*gun.scale),
         p=rotate(off,0,0).map((n,i)=>n+gun.anchor[i]);
   return Math.hypot(p[0]-shoulderX,p[1]-3.48,p[2]);
 };
 assert.ok(reach(gun.right,.684)<1.5,gun.name+' right hand must reach trigger');
 assert.ok(reach(gun.left,-.684)<1.5,gun.name+' left hand must reach support');
}
console.log('Shouldered guns: stock pivots and articulated hand reach verified');
