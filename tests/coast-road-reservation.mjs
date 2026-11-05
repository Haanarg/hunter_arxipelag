import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSiteRegistry,roadCorridorClear} from '../src/compound-planning.mjs';
const layouts=[{type:'heliport',size:[125,110]},{type:'civil-dock',size:[80,70]}],
 layoutRadius=l=>Math.hypot(...l.size)/2+20;
let corridor=null;
const registry=createSiteRegistry({layouts,layoutRadius,
 initialCenters:[{x:-3700,z:-2700,r:180,type:'base'},{x:3000,z:2900,r:180,type:'hq'}],
 corridorClear:(type,q,r)=>roadCorridorClear(corridor,q,r+10)});
const heliport={x:-3337.7291525190253,z:-2615.882798847819};
assert.equal(registry.isClear('heliport',heliport,120),true,
 'original site test remains unchanged before a road is built');
corridor=[{x:-3257.061147377534,z:-2637.71203386566},
 {x:-3269.061147377534,z:-2637.71203386566},
 {x:-3281.061147377534,z:-2637.71203386566}];
assert.equal(registry.isClear('heliport',heliport,120),false,
 '148/2 helicopter compound may no longer block the base road');
assert.equal(registry.isClear('heliport',{x:-2850,z:-2300},120),true);
let checks=0;
for(const scale of [1,2])for(const radius of [0,3,6,40,80,145])
 for(let k=0;k<240;k++){
  const path=[{x:-200*scale,z:0},{x:0,z:0},{x:0,z:110*scale}],
   q={x:-220*scale+k*2*scale,z:-(k%41-18)*3*scale};
  const distance=(a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,
    t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.z-a.z)*dz)/(dx*dx+dz*dz||1)));
   return Math.hypot(q.x-a.x-dx*t,q.z-a.z-dz*t)};
  assert.equal(roadCorridorClear(path,q,radius),
   Math.min(distance(path[0],path[1]),distance(path[1],path[2]))>radius);
  checks++;
 }
assert(roadCorridorClear(null,{x:0,z:0},10));
const runtime=readFileSync(new URL('../src/world-generation.js',import.meta.url),'utf8');
const reserve=runtime.indexOf('let reservedBaseCoastRoad=null'),
 assignment=runtime.indexOf('reservedBaseCoastRoad=world.userData.baseCoast.points'),
 next=runtime.indexOf('for(const sector of activeSectors){',assignment);
assert(reserve>=0&&assignment>reserve&&next>assignment,
 'late compounds must be placed only after the corridor is reserved');
console.log('PASS phase4 coast road reservation: '+checks+' segment tests, 148/2 heliport regression');
