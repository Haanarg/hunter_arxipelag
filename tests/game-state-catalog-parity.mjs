import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createItemCatalog,createEnemyProfiles} from '../src/game-catalog-core.mjs';
import {createIntelCollections,createVisibilityCounters,createDrawCounters} from '../src/game-state-core.mjs';

// Fingerprint of JSON.stringify({ICON,IT}) from the untouched inlined
// game-core.js at version 0.6.128. Includes every SVG, accent, size,
// item name and user-visible description in original insertion order.
function fnv64(value){
 let h=0xcbf29ce484222325n;
 for(let i=0;i<value.length;i++)
  h=BigInt.asUintN(64,(h^BigInt(value.charCodeAt(i)))*0x100000001b3n);
 return h.toString(16).padStart(16,'0');
}
const baseline='dfbbb852b2d46069';
const first=createItemCatalog(),second=createItemCatalog();
assert.equal(fnv64(JSON.stringify(first)),baseline,'legacy ICON/IT content fingerprint');
assert.deepEqual(first,second,'same catalog data for each game runtime');
assert.notStrictEqual(first,second,'a fresh catalog per game');
assert.notStrictEqual(first.ICON,second.ICON,'independent icon dictionary');
assert.notStrictEqual(first.IT,second.IT,'independent item dictionary');
assert.equal(Object.keys(first.ICON).length,14);
assert.equal(Object.keys(first.IT).length,13);
for(const [key,entry] of Object.entries(first.IT)){
 assert.equal(entry.icon,first.ICON[key],key+' keeps original icon identity');
 assert(Array.isArray(entry.s)&&entry.s.length===3,key+' geometry scale');
 assert.equal(typeof entry.usable,'boolean');
}
assert(first.ICON.med.includes('<svg'));
assert(first.IT.franctirador.desc.includes('5 PV'));
assert.equal(first.IT.mapa_heli.n,'Mapa d’helicòpters');
first.IT.med.n='Canvi local';first.ICON.med='Canvi local';
assert.equal(second.IT.med.n,'Farmaciola');
assert(second.ICON.med.includes('<svg'),'no catalog leak across game harnesses');

// Snapshot of the original seven EC profiles. All inputs are injected:
// the factory must not read globals or change the balance object.
function originalEnemyProfiles(balance,tanketteInterval){
 const p=balance.people,v=balance.vehicles,w=balance.weapons;
 return {
  soldat:{hp:p.soldier,sp:7,rng:32,rate:1.1,dmg:w.rifle,spl:0,r:2},
  jeep:{hp:v.cotxe,sp:22,rng:75,rate:1.1,dmg:w.rifle,spl:0,r:3.9},
  tanqueta:{hp:v.tanqueta,sp:13,rng:42,rate:tanketteInterval,dmg:w.tankette,spl:0,r:4.5},
  tanc:{hp:v.tanc,sp:8,rng:100,rate:5,dmg:w.tank,spl:7,r:6.8},
  torre:{hp:w.bazooka,sp:0,rng:0,rate:0,dmg:0,spl:0,r:1},
  patrulla_marina:{hp:v.llanxa,sp:20,rng:245,rate:.4,dmg:w.rifle,spl:0,r:7.5},
  general:{hp:p.general,sp:1.45,rng:35,rate:.9,dmg:w.pistol,spl:0,r:2}
 };
}
let rng=0x12984917;
const next=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return (rng>>>0)/4294967296};
const val=()=>Math.round(next()*1000)/10;
for(let i=0;i<360;i++){
 const balance={people:{soldier:val(),general:val()},
  vehicles:{cotxe:val(),tanqueta:val(),tanc:val(),llanxa:val()},
  weapons:{rifle:val(),tankette:val(),tank:val(),bazooka:val(),pistol:val()}},
  before=JSON.stringify(balance),interval=val();
 const current=createEnemyProfiles(balance,interval);
 assert.deepEqual(current,originalEnemyProfiles(balance,interval),'enemy profile '+i);
 assert.equal(JSON.stringify(balance),before,'enemy balance never mutated '+i);
}

// Old visual and intel state defaults, with independent mutable containers.
const expectedVisibility={buildings:0,fences:0,props:0,vehicles:0,enemies:0,
 items:0,fauna:0,antennas:0,terrainOccluded:0};
const expectedEnemyLod={full:0,mid:0,far:0,hidden:0,vehicleFull:0};
const expectedDraw={terreny:0,edificis:0,filferrades:0,vehicles:0,
 enemics:0,vegetacio:0,decoracio:0,objectes:0,fauna:0,
 jugador:0,mar:0,cel:0,efectes:0,altres:0};
const counters=createVisibilityCounters(),independentCounters=createVisibilityCounters();
assert.deepEqual(counters.visibilityStats,expectedVisibility);
assert.deepEqual(counters.enemyLodStats,expectedEnemyLod);
counters.visibilityStats.fauna=19;
assert.equal(independentCounters.visibilityStats.fauna,0,'new counters for new runtime');
const firstDraw=createDrawCounters(),secondDraw=createDrawCounters();
assert.deepEqual(firstDraw.renderCategories,expectedDraw);
for(const key of ['shadowRenderCategories','renderOtherDetails','vehicleDrawTypes',
 'vehicleDrawParts','vehicleShadowTypes','vehicleFleet']){
 assert.deepEqual(firstDraw[key],{},'initial draw state: '+key);
 firstDraw[key].sample=2;
 assert.deepEqual(secondDraw[key],{},'no draw state leak: '+key);
}
firstDraw.renderCategories.mar=15;
assert.equal(secondDraw.renderCategories.mar,0);
const intel=createIntelCollections(),separateIntel=createIntelCollections();
assert(intel.hqIntelSectors instanceof Set);
assert(intel.hqIntelDiscarded instanceof Set);
assert(intel.knownVehicleSectors.heli instanceof Set);
assert(intel.knownVehicleSectors.tanc instanceof Set);
for(const s of [intel.hqIntelSectors,intel.hqIntelDiscarded,
 intel.knownVehicleSectors.heli,intel.knownVehicleSectors.tanc])
 assert.equal(s.size,0);
intel.hqIntelSectors.add(1);intel.knownVehicleSectors.heli.add(3);
assert.equal(separateIntel.hqIntelSectors.size,0);
assert.equal(separateIntel.knownVehicleSectors.heli.size,0);
assert.notStrictEqual(intel.knownVehicleSectors.heli,intel.knownVehicleSectors.tanc);

// Integration: preserve legacy classic script identifiers for other modules.
const core=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8'),
 boot=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8'),
 harness=readFileSync(new URL('./harness.cjs',import.meta.url),'utf8');
assert(core.includes('window.HUNTER_GAME_CATALOG.createItemCatalog()'));
assert(core.includes('window.HUNTER_GAME_CATALOG.createEnemyProfiles('));
for(const init of ['createIntelCollections()','createVisibilityCounters()','createDrawCounters()'])
 assert(core.includes(init),'missing original state binding '+init);
assert(!core.includes('const ICON={'),'catalog declarations removed from game-core');
assert(!core.includes('const EC={'),'enemy profile declarations removed from game-core');
assert(boot.includes('window.HUNTER_GAME_CATALOG=gameCatalog'));
assert(boot.includes('window.HUNTER_GAME_STATE=gameState'));
assert(harness.includes('c.HUNTER_GAME_CATALOG=await import('));
assert(harness.includes('c.HUNTER_GAME_STATE=await import('));
console.log('PASS game initial state/catalog parity: 13 item types, 14 icon strings, '+
 '360 enemy balance profiles, fresh intel/visual/draw containers');
