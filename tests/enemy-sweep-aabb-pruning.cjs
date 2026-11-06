#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('src/enemy-navigation.js','utf8');
const begin=source.indexOf('function enemySweptSubset('),
 end=source.indexOf('// Sample both translation',begin);
assert(begin>0&&end>begin,'new navigation prefilter available');
const subset=new Function(source.slice(begin,end)+'return enemySweptSubset')();
let seed=982345;
const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
let eliminated=0;
for(let t=0;t<5000;t++){
 const ax=rnd()*200-100,az=rnd()*200-100,
   bx=rnd()*200-100,bz=rnd()*200-100,
   radius=2+rnd()*30;
 const items=Array.from({length:40},(_,i)=>({
   x:rnd()*400-200,z:rnd()*400-200,r:radius
 }));
 const filtered=subset(items,ax,az,bx,bz,v=>v.r);
 eliminated+=items.length-filtered.length;
 const keep=new Set(filtered);
 for(let i=0;i<=30;i++){
   const x=ax+(bx-ax)*i/30,z=az+(bz-az)*i/30;
   for(const v of items)if(Math.abs(x-v.x)<=v.r&&Math.abs(z-v.z)<=v.r)
     assert(keep.has(v),'candidate touching swept path must never be pruned');
 }
}
assert(eliminated>50000,'out-of-path objects should be meaningfully pruned');
assert(source.includes('enemySweptSubset(wallCandidates('),'static walls pruned at whole-path level');
assert(source.includes('enemySweptSubset(vehicleCandidatesAt('),'dynamic vehicles pruned at whole-path level');
assert(source.includes('enemySweptSubset(enemyCandidatesAt('),'dynamic soldiers pruned at whole-path level');
assert(source.includes('enemyBodiesClear(u,x,z,hd,dynamicCandidates,sampleY)'),
  'precise narrow-phase remains authoritative');
console.log('PASS 5000 randomized segment filters, no missed intersections, exact collisions unchanged');
