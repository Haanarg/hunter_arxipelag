#!/usr/bin/env node
'use strict';
// Diagnòstic del pacing RAF i queries GPU sense sincronitzar la CPU.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const window={};
vm.runInNewContext(fs.readFileSync('src/performance-audit.js','utf8'),{window});
const audit=window.HUNTER_PERFORMANCE_AUDIT;
const rows=[
 {frameMs:16.7,renderCpuMs:10,updateCpuMs:5,shadowRedrawn:0,gpuSample:{ms:8}},
 {frameMs:33.2,renderCpuMs:12,updateCpuMs:7,shadowRedrawn:1,gpuSample:{ms:12}},
 {frameMs:24.9,renderCpuMs:9,updateCpuMs:4,shadowRedrawn:0,gpuSample:{ms:7}},
 {frameMs:8.3,renderCpuMs:8,updateCpuMs:3,shadowRedrawn:0,gpuSample:null},
 {frameMs:16.7,renderCpuMs:10,updateCpuMs:5,shadowRedrawn:0,gpuSample:{ms:null}}
];
const summary=audit.summary(rows);
assert.deepEqual(JSON.parse(JSON.stringify(summary.intervalBuckets)),
 {'~8.3ms':1,'~16.7ms':2,'~25ms':1,'~33.3ms':1,other:0});
assert.equal(summary.slow33Count,1);
assert.equal(summary.slow33PrevRenderCpuMs,10);
assert.equal(summary.slow33PrevUpdateCpuMs,5);
assert.equal(summary.slow33PrevShadowRedrawRate,0);
assert.equal(summary.gpuSamples,3);
assert.equal(summary.gpuMs,9);
assert.equal(summary.gpuP95Ms,12);
assert.equal(summary.slowFrameSamples.length,2);
const report=audit.shareReport({status:'finished',phases:[{id:'base-1',name:'Normal',stats:summary}],
 gpuTimer:{status:'supported',completed:3},phaseComparisons:{'no-both':{fpsDelta:1}}});
assert.equal(report.phases[0].stats.slowFrameSamples[0].previous.cpuMs,15);
assert.equal(report.phases[0].stats.intervalBuckets['~33.3ms'],1);
assert.equal(report.gpuTimer.completed,3);
assert.equal(report.phaseComparisons['no-both'].fpsDelta,1);
const gl={QUERY_RESULT_AVAILABLE:5,QUERY_RESULT:6,active:null,created:[],
 disjoint:false,readTooSoon:0,deleted:0,
 getExtension(name){return name==='EXT_disjoint_timer_query_webgl2'?
  {GPU_DISJOINT_EXT:7,TIME_ELAPSED_EXT:8}:null},
 createQuery(){const q={available:false,result:11000000};this.created.push(q);return q},
 beginQuery(target,q){assert.equal(target,8);assert(!this.active);this.active=q},
 endQuery(target){assert.equal(target,8);assert(this.active);this.active=null},
 getParameter(target){assert.equal(target,7);return this.disjoint},
 getQueryParameter(q,target){
  if(target===5)return q.available;
  assert.equal(target,6);
  if(!q.available){this.readTooSoon++;throw Error('synchronous GPU stall')}
  return q.result;
 },
 deleteQuery(){this.deleted++}
};
const timer=audit.createGpuTimer({getContext:()=>gl});
assert.equal(timer.status,'supported');
const first=timer.begin();timer.end(first);
timer.poll();
assert.equal(first.ms,null);
assert.equal(gl.deleted,0);
const second=timer.begin();timer.end(second);
gl.created[1].available=true;timer.poll(); // FIFO: oldest is not ready
assert.equal(second.ms,null);
gl.disjoint=true;timer.poll();
assert.equal(timer.disjoint,2);
assert.equal(gl.deleted,2);
gl.disjoint=false;
const third=timer.begin();timer.end(third);
gl.created[2].available=true;timer.poll();
assert.equal(third.ms,11);
assert.equal(timer.completed,1);
assert.equal(gl.readTooSoon,0);
timer.dispose();
const noExt=audit.createGpuTimer({getContext:()=>({getExtension:()=>null})});
assert.equal(noExt.status,'unsupported');
assert.equal(noExt.begin(),null);
assert.doesNotThrow(()=>noExt.poll());
const failing=audit.createGpuTimer({getContext:()=>{throw Error('WebGL unavailable')}});
assert.equal(failing.status,'unavailable');
assert.equal(failing.begin(),null);
console.log('PASS RAF histogram, previous CPU snapshots, compact JSON, async GPU and unsupported devices');
