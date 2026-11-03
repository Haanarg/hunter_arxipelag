'use strict';
// Regressió 3D del bazuca: reposat a l'espatlla dreta i agafat per sota.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const T=await import('../vendor/three-r186.module.mjs');
 const {playerModel}=await import('../src/player-model-core.mjs');
 const palette={player:{},enemy:{primary:0x556644,general:0x778855,vest:0x445533,
   secondary:0x334422,skin:0xe0c0a0,dark:0x101a10,metal:0x444444}};
 const w={HUNTER_PALETTE:palette,HUNTER_PLAYER_MODEL:playerModel,
   HUNTER_PLAYER_BATCH:{optimize:()=>({})},
   HUNTER_BOLT_CUTTERS:{create:()=>new T.Group(),pose:()=>{}}};
 vm.runInNewContext(fs.readFileSync('src/characters.js','utf8'),
   {window:w,knifeEquipped:false});
 const box=(g,a,b,c,color,x=0,y=0,z=0)=>{
   const mesh=new T.Mesh(new T.BoxGeometry(a,b,c),new T.MeshStandardMaterial({color}));
   mesh.position.set(x,y,z);g.add(mesh);return mesh;
 };
 const player=w.HUNTER_CHARACTERS.createPlayer(T,{box,palette}),u=player.userData;
 const position=o=>o.getWorldPosition(new T.Vector3());
 const wrist=(elbow)=>elbow.localToWorld(new T.Vector3(0,-.744,-.03));
 const animate=(extra={})=>{
   w.HUNTER_CHARACTERS.animatePlayer(player,{
     forward:0,strafe:0,dt:.08,swimming:false,inVehicle:false,
     ammo:10,bazookaEquipped:true,...extra
   });
   player.updateMatrixWorld(true);
 };
 const settle=(extra={})=>{for(let i=0;i<45;i++)animate(extra)};
 const checkHands=(context,maxError=.20)=>{
   assert(position(u.bazookaRightGrip).distanceTo(wrist(u.aer))<maxError,
     'Right hand below the bazooka: '+context);
   assert(position(u.bazookaLeftGrip).distanceTo(wrist(u.ael))<maxError,
     'Left support hand stays attached: '+context);
 };
 const checkShoulder=context=>{
   const rear=u.bazooka.localToWorld(new T.Vector3(0,0,1.34));
   const shoulder=position(u.ar);
   assert(Math.abs(rear.x-shoulder.x)<.38,'Rear must stay over right shoulder, X: '+context);
   assert(Math.abs(rear.z-shoulder.z)<.48,'Rear must remain at the shoulder, Z: '+context);
   assert(rear.y>shoulder.y+.12&&rear.y<shoulder.y+.55,
     'Rear of launcher rests on top of shoulder: '+context);
 };
 assert(u.bazooka.userData.stockAnchor,'Bazooka must have a shoulder anchor');
 assert(u.bazooka.userData.stockToReceiver,'Bazooka must pivot around rear anchor');
 assert(u.bazookaRightGrip.position.y<-.28,'Right grip must be below the tube');
 assert(u.bazookaRightGrip.position.z>u.bazookaLeftGrip.position.z,
   'Right support behind left support');
 settle();checkHands('idle');checkShoulder('idle');
 settle({forward:1,running:true});checkHands('running',.24);checkShoulder('running');
 settle({crouching:true});checkHands('crouched',.24);checkShoulder('crouched');
 for(const yaw of [-.55,.55]){
   u.visualAimDirection=new T.Vector3(Math.sin(yaw),.10,-Math.cos(yaw)).normalize();
   settle();checkHands('autoaim yaw '+yaw,.24);checkShoulder('autoaim yaw '+yaw);
 }
 settle({bazookaEquipped:false});
 assert.equal(u.bazooka.visible,false,'Unequipping hides launcher');
 console.log('PASS bazooka pose: right shoulder, underbarrel hand, IK during aim/run/crouch');
})().catch(error=>{console.error(error);process.exitCode=1});
