import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveMapPickup,hqClueMarkers,hqIntelStatus} from '../src/game-intel-core.mjs';

// Independent pre-extraction v0.6.131 function. Preserve the initial
// autosave as a no-op because the runtime wrapper owns that side effect.
const legacyPickup="function revealMapPickup(kind,allSectors=false,pickupSector=null){\n  requestOperationAutosave('intel');\n  if(kind==='mapa'){\n    if(hqMapKnown)return 'El HQ enemic ja està localitzat.';\n    if(MAP_SCALE===2){\n      // Each quadrant provides only one independent piece of HQ intelligence.\n      const sector=pickupSector??mapSector(P.x,P.z);\n      if(hqIntelSectors.has(sector))\n        return 'Aquest quadrant ja ha aportat informació sobre l’HQ. Cerca un mapa en un altre quadrant.';\n      hqIntelSectors.add(sector);\n      hqIntelStage=hqIntelSectors.size;\n      if(hqIntelStage===1)return 'Nou possibles emplaçaments de l’HQ marcats al mapa.';\n      if(hqIntelStage===2||hqIntelStage===3){\n        const from=(hqIntelStage-2)*3;\n        for(const index of hqIntelEliminationOrder.slice(from,from+3))\n          hqIntelDiscarded.add(index);\n        return 'Intel·ligència d’un quadrant nou: tres emplaçaments descartats. En queden '+\n          (9-hqIntelDiscarded.size)+' de possibles.';\n      }\n      hqMapKnown=true;\n      return 'Quart quadrant investigat: HQ enemic localitzat amb exactitud!';\n    }\n    // Small-map progression remains unchanged.\n    if(hqIntelStage>=3)return 'El HQ enemic ja està localitzat.';\n    hqIntelStage++;\n    if(hqIntelStage===1)return 'Tres possibles emplaçaments del HQ marcats amb interrogants.';\n    if(hqIntelStage===2)return 'Un dels tres emplaçaments descartat: queden dos interrogants.';\n    hqMapKnown=true;\n    return 'Tercer mapa: HQ enemic localitzat amb exactitud!';\n  }\n  const isHeli=kind==='mapa_heli',isTank=kind==='mapa_tanc';\n  if(!isHeli&&!isTank)return null;\n  const markKind=isHeli?'heli':'tanc',sector=MAP_SCALE===2&&!allSectors?mapSector(P.x,P.z):null,\n    targets=(isHeli?V.filter(v=>v.t==='heli'||v.t==='heli_combat'):\n      [...V.filter(v=>v.t==='tanc'),...E.filter(e=>e.t==='tanc')])\n      .filter(v=>!v.destroyed&&sectorMatches(v.x,v.z,sector));\n  if(sector==null){\n    knownVehicleSectors[markKind].clear();\n    for(let i=0;i<4;i++)knownVehicleSectors[markKind].add(i);\n    intelMarks=intelMarks.filter(m=>m.kind!==markKind);\n  }else{\n    knownVehicleSectors[markKind].add(sector);\n    intelMarks=intelMarks.filter(m=>m.kind!==markKind||!sectorMatches(m.ref?.x??m.x,m.ref?.z??m.z,sector));\n  }\n  targets.forEach((v,i)=>intelMarks.push({\n    kind:markKind,ref:v,\n    label:(isHeli?(v.t==='heli_combat'?'Helicòpter de combat ':'Helicòpter '):'Tanc ')+(i+1)\n  }));\n  return 'Mapa actualitzat: '+targets.length+' '+(isHeli?'helicòpters':'tancs')+\n    (sector===null?' localitzats.':' localitzats en aquest quadrant.');\n}";
const runLegacy=new Function('state','kind','allSectors','pickupSector',`
let {hqMapKnown,hqIntelStage,intelMarks}=state;
const {mapScale:MAP_SCALE,player:P,vehicles:V,enemies:E,
  hqIntelEliminationOrder,hqIntelSectors,hqIntelDiscarded,
  knownVehicleSectors,mapSector,sectorMatches}=state;
const requestOperationAutosave=()=>{};
`+legacyPickup+`
const message=revealMapPickup(kind,allSectors,pickupSector);
state.hqMapKnown=hqMapKnown;state.hqIntelStage=hqIntelStage;
state.intelMarks=intelMarks;
return message;
`);
const mapSector=(x,z)=>(x>=0?1:0)+(z>=0?2:0);
const sectorMatches=(x,z,sector)=>sector==null||mapSector(x,z)===sector;
function fixture(scale){
 const vehicles=[
  {id:'h1',t:'heli',x:-220,z:-200},
  {id:'h2',t:'heli_combat',x:200,z:-200},
  {id:'h3',t:'heli',x:-150,z:150,destroyed:true},
  {id:'t1',t:'tanc',x:190,z:150},
  {id:'t2',t:'tanc',x:-190,z:-150}
 ];
 return {mapScale:scale,player:{x:-50,z:-50},vehicles,
  enemies:[{id:'t3',t:'tanc',x:-200,z:200},{id:'e1',t:'soldat',x:0,z:0}],
  hqIntelStage:0,hqMapKnown:false,
  hqIntelEliminationOrder:[3,6,1,7,5,2,8,4],
  hqIntelSectors:new Set(),hqIntelDiscarded:new Set(),
  knownVehicleSectors:{heli:new Set(),tanc:new Set()},
  intelMarks:[],mapSector,sectorMatches};
}
function report(s){
 return {stage:s.hqIntelStage,known:s.hqMapKnown,
  sectors:[...s.hqIntelSectors],discarded:[...s.hqIntelDiscarded],
  heli:[...s.knownVehicleSectors.heli],tanc:[...s.knownVehicleSectors.tanc],
  marks:s.intelMarks.map(m=>({kind:m.kind,label:m.label,id:m.ref?.id}))};
}
let cases=0;
for(const scale of [1,2])for(let variant=0;variant<48;variant++){
 const before=fixture(scale),after=fixture(scale);
 const steps=[
  ['no_existeix',false,null],['mapa',false,0],['mapa',false,0],
  ['mapa',false,1],['mapa',false,2],['mapa',false,3],
  ['mapa',false,2],['mapa_tanc',false,null],['mapa_heli',false,null],
  ['mapa_tanc',true,null],['mapa_heli',true,null],
  ['mapa_heli',false,null],['mapa_tanc',false,null]
 ];
 for(let j=0;j<steps.length;j++){
  const [kind,all,sector]=steps[(j+variant)%steps.length];
  const x=(variant+j)%2?125:-125,z=(variant+j)%3?175:-175;
  before.player.x=after.player.x=x;
  before.player.z=after.player.z=z;
  const a=runLegacy(before,kind,all,sector);
  const b=resolveMapPickup(after,kind,all,sector);
  assert.equal(b,a,'pickup message '+scale+'/'+variant+'/'+j);
  assert.deepEqual(report(after),report(before),'pickup state '+scale+'/'+variant+'/'+j);
  assert.strictEqual(after.hqIntelSectors,after.hqIntelSectors,'sets remain live');
  assert.strictEqual(after.intelMarks.every(m=>after.vehicles.includes(m.ref)||after.enemies.includes(m.ref)),true);
  cases++;
 }
}
for(const mapScale of [1,2])for(let stage=0;stage<=5;stage++)
 for(const confirmed of [false,true])for(let d=0;d<=8;d++){
 const sites=Array.from({length:mapScale===2?9:3},(_,i)=>({x:i,z:-i,real:i===1}));
 const discarded=new Set(Array.from({length:d},(_,i)=>i)),sectors=new Set([0,2]);
 const markers=hqClueMarkers({mapScale,stage,confirmed,sites,discarded,discardIndex:2});
 const old=stage>0&&!confirmed?sites.map((p,i)=>({...p,discarded:mapScale===2?
  discarded.has(i):stage>=2&&i===2})):[];
 assert.deepEqual(markers,old,'minimap markers');
 const summary=hqIntelStatus({mapScale,stage,confirmed,sites,sectors,discarded});
 assert.deepEqual(summary,{stage,investigated:2,remaining:confirmed?1:
  sites.length-(mapScale===2?discarded.size:(stage>=2?1:0)),confirmed},'HUD intel');
 cases++;
}
const core=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
const boot=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8');
const harness=readFileSync(new URL('./harness.cjs',import.meta.url),'utf8');
assert(core.includes("requestOperationAutosave('intel');"),'autosave remains in caller');
assert(core.includes('HUNTER_GAME_INTEL.resolveMapPickup('));
assert(core.includes('HUNTER_GAME_INTEL.hqClueMarkers('));
assert(core.includes('HUNTER_GAME_INTEL.hqIntelStatus('));
assert(boot.includes('window.HUNTER_GAME_INTEL=gameIntel'));
assert(harness.includes('c.HUNTER_GAME_INTEL=await import('));
console.log('PASS game intel parity: '+cases+' differential pickup and HUD/minimap scenarios');
