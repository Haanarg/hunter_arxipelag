#!/usr/bin/env node
'use strict';
// Rowboat shadow cache skips wave pitch/roll and rowing animations,
// while full geometry still casts and significant course changes invalidate.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync('src/game-core.js','utf8');
const shadowSrc=fs.readFileSync('src/shadow-cache.js','utf8');
const w={};vm.runInNewContext(shadowSrc,{window:w});
const shadowMap={autoUpdate:true,needsUpdate:false};
const cache=w.HUNTER_SHADOW_CACHE.create({shadowMap,maxIdleMs:180});
const mk=(name,parent=null)=>({
  name,parent,position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},
  scale:{x:1,y:1,z:1},quaternion:{x:0,y:0,z:0,w:1},
  getWorldPosition(target){target.x=this.position.x;target.y=this.position.y;target.z=this.position.z;return target}
});
const boat=mk('barca_rems'),oars=mk('rowboat-oars',boat),
  pivot=mk('oar-pivot',oars),blade=mk('oar-blade',pivot);
blade.isMesh=true;blade.castShadow=false;
const hull=mk('rowboat-hull',boat);hull.isMesh=true;hull.castShadow=false;
const shadowCandidates=[{mesh:hull,owner:boat,point:null},{mesh:blade,owner:boat,point:null}],
  shadowStats={},shadowNodeOwners=new WeakMap(),shadowOwnerKinds=new WeakMap(),
  shadowBoatProxyCache=new WeakMap(),shadowOwnerPositionCache=new WeakMap();
shadowOwnerKinds.set(boat,'vehicle barca_rems');
let time=0;
const ctx={
  visualQuality:{shadows:true,shadowDistance:245},shadowsDisabled:false,
  performance:{now:()=>time},P:{x:0,z:0},
  THREE:{Vector3:class{constructor(){this.x=0;this.y=0;this.z=0}}},
  shadowLastX:Infinity,shadowLastZ:Infinity,shadowLastMs:-Infinity,
  shadowCandidates,shadowStats,shadowNodeOwners,shadowOwnerKinds,
  shadowBoatProxyCache,shadowOwnerPositionCache,shadowBoatNodes:[],shadowPoseNodes:[]
};
const a=core.indexOf('function updateShadowCasters(force=false){'),
  b=core.indexOf('function setShadowsDisabled(disabled){',a);
vm.runInNewContext(core.slice(a,b)+';this.updateShadowCasters=updateShadowCasters;',ctx);
ctx.updateShadowCasters(true);
assert.equal(shadowStats.active,2);
assert.equal(shadowStats.boatMotionProxies,1,'rowing boats use wave-independent proxy');
assert(hull.castShadow&&blade.castShadow,'full rowboat hull and oars retain castShadow');
assert(!ctx.shadowPoseNodes.includes(boat));
assert(!ctx.shadowPoseNodes.includes(oars));
assert(!ctx.shadowPoseNodes.includes(pivot));
assert.equal(ctx.shadowPoseNodes.length,1,'only the stable rowing boat proxy invalidates');
const frame=()=>{
 for(const proxy of ctx.shadowBoatNodes){
  proxy.position.x=proxy.source.position.x;proxy.position.z=proxy.source.position.z;
  proxy.rotation.y=proxy.source.rotation.y;
 }
 return cache.schedule({now:time,x:0,z:0,nodes:ctx.shadowPoseNodes});
};
assert(frame());shadowMap.needsUpdate=false;
boat.position.y+=.5;boat.rotation.x+=.3;boat.rotation.z+=.2;
oars.rotation.y+=1;pivot.rotation.x+=.8;time=16;
assert.equal(frame(),false,'waves and rowing do not cause shadow redraw');
boat.position.x+=1;time=32;
assert.equal(frame(),true,'meaningful movement refreshes full rowing boat shadow');
shadowMap.needsUpdate=false;
time=250;
assert.equal(frame(),true,'periodic safety refresh preserves correct oar shadows');
console.log('PASS rowing boat proxy, animated oar deferral, real translation, periodic full shadow');
