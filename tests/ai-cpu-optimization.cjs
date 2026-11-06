#!/usr/bin/env node
'use strict';
// Lower distant navigation costs while never delaying nearby combat.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const ai=read('src/enemy-ai.js'),nav=read('src/enemy-navigation.js'),
  marine=read('src/marine-patrol.js'),core=read('src/game-core.js');
for(const [name,script] of [['AI',ai],['navigation',nav],['marine',marine],['engine',core]])
  assert.doesNotThrow(()=>new Function(script),name+' source must compile');
const start=ai.indexOf('const ENEMY_AI_DISTANCE='),
  end=ai.indexOf('function updEn(',start);
assert(start>=0&&end>start);
const remote=new Function(ai.slice(start,end)+'return enemyRemoteInterval')();
const player={x:0,z:0},unit={
 t:'soldat',x:1800,z:2000,canSee:false,alert:0,aiMode:'patrol',
 blastT:0,entryDoor:null,pursuitT:0,basement:null
};
assert.equal(remote(unit,player),Infinity,'distant patrols are dormant');
unit.x=800;unit.z=0;
assert.equal(remote(unit,player),.4,'600–1000m enemies use minimal AI');
unit.x=300;
assert.equal(remote(unit,player),0,'nearby enemies update every step');
unit.x=1800;
for(const patch of [{canSee:true},{alert:1},{aiMode:'combat'},{aiMode:'search'},
 {aiMode:'investigate'},{entryDoor:{}},{pursuitT:3},{blastT:1},{basement:{}}]){
 assert.equal(remote({...unit,...patch},player),0,
   'do not delay an active enemy '+JSON.stringify(patch));
}
for(const type of ['general','patrulla_marina'])
 assert.equal(remote({...unit,t:type},player),Infinity,type+' can sleep without a threat');
assert.equal(remote(unit,player,{contains:()=>true}),0,
 'distant sniper targets remain fully responsive');
assert(ai.includes('const scheduledDt=enemyRemoteDecisionDt(u,dt,remoteInterval);'),
 'distant patrols share the phase-preserving scheduler');
assert(ai.includes('dt=scheduledDt;'),
 'the real accumulated delta is passed to the unit');
assert(ai.includes('u.remoteAiClock%=remoteInterval;'),
 'the remainder preserves phase between cycles');
assert(ai.includes('dt+=u.remoteAiAcc;u.remoteAiAcc=0'));
assert(ai.includes('perfHotspots.aiSenseMs'));
assert(nav.includes('perfHotspots.aiNavMs'));
assert(marine.includes('u.marineCourseT=distance>700?.36:0'));
assert(marine.includes('distance<=700||!course||!course.open'));
assert(marine.includes('u.marineCourse=null;'));
assert(core.includes('aiMarineMs:0,aiNavMs:0,aiSenseMs:0'));
(async()=>{
 const {run}=await require('./harness.cjs')();
 run([
  'seedSearchMode=true;R=()=>.5;world=new THREE.Group();scene.add(world);',
  'E=[];Wl=[];V=[];B=[];P.x=0;P.z=0;P.y=3;hAt=()=>3;',
  'cheats.invisible=true;over=0;disg=false;cv=null;',
  'globalThis.testFar=mkEn("soldat",1700,2000,3);',
  'testFar.o.position.set(1700,3,2000);testFar.aiMode="patrol";',
  'testFar.wt=100;testFar.tx=1710;testFar.tz=2000;',
  'rebuildVehicleGrid();'
 ].join('\n'));
 run('updEn(1/60,true)');
 assert.equal(run('testFar.remoteAiAcc||0'),0,'dormant enemy accrues no movement time');
 assert.equal(run('testFar.x'),1700,'no movement before scheduled step');
 run('for(let i=0;i<17;i++)updEn(1/60,true)');
 assert.equal(run('testFar.remoteAiAcc||0'),0,'dormant enemy remains asleep');
 assert.equal(run('testFar.x'),1700,'dormant patrol does not move');
 run('P.x=1695;P.z=2000;updEn(1/60,true)');
 assert.equal(run('testFar.remoteAiAcc||0'),0,'immediate local activation');
 assert(ai.includes('remoteAiPhase:((E.length*37)%101)/101'),
   'each newly spawned distant enemy gets a deterministic update phase');
 console.log('PASS: combat safety, elapsed remote patrol time, marine course cache and live patrol');
})().catch(e=>{console.error(e);process.exitCode=1});
