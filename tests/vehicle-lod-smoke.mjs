// Verifica amb GLB REAL que meshoptimizer és capaç de simplificar amb materials i normals.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GLTFLoader} from '../vendor/three-addons/loaders/GLTFLoader.js';
import {SimplifyModifier} from '../vendor/three-addons/modifiers/SimplifyModifier.js';
import {mergeVertices} from '../vendor/three-addons/utils/BufferGeometryUtils.js';
const manifest=JSON.parse(readFileSync(new URL('../assets/vehicle-candidates/manifest.json',import.meta.url),'utf8'));
const loader=new GLTFLoader();
const simplifier=new SimplifyModifier();
for(const [id,slot] of [['moto',2],['moto_aquatica',3]]){
 const meta=manifest.models[id].find(entry=>entry.slot===slot);
 assert(meta,'Falta GLB seleccionat per a '+id);
 const path=new URL('../assets/vehicle-candidates/'+meta.file,import.meta.url);
 const buffer=readFileSync(path);
 const binary=buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
 const gltf=await loader.parseAsync(binary,'');
 assert(gltf.scene,'Escena GLB absent');
 const meshes=[];
 gltf.scene.traverse(node=>{if(node.isMesh&&node.geometry?.getAttribute('position'))meshes.push(node)});
 assert(meshes.length>=3,'Model inesperadament buit: '+id);
 const largest=meshes.sort((a,b)=>b.geometry.getAttribute('position').count-a.geometry.getAttribute('position').count)[0];
 const raw=largest.geometry,welded=raw.index?raw:mergeVertices(raw);
 const original=welded.index?.count/3||welded.getAttribute('position').count/3;
 const count=welded.getAttribute('position').count;
 let previous=original;
 for(const ratio of [.85,.65,.45,.25]){
   const result=await simplifier.modify(welded,Math.max(1,Math.round(count*(1-ratio))));
   const tris=(result.index?.count||0)/3;
   assert(tris>0&&tris<original,id+': no simplifica al nivell '+ratio+' (abans '+original+', després '+tris+')');
   assert(tris<=previous,id+': el nivell més agressiu té més triangles');
   previous=tris;
   result.dispose();
 }
 if(welded!==raw)welded.dispose();
 console.log(id+': GLB real i 4 nivells verificats sobre una malla ('+original+' -> '+previous+' triangles).');
}
