// Comprovació de la carrosseria C1A aprovada al joc: sostre, juntes i rodes.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {createCivilianCarModel} from '../src/civilian-car-model.mjs';
import {createCivilianRoundedCandidate} from '../src/civilian-car-rounded-candidate.mjs';

const car=createCivilianCarModel(THREE);
const get=name=>car.getObjectByName(name);
const roof=get('civil-c-roof-panel'),roofBox=new THREE.Box3().setFromObject(roof);
const width=roofBox.getSize(new THREE.Vector3()).x;
assert(Math.abs(width-2.28)<.001,'C1A del joc: sostre ha de fer 2.28m');
assert.equal(car.userData.roofInset,.21,'El cotxe del joc ha de dur sostre estret aprovat');
assert.equal(car.userData.civilianVariant,'C1A');
assert.equal(car.userData.wheels.length,4);
assert.equal(car.userData.steeringPivots.length,2);
assert.equal(car.userData.hasTransparentGlass,true);
assert.equal(car.userData.hasWheelArchCutouts,true);
assert(!car.userData.labOnly,'El model aprovat no pot quedar marcat com a candidat');
const roofUnderside=roofBox.min.y,roofEdge=roofBox.max.x;
function checkSeam(name){
 const pane=get(name);
 assert(pane?.material.transparent&&!pane.material.depthWrite,name+': no és un vidre transparent');
 const a=pane.geometry.attributes.position,vertices=[];
 for(let i=0;i<a.count;i++)vertices.push({x:a.getX(i),y:a.getY(i),z:a.getZ(i)});
 assert(vertices.every(v=>Object.values(v).every(Number.isFinite)),name+': vèrtex invàlid');
 const top=Math.max(...vertices.map(v=>v.y)),bottom=Math.min(...vertices.map(v=>v.y));
 assert(top>roofUnderside+.004,name+': forat sota el sostre');
 assert(bottom<=1.795,name+': forat al llindar');
 for(const p of vertices.filter(p=>Math.abs(p.y-top)<1e-5))
  assert(Math.abs(p.x)<roofEdge+.045,name+': buit lateral al sostre');
 return {top,bottom,vertices};
}
for(const name of ['civil-c-front-glass','civil-c-rear-glass']){
 const seam=checkSeam(name),a=seam.vertices.filter(v=>Math.abs(v.y-seam.top)<1e-5),
       b=seam.vertices.filter(v=>Math.abs(v.y-seam.bottom)<1e-5);
 const spread=vs=>Math.max(...vs.map(v=>v.x))-Math.min(...vs.map(v=>v.x));
 assert(spread(a)<spread(b)-.25,name+': ha de ser trapezoïdal');
}
for(const side of [-1,1])for(let i=0;i<3;i++){
 const name='civil-c-side-glass-'+side+'-'+i,{vertices}=checkSeam(name);
 const low=vertices.filter(v=>v.y<2).map(v=>v.x),
       high=vertices.filter(v=>v.y>2.5).map(v=>v.x);
 const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
 assert(low.length&&high.length&&side*(mean(low)-mean(high))>.15,name+': falta inclinació');
}
const saved=new THREE.ObjectLoader().parse(car.toJSON());
assert.equal(saved.userData.roofInset,.21);
console.log('PASS C1A definitiu: sostre de 2.28m, 8 vidres ajustats, direcció i rodes');

const rounded=createCivilianRoundedCandidate(THREE);
assert.equal(rounded.userData.labOnly,true);
assert.equal(rounded.userData.roundedNose,true);
const bounds=o=>new THREE.Box3().setFromObject(o);
for(const name of ['civil-c-roof-panel','civil-c-front-glass','civil-c-rear-glass','paraxocs-separat-darrere']){
 const a=bounds(car.getObjectByName(name)),b=bounds(rounded.getObjectByName(name));
 assert(a.min.distanceTo(b.min)<1e-6&&a.max.distanceTo(b.max)<1e-6,name+' modificat');
}
assert.equal(rounded.userData.wheels.length,4);
assert.equal(rounded.userData.steeringPivots.length,2);
for(let i=0;i<4;i++){
 const a=bounds(car.userData.wheels[i]),b=bounds(rounded.userData.wheels[i]);
 assert(a.min.distanceTo(b.min)<1e-6&&a.max.distanceTo(b.max)<1e-6,'Roda modificada');
}
const hood=rounded.getObjectByName('civil-rounded-hood'),hp=hood.geometry.attributes.position;
const vertices=[];
for(let i=0;i<hp.count;i++)vertices.push([hp.getX(i)+hood.position.x,hp.getY(i)+hood.position.y,hp.getZ(i)+hood.position.z]);
assert(vertices.every(v=>v.every(Number.isFinite)));
const tip=vertices.filter(v=>v[2]<-2.83&&Math.abs(v[0])<.15);
assert(tip.length&&Math.max(...tip.map(v=>v[1]))<1.75,'El capó ha de baixar al morro');
assert(vertices.some(v=>v[2]<-2.70&&Math.abs(v[0])>1.2),'Falten les cantonades suavitzades');
for(const name of ['civil-rounded-side--1','civil-rounded-side-1','civil-rounded-front-panel','civil-rounded-bumper']){
 const mesh=rounded.getObjectByName(name);
 assert(mesh?.geometry.attributes.position.count>24,name+' sense subdivisions');
 const pos=mesh.geometry.attributes.position;
 for(let i=0;i<pos.count;i++)assert([pos.getX(i),pos.getY(i),pos.getZ(i)].every(Number.isFinite));
}
const bb=bounds(rounded),ob=bounds(car);
assert(bb.getSize(new THREE.Vector3()).distanceTo(ob.getSize(new THREE.Vector3()))<.06,'L’escala global no ha de canviar');
console.log('PASS C1A candidat: frontal corbat, cabina, escala i rodes conservades');
const restored=new THREE.ObjectLoader().parse(rounded.toJSON());
assert.deepEqual(Array.from(restored.getObjectByName('civil-rounded-hood').geometry.attributes.position.array),Array.from(hp.array),'El JSON del visor ha de conservar la forma del capó');
