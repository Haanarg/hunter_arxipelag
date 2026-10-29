import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STANDARD_BUILDING_DOOR,doorFlankLayout,planBuildingShell,shellColliders} from '../src/building-shell.mjs';

const EPS=1e-8,eq=(a,b,description)=>assert(Math.abs(a-b)<EPS,description+' ('+a+' vs '+b+')');
assert.deepEqual(STANDARD_BUILDING_DOOR,{width:2.8,height:5.2});
let count=0;
for(const side of [0,1,2,3])for(const [w,d,h,floors] of [
  [18,24,7,1],[12,12,6,1],[16,14,5.2,1],[24,28,14,2]
]){
 const opts={doorSide:side,doorWidth:STANDARD_BUILDING_DOOR.width,
   doorHeight:STANDARD_BUILDING_DOOR.height,noPartitions:true,...(floors===2?{floors:2}:{})};
 const plan=planBuildingShell(w,d,h,opts,()=>.2);
 const {walls}=shellColliders(10,20,3,w,d,h,opts,()=>.2);
 const door=walls.find(s=>s.door),lintel=walls.find(s=>s.playerBlock===false);
 assert(door&&lintel,'Door and lintel must exist');
 const alongX=side<=1,span=alongX?w:d-1.6;
 const actualWidth=alongX?door.x1-door.x0:door.z1-door.z0;
 const flanks=walls.filter(s=>s.supportSide===side&&s.supportWeight===.5);
 eq(actualWidth,STANDARD_BUILDING_DOOR.width,'Same visual/physical opening width');
 eq(flanks.reduce((n,s)=>n+(alongX?s.x1-s.x0:s.z1-s.z0),0)+actualWidth,
   span,'Flanking walls must exactly meet the door without gaps or overlaps');
 eq(lintel.y0,3+door.doorHeight,'Lintel starts at top of doorway');
 eq(lintel.y1,3+h/floors,'Lintel reaches ceiling');
 assert(door.doorHeight>4.4,'Door is taller than previous 4.4 m on all supported buildings');
 assert(actualWidth<door.doorHeight*.7,'Door is visibly narrower than its height');
 assert.equal(plan.assemblies.length,1,'Door and flanks share one destructible assembly');
 assert.equal(plan.assemblies[0].length,3,'Both jambs and the door are in one assembly');
 count++;
}
// Do not modify the bunker gate dimensions, collider or mechanism.
const bunker={doorSide:0,bunker:true,doorWidth:4,doorHeight:4.4,lockedDoor:true};
const original=shellColliders(0,0,0,40,34,10,bunker,()=>.2).walls.find(s=>s.door);
eq(original.doorWidth,4,'Unchanged bunker width');
eq(original.doorHeight,4.4,'Unchanged bunker height');
const compound=readFileSync(new URL('../src/compound-generation.js',import.meta.url),'utf8');
assert(compound.includes('doorWidth:spec.hangar?30:window.HUNTER_BUILDING_SHELL.STANDARD_BUILDING_DOOR.width'),'Only standard compound doors use shared width');
assert(compound.includes('doorHeight:spec.hangar?11:window.HUNTER_BUILDING_SHELL.STANDARD_BUILDING_DOOR.height'),'Hangars retain wide clearance');
const core=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
assert(core.includes("bunker:true,doorSide:0,doorWidth:4,doorHeight:4.4"),'The bunker gate has not changed');
const preview=readFileSync(new URL('../src/compound-concepts.mjs',import.meta.url),'utf8');
assert(preview.includes('doorFlankLayout(b.w,door)'),'Preview uses exactly the same flank geometry');
assert(preview.includes('b.bunker?4:through?12:STANDARD_BUILDING_DOOR.width'),'Preview preserves bunker and drive-through widths');
assert(preview.includes('b.bunker?4.4:through?4.4:STANDARD_BUILDING_DOOR.height'),'Preview preserves bunker height');
assert.throws(()=>doorFlankLayout(2,2.8),RangeError);
console.log('OK: '+count+' doors across four orientations/heights, continuous jambs/lintels, original bunker unchanged');
