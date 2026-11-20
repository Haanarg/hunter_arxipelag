import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {bakeFixedModelScales} from '../src/model-scale-normalization.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {createDistantVehicleFactory} from '../src/vehicle-distant-lod.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
import {createTruckModel} from '../src/truck-model.mjs';
import {createCivilianCarModel} from '../src/civilian-car-model.mjs';
import {createNativeStreetfighter25,finalizeNativeBicycle,TWO_WHEEL_APPROVED_SIZE} from '../src/two-wheel-native-models.mjs';
import {createStreetfighter25} from '../src/streetfighter-25-geometry.mjs';
import {createHovercraftConcept,hovercraftConcepts} from '../src/hovercraft-concepts.mjs';
import {createNativeHovercraftD,HOVERCRAFT_D_NATIVE_AXES} from '../src/hovercraft-native-model.mjs';

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
 assert(initial[name].min.distanceTo(actual[name].min)<2e-6,
  'La normalització no mou el mínim de '+name);
 assert(initial[name].max.distanceTo(actual[name].max)<2e-6,
  'La normalització no mou el màxim de '+name);
}
assert.deepEqual(before.root.scale.toArray(),[1,1,1]);
assert.deepEqual(before.steering.scale.toArray(),[1,1,1]);
assert.deepEqual(before.body.scale.toArray(),[1,1,1]);
assert(report.bakedUniform>=2&&report.bakedMeshAxes>=1);
before.steering.rotation.y=.37;
before.root.updateWorldMatrix(true,true);
const rotated=new T.Box3().setFromObject(before.wheel);
// Three.js Box3.setFromObject(child) no actualitza els avantpassats.
// Construïm les matrius mundials del model de referència abans de comparar.
const reference=buildFixture();reference.steering.rotation.y=.37;
reference.root.updateWorldMatrix(true,true);
const expected=new T.Box3().setFromObject(reference.wheel);
console.log('ROTATED_WHEEL_PARITY',JSON.stringify({
 before:{min:expected.min.toArray(),max:expected.max.toArray()},
 after:{min:rotated.min.toArray(),max:rotated.max.toArray()},
 deltaMin:rotated.min.distanceTo(expected.min),
 deltaMax:rotated.max.distanceTo(expected.max)
}));
assert(rotated.min.distanceTo(expected.min)<2e-6 &&
       rotated.max.distanceTo(expected.max)<2e-6,
 'La forquilla girada continua idèntica després de consolidar les escales');

