// Regressió del model DEFINITIU; no depèn d'un GLB extern ni de CDN.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {createJetSki25,JET_SKI_25_META} from '../src/jet-ski-25-geometry.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';

assert.equal(JET_SKI_25_META.sourceTriangles,10320,'Triànguls GLB original verificats');
assert.equal(JET_SKI_25_META.triangles,2578,'Geometria 25% validada');
assert(Math.abs(JET_SKI_25_META.ratio-.25)<.002,'No s’ha guardat el model al 25%');

const mkMaterial=(hex,profile)=>new THREE.MeshStandardMaterial({color:hex,roughness:.75,transparent:profile==='glass'});
const red=createJetSki25(THREE,{color:0xffdf18,material:mkMaterial});
const blue=createJetSki25(THREE,{color:0x228fef,material:mkMaterial});
const materialNames=['foam','coral','charcoal','navy','steel','glass'];
for(const model of [red,blue]){
 assert.equal(model.children.length,6,'Sis malles GLB conservades');
 assert.deepEqual(model.children.map(x=>x.name),materialNames.map(n=>'jetski-'+n));
 assert.equal(model.children.reduce((sum,m)=>sum+m.geometry.index.count/3,0),2578);
 assert.equal(model.userData.jetSkiModel,'recreational-jet-ski-25');
}
const redDeck=red.getObjectByName('jetski-coral');
const blueDeck=blue.getObjectByName('jetski-coral');
assert.equal(redDeck.material.color.getHex(),0xffdf18,'La coberta ha de ser groc viu');
assert.equal(blueDeck.material.color.getHex(),0x228fef,'La coberta ha de ser blau elèctric');
assert.strictEqual(redDeck.geometry,blueDeck.geometry,'Les geometries han de compartir memòria');
const bounds=new THREE.Box3().setFromObject(red),d=bounds.getSize(new THREE.Vector3());
assert(d.x>=1.3&&d.x<=1.53,'Amplada física del model '+d.x);
assert(d.z>=3.9&&d.z<=4.06,'Llargada física del model '+d.z);
assert(bounds.min.y>=.19,'La moto no s’ha d’enfonsar en el terreny');

const box=(parent,w,h,depth,color,x=0,y=0,z=0)=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,depth),mkMaterial(color));
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
};
const factory=vehicleModels.createFactory(THREE,{
 box,material:mkMaterial,shadows:false,batching:playerBatching
});
for(const col of [0xffdf18,0x228fef,0xef35a8]){
 const vehicle=factory('moto_aquatica',{color:col});
 assert.equal(vehicle.userData.jetSkiModel,'recreational-jet-ski-25','Fàbrica visual integrada');
 assert.equal(vehicle.userData.jetSkiColor,col,'Conservam el color de la llavor');
 assert.equal(vehicle.userData.jetSkiTriangles,2578);
 assert.equal(vehicle.scale.x,vehicleModels.scales.moto_aquatica);
 const deck=vehicle.getObjectByName('jetski-coral');
 assert(deck,'El color de la coberta ha de ser configurable');
 assert.equal(deck.material.color.getHex(),col,'La coberta no pot tornar al vermell pastel');
}
console.log('Moto aquàtica definitiva: 2.578 triangles (24,98%), 6 malles, color viu per llavor i fàbrica original verificats.');
