#!/usr/bin/env node
'use strict';
// Vegetation cells and precise terrain elevation are never skipped or approximated.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/enemy-navigation.js'),'utf8');
const start=source.indexOf('function enemySweepTreeHit(');
const end=source.indexOf('function enemyMoveClear(',start);
assert(start>=0&&end>start);
const TG=new Map(),trees=[
 {x:3,z:3,r:.65},{x:15.5,z:15.7,r:1.3},{x:16.3,z:16.2,r:1.25},
 {x:-14,z:4,r:2.4},{x:30,z:-10,r:1.7,p:true}
];
for(const t of trees){
 const key=Math.floor(t.x/16)+','+Math.floor(t.z/16);
 if(!TG.has(key))TG.set(key,[]);
 TG.get(key).push(t);
}
let palmsDisabled=false,heightCalls=0;
const reference=(x,z,r)=>{
 const cx=Math.floor(x/16),cz=Math.floor(z/16);
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)
  for(const t of TG.get((cx+dx)+','+(cz+dz))||[])
   if(!(palmsDisabled&&t.p)&&Math.hypot(x-t.x,z-t.z)<t.r+r)return true;
 return false;
};
const env={
 TG,get palmsDisabled(){return palmsDisabled},
 treeHit:reference,
 enemyIsVehicle:()=>false,enemyRouteRadius:()=>1.2,enemyBodyRadius:()=>1.05,
 enemyGroundAt(){heightCalls++;return 3},
 H:400,Math,performanceStatsVisible:false,perfHotspots:{},performance:{now:()=>0},
 wallCandidates:()=>[],vehicleCandidatesAt:()=>[],enemyCandidatesAt:()=>[],
 vehicleY:()=>3,vehicleBox:()=>({w:2,d:4}),obbOverlap:()=>false,
 circleVehicleOverlap:()=>false,enemyWallBox:()=>({}),
 wrapAngle:x=>x
};
const {enemySweepTreeHit,enemySweep}=new Function('env','with(env){'+source.slice(start,end)+
 'return {enemySweepTreeHit,enemySweep};}')(env);
const cache={cx:NaN,cz:NaN,trees:[]};
let seed=15;
const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(let i=0;i<4000;i++){
 const x=rand()*110-55,z=rand()*100-50,r=.2+rand()*4;
 assert.equal(enemySweepTreeHit(x,z,r,cache),reference(x,z,r),
   'exact same palm collision at '+i);
}
palmsDisabled=true;
for(let i=0;i<500;i++){
 const x=rand()*100-50,z=rand()*100-50,r=.5+rand()*2;
 assert.equal(enemySweepTreeHit(x,z,r,cache),reference(x,z,r),
  'disabled palms keep identical collisions');
}
palmsDisabled=false;
const u={t:'soldat',x:65,z:65,hd:0,o:{position:{y:3}}};
heightCalls=0;
assert(enemySweep(u,60,60,80,60,0,0,true,false),
 'clear segment remains passable');
const samples=Math.ceil(20/.45)+1;
assert.equal(heightCalls,samples,'exactly one elevation evaluation per sweep sample');
console.log('PASS: 4500 palm cases, palms-disabled cases and once-per-sample exact elevation');
