import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three-r186.module.mjs';
import {vehicleSpecs,vehicleCollisionScale,vehicleCollisionFootprint,vehicleCollisionRadius} from '../src/vehicle-specs.mjs';
import {prepareGazTigrRuntime} from '../src/gaz-tigr-runtime.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
const gazRoot=prepareGazTigrRuntime(THREE,{vehicleScale:1.3}).create();
const factory=vehicleModels.createFactory(THREE,{
  box(){throw new Error('El model GAZ ha desaparegut')},
  material:c=>new THREE.MeshStandardMaterial({color:c}),
  shadows:false,gaz:{create:()=>gazRoot.clone(true)},batching:playerBatching
});
const runtimeCar=factory('cotxe');
const gaz={t:'cotxe',o:runtimeCar},generic={t:'cotxe',o:{userData:{}}};
assert.equal(runtimeCar.userData.gazModel,'Tigr-M');
assert.equal(runtimeCar.userData.gazVisualScale,1.25,'L’objecte vehicle del joc rep l’escala visual');
const dims=v=>vehicleCollisionFootprint(v,vehicleSpecs.hitboxes.cotxe,vehicleSpecs.scales.cotxe);
const before=dims(generic),after=dims(gaz),factor=1.25;
assert.equal(gazRoot.userData.gazVisualScale,factor);
assert.equal(vehicleCollisionScale(gaz),factor);
assert.equal(vehicleCollisionScale(generic),1);
assert.equal(vehicleCollisionScale({t:'cotxe_civil',o:gazRoot}),1);
assert(Math.abs(after.w/before.w-factor)<1e-9);
assert(Math.abs(after.d/before.d-factor)<1e-9);
assert.equal(before.w,4.10*1.3);assert.equal(before.d,6.45*1.3);
assert.equal(after.w,4.10*1.3*1.25);assert.equal(after.d,6.45*1.3*1.25);
const radius=v=>vehicleCollisionRadius(v,vehicleSpecs.radii.cotxe,vehicleSpecs.scales.cotxe);
assert.equal(radius(gaz),3.8*1.3*1.25);
assert.equal(radius(generic),3.8*1.3);
assert.equal(vehicleCollisionScale({t:'cotxe',o:{userData:{gazModel:'Tigr-M',gazVisualScale:NaN}}}),1);
const game=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
assert(game.includes('vehicleCollisionFootprint(v,hb,sc)'), 'La caixa OBB ha d’emprar la nova escala');
assert(game.includes('vehicleCollisionRadius('),'El radi de cerca també ha de créixer');
assert(game.includes('const box=vehicleBox(v)'),'Contacte persona-vehicle amb caixa nova');
assert(game.includes('obbOverlap(test,vehicleBox(o))'),'Contacte vehicle-vehicle amb caixa nova');
assert(game.includes('fenceVehicleContact(w,footprint)'),'Filferrades amb nova caixa');
assert(game.includes('window.HUNTER_VEHICLE_COLLISION.vehicleCollisionScale(v)'),'Topall vertical de parets creix');
console.log('PASS GAZ Tigr-M hitbox '+after.w.toFixed(4)+' × '+after.d.toFixed(4)+' radi '+radius(gaz).toFixed(4)+'; resta de cotxes intactes');
