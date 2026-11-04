import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planHQIntelClues} from '../src/world-generation-core.mjs';

// Independent v0.6.134 oracle: verbatim inline HQ planner.
const baseline="// Small maps keep three HQ candidates. Large maps use nine: three grounded\n// locations in each non-starting quadrant, including the actual HQ.\n// No draws from the shared R() sequence: same world seed, same geography.\nconst startingSector=mapSector(pa.x,pa.z),actualSector=mapSector(HQ.x,HQ.z);\nconst eligibleHQSites=sector=>{\n  const complexes=world.userData.compounds.filter(c=>c.id!=='hq'&&c.id!=='base'&&\n    !c.layout?.friendly&&!c.layout?.civilian&&sectorMatches(c.x,c.z,sector))\n    .map(c=>({x:c.x,z:c.z}));\n  const land=[];\n  for(const island of islandsInSector(sector).slice().sort((a,b)=>b.r-a.r)){\n    land.push({x:island.x,z:island.z});\n    if(Number.isFinite(island.peakX)&&Number.isFinite(island.peakZ))\n      land.push({x:island.peakX,z:island.peakZ});\n    for(const distance of [.28,.52,.72])for(let n=0;n<12;n++){\n      const angle=(n*2*Math.PI/12)+(seed%31)*.017,\n        x=island.x+Math.cos(angle)*island.r*distance,\n        z=island.z+Math.sin(angle)*island.r*distance;\n      land.push({x,z});\n    }\n  }\n  return [...complexes,...land].filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&\n    sectorMatches(p.x,p.z,sector)&&hAt(p.x,p.z)>1.2&&\n    Math.hypot(p.x-pa.x,p.z-pa.z)>240&&Math.hypot(p.x-HQ.x,p.z-HQ.z)>210);\n};\nconst pickHQDecoy=(sector,others=[])=>{\n  const pool=eligibleHQSites(sector);\n  // Prefer positions with the footprint of a military complex and large gaps\n  // between clues; relax gaps only when an unusual seed has little dry land.\n  for(const separation of [360,250,160,75]){\n    const q=pool.find(p=>others.every(other=>Math.hypot(p.x-other.x,p.z-other.z)>separation));\n    if(q)return{x:q.x,z:q.z};\n  }\n  return null;\n};\nconst hqPositions=[];\nif(MAP_SCALE===2){\n  for(const sector of [0,1,2,3].filter(n=>n!==startingSector)){\n    const group=sector===actualSector?[{x:HQ.x,z:HQ.z,real:true}]:[];\n    while(group.length<3){\n      const q=pickHQDecoy(sector,[...hqPositions,...group]);\n      if(!q)throw new Error('No hi ha prou emplaçaments vàlids per als nou indicis del HQ');\n      group.push({...q,real:false});\n    }\n    hqPositions.push(...group);\n  }\n}else{\n  hqPositions.push({x:HQ.x,z:HQ.z,real:true});\n  for(let i=0;i<2;i++){\n    const q=pickHQDecoy(null,hqPositions);\n    if(!q)throw new Error('No hi ha prou emplaçaments vàlids per als indicis del HQ');\n    hqPositions.push({...q,real:false});\n  }\n}\n// Shuffle the clues and the elimination order independently of live AI RNG.\n// Exactly six distinct false locations are ruled out, never the true HQ.\nconst clueRandom=mul((seed^0x5af17e32)>>>0);\nfor(let i=hqPositions.length-1;i>0;i--){\n  const j=Math.floor(clueRandom()*(i+1));\n  [hqPositions[i],hqPositions[j]]=[hqPositions[j],hqPositions[i]];\n}\nhqIntelSites=hqPositions;\nhqDiscardIndex=hqIntelSites.findIndex(p=>!p.real);\nhqIntelEliminationOrder=hqIntelSites.map((p,i)=>p.real?-1:i).filter(i=>i>=0);\nfor(let i=hqIntelEliminationOrder.length-1;i>0;i--){\n  const j=Math.floor(clueRandom()*(i+1));\n  [hqIntelEliminationOrder[i],hqIntelEliminationOrder[j]]=\n    [hqIntelEliminationOrder[j],hqIntelEliminationOrder[i]];\n}\nworld.userData.hqIntelCandidates=hqIntelSites.map(p=>({x:p.x,z:p.z,real:p.real}));\nworld.userData.hqSector=actualSector;";
const oldPlan=new Function('state',`
const {seed,MAP_SCALE,pa,HQ,world,islandsInSector,mapSector,sectorMatches,hAt,mul}=state;
let hqIntelSites=[],hqDiscardIndex=-1,hqIntelEliminationOrder=[];
`+baseline+`
return {hqIntelSites,hqDiscardIndex,hqIntelEliminationOrder,actualSector:world.userData.hqSector};
`);
const sector=(x,z)=>(x>=0?1:0)+(z>=0?2:0);
const sameSector=(x,z,s)=>s==null||sector(x,z)===s;
const mul=seed=>{let a=seed|0;return ()=>{
  a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;
}};
function scenario(seed,MAP_SCALE,variant,hostile=false){
 const pa={x:-1250,z:-1180};
 const HQ=[{x:1210,z:1300},{x:1230,z:-1160},{x:-1250,z:1210}][variant%3];
 const islands=[];
 for(let k=0;k<4;k++)for(let j=0;j<12;j++){
  const x=(k%2?1:-1)*(430+225*(j%4)),z=(k&2?1:-1)*(450+225*Math.floor(j/4)),r=420;
  islands.push({x,z,r,peakX:x+27,peakZ:z-24});
 }
 const compounds=hostile?[]:islands.filter((_,i)=>i%5===0)
  .map(i=>({id:'hangar',x:i.x,z:i.z,layout:{friendly:false,civilian:false}}));
 const islandsInSector=s=>islands.filter(i=>sameSector(i.x,i.z,s));
 const hAt=(x,z)=>hostile?-10:islands.some(i=>Math.hypot(i.x-x,i.z-z)<i.r)?5:-5;
 const state={seed,MAP_SCALE,pa,HQ,world:{userData:{compounds}},
  islandsInSector,mapSector:sector,sectorMatches:sameSector,hAt,mul};
 const pure={seed,MAP_SCALE,pa,HQ,compounds,islandsInSector,
  mapSector:sector,sectorMatches:sameSector,hAt,mul};
 return {state,pure,islands};
}
let comparisons=0;
for(const mapScale of [1,2])for(const seed of
 [0,1,2,3,67,148,45678,1234567,2407759483,4294967295]){
 for(let variant=0;variant<3;variant++){
  const {state,pure,islands}=scenario(seed,mapScale,variant);
  const originalInputs=JSON.stringify({islands,compounds:state.world.userData.compounds,
    pa:state.pa,HQ:state.HQ});
  const old=oldPlan(state),now=planHQIntelClues(pure);
  assert.deepEqual(now,old,'all sites and elimination ordering '+mapScale+'/'+seed+'/'+variant);
  assert.deepEqual(now.hqIntelSites.length,mapScale===2?9:3);
  assert.equal(now.hqIntelSites.filter(p=>p.real).length,1);
  assert.equal(now.hqIntelEliminationOrder.length,now.hqIntelSites.length-1);
  assert(!now.hqIntelEliminationOrder.some(i=>now.hqIntelSites[i].real));
  assert.equal(JSON.stringify({islands,compounds:state.world.userData.compounds,
    pa:state.pa,HQ:state.HQ}),originalInputs,'planner leaves inputs intact');
  if(mapScale===2){
   const start=sector(state.pa.x,state.pa.z);
   assert.equal(now.hqIntelSites.filter(p=>sector(p.x,p.z)===start).length,0);
   for(const s of [0,1,2,3].filter(s=>s!==start))
    assert.equal(now.hqIntelSites.filter(p=>sector(p.x,p.z)===s).length,3);
  }
  comparisons++;
 }
}
for(const scale of [1,2]){
 const {state,pure}=scenario(67,scale,0,true);
 let oldError,actualError;
 try{oldPlan(state)}catch(error){oldError=error.message}
 try{planHQIntelClues(pure)}catch(error){actualError=error.message}
 assert.equal(actualError,oldError,'same error on unavailable dry candidate terrain');
 comparisons++;
}
const core=readFileSync(new URL('../src/world-generation.js',import.meta.url),'utf8'),
  boot=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8'),
  harness=readFileSync(new URL('./harness.cjs',import.meta.url),'utf8');
assert(core.includes('window.HUNTER_WORLD_GENERATION.planHQIntelClues({'));
assert(core.includes('world.userData.hqIntelCandidates=hqIntelSites.map('));
assert(!core.includes('const eligibleHQSites=sector=>'),'old inline HQ planning removed');
assert(boot.includes('window.HUNTER_WORLD_GENERATION=worldGeneration'));
assert(harness.includes('c.HUNTER_WORLD_GENERATION=await import('));
console.log('PASS phase4 HQ planning parity: '+comparisons+
 ' deterministic small/large world profiles, 67/148, false-site safety and no global RNG');
