import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {createMi24Proposal,createMi24Runtime,MI24_MODELS,MI24_RUNTIME_ID} from '../src/mi24-proposals.mjs';
import {CATALOG} from '../src/vehicle-candidate-catalog.mjs';
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
