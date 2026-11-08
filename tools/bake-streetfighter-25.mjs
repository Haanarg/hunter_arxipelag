#!/usr/bin/env node
// GENERACIÓ PUNTUAL de la Naked streetfighter definitiva (versió acceptada). Executar abans
// d'eliminar els candidats: node --no-warnings --experimental-loader=./tests/three-local-loader.mjs tools/bake-streetfighter-25.mjs
// El joc NO carrega cap GLB, GLTFLoader ni meshoptimizer en partida.
import * as THREE from '../vendor/three-r186.module.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {GLTFLoader} from '../vendor/three-addons/loaders/GLTFLoader.js';
import {SimplifyModifier} from '../vendor/three-addons/modifiers/SimplifyModifier.js';
import {mergeVertices,deinterleaveGeometry} from '../vendor/three-addons/utils/BufferGeometryUtils.js';
import {prepareStreetfighterPreview,isStreetfighterDetailProtected} from '../src/streetfighter-preview-rig.mjs';

const asset=new URL('../assets/vehicle-candidates/moto/2-motorcycle-racing-and-street-bikes-naked-streetfighter-9916850c.glb',import.meta.url);
const destination=new URL('../src/streetfighter-25-geometry.mjs',import.meta.url);
const buffer=await readFile(asset);
const gltf=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
const root=gltf.scene;
const rigStats=prepareStreetfighterPreview(THREE,root);
const pivot=root.getObjectByName('streetfighter-steering');
const front=root.getObjectByName('wheel-front');
const back=root.getObjectByName('wheel-rear');
if(!pivot||!front||!back)throw Error('Falta un dels tres pivots de direcció/rodes');
root.updateMatrixWorld(true);
const parts=[],simplifier=new SimplifyModifier(),bbox=new THREE.Box3(),
 local=new THREE.Vector3(),world=new THREE.Vector3(),normal=new THREE.Vector3();
let beforeTriangles=0,afterTriangles=0,unreducedTriangles=0;
const isDescendant=(node,ancestor)=>{let cur=node;while(cur){if(cur===ancestor)return true;cur=cur.parent}return false};
const groups=new Map([['steer',pivot.getWorldPosition(new THREE.Vector3())],
 ['frontWheel',front.getWorldPosition(new THREE.Vector3())],
 ['rearWheel',back.getWorldPosition(new THREE.Vector3())],
 ['body',new THREE.Vector3()]]);
function classify(mesh){
 if(isDescendant(mesh,front))return 'frontWheel';
 if(isDescendant(mesh,back))return 'rearWheel';
 if(isDescendant(mesh,pivot))return 'steer';
 return 'body';
}
for(const mesh of root.children.flatMap(function walk(n){return [n,...n.children.flatMap(walk)]}).filter(o=>o.isMesh)){
 const source=mesh.geometry;
 const prepared=source.clone();
 deinterleaveGeometry(prepared);
 const welded=prepared.index?prepared:mergeVertices(prepared);
 const tri0=(source.index?.count||source.getAttribute('position').count)/3;
 let geo=welded,temporary=null;
 if(!isStreetfighterDetailProtected(mesh)){
   const count=welded.getAttribute('position').count;
   if(count>=12){
     // Coincideix amb la quarta opció del visor: 25% d'objectiu per
     // peça no protegida. Els radis i la direcció es conserven exactes.
     const target=Math.min(count-3,Math.max(1,Math.round(count*.75)));
     const result=await simplifier.modify(welded,target);
     if(result.index?.count>=3&&result.index.count/3<tri0){geo=result;temporary=result}
     else result.dispose();
   }
 }
 const position=geo.getAttribute('position'),nrm=geo.getAttribute('normal');
 const group=classify(mesh),origin=groups.get(group);
 const indices=geo.getIndex();
 const xyz=new Float32Array(position.count*3),normals=new Float32Array(position.count*3);
 for(let i=0;i<position.count;i++){
   world.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
   bbox.expandByPoint(world);
   xyz[3*i]=world.x-origin.x;
   xyz[3*i+1]=world.y-origin.y;
   xyz[3*i+2]=world.z-origin.z;
   if(nrm){
     normal.fromBufferAttribute(nrm,i).transformDirection(mesh.matrixWorld);
     normals.set([normal.x,normal.y,normal.z],3*i);
   }
 }
 const list=indices?Array.from(indices.array):Array.from({length:position.count},(_,i)=>i);
 if(Math.max(...list)>65535)throw Error('La malla és massa gran per Uint16');
 const label=mesh.material?.name||'steel',name=mesh.name;
 const count=list.length/3;
 parts.push({group,name,label,vertices:position.count,triangles:count,xyz,normals,idx:Uint16Array.from(list)});
 beforeTriangles+=tri0;afterTriangles+=count;
 if(isStreetfighterDetailProtected(mesh))unreducedTriangles+=count;
 if(temporary)temporary.dispose();
 if(welded!==prepared)welded.dispose();
 prepared.dispose();
}
if(rigStats.removedMirrorStems!==64||rigStats.removedWheelAccents!==2||parts.length<12)
 throw Error('No concorda el GLB Naked streetfighter amb la geometria verificada');
