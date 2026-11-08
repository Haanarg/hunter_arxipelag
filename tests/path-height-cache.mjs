#!/usr/bin/env node
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {createPathNetworkSteps} from '../src/compound-paths.mjs';

const routes=[
  {points:[[0,0],[25,0],[48,8]],width:5,color:0x8a795e},
  {points:[[0,13],[27,13],[58,4]],width:4.5,color:0x9b8462}
];
const altitude=(x,z)=>Math.sin(x*.17)*2+Math.cos(z*.11)*3;
let samples=0;
const steps=createPathNetworkSteps(THREE,{
  routes,chunkCells:16,step:1.5,heightAt:(x,z)=>{samples++;return altitude(x,z)},
  heightVersion:()=>0
});
let next;
while(!(next=steps.next()).done){}
const group=next.value;
let vertices=0;
const unique=new Set();
for(const mesh of group.children){
  const positions=mesh.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i);
    // BufferAttribute stores floats; use the same tolerant comparison as
    // other geometry checks rather than requiring float32 exact equality.
    assert.ok(Math.abs(positions.getY(i)-(altitude(x,z)+.12))<.00002,
      'the road must preserve the exact terrain-conforming altitude');
    unique.add(x+','+z);
    vertices++;
  }
  mesh.geometry.dispose();
}
assert.ok(group.children.length>1,'the test must cover multiple road chunks');
assert.ok(vertices>unique.size,'the test must include shared vertices');
assert.equal(samples,unique.size,'build heightAt must be called once per unique vertex');
assert.equal(group.userData.pathStats.heightSamples,samples);
assert.equal(group.userData.pathStats.heightReuses,vertices-samples);
assert.ok(samples<vertices/2,'avoid most redundant elevation sampling');
console.log('PASS: road height cache preserves geometry and avoids duplicate terrain samples');
