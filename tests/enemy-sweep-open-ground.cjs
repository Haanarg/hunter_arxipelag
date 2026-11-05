#!/usr/bin/env node
'use strict';
// L'altura ràpida només és possible quan no es pot produir cap
// col·lisió dependent d'elevació: murs, vehicles, soldats i aigua.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/enemy-navigation.js'),'utf8');
const begin=src.indexOf('function enemySweepSampleGround(');
const end=src.indexOf('// Sample both translation',begin);
assert(begin>0&&end>begin);
let physical=4,walk=8,walkCalls=0,fast=0;
const env={Math,performanceStatsVisible:true,
 perfHotspots:{aiSweepFastGroundSamples:0,aiSweepFullGroundSamples:0},
 hAt:()=>physical,enemyGroundAt:()=>{walkCalls++;return walk},
 enemyIsVehicle:u=>u.t==='jeep'};
const {ground,needs}=new Function('env','with(env){'+src.slice(begin,end)+
 'return {ground:enemySweepSampleGround,needs:enemySweepNeedsElevation};}')(env);
const actor={t:'soldat',gy:null,basement:null};
const empty={walls:[]},clear={vehicles:[],enemies:[actor]};
assert.equal(needs(actor,0,0,1.05,false,empty,clear),false);
assert.equal(ground(actor,0,0,false),4);
assert.equal(walkCalls,0,'empty land must skip full ground even when gy is null');
assert.equal(env.perfHotspots.aiSweepFastGroundSamples,1);
const wall={x0:-2,x1:2,z0:-1,z1:1,open:false};
assert.equal(needs(actor,0,0,1.05,false,{walls:[wall]},clear),true);
assert.equal(ground(actor,0,0,true),8,'walls require full 3D height');
wall.open=true;
assert.equal(needs(actor,0,0,1.05,false,{walls:[wall]},clear),false);
wall.open=false;
assert.equal(needs(actor,30,0,1.05,false,{walls:[wall]},clear),false);
const other={t:'soldat',x:2,z:0,destroyed:false};
assert.equal(needs(actor,0,0,1.05,false,empty,{vehicles:[],enemies:[other]}),true);
const distant={t:'soldat',x:200,z:200,destroyed:false};
assert.equal(needs(actor,0,0,1.05,false,empty,{vehicles:[],enemies:[distant]}),false);
const car={t:'cotxe',x:22,z:0,destroyed:false};
assert.equal(needs(actor,0,0,1.05,false,empty,{vehicles:[car],enemies:[]}),true);
assert.equal(needs(actor,0,0,1.05,true,empty,clear),true,'route stays exact');
physical=-3;walk=2;
assert.equal(ground(actor,0,0,false),2,'water/pier requires full height even without obstacles');
walk=-3;
assert.equal(ground(actor,0,0,false),-3,'open water remains blocked');
const bunker={t:'soldat',gy:-3,basement:{}};
assert.equal(ground(bunker,0,0,true),-3,'basements keep own floor');
assert.equal(walkCalls,3);
console.log('PASS empty dry terrain, wall/vehicle/soldier proximity, pier, open water, basement');
