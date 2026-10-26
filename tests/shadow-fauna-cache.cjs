'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync('src/game-core.js','utf8');
const cacheWindow={};
vm.runInNewContext(fs.readFileSync('src/shadow-cache.js','utf8'),{window:cacheWindow});
const begin=core.indexOf('function updateShadowCasters(force=false){'),
  end=core.indexOf('function setShadowsDisabled(disabled){',begin);
assert(begin>=0&&end>begin,'find the real caster classification routine');
const code=core.slice(begin,end);
let now=0;
const shadowMap={autoUpdate:true,needsUpdate:false};
const cache=cacheWindow.HUNTER_SHADOW_CACHE.create({shadowMap,maxIdleMs:180});
const shadowNodeOwners=new WeakMap(),shadowOwnerKinds=new WeakMap();
const makeOwner=(name,x,z)=>({
 name,position:{x,y:0,z},rotation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1},
 quaternion:{x:0,y:0,z:0,w:1},parent:null,
 getWorldPosition(){return {x:this.position.x,y:0,z:this.position.z}}
});
const gull=makeOwner('gull',12,14),shark=makeOwner('shark',15,16),
  vehicle=makeOwner('truck',8,9),player=makeOwner('player',0,0),
  distant=makeOwner('distant gull',500,500);
for(const o of [gull,shark,distant])shadowOwnerKinds.set(o,'fauna');
shadowOwnerKinds.set(vehicle,'vehicle camio');
shadowOwnerKinds.set(player,'jugador');
const mesh=o=>({
  isMesh:true,name:'body',parent:o,castShadow:false,
  position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},
  scale:{x:1,y:1,z:1},quaternion:{x:0,y:0,z:0,w:1}
});
const meshes=[gull,shark,vehicle,player,distant].map(mesh);
const shadowCandidates=meshes.map((m,i)=>({mesh:m,owner:[gull,shark,vehicle,player,distant][i],point:null}));
const shadowStats={updates:0},context={
 visualQuality:{shadows:true,shadowDistance:245},shadowsDisabled:false,
 performance:{now:()=>now},P:{x:0,z:0},THREE:{Vector3:class{}},
 shadowLastX:Infinity,shadowLastZ:Infinity,shadowLastMs:-Infinity,
 shadowCandidates,shadowStats,shadowNodeOwners,shadowOwnerKinds,shadowPoseNodes:[]
};
vm.runInNewContext(code+'\nthis.updateShadowCasters=updateShadowCasters;',context);
context.updateShadowCasters(true);
assert.equal(shadowStats.active,4,'all 4 nearby objects are shadow casters');
assert.equal(shadowStats.deferredFaunaCasters,2,'two fauna shadows are deferred');
assert(meshes[0].castShadow&&meshes[1].castShadow,'fauna keep their shadows');
assert.equal(meshes[4].castShadow,false,'far fauna is excluded by distance');
assert.equal(context.shadowPoseNodes.includes(gull),false,'gull motion does not invalidate shadow map');
assert.equal(context.shadowPoseNodes.includes(shark),false,'shark motion does not invalidate shadow map');
assert.equal(context.shadowPoseNodes.includes(vehicle),true,'vehicle motion still tracked');
assert.equal(context.shadowPoseNodes.includes(player),true,'player motion still tracked');
const schedule=()=>cache.schedule({now,x:0,z:0,nodes:context.shadowPoseNodes});
assert.equal(schedule(),true,'initial render');
shadowMap.needsUpdate=false;
gull.position.x+=7;gull.rotation.z+=1.1;shark.position.z+=3;
now=16;assert.equal(schedule(),false,'fauna movement alone does not redraw every frame');
shadowMap.needsUpdate=false;
vehicle.position.x+=.5;
now=32;assert.equal(schedule(),true,'vehicle movement redraws immediately');
shadowMap.needsUpdate=false;
gull.position.x+=5;
now=48;assert.equal(schedule(),false,'further gull movement is still deferred');
shadowMap.needsUpdate=false;
now=213;assert.equal(schedule(),true,'periodic refresh updates fauna shadows');
assert.equal(cache.stats.reasons['refresc preventiu'],1);
shadowMap.needsUpdate=false;
player.position.z+=1;
now=230;assert.equal(schedule(),true,'player movement redraws immediately');
now=1250;
context.updateShadowCasters(true);
assert.equal(shadowStats.deferredFaunaCasters,2,'fauna exclusion survives caster refresh');
console.log('OK: fauna keep shadows but cannot invalidate the whole map; player/vehicles/periodic refresh work');
