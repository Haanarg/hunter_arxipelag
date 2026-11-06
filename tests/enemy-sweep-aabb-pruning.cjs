#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('src/enemy-navigation.js','utf8');
const begin=source.indexOf('function enemySweptSubset('),
 end=source.indexOf('// Sample both translation',begin);
assert(begin>0&&end>begin,'new navigation prefilter available');
const {subset,wallSubset}=new Function(source.slice(begin,end)+
 'return {subset:enemySweptSubset,wallSubset:enemySweptWallSubset}')();
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

let eliminatedWalls=0;
for(let t=0;t<5000;t++){
 const ax=rnd()*200-100,az=rnd()*200-100,
   bx=rnd()*200-100,bz=rnd()*200-100,margin=1+rnd()*6;
 const wallList=Array.from({length:40},()=>({
   x0:rnd()*600-300,z0:rnd()*600-300,
   dx:1+rnd()*20,dz:1+rnd()*20
 })).map(w=>({x0:w.x0,x1:w.x0+w.dx,z0:w.z0,z1:w.z0+w.dz}));
 const kept=new Set(wallSubset(wallList,ax,az,bx,bz,margin));
 eliminatedWalls+=wallList.length-kept.size;
 // Múltiples punts: cap obstacle que pugui col·lidir a qualsevol
 // posició del trajecte no pot desaparèixer del conjunt.
 for(let i=0;i<=30;i++){
   const x=ax+(bx-ax)*i/30,z=az+(bz-az)*i/30;
   for(const w of wallList)
     if(x>w.x0-margin&&x<w.x1+margin&&z>w.z0-margin&&z<w.z1+margin)
       assert(kept.has(w),'wall touching swept segment must be retained');
 }
}
assert(eliminatedWalls>120000,'wall AABB filter must reject irrelevant distant walls');
assert.equal(wallSubset([{open:false}],0,0,1,1,2).length,1,
 'walls without valid bounds are retained conservatively');

assert(source.includes('enemySweptWallSubset(wallCandidates('),'static walls pruned using real wall bounds');
assert(source.includes('enemySweptSubset(vehicleCandidatesAt('),'dynamic vehicles pruned at whole-path level');
assert(source.includes('enemySweptSubset(enemyCandidatesAt('),'dynamic soldiers pruned at whole-path level');
assert(source.includes('enemyBodiesClear(u,x,z,hd,dynamicCandidates,sampleY)'),
  'precise narrow-phase remains authoritative');
console.log('PASS 5000 randomized segment filters, no missed intersections, exact collisions unchanged');
