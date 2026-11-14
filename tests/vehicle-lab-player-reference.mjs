import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three-r186.module.mjs';
import {playerModel,palette} from '../src/player-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
import {createLabPlayerReference} from '../src/vehicle-lab-player-reference.mjs';

// Exercise the real gameplay factory and capture only its protagonist body.
// Weapons are separate children and must not affect a height/scale comparison.
const bodyMeshes=[];
const window={HUNTER_PALETTE:palette,HUNTER_PLAYER_BATCH:playerBatching,
 HUNTER_BOLT_CUTTERS:{create:()=>new THREE.Group()},
 HUNTER_PLAYER_MODEL:{create(T,options){const p=playerModel.create(T,options);p.traverse(o=>{if(o.isMesh)bodyMeshes.push(o)});return p}}};
vm.runInNewContext(readFileSync(new URL('../src/characters.js',import.meta.url),'utf8'),{window,Math});
const box=(g,w,h,d,c,x=0,y=0,z=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c}));m.position.set(x,y,z);g.add(m);return m};
// Disable merging ONLY for the game body measurement, retaining the exact geometry.
window.HUNTER_PLAYER_BATCH={optimize:()=>({})};
const game=window.HUNTER_CHARACTERS.createPlayer(THREE,{box});game.updateMatrixWorld(true);
const bounds=new THREE.Box3();for(const mesh of bodyMeshes)bounds.union(new THREE.Box3().setFromObject(mesh));
const reference=createLabPlayerReference(THREE),actual=new THREE.Box3().setFromObject(reference);
assert(bounds.getSize(new THREE.Vector3()).distanceTo(actual.getSize(new THREE.Vector3()))<1e-5,'Mateixes dimensions que el cos real del protagonista');
assert.deepEqual(reference.children[0].scale.toArray(),game.scale.toArray());
assert.equal(reference.children[0].userData.headVariant,'compactD');
assert(Math.abs(actual.min.y)<1e-6,'Soles sobre el terra');
const vehicle=new THREE.Group(),scene=new THREE.Scene();scene.add(reference,vehicle);
vehicle.scale.setScalar(3);
assert(new THREE.Box3().setFromObject(reference).getSize(new THREE.Vector3()).distanceTo(actual.getSize(new THREE.Vector3()))<1e-6,'Escalar el vehicle no escala el protagonista');
const lab=readFileSync(new URL('../src/vehicles-externs-proves.mjs',import.meta.url),'utf8');
assert(lab.includes('const person=createLabPlayerReference(THREE)'));
assert(!lab.includes('new THREE.CapsuleGeometry'));
console.log('PASS lab protagonist: gameplay body/scale parity, grounded feet and independent vehicle scale; height='+reference.userData.height.toFixed(3));
