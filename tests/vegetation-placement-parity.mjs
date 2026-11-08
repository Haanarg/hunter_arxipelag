#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createVegetationPlacementIndex,vegetationLayout} from '../src/vegetation-layout.mjs';
import {createWorldRandom} from '../src/world-generation-core.mjs';
import {levelHeight,planLevelArea,rawTerrainAt} from '../src/world-physics.mjs';

const buildings=[
 {x:-73,z:-29,w:24,d:18},{x:49,z:38,w:60,d:45},
 {x:195,z:184,w:20,d:18},{x:-215,z:103,w:9,d:15},
 {x:170,z:-170,w:35,d:35}
];
const compounds=[
 {x:-115,z:72,r:55},{x:120,z:-88,r:67},
 {x:200,z:203,r:13},{x:20,z:125,r:92}
];
const index=createVegetationPlacementIndex(buildings,compounds);
let state=148>>>0;
const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
for(let i=0;i<12000;i++){
 const x=random()*780-390,z=random()*780-390,pad=random()*43;
 assert.equal(index.buildingBlocked(x,z,pad),
  buildings.some(b=>Math.abs(x-b.x)<b.w/2+pad&&Math.abs(z-b.z)<b.d/2+pad),
  'building spatial filter must agree with exhaustive scan');
 assert.equal(index.compoundBlocked(x,z,pad),
  compounds.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+pad),
  'compound spatial filter must agree with exhaustive scan');
}

for(const seed of [67,148,2026]){
 const H=340,islands=[
  {x:-116,z:80,r:166,peakX:-98,peakZ:62},
  {x:118,z:-112,r:177,peakX:138,peakZ:-132},
  {x:-220,z:-198,r:110,peakX:-210,peakZ:-200}
 ];
 // Raised platform is located beyond the influence of the island relief.
 const {level,bounds}=planLevelArea(300,290,22,24,16,0,13);
 const makeHeight=counter=>(x,z)=>{
  counter.count++;
  return levelHeight(rawTerrainAt(x,z,islands,seed,H),x,z,[level]);
 };
 const mayHaveLand=(x,z)=>islands.some(i=>Math.abs(x-i.x)<=2*i.r&&Math.abs(z-i.z)<=2*i.r)||
  (x>=bounds.minX&&x<=bounds.maxX&&z>=bounds.minZ&&z<=bounds.maxZ);
 const simulate=fast=>{
  const calls={count:0};
  const result=vegetationLayout({halfSize:H,islands,heightAt:makeHeight(calls),
   ...(fast?{mayHaveLand}:{}),seed,random:createWorldRandom(seed),
   spawn:{x:-65,z:44},buildings,stairs:[],compounds});
  return {result,calls:calls.count};
 };
 const original=simulate(false),optimized=simulate(true);
 for(const name of ['palms','bushes','rocks','trees','rockFieldStats','randomState'])
  assert.deepEqual(optimized.result[name],original.result[name],
   'same seed must preserve '+name+' including colliders and all RNG draws');
 assert.ok(optimized.result.placementStats.deepWaterSkips>0,'must skip deep ocean');
 assert.ok(optimized.calls<original.calls,'must avoid redundant terrain sampling');
 assert.equal(optimized.result.placementStats.initialHeightSamples,
  optimized.result.placementStats.sampledCells-optimized.result.placementStats.deepWaterSkips);
}
console.log('PASS: vegetation placement, colliders and RNG unchanged with fewer terrain samples');
