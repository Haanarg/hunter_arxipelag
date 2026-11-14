import assert from 'node:assert/strict';
import {bunkerBasementPlan,bunkerEntranceLayout,bunkerGuardIsElite} from '../src/world-generation-core.mjs';
import {bunkerFloorAt,buildingWorldPoint} from '../src/walk-surfaces.mjs';
import {pushWalls} from '../src/world-physics.mjs';
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

{
 // Recorregut físic: portes tancades, segona sala, escala i retorn.
 const p=bunkerBasementPlan(148,{x:0,z:0,fy:20});
 const model={x:0,z:0,fy:20,basement:{halfX:p.halfX,halfZ:p.halfZ,floorY:p.floorY,stair:{x:0,width:p.stairWidth,zTop:p.stairTop,zBottom:p.stairBottom,enclosed:true}}};
 const walls=bunkerEntranceLayout(p).map(r=>({...r,x0:r.x-r.w/2,x1:r.x+r.w/2,z0:r.z-r.d/2,z1:r.z+r.d/2,y0:20+r.base,y1:20+r.base+r.height,open:false}));
 const player={x:0,z:14,y:20.22,hd:0};
 function walkTo(x,z){
  for(let i=0;i<400;i++){
   const dx=x-player.x,dz=z-player.z,dist=Math.hypot(dx,dz);
   if(dist<.02)return true;
   const step=Math.min(.1,dist);
   player.x+=dx/dist*step;player.z+=dz/dist*step;
   pushWalls(player,walls);
   player.y=bunkerFloorAt(model,player.x,player.z,player.y);
  }
  return false;
 }
 assert(!walkTo(0,4.5),'upper door blocks access');
 walls.find(w=>w.kind==='door'&&!w.basement).open=true;
 assert(walkTo(0,4.5),'enter rear room');
 assert(walkTo(4.2,4.5),'walk around shaft');
 assert(walkTo(4.2,-14.4));assert(walkTo(0,-14.4));
 assert(walkTo(0,1.7),'descend to landing');assert(Math.abs(player.y-p.floorY)<.05);
 assert(!walkTo(0,4),'lower door blocks access');
 walls.find(w=>w.kind==='door'&&w.basement).open=true;
 assert(walkTo(0,4));assert.equal(player.y,p.floorY);
 assert(walkTo(0,-14.4),'return upstairs');assert(Math.abs(player.y-20.22)<.05);
 console.log('Bunker finale: physical route, both doors, descent and ascent OK');
}
