import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSiteRegistry,createReservationPlanner} from '../src/compound-planning.mjs';
import {createWorldRandom,createIslandLayout} from '../src/world-generation-core.mjs';
const baselineRegistry="const COMPOUND_RADII=Object.freeze({\n  avancada:84,\n  garatge:95,\n  heliport:102,\n  polvori:98,\n  comunicacions:95,\n  port:90\n});\nconst COMPOUND_GAP=34;\n// Reserva explícita de la base i de l'HQ: encara que dues illes generades se solapin\n// físicament, cap compound podrà entrar dins aquests perímetres.\nconst compoundCenters=initialCenters;\nconst typeId=t=>({avancada:'outpost',garatge:'hangar'}[t]||t);\nconst compoundRadiusCache=new MapConstructor();\nconst compoundRadius=type=>{\n  if(!compoundRadiusCache.has(type))compoundRadiusCache.set(type,\n    Math.max(COMPOUND_RADII[type]||58,...layouts.filter(l=>l.type===typeId(type)).map(layoutRadius)));\n  return compoundRadiusCache.get(type);\n};\nconst compoundSiteClear=(type,q,minCenter=0)=>{\n  const r=compoundRadius(type);\n  return compoundCenters.every(c=>{\n    const d=Math.hypot(q.x-c.x,q.z-c.z);\n    return d>Math.max(minCenter,r+c.r+COMPOUND_GAP)\n  })\n};\nconst registerCompound=(type,q)=>compoundCenters.push({x:q.x,z:q.z,r:compoundRadius(type),type});\n";
const baselineReserve="const reserveCompound=function* (type,min=180,sector=null){let checkpointUnits=0;for(const i of candidateIslands.filter(i=>sectorMatches(i.x,i.z,sector))){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};if(usedSpecialIslands.has(i))continue;for(let n=0;n<18;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const q=(yield* landSteps(i,850,1));if(q&&sectorMatches(q.x,q.z,sector)&&compoundSiteClear(type,q,min)){q.r=i.r;if((yield* compound(type,q))){usedSpecialIslands.add(i);return q}}}}return null};\nconst forceReserve=function* (type,min,sector=null){let checkpointUnits=0;\n  let q=(yield* reserveCompound(type,min,sector))||(yield* reserveCompound(type,110,sector));if(q)return q;\n  // Fallback exhaustiu, però mai saltant-se la zona de seguretat.\n  for(const i of candidateIslands.filter(i=>sectorMatches(i.x,i.z,sector))){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n    if(usedSpecialIslands.has(i))continue;\n    for(let n=0;n<48;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};\n      const c=(yield* landSteps(i,1800,1));if(!c||!sectorMatches(c.x,c.z,sector)||!compoundSiteClear(type,c,95))continue;\n      c.r=i.r;if((yield* compound(type,c))){usedSpecialIslands.add(i);return c}\n    }\n  }\n  return null\n};\n";
const registryOld=new Function('initialCenters','layouts','layoutRadius','MapConstructor',
 baselineRegistry+'return {centers:compoundCenters,gap:COMPOUND_GAP,radius:compoundRadius,isClear:compoundSiteClear,register:registerCompound};');
const plannerOld=new Function('candidateIslands','usedSpecialIslands','sectorMatches',
 'landSteps','compoundSiteClear','compound',
 baselineReserve+'return {reserveCompound,forceReserve};');
const layouts=[{type:'outpost',size:[88,78]},{type:'hangar',size:[115,86]},
 {type:'port',size:[110,90]},{type:'heliport',size:[125,110]},
 {type:'polvori',size:[95,80]},{type:'comunicacions',size:[105,85]},
 {type:'prison-camp',size:[205,162]},{type:'ferry-terminal',size:[125,100]},
 {type:'hut-settlement',size:[68,60]},{type:'civil-dock',size:[84,72]}];
const layoutRadius=l=>Math.hypot(...l.size)/2+20;
const types=['avancada','garatge','heliport','polvori','comunicacions','port',
 'prison-camp','ferry-terminal','hut-settlement','civil-dock','not-in-catalog'];
