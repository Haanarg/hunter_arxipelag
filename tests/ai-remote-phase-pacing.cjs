#!/usr/bin/env node
'use strict';
// Periodic AI decisions retain their deterministic offset every cycle.
// Total simulated dt per actor is conserved even with 1/60 substeps.
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('src/enemy-ai.js','utf8');
const a=src.indexOf('function enemyRemoteDecisionDt('),
 b=src.indexOf('// Each enemy gets its own simulation interval.',a);
assert(a>=0&&b>a);
const decision=new Function(src.slice(a,b)+'return enemyRemoteDecisionDt')();
const interval=.3,step=1/60;
const ticks=[],cohort=Array.from({length:101},(_,i)=>({
 remoteAiPhase:((i*37)%101)/101,remoteAiAcc:0,remoteAiWarmed:false
}));
let elapsed=0;
for(let frame=0;frame<180;frame++){
 let awake=0;
 for(const u of cohort){
  const dt=decision(u,step,interval);
  if(dt){u.consumed=(u.consumed||0)+dt;u.executions=(u.executions||0)+1;awake++}
 }
 ticks.push(awake);elapsed+=step;
}
const max=Math.max(...ticks);
assert(max<17,'steady far-patrol decisions remain staggered: '+max);
for(const u of cohort){
 assert(Math.abs((u.consumed||0)+u.remoteAiAcc-elapsed)<1e-8,
   'far-patrol simulation dt cannot be lost or duplicated');
 assert(u.executions>=9&&u.executions<=11,'average cadence retained');
}
assert(src.includes('if(u.remoteAiAcc){dt+=u.remoteAiAcc;u.remoteAiAcc=0}'));
assert(src.includes('u.remoteAiClock=null;'));
assert(src.includes('u.remoteAiWarmed=false;'));
const legacy={remoteAiAcc:.295,remoteAiWarmed:true};
assert(decision(legacy,step,.3)>.3,'accumulated time retained on upgrade');
console.log('PASS persistent phase, balanced workload, dt conservation, combat transition');
