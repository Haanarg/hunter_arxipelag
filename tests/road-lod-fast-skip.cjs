#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const T=await import('../vendor/three-r186.module.mjs');
 const {createPathNetwork}=await import('../src/compound-paths.mjs');
 const routes=[{points:[[0,0],[180,0],[180,160]],width:6},
               {points:[[40,90],[250,90]],width:4}];
 let revision=7,cellRevision=0,heightOffset=0,checks=0,heights=0;
 const heightVersion=(x,z)=>{checks++;return cellRevision*(x>=60?1:0)};
 const heightAt=(x,z)=>{heights++;return Math.sin(x*.02)+Math.cos(z*.02)+heightOffset};
 const net=createPathNetwork(T,{routes,heightAt,heightVersion,
    heightRevision:()=>revision,measure:()=>true});
 const stats=net.userData.pathRenderStats,meshCount=net.children.length,initialChecks=checks;
 for(let frame=0;frame<120;frame++)
   for(const mesh of net.children)mesh.onBeforeRender();
 assert.equal(checks,initialChecks,'unchanged LOD skips local version probes');
 assert.equal(stats.fastSkips,meshCount*120);
 assert.equal(stats.versionChecks,0);
 assert.equal(stats.refits,0);
 const previousHeights=heights;
 revision++;
 for(const mesh of net.children)mesh.onBeforeRender();
 assert.equal(stats.versionChecks,meshCount);
 assert.equal(stats.refits,0,'unrelated tile revision does not refit vertices');
 assert.equal(heights,previousHeights,'unrelated revisions do not resample heights');
 revision++;cellRevision++;heightOffset=1.5;
 for(const mesh of net.children)mesh.onBeforeRender();
 assert(stats.refits>0,'related tile revision refits geometry');
 for(const mesh of net.children){
  const pos=mesh.geometry.getAttribute('position');
  for(let i=0;i<pos.count;i++){
   const expected=Math.sin(pos.getX(i)*.02)+Math.cos(pos.getZ(i)*.02)+heightOffset+.12;
   assert(Math.abs(pos.getY(i)-expected)<1e-4,'road height correct');
  }
 }
 const fallback=createPathNetwork(T,{routes,heightAt,heightVersion});
 const oldChecks=checks;
 for(const mesh of fallback.children)mesh.onBeforeRender();
 assert(checks>oldChecks,'standalone callers retain old local version checks');
 console.log('PASS: fast LOD check, real terrain refits and standalone fallback');
})().catch(error=>{console.error(error);process.exitCode=1});
