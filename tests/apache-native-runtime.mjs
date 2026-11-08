// Exercita l'Apache Three.js íntegrament a Node 22, sense WebGL ni xarxa.
// Comprova que l'APG2 incrustat es descomprimeix i que les rodes són reals.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {prepareApacheAraonRuntime} from '../src/apache-araon-runtime.mjs';

const factory=await prepareApacheAraonRuntime(THREE);
assert.equal(factory.roundWheelCount,3);
assert(factory.dimensions.length>9&&factory.dimensions.length<14);
assert(factory.dimensions.width>6&&factory.dimensions.width<9);
assert(factory.rotorContactHeight>1.4);
const apache=factory.create();
assert.equal(apache.userData.roundWheelCount,3);
assert(apache.userData.rotor?.isObject3D);
assert(apache.userData.tailRotor?.isObject3D);
const count=(root)=>{let n=0;root.traverse(o=>{if(o.isMesh&&o.geometry)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3});return n};
const tris=count(apache);
assert.equal(tris,factory.triangles);
for(const id of ['left','right','nose']){
 const wheel=apache.getObjectByName('Apache_Round_Wheel_'+id);
 assert(wheel,'Roda circular '+id+' absent');
 assert(wheel.getObjectByName('Circular_Tyre_'+id)?.geometry?.type==='CylinderGeometry');
 assert(wheel.getObjectByName('Wheel_Hub_'+id)?.geometry?.type==='CylinderGeometry');
}
console.log('Apache Three.js verificat:',tris,'triangles, 3 rodes rodones, mides',
 JSON.stringify(factory.dimensions),'rotor',factory.rotorContactHeight.toFixed(3));
