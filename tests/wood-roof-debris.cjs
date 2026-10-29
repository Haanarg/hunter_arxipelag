#!/usr/bin/env node
// Regressió: les cases de fusta no han d'emetre fragments blaus ni cúbics.
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 const result=game.run(`(()=>{
   seed=67;R=mul(seed);islands=[];seedSearchMode=false;
   world=new THREE.Group();scene.add(world);B=[];Wl=[];Dr=[];stairs=[];DB.length=0;
   const wood=mkB(0,0,18,16,8,0x96714b,0x2c5fc0,
     {wood:true,civilianHut:true,noPartitions:true,doorSide:0});
   decorateRuntimeBuilding(wood,{w:18,d:16,h:8,wood:true});
   roofBreak(wood);
   const wooden=DB.map(d=>({
     color:d.m.material.color.getHex(),width:d.s0.x,height:d.s0.y,
     length:d.s0.z,ry:d.ry,rz:d.rz
   }));
   DB.length=0;
   const other=mkB(50,0,18,16,8,0xa9bdb0,0x2c5fc0,
     {noPartitions:true,doorSide:0});
   roofBreak(other);
   const standard=DB.map(d=>({
     color:d.m.material.color.getHex(),width:d.s0.x,length:d.s0.z
   }));
   return {wooden,standard,woodBroken:wood.rb,otherBroken:other.rb};
 })()`);
 assert.equal(result.woodBroken,1);
 assert.equal(result.otherBroken,1);
 assert.equal(result.wooden.length,20);
 assert.equal(result.standard.length,20);
 const colors=new Set(game.run('[0x69533a,0x887044,0x6d5637,0xa08a57].map(c=>M(c).color.getHex())'));
 assert(result.wooden.every(p=>colors.has(p.color)));
 assert.equal(new Set(result.wooden.map(p=>p.color)).size,4);
 assert(result.wooden.every(p=>p.width>=.12&&p.width<=.22&&p.height===p.width));
 assert(result.wooden.every(p=>p.length>=2.3&&p.length<=4.5&&p.length>p.width*10));
 assert(result.wooden.every(p=>Number.isFinite(p.ry)&&Number.isFinite(p.rz)));
 const standardColor=game.run('M(0x2c5fc0).color.getHex()');
 assert(result.standard.every(p=>p.color===standardColor));
 assert(result.standard.some(p=>p.length<2.3));
 console.log('OK sostres de fusta: bigues marrons llargues i primes; altres cobertes intactes');
})().catch(e=>{console.error(e);process.exitCode=1});

