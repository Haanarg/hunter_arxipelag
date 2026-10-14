const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('12345',1);
 const report=game.run(`(()=>{
   const tower=E.find(u=>u.t==='torre');
   if(!tower)throw new Error('No defensive tower on test map');
   const legs=tower.towerLegColliders.slice(),
         fullRoot=tower.o.userData.enemyFullRoot,
         mid=tower.o.userData.enemyMidMesh,
         far=tower.o.userData.enemyFarMesh,
         initialDB=DB.slice(),initialKills=kills,
         collidersBefore=wallCandidates(tower.x,tower.z,5).filter(w=>w.towerLegOwner===tower).length;
   // Les dues representacions simplificades no s'han de convertir mai
   // en fragments de la torre quan es destrueix.
   window.HUNTER_ENEMY_LOD.setLevel(tower.o,'far');
   dmgW(legs[0],tower.hp+5);
   const fragments=DB.filter(d=>!initialDB.includes(d)),
         remainingLegs=legs.filter(w=>Wl.includes(w)).length,
         cached=wallCandidates(tower.x,tower.z,5).filter(w=>w.towerLegOwner===tower).length,
         allSmall=fragments.every(d=>d.m.geometry===dgeo),
         noProxy=fragments.every(d=>d.m.geometry!==mid.geometry&&d.m.geometry!==far.geometry),
         smallDimensions=fragments.every(d=>d.s0.x<=1.5&&d.s0.y<=1.5&&d.s0.z<=1.5),
         initiallyAttached=fragments.every(d=>d.m.parent===world);
   for(let i=0;i<55;i++)updDeb(.1);
   const disappearing=fragments.every(d=>!DB.includes(d)&&d.m.parent!==world);
   return {collidersBefore,removed:!E.includes(tower)&&
       !world.children.includes(tower.o)&&tower.destroyed,
     killsAdded:kills-initialKills,remainingLegs,cached,
     oldColliderReferences:legs.length,fragments:fragments.length,
     allSmall,noProxy,smallDimensions,initiallyAttached,disappearing,
     fullRootChildren:fullRoot.children.length,
     remainingOldMeshes:DB.filter(d=>d.m.geometry===mid.geometry||d.m.geometry===far.geometry).length};
 })()`);
 for(const key of ['removed','allSmall','noProxy','smallDimensions','initiallyAttached',
   'disappearing'])assert(report[key],key+': '+JSON.stringify(report));
 assert.equal(report.collidersBefore,4,'four tower legs in collision index');
 assert.equal(report.remainingLegs,0,'removed legs from actual Wl');
 assert.equal(report.cached,0,'rebuild wall grid after tower destruction');
 assert.equal(report.oldColliderReferences,4,'initial tower has four leg colliders');
 assert.equal(report.fragments,26,'replace complete meshes with 26 small fragments');
 assert.equal(report.remainingOldMeshes,0,'no LOD proxies copied into wreckage');
 assert(report.killsAdded>=1,'destroying tower credits kill');
 console.log('PASS: tower destruction removes LOD proxies, leg colliders and fragments cleanly',
  JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
