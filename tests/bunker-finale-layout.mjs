import assert from 'node:assert/strict';
import {bunkerBasementPlan,bunkerEntranceLayout,bunkerGuardIsElite} from '../src/world-generation-core.mjs';
import {bunkerFloorAt,buildingWorldPoint} from '../src/walk-surfaces.mjs';
const b={x:10,z:-5,fy:20};
for(const seed of [1,2,3,4,67,148,999]){
 const p=bunkerBasementPlan(seed,b),rows=bunkerEntranceLayout(p);
 assert.equal(p.upperGuards.length,2);assert(p.upperGuards.every(g=>g.z>5));
 assert.equal(p.guardLocal.length,4);
 assert.equal(p.stairX,0);assert(p.stairTop<-10&&p.stairBottom<5);
 assert.equal(rows.filter(r=>r.kind==='door').length,2);
 assert.equal(rows.find(r=>r.kind==='door'&&r.basement).w,p.stairWidth);
 assert(rows.filter(r=>r.kind==='step').every(r=>r.base<=-9.15&&r.playerBlock===false&&r.height>0));
 for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
  const model={...b,angle,basement:{halfX:p.halfX,halfZ:p.halfZ,floorY:p.floorY,stair:{x:p.stairX,width:p.stairWidth,zTop:p.stairTop,zBottom:p.stairBottom,enclosed:true}}};
  for(let i=0;i<=16;i++){
   const t=i/16,q=buildingWorldPoint(model,0,p.stairTop+t*(p.stairBottom-p.stairTop));
   assert(Math.abs(bunkerFloorAt(model,q.x,q.z,20)-(b.fy+.22-t*9.37))<1e-6);
  }
 }
 for(const [difficulty,count] of [[.6,0],[1,2],[1.5,4]])assert.equal(p.guardLocal.filter((_,i)=>bunkerGuardIsElite(difficulty,i)).length,count);
}
console.log('Bunker finale: deterministic stair, two upper guards and 0/2/4 elite guards');
