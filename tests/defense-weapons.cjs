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
     cv,disg,over,player:{x:P.x,y:P.y,z:P.z},shots:Pj.length};
   const emit=[],fire=(...args)=>emit.push({speed:args[6],damage:args[7],
     splash:args[8],owner:args[9],type:shotClassFromSplash(args[8])});
   const turret=E.find(u=>u.t==='torre'),rocket=E.find(u=>u.rocketSoldier);
   let first=[],lightOnly=[],heavyOnly=[],bazooka=[];
   try{
     cv=null;disg=false;over=0;
     sight=()=>true;shoot=fire;
     E=[turret];P.x=turret.x;P.y=turret.o.position.y;P.z=turret.z-35;
     turret.cd=-.01;turret.heavyCd=-.01;turret.senseT=-.01;
     updEn(.016);first=emit.splice(0);
     turret.cd=-.01;turret.heavyCd=2;updEn(.016);lightOnly=emit.splice(0);
     turret.cd=2;turret.heavyCd=-.01;updEn(.016);heavyOnly=emit.splice(0);
     E=[rocket];P.x=rocket.x;P.y=rocket.o.position.y;P.z=rocket.z-20;
     soldierClearShot=()=>true;soldierEngage=()=>{};soldierEnterBuilding=()=>false;
     rocket.cd=-.01;rocket.senseT=-.01;rocket.canSee=false;
     updEn(.016);bazooka=emit.splice(0);
   }finally{
     E=saved.E;sight=saved.sight;shoot=saved.shoot;
     soldierClearShot=saved.soldierClearShot;soldierEngage=saved.soldierEngage;
     soldierEnterBuilding=saved.soldierEnterBuilding;
     cv=saved.cv;disg=saved.disg;over=saved.over;
     P.x=saved.player.x;P.y=saved.player.y;P.z=saved.player.z;
     rebuildVehicleGrid();
   }
   return {first,lightOnly,heavyOnly,bazooka};
 })()`);
 assert.equal(shots.first.length,2,'tower fires both guns on same frame');
 assert.deepEqual(shots.first.map(x=>x.type).sort(),['heavy','light']);
 assert.equal(shots.lightOnly.length,1,'tower light gun has an independent cooldown');
 assert.equal(shots.lightOnly[0].type,'light');
 assert.equal(shots.heavyOnly.length,1,'tower heavy gun has an independent cooldown');
 assert.equal(shots.heavyOnly[0].type,'heavy');
 assert.equal(shots.bazooka.length,1,'specialist soldier fires only one rocket');
 assert.equal(shots.bazooka[0].type,'heavy');
 assert(shots.first.find(s=>s.type==='heavy').damage>shots.first.find(s=>s.type==='light').damage);
 assert(shots.first.every(s=>s.owner==='e'));
 console.log('PASS: independent tower guns, shared bazooka geometry and rocket guard distribution',
   JSON.stringify({distribution,shots}));
})().catch(e=>{console.error(e);process.exitCode=1});
