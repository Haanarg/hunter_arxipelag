#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../src/performance.js'),'utf8');
const ctx=vm.createContext({window:{},Date,Math,Number,Object,Array});ctx.window=ctx;
vm.runInContext(src,ctx,{filename:'src/performance.js'});
const renderer={info:{render:{calls:420,triangles:533000}}};
const p=ctx.HUNTER_PERFORMANCE.create({renderer,maxPixelRatio:1.2});
for(let i=0;i<4;i++){
 p.sample({dt:.30,updateCpuMs:280,renderCpuMs:17,simulationSteps:15,droppedMs:56,active:true});
 p.captureActiveFrame({rawDt:.30,detailed:true,hotspots:{aiMs:250,aiUpdated:494},
   drawCategories:{terreny:20,enemics:30}});
}
assert(p.stats.fps>3&&p.stats.fps<3.5,'slow frames must produce nonzero FPS');
assert.equal(p.stats.lastActive.updateCpuMs,280);
assert.equal(p.stats.lastActive.hotspots.aiMs,250);
const snapshot=p.stats.lastActive;
p.sample({dt:.016,active:false,updateCpuMs:0,renderCpuMs:0});
assert.strictEqual(p.stats.lastActive,snapshot,'pause preserves last active frame');
const summary=p.recentSummary();
assert(summary.fps>3&&summary.fps<3.5);
assert(summary.frameMs.p95>=300);
assert(summary.updateCpuMs.mean===280);
assert.equal(summary.samples,4);
p.resetCapture();
assert.equal(p.stats.lastActive,null,'new world must not inherit stale capture');
assert.equal(p.recentSummary(),null);
console.log('PASS live FPS, active-frame snapshot, 5s percentiles, pause preservation');