const make=vehicleModels.createFactory(T,{
 box:(parent,w,h,d,color,x=0,y=0,z=0)=>{
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),
    new T.MeshStandardMaterial({color}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 },
 material:color=>new T.MeshStandardMaterial({color}),
 shadows:false,batching:playerBatching,
 truck:createTruckModel,civilianCar:createCivilianCarModel
});
const types=['bici','moto','cotxe','camio','hover','barca_rems','ferry','windsurf','tanc','tanqueta','heli','heli_combat'];
const baselineLod=createDistantVehicleFactory(T);
for(const type of types){
 const model=make(type);
 assert.equal(model.userData.modelScaleNormalized,true,'Model normalitzat: '+type);
 assert.deepEqual(model.scale.toArray(),[1,1,1],'Arrel sense factors residuals: '+type);
 assert(new T.Box3().setFromObject(model).getSize(new T.Vector3()).length()>0,
  'Model real conserva les dimensions: '+type);
 const lod=model.userData.distantVehicleLOD;
 if(lod){
  assert.equal(lod.nativeGeometryVariants,true,'Variants LOD natives: '+type);
  assert.equal(lod.proxy.geometry,lod.variants[0],
   'Proxy inicial i variant 0 amb la mateixa geometria normalitzada: '+type);
  assert.deepEqual(lod.proxy.scale.toArray(),[1,1,1]);
  const compare=baselineLod.attach(new T.Group(),type);
  for(let i=0;i<3;i++){
   lod.variants[i].computeBoundingBox();
   compare.variants[i].computeBoundingBox();
   const actual=lod.variants[i].boundingBox,
         expected=compare.variants[i].boundingBox.clone();
   expected.min.multiplyScalar(vehicleSpecs.scales[type]);
   expected.max.multiplyScalar(vehicleSpecs.scales[type]);
   assert(actual.min.distanceTo(expected.min)<.0001&&
    actual.max.distanceTo(expected.max)<.0001,
    'No es perd el VS de món en commutar al LOD '+i+': '+type);
  }
 }
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

// Comparam l'última maqueta de la moto (amb corrector exterior 1.24)
// amb la nova geometria creada ja a dimensions definitives.
const bikeMat=color=>new T.MeshStandardMaterial({color});
const oldMoto=createStreetfighter25(T,{color:0x228fef,material:bikeMat});
const oldMotoSteer=oldMoto.userData.steeringPivots[0];
const oldMark=(parent,name,x,y,z)=>{
 const n=new T.Object3D();n.name=name;n.position.set(x,y,z);parent.add(n);
 return n;
};
const oldMotoAnchors={
 seat:oldMark(oldMoto,'Moto · centre del seient',0,.88,.54),
 gripL:oldMark(oldMotoSteer,'Moto · puny esquerre',-.36,.015,-.075),
 gripR:oldMark(oldMotoSteer,'Moto · puny dret',.36,.015,-.075),
 pedalL:oldMark(oldMoto,'Moto · reposapeu esquerre',-.24,.42,.16),
 pedalR:oldMark(oldMoto,'Moto · reposapeu dret',.24,.42,.16)
};
const nativeMoto=createNativeStreetfighter25(T,{color:0x228fef,material:bikeMat});
assert.deepEqual(nativeMoto.scale.toArray(),[1,1,1]);
assert.equal(nativeMoto.userData.twoWheelGeometryNative,true);
assert.equal(nativeMoto.userData.twoWheelApprovedSize,TWO_WHEEL_APPROVED_SIZE.motorcycle);
for(const [i,w]of nativeMoto.userData.wheels.entries())
 assert(Math.abs(w.userData.radius-
   oldMoto.userData.wheels[i].userData.radius*1.24)<1e-8,
  'Radi natiu de roda de moto '+i);
for(const yaw of [0,.37,-.40]){
 oldMotoSteer.rotation.y=yaw;
 nativeMoto.userData.steeringPivots[0].rotation.y=yaw;
 oldMoto.userData.wheels[0].rotation.x=yaw*.44;
 nativeMoto.userData.wheels[0].rotation.x=yaw*.44;
 oldMoto.scale.setScalar(1.24*vehicleSpecs.scales.moto);
 nativeMoto.scale.setScalar(vehicleSpecs.scales.moto);
 const oldBox=new T.Box3().setFromObject(oldMoto,true),
       newBox=new T.Box3().setFromObject(nativeMoto,true);
 assert(oldBox.min.distanceTo(newBox.min)<2e-5&&
  oldBox.max.distanceTo(newBox.max)<2e-5,
  'Moto 1.24: volum igual amb la direcció i la roda girant');
 for(const key of Object.keys(oldMotoAnchors)){
  const a=oldMotoAnchors[key].getWorldPosition(new T.Vector3()),
        b=nativeMoto.userData.twoWheelAnchors[key].getWorldPosition(new T.Vector3());
  assert(a.distanceTo(b)<2e-6,'Punt '+key+' de moto sense cap pegat');
 }
 for(let i=0;i<2;i++){
  const a=oldMoto.userData.wheels[i].getWorldPosition(new T.Vector3()),
   b=nativeMoto.userData.wheels[i].getWorldPosition(new T.Vector3());
  assert(a.distanceTo(b)<2e-6,'Eix de la roda '+i+' conserva la posició');
 }
}
nativeMoto.scale.setScalar(1);

// Regressió separada del quadre procedural: inclou roda de direcció,
// canvis de fase del pedalier, rodes i els cinc ancoratges reals.
const bicycleFixture=()=>{
 const root=new T.Group();
 const body=new T.Mesh(new T.BoxGeometry(.35,1.45,2.35),new T.MeshBasicMaterial());
 body.position.set(0,1.1,.2);root.add(body);
 const steering=new T.Group();steering.position.set(0,1.68,-1.22);root.add(steering);
 const rear=new T.Group();rear.position.set(0,.62,1.22);root.add(rear);
 const front=new T.Group();front.position.set(0,.62-1.68,0);steering.add(front);
 for(const w of [rear,front]){
  w.userData.radius=.62;
  w.add(new T.Mesh(new T.TorusGeometry(.58,.04,6,12),new T.MeshBasicMaterial()));
 }
 const crank=new T.Group();crank.position.set(0,.62,0);root.add(crank);
 crank.add(new T.Mesh(new T.BoxGeometry(.32,.14,.65),new T.MeshBasicMaterial()));
 const a={
  seat:oldMark(root,'Bicicleta · superfície selló',0,1.905,.33),
  gripL:oldMark(steering,'Bicicleta · puny esquerre',-.42,.29,.44),
  gripR:oldMark(steering,'Bicicleta · puny dret',.42,.29,.44),
  pedalL:oldMark(crank,'Bicicleta · pedal esquerre',-.24,0,-.30),
  pedalR:oldMark(crank,'Bicicleta · pedal dret',.24,0,.30)
 };
 root.userData.wheels=[rear,front];root.userData.crank=crank;
 root.userData.twoWheelAnchors=a;root.userData.bicycleSaddleTop=1.905;
 return {root,steering,crank,anchors:a};
};
const oldBike=bicycleFixture(),nativeBike=bicycleFixture();
const legacyVisual=new T.Group();
for(const child of [...oldBike.root.children])legacyVisual.add(child);
legacyVisual.scale.setScalar(.74);oldBike.root.add(legacyVisual);
const nativeVisual=finalizeNativeBicycle(T,nativeBike.root);
assert.deepEqual(nativeVisual.scale.toArray(),[1,1,1]);
assert.equal(nativeVisual.userData.twoWheelGeometryNative,true);
assert(Math.abs(nativeBike.root.userData.bicycleSaddleTop-1.905*.74)<1e-10);
for(const [i,w]of nativeBike.root.userData.wheels.entries())
 assert(Math.abs(w.userData.radius-.62*.74)<1e-10,
  'Radi geomètric de bicicleta '+i);
for(const [steering,phase]of [[.0,0],[.3,.65],[-.45,1.6]]){
 oldBike.steering.rotation.y=steering;
 nativeBike.steering.rotation.y=steering;
 oldBike.crank.rotation.x=phase;
 nativeBike.crank.rotation.x=phase;
 oldBike.root.scale.setScalar(vehicleSpecs.scales.bici);
 nativeBike.root.scale.setScalar(vehicleSpecs.scales.bici);
 const a=new T.Box3().setFromObject(oldBike.root,true),
       b=new T.Box3().setFromObject(nativeBike.root,true);
 assert(a.min.distanceTo(b.min)<2e-6&&a.max.distanceTo(b.max)<2e-6,
  'Bicicleta nativa: contorn amb manillar i pedalier girats');
 for(const name of Object.keys(oldBike.anchors)){
  const p=oldBike.anchors[name].getWorldPosition(new T.Vector3()),
        q=nativeBike.anchors[name].getWorldPosition(new T.Vector3());
  assert(p.distanceTo(q)<2e-6,
   'Bicicleta: ancoratge '+name+' idèntic amb pedals en marxa');
 }
}
oldBike.root.scale.setScalar(1);nativeBike.root.scale.setScalar(1);
console.log('PASS bici i moto natives: ancoratges, rodes, direcció i pedalier sense factors tardans');

// Hovercraft D: la cabina i el casc continuen exactament igual de
// grans que abans, però el ventilador/ducte/gàbia NO són ovals.
// El rotor ha de continuar rodó durant TOTA la rotació.
const legacyHover=createHovercraftConcept(T,hovercraftConcepts[3]);
legacyHover.scale.set(
 HOVERCRAFT_D_NATIVE_AXES.x,1,HOVERCRAFT_D_NATIVE_AXES.z);
const roundHover=createNativeHovercraftD(T);
assert.deepEqual(roundHover.scale.toArray(),[1,1,1],
 'Hovercraft D sense escala global ni corrector no uniforme');
assert.equal(roundHover.userData.hovercraftNativeDimensions,true);
assert.equal(roundHover.userData.hovercraftRoundFan,true);
assert(roundHover.userData.hovercraftRoundMeshCount>=10);
assert.equal(legacyHover.userData.rotors.length,1);
const referenceMeshes=[],normalizedMeshes=[];
legacyHover.traverse(o=>{if(o.isMesh)referenceMeshes.push(o)});
roundHover.traverse(o=>{if(o.isMesh)normalizedMeshes.push(o)});
assert.equal(referenceMeshes.length,normalizedMeshes.length,
 'El bake natiu no substitueix la geometria artística del D');
legacyHover.updateWorldMatrix(true,true);
roundHover.updateWorldMatrix(true,true);
let comparedHull=0,comparedCircular=0;
for(let i=0;i<referenceMeshes.length;i++){
 const old=referenceMeshes[i],fresh=normalizedMeshes[i];
 assert.equal(old.userData.windowPane,fresh.userData.windowPane,
  'Vidres i panells es mantenen en el mateix ordre del D');
 const circular=Boolean(fresh.userData.hoverFanCircular);
 let insideRotor=false;
 for(let parent=fresh.parent;parent;parent=parent.parent)
  if(parent.userData.hoverFanRotor)insideRotor=true;
 if(circular||insideRotor){++comparedCircular;continue}
 const a=new T.Box3().setFromObject(old,true),
       b=new T.Box3().setFromObject(fresh,true);
 assert(a.min.distanceTo(b.min)<2e-5&&a.max.distanceTo(b.max)<2e-5,
  'Casc, seients, vidres i antenes mantenen el contorn aprovat: peça '+i);
 ++comparedHull;
}
assert(comparedHull>70&&comparedCircular>12,
 'Comparats el casc complet i totes les peces circulars del ventilador');
const fanDuct=normalizedMeshes.find(o=>o.userData.hoverFanCircular==='duct');
const originalDuct=referenceMeshes.find(o=>o.userData.hoverFanCircular==='duct');
assert(fanDuct&&originalDuct,'Ducte circular visible dins el model');
const nativeDuctSize=new T.Box3().setFromObject(fanDuct,true).getSize(new T.Vector3());
const oldDuctSize=new T.Box3().setFromObject(originalDuct,true).getSize(new T.Vector3());
assert(oldDuctSize.x>oldDuctSize.y*1.25,
 'La prova reprodueix el ventilador ovalat de la versió antiga');
assert(Math.abs(nativeDuctSize.x-nativeDuctSize.y)<1e-5,
 'Ducte nou amb diàmetre X=Y: ha de ser rodó');
const circleNames=['rim','cage-ring'];
for(const name of circleNames){
 const ring=normalizedMeshes.find(o=>o.userData.hoverFanCircular===name);
 assert(ring,'Anella protegida: '+name);
 const d=new T.Box3().setFromObject(ring,true).getSize(new T.Vector3());
 assert(Math.abs(d.x-d.y)<1e-5,'Anella '+name+' sense ovalització');
}
for(const [i,old]of legacyHover.userData.windowPanes.entries()){
 const current=roundHover.userData.windowPanes[i];
 assert(current,
  'Els vidres de l’hovercraft continuen accessibles per impactes: '+i);
 const a=new T.Box3().setFromObject(old,true),
       b=new T.Box3().setFromObject(current,true);
 assert(a.min.distanceTo(b.min)<2e-5&&a.max.distanceTo(b.max)<2e-5,
  'Vidres col·lisionables del hover en el mateix lloc: '+i);
}
for(const [i,old]of legacyHover.userData.seatStations.entries()){
 const e=old.clone().multiply(new T.Vector3(1.28,1,1.20)),
       n=roundHover.userData.seatStations[i];
 assert(n.distanceTo(e)<1e-10,'Seient '+i+' a la posició aprovada');
}
assert(roundHover.userData.steeringStation.distanceTo(
 legacyHover.userData.steeringStation.clone()
  .multiply(new T.Vector3(1.28,1,1.20)))<1e-10,
 'Timó de l’hovercraft a la posició anterior');
const spinRotor=roundHover.userData.rotors[0],
      legacyRotor=legacyHover.userData.rotors[0];
assert(spinRotor.getWorldPosition(new T.Vector3())
 .distanceTo(legacyRotor.getWorldPosition(new T.Vector3()))<1e-6,
 'Centre del ventilador no desplaçat');
const fanBlades=[];
spinRotor.traverse(o=>{if(o.isMesh&&o.userData.hoverFanBlade)fanBlades.push(o)});
assert.equal(fanBlades.length,6,'Sis pales originals del ventilador conservades');
const radii=()=>{
 roundHover.updateWorldMatrix(true,true);
 const center=spinRotor.getWorldPosition(new T.Vector3());
 const values=[];
 for(const blade of fanBlades){
  const pos=blade.geometry.getAttribute('position');
  for(let i=0;i<pos.count;i++){
   const world=blade.localToWorld(new T.Vector3().fromBufferAttribute(pos,i));
   values.push(Math.hypot(world.x-center.x,world.y-center.y));
  }
 }
 return values.sort((a,b)=>a-b);
};
roundHover.userData.animate(0);
const originalRadii=radii();
for(const time of [.04,.16,.55,1.3]){
 roundHover.userData.animate(time);
 const currentRadii=radii();
 assert.equal(currentRadii.length,originalRadii.length);
 for(let i=0;i<currentRadii.length;i++)
  assert(Math.abs(currentRadii[i]-originalRadii[i])<1e-6,
   'La rotació no deforma ni ovalitza les pales de l’hovercraft');
 assert(Math.abs(spinRotor.rotation.z-time*19)<1e-8,
  'Animació original del ventilador conservada');
}
const gameHover=make('hover');
assert.equal(gameHover.userData.hovercraftRoundFan,true);
assert.equal(gameHover.userData.hovercraftNativeDimensions,true);
assert.deepEqual(gameHover.scale.toArray(),[1,1,1]);
assert(!gameHover.userData.modelNonUniformScaleCount,
 'Cap escala no uniforme pendent al model que entra al joc');
assert.equal(gameHover.userData.hovercraftSeatPositions.length,2);
const worldScale=vehicleSpecs.scales.hover;
const gameRotor=gameHover.userData.fan;
const expectedRotor=spinRotor.getWorldPosition(new T.Vector3()).multiplyScalar(worldScale);
assert(gameRotor.getWorldPosition(new T.Vector3()).distanceTo(expectedRotor)<1e-5,
 'Rotor instal·lat al joc en les coordenades aprovades');
let gameDuctMesh=null;
gameHover.traverse(o=>{
 if(o.isMesh&&o.userData.hoverFanCircular==='duct')gameDuctMesh=o;
});
assert(gameDuctMesh,'Ducte conservat dins el model del joc');
const gameDuctSize=new T.Box3().setFromObject(gameDuctMesh,true)
 .getSize(new T.Vector3());
assert(Math.abs(gameDuctSize.x-gameDuctSize.y)<1e-5,
 'El ventilador del joc continua rodó després de la conversió mundial');
console.log('PASS hovercraft D natiu: casc, vidres i seients idèntics, ducte circular, anelles i ventilador rodó en girar');

console.log('PASS normalització: conservació de geometria, girs, ancoratges i '+types.length+' vehicles sense escala d’arrel');
