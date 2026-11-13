import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {createCivilianCarModel,createCivilianCarRoofCandidate} from '../src/civilian-car-model.mjs';

const production=createCivilianCarModel(THREE),candidate=createCivilianCarRoofCandidate(THREE);
const get=(root,name)=>root.getObjectByName(name);
const width=m=>new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).x;
const roofBefore=get(production,'civil-c-roof-panel');
const roofAfter=get(candidate,'civil-c-roof-panel');
assert(roofBefore&&roofAfter);
assert(Math.abs(width(roofBefore)-2.70)<.001,'Original C1A immutable');
assert(Math.abs(width(roofAfter)-2.28)<.001,'Roof inset should be 21cm on each side');
assert.equal(production.userData.roofInset,undefined);
assert.equal(candidate.userData.roofInset,.21);
assert.equal(candidate.userData.labOnly,true);
assert.equal(production.userData.wheels.length,4);
assert.equal(candidate.userData.wheels.length,4);
const topWidth=mesh=>{
 const p=mesh.geometry.attributes.position,ys=[];
 for(let i=0;i<p.count;i++)ys.push(p.getY(i));
 const top=Math.max(...ys),bottom=Math.min(...ys);
 function at(y){const xs=[];for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-y)<.00001)xs.push(p.getX(i));return Math.max(...xs)-Math.min(...xs)}
 return {top:at(top),bottom:at(bottom)};
};
for(const name of ['civil-c-front-glass','civil-c-rear-glass']){
 const pane=get(candidate,name);assert(pane?.material.transparent,name+' missing glass');
 const {top,bottom}=topWidth(pane);
 assert(top<bottom-.20,name+' must be cut into a trapezoid');
 const before=topWidth(get(production,name));
 assert(Math.abs(before.top-before.bottom)<.00001,'Production glass geometry changed');
}
// Comprova que cadascun dels vuit vidres penetri sota el sostre
// i que cap vora inferior quedi separada del travesser de cintura.
const roofBox=new THREE.Box3().setFromObject(roofAfter);
const roofEdge=roofBox.max.x,roofUnderside=roofBox.min.y;
function seamCheck(pane,name){
 assert(pane?.material.transparent&&!pane.material.depthWrite,name+' needs transparent glazing');
 const a=pane.geometry.attributes.position,pts=[];
 for(let k=0;k<a.count;k++)pts.push({x:a.getX(k),y:a.getY(k),z:a.getZ(k)});
 assert(pts.every(v=>Object.values(v).every(Number.isFinite)),name+' invalid vertices');
 const top=Math.max(...pts.map(v=>v.y)),bottom=Math.min(...pts.map(v=>v.y));
 assert(top>roofUnderside+.004,name+' has a gap below roof');
 assert(bottom<=1.75+.045,name+' has a gap above waist rail');
 for(const v of pts.filter(v=>Math.abs(v.y-top)<.00001))
  assert(Math.abs(v.x)<roofEdge+.045,name+' has a lateral gap from roof');
}
for(const name of ['civil-c-front-glass','civil-c-rear-glass'])seamCheck(get(candidate,name),name);
for(const side of [-1,1])for(let i=0;i<3;i++){
 const name='civil-c-side-glass-'+side+'-'+i,pane=get(candidate,name);
 seamCheck(pane,name);
 const a=pane.geometry.attributes.position,lower=[],upper=[];
 for(let k=0;k<a.count;k++)(a.getY(k)<2?lower:upper).push(a.getX(k));
 const avg=vs=>vs.reduce((x,y)=>x+y,0)/vs.length;
 assert(side*(avg(lower)-avg(upper))>.15,name+' must incline inwards');
}
console.log('PASS civilian C1A: roof narrowed 42cm, glazing meets roof, production preserved');
