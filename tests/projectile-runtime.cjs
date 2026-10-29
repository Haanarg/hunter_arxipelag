'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 const result=game.run(`(()=>{
  world=new THREE.Group();scene.add(world);Pj=[];cv=null;sniperEquipped=false;hAt=()=>0;activeBunker=null;
  let targets=[],walls=[],hits=0;wallCandidates=()=>walls;buildingCandidates=()=>[];enemyCandidatesAt=()=>targets;vehicleCandidatesAt=()=>[];treeAt=()=>null;bunkerProjectileSurface=()=>0;
  hurtE=(target,damage)=>{hits++;target.hp-=damage;};dmgW=()=>{};spawnBulletImpact=()=>{};
  const target={t:'soldat',x:0,z:-8,hp:8,r:1,o:{position:{y:0}}};targets=[target];
  shoot(0,1.5,0,0,0,-1,130,2,0,'p',mW,1);const initial={hp:target.hp,count:Pj.length,vz:Pj[0].vz,life:Pj[0].life};
  updPj(1/30);const flying={hp:target.hp,z:Pj[0].z};updPj(1/30);const landed={hp:target.hp,count:Pj.length,hits};
  target.hp=8;walls=[{x0:-3,x1:3,y0:0,y1:5,z0:-5.1,z1:-5,open:false}];shoot(0,1.5,0,0,0,-1,130,2,0,'p',mW,1);updPj(1/30);updPj(1/30);const covered={hp:target.hp,count:Pj.length,hits};
  walls=[];targets=[];shoot(0,1.5,0,0,0,-1,130,2,0,'p',mW,1);for(let i=0;i<5;i++)updPj(.5);const expired=Pj.length;
  return {initial,flying,landed,covered,expired,lightVertices:gLight.getAttribute('position').count,heavyVertices:gHeavy.getAttribute('position').count};
 })()`);
 assert.deepEqual({...result.initial},{hp:8,count:1,vz:-130,life:2.2});assert.equal(result.flying.hp,8);assert.ok(result.flying.z<-4);assert.equal(result.landed.hp,6);assert.equal(result.landed.count,0);assert.equal(result.landed.hits,1);assert.equal(result.covered.hp,8);assert.equal(result.covered.hits,1);assert.equal(result.covered.count,0);assert.equal(result.expired,0);assert.ok(result.lightVertices>0&&result.heavyVertices>0);
 console.log('individual projectile runtime: actual launch/model, delayed damage, cover/nearest collision and expiry through shared kernel passed');
})().catch(error=>{console.error(error);process.exitCode=1});
