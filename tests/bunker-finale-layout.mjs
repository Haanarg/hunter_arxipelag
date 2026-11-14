import assert from 'node:assert/strict';
import {bunkerBasementPlan,bunkerEntranceLayout,bunkerGuardIsElite,bunkerEastWallSections} from '../src/world-generation-core.mjs';
import {bunkerFloorAt,buildingWorldPoint,bunkerStairBounds,bunkerStairProgress} from '../src/walk-surfaces.mjs';
import {pushWalls} from '../src/world-physics.mjs';
import {addCoopBunker} from '../server/coop-bunker.mjs';
const b={id:'test',x:10,z:-5,fy:20,w:40,d:34,h:10};
for(const seed of [1,2,3,4,67,148,999,1731603374]){
 const p=bunkerBasementPlan(seed,b),rows=bunkerEntranceLayout(p),st=p.stair;
 assert.equal(p.upperGuards.length,2);assert(p.upperGuards.every(g=>g.z>5));
 assert.equal(p.guardLocal.length,4);assert.equal(st.axis,'x');
 assert.equal(st.z,p.westDoors[1]);assert(st.xBottom>p.eastWallX);
 const exit=rows.find(r=>r.kind==='door'&&r.basement);
 assert.equal(exit.x,p.eastWallX);assert.equal(exit.z,p.westDoors[1]);assert.equal(exit.d,st.width);
 assert.equal(rows.filter(r=>r.kind==='door').length,2);
 assert(rows.filter(r=>r.kind==='step').every(r=>r.base<=-9.15&&r.playerBlock===false&&r.height>0));
 // Keep shaft surfaces out of the slab's top plane, and avoid coplanar
 // step sides. The three upper parapets must have a closed U-shaped joint.
 const near=(a,b)=>Math.abs(a-b)<1e-8;
 const upperParapets=rows.filter(r=>r.kind==='shaft'&&!r.basement);
 assert.equal(upperParapets.length,3);
 assert(upperParapets.every(r=>near(r.base,.22)&&near(r.height,2.1)));
 const cap=upperParapets.find(r=>near(r.x+r.w/2,st.xBottom)&&near(r.z,st.z));
 assert(cap&&near(cap.d,st.width+1.4));
 for(const side of upperParapets.filter(r=>r!==cap)){
  assert(near(side.x-side.w/2,cap.x+cap.w/2));
  assert(near(Math.abs(side.z-st.z)+side.d/2,cap.d/2));
 }
 const lowerSides=rows.filter(r=>r.kind==='shaft'&&r.basement&&near(r.d,.7));
 assert.equal(lowerSides.length,2);
 assert(lowerSides.every(r=>near(r.base+r.height,-.04)));
 const steps=rows.filter(r=>r.kind==='step');
 assert.equal(steps.length,19);
 assert(steps.every(r=>near(r.d,st.width-.05)&&near(r.z,st.z)));
 const bounds=bunkerStairBounds(st);assert(bounds.left>p.eastWallX&&bounds.right<19);
 for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
  const model={...b,angle,basement:{halfX:p.halfX,halfZ:p.halfZ,floorY:p.floorY,stair:st}};
  for(let i=0;i<=19;i++){
   const t=i/19,q=buildingWorldPoint(model,st.xTop+t*(st.xBottom-st.xTop),st.z);
   assert(Math.abs(bunkerFloorAt(model,q.x,q.z,20)-(b.fy+.22-t*9.37))<1e-6);
  }
  const modelServer={...b,angle},geo={walls:[]};addCoopBunker(modelServer,seed,geo);
  const lowerDoor=buildingWorldPoint(modelServer,p.eastWallX,st.z);
  assert(geo.walls.some(w=>w.door&&Math.abs(w.cx-lowerDoor.x)<1e-6&&Math.abs(w.cz-lowerDoor.z)<1e-6&&w.y0===p.floorY));
 }
 for(const [difficulty,count] of [[.6,0],[1,2],[1.5,4]])assert.equal(p.guardLocal.filter((_,i)=>bunkerGuardIsElite(difficulty,i)).length,count);
}
for(const seed of [148,1731603374]){
 const model={...b,x:0,z:0},p=bunkerBasementPlan(seed,model),st=p.stair,geo={walls:[]};
 addCoopBunker(model,seed,geo);const walls=geo.walls;
 const player={x:0,z:14,y:20.22,hd:0};
 function walkTo(x,z){
  for(let i=0;i<600;i++){
   const dx=x-player.x,dz=z-player.z,dist=Math.hypot(dx,dz);
   if(dist<.02)return true;
   const step=Math.min(.1,dist);
   player.x+=dx/dist*step;player.z+=dz/dist*step;
   pushWalls(player,walls);player.y=bunkerFloorAt(model,player.x,player.z,player.y);
  }
  return false;
 }
 const upper=walls.find(w=>w.door&&w.y0>20),lower=walls.find(w=>w.door&&w.cx===p.eastWallX&&w.cz===st.z);
 assert(!walkTo(0,4.5),'upper door blocks access');upper.open=true;
 assert(walkTo(0,4.5),'enter rear room');
 assert(walkTo(17.8,4.5),'approach stair from east');assert(walkTo(17.8,st.z));
 assert(walkTo(st.xBottom,st.z),'straight descent');assert(Math.abs(player.y-p.floorY)<.05);
 assert(!walkTo(0,st.z),'lower door blocks access');lower.open=true;
 assert(walkTo(0,st.z),'exit directly into corridor');assert.equal(player.y,p.floorY);
 assert(walkTo(0,-19),'north clear');assert(walkTo(0,19),'south clear');assert(walkTo(0,st.z));
 assert(walkTo(17.8,st.z),'straight return upstairs');assert(Math.abs(player.y-20.22)<.05);
 console.log('Bunker '+seed+': straight stair, opposite doors, free corridor, ascent and descent OK');
}