const sector=(x,z)=>(x>=0?1:0)+(z>=0?2:0);
const sectorMatches=(x,z,s)=>s==null||sector(x,z)===s;
const run=gen=>{const yielded=[];let result;
 for(let i=0;i<30000;i++){
  result=gen.next();if(result.done)break;yielded.push(result.value);
 }
 assert(result.done,'no unbounded search');
 return {yielded,returned:result.value?{...result.value}:result.value};
};
let geometry=0,searches=0;
for(const mapScale of [1,2])for(const seed of [0,1,67,148,45678,2407759483,4294967295]){
 const layout=createIslandLayout(seed,mapScale);
 const startCenters=()=>[{x:layout.base.x,z:layout.base.z,r:680,type:'base'},
   {x:layout.headquarters.x,z:layout.headquarters.z,r:650,type:'hq'}];
 const left=registryOld(startCenters(),layouts,layoutRadius,Map),
  right=createSiteRegistry({layouts,layoutRadius,initialCenters:startCenters(),MapConstructor:Map});
 assert.equal(left.gap,right.gap);
 for(let n=0;n<320;n++){
  const type=types[(n+seed%11)%types.length],
   q={x:Math.sin(n*.71+seed%17)*1950,z:Math.cos(n*.53+seed%19)*2000},
   min=n%3===0?0:n%3===1?160:300;
  assert.equal(right.radius(type),left.radius(type),'radius parity '+type);
  assert.equal(right.isClear(type,q,min),left.isClear(type,q,min),'clearance parity');
  if(n%5===0){left.register(type,q);right.register(type,q)}
  assert.deepEqual(right.centers,left.centers,'same reservation list');
  geometry++;
 }
 const islands=layout.islands.slice(2,12);
 for(let variant=0;variant<6;variant++)for(const method of ['reserveCompound','forceReserve'])
  for(const quadrant of [null,0,1,2,3]){
    const fixture=()=>{
      const events=[],rng=createWorldRandom((seed^Math.imul(variant+1,0x9e3779b1))>>>0),
        candidates=islands.map(i=>({...i})),used=new Set();
      const landSteps=function*(island,max,flag){
        events.push(['land',island.x,island.z,max,flag]);
        const rx=rng(),rz=rng();
        yield {stage:'land',completed:max,total:null};
        return variant===3?null:{x:island.x+(rx-.5)*200,z:island.z+(rz-.5)*200,h:5};
      };
      const compoundSiteClear=(type,q,min)=>{
        events.push(['clear',type,q.x,q.z,min]);
        return variant!==4&&Math.abs(q.x)>100&&Math.abs(q.z)>100;
      };
      const compound=function*(type,q){
        events.push(['compound',type,q.x,q.z,q.r]);
        yield {stage:'build',completed:1,total:1};
        return variant===5?false:rng()>(variant===2?.7:.3);
      };
      const deps={candidateIslands:candidates,usedSpecialIslands:used,sectorMatches,
        landSteps,compoundSiteClear,compound};
      return {events,rng,candidates,used,deps};
    };
    const a=fixture(),b=fixture();
    const x=plannerOld(...Object.values(a.deps)),
      y=createReservationPlanner(b.deps);
    assert.deepEqual(run(y[method]('heliport',190,quadrant)),
      run(x[method]('heliport',190,quadrant)),
      'same values/yields '+[mapScale,seed,variant,method,quadrant]);
    assert.deepEqual(b.events,a.events,'same call order and coordinates');
    assert.equal(b.rng.getState(),a.rng.getState(),'same RNG draw count and state');
    assert.deepEqual([...b.used].map(v=>b.candidates.indexOf(v)),
      [...a.used].map(v=>a.candidates.indexOf(v)),'same exact chosen islands');
    assert.deepEqual(b.candidates,a.candidates,'same candidate mutation');
    searches++;
  }
}
const world=readFileSync(new URL('../src/world-generation.js',import.meta.url),'utf8');
assert(world.includes('HUNTER_COMPOUND_PLANNING.createSiteRegistry('));
assert(world.includes('HUNTER_COMPOUND_PLANNING.createReservationPlanner('));
assert(!world.includes('const reserveCompound=function* ('));
assert(!world.includes('const compoundRadiusCache=new Map();'));
assert(world.includes('const compoundCenters=compoundRegistry.centers'));
console.log('PASS phase4 compound reservations: '+geometry+
 ' radii/clearance samples and '+searches+' differential generator/RNG scenarios');
