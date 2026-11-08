#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three-r186.module.mjs';

const window={};
vm.runInNewContext(fs.readFileSync(new URL('../src/vegetation.js',import.meta.url),'utf8'),{window,globalThis:{window}});
let rngCalls=0;
const random=(a,b)=>{rngCalls++;return a+(b-a)*((rngCalls*73%101)/101)};
const factory=window.HUNTER_VEGETATION.create(THREE,{materialProfile:()=>({}),random});
const original=[
 [3,1,6,1.1,.3,-1,.04],
 [21,1,35,.93,1.4,0,-.1],
 [73,1,36,1.3,1.8,1,.12],
 [81,1,-17,1.21,2.1,-1,.22],
 [421,0,19,.8,2.5,0,-.18],
 [453,2,15,1.02,3.2,1,.08],
 [-460,4,-10,1.19,.9,0,-.04]
];
const world=new THREE.Group();
const generated=factory.build({world,palms:original,bushes:[],rocks:[],playerX:0,playerZ:0});
const result=generated.palms;
assert.equal(result.stats.totalPalms,original.length);
assert.equal(rngCalls,original.length*11,'LOD buffer copies consume no extra RNG draws');
assert.ok(result.variants.length>=3,'multiple sectors including negative coordinates');

const slices=(attr,index,width)=>Array.from(attr.array.slice(index*width,index*width+width));
for(let i=0;i<original.length;i++){
 const ref=result.variantMap[i],c=ref.chunk,primary=c.primary[ref.variant];
 for(const trunk of [c.midTrunk,c.farTrunk]){
  assert.deepEqual(slices(trunk.instanceMatrix,ref.trunkIndex,16),
   slices(c.trunk.instanceMatrix,ref.trunkIndex,16));
  assert.deepEqual(slices(trunk.instanceColor,ref.trunkIndex,3),
   slices(c.trunk.instanceColor,ref.trunkIndex,3));
  assert.notStrictEqual(trunk.instanceMatrix.array,c.trunk.instanceMatrix.array);
  assert.notStrictEqual(trunk.instanceColor.array,c.trunk.instanceColor.array);
 }
 for(const crown of [c.midCrown,c.farCrown]){
  assert.deepEqual(slices(crown.instanceMatrix,ref.trunkIndex,16),
   slices(primary.instanceMatrix,ref.index,16));
  assert.deepEqual(slices(crown.instanceColor,ref.trunkIndex,3),
   slices(primary.instanceColor,ref.index,3));
 }
}
const first=result.variantMap[0],zero=new THREE.Matrix4().makeScale(0,0,0);
result.remove(0,zero);
for(const mesh of [first.chunk.trunk,first.chunk.midTrunk,first.chunk.farTrunk]){
 assert.deepEqual(slices(mesh.instanceMatrix,first.trunkIndex,16),Array.from(zero.elements));
}
assert.notDeepEqual(slices(first.chunk.trunk.instanceMatrix,result.variantMap[1].trunkIndex,16),Array.from(zero.elements));
console.log('PASS: palm LOD matrices/colors are identical float32 buffers, with independent removable instances and unchanged RNG');
