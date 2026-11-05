import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planLevelArea,levelHeight} from '../src/world-physics.mjs';
import {planPrisonEscapeGrade} from '../src/compound-planning.mjs';
// Frozen addLevelArea before the extraction.
const legacy="const addLevelArea=(x,z,w,d,y,rot=0,blend=12)=>{\n  const m={x,z,hw:w/2,hd:d/2,y,rot,c:Math.cos(rot),s:Math.sin(rot),blend};\n  terrainLevels.push(m);\n  // Màxima circumferència d'influència de la plataforma girada.\n  const reach=Math.hypot(m.hw,m.hd)+blend;\n  terrainLevelGrid.insert(m,x-reach,x+reach,z-reach,z+reach);\n};";
const oldRegister=new Function('terrainLevels','terrainLevelGrid',
 legacy+'\nreturn addLevelArea;');
function random(seed){let a=seed>>>0;return()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296}}
let placements=0,heights=0,grades=0;
for(const scale of [1,2])for(const seed of [0,1,67,148,25019,4294967295]){
 const r=random(seed^scale),original=[],planned=[],oldInserts=[],newInserts=[];
 const prev=oldRegister(original,{insert:(...args)=>oldInserts.push(args)});
 for(let n=0;n<240;n++){
  const x=(r()-.5)*4600*scale,z=(r()-.5)*4600*scale,
   w=2+r()*200,d=2+r()*175,y=-1+r()*23,
   rot=[0,Math.PI/2,Math.PI,Math.PI*1.5][Math.floor(r()*4)],
   blend=[0,3,7,12,18][Math.floor(r()*5)];
  prev(x,z,w,d,y,rot,blend);
  const {level,bounds}=planLevelArea(x,z,w,d,y,rot,blend);
  planned.push(level);
  newInserts.push([level,bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ]);
  assert.deepEqual(level,original[n],'canonical level descriptor '+n);
  assert.deepEqual(newInserts[n],oldInserts[n],'grid insertion extent '+n);
  placements++;
 }
 for(let n=0;n<45;n++){
  const x=(r()-.5)*4600*scale,z=(r()-.5)*4600*scale,h=-6+r()*15;
  assert.equal(levelHeight(h,x,z,planned),levelHeight(h,x,z,original));
  heights++;
 }
}
for(const scale of [1,2])for(const seed of [67,148,1,4294967295])
 for(const padHalfDepth of [40,69,80,105])for(const escapeEnd of [110,160,205]){
  const camp={x:(seed%41-20)*scale,z:(seed%29-13)*scale},
   h=3+seed%17,expected=[camp.x,camp.z+(padHalfDepth+escapeEnd)/2,
      28,escapeEnd-padHalfDepth,h,0,18];
  assert.deepEqual(planPrisonEscapeGrade(camp,{padHalfDepth,escapeEnd},h),expected);
  grades++;
 }
const runtime=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
const generator=readFileSync(new URL('../src/world-generation.js',import.meta.url),'utf8');
assert(runtime.includes('HUNTER_WORLD_PHYSICS.planLevelArea('));
assert(generator.includes('HUNTER_COMPOUND_PLANNING.planPrisonEscapeGrade('));
assert(!runtime.includes('const m={x,z,hw:w/2,hd:d/2,y,rot'));
console.log('PASS phase4 terrain pad parity: '+placements+' descriptors/grid bounds, '+heights+' heights and '+grades+' escape grades');
