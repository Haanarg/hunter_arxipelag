// Carrega el GLB real i exigeix que direcció, forquilla, punys i roda
// davantera girin com una sola peça, conservant radis i rodes buides.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three-r186.module.mjs';
import {GLTFLoader} from '../vendor/three-addons/loaders/GLTFLoader.js';
import {prepareStreetfighterPreview,setStreetfighterPreviewSteering,isStreetfighterDetailProtected} from '../src/streetfighter-preview-rig.mjs';

const path=new URL('../assets/vehicle-candidates/moto/2-motorcycle-racing-and-street-bikes-naked-streetfighter-9916850c.glb',import.meta.url);
const buffer=readFileSync(path);
const gltf=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
const root=gltf.scene;
const beforeMeshes=[];
root.traverse(node=>{if(node.isMesh)beforeMeshes.push(node)});
const spokes=['wheel-front/alloy','wheel-front/steel','wheel-rear/alloy','wheel-rear/steel'];
const trianglesBefore=new Map(spokes.map(name=>{
 const mesh=root.getObjectByName(name);
 assert(mesh,'Falten radis originals: '+name);
 return [name,(mesh.geometry.getIndex()?.count||mesh.geometry.getAttribute('position').count)/3];
}));
const stats=prepareStreetfighterPreview(THREE,root);
assert.deepEqual(stats.moved,{steel:96,alloy:96,trim:80,paint:208});
assert.equal(stats.removedMirrorStems,64);
assert.equal(stats.removedWheelAccents,2);
assert(root.getObjectByName('streetfighter-steering'));
assert(!root.getObjectByName('wheel-front/accent'));
assert(!root.getObjectByName('wheel-rear/accent'));
assert(!root.getObjectByName('side-stand'));
assert(!root.getObjectByName('naked-streetfighter_13'));
for(const [name,tris] of trianglesBefore){
 const mesh=root.getObjectByName(name);
 assert.equal((mesh.geometry.getIndex()?.count||mesh.geometry.getAttribute('position').count)/3,tris,'Roda sense reduir: '+name);
 assert(isStreetfighterDetailProtected(mesh),'No s’ha de reduir la malla dels radis');
}
const names=['wheel-front','wheel-rear','handlebar','streetfighter-front-steel','streetfighter-front-alloy','streetfighter-front-trim','streetfighter-front-paint'];
const snapshots=new Map();
const spot=name=>root.getObjectByName(name).getWorldPosition(new THREE.Vector3());
root.updateMatrixWorld(true);
for(const name of names){assert(root.getObjectByName(name),'Falta '+name);snapshots.set(name,spot(name).clone())}
assert.equal(root.getObjectByName('wheel-front').parent.name,'streetfighter-steering');
assert.equal(root.getObjectByName('handlebar').parent.name,'streetfighter-steering');
setStreetfighterPreviewSteering(root,.42);root.updateMatrixWorld(true);
for(const name of names.filter(x=>x!=='wheel-rear')){
 const dist=spot(name).distanceTo(snapshots.get(name));
 assert(dist>.0001,'La peça no gira amb el manillar: '+name+' (dist '+dist+')');
}
assert(spot('wheel-rear').distanceTo(snapshots.get('wheel-rear'))<1e-6,'La roda posterior no ha de girar amb direcció');
assert.equal(prepareStreetfighterPreview(THREE,root),stats,'Preparar el model ha de ser idempotent');
console.log('Moto GLB: forquilla 192 △, punys 80 △, parafang 208 △, roda 100% de radis; direcció unificada, 64 △ de retrovisors retirats.');
