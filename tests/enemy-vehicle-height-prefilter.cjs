#!/usr/bin/env node
'use strict';
// El rebuig pla és conservador: no altera cap col·lisió real ni la
// comparació d'altures quan un vehicle pot entrar en contacte.
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('src/enemy-navigation.js','utf8');
const a=src.indexOf('function enemyBodiesClear(');
const b=src.indexOf('// El terreny només decideix',a);
assert(a>=0&&b>a);
let heightCalls=0,exactCalls=0;
const env={
 Math,performanceStatsVisible:true,
 perfHotspots:{aiSweepVehicleHeightSkipped:0},
 enemyIsVehicle:()=>false,enemyBodyRadius:()=>1.05,
 enemyGroundAt:()=>3,
 vehicleRadius:t=>t==='ferry'?35:3,
 vehicleY:()=>{heightCalls++;return 3},
 vehicleBox:()=>({w:3,d:6}),obbOverlap:()=>false,
 circleVehicleOverlap:(x,z,r,v)=>{
   exactCalls++;return Math.hypot(x-v.x,z-v.z)<r+2;
 },
 vehicleCandidatesAt:()=>[],enemyCandidatesAt:()=>[]
};
const clear=new Function('env','with(env){'+src.slice(a,b)+
 'return enemyBodiesClear;}')(env);
const actor={t:'soldat',x:0,z:0,gy:3,destroyed:false};
const run=v=>clear(actor,0,0,0,{vehicles:[v],enemies:[]},3);
assert.equal(run({t:'cotxe_civil',x:42,z:0,destroyed:false}),true);
assert.equal(heightCalls,0,'far candidate must skip vehicle height lookup');
assert.equal(exactCalls,0,'far candidate must skip exact overlap calculation');
assert.equal(env.perfHotspots.aiSweepVehicleHeightSkipped,1);
assert.equal(run({t:'cotxe_civil',x:1.5,z:0,destroyed:false}),false,
  'near car still blocks soldier');
assert.equal(heightCalls,1);
assert.equal(exactCalls,1);
assert.equal(run({t:'ferry',x:42,z:0,destroyed:false}),true);
assert.equal(heightCalls,2,'large ferry must not be culled by small-car bound');
assert.equal(run({t:'cotxe_civil',x:5,z:0,destroyed:false}),true);
assert.equal(heightCalls,3,'intermediate car still runs full exact checks');
assert.equal(run({t:'cotxe_civil',x:42,z:0,destroyed:true}),true);
assert.equal(heightCalls,3,'destroyed cars remain ignored');
console.log('PASS conservative vehicle-height culling, near hits and large ferry safety');
