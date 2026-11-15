import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {FERRY_MODELS,createFerryProposal} from '../src/ferry-proposals.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {CATALOG} from '../src/vehicle-candidate-catalog.mjs';
const d=vehicleSpecs.decks.ferry,ids=Object.keys(FERRY_MODELS);
assert.equal(ids.length,4);
assert.deepEqual(CATALOG.find(c=>c.id==='ferry').options.map(c=>c.variant),ids);
const signatures=new Set();
for(const id of ids){
 const root=createFerryProposal(T,id);root.updateMatrixWorld(true);
 assert(root.userData.labFixedScale);
 let meshes=0,triangles=0;
 root.traverse(m=>{if(!m.isMesh)return;meshes++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;assert(m.geometry.userData.labOwned);assert(Array.from(m.geometry.attributes.position.array).every(Number.isFinite))});
 const bounds=new T.Box3().setFromObject(root,true),dims=bounds.getSize(new T.Vector3());
 assert(Math.abs(bounds.min.y+.425)<1e-5);
 assert(dims.x>31&&dims.x<33);
 const deck=root.getObjectByName('Plataforma de càrrega'),b=new T.Box3().setFromObject(deck);
 assert(Math.abs(b.max.y-d.y)<1e-6&&Math.abs(b.min.x+d.halfW)<1e-6&&Math.abs(b.max.z-d.halfL)<1e-6);
 for(const side of [-1,1]){
  const ramp=root.children.find(g=>g.userData.ferryRamp===side);
  assert(ramp);
  const tip=ramp.localToWorld(new T.Vector3(0,0,side*Math.hypot(d.ramp,d.y-d.rampY)));
  assert(Math.abs(tip.y-d.rampY)<1e-5&&Math.abs(tip.z-side*(d.halfL+d.ramp))<1e-5);
 }
 // A continuous central route through the ferry at truck-height.
 for(const x of [-5,0,5]){
  const ray=new T.Raycaster(new T.Vector3(x,d.y+4,-32),new T.Vector3(0,0,1),0,64);
  assert.equal(ray.intersectObject(root,true).length,0,id+' passadís obstruït');
 }
 const restored=new T.ObjectLoader().parse(root.toJSON());
 assert.equal(restored.userData.ferryProposal,id);
 assert.equal(restored.children.filter(g=>g.userData.ferryRamp).length,2);
 signatures.add(root.children.map(g=>g.children.map(m=>m.position.toArray().join(',')+':'+m.name).join('|')).join(';'));
 assert(triangles<4500);
 console.log(id,meshes+' malles',triangles+' triangles',dims.toArray().map(v=>v.toFixed(2)).join(' × '));
}
assert.equal(signatures.size,4);
