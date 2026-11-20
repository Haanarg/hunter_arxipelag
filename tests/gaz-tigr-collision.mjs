import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three-r186.module.mjs';
import {vehicleSpecs,GAZ_TIGR_COLLISION,isGazTigr,vehicleCollisionTop,vehicleCollisionPlayerBand,vehicleCollisionFootprint,vehicleCollisionRadius} from '../src/vehicle-specs.mjs';
import {prepareGazTigrRuntime} from '../src/gaz-tigr-runtime.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
import {createDistantVehicleFactory,setDistantVehicleLOD} from '../src/vehicle-distant-lod.mjs';
const gazRoot=prepareGazTigrRuntime(THREE,{vehicleScale:1.3}).create();
const factory=vehicleModels.createFactory(THREE,{
  box(){throw new Error('El model GAZ ha desaparegut')},
  material:c=>new THREE.MeshStandardMaterial({color:c}),
  shadows:false,gaz:{create:()=>prepareGazTigrRuntime(THREE,{vehicleScale:1.3}).create()},batching:playerBatching
});
const runtimeCar=factory('cotxe');
const gaz={t:'cotxe',o:runtimeCar},generic={t:'cotxe',o:{userData:{}}};
const relayGaz={t:'cotxe',gazModel:'Tigr-M'};
assert.equal(runtimeCar.userData.gazModel,'Tigr-M');
const gazLOD=runtimeCar.userData.distantVehicleLOD;
assert(gazLOD?.gazNativeDimensions&&gazLOD.nativeGeometryVariants,
 'Les tres variants LOD del GAZ són natives, no models reescalats');
assert.deepEqual(gazLOD.proxy.scale.toArray(),[1,1,1],
 'El model llunyà del GAZ no usa escala posterior');
const raw=new THREE.Group(),rawLOD=createDistantVehicleFactory(THREE).attach(raw,'cotxe');
const intrinsicRatio=GAZ_TIGR_COLLISION.hitbox[0]/vehicleSpecs.hitboxes.cotxe[0];
const expectedFactor=vehicleSpecs.scales.cotxe*intrinsicRatio;
const boundsGeometry=g=>{
 g.computeBoundingBox();
 return g.boundingBox.clone();
};
for(let i=0;i<3;i++){
 const actual=boundsGeometry(gazLOD.variants[i]);
 const baseline=boundsGeometry(rawLOD.variants[i]);
 const expected=baseline.clone();
 expected.min.multiplyScalar(expectedFactor);
 expected.max.multiplyScalar(expectedFactor);
 assert(actual.min.distanceTo(expected.min)<1e-5&&
   actual.max.distanceTo(expected.max)<1e-5,
  'Contorn natiu del GAZ en LOD '+i+' (0/1/2 ocupants)');
}
assert.equal(gazLOD.proxy.geometry,gazLOD.variants[0],
 'El proxy inicial conserva la geometria normalitzada');
assert(setDistantVehicleLOD(runtimeCar,true));
assert.equal(gazLOD.proxy.geometry,gazLOD.variants[0]);
assert(setDistantVehicleLOD(runtimeCar,false));
for(let i=1;i<3;i++){
 runtimeCar.userData.enemyCarCrew={
  driver:{visible:i>=1},gunner:{visible:i>=2}
 };
 assert(setDistantVehicleLOD(runtimeCar,true));
 assert.equal(gazLOD.proxy.geometry,gazLOD.variants[i],
  'La variant GAZ amb '+i+' ocupants no canvia l’escala del vehicle');
 assert.deepEqual(gazLOD.proxy.scale.toArray(),[1,1,1]);
 assert(setDistantVehicleLOD(runtimeCar,false));
}
delete runtimeCar.userData.enemyCarCrew;
assert.equal(gazRoot.scale.x,1,'GAZ ja dimensionat dins la geometria');
assert.equal('gazVisualScale' in runtimeCar.userData,false,'Cap pegat visual al GAZ');
const dims=v=>vehicleCollisionFootprint(v,vehicleSpecs.hitboxes.cotxe,vehicleSpecs.scales.cotxe);
const before=dims(generic),after=dims(gaz);
assert.equal(isGazTigr(gaz),true);
assert.equal(isGazTigr(relayGaz),true,'GAZ COOP sense malla Object3D');
assert.equal(isGazTigr(generic),false);
assert.equal(isGazTigr({t:'cotxe_civil',o:gazRoot}),false);
assert.equal(before.w,4.10*1.3);assert.equal(before.d,6.45*1.3);
assert.equal(after.w,GAZ_TIGR_COLLISION.hitbox[0]*1.3);
assert.equal(after.d,GAZ_TIGR_COLLISION.hitbox[1]*1.3);
const radius=v=>vehicleCollisionRadius(v,vehicleSpecs.radii.cotxe,vehicleSpecs.scales.cotxe);
assert.equal(radius(gaz),GAZ_TIGR_COLLISION.radius*1.3);
assert.equal(radius(generic),3.8*1.3);
assert.equal(vehicleCollisionTop(gaz,4.2,1.3),5.25*1.3);
assert.equal(vehicleCollisionPlayerBand(gaz,1.3),2.75*1.3);
assert.equal(vehicleCollisionTop(generic,4.2,1.3),4.2*1.3);
const {contactBox}=await import('../src/coop-vehicle-contacts-core.mjs');
const coopBox=contactBox({x:0,z:0,hd:0,...relayGaz});
assert.equal(coopBox.w,after.w);assert.equal(coopBox.d,after.d);
const game=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
assert(game.includes('vehicleCollisionFootprint(v,hb,sc)'), 'La caixa OBB ha d’emprar la nova escala');
assert(game.includes('vehicleCollisionRadius('),'El radi de cerca també ha de créixer');
assert(game.includes('const box=vehicleBox(v)'),'Contacte persona-vehicle amb caixa nova');
assert(game.includes('obbOverlap(test,vehicleBox(o))'),'Contacte vehicle-vehicle amb caixa nova');
assert(game.includes('fenceVehicleContact(w,footprint)'),'Filferrades amb nova caixa');
assert(game.includes('window.HUNTER_VEHICLE_COLLISION.vehicleCollisionTop(v,'),'Alçada física canònica de les parets');
console.log('PASS GAZ Tigr-M hitbox '+after.w.toFixed(4)+' × '+after.d.toFixed(4)+' radi '+radius(gaz).toFixed(4)+'; resta de cotxes intactes');
