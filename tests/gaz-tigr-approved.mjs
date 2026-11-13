import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {prepareGazTigrRuntime} from '../src/gaz-tigr-runtime.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';

const gaz=prepareGazTigrRuntime(THREE,{vehicleScale:1.3});
const a=gaz.create(),b=gaz.create();
assert.equal(a.userData.gazModel,'Tigr-M');
assert.equal(a.userData.wheels.length,4);
assert.equal(a.userData.steeringPivots.length,2);
assert.notEqual(a.userData.wheels[0],b.userData.wheels[0]);
assert(a.userData.wheels.every(w=>w.userData.radius>.65));
const create=vehicleModels.createFactory(THREE,{
 box(){throw new Error('Fallback del cotxe utilitzat incorrectament')},
 material(){throw new Error('Material de fallback')},
 shadows:false,gaz
});
const car=create('cotxe');
assert.equal(car.userData.gazModel,'Tigr-M');
assert.equal(car.userData.wheels.length,4);
assert.equal(car.userData.steeringPivots.length,2);
assert(Math.abs(car.scale.x-1.3)<1e-8);
vehicleModels.animateSteering(car,'cotxe',1,.5);
assert(car.userData.steeringPivots.every(p=>p.rotation.y>0));
console.log('GAZ Tigr-M: geometria, rodes, direcció i fàbrica OK');
