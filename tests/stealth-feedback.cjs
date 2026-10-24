#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
(async()=>{
  const game=await require('./harness.cjs')(),run=game.run;
  run(`
    world=new THREE.Group();scene.add(world);seedSearchMode=true;seed=67;R=mul(seed);
    started=1;paused=false;over=0;simulationFocused=true;document.hidden=false;cv=null;
    hAt=()=>3;B=[];Wl=[];V=[];E=[];PL.length=0;TG.clear();stairs=[];piers=[];activeBunker=null;
    P.x=0;P.y=3;P.z=0;cam.position.set(0,8,18);cam.lookAt(0,5,-8);
    globalThis.signalUnit=mkEn('soldat',0,-8,3);signalUnit.o.position.set(0,3,-8);world.add(signalUnit.o);
    signalUnit.aiMode='suspicious';signalUnit.canSee=false;
    resetSimulationClock();renderStealthFeedback();
  `);
  const visible=()=>run('stealthFeedback.stats.visible');
  assert.equal(visible(),1,'Suspicion is visible without F9');
  assert.equal(run('STEALTH.enabled()'),false);
  const modes=[];
  for(const [mode,canSee,expected] of [['suspicious',false,'suspicion'],['combat',true,'contact'],['search',false,'search'],['investigate',false,'search']]){
    run(`signalUnit.aiMode='${mode}';signalUnit.canSee=${canSee};renderStealthFeedback()`);
    assert.equal(visible(),1);assert.equal(run('stealthFeedback.entries.find(e=>e.unit===signalUnit).mode'),expected);
    modes.push(run('stealthFeedback.entries.find(e=>e.unit===signalUnit).mesh.geometry.uuid'));
    assert(run('stealthFeedback.entries.every(e=>e.mesh.material.depthTest&&!e.mesh.material.depthWrite)'),expected+' obeys depth');
  }
  assert.equal(new Set(modes).size,3,'The three states have different shapes, beyond color');
  run("Wl=[{x0:-15,x1:15,z0:0,z1:1,y0:3,y1:12,hp:Infinity,open:false,m:new THREE.Object3D()}];renderStealthFeedback()");
  assert.equal(visible(),0,'Wall hides a previously visible signal in the same render');
  run('Wl[0].m.visible=false;renderStealthFeedback()');assert.equal(visible(),0,'Camera wall hiding never bypasses physical LOS');
  run('Wl[0].open=true;renderStealthFeedback()');assert.equal(visible(),1,'Open passage permits the signal');
  run('Wl=[];cam.position.set(0,16,-8);cam.lookAt(0,3,-8);B=[{x:0,z:-8,w:12,d:12,fy:3,h:4,rhp:20}];renderStealthFeedback()');
  assert.equal(visible(),0,'Roof blocks a camera above the soldier');
  run('B=[{x:0,z:-8,w:12,d:12,localW:12,localD:12,fy:3,h:8,storey:4,upperFloor:true,rhp:20,interiorStair:{x:5,z:-13,nx:0,nz:1,length:3,width:2}}];cam.position.set(0,9,-8);cam.lookAt(0,3,-8);renderStealthFeedback()');
  assert.equal(visible(),0,'Solid upper floor blocks the lower soldier');
  run('B=[];cam.position.set(0,8,18);cam.lookAt(0,5,-8);hAt=(x,z)=>Math.abs(z)<1?12:3;renderStealthFeedback()');
  assert.equal(visible(),0,'Terrain ridge blocks signals');
  run("hAt=()=>3;globalThis.signalTruck={t:'camio',x:0,z:0,o:mkV('camio')};signalTruck.o.position.set(0,3,0);world.add(signalTruck.o);V=[signalTruck];rebuildVehicleGrid();renderStealthFeedback()");
  assert.equal(visible(),0,'Vehicle geometry blocks the visible body');
  run('V=[];rebuildVehicleGrid();cam.lookAt(0,8,40);renderStealthFeedback()');assert.equal(visible(),0,'No signal behind the camera');
  run('cam.position.set(0,8,130);cam.lookAt(0,5,-8);renderStealthFeedback()');assert.equal(visible(),0,'Distance is bounded');
  run('cam.position.set(0,8,18);cam.lookAt(0,5,-8);signalUnit.aiMode="patrol";signalUnit.canSee=false;renderStealthFeedback()');
  assert.equal(visible(),0,'Unaware patrol has no signal');
  run('signalUnit.aiMode="search";E=[];renderStealthFeedback()');assert.equal(visible(),0,'Removed live unit loses marker ownership');
  run('E=[signalUnit]');
  run('signalUnit.aiMode="search";signalUnit.hp=0;renderStealthFeedback()');assert.equal(visible(),0,'Dead soldier has no signal');
  run(`signalUnit.hp=4;E=[];
    for(let i=0;i<200;i++){const u=mkEn('soldat',(i%12-6)*2,-8-Math.floor(i/12),3);u.o.position.set(u.x,3,u.z);world.add(u.o);u.aiMode='search'}
    for(let n=0;n<10;n++)renderStealthFeedback()`);
  assert(run('stealthFeedback.stats.allocated<=24&&stealthFeedback.stats.visible<=24&&stealthFeedback.stats.checks<=48'),
    'Crowds retain bounded allocations and visibility work');
  for(const transition of ['panel("pause")','over=1;renderStealthFeedback()','document.hidden=true;renderStealthFeedback()']){
    run('paused=false;over=0;document.hidden=false;renderStealthFeedback()');run(transition);
    assert.equal(visible(),0,transition+' hides all signals');
    assert(run('stealthFeedback.entries.every(e=>!e.mesh.parent&&!e.unit)'),transition+' clears pool ownership');
  }
  run('paused=false;over=0;document.hidden=false;renderStealthFeedback();resetSimulationClock()');
  assert.equal(visible(),0,'World/lifecycle reset detaches signals');
  console.log('OK sigil visible: formes, frustum/distància, LOS mur/teulada/terreny/vehicle, actualització immediata i pool24/checks48');
})().catch(error=>{console.error(error);process.exitCode=1});
