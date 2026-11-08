#!/usr/bin/env node
// Hunter: genera UNA vegada la geometria final Recreational Jet Ski (25%).
// Executa amb Node 22:
// node --no-warnings --experimental-loader=./tests/three-local-loader.mjs tools/generate-jet-ski-25.mjs
// No es carrega cap GLB ni meshoptimizer durant una missió.
import * as THREE from '../vendor/three-r186.module.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {GLTFLoader} from '../vendor/three-addons/loaders/GLTFLoader.js';
import {SimplifyModifier} from '../vendor/three-addons/modifiers/SimplifyModifier.js';
import {mergeVertices,deinterleaveGeometry} from '../vendor/three-addons/utils/BufferGeometryUtils.js';
const source=new URL('../assets/vehicle-candidates/moto_aquatica/3-beach-surf-and-paddle-kit-recreational-jet-ski-a61d9936.glb',import.meta.url);
const dest=new URL('../src/jet-ski-25-geometry.mjs',import.meta.url);
const bytes=await readFile(source);
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const modifier=new SimplifyModifier();
gltf.scene.rotation.y+=Math.PI; // Idèntica orientació que al comparador.
gltf.scene.updateMatrixWorld(true);
const rawParts=[],bounds=new THREE.Box3(),p=new THREE.Vector3();
let baseTriangles=0,finalTriangles=0;
for(const mesh of gltf.scene.children.flatMap(function collect(node){return [node,...node.children.flatMap(collect)]}).filter(n=>n.isMesh)){
 const original=mesh.geometry,prepared=original.clone();
 deinterleaveGeometry(prepared);
 const welded=prepared.index?prepared:mergeVertices(prepared);
 const originalTriangles=(original.index?.count||original.getAttribute('position').count)/3;
 const count=welded.getAttribute('position').count;
 const simplified=await modifier.modify(welded,Math.min(count-3,Math.max(1,Math.round(count*.75))));
 const geometry=simplified.index?.count>=3?simplified:welded;
 const positions=geometry.getAttribute('position');
 const index=geometry.getIndex();
 const coordinates=new Float32Array(positions.count*3);
 for(let i=0;i<positions.count;i++){
   p.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
   coordinates[3*i]=p.x;coordinates[3*i+1]=p.y;coordinates[3*i+2]=p.z;
   bounds.expandByPoint(p);
 }
 // Calculam normals sobre la malla final indexada per evitar els normals
 // de buffer glTF quantitzats que no es poden transformar amb precisió.
 const worldGeometry=new THREE.BufferGeometry();
 worldGeometry.setAttribute('position',new THREE.BufferAttribute(coordinates,3));
 if(index)worldGeometry.setIndex(Array.from(index.array));else worldGeometry.setIndex(Array.from({length:positions.count},(_,i)=>i));
 worldGeometry.computeVertexNormals();
 const meshTriangles=worldGeometry.index.count/3;
 const material=mesh.material?.name||mesh.name;
 rawParts.push({name:material,worldGeometry});
 baseTriangles+=originalTriangles;finalTriangles+=meshTriangles;
 if(welded!==prepared&&welded!==geometry)welded.dispose();
 if(geometry!==welded)geometry.dispose();
 prepared.dispose();
}
if(rawParts.length!==6||!rawParts.some(p=>p.name==='coral'))throw Error('El GLB ha canviat de materials, cal revisar-lo abans de generar');
const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
// El xassís final respecta l'amplada / llargada aproximades del model del joc.
// Col·lisions, direcció i seient continuen essent els originals del tipus.
// Homogeneïtzam visualment amb el model original abans del canvi.
const factor=Math.min(1.52/size.x,4.05/size.z);
const floorOffset=.20-bounds.min.y*factor;
const encoded=[];
for(const part of rawParts){
 const geo=part.worldGeometry,pos=geo.getAttribute('position'),norm=geo.getAttribute('normal');
 const xyz=new Float32Array(pos.count*3),nrm=new Float32Array(norm.count*3);
 for(let i=0;i<pos.count;i++){
   xyz[3*i]=(pos.getX(i)-center.x)*factor;
   xyz[3*i+1]=pos.getY(i)*factor+floorOffset;
   xyz[3*i+2]=(pos.getZ(i)-center.z)*factor;
   nrm[3*i]=norm.getX(i);nrm[3*i+1]=norm.getY(i);nrm[3*i+2]=norm.getZ(i);
 }
 const idx=Uint16Array.from(geo.index.array);
 if(Math.max(...idx)>65535)throw Error('Index GLB fora de Uint16');
 encoded.push({name:part.name,vertices:pos.count,triangles:idx.length/3,
  p:Buffer.from(xyz.buffer).toString('base64'),
  n:Buffer.from(nrm.buffer).toString('base64'),
  i:Buffer.from(idx.buffer).toString('base64')});
 geo.dispose();
}
const sourceHeader=`// GENERAT; NO EDITAR A MÀ. npm script: tools/generate-jet-ski-25.mjs
// Source: Recreational Jet Ski by 3dassets.dev (asset 39428), CC0-1.0.
// Geometria 25% per malla, meshoptimizer r186. No queda GLB en producció.
`;
const meta={source:'https://3dassets.dev/assets/beach-surf-and-paddle-kit-recreational-jet-ski-a61d9936',license:'CC0-1.0',
sourceTriangles:baseTriangles,triangles:finalTriangles,ratio:finalTriangles/baseTriangles,
width:size.x*factor,length:size.z*factor};
const output=sourceHeader+`export const JET_SKI_25_META=Object.freeze(${JSON.stringify(meta)});
`+
`const PARTS=${JSON.stringify(encoded)};
`+
`
const geometryCache=new WeakMap();
function decode(b64){
 const binary=atob(b64),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return bytes.buffer;
}
function sharedGeometries(THREE){
 let geometries=geometryCache.get(THREE);
 if(geometries)return geometries;
 geometries=PARTS.map(part=>{
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(decode(part.p)),3));
   geo.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(decode(part.n)),3));
   geo.setIndex(new THREE.BufferAttribute(new Uint16Array(decode(part.i)),1));
   geo.computeBoundingSphere();
   return {name:part.name,geometry:geo};
 });
 geometryCache.set(THREE,geometries);
 return geometries;
}
export function createJetSki25(THREE,{color=0xc94e3f,material}={}){
 if(typeof material!=='function')throw new Error('Falta el servei de materials de Hunter');
 const palette={
   foam:[0xe9eeeb,'paint'],
   coral:[color,'paint'],
   charcoal:[0x292c30,'rubber'],
   navy:[0x193251,'paint'],
   steel:[0xb8bec4,'metal'],
   glass:[0x9ecbd9,'glass']
 };
 const root=new THREE.Group();root.name='recreational-jet-ski-25';
 for(const {name,geometry} of sharedGeometries(THREE)){
   const [hex,profile]=palette[name]||[0x777777,'paint'];
   const part=new THREE.Mesh(geometry,material(hex,profile));
   part.name='jetski-'+name;root.add(part);
 }
 root.userData.jetSkiModel='recreational-jet-ski-25';
 root.userData.jetSkiColor=color;
 return root;
}
`;
await writeFile(dest,output,'utf8');
console.log('Jet Ski definitivament al 25%: '+baseTriangles+' -> '+finalTriangles+' triangles; '+
 (100*finalTriangles/baseTriangles).toFixed(1)+'% del GLB; '+encoded.length+' malles; escala '+factor.toFixed(3)+
 '; '+Buffer.byteLength(output)+' bytes ESM');
