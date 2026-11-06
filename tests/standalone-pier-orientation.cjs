#!/usr/bin/env node
'use strict';
// Regressió d'una captura real: llavor 2728631024, jugador X -1074 Z -740.
// Es construeix el món lògic complet; no és una costa sintètica.
const assert=require('node:assert/strict');
const createGame=require('./harness.cjs');
(async()=>{
 const game=await createGame();
 game.run("seedSearchMode=true;seedSearchCategoryEl.value='vehicle'");
 for(const scale of [1,2]){
  game.start('2728631024',scale);
  const data=JSON.parse(game.run(`JSON.stringify((()=>{
   const planner=window.HUNTER_COMPOUND_PLANNING.createStandalonePortPlanner({
     rawHAt,landSteps
   });
   return {
     seed:seed>>>0,scale:MAP_SCALE,
     piers:(world.userData.standalonePiers||[]).map(p=>({
       shore:p.shore,end:p.end,
       safe:planner.standalonePierFootprintSafe(p),
       length:Math.hypot(p.end.x-p.shore.x,p.end.z-p.shore.z),
       distanceFromCapture:Math.round(Math.hypot(p.shore.x+1074,p.shore.z+740))
     }))
   };
  })())`));
  assert.equal(data.seed,2728631024,'requested seed preserved');
  assert.equal(data.scale,scale,'requested map scale preserved');
  assert(data.piers.length>0,'the safety guard must not delete all standalone docks');
  for(const p of data.piers){
   assert.equal(p.safe,true,'invalid shore-oriented pier '+JSON.stringify(p));
   assert(p.length>=14,'dock retains accessible length');
  }
  console.log('PASS screenshot seed '+data.seed+' scale '+scale+
   ': '+data.piers.length+' docks with dry entrances and water on both sides'+
   ', nearest to capture '+Math.min(...data.piers.map(p=>p.distanceFromCapture))+' m');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
