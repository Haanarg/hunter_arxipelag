#!/usr/bin/env node
'use strict';
// Complement the independent semantic matrix with exact physical-buffer parity,
// activation/clock lifecycle, pre-await failure recovery and partial-tile disposal.
// The fixed geometry fingerprint was captured with untouched upstream 651884f,
// v0.5.79, seed 67 / scale 1 / desktop, before frames, with ambient LCG below.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const createGame=require('./harness.cjs');
const snapshotSource=require('./phase10-snapshot.cjs');
const manifest=require('./fixtures/phase10/manifest.json');
const GEOMETRY_BASELINE='8c64015e34be5868a382ac2d14501452c76f218499ee9d203a5f20325e2635ca';
function seedAmbient(game){
  let ambient=0x10c0ffee;
  game.context.Math.random=()=>{ambient=(Math.imul(ambient,1664525)+1013904223)>>>0;return ambient/4294967296};
}
function semanticBaseline(game,physical){
  const expected=manifest.cases.find(c=>c.seed===67&&c.scale===1&&c.physical===physical);
  const actual=crypto.createHash('sha256').update(JSON.stringify(game.run(snapshotSource))).digest('hex');
  assert.equal(actual,expected.sha256,'complete semantic state and continuation of R match untouched baseline');
}
function geometryFingerprint(game){
  const hash=crypto.createHash('sha256');
  game.context.hashGenerationPart=value=>{
    if(typeof value==='string')hash.update(value);
    else hash.update(Buffer.from(value.buffer,value.byteOffset,value.byteLength));
  };
  const nodes=game.run(`(()=>{let count=0;world.traverse(o=>{
    count++;hashGenerationPart(JSON.stringify([o.type,o.name,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.visible]));
    if(o.geometry){const g=o.geometry;
      for(const key of Object.keys(g.attributes).sort()){hashGenerationPart(key);hashGenerationPart(g.attributes[key].array)}
      if(g.index)hashGenerationPart(g.index.array);
    }
    if(o.isInstancedMesh){hashGenerationPart(o.instanceMatrix.array);if(o.instanceColor)hashGenerationPart(o.instanceColor.array)}
  });return count})()`);
  delete game.context.hashGenerationPart;
  return {nodes,hash:hash.digest('hex')};
}
async function finish(game,promise,between=()=>{}){
  let settled=false,error;promise.then(()=>{settled=true},e=>{settled=true;error=e});
  let turns=0;
  while(!settled){
    const worked=await game.runTask();
    if(!settled&&worked)between(++turns);
    if(!worked)await game.microtasks();
    assert(turns<100000,'cooperative loading eventually settles');
  }
  if(error)throw error;await promise;return turns;
}
async function exactPhysicalParity(){
  let game=await createGame();seedAmbient(game);
  game.run('requestedSeed=67;build()');
  assert.deepEqual(geometryFingerprint(game),{nodes:15800,hash:GEOMETRY_BASELINE},'sync adapter preserves every physical geometry/instance buffer and transform');
  semanticBaseline(game,true);
  // Dispose the first complete world before allocating the second full fixture.
  game.run('discardGeneratedWorld()');game=null;
  const asyncGame=await createGame();seedAmbient(asyncGame);
  let inputEvents=0;asyncGame.context.addEventListener('progressive-test-input',()=>inputEvents++);
  const stages=new Set(),promise=asyncGame.startAsync('67',1);
  assert.equal(asyncGame.startAsync('12345',2),promise,'duplicate real start clicks share their pending operation');
  const turns=await finish(asyncGame,promise,()=>{
    assert.equal(asyncGame.run('started'),0);assert.equal(asyncGame.run('elapsed'),0);
    assert.equal(asyncGame.el('generationLoading').hidden,false,'loading remains present through all real world/minimap tasks');
    stages.add(asyncGame.el('generationStatus').textContent);
    const before=asyncGame.run('JSON.stringify([elapsed,hp,kills,Pj.length])');
    asyncGame.dispatch('window','keydown',{code:'KeyF'});
    asyncGame.dispatch('window','progressive-test-input');
    asyncGame.frame(250);
    assert.equal(asyncGame.run('JSON.stringify([elapsed,hp,kills,Pj.length])'),before,'frames/input during loading cannot simulate, damage or fire');
  });
  assert(turns>20);assert(stages.size>20,'real task labels evolve while scheduled frames and input execute');
  assert.equal(inputEvents,turns);assert.equal(asyncGame.context.HUNTER_GENERATION_STATE.status,'ready');
  assert.equal(asyncGame.el('generationLoading').hidden,true);
  assert.deepEqual(geometryFingerprint(asyncGame),{nodes:15800,hash:GEOMETRY_BASELINE},'real async UI preserves the original physical world exactly');
  semanticBaseline(asyncGame,true);
  asyncGame.dispatch('window','keyup',{code:'KeyF'});asyncGame.frame(16);
  assert(Math.abs(asyncGame.run('elapsed')-.016)<1e-9,'time spent generating never reaches the first playable frame');
  asyncGame.run('discardGeneratedWorld()');
  console.log('OK: physical sync/real async UI match untouched geometry buffers and semantic baseline; responsive tasks, no simulation/clock debt',turns);
}
async function failureAndFocus(){
  const game=await createGame();game.run('seedSearchMode=true');seedAmbient(game);
  game.run("var originalApplyGameStartOptions=applyGameStartOptions;applyGameStartOptions=()=>{throw new Error('pre-await test failure')}");
  await assert.rejects(game.startAsync('67'),/pre-await test failure/);
  assert.equal(game.run('generationPromise'),null,'failure before first await releases the promise owner');
  assert.equal(game.context.HUNTER_GENERATION_STATE.status,'error','pre-await failures cannot leave stale ready state');
  assert.equal(game.run('started'),0);assert.equal(game.el('generationLoading').hidden,true);
  game.run('applyGameStartOptions=originalApplyGameStartOptions');
  const promise=game.startAsync('67');
  await game.runTask();game.dispatch('window','blur');game.context.document.hidden=true;
  game.dispatch('document','visibilitychange');
  await finish(game,promise);
  assert.equal(game.run('started'),1);assert.equal(game.run('paused'),true,'a hidden/unfocused completed operation stays paused');
  assert.notEqual(game.el('gamepanel').style.display,'none','the completed background operation presents pause controls');
  game.context.document.hidden=false;game.dispatch('document','visibilitychange');game.dispatch('window','focus');
  game.frame(5000);assert.equal(game.run('elapsed'),0,'returning to the page never silently resumes');
  // The seed-search fixture has no building materials. Its clock check uses
  // an empty completed scene; physical gameplay is covered in the parity case.
  game.run('B=[];E=[];V=[];fa=[];items=[];resume()');game.frame(16);assert(Math.abs(game.run('elapsed')-.016)<1e-9);
  await game.context.HUNTER_CANCEL_START();
  console.log('OK: pre-await exception/retry, background completion stays paused, explicit resume resets clock');
}
async function partialTerrainDisposal(){
  const game=await createGame();
  const result=game.run(`(()=>{
    const parent=new THREE.Group(),material=new THREE.MeshLambertMaterial();let disposed=0;
    material.addEventListener('dispose',()=>disposed++);
    const iterator=window.HUNTER_TERRAIN.createSteps(THREE,{size:4800,segments:400,heightAt:(x,z)=>Math.sin(x*.003)+Math.cos(z*.004),material,parent});
    const first=iterator.next();
    if(first.done)throw new Error('initial terrain unexpectedly remained monolithic');
    iterator.return();return {disposed,remaining:parent.children.length};
  })()`);
  assert.deepEqual(JSON.parse(JSON.stringify(result)),{disposed:1,remaining:0},'cancelling an unfinished tile releases both its geometry and owned material');
  console.log('OK: cancelling initial terrain removes unfinished sector and material');
}
(async()=>{
  const only=process.env.PHASE10_PROGRESSIVE_ONLY;
  if(!only||only==='geometry')await exactPhysicalParity();
  if(!only||only==='lifecycle')await failureAndFocus();
  if(!only||only==='resources')await partialTerrainDisposal();
})().catch(error=>{console.error(error);process.exitCode=1});
