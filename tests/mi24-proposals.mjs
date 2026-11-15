import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three-r186.module.mjs';
import {createMi24Proposal,MI24_MODELS} from '../src/mi24-proposals.mjs';
import {stepKamovRotors} from '../src/kamov-reference-candidates.mjs';
import {CATALOG} from '../src/vehicle-candidate-catalog.mjs';
const config=CATALOG.find(c=>c.id==='mi24');
assert(config&&config.kind==='aire');
assert.equal(config.base.variant,'mi24-main');
assert.deepEqual([config.base,...config.options].map(c=>c.variant),Object.keys(MI24_MODELS));
assert.equal(config.options.length,4);
const shapes=new Set();let mainTriangles=0;
for(const id of Object.keys(MI24_MODELS)){
 const model=createMi24Proposal(T,id),meshes=[],rotors=[],parts=[];
 model.updateMatrixWorld(true);
 model.traverse(n=>{if(n.isMesh){meshes.push(n);parts.push(...(n.userData.batchedParts||[n.name]))}if(n.userData.kamovRotor)rotors.push(n)});
 const size=new T.Box3().setFromObject(model).getSize(new T.Vector3());
 assert(size.x>15&&size.x<18&&size.z>19&&size.z<22&&size.y>6&&size.y<6.7);
 assert.equal(model.userData.rotorDiameter,17.3);
 assert.equal(model.userData.tailRotorDiameter,3.908);
 assert.equal(model.userData.crewSeats,2);
 assert.equal(parts.filter(n=>n==='Seient Pilot').length,1);
 assert.equal(parts.filter(n=>n==='Seient Artiller').length,1);
 assert.equal(parts.filter(n=>n==='Seient transport').length,8);
 assert.equal(parts.filter(n=>n==='Pneumàtic').length,4);
 assert.equal(parts.filter(n=>n==='Pala principal').length,5);
 assert.equal(parts.filter(n=>n==='Pala rotor de cua').length,3);
 assert.equal(parts.filter(n=>n==='Fons presa aire').length,2);
 assert.equal(rotors.length,2);
 assert.deepEqual(rotors.map(n=>n.userData.kamovRotor.axis),['y','x']);
 assert(rotors[1].position.z>9&&rotors[1].position.x<0,'Rotor de cua lateral al final del botaló');
 const glass=meshes.filter(n=>n.material.transparent),windows=glass.filter(n=>n.name.startsWith('Finestra càrrega'));
 assert.equal(windows.length,8);
 assert.equal(glass.length,32);
 assert(glass.every(n=>n.material.opacity<.5&&!n.material.depthWrite));
 for(const y of [2.55,3.15]){
  const hit=new T.Raycaster(new T.Vector3(.18,y,-9),new T.Vector3(0,0,1)).intersectObjects(meshes)[0];
  assert(hit?.object.material.transparent,'Vidres reals en les dues cabines '+id);
 }
 for(const side of [-1,1]){
  const hit=new T.Raycaster(new T.Vector3(side*4,2.40,-.65),new T.Vector3(-side,0,0)).intersectObjects(meshes)[0];
  assert(windows.includes(hit?.object),'Finestra de càrrega sense xapa al darrere '+id);
 }
 let triangles=0;
 for(const m of meshes){const pos=m.geometry.attributes.position;assert([...pos.array].every(Number.isFinite));assert(m.geometry.userData.labOwned);triangles+=(m.geometry.index?.count??pos.count)/3}
 assert(triangles<8000&&meshes.length<110,'Pressupost de cada model');
 if(id==='mi24-main')mainTriangles=triangles;
 if(id==='mi24-d')assert(triangles<mainTriangles*.7,'D redueix almenys un 30% de triangles');
 shapes.add(JSON.stringify(model.getObjectByName('Fuselatge i cabines en tàndem').children.map(n=>Array.from(n.geometry.attributes.position.array))));
 const copy=new T.ObjectLoader().parse(model.toJSON());
 stepKamovRotors(model,.04);stepKamovRotors(copy,.04);
 assert.equal(copy.getObjectByName('Rotor principal de cinc pales').rotation.y,.36);
 assert.equal(copy.getObjectByName('Rotor de cua de tres pales').rotation.x,-.68);
 assert(new T.Box3().setFromObject(model).getSize(new T.Vector3()).distanceTo(new T.Box3().setFromObject(copy).getSize(new T.Vector3()))<1e-6);
 console.log('PASS',id,meshes.length,'malles',triangles,'triangles');
}
assert.equal(shapes.size,5,'Principal i quatre estudis geomètrics diferents');
const lab=readFileSync(new URL('../src/vehicles-externs-proves.mjs',import.meta.url),'utf8');
assert(lab.includes('config.base?createProceduralModel(config.base.variant)'),'El principal no crida la fàbrica del joc amb un tipus inexistent');
assert(lab.includes('MI24_MODELS,variant')&&lab.includes('createMi24Proposal(THREE,variant)'));
assert.throws(()=>createMi24Proposal(T,'unknown'));
