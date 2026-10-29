'use strict';
// Three.js pose regression: barrel origin, two-handed support, tilted head.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const T=await import('../vendor/three-r186.module.mjs');
 const {playerModel}=await import('../src/player-model-core.mjs');
 const palette={player:{},enemy:{primary:0x556644,general:0x778855,vest:0x445533,secondary:0x334422,skin:0xe0c0a0,dark:0x101a10,metal:0x444444}};
 const w={HUNTER_PALETTE:palette,HUNTER_PLAYER_MODEL:playerModel,
   HUNTER_PLAYER_BATCH:{optimize:()=>({})},
   HUNTER_BOLT_CUTTERS:{create:()=>new T.Group(),pose:()=>{}}};
 vm.runInNewContext(fs.readFileSync('src/characters.js','utf8'),{window:w,knifeEquipped:false});
 const box=(g,a,b,c,color,x=0,y=0,z=0)=>{const m=new T.Mesh(new T.BoxGeometry(a,b,c),new T.MeshStandardMaterial({color}));m.position.set(x,y,z);g.add(m);return m};
 const player=w.HUNTER_CHARACTERS.createPlayer(T,{box,palette}),u=player.userData;
 assert.equal(u.assaultMuzzle.parent,u.assault);
 assert.equal(u.assaultLeftGrip.parent,u.assault);
 const animate=(extra={})=>{player.position.set(4,0,-7);
   w.HUNTER_CHARACTERS.animatePlayer(player,{forward:0,strafe:0,dt:.08,
     swimming:false,inVehicle:false,ammo:18,assaultRifleEquipped:true,...extra});
   player.updateMatrixWorld(true)};
 const pos=o=>o.getWorldPosition(new T.Vector3());
 const left=()=>u.ael.localToWorld(new T.Vector3(0,-.744,-.03));
 const right=()=>u.aer.localToWorld(new T.Vector3(0,-.744,-.03));
 for(let i=0;i<45;i++)animate();
 assert(Math.abs(u.head.rotation.z+Math.PI/18)<.006,'10deg toward rifle');
 assert(pos(u.assaultLeftGrip).distanceTo(left())<.16,'left hand holds foregrip');
 assert(pos(u.assaultRightGrip).distanceTo(right())<.16,'right hand holds trigger');
 const muzzle=pos(u.assaultMuzzle);
 assert(muzzle.z<player.position.z-1.5,'barrel ahead of chest');
 assert(muzzle.x>player.position.x,'rifle on right');
 for(let i=0;i<35;i++)animate({forward:1,running:true});
 const direction=new T.Vector3(0,0,-1).applyQuaternion(u.assaultMuzzle.getWorldQuaternion(new T.Quaternion()));
 assert(direction.z<-.95&&Math.abs(direction.y)<.08,'horizontal barrel when running');
 assert(pos(u.assaultLeftGrip).distanceTo(left())<.2,'support hand when running');
 for(let i=0;i<35;i++)animate({crouching:true});
 assert(pos(u.assaultMuzzle).y<muzzle.y-.30,'crouch lowers muzzle');
 assert(pos(u.assaultLeftGrip).distanceTo(left())<.2,'support hand while crouching');
 for(let i=0;i<35;i++)animate({assaultRifleEquipped:false});
 assert(Math.abs(u.head.rotation.z)<.008,'head returns upright');
 assert.equal(u.assault.visible,false,'hidden after unequip');
 console.log('PASS assault rifle: true muzzle, both hands, head 10deg, running and crouch');
})().catch(error=>{console.error(error);process.exitCode=1});
