import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {createMi24Proposal,createMi24Runtime,MI24_MODELS,MI24_RUNTIME_ID} from '../src/mi24-proposals.mjs';
import {CATALOG} from '../src/vehicle-candidate-catalog.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
const config=CATALOG.find(c=>c.id==='heli_combat');
assert(config.validated&&!CATALOG.some(c=>c.id==='mi24'));
assert.deepEqual(config.options.map(c=>c.variant),Object.keys(MI24_MODELS).slice(1));
const count=o=>{let meshes=0,triangles=0;o.traverse(n=>{if(n.isMesh){meshes++;triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3}});return {meshes,triangles}};
let last=null;const base=createMi24Proposal(T,'mi24-d'),bounds=o=>new T.Box3().setFromObject(o,true),b=bounds(base);
for(const id of Object.keys(MI24_MODELS)){
 const model=createMi24Proposal(T,id),c=count(model),rotors=[],parts=[];
 model.traverse(n=>{if(n.isMesh)parts.push(...(n.userData.batchedParts||[n.name]));if(n.userData.kamovRotor)rotors.push(n)});
 assert.equal(rotors.length,2);
 assert.equal(parts.filter(n=>n==='Pala principal').length,5);
 assert.equal(parts.filter(n=>n==='Pala rotor de cua').length,3);
 assert.equal(parts.filter(n=>n.startsWith('Finestra càrrega')).length,8);
 assert(bounds(model).min.distanceTo(b.min)<.18&&bounds(model).max.distanceTo(b.max)<.18);
 if(last)assert(c.meshes<last.meshes&&c.triangles<last.triangles);
 last=c;assert.deepEqual(count(new T.ObjectLoader().parse(model.toJSON())),c);
 console.log('PASS',id,c.meshes,'malles',c.triangles,'triangles');
}
const runtime=createMi24Runtime(T);assert.equal(runtime.userData.mi24Model,MI24_RUNTIME_ID);
assert(runtime.userData.rotor&&runtime.userData.tailRotor);
assert.deepEqual(count(runtime),count(base));
assert.throws(()=>createMi24Proposal(T,'mi24-main'));

const make=vehicleModels.createFactory(T,{box(){throw Error('No legacy model')},material:c=>new T.MeshStandardMaterial({color:c}),shadows:false,batching:playerBatching});
const game=make('heli_combat'),second=make('heli_combat'),ka60=make('heli');
assert.equal(game.userData.mi24Model,MI24_RUNTIME_ID);
assert(!game.userData.apacheModel&&ka60.userData.ka60Model);
assert.deepEqual(game.scale.toArray(),[1,1,1],
 'El Mi-24 final ja té la mida mundial integrada a la geometria');
const cabinCrew=game.userData.cockpitCrew.reduce((a,p)=>{
 const c=count(p);return {meshes:a.meshes+c.meshes,triangles:a.triangles+c.triangles};
},{meshes:0,triangles:0});
const full=count(game.userData.distantVehicleLOD.full);
assert.deepEqual({meshes:full.meshes-cabinCrew.meshes,triangles:full.triangles-cabinCrew.triangles},
 count(base),'Només les dues figures de cabina afegeixen malles al Mi-24');
game.updateMatrixWorld(true);
assert(Math.abs(game.userData.rotorContactHeight-game.userData.rotor.getWorldPosition(new T.Vector3()).y)<1e-6);
game.userData.rotor.rotation.y=.7;
assert.equal(second.userData.rotor.rotation.y,0);
assert(vehicleModels.setDistantVehicleLOD(game,true));
assert(game.userData.distantVehicleLOD.proxy.visible&&!game.userData.distantVehicleLOD.full.visible);
assert.equal(count(game.userData.distantVehicleLOD.proxy).meshes,1);
console.log('PASS Mi-24 D al joc i LOD, rotors i escala; Ka-60 conservat');
