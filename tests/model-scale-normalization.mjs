import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {bakeFixedModelScales} from '../src/model-scale-normalization.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';

// La conversió és conservativa, no una heurística de dimensions:
 // la forma dibuixada, les unions i la seva animació han de quedar igual.
const buildFixture=()=>{
 const root=new T.Group();root.scale.setScalar(1.2);
 const steering=new T.Group();steering.name='steering';steering.position.set(.5,.3,-1);
 root.add(steering);steering.scale.setScalar(1.24);
 const wheel=new T.Mesh(new T.CylinderGeometry(.4,.4,.08,12),new T.MeshBasicMaterial());
 wheel.rotation.z=Math.PI/2;wheel.name='wheel';steering.add(wheel);
 const body=new T.Mesh(new T.BoxGeometry(1,1,2),new T.MeshBasicMaterial());
 body.name='body';body.scale.set(1.4,.8,.95);body.position.set(0,.6,.2);root.add(body);
 const pin=new T.Group();pin.name='anchor';pin.position.set(-.25,.9,.2);root.add(pin);
 return {root,steering,wheel,body,pin};
};
const before=buildFixture();
const snapshots=()=>{
 before.root.updateWorldMatrix(true,true);
 return {
  pin:before.pin.getWorldPosition(new T.Vector3()),
  steer:before.steering.getWorldPosition(new T.Vector3()),
  body:new T.Box3().setFromObject(before.body),
  wheel:new T.Box3().setFromObject(before.wheel)
 };
};
const initial=snapshots();
const report=bakeFixedModelScales(before.root);
const actual=snapshots();
for(const name of ['pin','steer'])
 assert(initial[name].distanceTo(actual[name])<1e-8,
  'La normalització no canvia el punt '+name);
for(const name of ['body','wheel']){
 console.log('STATIC_SCALE_BOUNDS',name,JSON.stringify({
  before:{min:initial[name].min.toArray(),max:initial[name].max.toArray()},
  after:{min:actual[name].min.toArray(),max:actual[name].max.toArray()},
  minDelta:initial[name].min.distanceTo(actual[name].min),
  maxDelta:initial[name].max.distanceTo(actual[name].max)
 }));
 assert(initial[name].min.distanceTo(actual[name].min)<1e-8,
  'La normalització no mou el mínim de '+name);
 assert(initial[name].max.distanceTo(actual[name].max)<1e-8,
  'La normalització no mou el màxim de '+name);
}
assert.deepEqual(before.root.scale.toArray(),[1,1,1]);
assert.deepEqual(before.steering.scale.toArray(),[1,1,1]);
assert.deepEqual(before.body.scale.toArray(),[1,1,1]);
assert(report.bakedUniform>=2&&report.bakedMeshAxes>=1);
before.steering.rotation.y=.37;
const rotated=new T.Box3().setFromObject(before.wheel);
const reference=buildFixture();reference.steering.rotation.y=.37;
const expected=new T.Box3().setFromObject(reference.wheel);
assert(rotated.min.distanceTo(expected.min)<1e-8 &&
       rotated.max.distanceTo(expected.max)<1e-8,
 'La forquilla girada continua idèntica després de consolidar les escales');

const make=vehicleModels.createFactory(T,{
 box:(parent,w,h,d,color,x=0,y=0,z=0)=>{
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),
    new T.MeshStandardMaterial({color}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 },
 material:color=>new T.MeshStandardMaterial({color}),
 shadows:false,batching:playerBatching
});
const types=['bici','moto','cotxe','camio','hover','barca_rems','ferry','windsurf','tanc','tanqueta','heli','heli_combat'];
for(const type of types){
 const model=make(type);
 assert.equal(model.userData.modelScaleNormalized,true,'Model normalitzat: '+type);
 assert.deepEqual(model.scale.toArray(),[1,1,1],'Arrel sense factors residuals: '+type);
 assert(new T.Box3().setFromObject(model).getSize(new T.Vector3()).length()>0,
  'Model real conserva les dimensions: '+type);
}
for(const type of ['bici','moto']){
 const model=make(type),anchors=model.userData.twoWheelAnchors;
 assert(anchors?.seat&&anchors?.gripL&&anchors?.gripR&&anchors?.pedalL&&anchors?.pedalR,
  'Ancoratges anatòmics conservats: '+type);
 const all=new Set();model.traverse(n=>all.add(n));
 assert(Object.values(anchors).every(n=>all.has(n)),
  'Els ancoratges continuen dins el vehicle: '+type);
 for(const w of model.userData.wheels)
  assert(w.userData.radius>0&&Number.isFinite(w.userData.radius));
 const h=new T.Box3().setFromObject(model).getSize(new T.Vector3()).y;
 assert(h>.5,'Alçada física significativa: '+type);
}
console.log('PASS normalització: conservació de geometria, girs, ancoratges i '+types.length+' vehicles sense escala d’arrel');