const size=bbox.getSize(new THREE.Vector3()),center=bbox.getCenter(new THREE.Vector3());
if(size.z<1.8||size.z>3.5)throw Error('Longitud inesperada del GLB: '+size.z);
// Ajust uniforme a la silueta original del laboratori (amplada del
// manillar 1.1 i llargada 4.3), i reducció final al 75% de l'escala.
// Així la nova amplada i llargada no superen el 75% del model precedent;
// a més, el llarg resultant queda pròxim als 2.8 m de la hitbox.
const fit=.75*Math.min(1.1/size.x,4.3/size.z);
const originalMinY=bbox.min.y;
const transformPoint=v=>[-(v.x-center.x)*fit,(v.y-originalMinY)*fit+.02,-(v.z-center.z)*fit];
const encoded=parts.map(({group,name,label,vertices,triangles,xyz,normals,idx})=>{
 const origin=groups.get(group),o=transformPoint(origin);
 const scaled=new Float32Array(xyz.length);
 for(let i=0;i<xyz.length;i+=3){
   // Aplicar la mateixa transformació de rotació Y π i escala a tots
   // els punts; primer reconstruïm les posicions originals de món.
   scaled[i]=-xyz[i]*fit;
   scaled[i+1]=xyz[i+1]*fit;
   scaled[i+2]=-xyz[i+2]*fit;
 }
 const n=new Float32Array(normals.length);
 for(let i=0;i<n.length;i+=3){n[i]=-normals[i];n[i+1]=normals[i+1];n[i+2]=-normals[i+2]}
 return {group,name,label,vertices,triangles,p:Buffer.from(scaled.buffer).toString('base64'),
 n:Buffer.from(n.buffer).toString('base64'),i:Buffer.from(idx.buffer).toString('base64')};
});
const point=type=>transformPoint(groups.get(type));
const meta={
 asset:'https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-naked-streetfighter-9916850c',
 license:'CC0-1.0',ratioSetting:.25,scaleRelativeToPrevious:.75,
 sourceTriangleCount:4908,rigTriangleCount:beforeTriangles,triangles:afterTriangles,
 protectedTriangles:unreducedTriangles,parts:parts.length,
 dimensions:{width:size.x*fit,length:size.z*fit,height:size.y*fit},
 pivot:point('steer'),frontWheel:point('frontWheel'),rearWheel:point('rearWheel'),
 wheelRadius:.32*fit,fit};
let code=`// GENERAT amb tools/bake-streetfighter-25.mjs. No editar a mà.
// Naked Streetfighter model 15425 (3dassets.dev), CC0 1.0.
// Meshoptimizer al 25% per peces no protegides; les rodes i els radis
// conserven els triangles originals. No es carrega cap GLB a les missions.
export const STREETFIGHTER_25_META=Object.freeze(${JSON.stringify(meta)});
const PARTS=${JSON.stringify(encoded)};
`+
`
const cache=new WeakMap();
function decode(b64){
 const binary=atob(b64),data=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)data[i]=binary.charCodeAt(i);
 return data.buffer;
}
function geometries(THREE){
 let all=cache.get(THREE);
 if(all)return all;
 all=PARTS.map(part=>{
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(decode(part.p)),3));
   geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(decode(part.n)),3));
   geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(decode(part.i)),1));
   geometry.computeBoundingSphere();
   return {group:part.group,name:part.name,label:part.label,geometry};
 });
 cache.set(THREE,all);
 return all;
}
export function createStreetfighter25(THREE,{color=0x228fef,material}={}){
 if(typeof material!=='function')throw Error('Naked Streetfighter: material() absent');
 const bike=new THREE.Group();bike.name='naked-streetfighter-25';
 const steering=new THREE.Group();steering.name='streetfighter-steering';
 steering.position.set(...STREETFIGHTER_25_META.pivot);
 bike.add(steering);
 const frontWheel=new THREE.Group();frontWheel.name='streetfighter-front-wheel';
 const backWheel=new THREE.Group();backWheel.name='streetfighter-rear-wheel';
 frontWheel.position.set(
  STREETFIGHTER_25_META.frontWheel[0]-STREETFIGHTER_25_META.pivot[0],
  STREETFIGHTER_25_META.frontWheel[1]-STREETFIGHTER_25_META.pivot[1],
  STREETFIGHTER_25_META.frontWheel[2]-STREETFIGHTER_25_META.pivot[2]);
 backWheel.position.set(...STREETFIGHTER_25_META.rearWheel);
 steering.add(frontWheel);bike.add(backWheel);
 const paint=new Map([
  ['rubber',[0x171b1f,'rubber']],
  ['alloy',[0xbcc1c9,'metal']],
  ['steel',[0x6d757d,'metal']],
  ['trim',[0x202428,'rubber']],
  ['paint',[color,'paint']],
  ['white',[0xe3e3db,'paint']],
  ['accent',[0xb93929,'paint']]
 ]);
 const parents={body:bike,steer:steering,frontWheel,rearWheel:backWheel};
 for(const entry of geometries(THREE)){
   const [hex,profile]=paint.get(entry.label)||[0x5b676e,'metal'];
   const mesh=new THREE.Mesh(entry.geometry,material(hex,profile));
   mesh.name='streetfighter-'+entry.name;
   if(entry.label==='paint')mesh.userData.colorPanel=true;
   parents[entry.group].add(mesh);
 }
 const radius=STREETFIGHTER_25_META.wheelRadius;
 frontWheel.userData.radius=radius;
 backWheel.userData.radius=radius;
 bike.userData.wheels=[frontWheel,backWheel];
 bike.userData.steeringPivots=[steering];
 bike.userData.motorcycleModel='naked-streetfighter-25';
 bike.userData.motorcycleColor=color;
 return bike;
}
`;
await writeFile(destination,code,'utf8');
console.log(JSON.stringify({beforeTriangles,afterTriangles,ratio:afterTriangles/4908,
 protectedTriangles:unreducedTriangles,meshCount:parts.length,dimensions:meta.dimensions,
 fit,fromGLB:buffer.length,outputBytes:Buffer.byteLength(code)}));
