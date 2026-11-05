#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('src/enemy-navigation.js','utf8');
const start=source.indexOf('function enemySweepNeedsElevation('),
 end=source.indexOf('// Sample both translation',start);
assert(start>0&&end>start);
const needs=new Function('enemyIsVehicle',source.slice(start,end)+
 'return enemySweepNeedsElevation')(u=>u.t==='jeep');
let seed=21948;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
for(let trial=0;trial<5000;trial++){
 const u={t:'soldat'},ax=rand()*160-80,az=rand()*160-80,
 bx=rand()*160-80,bz=rand()*160-80,r=1.05;
 const staticCandidates={walls:Array.from({length:4},()=>({
 x0:rand()*160-80,x1:0,z0:rand()*160-80,z1:0,
 open:rand()<.2,playerBlock:true
 }))};
 for(const wall of staticCandidates.walls){wall.x1=wall.x0+rand()*12;wall.z1=wall.z0+rand()*12}
 const dynamicCandidates={vehicles:Array.from({length:3},()=>({
 x:rand()*160-80,z:rand()*160-80,destroyed:false
 })),enemies:Array.from({length:3},()=>({
 t:'soldat',x:rand()*160-80,z:rand()*160-80,destroyed:false
 }))};
 const cx=(ax+bx)*.5,cz=(az+bz)*.5,half=Math.hypot(bx-ax,bz-az)*.5;
 const broad=needs(u,cx,cz,r,false,staticCandidates,dynamicCandidates,half);
 for(let i=0;i<=12;i++){
  const x=ax+(bx-ax)*i/12,z=az+(bz-az)*i/12;
  if(needs(u,x,z,r,false,staticCandidates,dynamicCandidates))
   assert(broad,'whole-path prefilter must never ignore a potential vertical collision');
 }
}
assert(!needs({t:'soldat'},0,0,1,false,{walls:[]},{vehicles:[],enemies:[]},20));
assert(needs({t:'soldat'},0,0,1,true,{walls:[]},null,20),
 'A-star route remains full-precision');
assert(source.includes('const needsElevation=possiblyElevated&&enemySweepNeedsElevation('));
assert(source.includes('if(!needsElevation||u.gy!=null)'));
console.log('PASS 5000 segment-candidate collision conservatism cases, A-star exactness');
