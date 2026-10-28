#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const combat=fs.readFileSync('src/combat.js','utf8');
const a=combat.indexOf('function closestFenceBlastPoint('),
      b=combat.indexOf('// Punt just fora de la porta dreta',a);
assert(a>0&&b>a,'blast and fence geometry found');
const hits=[];
class Mesh{
  constructor(){this.rotation={};this.position={set(){}}}
}
const ctx={
  walls:[],cv:null,THREE:{Mesh,MeshBasicMaterial:class{},DoubleSide:2},
  window:{HUNTER_STEALTH:{emit(){}}},blastRingG:{},
  world:{add(){}},fx:[],snd(){},Math,
  enemyCandidatesAt:()=>[],vehicleCandidatesAt:()=>[],buildingCandidates:()=>[],
  wallCandidates:()=>ctx.walls,prisonerSystem:{entities:[]},PL:[],
  blastOccluded:()=>false,vehicleRadius:()=>8,
  explosionDamage:(d,distance,r)=>distance>=r?0:Math.max(1,Math.ceil(d*(1-distance/r))),
  dmgW(w,amount){hits.push({w,amount});w.hp=Math.max(0,w.hp-amount);if(!w.hp){w.open=true;
    ctx.walls.splice(ctx.walls.indexOf(w),1)}},
};
vm.runInNewContext(combat.slice(a,b)+
  ';this.boom=boom;this.closest=closestFenceBlastPoint;',ctx);
const fence=()=>({barbed:true,open:false,hp:8,ax:-3,bx:3,az:-20,bz:-20,
  cx:0,cz:-20,x0:-3.24,x1:3.24,z0:-20.24,z1:-19.76,y0:0,y1:5});
const close=fence();ctx.walls=[close];
assert(ctx.closest(close,3.3,2,-20).distance<.31);
ctx.boom(3.3,2,-20,2,6,'b',{skipPlayer:true});
assert.equal(close.hp,0,'explosion at fence endpoint clears all 8 HP');
assert.equal(close.open,true,'destroyed section becomes passable');
assert.equal(ctx.walls.length,0,'destroyed fence removed from collision collection');
assert.equal(hits[0].amount,8,'complete remaining HP used for fence');
const high=fence();ctx.walls=[high];
ctx.boom(3.3,8,-20,2,6,'b',{skipPlayer:true});
assert.equal(high.hp,8,'explosion above the fence does not demolish it');
const protectedFence=fence();ctx.walls=[protectedFence];
ctx.blastOccluded=()=>true;
ctx.boom(3.3,2,-20,2,6,'b',{skipPlayer:true});
assert.equal(protectedFence.hp,8,'solid cover shields the fence');
console.log('OK fence explosions: 8 HP removed at segment ends, colliders cleared, altitude/cover respected');
