// Integració del GAZ Tigr-M natiu en una fàbrica compartida SOLO / COOP.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {prepareGazTigrRuntime} from '../src/gaz-tigr-runtime.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
const gaz=prepareGazTigrRuntime(THREE);
const a=gaz.create(),b=gaz.create();
assert.equal(a.userData.militaryCarModel,'GAZ Tigr-M');
assert.equal(a.userData.wheels.length,4);
assert.equal(a.userData.steeringPivots.length,2);
assert.equal(b.userData.wheels.length,4);
assert.notEqual(a.userData.wheels[0],b.userData.wheels[0]);
assert(gaz.staticBatches>0,'Les malles opaques comunes han de tenir batches');
assert(a.getObjectByName('Carrosseria GAZ Tigr-M'));
const panes=[];a.traverse(o=>{if(o.isMesh&&o.material?.transparent)panes.push(o)});
assert.equal(panes.length,10,'Cal conservar tots els vidres transparents');
for(const wheel of a.userData.wheels){
 assert.equal(wheel.userData.radius,.55*vehicleSpecs.scales.cotxe);
 wheel.rotation.x=.25;
 assert.equal(wheel.rotation.x,.25);
}
const material=color=>new THREE.MeshStandardMaterial({color});
const box=(g,w,h,d,color,x=0,y=0,z=0)=>{
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);g.add(m);return m;
};
const create=vehicleModels.createFactory(THREE,{
 box,material,shadows:true,gazTigr:gaz,batching:playerBatching
});
const car=create('cotxe');
assert.equal(car.userData.militaryCarModel,'GAZ Tigr-M');
assert.equal(car.userData.wheels.length,4);
assert.equal(car.userData.steeringPivots.length,2);
assert(car.userData.wheels.every(w=>w.userData.radius===.55*vehicleSpecs.scales.cotxe));
const size=new THREE.Box3().setFromObject(car).getSize(new THREE.Vector3());
assert(size.x>3&&size.x<4,'Amplada del GAZ al joc');
assert(size.z>7&&size.z<8,'Llargada del GAZ al joc');
vehicleModels.animateSteering(car,'cotxe',1,.5);
assert(car.userData.steeringPivots.every(p=>p.rotation.y>.4));
assert.equal(car.userData.humveeModel,undefined);
// Una fàbrica utilitzada pels tests, sense el bootstrap, també ha de trobar el GAZ.
const withoutBootstrap=vehicleModels.createFactory(THREE,{box,material,shadows:false,batching:playerBatching});
assert.equal(withoutBootstrap('cotxe').userData.militaryCarModel,'GAZ Tigr-M');
console.log('PASS GAZ Tigr-M: 4 rodes, 2 pivots, vidres, batches, escala i fallback natiu');
