import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {deriveAircraftContactEnvelope,aircraftContactInWorld} from '../src/aircraft-contact-envelope.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
const factory=vehicleModels.createFactory(THREE,{
  box(){throw Error('Sense model de reserva')},
  material:c=>new THREE.MeshStandardMaterial({color:c}),
  shadows:false,batching:playerBatching
});
for(const type of ['heli','heli_combat']){
  const vehicle=factory(type),envelope=vehicle.userData.aircraftCollisionEnvelope;
  assert(envelope,'Envolupant absent: '+type);
  assert.equal(envelope.source,'native-aircraft-geometry');
  assert.deepEqual(vehicle.scale.toArray(),[1,1,1]);
  assert(envelope.rotorRadius>envelope.bodyRadius,'Rotor més estret que fuselatge: '+type);
  assert(envelope.bodyRadius>.5&&envelope.bodyRadius<20,'Radi corporal invàlid: '+type);
  assert(envelope.rotorRadius>3&&envelope.rotorRadius<35,'Radi rotor invàlid: '+type);
  assert(envelope.bodyTop>envelope.skidHeight,'Cota superior invàlida: '+type);
  assert(Math.abs(envelope.rotorHeight-vehicle.userData.rotorContactHeight)<1e-5);
  assert(Math.abs(envelope.skidHeight-vehicle.userData.skidContactHeight)<1e-5);
  const copy=aircraftContactInWorld(envelope,2);
  for(const k of ['rotorRadius','bodyRadius','bodyTop','rotorHeight','skidHeight'])
    assert(Math.abs(copy[k]-envelope[k]*2)<1e-8,'Conversió world de '+k);
  assert.throws(()=>aircraftContactInWorld(envelope,0));
  console.log(type,'rotor',envelope.rotorRadius.toFixed(3),'fusellatge',envelope.bodyRadius.toFixed(3));
}
