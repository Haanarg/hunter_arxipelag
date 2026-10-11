const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')(),run=game.run;
 const result=run(`(()=>{
   world=new THREE.Group();scene.add(world);
   const original={wallCandidates,buildingCandidates,enemyCandidatesAt,
     vehicleCandidatesAt,treeAt,hAt,dmgW,hurtE,hurtP,damageVehicle,boom,cv};
   const checks={},fresh=()=>{for(const p of Pj)world.remove(p.o);Pj.length=0;clearBulletImpacts()},
         a={x:0,z:0,o:{position:{y:.5}},r:1,t:'soldat'},
         eveh={x:0,z:0,o:{position:{y:1}},r:2.5,t:'tanqueta'},
         vehicle={x:0,z:0,o:{position:{y:1}},t:'cotxe',armor:0};
   let victims=0;
   try{
     wallCandidates=()=>[];buildingCandidates=()=>[];
     enemyCandidatesAt=()=>[];vehicleCandidatesAt=()=>[];
     treeAt=()=>null;hAt=()=>0;
     dmgW=()=>{victims++};hurtE=()=>{victims++};hurtP=()=>{victims++};
     damageVehicle=()=>{victims++};boom=()=>{};
     P.x=0;P.z=0;P.y=.5;cv=null;
     const fireTest=(owner='p',splash=0)=>{
       shoot(-9,2,0,1,0,0,100,7,splash,owner,mW,.7);
       updPj(.12);
     };
     enemyCandidatesAt=()=>[a];fireTest();
     checks.soldier=bulletCount();
     function bulletCount(){return bulletImpacts.length}
     checks.soldierBlood=checks.soldier===5&&bulletImpacts.every(f=>f.m.geometry===bulletBloodGeometry);
     fresh();enemyCandidatesAt=()=>[{...a,t:'general'}];fireTest();
     checks.generalBlood=bulletImpacts.length===5&&bulletImpacts.every(f=>f.m.geometry===bulletBloodGeometry);
     fresh();enemyCandidatesAt=()=>[eveh];fireTest();
     checks.enemyVehicleSpark=bulletImpacts.length===7&&bulletImpacts.every(f=>f.m.geometry===bulletSparkGeometry);
     fresh();enemyCandidatesAt=()=>[];
     cv=null;fireTest('e');
     checks.playerBlood=bulletImpacts.length===5&&bulletImpacts.every(f=>f.m.geometry===bulletBloodGeometry);
     fresh();cv=vehicle;vehicleCandidatesAt=()=>[vehicle];fireTest('e');
     checks.playerVehicleSpark=bulletImpacts.length===7&&bulletImpacts.every(f=>f.m.geometry===bulletSparkGeometry);
     fresh();cv=null;vehicleCandidatesAt=()=>[vehicle];fireTest('p');
     checks.otherVehicleSpark=bulletImpacts.length===7;
     fresh();vehicleCandidatesAt=()=>[];
     wallCandidates=()=>[{open:false,x0:-1,x1:1,y0:1,y1:3,z0:-1,z1:1,hp:100}];fireTest('p');
     checks.wallSpark=bulletImpacts.length===7;
     fresh();wallCandidates=()=>[];
     buildingCandidates=()=>[{x:0,z:0,w:4,d:4,fy:0,h:2,rhp:100,hangar:false}];fireTest('p');
     checks.buildingSpark=bulletImpacts.length===7;
     fresh();buildingCandidates=()=>[];enemyCandidatesAt=()=>[a];
     fireTest('p',8);
     checks.explosionExcluded=bulletImpacts.length===0;
     fresh();enemyCandidatesAt=()=>[];
     spawnBulletImpact('blood',0,2,0,{vx:1,vy:0,vz:0});
     updateBulletImpacts(.5);
     checks.shortLived=bulletImpacts.length===0&&bulletImpactFree.length>=5;
     const pooled=bulletImpactFree.length;
     spawnBulletImpact('blood',0,2,0,{vx:1,vy:0,vz:0});
     checks.reused=bulletImpactFree.length===pooled-5;
     fresh();
     for(let i=0;i<50;i++)spawnBulletImpact('spark',0,2,0,{vx:1,vy:0,vz:0});
     checks.capped=bulletImpacts.length===BULLET_IMPACT_LIMIT;
     checks.damageStillApplied=victims>=7;
     fresh();
     checks.cleaned=bulletImpacts.length===0&&world.children.length===0;
   }finally{
     fresh();
     wallCandidates=original.wallCandidates;buildingCandidates=original.buildingCandidates;
     enemyCandidatesAt=original.enemyCandidatesAt;vehicleCandidatesAt=original.vehicleCandidatesAt;
     treeAt=original.treeAt;hAt=original.hAt;dmgW=original.dmgW;hurtE=original.hurtE;
     hurtP=original.hurtP;damageVehicle=original.damageVehicle;boom=original.boom;cv=original.cv;
     scene.remove(world);
   }
   return checks
 })()`);
 for(const [name,ok] of Object.entries(result))assert(ok,name+' failed: '+JSON.stringify(result));
 console.log('PASS: impactes de bales normals, sang, espurnes, reciclatge i límit',JSON.stringify(result));
})().catch(error=>{console.error(error);process.exitCode=1});
