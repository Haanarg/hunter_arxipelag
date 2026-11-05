import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three-r186.module.mjs';

// Còpia congelada de v0.6.144 per comprovar diferències de geometria real.
const oracle="const batchStaticDecor=function* (){let checkpointUnits=0;\n  const CHUNK=160,groups=new Map(),materialMap=new Map();\n  world.updateWorldMatrix(true,false);\n  let originals=0,batches=0,vertices=0;\n  for(const root of staticDecorRoots){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n    if(!root.parent)continue;\n    root.updateMatrixWorld(true);\n    yield {stage:'Agrupant decoració',completed:originals,total:null,unit:'malles'};\n    root.traverse(mesh=>{\n      if(!mesh.isMesh||mesh.isInstancedMesh||!mesh.geometry?.attributes.position)return;\n      const mat=mesh.material;\n      if(!mat?.color||Array.isArray(mat))return;\n      const center=mesh.getWorldPosition(new THREE.Vector3()),\n            cx=Math.floor(center.x/CHUNK),cz=Math.floor(center.z/CHUNK);\n      const signature=[mat.type,mat.roughness??0,mat.metalness??0,mat.opacity??1,\n        mat.transparent?1:0,mat.side,mat.flatShading?1:0,mat.polygonOffset?1:0,mat.polygonOffsetFactor,mat.polygonOffsetUnits].join(':');\n      const key=cx+','+cz+'|'+signature;\n      let group=groups.get(key);\n      if(!group){group={cx,cz,mat,signature,meshes:[]};groups.set(key,group)}\n      group.meshes.push(mesh);originals++;\n    });\n  }\n  const transform=new THREE.Matrix4(),geometries=[];\n  for(const group of groups.values()){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n    const x=(group.cx+.5)*CHUNK,z=(group.cz+.5)*CHUNK,\n          pieces=[],sizes=[];let total=0;\n    try{\n    for(const mesh of group.meshes){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n      yield {stage:'Agrupant decoració',completed:batches,total:groups.size,unit:'grups'};\n      transform.makeTranslation(-x,0,-z).multiply(mesh.matrixWorld);\n      const copy=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();\n      copy.applyMatrix4(transform);\n      const n=copy.attributes.position.count,color=new Float32Array(n*3);\n      pieces.push(copy);sizes.push(n);total+=n;\n      for(let k=0;k<n;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n        if(k%256===0)yield {stage:'Colors de decoració',completed:k,total:n,unit:'vèrtexs'};\n        color[k*3]=mesh.material.color.r;\n        color[k*3+1]=mesh.material.color.g;\n        color[k*3+2]=mesh.material.color.b;\n      }\n      copy.setAttribute('color',new THREE.BufferAttribute(color,3));\n    }\n    const geom=new THREE.BufferGeometry();\n    for(const [attribute,width] of [['position',3],['normal',3],['uv',2],['color',3]]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n      const data=new Float32Array(total*width);let offset=0;\n      for(let k=0;k<pieces.length;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n        const src=pieces[k].getAttribute(attribute);\n        if(src)data.set(src.array,offset);\n        offset+=sizes[k]*width;\n      }\n      geom.setAttribute(attribute,new THREE.BufferAttribute(data,width));\n    }\n    geom.computeBoundingSphere();\n    // El mateix material per perfil en tots els sectors. Mateixes cares,\n    // colors i abast visual, però menys canvis d'estat de Three.js.\n    let mat=materialMap.get(group.signature);\n    if(!mat){\n      mat=group.mat.clone();mat.color.setHex(0xffffff);\n      mat.vertexColors=true;mat.needsUpdate=true;\n      materialMap.set(group.signature,mat);\n    }\n    const mesh=new THREE.Mesh(geom,mat);\n    mesh.name='hunter-static-decor-batch';\n    mesh.position.set(x,0,z);mesh.castShadow=false;\n    world.add(mesh);\n    batches++;vertices+=total;\n    }finally{for(const g of pieces){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};g.dispose()}}\n  }\n  const disposed=new Set(),materials=new Set();\n  for(const root of staticDecorRoots){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n    yield {stage:'Netejant decoració original',completed:null,total:null};\n    root.traverse(o=>{\n      if(o.geometry&&!disposed.has(o.geometry)){disposed.add(o.geometry);o.geometry.dispose()}\n      if(o.material){\n        for(const mat of Array.isArray(o.material)?o.material:[o.material])materials.add(mat);\n      }\n    });\n    root.parent?.remove(root);\n  }\n  for(const mat of materials){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};mat.dispose();}\n  staticDecorRoots.length=0;\n  const result={originalMeshes:originals,batchedMeshes:batches,\n    drawCallsSaved:originals-batches,sharedMaterials:materialMap.size,vertices};\n  window.HUNTER_STATIC_BATCH_STATS=result;\n  return result;\n};";
const before=new Function('THREE','world','staticDecorRoots','window',
  oracle+'\nreturn batchStaticDecor;');
