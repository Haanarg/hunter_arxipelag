#!/usr/bin/env node
'use strict';
// Regression: distant AI cannot sweep a kilometre of terrain just to move two metres.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/enemy-navigation.js'),'utf8');
const start=source.indexOf('function mvE('),end=source.indexOf('// Resolve invalid generated placements',start);
assert(start>=0&&end>start);
assert.doesNotThrow(()=>new Function(source));
const body=source.slice(start,end);
const lookahead=Number(source.match(/const ENEMY_DIRECT_LOOKAHEAD=(\d+);/)?.[1]);
assert.equal(lookahead,28,'maximum direct navigation lookahead');
const calls={predictive:[],real:[]},wall={enabled:false,x:1};
const dep={
 performanceStatsVisible:false,perfHotspots:{aiNavMs:0},
 ENEMY_DIRECT_LOOKAHEAD:lookahead,enemyIsVehicle:()=>false,
 enemyGroundAt:()=>3,enemyReindex:()=>{},wrapAngle:x=>x,
 enemyPathBudget:2,enemyNodeBudget:160,
 enemySweep(...args){
   const [u,ax,az,bx,bz]=args,distance=Math.hypot(bx-ax,bz-az);
   if(args.length===9)calls.predictive.push(distance);else calls.real.push(distance);
   if(wall.enabled&&args.length!==9&&ax<wall.x&&bx>=wall.x)return false;
   return true;
 },
 enemyFindPath:()=>[],
 Math,performance:{now:()=>0}
};
const move=new Function('deps','with(deps){'+body+'return mvE;}')(dep);
const create=()=>({t:'soldat',x:0,z:0,hd:0,o:{rotation:{y:0}},
 sp:6,tx:1200,tz:0,navGoal:null,navPath:[]});
let u=create();move(u,2,1200,0);
assert.equal(calls.predictive.length,1,'one predictive probe');
assert(calls.predictive[0]<=28+1e-8,'probe bounded at 28 m');
assert.equal(calls.real.length,1,'real movement retains swept collisions');
assert(Math.abs(calls.real[0]-2)<1e-8,'real movement remains 2 m');
assert(Math.abs(u.x-2)<1e-8,'unit moves normally');
calls.predictive.length=0;calls.real.length=0;
u=create();wall.enabled=true;move(u,2,1200,0);
assert(u.x<1,'real movement cannot cross even a thin wall');
assert(calls.real.length>0,'collision remains checked on every attempted move');
assert(calls.predictive.every(x=>x<=28+1e-8),'bounded despite a wall');
wall.enabled=false;calls.predictive.length=0;
u=create();u.tx=8;move(u,2,8,0);
assert(calls.predictive.every(x=>x<=8+1e-8),'short destinations checked completely');
assert(source.includes('u.navDirectT=.45'),'existing navigation responsiveness retained');
assert(source.includes('enemyFindPath(u,tx,tz)'),'A* obstacle avoidance still available');
console.log('PASS: bounded direct probes; exact movement sweeps; no wall tunnelling; nearby full-length probe.');
