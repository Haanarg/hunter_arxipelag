'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync('src/game-core.js','utf8'),source=fs.readFileSync('src/shadow-cache.js','utf8');
const w={};vm.runInNewContext(source,{window:w});
let time=0;
const shadowMap={autoUpdate:true,needsUpdate:false};
const cache=w.HUNTER_SHADOW_CACHE.create({shadowMap,maxIdleMs:180});
const mk=(name,x,z)=>({
 name,position:{x,y:0,z},rotation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1},
 quaternion:{x:0,y:0,z:0,w:1},parent:null,
 getWorldPosition(){return {x:this.position.x,y:this.position.y,z:this.position.z}}
});
const boat=mk('llanxa',12,14),player=mk('jugador',0,0);
const mesh=owner=>({
 name:'hull',parent:owner,isMesh:true,castShadow:false,
 position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},
 scale:{x:1,y:1,z:1},quaternion:{x:0,y:0,z:0,w:1}
});
const hull=mesh(boat),body=mesh(player);
const shadowCandidates=[{mesh:hull,owner:boat,point:null},
  {mesh:body,owner:player,point:null}];
const shadowNodeOwners=new WeakMap(),shadowOwnerKinds=new WeakMap(),
 shadowBoatProxyCache=new WeakMap(),shadowStats={};
shadowOwnerKinds.set(boat,'vehicle llanxa');shadowOwnerKinds.set(player,'jugador');
const ctx={visualQuality:{shadows:true,shadowDistance:245},shadowsDisabled:false,
 performance:{now:()=>time},P:{x:0,z:0},THREE:{Vector3:class{}},
 shadowLastX:Infinity,shadowLastZ:Infinity,shadowLastMs:-Infinity,
 shadowCandidates,shadowStats,shadowNodeOwners,shadowOwnerKinds,shadowBoatProxyCache,
 shadowBoatNodes:[],shadowPoseNodes:[]};
const a=core.indexOf('function updateShadowCasters(force=false){'),
 b=core.indexOf('function setShadowsDisabled(disabled){',a);
assert(a>=0&&b>a);
vm.runInNewContext(core.slice(a,b)+';this.updateShadowCasters=updateShadowCasters',ctx);
ctx.updateShadowCasters(true);
assert.equal(shadowStats.active,2);
assert.equal(shadowStats.boatMotionProxies,1);
assert(hull.castShadow,'boat still casts its full shadow');
assert.equal(ctx.shadowPoseNodes.includes(boat),false,'wave-driven boat root is not watched');
assert.equal(ctx.shadowPoseNodes.includes(ctx.shadowBoatNodes[0]),true);
assert.equal(ctx.shadowPoseNodes.includes(player),true);
const draw=()=>{for(const proxy of ctx.shadowBoatNodes){
  proxy.position.x=proxy.source.position.x;proxy.position.z=proxy.source.position.z;
  proxy.rotation.y=proxy.source.rotation.y;
 }
 return cache.schedule({now:time,x:0,z:0,nodes:ctx.shadowPoseNodes});
};
assert(draw());shadowMap.needsUpdate=false;
boat.position.y+=.8;boat.rotation.x+=.35;boat.rotation.z-=.24;
time=16;assert.equal(draw(),false,'waves alone reuse shadow map');
boat.position.x+=1;time=32;assert.equal(draw(),true,'translation invalidates');
shadowMap.needsUpdate=false;boat.position.y+=.5;boat.rotation.z+=.4;
time=48;assert.equal(draw(),false,'wave roll stays deferred');
boat.rotation.y+=.4;time=64;assert.equal(draw(),true,'turning invalidates');
shadowMap.needsUpdate=false;
time=260;assert.equal(draw(),true,'periodic update catches wave shadows');
shadowMap.needsUpdate=false;player.position.x+=1;
time=280;assert.equal(draw(),true,'player movement still immediate');
assert(cache.stats.reuses>=2);
console.log('OK: boat wave motion deferred; movement and heading immediate; periodic shadow refresh preserved');
