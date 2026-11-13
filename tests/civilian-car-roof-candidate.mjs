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
assert(Math.abs(width(roofAfter)-2.40)<.001,'Roof inset should be 15cm on each side');
assert.equal(production.userData.roofInset,undefined);
assert.equal(candidate.userData.roofInset,.15);
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
for(const side of [-1,1])for(let i=0;i<3;i++){
 const pane=get(candidate,'civil-c-side-glass-'+side+'-'+i);
 assert(pane?.material.transparent&&!pane.material.depthWrite,'Invalid inclined side glass');
 const p=pane.geometry.attributes.position,lower=[],upper=[];
 for(let k=0;k<p.count;k++)(p.getY(k)<2?lower:upper).push(p.getX(k));
 assert(lower.length&&upper.length);
 const avg=values=>values.reduce((a,b)=>a+b,0)/values.length;
 assert(side*(avg(lower)-avg(upper))>.10,'Side window must incline inwards');
}
console.log('PASS civilian C1A lab roof: narrower panel, inclined glazing, tapered front and rear, production preserved');
