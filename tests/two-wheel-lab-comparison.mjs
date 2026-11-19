import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
globalThis.window=globalThis;
const {createTwoWheelLabComparison}=
 await import('../src/two-wheel-lab-comparison.mjs');
const material=color=>new T.MeshStandardMaterial({color});
const box=(parent,w,h,d,color,x=0,y=0,z=0)=>{
 const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));
 m.position.set(x,y,z);parent.add(m);return m;
};
const makeVehicle=vehicleModels.createFactory(T,{
 box,material,shadows:false,batching:playerBatching
});
const lab=await createTwoWheelLabComparison(T,{makeVehicle,box,material});
assert.equal(lab.footHeight,3.2);
const targets=[lab.foot,lab.bicycle,lab.motorcycle];
for(const view of targets){
 assert(view.model.isGroup,'Cada panell és un Object3D independent');
 assert(Math.abs(view.getStandingHeight()-lab.footHeight)<.002,
  'El model a peu i els pilots comparteixen alçada V18 sense error de coma flotant');
}
assert.equal(lab.bicycle.vehicle.scale.x,1,'La bici té l’escala final dins la malla');
assert.equal(lab.motorcycle.vehicle.scale.x,1,'La moto té l’escala final dins la malla');
assert.equal(lab.bicycle.rider.object.scale.x,1);
assert.equal(lab.motorcycle.rider.object.scale.x,1);
for(const scenario of ['stopped','moving','return']){
 const speed=scenario==='moving'?7:0;
 for(let t=0;t<70;t++)lab.step(1/60,speed);
 const data=lab.metrics();
 assert(Math.abs(data.footThigh-data.bicycleThigh)<.001,
  'Cuixa del ciclista idèntica a la del jugador a peu en '+scenario);
 assert(Math.abs(data.footThigh-data.motorcycleThigh)<.001,
  'Cuixa del motorista idèntica a la del jugador a peu en '+scenario);
 assert(data.bicycleSeat>0&&data.motorcycleSeat>0);
 for(const view of [lab.bicycle,lab.motorcycle]){
  const j=view.joints;
  for(const side of ['L','R']){
   const get=id=>j[id].getWorldPosition(new T.Vector3());
   const a=get('hip'+side).distanceTo(get('knee'+side));
   const b=get('knee'+side).distanceTo(get('ankle'+side));
   assert(Math.abs(a-data.footThigh)<.001,'Cuixa exacta '+view.type);
   assert(b>.3&&b<1.2,'Tíbia plausible '+view.type);
  }
 }
 console.log('EDITOR_TWO_WHEEL_COMPARISON',scenario,JSON.stringify(data));
}
lab.setGuides(false);
assert(!lab.foot.guide.overlay.visible&&!lab.bicycle.guide.overlay.visible);
lab.setGuides(true);
assert(lab.foot.guide.overlay.visible&&lab.motorcycle.guide.overlay.visible);
console.log('PASS comparador del joc: mateixes unitats, tres rigs i guies dinàmiques, a peu/aturat/moviment');
