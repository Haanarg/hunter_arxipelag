import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {createReferenceVehicle} from '../src/vehicle-reference-candidates.mjs';
import {createTruckModel,TRUCK_CANONICAL_SIZE,TRUCK_CABIN} from '../src/truck-model.mjs';
import {createHumanProposal} from '../src/human-proposals.mjs';
import {prepareGazTigrRuntime} from '../src/gaz-tigr-runtime.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {vehicleSpecs,GAZ_TIGR_COLLISION,vehicleCollisionFootprint} from '../src/vehicle-specs.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
import {stepT90Tracks,getT90Rig} from '../src/t90m-preview-animation.mjs';

const one=(o,label)=>assert(o.scale.toArray().every(x=>Math.abs(x-1)<1e-10),
 label+' ha de tenir escala 1 en sortir de la fàbrica');
const tank=createReferenceVehicle(T,'t90m-v1'),gaz=createReferenceVehicle(T,'tigr-v1');
one(tank,'T-90M de laboratori');one(gaz,'GAZ de laboratori');
const rig=getT90Rig(tank);
assert.equal(rig.tracks.length,2);
for(const track of rig.tracks){
 assert(track.r>.9&&track.straight>7.8,
  'Erugues del tanc amb dimensions canòniques');
 assert(track.links.every(l=>l.userData.trackOffset>=0&&
  l.userData.trackOffset<track.perimeter),'Sabates en unitats canòniques');
}
const shoe=rig.tracks[0].links[0],start=shoe.position.clone();
stepT90Tracks(tank,{throttle:1,steer:.3},.06);
assert(start.distanceTo(shoe.position)>.001,'Erugues animades després de consolidar el T-90M');
const gazRuntime=prepareGazTigrRuntime(T,{vehicleScale:vehicleSpecs.scales.cotxe});
one(gazRuntime.create(),'GAZ de joc');
assert.equal(gazRuntime.create().userData.wheels.length,4);
const truck=createTruckModel(T);one(truck,'Camió A4.3');
assert.equal(TRUCK_CANONICAL_SIZE,.82,'Mida aprovada del camió, només al generador');
assert.equal(truck.userData.wheels.length,6);
assert(truck.userData.wheels.every(w=>Math.abs(w.userData.radius-.656)<1e-8));
assert.deepEqual(truck.userData.truckCabin.driverVisual,TRUCK_CABIN.driverVisual);
const crew=createHumanProposal(T,'soldier','a',{visualOnly:true,nativeHeight:1.30});
one(crew,'Tripulant de cabina');
assert(Math.abs(new T.Box3().setFromObject(crew).getSize(new T.Vector3()).y-1.30)<.01,
 'Alçada del pilot integrada a la geometria, sense scale del rig');
const gazFactory=prepareGazTigrRuntime(T,{vehicleScale:vehicleSpecs.scales.cotxe});
const create=vehicleModels.createFactory(T,{
 box:(pa,w,h,d,c,x=0,y=0,z=0)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color:c}));m.position.set(x,y,z);pa.add(m);return m},
 material:c=>new T.MeshStandardMaterial({color:c}),
 shadows:false,batching:playerBatching,gaz:gazFactory,truck:createTruckModel
});
const bigGaz=create('cotxe'),bigTruck=create('camio'),gameTank=create('tanc'),heli=create('heli');
for(const [id,m]of [['GAZ',bigGaz],['A4.3',bigTruck],['T-90M',gameTank],['Ka60',heli]])one(m,id);
assert.deepEqual(bigGaz.userData.truckCabin,undefined);
assert.deepEqual(bigTruck.userData.truckCabin,TRUCK_CABIN);
assert(bigTruck.userData.cockpitCrew.every(o=>o.scale.toArray().every(x=>x===1)));
assert(heli.userData.cockpitCrew.every(o=>o.scale.toArray().every(x=>x===1)));
assert.equal(gameTank.userData.trackVisualScale,vehicleSpecs.scales.tanc);
const footprint=vehicleCollisionFootprint({t:'cotxe',o:bigGaz},
 vehicleSpecs.hitboxes.cotxe,vehicleSpecs.scales.cotxe);
assert(Math.abs(footprint.w-GAZ_TIGR_COLLISION.hitbox[0]*vehicleSpecs.scales.cotxe)<1e-8);
assert(Math.abs(footprint.d-GAZ_TIGR_COLLISION.hitbox[1]*vehicleSpecs.scales.cotxe)<1e-8);
console.log('PASS native model scales: T-90M, GAZ, A4.3, cabine figures, 4 factories and collision');
