// Regressió: el T-90M de l'editor x1,5 es representa al joc el doble de gran (x3).
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {createReferenceVehicle} from '../src/vehicle-reference-candidates.mjs';
import {getT90Rig} from '../src/t90m-preview-animation.mjs';
import {installT90MModel,T90M_GAME_MODEL_VERSION} from '../src/t90m-runtime.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {turretSpecs,vehicleGunPose,stepManualTurret} from '../src/vehicle-turret-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
import {readFileSync} from 'node:fs';

const preview=createReferenceVehicle(THREE,'t90m-v1');
const gameRoot=new THREE.Group();
const gameModel=installT90MModel(THREE,gameRoot);
assert.equal(gameModel.userData.referenceCandidate,preview.userData.referenceCandidate);
assert.equal(gameModel.scale.x,1.5);
assert.equal(gameRoot.userData.tankVisual,gameModel);
assert.equal(gameRoot.userData.tankModel,T90M_GAME_MODEL_VERSION);
assert.equal(gameRoot.userData.tracks.length,2);
assert.equal(gameRoot.userData.wheels.length,12);
for(const track of gameRoot.userData.tracks){
 assert(track.links.length>40,'Sabates del costat dret/esquerre');
 assert(Math.abs(track.links[0].position.z-track.links[1].position.z)>.001,
   'Les sabates han de quedar repartides fins i tot amb el tanc aturat');
}
assert.equal(vehicleSpecs.scales.tanc,2,'Duplicar el tanc només al joc');
assert.equal(gameRoot.userData.trackVisualScale,3,'Ritme físic de les erugues sobre escala efectiva x3');
assert.equal(gameRoot.userData.trackHalfWidth,1.52);
assert(gameRoot.userData.wheels.every(w=>Math.abs(w.userData.radius-1.29)<.001),'Rodes del tanc amb radi doblat');
assert.equal(gameRoot.userData.turretPivot.name,'Torreta giratòria T-90M');
assert.equal(gameRoot.userData.turretPitch.name,'Canó principal 125 mm');
assert(gameRoot.userData.turretMuzzle.parent===gameRoot.userData.turretPitch);
assert.deepEqual(turretSpecs.tanc.pivot,[0,2.43,-.36]);
assert.deepEqual(turretSpecs.tanc.pitch,[0,.54,-1.83]);
assert.deepEqual(turretSpecs.tanc.muzzle,[0,0,-7.272]);

// Geometria de col·lisió: el casc (no el canó que sobresurt) governa la hitbox.
gameRoot.updateMatrixWorld(true);
const hull=gameModel.getObjectByName('Casc inferior T-90M');
const hullSize=new THREE.Box3().setFromObject(hull).getSize(new THREE.Vector3());
const [width,depth]=vehicleSpecs.hitboxes.tanc;
assert(hullSize.x<=width&&width-hullSize.x<1.3,'Hitbox amplada ajustada al casc');
assert(hullSize.z<=depth&&depth-hullSize.z<1.3,'Hitbox longitud ajustada al casc');

// El mateix fabricant s'utilitza per a jugador, enemics i instantànies COOP.
const factory=vehicleModels.createFactory(THREE,{
 box(){throw new Error("El T-90M no ha d'utilitzar caixes del tanc antic")},
 material:(color)=>new THREE.MeshStandardMaterial({color}),
 shadows:false,batching:playerBatching
});
const tank=factory('tanc');
assert.equal(tank.scale.x,2,'Escala addicional ×2 només a la fàbrica del joc');
assert.equal(tank.scale.y,2);
assert.equal(tank.scale.z,2);
assert.equal(tank.userData.tankModel,T90M_GAME_MODEL_VERSION);
assert.equal(tank.userData.wheels.length,12);
assert.equal(tank.userData.tracks.length,2);
assert(tank.userData.distantVehicleLOD?.full,'LOD de llarga distància conservat');
tank.updateMatrixWorld(true);
const scaledHull=new THREE.Box3().setFromObject(tank.getObjectByName('Casc inferior T-90M')).getSize(new THREE.Vector3());
assert(Math.abs(scaledHull.x-2*hullSize.x)<1e-4,'Casc real ha de duplicar amplada al joc');
assert(Math.abs(scaledHull.z-2*hullSize.z)<1e-4,'Casc real ha de duplicar longitud al joc');
assert(scaledHull.x<=width*vehicleSpecs.scales.tanc&&
       scaledHull.z<=depth*vehicleSpecs.scales.tanc,'Hitbox escalada ha de contenir el casc');
assert.equal(tank.userData.trackVisualScale,3);
assert(tank.userData.wheels.every(w=>Math.abs(w.userData.radius-1.29)<.001));
const gun=vehicleModels.turretShot(THREE,tank);
const authoritative=vehicleGunPose({t:'tanc',x:0,y:0,z:0,hd:0,turretYaw:0,turretPitch:0});
assert(gun.origin.distanceTo(new THREE.Vector3(
 authoritative.origin.x,authoritative.origin.y,authoritative.origin.z))<1e-5,
 'La boca de foc visual ha de coincidir amb la trajectòria COOP');
const state={turretYaw:0,turretPitch:0};
stepManualTurret(state,'tanc',1,1,.1);
assert(vehicleModels.manualTurret(tank,'tanc',1,1,.1));
assert(Math.abs(tank.userData.turretPivot.rotation.y-state.turretYaw)<1e-6);
assert(Math.abs(tank.userData.turretPitch.rotation.x-state.turretPitch)<1e-6);
const engine=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
assert(engine.includes('o.userData.trackVisualScale')&&engine.includes('o.userData.trackHalfWidth'));
console.log('PASS T-90M game: 2x bigger than editor (3x base), matching physical hitbox and gun, 12 wheels, tracks and COOP parity');
