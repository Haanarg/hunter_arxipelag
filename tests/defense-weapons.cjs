const assert=require('node:assert/strict');
(async()=>{
 const g=await require('./harness.cjs')();
 g.start('12345',1);
 const distribution=g.run(`(()=>{
   const groups=world.userData.compounds.filter(c=>c.id!=='base');
   const guards=groups.flatMap(c=>c.soldiers);
   const specialists=guards.filter(u=>u.rocketSoldier);
   const pMeshes=[],eMeshes=[];
   const full=u=>u.o.userData.bazooka&&u.o.userData.bazooka.parent===u.o.userData.enemyFullRoot;
   const collect=(root,arr)=>root.traverse(o=>{if(o.isMesh)arr.push({
     type:o.geometry.type,params:JSON.stringify(o.geometry.parameters||{}),
     color:o.material.color?.getHex()
   })});
   collect(pl.userData.bazooka,pMeshes);
   if(specialists[0])collect(specialists[0].o.userData.bazooka,eMeshes);
   return {
     guards:guards.length,specialists:specialists.length,
     counter:world.userData.compoundGuardCount,
     troopTypes:specialists.map(u=>u.t),
     allMilitary:specialists.every(u=>u.compound&&u.compound!=='base'),
     fullLOD:specialists.every(u=>full(u)),
     lod:specialists.every(u=>u.o.userData.enemyMidMesh.children.length>0&&
       u.o.userData.enemyFarMesh.children.length>0),
     realBazooka:JSON.stringify(pMeshes)===JSON.stringify(eMeshes),
     gunsHidden:specialists.every(u=>u.o.userData.gun.visible===false),
     rate:specialists.map(u=>u.rate),
     noFriendlyBazookas:!world.userData.compounds
       .filter(c=>c.id==='base').some(c=>c.soldiers.some(u=>u.rocketSoldier))
   };
 })()`);
 assert(distribution.guards>=5,'Not enough military compound guards for distribution');
 assert.equal(distribution.specialists,Math.floor(distribution.guards/5),'One in five guards');
 for(const key of ['allMilitary','fullLOD','lod','realBazooka','gunsHidden','noFriendlyBazookas'])
   assert(distribution[key],key+': '+JSON.stringify(distribution));
 const shots=g.run(`(()=>{
   const saved={E,sight,shoot,soldierClearShot,soldierEngage,soldierEnterBuilding,
     cv,disg,over,player:{x:P.x,y:P.y,z:P.z}};
   const emit=[],fire=(...args)=>emit.push({speed:args[6],damage:args[7],
     splash:args[8],owner:args[9],type:shotClassFromSplash(args[8])});
   const turret=E.find(u=>u.t==='torre'),rocket=E.find(u=>u.rocketSoldier);
   const results={};
   const at=(type,dist=35,lightReady=true,heavyReady=true)=>{
     emit.length=0;E=[turret];
     P.x=turret.x;P.y=turret.o.position.y;P.z=turret.z-dist;
     cv=type?{t:type,x:P.x,y:P.y,z:P.z,o:{position:{y:P.y}},
       armor:VT[type].armor}:null;
     turret.cd=lightReady?-.1:2;
     turret.heavyCd=heavyReady?-.1:2;
     turret.senseT=-1;
     updEn(.016);
     return emit.slice();
   };
   try{
     disg=false;over=0;sight=()=>true;shoot=fire;
     results.footBothReady=at(null);
     results.footHeavyReadyOnly=at(null,35,false,true);
     results.footLightReadyOnly=at(null,35,true,false);
     results.moto=at('moto');
     results.car=at('cotxe');
     results.ferry=at('ferry');
     results.helicopter=at('heli');
     results.tankBothReady=at('tanc');
     results.tankHeavyRecharging=at('tanc',35,true,false);
     results.tankOnlyHeavyReady=at('tanc',35,false,true);
     results.tankette=at('tanqueta');
     results.attackHelicopter=at('heli_combat');
     results.tankOutOfHeavyRange=at('tanc',104);
     results.footAtLongRange=at(null,104);
     // El soldat especialista manté el projectil pesat independent.
     emit.length=0;E=[rocket];cv=null;
     P.x=rocket.x;P.y=rocket.o.position.y;P.z=rocket.z-20;
     soldierClearShot=()=>true;soldierEngage=()=>{};soldierEnterBuilding=()=>false;
     rocket.cd=-.1;rocket.senseT=-1;rocket.canSee=false;
     updEn(.016);results.bazooka=emit.slice();
   }finally{
     E=saved.E;sight=saved.sight;shoot=saved.shoot;
     soldierClearShot=saved.soldierClearShot;soldierEngage=saved.soldierEngage;
     soldierEnterBuilding=saved.soldierEnterBuilding;
     cv=saved.cv;disg=saved.disg;over=saved.over;
     P.x=saved.player.x;P.y=saved.player.y;P.z=saved.player.z;
     rebuildVehicleGrid();
   }
   return results;
 })()`);
 const expect=(name,type)=>{
   const result=shots[name];
   assert.equal(result.length,type?1:0,name+': '+JSON.stringify(shots));
   if(type)assert.equal(result[0].type,type,name);
 };
 for(const name of ['footBothReady','footLightReadyOnly','moto','car','ferry',
   'helicopter','footAtLongRange'])expect(name,'light');
 for(const name of ['tankBothReady','tankOnlyHeavyReady','tankette',
   'attackHelicopter'])expect(name,'heavy');
 for(const name of ['footHeavyReadyOnly','tankHeavyRecharging',
   'tankOutOfHeavyRange'])expect(name,null);
 expect('bazooka','heavy');
 assert(shots.tankBothReady[0].damage>shots.footBothReady[0].damage);
 assert(shots.tankBothReady[0].splash>0&&shots.footBothReady[0].splash===0);
 assert(shots.tankBothReady[0].speed>0);
 console.log('PASS: towers choose fastest damaging gun; one gun per target and independent cooldowns',
   JSON.stringify({distribution,shots}));
})().catch(e=>{console.error(e);process.exitCode=1});
