import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBaseShells} from '../server/coop-base-buildings.mjs';
import {windowLayout,windowCrossing,wallShotHit,windowPaneIndexAt} from '../src/building-shell.mjs';
import {traceArena} from '../server/coop-combat.mjs';
import {createAimSelector} from '../src/aiming-core.mjs';

const world={heightAt:()=>-100,locomotionAt:()=>({basement:false,floor:-100})};
let checks=0,reversed=0;
for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
 const plan={id:'test',layoutId:'house',buildings:[{id:'double',x:10,z:-5,w:18,d:14,h:8,floors:2,angle}]};
 const shells=buildBaseShells(plan,{heightAt:()=>0},()=>.5);
 const geometry={walls:shells.walls,buildings:shells.buildings};
 const [building]=shells.buildings;
 const upper=shells.walls.filter(w=>w.upperFloorWindow);
 const lower=shells.walls.filter(w=>w.windows&&!w.upperFloorWindow);
 assert.equal(upper.length,4,'all four upper floor facades are breakable');
 assert.equal(lower.length,3,'lower floor windows remain intact as before');
 for(const wall of upper){
  assert.ok(wall.windowPanes?.length>0,'each upstairs facade exposes actual window volumes');
  assert.ok(wall.windowPanes.every(p=>p.y0>building.fy+building.storey),'upper panes have elevated Y');
  const normal=wall.windowPanes[0].axis,along=normal==='x'?'z':'x';
  const length=wall[along+'1']-wall[along+'0'],thick=wall[normal+'1']-wall[normal+'0'];
  const layout=windowLayout(normal==='z'?length:thick,normal==='x'?length:thick,building.storey);
  const center=(wall[along+'0']+wall[along+'1'])/2,mapped=layout.centers.map(c=>windowPaneIndexAt(wall,center+c));
  assert.equal(new Set(mapped).size,mapped.length,'independent physical pane IDs match the rendered panes');
  for(let k=0;k<mapped.length;k++){
   const index=mapped[k],pane=wall.windowPanes[index];
   assert.ok(index>=0,'a window visual has a physical pane');
   assert.ok(Math.abs(pane[along]-(center+layout.centers[k]))<1e-5,'visual/physical pane coordinates coincide');
   if(index!==k)reversed++;
  }
  const pane=wall.windowPanes[0],y=(pane.y0+pane.y1)/2,
   side=Math.sign(pane[normal]-building[normal])||1;
  const ray=(distance,height=y)=>({x:pane.x+(normal==='x'?side*distance:0),y:height,z:pane.z+(normal==='z'?side*distance:0)});
  const outside=ray(3),inside=ray(-3);
  assert.ok(windowCrossing(outside,inside,wall),'upper glass is hit from outdoors');
  assert.ok(windowCrossing(inside,outside,wall),'upper glass is hit from indoors');
  assert.equal(wallShotHit(outside,inside,wall),null,'physical opening has no opaque wall collision');
  const forward=traceArena(outside,inside,geometry,world,{collectWindows:true}),
   reverse=traceArena(inside,outside,geometry,world,{collectWindows:true});
  assert.equal(forward.hit,false,'upstairs shot crosses the facade from outdoors');
  assert.equal(reverse.hit,false,'upstairs shot crosses the facade from indoors');
  assert.equal(forward.windowCrossings.length,1,'one upstairs pane shatters on the shot');
  assert.equal(reverse.windowCrossings.length,1,'reverse direction also shatters the same pane');
  assert.equal(forward.windowCrossings[0].index,0,'glass IDs identify the correct physical pane');
  assert.equal(traceArena(ray(3,pane.y0-.35),ray(-3,pane.y0-.35),geometry,world).hit,true,'sill still blocks low shots');
  // An on-foot player can aim upward at upstairs glass using the existing
  // aim selector; the bullet crosses the SAME physical pane it selected.
  const muzzle=ray(24,1.5),heading=[normal==='x'?-side:0,0,normal==='z'?-side:0],focus={},
   selector=createAimSelector({origin:muzzle,direction:heading,range:70,cone:.97,
      shotClass:'pistol',focus,verticalCone:Math.PI/2,
      isClear:(x,y,z,tx,ty,tz)=>traceArena({x,y,z},{x:tx,y:ty,z:tz},geometry,world).fraction>=1});
  selector.consider(wall,'window',4,pane.x,y,pane.z);
  assert.equal(selector.hasTarget,true,'pistol can acquire the upper-floor glass');
  const direction=selector.direction(),distance=Math.hypot(pane.x-muzzle.x,y-muzzle.y,pane.z-muzzle.z);
  assert.ok(direction[1]>.1,'gun points upwards from the street');
  const trajectory={x:muzzle.x+direction[0]*(distance+2),y:muzzle.y+direction[1]*(distance+2),
    z:muzzle.z+direction[2]*(distance+2)};
  const flight=traceArena(muzzle,trajectory,geometry,world,{collectWindows:true});
  assert.ok(flight.windowCrossings.some(q=>q.wallIndex===shells.walls.indexOf(wall)&&q.index===0),'bullet actually intersects the upstairs pane');
  checks++;
 }
}
assert.ok(reversed>0,'half-turn rotations include reversed visual glass ordering');
const combat=readFileSync(new URL('../src/combat.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/coop-combat.mjs',import.meta.url),'utf8');
const view=readFileSync(new URL('../src/coop-building-view.mjs',import.meta.url),'utf8');
assert.match(combat,/upperFloorWindow/,'solo player can acquire upper windows');
assert.match(server,/upperFloorWindow/,'server player can acquire upper windows');
assert.match(server,/windowAvailable/,'server excludes already shattered glass');
assert.match(view,/windowPaneIndexAt/,'shared visual pane mapping matches the correct pane');
console.log('All '+checks+' upstairs facades pass two-way shooting, glass ID and sill tests across 4 rotations; '+reversed+' reversed visual pane indexes corrected');
