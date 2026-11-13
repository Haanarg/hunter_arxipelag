import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {createKamovCandidate,stepKamovRotors} from '../src/kamov-reference-candidates.mjs';
for(const type of ['ka60','ka52']){
 const root=createKamovCandidate(T,type),meshes=[],rotors=[];
 root.traverse(o=>{if(o.userData.kamovRotor)rotors.push(o);if(o.isMesh)meshes.push(o)});
 assert.equal(rotors.length,2);
 let triangles=0;
 for(const m of meshes){
  const p=m.geometry.attributes.position;assert(p.count>=3);
  for(const v of p.array)assert(Number.isFinite(v));
  triangles+=(m.geometry.index?.count??p.count)/3;
 }
 assert(triangles<18000,'Pressupost low-poly');
 const size=new T.Box3().setFromObject(root).getSize(new T.Vector3());
 assert(size.z>13&&size.z<17);assert(size.y>3.8&&size.y<5.1);
 const seats=[];root.traverse(o=>{if(o.name==='Coixí seient')seats.push(o)});
 assert.equal(seats.length,type==='ka60'?8:2);
 assert.equal(seats.filter(o=>o.position.z< -2).length,2,'Pilots de costat');
 assert.equal(meshes.filter(o=>o.name==='Pneumàtic').length,type==='ka60'?3:4);
 if(type==='ka60'){
  assert.equal(rotors[0].userData.kamovRotor.axis,'x');
  assert.equal(rotors[1].userData.kamovRotor.axis,'y');
  assert.equal(meshes.filter(o=>o.name==='Pala fenestron').length,11);
  assert.equal(meshes.filter(o=>o.name==='Superfície pala').length,4);
  const duct=root.getObjectByName('Conducte fenestron obert');root.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3(-1,1.94+.50,7.63),new T.Vector3(1,0,0));
  assert.equal(ray.intersectObject(duct).length,0,'El conducte no pot estar tapat');
 }else{
  assert(rotors.every(r=>r.userData.kamovRotor.axis==='y'));
  assert.equal(rotors[0].userData.kamovRotor.speed,-rotors[1].userData.kamovRotor.speed);
  assert.equal(meshes.filter(o=>o.name==='Superfície pala').length,6);
  assert(root.getObjectByName('Canó lateral dret'));
  assert(!root.getObjectByName('Rotor fenestron'));
 }
 const restored=new T.ObjectLoader().parse(root.toJSON());
 for(const m of meshes){const copy=restored.getObjectByProperty('uuid',m.uuid);assert.deepEqual(Array.from(copy.geometry.attributes.position.array),Array.from(m.geometry.attributes.position.array),m.name+' JSON');}
 const before=rotors.map(o=>o.rotation[o.userData.kamovRotor.axis]);stepKamovRotors(root,.04);
 rotors.forEach((o,i)=>assert.equal(o.rotation[o.userData.kamovRotor.axis],before[i]+o.userData.kamovRotor.speed*.04));
 stepKamovRotors(restored,.04);assert(new T.Box3().setFromObject(restored).getSize(new T.Vector3()).distanceTo(new T.Box3().setFromObject(root).getSize(new T.Vector3()))<1e-5);
 console.log(type,Math.round(triangles)+' triangles',meshes.length+' peces',size.toArray().map(x=>x.toFixed(2)).join(' × '));
}
assert.throws(()=>createKamovCandidate(T,'unknown'));
console.log('PASS Kamov: proporcions, cabines, rotors, fenestron obert i exportació editable');
