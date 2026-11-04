import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three-r186.module.mjs';
import '../src/buildings.js';

const material=(color,profile='masonry')=>new T.MeshStandardMaterial({
  color,roughness:profile==='terrain'?.96:.88,metalness:profile==='terrain'?0:.01
});
const building=globalThis.HUNTER_BUILDINGS.create(T,{
  material,materialProfile:()=>({roughness:.88,metalness:.01})
});
for(const [kind,shell] of [
  ['house',building.createShell({width:18,depth:22,height:8,wallColor:0xcccccc,roofColor:0x555555})],
  ['hangar',building.createHangarShell({width:26,depth:30,height:12,wallColor:0xcccccc,roofColor:0x555555})]
]){
  const floors=shell.group.children.filter(o=>o.name==='hunter-ground-floor');
  assert.equal(floors.length,1,kind+' has one ground floor');
  const floor=floors[0];
  assert.equal(floor.receiveShadow,true,kind+' floor receives shadows');
  assert.equal(floor.castShadow,false,kind+' foundation does not cast a large shadow');
  assert.equal(floor.material.metalness,0,kind+' floor is nonmetallic');
  assert(floor.material.roughness>=.95,kind+' floor is matte');
  assert(floor.geometry.parameters.width>0&&floor.geometry.parameters.depth>0);
  const top=floor.position.y+floor.geometry.parameters.height/2;
  assert(Math.abs(top-(kind==='house'?.3:.195))<1e-6,kind+' floor remains at original elevation');
}
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compounds=source('src/compound-generation.js'),world=source('src/world-generation.js');
assert(!compounds.includes('pad(...tr(')&&!compounds.includes('const base=pad('),'no physical compound courtyard slab');
assert(!world.includes('const compoundPad='),'obsolete ground-pad factory removed');
assert(!world.includes('pad:compoundPad'),'no caller creates courtyard slabs');
assert(compounds.includes('addLevelArea(level.x,level.z'),'terrain leveling retained');
assert(compounds.includes('compoundClear.push({x:q.x,z:q.z,r:record.r})'),'compound vegetation reservation retained');
assert(compounds.includes('heliportFloor.receiveShadow=true'),'heliport still exists and receives shadows');
assert(source('src/game-core.js').includes('panel.receiveShadow=true'),'bunker basement floors receive shadows');
assert(source('src/compound-architecture.mjs').includes("const floorBox=(...args)=>"),'upper floors are matte and receive shadows');
console.log('compound floors: no courtyard slabs, reserved leveled terrain, matte floors and shadow receivers passed');
