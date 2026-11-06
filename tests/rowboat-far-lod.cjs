#!/usr/bin/env node
'use strict';
// LOD òval de la barca de rems: només modifica visibilitat de malles.
const assert=require('node:assert/strict');
(async()=>{
  const game=await require('./harness.cjs')();
  const model=game.run("mkV('barca_rems')");
  const lod=model.userData.rowboatVisualLod;
  assert(lod,'every rowing boat has a distant visual proxy');
  assert.equal(lod.far.name,'rowboat-far-oval');
  assert(lod.far.isMesh);
  assert.equal(lod.far.geometry.type,'SphereGeometry');
  assert(lod.far.material.color.getHex()!==0x00ff00);
  assert.equal(lod.far.visible,false);
  assert(lod.full.length>=2,'full model includes hull and rowing pivot');
  assert.equal(model.userData.oars.length,2,'near model retains both animated oars');
  const fn=game.context.HUNTER_VEHICLES.setRowboatVisualLod;
  assert.equal(fn(model,true),true);
  assert.equal(lod.far.visible,true);
  assert(lod.full.every(node=>node.visible===false),'all detailed hull/oars/mask hidden when far');
  assert.equal(fn(model,true),false,'no work without LOD transition');
  assert.equal(fn(model,false),true);
  assert.equal(lod.far.visible,false);
  assert(lod.full.every(node=>node.visible===true),'original hull/oars/mask restored');
  const simple=game.run("mkV('barca_rems')");
  assert(simple.userData.rowboatVisualLod!==lod,'each boat controls its own LOD');
  const src=require('node:fs').readFileSync('src/game-core.js','utf8');
  assert(src.includes('limit=currentFar?660:740'),'LOD uses distance hysteresis');
  assert(src.includes('v!==cv&&!focus&&d2>limit*limit'),'driver and sniper retain original detail');
  assert(src.includes('setRowboatVisualLod(v.o,'),'shared visual updater switches actual model');
  console.log('PASS rowboat oval LOD, no oars far, full restoration, hysteresis, player/scope safety');
})().catch(e=>{console.error(e);process.exitCode=1});
