'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 const checks=game.run(`(()=>{
   const previous={world,E,cv,Px:P.x,Py:P.y,Pz:P.z,
     wallCandidates,buildingCandidates,enemyCandidatesAt,vehicleCandidatesAt,treeAt,hAt};
   const result={};
   const reset=()=>{for(const p of Pj)world.remove(p.o);Pj.length=0;};
   try{
     world=new THREE.Group();scene.add(world);
     P.x=100;P.y=1;P.z=100;cv=null;E=[];
     wallCandidates=()=>[];buildingCandidates=()=>[];
     vehicleCandidatesAt=()=>[];treeAt=()=>null;hAt=()=>0;
     const marine={x:0,z:0,hd:0,t:'patrulla_marina',hp:140,r:7.5,
       o:new THREE.Group(),destroyed:false};
     marine.o.scale.setScalar(VS.llanxa);
     enemyCandidatesAt=()=>[marine];
     const orientation=p=>new THREE.Vector3(0,0,-1).applyQuaternion(p.o.quaternion);
     shoot(-12,2,0,1,0,0,130,2,0,'p',mW,SMALL_ARMS_SCALE);
     const lateral=Pj.at(-1);
     result.lightCylinder=lateral.o.geometry===gLight&&
       gLight.type==='CylinderGeometry'&&gLight.parameters.radiusTop<.15;
     result.horizontalOrientation=orientation(lateral).x>.999;
     reset();
     shoot(0,2,0,0,1,0,130,2,0,'p',mW,SMALL_ARMS_SCALE);
     result.verticalOrientation=orientation(Pj.at(-1)).y>.999;
     reset();
     shoot(-12,6,0,1,0,0,100,2,0,'p',mW,SMALL_ARMS_SCALE);
     updPj(.15);result.overflightDoesNotDamage=marine.hp===140;
     reset();
     shoot(-12,marineHullTargetY(marine),0,1,0,0,100,2,0,'p',mW,SMALL_ARMS_SCALE);
     updPj(.15);result.centreHullDamaged=marine.hp===138;
     reset();
     const soldier={x:0,z:-20,t:'soldat',hp:10,o:new THREE.Group(),destroyed:false};
     E=[soldier];
     soldier.o.position.y=6;
     result.autoAimUp=autoAimWeaponShot(0,1,0,0,0,-1,75,.97)[1]>.2;
     soldier.o.position.y=-7;
     result.autoAimDown=autoAimWeaponShot(0,1,0,0,0,-1,75,.97)[1]<-.2;
     marine.x=0;marine.z=-50;marine.hd=-Math.PI/2;marine.speed=18;
     E=[marine];
     const focus={},direction=autoAimWeaponShot(0,2,0,0,0,-1,75,.97,
       'light',focus,130);
     result.boatLead=focus.target===marine&&direction[0]>.02;
     result.boatAimHeight=Math.abs(focus.point.y-marineHullTargetY(marine))<1e-9;
     return result;
   }finally{
     reset();scene.remove(world);world=previous.world;E=previous.E;cv=previous.cv;
     P.x=previous.Px;P.y=previous.Py;P.z=previous.Pz;
     for(const key of ['wallCandidates','buildingCandidates','enemyCandidatesAt',
       'vehicleCandidatesAt','treeAt','hAt'])globalThis[key]=previous[key];
   }
 })()`);
 for(const [name,ok] of Object.entries(checks))
   assert.equal(ok,true,name+' failed: '+JSON.stringify(checks));
 console.log('OK: cilindres lleugers 3D, autoapuntat vertical i centre real del buc');
})().catch(error=>{console.error(error);process.exitCode=1});
