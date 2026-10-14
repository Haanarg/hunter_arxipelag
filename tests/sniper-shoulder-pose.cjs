const assert=require('node:assert/strict');
(async()=>{
 const g=await require('./harness.cjs')();
 const report=g.run(`(()=>{
   const player=pl,u=pl.userData,rifle=u.sniper;
   const testPose=(running=false)=>{
     for(let n=0;n<90;n++)window.HUNTER_CHARACTERS.animatePlayer(player,{
       forward:running?1:0,dt:1/60,swimming:false,inVehicle:false,ammo:16,
       sniperEquipped:true
     });
     player.position.set(0,0,0);player.rotation.set(0,0,0);
     player.updateMatrixWorld(true);
     const worldPosition=(obj,p)=>obj.localToWorld(p.clone()),
           hand=(joint)=>worldPosition(joint,new THREE.Vector3(0,-.744,-.03)),
           right=hand(u.aer),left=hand(u.ael),
           targetRight=u.sniperRightGrip.getWorldPosition(new THREE.Vector3()),
           targetLeft=u.sniperLeftGrip.getWorldPosition(new THREE.Vector3()),
           butt=worldPosition(rifle,new THREE.Vector3(0,-.13,1.59)),
           shoulder=u.ar.getWorldPosition(new THREE.Vector3()),
           muzzle=u.sniperMuzzle.getWorldPosition(new THREE.Vector3()),
           trigger=u.sniperRightGrip.getWorldPosition(new THREE.Vector3()),
           guard=u.sniperLeftGrip.getWorldPosition(new THREE.Vector3());
     return {
       bothHands:rifle.visible&&u.gun.visible===false,
       rightDistance:right.distanceTo(targetRight),
       leftDistance:left.distanceTo(targetLeft),
       buttShoulderDistance:butt.distanceTo(shoulder),
       buttRelative:{x:butt.x-shoulder.x,y:butt.y-shoulder.y,z:butt.z-shoulder.z},
       rearBehindSpine:butt.z,
       muzzleAhead:-muzzle.z,
       separation:right.distanceTo(left),
       guardForward:guard.z<trigger.z,
       armAngles:[u.ar.rotation.x,u.aer.rotation.x,u.al.rotation.x,u.ael.rotation.x],
       points:{butt:butt.toArray(),right:right.toArray(),left:left.toArray(),
         rifleRight:targetRight.toArray(),rifleLeft:targetLeft.toArray(),
         shoulder:shoulder.toArray()}
     };
   };
   const idle=testPose(),walk=testPose(true);
   // La mira ha de moure la boca del canó i els ancoratges de les mans
   // junts en canviar la rotació del rifle.
   rifle.rotation.set(.08,.10,0,'YXZ');
   const aimed=testPose();
   rifle.rotation.set(0,0,0,'YXZ');
   return {idle,walk,aimed};
 })()`);
 console.log('SNIPER_SHOULDER',JSON.stringify(report));
 for(const [name,pose] of Object.entries(report)){
   assert(pose.bothHands,name+' rifle visible and pistol hidden');
   assert(pose.buttShoulderDistance<.34,name+' butt not against right shoulder');
   assert(pose.rearBehindSpine<.2,name+' stock protrudes from back');
   assert(pose.muzzleAhead>1.75&&pose.muzzleAhead<3,name+' muzzle out of expected range');
   assert(pose.rightDistance<.15,name+' right hand missing trigger');
   assert(pose.leftDistance<.15,name+' left hand missing foregrip');
   assert(pose.separation>.12,name+' distinct two-hand supports');
 }
 assert(report.idle.guardForward,'left hand must be farther forward than right');
})().catch(e=>{console.error(e);process.exitCode=1});
