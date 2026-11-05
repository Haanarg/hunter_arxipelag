#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ai=fs.readFileSync(path.join(__dirname,'../src/enemy-ai.js'),'utf8');
const core=fs.readFileSync(path.join(__dirname,'../src/game-core.js'),'utf8');
const a=ai.indexOf('function enemyRemoteInterval('),b=ai.indexOf('function updEn(',a);
assert(a>=0&&b>a);
const remote=new Function(ai.slice(a,b)+'return enemyRemoteInterval')();
const q={x:0,z:0},u={t:'soldat',x:500,z:0,canSee:false,alert:0,aiMode:'patrol',blastT:0,entryDoor:null,pursuitT:0};
assert.equal(remote(u,q,null,false),0,'normal near patrol unchanged');
assert.equal(remote(u,q,null,true),.1,'overloaded passive patrol spaced');
u.x=1700;
assert.equal(remote(u,q,null,false),.3);
assert.equal(remote(u,q,null,true),.4);
u.x=200;
assert.equal(remote(u,q,null,true),0,'close range full rate');
u.x=500;
for(const state of [{canSee:true},{alert:1},{aiMode:'combat'},
 {aiMode:'search'},{aiMode:'investigate'},{pursuitT:3},{entryDoor:{}}]){
 assert.equal(remote({...u,...state},q,null,true),0,'active enemy never throttled');
}
assert.equal(remote(u,q,{contains:()=>true},true),0,'sniper target fully responsive');
assert(core.includes('updEn(dt,simulationFrameActive,enemyAiPressure)'));
assert(core.includes('vehicleGridVLength!==V.length||vehicleGridELength!==E.length'));
assert(core.includes('vehicleGridRebuiltFrameId!==renderLoopFrameId'));
console.log('PASS passive AI scheduling, active combat, sniper and grid refresh');
