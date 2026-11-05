#!/usr/bin/env node
'use strict';
// Real scheduling source: a distant guard's accumulated dt must never
// accelerate the cooldowns or movements of subsequent nearby enemies.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/enemy-ai.js'),'utf8');
const begin=source.indexOf('function enemyRemoteInterval(');
const entry=source.indexOf('function updEn(frameDt,',begin);
const marker='  if(performanceStatsVisible)perfHotspots.aiUpdated++;';
const end=source.indexOf(marker,entry);
assert(begin>=0&&entry>begin&&end>entry,'find scheduling implementation');
// La prova extrau només el planificador: el try/finally de perfilat
// pertany al cos COMPLET de la IA, i no s'ha d'incloure al fragment.
const prelude=source.slice(begin,end).replace(
  /  const unitStamp=performanceStatsVisible\?performance\.now\(\):0;\n  try\{\n/,'');
const schedule=prelude+[
 '  u.executedDt=dt;',
 '  u.cooldown=(u.cooldown??10)-dt;',
 '});}',
 'return updEn;'
].join('\n');
function createUnits(){
 const far={t:'soldat',x:2200,z:2200,gy:3,aiMode:'patrol',canSee:false,
   alert:0,remoteAiAcc:.295,remoteAiWarmed:true,cooldown:10};
 const near={t:'soldat',x:5,z:5,gy:3,aiMode:'patrol',canSee:false,
   alert:0,cooldown:10};
 return {far,near};
}
const env={
 E:[],P:{x:0,z:0,y:3},cv:null,
 performanceStatsVisible:false,scopeActive:false,
 enemyPathBudget:2,enemyNodeBudget:160,
 currentSniperFocus:()=>null,
 refreshVehicleGridIfCellsChanged(){},
 soldierCoordinationTick(){},
 Math
};
const tick=new Function('env','with(env){'+schedule+'}')(env);
assert.equal(typeof tick,'function');
const {far,near}=createUnits();env.E=[far,near];
tick(1/60,true);
assert(far.executedDt>.3,'far patrol consumes its accumulated dt');
assert(Math.abs(near.executedDt-1/60)<1e-12,
 'nearby enemy receives the real current substep');
assert(Math.abs(near.cooldown-(10-1/60))<1e-12,
 'distant guard must not accelerate nearby cooldown');
const other=createUnits();env.E=[other.near,other.far];
tick(1/60,true);
assert(Math.abs(other.near.executedDt-1/60)<1e-12,
 'unit order must not affect the nearby substep');
assert(other.far.executedDt>.3,'distant guard still catches up');
console.log('PASS: no cross-enemy delta-time contamination in either order');
