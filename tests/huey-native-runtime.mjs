// Verifica el Huey natiu en Three.js real sense navegador ni WebGL.
// Substitueix únicament el carregador de PNG per una textura buida a Node.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {prepareHueyDuaneRuntime} from '../src/huey-duane-runtime.mjs';
const original=THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load=function(){return new THREE.Texture();};
try{
 const factory=await prepareHueyDuaneRuntime(THREE);
 assert.equal(factory.triangles,2119);
 assert.equal(factory.skidContactHeight,.405);
 assert.equal(factory.name.includes('+10%'),true);
 assert(factory.dimensions.length>14&&factory.dimensions.length<19);
 const model=factory.create();
 assert.equal(model.userData.cockpitSeatCount,2);
 assert.equal(model.userData.hueyModel,'duane-100-open-engine-native-110');
 assert(model.userData.rotor?.isObject3D);
 assert(model.userData.tailRotor?.isObject3D);
 assert(model.getObjectByName('Huey_Cockpit_Seat_pilot'));
 assert(model.getObjectByName('Huey_Cockpit_Seat_copilot'));
 let triangles=0;
 model.traverse(o=>{
  if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
 });
 assert.equal(triangles,2119);
 console.log('Huey Three.js verificat:',triangles,'triangles, dos seients i dimensions',
  JSON.stringify(factory.dimensions),'rotor',factory.rotorContactHeight.toFixed(3));
}finally{THREE.TextureLoader.prototype.load=original;}
