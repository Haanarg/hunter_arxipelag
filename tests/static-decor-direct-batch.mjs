#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three-r186.module.mjs';

const window={};
vm.runInNewContext(fs.readFileSync(new URL('../src/static-decor-batching.js',import.meta.url),'utf8'),{window});
const world=new THREE.Group(),root=new THREE.Group(),nested=new THREE.Group();
root.position.set(13,2,-7);
nested.rotation.set(.18,-.34,.09);
nested.scale.set(1.2,.82,-1.05);
world.add(root);root.add(nested);
const one=new THREE.Mesh(new THREE.BoxGeometry(4,2,3),new THREE.MeshStandardMaterial({color:0xa78159}));
one.position.set(11,3,9);one.rotation.y=.4;nested.add(one);
const two=new THREE.Mesh(new THREE.IcosahedronGeometry(2),new THREE.MeshStandardMaterial({color:0x557799}));
two.position.set(-8,1,-4);nested.add(two);
const far=new THREE.Mesh(new THREE.BoxGeometry(3,4,1).toNonIndexed(),new THREE.MeshStandardMaterial({color:0xe9c36c}));
far.position.set(214,0,0);root.add(far);
root.updateMatrixWorld(true);
const CHUNK=160,reference=new Map();
for(const mesh of [one,two,far]){
 const elements=mesh.matrixWorld.elements,cx=Math.floor(elements[12]/CHUNK),
  cz=Math.floor(elements[14]/CHUNK),key=cx+','+cz;
 const originX=(cx+.5)*CHUNK,originZ=(cz+.5)*CHUNK,
   matrix=new THREE.Matrix4().makeTranslation(-originX,0,-originZ).multiply(mesh.matrixWorld),
   scratch=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
 scratch.applyMatrix4(matrix);
 let r=reference.get(key);
 if(!r){r={pos:[],normal:[],uv:[],color:[]};reference.set(key,r)}
 const pos=scratch.getAttribute('position'),normal=scratch.getAttribute('normal'),uv=scratch.getAttribute('uv');
 r.pos.push(...pos.array);
 if(normal)r.normal.push(...normal.array);else r.normal.push(...new Array(pos.count*3).fill(0));
 if(uv)r.uv.push(...uv.array);else r.uv.push(...new Array(pos.count*2).fill(0));
 for(let i=0;i<pos.count;i++)r.color.push(mesh.material.color.r,mesh.material.color.g,mesh.material.color.b);
 scratch.dispose();
 // A second geometry expansion or clone is forbidden during the actual build.
 mesh.geometry.toNonIndexed=()=>{throw Error('Unexpected scratch toNonIndexed')};
 mesh.geometry.clone=()=>{throw Error('Unexpected scratch clone')};
}
const steps=window.HUNTER_STATIC_DECOR_BATCH.buildSteps({world,staticDecorRoots:[root],THREE});
let next;while(!(next=steps.next()).done){}
assert.equal(next.value.temporaryGeometryCopies,0);
assert.equal(next.value.originalMeshes,3);
assert.equal(next.value.batchedMeshes,reference.size);
assert.equal(world.children.includes(root),false,'original visual trees must be discarded');
assert.equal(reference.size,2,'test must span two chunks');
let checked=0;
for(const mesh of world.children.filter(o=>o.name==='hunter-static-decor-batch')){
 const key=Math.floor(mesh.position.x/CHUNK)+','+Math.floor(mesh.position.z/CHUNK),ref=reference.get(key);
 assert.ok(ref,'unexpected chunk '+key);
 for(const [attribute,expected] of [['position',ref.pos],['normal',ref.normal],['uv',ref.uv],['color',ref.color]]){
  const actual=mesh.geometry.getAttribute(attribute).array;
  assert.equal(actual.length,expected.length,attribute+' vertex count');
  for(let i=0;i<actual.length;i++)assert.ok(Math.abs(actual[i]-expected[i])<=1e-6,
   attribute+' differs at '+i+': '+actual[i]+' vs '+expected[i]);
 }
 assert.ok(mesh.geometry.boundingSphere,'chunk bounding sphere is required');
 checked++;
}
assert.equal(checked,reference.size);
console.log('PASS: static decor streams indexed/non-indexed vertices into exact final batches without scratch geometry');
