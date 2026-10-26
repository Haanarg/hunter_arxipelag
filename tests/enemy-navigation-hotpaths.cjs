#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('src/enemy-navigation.js','utf8');
const ai=fs.readFileSync('src/enemy-ai.js','utf8');
assert.doesNotThrow(()=>new Function(source));
assert.doesNotThrow(()=>new Function(ai));
assert(source.includes('for(const [dx,dz,cost] of ENEMY_ASTAR_NEIGHBORS)'));
assert(source.includes('enemySolidAt(u,mx,mz,hd,true,null,midGround)'));
let seed=17;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const TG=new Map();
for(let i=0;i<450;i++){
 const t={x:rand()*200-100,z:rand()*200-100,r:.4+rand()*3,p:i%4===0};
 const k=Math.floor(t.x/16)+','+Math.floor(t.z/16);
 if(!TG.has(k))TG.set(k,[]);
 TG.get(k).push(t);
}
for(const palmsDisabled of [true,false]){
 const baseline=(x,z,r)=>{
  const cx=Math.floor(x/16),cz=Math.floor(z/16);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)
   for(const t of TG.get((cx+dx)+','+(cz+dz))||[])
    if(!(palmsDisabled&&t.p)&&Math.hypot(x-t.x,z-t.z)<t.r+r)return true;
  return false;
 };
 const src=source.slice(source.indexOf('function enemySweepTreeHit('),source.indexOf('function enemySolidAt('));
 const test=new Function('TG','palmsDisabled','treeHit',src+'return enemySweepTreeHit;')(TG,palmsDisabled,baseline);
 const cache={cx:NaN,cz:NaN,trees:[]};
 for(let i=0;i<5000;i++){
  const x=rand()*205-102.5,z=rand()*205-102.5,r=.3+rand()*3;
  assert.equal(test(x,z,r,cache),baseline(x,z,r));
 }
}
for(let i=0;i<50000;i++){
 const w=.5+rand()*8,d=.5+rand()*14,h=rand()*Math.PI*2,
  dx=rand()*30-15,dz=rand()*30-15,r=rand()*4+.5,c=Math.cos(h),s=Math.sin(h),
  lx=dx*c-dz*s,lz=dx*s+dz*c,
  cx=Math.max(-w/2,Math.min(w/2,lx)),cz=Math.max(-d/2,Math.min(d/2,lz));
 const collision=(lx-cx)**2+(lz-cz)**2<r*r;
 const outerRadius=Math.hypot(w+1,d+1)*.5+r;
 assert(!collision||dx*dx+dz*dz<outerRadius*outerRadius);
}
console.log('PASS: 10000 casos de vegetació, 50000 filtres conservadors');
