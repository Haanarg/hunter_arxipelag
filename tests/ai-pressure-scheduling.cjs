#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ai=fs.readFileSync(path.join(__dirname,'../src/enemy-ai.js'),'utf8');
const core=fs.readFileSync(path.join(__dirname,'../src/game-core.js'),'utf8');
const a=ai.indexOf('function enemyRemoteInterval('),b=ai.indexOf('function updEn(',a);
assert(a>=0&&b>a);
const remote=new Function(ai.slice(a,b)+'return enemyRemoteInterval')();
const q={x:0,z:0},u={t:'soldat',x:500,z:0,canSee:false,alert:0,aiMode:'patrol',blastT:0,entryDoor:null,pursuitT:0};
assert.equal(remote(u,q,null,false),.12,'mid-range patrol runs at reduced frequency');
assert.equal(remote(u,q,null,true),.2,'overloaded mid-range patrol spaced');
u.x=1700;
assert.equal(remote(u,q,null,false),Infinity,'far patrol sleeps');
assert.equal(remote(u,q,null,true),Infinity,'far patrol stays asleep under pressure');
u.x=200;
assert.equal(remote(u,q,null,true),0,'close range full rate');
u.x=750;
assert.equal(remote(u,q,null,false),.4,'minimal AI in 600–1000 m band');
assert.equal(remote(u,q,null,true),.65,'minimal AI throttled under load');
u.x=500;
for(const state of [{canSee:true},{alert:1},{aiMode:'combat'},
 {aiMode:'search'},{aiMode:'investigate'},{pursuitT:3},{entryDoor:{}}]){
 assert.equal(remote({...u,...state},q,null,true),0,'active enemy never throttled');
}
u.x=1700;
assert.equal(remote(u,q,{contains:()=>true},true),0,'sniper target fully responsive even asleep');
assert.equal(remote(u,q,null,false),Infinity,'scope does not permanently wake an enemy');
const near={...u,x:301,remoteAiTier:0};
assert.equal(remote(near,q,null,false),0,'hysteresis keeps nearby enemy active');
near.x=331;
assert.equal(remote(near,q,null,false),.12,'leaving margin transitions to reduced');
near.x=280;
assert.equal(remote(near,q,null,false),.12,'return margin avoids thrashing');
near.x=269;
assert.equal(remote(near,q,null,false),0,'re-entering full band restores full AI');
assert(ai.includes('if(remoteInterval===Infinity)'),'asleep enemies are skipped without accumulating time');
assert(ai.includes('u.remoteAiAcc=0;u.remoteAiClock=null;u.remoteAiWarmed=false;'));
assert(core.includes('updEn(dt,simulationFrameActive,enemyAiPressure)'));
assert(core.includes('vehicleGridVLength!==V.length||vehicleGridELength!==E.length'));
assert(core.includes('vehicleGridRebuiltFrameId!==renderLoopFrameId'));
console.log('PASS passive AI scheduling, active combat, sniper and grid refresh');