const newFile=readFileSync(new URL('../src/static-decor-batching.js',import.meta.url),'utf8');
const after=new Function('window',newFile+'\nreturn window.HUNTER_STATIC_DECOR_BATCH;');
const worldFile=readFileSync(new URL('../src/world-generation.js',import.meta.url),'utf8');
const runtimeScripts=readFileSync(new URL('../src/runtime-scripts.mjs',import.meta.url),'utf8');
assert(worldFile.includes('return yield* window.HUNTER_STATIC_DECOR_BATCH.buildSteps('));
assert(!worldFile.includes('const CHUNK=160,groups=new Map()'));
assert(runtimeScripts.includes('"src/static-decor-batching.js", "src/world-generation.js"'));
const colors=[0xe6aa35,0x287bab,0xdddddd,0x778899];
function fixture(seed,scale,mode){
 const world=new THREE.Group(),roots=[];
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const materials=colors.map((color,i)=>new THREE.MeshStandardMaterial({
   color,roughness:[.5,.7,.9][i%3],metalness:[0,.15][i%2],
   opacity:i===0?.8:1,transparent:i===0,
   side:i===3?THREE.DoubleSide:THREE.FrontSide,flatShading:i===2
 }));
 const n=mode===0?0:mode===1?4:mode===2?9:mode===6?24:mode===7?3:18;
 for(let i=0;i<n;i++){
  const group=new THREE.Group();
  group.position.set((random()-.5)*680*scale,0,(random()-.5)*680*scale);
  group.rotation.y=Math.PI/2*(i%4);
  // Rotated, scaled nested compound groups exercise matrixWorld parity,
  // including placements that straddle two 160 m batching sectors.
  const nested=mode===5||mode===6?new THREE.Group():group;
  if(nested!==group){
   nested.position.set((random()-.5)*14,.25*i,(random()-.5)*14);
   nested.rotation.set(.07*(i%3),.22*i,.04*(i%4));
   nested.scale.set(1+(i%3)*.2,.8+(i%4)*.13,1+(i%5)*.1);
   group.add(nested);
  }
  for(let k=0;k<(mode===1?1:mode===2?2:3);k++){
   const geom=k===0?(mode===7?new THREE.SphereGeometry(2,24,16):
       new THREE.BoxGeometry(2+i*.1,1.5,3)):
      k===1?new THREE.CylinderGeometry(.65,.7,2.1,7):
      new THREE.PlaneGeometry(3,4,2,2);
   const mesh=new THREE.Mesh(geom,materials[(i+k)%materials.length]);
   mesh.position.set(3*k+(random()-.5)*12,.6*k,2*k+(random()-.5)*12);
   mesh.rotation.y=.1*k;nested.add(mesh);
  }
  world.add(group);roots.push(group);
 }
 if(mode===3&&roots.length)world.remove(roots[0]);
 if(mode===4&&roots.length)roots[0].add(new THREE.Group());
 return {world,roots,context:{HUNTER_STATIC_BATCH_STATS:null}};
}
function captureMesh(m){
 const g=m.geometry,attributes={};
 for(const key of ['position','normal','uv','color']){
  const a=g.getAttribute(key);
  if(a)attributes[key]={itemSize:a.itemSize,values:Array.from(a.array)};
 }
 return {position:m.position.toArray(),name:m.name,castShadow:m.castShadow,
  sphere:g.boundingSphere&&{center:g.boundingSphere.center.toArray(),radius:g.boundingSphere.radius},
  attrs:attributes,material:{type:m.material.type,color:m.material.color.getHex(),
   roughness:m.material.roughness,metalness:m.material.metalness,opacity:m.material.opacity,
   transparent:m.material.transparent,side:m.material.side,vertexColors:m.material.vertexColors}};
}
function trace({world,roots,context},isNew,three=THREE){
 const it=isNew?after(context).buildSteps({world,staticDecorRoots:roots,THREE:three}):
   before(three,world,roots,context)();
 const checkpoints=[];let step;
 for(let i=0;i<150000;i++){step=it.next();if(step.done)break;checkpoints.push(step.value)}
 assert(step?.done,'finite batch build');
 return {result:step.value,windowStats:context.HUNTER_STATIC_BATCH_STATS,
  checkpoints,rootCount:roots.length,
  rendered:world.children.filter(o=>o.isMesh).map(captureMesh),
  orphanGroups:world.children.filter(o=>o.isGroup).length};
}
let checks=0,originals=0,batches=0;
for(const scale of [1,2])for(const seed of [0,1,67,148,2407759483,4294967295])
 for(const mode of [0,1,2,3,4,5,6]){
   const left=trace(fixture(seed,scale,mode),false);
   const right=trace(fixture(seed,scale,mode),true);
   assert.deepEqual(right,left,'exact batches, geometry, material and yields '+[scale,seed,mode]);
   assert.equal(right.rootCount,0);
   originals+=right.result.originalMeshes;
   batches+=right.result.batchedMeshes;
   checks++;
 }

