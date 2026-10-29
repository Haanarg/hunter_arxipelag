#!/usr/bin/env node
'use strict';
// Regressió del parpelleig: la sincronització amaga el vehicle destruït,
// però el LOD del joc original no el pot fer reaparèixer cada 0,2 segons.
const assert=require('node:assert/strict');

(async()=>{
 const game=await require('./harness.cjs')();
 game.start('67');
 const {generateNativeMission,nativeFingerprint}=await import('../server/coop-native.mjs');
 const {restoreRelayMission}=await import('../server/coop-mission.mjs');
 const payload=game.run('captureNativeCoopWorld()');
 const room={id:'wreck-visibility',revision:1,seed:67,mapScale:1,difficulty:1,
   allReady:true,expiresAt:Date.now()+86400000,
   members:[{id:'a',name:'A'},{id:'b',name:'B'}]};
 const mission=restoreRelayMission(
   generateNativeMission(room,payload,await nativeFingerprint(JSON.stringify(payload))).record,
   payload.geometry
 );
 mission.setStatus('running');
 const state=mission.snapshot();
 assert(state.vehicles.length>=2,'Calen dos vehicles per distingir destrosses i vehicles vius');
 const wreck=state.vehicles[0],live=state.vehicles[1],actor=state.players.find(p=>p.id==='a');
 wreck.destroyed=true;wreck.life=0;wreck.seats=[null,null];
 live.destroyed=false;live.x=wreck.x+3;live.z=wreck.z+3;
 actor.x=wreck.x+1;actor.z=wreck.z+1;
 game.context.wreckState=state;
 game.run(`
   nativeCoopSession={preparing:false,self:'a',state:wreckState,
     remotes:new Map(),walls:Wl.slice(),buildings:B.slice(),palms:PL.slice(),
     vehicles:new Map(V.map(v=>[v.saveId,v])),
     enemies:new Map(E.map(e=>[e.saveId,e])),
     items:new Map(items.map(it=>[it.saveId,it])),
     projectiles:new Map(),grenades:new Map(),seenEffects:new Set(),channel:{}};
   clearKeys();paused=false;worldVisualTick=0;
 `);
 const frames=game.run(`(()=>{
   const broken=nativeCoopSession.vehicles.get(nativeCoopSession.state.vehicles[0].id);
   const intact=nativeCoopSession.vehicles.get(nativeCoopSession.state.vehicles[1].id);
   const samples=[];
   for(let i=0;i<20;i++){
     updateNativeCoop(.05);
     samples.push({brokenVisible:broken.o.visible,broken:broken.destroyed,
       intactVisible:intact.o.visible,intactDestroyed:intact.destroyed});
   }
   // La passada LOD directa tampoc no pot mostrar la carcassa.
   updateDistanceVisibility();
   return {samples,brokenVisible:broken.o.visible,intactVisible:intact.o.visible};
 })()`);
 assert(frames.samples.every(s=>s.broken&&!s.brokenVisible),
   'Un vehicle destruït reapareix entre actualitzacions de la xarxa i el LOD');
 assert(!frames.brokenVisible,'El LOD no ha de restaurar una carcassa destruïda');
 assert(frames.samples.every(s=>!s.intactDestroyed&&s.intactVisible)&&frames.intactVisible,
   'Els altres vehicles propers han de continuar visibles');
 console.log('OK multijugador: els vehicles destruïts no parpellegen al LOD ni en actualitzar la sessió');
})().catch(error=>{console.error(error);process.exitCode=1});
