import assert from 'node:assert/strict';
import {compoundLayouts} from '../src/compound-layouts.mjs';
import {compoundVariants} from '../src/compound-phase4-layouts.mjs';
import {refineCompoundLayout} from '../src/compound-layout-rules.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
const r=Math.hypot(...vehicleSpecs.hitboxes.tanqueta)*vehicleSpecs.scales.tanqueta/2+.3;
const list=[...compoundLayouts,...compoundVariants].filter(l=>(l.type||l.id)==='hq');
assert(list.length>=4);
for(const orig of list){
 const l=refineCompoundLayout(orig);let minFence=Infinity,minBuilding=Infinity,minTower=Infinity;
 const segDist=(p,a,b)=>{let dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz)};
 for(const route of l.vehiclePatrols.slice(0,2))for(let i=0;i<route.points.length-1;i++){
  const a=route.points[i],b=route.points[i+1];for(let k=0;k<=30;k++){
   const p=[a[0]+(b[0]-a[0])*k/30,a[1]+(b[1]-a[1])*k/30];
   for(const [c,d] of l.fence)minFence=Math.min(minFence,segDist(p,c,d));
   for(const q of l.buildings)minBuilding=Math.min(minBuilding,Math.hypot(Math.max(0,Math.abs(p[0]-q.x)-q.w/2),Math.max(0,Math.abs(p[1]-q.z)-q.d/2)));
   for(const t of l.towers)minTower=Math.min(minTower,Math.hypot(p[0]-t.x,p[1]-t.z)-4);
  }
 }
 assert(minFence>=r+4&&minBuilding>=r&&minTower>=r,'HQ '+l.id);
 console.log('HQ '+(l.variant??1)+': fence '+minFence+'m, buildings '+minBuilding+'m; BTR radius '+r.toFixed(2)+'m');
}