// Detect accidental reintroduction of an expensive matrix update for every mesh.
for(const seed of [67,148])for(const scale of [1,2]){
 const scene=fixture(seed,scale,5);
 let worldPositionCalls=0;
 scene.world.traverse(object=>{
  if(!object.isMesh)return;
  const get=object.getWorldPosition.bind(object);
  object.getWorldPosition=(...args)=>{worldPositionCalls++;return get(...args);};
 });
 const result=trace(scene,true);
 assert(result.result.originalMeshes>0);
 assert.equal(worldPositionCalls,0,
   'world matrices must be updated once per root, without mesh.getWorldPosition');
}

// Large indexed geometry crosses the cooperative checkpoint at every 256
// vertices; allocation optimization must retain every yield and float.
for(const seed of [67,148])for(const scale of [1,2]){
 const original=trace(fixture(seed,scale,7),false),
   optimized=trace(fixture(seed,scale,7),true);
 assert.deepEqual(optimized,original,'large indexed mesh with repeated color yields');
 assert(original.checkpoints.filter(p=>p.stage==='Colors de decoració').length>8);
 checks++;
}
// Instrument the output-builder BufferAttribute constructor without
// monkey-patching Three.js itself. The old path creates one additional
// color BufferAttribute (and typed buffer) per input mesh.
for(const seed of [67,148])for(const scale of [1,2]){
 const calls={before:0,after:0};
 const instrument=key=>({
  ...THREE,
  BufferAttribute:class extends THREE.BufferAttribute{
   constructor(...args){super(...args);calls[key]++}
  }
 });
 const old=trace(fixture(seed,scale,6),false,instrument('before')),
   now=trace(fixture(seed,scale,6),true,instrument('after'));
 assert.deepEqual(now,old,'no geometry change while eliminating color copies');
 assert.equal(calls.before-calls.after,old.result.originalMeshes,
  'exactly one redundant source-color allocation eliminated per mesh');
}
// Material edits between generator yields must affect the same vertex
// and all subsequent vertices in both the frozen oracle and new code.
function traceWithLiveMaterial(seed,scale,isNew){
 const {world,roots,context}=fixture(seed,scale,7);
 const material=roots[0].children[0].material;
 const it=isNew?after(context).buildSteps({world,staticDecorRoots:roots,THREE}):
   before(THREE,world,roots,context)();
 let changed=false,step;const checkpoints=[];
 for(let i=0;i<150000;i++){
  step=it.next();
  if(step.done)break;
  checkpoints.push(step.value);
  if(!changed&&step.value?.stage==='Colors de decoració'){
   material.color.setHex(0x39a1ff);
   changed=true;
  }
 }
 assert(step.done&&changed,'a color mutation occurred during vertex sampling');
 return {checkpoints,result:step.value,
  stats:context.HUNTER_STATIC_BATCH_STATS,
  mesh:world.children.filter(x=>x.isMesh).map(captureMesh)};
}
for(const seed of [67,148]){
 assert.deepEqual(traceWithLiveMaterial(seed,1,true),
  traceWithLiveMaterial(seed,1,false),
  'live vertex colors retained across generator checkpoints');
}
console.log('PASS phase4 static visual batching: '+checks+' parity cases, '+
  originals+' input meshes, '+batches+' grouped render meshes');
