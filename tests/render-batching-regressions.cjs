#!/usr/bin/env node
'use strict';
// Comparació A/B real amb Three.js: cap triangle ni color es perd.
const assert=require('node:assert/strict');
(async()=>{
 const T=await import('../vendor/three-r186.module.mjs');
 const {createPathNetwork}=await import('../src/compound-paths.mjs');
 let revision=0,offset=0;
 const heightAt=(x,z)=>3+Math.sin(x*.01)+Math.cos(z*.015)+offset;
 const heightVersion=(x,z)=>revision+(x>140?17:0)+(z>90?300:0);
 const routes=[
  {points:[[0,0],[390,0],[390,170]],width:6},
  {points:[[0,210],[410,210]],width:5},
  {points:[[45,-120],[310,-120],[310,210]],width:4}
 ];
 const old=createPathNetwork(T,{routes,heightAt,heightVersion,step:1.5,chunkCells:64});
 const next=createPathNetwork(T,{routes,heightAt,heightVersion,step:1.5});
 const signature=network=>network.children.flatMap(mesh=>{
  const p=mesh.geometry.getAttribute('position'),
    c=mesh.geometry.getAttribute('color'),
    n=mesh.geometry.getAttribute('normal'),out=[];
  for(let i=0;i<p.count;i++)out.push([
   p.getX(i),p.getY(i),p.getZ(i),c.getX(i),c.getY(i),c.getZ(i),
   c.getW(i),n.getX(i),n.getY(i),n.getZ(i)
  ].map(v=>v.toFixed(4)).join(':'));
  return out;
 }).sort();
 assert.deepEqual(signature(next),signature(old),'exact same vertices, RGB, alpha and normals');
 assert(next.children.length<old.children.length,'road draw calls reduced');
 assert.equal(next.userData.pathStats.triangles,old.userData.pathStats.triangles);
 offset=1;revision++;
 for(const mesh of next.children){
  mesh.onBeforeRender();
  const p=mesh.geometry.getAttribute('position');
  for(let i=0;i<p.count;i++)
   assert(Math.abs(p.getY(i)-heightAt(p.getX(i),p.getZ(i))-.12)<1e-4,
     'LOD refresh updates every vertex');
 }
 const game=await require('./harness.cjs')();
 const orig=game.context.HUNTER_CIVIL_C1A(T,0xca3945);
 const optimized=game.run("mkV('cotxe_civil',{color:0xca3945})");
 orig.scale.setScalar(game.context.HUNTER_VEHICLES.scales.cotxe_civil);
 orig.updateMatrixWorld(true);optimized.updateMatrixWorld(true);
 const stats=root=>{let triangles=0,glass=0,meshCount=0;root.traverse(o=>{
  if(o.isMesh){meshCount++;triangles+=(o.geometry.index?
    o.geometry.index.count:o.geometry.getAttribute('position').count)/3;
   if(o.material.transparent)glass++;
  }
 });return {meshCount,triangles,glass}};
 const a=stats(orig),b=stats(optimized);
 assert.equal(b.triangles,a.triangles,'car geometry unchanged');
 assert.equal(b.glass,a.glass,'transparent glass separately rendered');
 assert(b.meshCount<a.meshCount,'fewer vehicle draw calls');
 const bbA=new T.Box3().setFromObject(orig),bbB=new T.Box3().setFromObject(optimized);
 assert(bbA.min.distanceTo(bbB.min)<1e-4&&bbA.max.distanceTo(bbB.max)<1e-4,
   'exterior dimensions identical');
 assert.equal(optimized.userData.wheels.length,4);
 assert.equal(optimized.userData.steeringPivots.length,2);
 const colorHistogram=(root,original)=>{
  const h=new Map(),car=original?root:
   root.children.find(o=>o.name.startsWith('hunter-civil-family-iteration-'));
  assert(car);
  for(const o of car.children){
   if(!o.isMesh||o.material.transparent)continue;
   const n=o.geometry.index?o.geometry.index.count:o.geometry.getAttribute('position').count,
     colors=o.geometry.getAttribute('color');
   if(!original&&o.material.vertexColors){
    assert.equal(colors.count,n);
    for(let i=0;i<n;i++){
     const k=[colors.getX(i),colors.getY(i),colors.getZ(i)]
      .map(x=>x.toFixed(5)).join(':');
     h.set(k,(h.get(k)||0)+1);
    }
   }else{
    const c=o.material.color,k=[c.r,c.g,c.b].map(x=>x.toFixed(5)).join(':');
    h.set(k,(h.get(k)||0)+n);
   }
  }
  return [...h.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
 };
 assert.deepEqual(colorHistogram(optimized,false),colorHistogram(orig,true),
   'identical color distribution per vertex');
 console.log('PASS render batches: roads',old.children.length,'=>',
   next.children.length,'meshes; cars',a.meshCount,'=>',b.meshCount,
   'meshes; triangles, colors, alpha, wheel pivots and road LOD unchanged');
})().catch(error=>{console.error(error);process.exitCode=1});
