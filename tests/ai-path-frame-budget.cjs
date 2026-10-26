#!/usr/bin/env node
'use strict';
// A* incremental conserva exactament el destí, l'ordre del heap i les
// col·lisions, fins i tot quan cedeix control a altres fotogrames.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/enemy-navigation.js','utf8');
const ai=fs.readFileSync('src/enemy-ai.js','utf8'),
  core=fs.readFileSync('src/game-core.js','utf8'),
  audit=fs.readFileSync('src/performance-audit.js','utf8');
for(const s of [source,ai,core,audit])assert.doesNotThrow(()=>new Function(s));
const segment=(a,b)=>{
 const i=source.indexOf(a),j=source.indexOf(b,i);
 assert(i>=0&&j>i);return source.slice(i,j);
};
function simulate(rate,passive){
 let elapsed=0;
 const perf={aiPathDeferred:0,aiPathNodes:0,aiPassivePathNodes:0};
 const env={Math,Map,Set,performance:{now:()=>elapsed},performanceStatsVisible:true,
   perfHotspots:perf,P:{x:passive?2000:0,z:passive?2000:0},cv:null,
   enemyRouteRadius:()=>1.2,enemyIsVehicle:()=>false,
   enemySolidAt:(u,x,z)=>{elapsed+=rate;return !(x>7&&x<18&&Math.abs(z)<7)},
   enemyGroundAt:()=>3,treeHit:()=>false,wallCandidates:()=>[],segmentAabbT:()=>null};
 const script=segment('const ENEMY_ASTAR_NEIGHBORS=','const enemyGroundAt=')
  +segment('function enemyFindPath(','function mvE(')
  +'return {find:enemyFindPath,reset:resetEnemyPathFrameBudget,'
  +'passive:enemyPassiveRoute,'
  +'get passiveLimit(){return enemyPassiveNodeBudget},'
  +'get globalLimit(){return enemyNodeBudget}}';
 const solver=new Function('env','with(env){'+script+'}')(env);
 const u={t:'soldat',x:0,z:0,gy:3,navSearch:null,hd:0,walkY:3};
 assert.equal(solver.passive(u),passive);
 let route=solver.find(u,35,0),frames=0;
 const visits=[];
 while(route===null&&frames++<1000){
  assert.equal(typeof u.navSearch,'function','search state retained');
  solver.reset();
  const before=perf.aiPathNodes;
  route=solver.find(u,35,0);
  visits.push(perf.aiPathNodes-before);
 }
 assert(route,'route eventually completes');
 assert.equal(u.navSearch,null,'search closure released on completion');
 assert(frames<150,'route does not starve');
 if(passive)assert(visits.every(v=>v<=48),'distant units have reserved node cap');
 assert(visits.every(v=>v<=160),'global search node cap');
 return {route,frames,visits,metrics:perf};
}
const contiguous=simulate(0,false),near=simulate(.08,false),remote=simulate(.08,true);
assert.deepEqual(near.route,contiguous.route);
assert.deepEqual(remote.route,contiguous.route);
assert(near.frames>contiguous.frames,'time slicing defers costly near A*');
assert(remote.metrics.aiPassivePathNodes>0);
assert(near.metrics.aiPathDeferred>0);
assert(remote.metrics.aiPathDeferred>0);
assert(source.includes('(!enemyPassiveRoute(u)||enemyPassivePathBudget>0)'),
 'distant patrols cannot take all path searches');
assert(core.includes('resetEnemyPathFrameBudget();simulationFrameActive=true;'),
 'budget reset once per visual frame, not once per simulation substep');
assert(ai.includes('if(!preserveFrameBudget)resetEnemyPathFrameBudget()'),
 'standalone AI updates also reset budgets');
const window={};
vm.runInNewContext(audit,{window});
const rows=[
 {frameMs:16.7,aiMs:2,aiNavMs:1,aiPathNodes:8,aiPathDeferred:1},
 {frameMs:33.2,aiMs:9,aiNavMs:7,aiPathNodes:16,aiPathDeferred:2},
 {frameMs:16.7,aiMs:3,aiNavMs:1.5,aiPathNodes:0,aiPathDeferred:0},
 {frameMs:16.7,aiMs:4,aiNavMs:2,aiPathNodes:8,aiPathDeferred:1}
];
const stats=window.HUNTER_PERFORMANCE_AUDIT.summary(rows);
assert.equal(stats.aiMsP95,9);assert.equal(stats.aiMsP99,9);
assert.equal(stats.aiNavMsP95,7);
assert.equal(stats.aiPathDeferred,1);
assert.equal(stats.aiPathNodes,8);
const shared=window.HUNTER_PERFORMANCE_AUDIT.shareReport({
 status:'finished',phases:[{id:'base-1',name:'Normal',stats}]
});
assert.equal(shared.phases[0].stats.aiMsP99,9);
assert.equal(shared.phases[0].stats.aiPathDeferred,1);
console.log('PASS: route identity, incremental near/far A*, per-frame caps, CPU percentiles');
