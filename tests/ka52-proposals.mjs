import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {createKa52Proposal,KA52_PROPOSALS} from '../src/ka52-proposals.mjs';
import {stepKamovRotors} from '../src/kamov-reference-candidates.mjs';
import {CATALOG} from '../src/vehicle-candidate-catalog.mjs';
const ids=Object.keys(KA52_PROPOSALS);
assert.deepEqual(CATALOG.find(x=>x.id==='heli_combat').options.map(x=>x.variant),ids);
assert.equal(ids.length,4);
const shapes=new Set();let referenceTriangles=0;
for(const id of ids){
 const model=createKa52Proposal(T,id),meshes=[],rotors=[],parts=[];
 model.updateMatrixWorld(true);
 model.traverse(n=>{if(n.userData.kamovRotor)rotors.push(n);if(n.isMesh){meshes.push(n);parts.push(...(n.userData.batchedParts||[n.name]))}});
 const size=new T.Box3().setFromObject(model).getSize(new T.Vector3());
 assert(size.y>4.8&&size.y<5.1&&size.z>14&&size.z<16&&size.x>13&&size.x<15);
 assert.equal(model.userData.rotorDiameter,14.5);
 assert.equal(model.userData.crewSeats,2);
 assert.equal(parts.filter(n=>n==='Seient pilot').length,2);
 assert.equal(parts.filter(n=>n==='Pneumàtic').length,4);
 assert.equal(parts.filter(n=>n==='Pala principal').length,6);
 assert.equal(parts.filter(n=>n==='Fons presa aire').length,2);
 assert(!parts.some(n=>/fenestron|rotor de cua/i.test(n)));
 assert.equal(rotors.length,2);
 assert(rotors.every(n=>n.userData.kamovRotor.axis==='y'));
 assert.equal(rotors[0].userData.kamovRotor.speed,-rotors[1].userData.kamovRotor.speed);
 assert(rotors[1].position.y-rotors[0].position.y>.8);
 const glasses=meshes.filter(m=>m.material.transparent);
 assert.equal(glasses.length,10);
 assert(glasses.every(m=>m.material.opacity<.5&&!m.material.depthWrite));
 for(const side of [-1,1]){
  const hit=new T.Raycaster(new T.Vector3(side*.35,2.5,-8),new T.Vector3(0,0,1)).intersectObjects(meshes)[0];
  assert(hit?.object.material.transparent,'Parabrisa sense paret opaca al darrere '+id);
 }
 let triangles=0;
 for(const m of meshes){const a=m.geometry.attributes.position;assert([...a.array].every(Number.isFinite));triangles+=(m.geometry.index?.count??a.count)/3}
 assert(triangles<6500&&meshes.length<80,'Pressupost per comparar quatre models');
 if(id==='ka52-a')referenceTriangles=triangles;
 if(id==='ka52-d')assert(triangles<referenceTriangles*.7,'D alleugereix la geometria');
 const nose=model.getObjectByName('Radom arrodonit');
 shapes.add(JSON.stringify(nose.children.map(n=>Array.from(n.geometry.attributes.position.array))));
 // The radar cover and cabin share their join, with no internal caps.
 const vertices=g=>new Set(g.children.filter(n=>n.isMesh).flatMap(n=>{
  const p=n.geometry.attributes.position;return Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(4)).join(','));
 }));
 const a=vertices(nose),b=vertices(model.getObjectByName('Fuselatge i cabina'));
 assert([...a].filter(v=>b.has(v)).length>=12,'Unió compartida radom/cabina');
 const restored=new T.ObjectLoader().parse(model.toJSON());
 stepKamovRotors(model,.04);stepKamovRotors(restored,.04);
 assert(new T.Box3().setFromObject(model).getSize(new T.Vector3()).distanceTo(new T.Box3().setFromObject(restored).getSize(new T.Vector3()))<1e-6);
 assert.equal(restored.getObjectByName('Rotor coaxial inferior').rotation.y,.36);
 console.log('PASS',id,meshes.length,'malles',triangles,'triangles');
}
assert.equal(shapes.size,4,'Quatre propostes geomètriques diferents');
assert.throws(()=>createKa52Proposal(T,'unknown'));
