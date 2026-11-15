import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {FERRY_MODEL_ID,createFerryModel,installFerryModel} from '../src/ferry-proposals.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {CATALOG} from '../src/vehicle-candidate-catalog.mjs';
import {ferrySurfaceY,ferryRampAngle} from '../src/ferry-deck-core.mjs';
const d=vehicleSpecs.decks.ferry;
const config=CATALOG.find(c=>c.id==='ferry');
assert(config.validated&&config.options.length===0);
const host=new T.Group(),root=installFerryModel(T,host);
assert.equal(host.userData.ferryModel,FERRY_MODEL_ID);
assert(host.userData.ferryDeck&&root.userData.labFixedScale);
assert.equal(host.userData.ferryRamps.length,2);
let meshes=0,triangles=0;
root.traverse(m=>{if(!m.isMesh)return;meshes++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;assert(m.geometry.userData.labOwned);assert(Array.from(m.geometry.attributes.position.array).every(Number.isFinite))});
host.updateMatrixWorld(true);
const bounds=new T.Box3().setFromObject(root,true),dims=bounds.getSize(new T.Vector3());
assert(Math.abs(bounds.min.y+.425)<1e-5&&dims.x>31&&dims.x<33);
const deck=root.getObjectByName('Plataforma de càrrega'),b=new T.Box3().setFromObject(deck);
assert(Math.abs(b.max.y-d.y)<1e-6&&Math.abs(b.min.x+d.halfW)<1e-6&&Math.abs(b.max.z-d.halfL)<1e-6);
const f={t:'ferry',x:0,y:0,z:0,hd:0,v:0,o:host};
for(const {hinge,side} of host.userData.ferryRamps){
 assert(hinge.parent===root);
 for(const support of [0,.45,1.2]){
  const angle=ferryRampAngle(f,side,()=>support,()=>0);
  hinge.rotation.x=side*angle;host.updateMatrixWorld(true);
  const tip=hinge.localToWorld(new T.Vector3(0,0,side*d.ramp));
  assert(Math.abs(tip.y-support)<1e-5);
  assert(Math.abs(tip.y-ferrySurfaceY(f,tip.z))<1e-6);
  assert(Math.abs(tip.z-side*(d.halfL+d.ramp*Math.cos(angle)))<1e-6);
 }
 f.v=5;hinge.rotation.x=side*ferryRampAngle(f,side,()=>0,()=>0);
 assert(Math.abs(hinge.rotation.x+side*.88)<1e-9);f.v=0;
 hinge.rotation.x=side*Math.asin((d.y-d.rampY)/d.ramp);
}
host.updateMatrixWorld(true);
for(const x of [-5,0,5]){
 const ray=new T.Raycaster(new T.Vector3(x,d.y+4,-32),new T.Vector3(0,0,1),0,64);
 assert.equal(ray.intersectObject(root,true).length,0,'Passadís central lliure');
}
const restored=new T.ObjectLoader().parse(root.toJSON());
assert.equal(restored.userData.ferryModel,FERRY_MODEL_ID);
assert.equal(restored.children.filter(g=>g.userData.ferryRamp).length,2);
assert.equal(createFerryModel(T).name,root.name);
assert(meshes===117&&triangles===1820);
console.log('PASS ferri D',meshes+' malles',triangles+' triangles',dims.toArray().map(v=>v.toFixed(2)).join(' × '));
