#!/usr/bin/env node
'use strict';
// Rider remot simplificat; el jugador local i la mira mantenen totes
// les articulacions i l'arma original.
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const game=await require('./harness.cjs')();
 const result=game.run(`(()=>{
   const T=THREE;
   const subject={t:'moto',v:0,hd:0,x:0,y:0,z:0,pedalPhase:0,
     o:{position:new T.Vector3(0,0,0),quaternion:new T.Quaternion(),userData:{}}};
   riderSystem.update(subject,.016,0,0);
   const model=riderSystem.object,u=model.userData,
     fullCount=u.riderDetailNodes.length;
   const near={far:u.riderFarActive,proxy:u.riderFarProxy.visible,
     details:u.riderDetailNodes.filter(n=>n.visible).length};
   riderSystem.update(subject,.016,0,900);
   const far={far:u.riderFarActive,proxy:u.riderFarProxy.visible,
     details:u.riderDetailNodes.filter(n=>n.visible).length,
     proxyMeshes:u.riderFarProxy.children.filter(n=>n.isMesh).length,
     visible:model.visible};
   riderSystem.update(subject,.016,0,390);
   const stable=u.riderFarActive;
   riderSystem.update(subject,.016,0,300);
   const restored={far:u.riderFarActive,proxy:u.riderFarProxy.visible,
     details:u.riderDetailNodes.filter(n=>n.visible).length};
   riderSystem.reset();
   return {fullCount,near,far,stable,restored};
 })()`);
 assert(result.fullCount>5);
 assert.equal(result.near.far,false);
 assert.equal(result.far.proxy,true);
 assert.equal(result.far.details,0);
 assert.equal(result.far.proxyMeshes,2);
 assert.equal(result.far.visible,true);
 assert.equal(result.stable,true,'hysteresis avoids oscillations');
 assert.equal(result.restored.far,false);
 assert.equal(result.restored.proxy,false);
 assert(result.restored.details>5,'all original arms, legs, head restored');
 const coop=fs.readFileSync('src/coop-world-runtime.js','utf8');
 assert(coop.includes('riderDistance'),'native COOP updates rider LOD');
 assert(coop.includes('riderFocused?0:'),'sniper focus keeps original rider mesh');
 console.log('PASS coop remote two-mesh rider, close player detail, sniper override and hysteresis');
})().catch(e=>{console.error(e);process.exitCode=1});
