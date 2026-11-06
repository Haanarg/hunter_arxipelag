#!/usr/bin/env node
'use strict';
// La generació de l'escuma litoral NO pot bloquejar un fotograma
// mentre es canvia la resolució del mar de 160 a 384 segments.
const assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),vm=require('node:vm');
(async()=>{
 const root=path.join(__dirname,'..'),
  T=await import(require('node:url').pathToFileURL(path.join(root,
   'vendor/three-r186.module.mjs')).href);
 const ctx=vm.createContext({Math,console,Float32Array,performance});
 ctx.window=ctx;ctx.THREE=T;
 for(const f of ['src/water-config.js','src/waves.js','src/water.js'])
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 let foamCompletions=0,foamStarts=0,syncFoamCalls=0;
 ctx.HUNTER_COAST_FOAM={create(){
   return {mesh:null,stats:{segments:0},regenerate(){
      syncFoamCalls++;throw Error('coast foam cannot regenerate synchronously');
    },*regenerateSteps(){
      foamStarts++;
      for(let n=0;n<96;n++)yield {progress:n};
      foamCompletions++;
    },dispose(){}};
  }};
 const water=ctx.HUNTER_WATER_SYSTEM.create(T,{
   scene:new T.Scene(),sunDir:new T.Vector3(0,1,0),size:4800,
   segments:64,initialSegments:32,
   heightAt:()=>-30,config:ctx.HUNTER_WATER,coastDetail:true});
 water.updateSeabed();
 assert.equal(foamCompletions,1,'initial coast processing remains complete');
 assert(water.queueResolutionUpgrade());
 const original=water.geometry;
 let steps=0,seenCoast=false;
 while(steps++<300){
   const done=water.stepResolutionUpgrade(1);
   if(foamStarts===2&&!done){
     seenCoast=true;
     assert.strictEqual(water.geometry,original,
       'the original water mesh remains active during coast processing');
     assert.equal(water.resolution,32);
   }
   if(done)break;
 }
 assert(seenCoast,'foam processing must be spread over several calls');
 assert(steps>10&&steps<300,'foam job must finish without blocking');
 assert.equal(foamCompletions,2,'one complete shoreline rebuild');
 assert.equal(syncFoamCalls,0,'old synchronous foam path is never called');
 assert.equal(water.resolution,64);
 assert.notStrictEqual(water.geometry,original,'new water and shore commit together');
 water.dispose();
 console.log('PASS asynchronous water/shore upgrade, no synchronous 300ms foam spike, old mesh stable');
})().catch(e=>{console.error(e);process.exitCode=1});
