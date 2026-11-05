#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/enemy-navigation.js'),'utf8');
const a=src.indexOf('function enemySweepSampleGround('),
 b=src.indexOf('// Sample both translation',a);
assert(a>=0&&b>a);
let physical=5,full=12,fullCalls=0;
const env={performanceStatsVisible:true,
 perfHotspots:{aiSweepFastGroundSamples:0,aiSweepFullGroundSamples:0},
 hAt:()=>physical,enemyGroundAt:()=>{fullCalls++;return full}};
const ground=new Function('env','with(env){'+src.slice(a,b)+'return enemySweepSampleGround;}')(env);
const u={gy:3,basement:null};
assert.equal(ground(u,0,0),5);
assert.equal(fullCalls,0,'dry region skips expensive visible ground');
physical=-4;full=2;
assert.equal(ground(u,0,0),2,'pier above sea uses full ground');
full=-4;
assert.equal(ground(u,0,0),-4,'open water remains blocked');
physical=5;
assert.equal(ground({gy:null,basement:null},0,0),-4,'unknown height never skips full ground');
assert.equal(ground({gy:-2,basement:{}},0,0),-2,'basement follows its own floor');
assert.equal(fullCalls,3);
assert.equal(env.perfHotspots.aiSweepFastGroundSamples,1);
assert.equal(env.perfHotspots.aiSweepFullGroundSamples,3);
console.log('PASS exact pier/water/basement sweeps and reduced dry-ground queries');
