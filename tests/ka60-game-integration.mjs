import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {createKamovCandidate} from '../src/kamov-reference-candidates.mjs';
import {createKa60Runtime,KA60_RUNTIME_ID,KA60_WORLD_SCALE} from '../src/ka60-runtime.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
const bounds=o=>new T.Box3().setFromObject(o,true);
const count=o=>{let n=0;o.traverse(m=>{if(m.isMesh)n+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3});return n};
const approved=createKamovCandidate(T,'ka60-a'),model=createKa60Runtime(T);
assert.equal(KA60_WORLD_SCALE,2);
assert.equal(model.userData.ka60Model,KA60_RUNTIME_ID);
assert.equal(model.userData.kamovDetail,1);
assert.equal(model.userData.cockpitSeatCount,2);
assert.equal(model.userData.roundWheelCount,3);
assert.equal(approved.userData.kamovNativeDimensions,true);
assert.deepEqual(approved.scale.toArray(),[1,1,1],
 'La variant A ja surt del generador amb la mida aprovada a la geometria');
assert.deepEqual(model.scale.toArray(),[1,1,1],
 'El Ka-60 de joc no requereix transformar l’arrel per corregir-ne la mida');
assert.equal(count(model),count(approved));
for(const vs of [1,vehicleSpecs.scales.heli,1.35,2.2]){
 const variant=createKa60Runtime(T,{vehicleScale:vs});
 assert.deepEqual(variant.scale.toArray(),[1,1,1],
  'Escala de model Ka-60 unitària per VS '+vs);
 assert(bounds(variant).getSize(new T.Vector3()).multiplyScalar(vs)
   .distanceTo(bounds(approved).getSize(new T.Vector3()))<1e-5,
  'El fuselatge conserva el volum aprovat amb VS '+vs);
 assert(Math.abs(variant.userData.rotor.position.y*vs-
  approved.children.find(o=>o.userData?.kamovRotor?.axis==='y').position.y)<1e-6,
  'L’alçada del rotor és nativa i compatible amb VS '+vs);
 assert(Math.abs(variant.userData.cockpitSeatLocalScale*vs-KA60_WORLD_SCALE)<1e-10,
  'El seient es converteix a metres finals, no amb l’escala de la malla');
}
assert(bounds(model).min.distanceTo(bounds(approved).min)<1e-5);
assert(bounds(model).max.distanceTo(bounds(approved).max)<1e-5);
const make=vehicleModels.createFactory(T,{box(){throw Error('No s’ha d’instanciar el model de reserva')},material:c=>new T.MeshStandardMaterial({color:c}),shadows:false,batching:playerBatching});
const game=make('heli');
assert.deepEqual(game.scale.toArray(),[1,1,1],
 'L’escala física heli és integrada a geometria i pivots abans de publicar el model');
assert.equal(game.userData.ka60Model,KA60_RUNTIME_ID);
const full=game.userData.distantVehicleLOD.full;
game.updateMatrixWorld(true);
const pilots=game.userData.cockpitCrew.reduce((n,p)=>n+count(p),0);
assert.equal(count(full)-pilots,count(approved),
 'El model Ka-60 no guanya triangles; els pilots anatòmics V18 són malles legítimes de cabina');
assert.equal(game.userData.cockpitCrew.length,2);
assert(bounds(full).getSize(new T.Vector3()).distanceTo(bounds(approved).getSize(new T.Vector3()))<1e-5,
 'Mides mundials definitives del Ka-60, sense corrector a la fàbrica');
assert.deepEqual(full.scale.toArray(),[1,1,1],
 'El fuselatge s’instal·la al joc amb transform unitari');
for(const [i,pilot]of game.userData.cockpitCrew.entries()){
 const [x,y,z]=[[-.49,1.34,-2.65],[.49,1.34,-2.65]][i];
 const position=pilot.getWorldPosition(new T.Vector3());
 assert(position.distanceTo(new T.Vector3(x*KA60_WORLD_SCALE,
   (y-.27)*KA60_WORLD_SCALE,z*KA60_WORLD_SCALE))<1e-5,
  'Pilots Ka-60 en ancoratges finals sense escala heretada');
 assert.deepEqual(pilot.scale.toArray(),[1,1,1],
  'Cada pilot té geometria nativa i cap corrector d’arrel');
}
assert(Math.abs(game.userData.skidContactHeight-bounds(full).min.y)<1e-5);
assert(Math.abs(game.userData.rotorContactHeight-game.userData.rotor.getWorldPosition(new T.Vector3()).y)<1e-5);
assert.equal(game.userData.rotor.userData.kamovRotor.axis,'y');
assert.equal(game.userData.tailRotor.userData.kamovRotor.axis,'x');
const other=make('heli'),before=other.userData.rotor.rotation.y;
game.userData.rotor.rotation.y+=.4;game.userData.tailRotor.rotation.x+=.7;
assert.equal(other.userData.rotor.rotation.y,before,'Pivots independents entre instàncies');
assert.notEqual(other.userData.tailRotor.rotation.x,game.userData.tailRotor.rotation.x);
assert(vehicleModels.setDistantVehicleLOD(game,true));
assert(game.userData.distantVehicleLOD.proxy.visible&&!full.visible);
console.log('PASS Ka-60 A al joc:',count(full),'triangles, escala x2, dos rotors, contacte de rodes i LOD');
