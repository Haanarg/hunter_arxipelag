import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {runtimeLayouts,chooseCompoundLayout} from '../src/compound-runtime-layouts.mjs';
import {createWorldRandom,generateTerrainFoundation} from '../src/world-generation-core.mjs';
import {planCompound,compoundPoint} from '../src/compound-planning.mjs';
import {createCoopTerrain} from '../server/coop-terrain.mjs';
const require=createRequire(import.meta.url),reference=require('./fixtures/compound-planning-v0615.cjs');
let cases=0;
for(const layout of runtimeLayouts)for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2])for(const h of [undefined,7.2]){
  const q={x:170,z:-230,angle,...(h===undefined?{}:{h})},a=createWorldRandom(67),b=createWorldRandom(67),input=JSON.stringify({layout,q});
  const actual=planCompound(layout,q,{random:a,rawHeightAt:()=>8.4}),old=reference(layout,q,b,()=>8.4);
  assert.deepEqual(actual,old,layout.layoutId+' coordinates/pad');assert.equal(a.getState(),b.getState(),'random consumption');
  assert.equal(JSON.stringify({layout,q}),input,'planning cannot mutate layout or site');
  if(actual.buildings.length){actual.buildings[0].w=999;assert.equal(JSON.stringify({layout,q}),input,'plan building is detached');}
  cases++;
}
assert.deepEqual(compoundPoint({x:10,z:20},Math.PI/2,-1)(3,5),[5,17]);
assert.throws(()=>compoundPoint({x:NaN,z:0}));
assert.throws(()=>planCompound({...runtimeLayouts[0],size:[0,10]},{x:0,z:0},{random:()=>0,rawHeightAt:()=>1}));
for(const mapScale of [1,2]){
 const foundation=generateTerrainFoundation({seed:67,mapScale}),random=createWorldRandom(foundation.randomState),layout=chooseCompoundLayout('base',random),expected=reference(layout,foundation.baseCandidate,random,()=>foundation.baseCandidate.h),terrain=createCoopTerrain({seed:67,mapScale});
 assert.deepEqual(terrain.snapshot().basePlan,expected);assert.equal(terrain.snapshot().version,2);
 assert.equal(terrain.snapshot().randomState,foundation.randomState,'state remains before base construction, not a false continuation cursor');
 assert.equal(terrain.world.heightAt(expected.center[0],expected.center[1]),expected.height,'base pad changes physical terrain');
 assert.equal(terrain.world.snapshot().buildings.length,0,'a placement plan is not a constructed building');
 assert.equal(terrain.complete,false);assert.equal(terrain.playable,false);
 const g=await require('./harness.cjs')();g.context.testScale=mapScale;
 g.run("applyGameStartOptions({seed:67,scale:testScale});globalThis.compoundTestSteps=buildSteps();let checkpoint;do{checkpoint=compoundTestSteps.next();if(checkpoint.done)throw Error('Missing initial compounds checkpoint');}while(checkpoint.value.stage!=='Base i quarter general');");
 const live=JSON.parse(g.run("JSON.stringify({c:Object.fromEntries(['id','layoutId','variant','x','z','angle','mirror','r','entrances','patrol'].map(k=>[k,world.userData.compounds[0][k]])),level:terrainLevels[0]})"));
 for(const k of ['id','layoutId','variant','x','z','angle','mirror','r','entrances','patrol'])assert.deepEqual(live.c[k],expected[k],'real game first compound '+k);
 assert.deepEqual(live.level,expected.level,'real game first physical level');
 g.run('compoundTestSteps.return();discardGeneratedWorld()');
}
console.log(`compound planning: ${cases} layout/orientation/height cases against frozen main, random parity, copies, base terrain and real game in both scales passed`);
