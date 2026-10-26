#!/usr/bin/env node
'use strict';
// Regressions for CPU/GPU optimizations without lowering any visual settings.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const core=read('src/game-core.js'),ai=read('src/enemy-ai.js'),
 nav=read('src/enemy-navigation.js'),terrain=read('src/terrain.js'),
 vegetation=read('src/vegetation.js'),world=read('src/world-generation.js'),
 stealth=read('src/stealth-feedback.js'),visual=read('src/visual-config.js');
for(const [name,text]of Object.entries({core,ai,nav,terrain,vegetation,world,stealth})){
 assert.doesNotThrow(()=>new Function(text),name+' must parse');
}
assert(core.includes('function refreshVehicleGridIfCellsChanged()'));
assert(ai.includes('refreshVehicleGridIfCellsChanged();'));
assert(core.includes('function rebuildVehicleGrid()'));
assert(core.includes('enemyGrid.clear()'));
assert(nav.includes('ENEMY_ASTAR_NEIGHBORS'));
assert(nav.includes('u.navRadiusType===u.t'));
assert(stealth.includes('seen.clear()'));
assert(core.includes('cached.x!==v.o.position.x'));
assert(core.includes('v.o.updateWorldMatrix(true,true);cached.box.setFromObject(v.o)'));
assert(terrain.includes('cutoutMaterial&&tileUsesCutout(tile)?cutoutMaterial:material'));
assert(terrain.includes('cutoutMaterial?.dispose()'));
assert(core.includes('cutout.map=tex'));
assert(world.includes('materialMap.get(group.signature)'));
assert(world.includes('materialMap.set(group.signature,mat)'));
assert(vegetation.includes('new THREE.InstancedMesh'));
// No quality reduction: mobile rendering resolution and PC shadows remain unchanged.
assert(visual.includes('pixelRatio: 1.0'));
assert(visual.includes('waterSegments: 200'));
assert(visual.includes('shadows: true'));
assert(visual.includes('waterSegments: 384'));
// Compare the allocation-free SAT to the previous SAT on a deterministic grid.
const start=core.indexOf('const obbOverlap=(a,b)=>');
const end=core.indexOf('const circleVehicleOverlap=',start);
assert(start>=0&&end>start);
const sat=new Function(core.slice(start,end)+'return obbOverlap')();
const reference=(a,b)=>{
 const axes=b=>{const s=Math.sin(b.hd),c=Math.cos(b.hd);return[{x:c,z:-s},{x:s,z:c}]};
 const A=axes(a),B=axes(b),dx=b.x-a.x,dz=b.z-a.z;
 for(const ax of [...A,...B]){
  const distance=Math.abs(dx*ax.x+dz*ax.z);
  const ra=Math.abs(A[0].x*ax.x+A[0].z*ax.z)*a.w/2+
    Math.abs(A[1].x*ax.x+A[1].z*ax.z)*a.d/2;
  const rb=Math.abs(B[0].x*ax.x+B[0].z*ax.z)*b.w/2+
    Math.abs(B[1].x*ax.x+B[1].z*ax.z)*b.d/2;
  if(distance>ra+rb)return false;
 }
 return true;
};
let seed=726;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
for(let i=0;i<30000;i++){
 const obj=()=>({x:rnd()*80-40,z:rnd()*80-40,hd:(rnd()-.5)*6.3,
   w:.01+rnd()*18,d:.01+rnd()*18});
 const a=obj(),b=obj();
 assert.equal(sat(a,b),reference(a,b),'OBB equivalence '+i);
}
console.log('PASS: 30k OBB cases, shaders, LOS, A*, instancing, and original visual quality.');
