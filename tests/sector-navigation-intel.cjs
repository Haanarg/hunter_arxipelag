'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=fs.readFileSync(path.join(__dirname,'../src/game-core.js'),'utf8');
const world=fs.readFileSync(path.join(__dirname,'../src/world-generation.js'),'utf8');
const marine=fs.readFileSync(path.join(__dirname,'../src/marine-patrol.js'),'utf8');
const pickup=core.slice(core.indexOf('function revealMapPickup('),core.indexOf('\nfunction executePlayerUseItem('));
assert(pickup.startsWith('function revealMapPickup('),'HQ map pickup exists');
function progression(scale,gameIntel){
  const setup=[
    'const window={HUNTER_GAME_INTEL:gameIntel};',
    "const requestOperationAutosave=()=>{};",
    'const MAP_SCALE='+scale+';,
    'const mapSector=(x,z)=>(x>=0?1:0)+(z>=0?2:0);',
    'const sectorMatches=(x,z,k)=>k==null||mapSector(x,z)===k;',
    'let hqMapKnown=false,hqIntelStage=0,intelMarks=[];',
    'let hqIntelEliminationOrder=[1,2,3,4,5,6,7,8];',
    'const hqIntelSectors=new Set(),hqIntelDiscarded=new Set();',
    'const knownVehicleSectors={heli:new Set(),tanc:new Set()};',
    "const V=[{t:'tanc',x:-120,z:-120},{t:'tanc',x:120,z:-120},{t:'heli',x:-120,z:-120},{t:'heli_combat',x:120,z:-120}],E=[],P={x:-100,z:-100};",
    pickup,
  ];
  const test=scale===2?[
    "assert.match(revealMapPickup('mapa',false,0),/Nou possibles/);",
    "assert.equal(hqIntelStage,1);assert.equal(hqIntelDiscarded.size,0);",
    "assert.match(revealMapPickup('mapa',false,0),/ja ha aportat/);",
    "assert.equal(hqIntelStage,1);assert.equal(hqIntelDiscarded.size,0);",
    "assert.match(revealMapPickup('mapa',false,2),/queden 6/);",
    "assert.equal(hqIntelStage,2);assert.equal(hqIntelDiscarded.size,3);",
    "assert.match(revealMapPickup('mapa',false,1),/queden 3/);",
    "assert.equal(hqIntelStage,3);assert.equal(hqIntelDiscarded.size,6);",
    "assert.equal(hqIntelDiscarded.has(0),false);assert.equal(hqMapKnown,false);",
    "assert.match(revealMapPickup('mapa',false,3),/HQ enemic localitzat/);",
    "assert.equal(hqIntelStage,4);assert.equal(hqIntelSectors.size,4);",
    "assert.equal(hqMapKnown,true);",
  ]:[
    "revealMapPickup('mapa');assert.equal(hqIntelStage,1);assert.equal(hqMapKnown,false);",
    "revealMapPickup('mapa');assert.equal(hqIntelStage,2);assert.equal(hqMapKnown,false);",
    "revealMapPickup('mapa');assert.equal(hqIntelStage,3);assert.equal(hqMapKnown,true);",
  ];
  const vehicles=[
    "P.x=-100;revealMapPickup('mapa_tanc');assert.equal(intelMarks.length,"+(scale===2?1:2)+");",
    "P.x=100;revealMapPickup('mapa_tanc');assert.equal(intelMarks.length,2);",
    "P.x=-100;revealMapPickup('mapa_heli');assert.equal(intelMarks.length,"+(scale===2?3:4)+");",
    "revealMapPickup('mapa_heli',true);assert.equal(intelMarks.length,4);"
  ];
  new Function('assert','gameIntel',[...setup,...test,...vehicles].join('\n'))(assert,gameIntel);
}

const block=world.slice(world.indexOf('// Small maps keep three HQ candidates.'),
  world.indexOf('\nconst rb=B.slice(6);',world.indexOf('// Small maps keep three HQ candidates.')));
assert.match(block,/hqIntelEliminationOrder/);
function siteGeneration(scale,seed){
  const scenario=[
    'const MAP_SCALE='+scale+',seed='+seed+';',
    'const pa={x:-900,z:-900},HQ={x:880,z:860};',
    'const mapSector=(x,z)=>(x>=0?1:0)+(z>=0?2:0);',
    'const sectorMatches=(x,z,k)=>k==null||mapSector(x,z)===k;',
    'const islands=[];',
    'for(let k=0;k<4;k++)for(let j=0;j<18;j++){const x=(k%2?1:-1)*(420+200*(j%5)),z=(k&2?1:-1)*(430+190*Math.floor(j/5)),r=410;islands.push({x,z,r,peakX:x+30,peakZ:z+25});}',
    'const islandsInSector=k=>islands.filter(i=>sectorMatches(i.x,i.z,k));',
    'const hAt=(x,z)=>islands.some(i=>Math.hypot(i.x-x,i.z-z)<i.r)?5:-5;',
    "const world={userData:{compounds:islands.map(i=>({id:'hangar',x:i.x,z:i.z,layout:{friendly:false,civilian:false}}))}};",
    'const mul=n=>{let state=n>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}};',
    'let hqIntelSites=[],hqIntelEliminationOrder=[],hqDiscardIndex=-1;',
    block,
    'return {sites:hqIntelSites,order:hqIntelEliminationOrder};'
  ].join('\n');
  const {sites,order}=new Function(scenario)();
  assert.equal(sites.length,scale===2?9:3);
  assert.equal(sites.filter(p=>p.real).length,1);
  assert.equal(order.length,sites.length-1);
  assert.equal(new Set(order).size,order.length);
  assert(!order.some(i=>sites[i].real),'the real HQ cannot be eliminated');
  if(scale===2){
    assert.equal(sites.filter(p=>p.x<0&&p.z<0).length,0,'no candidates in starting sector');
    for(const sector of [1,2,3])
      assert.equal(sites.filter(p=>(p.x>=0?1:0)+(p.z>=0?2:0)===sector).length,3);
  }
}
for(const seed of [1,2,3,45678,1234567,4294967295]){
  siteGeneration(1,seed);siteGeneration(2,seed);
}
assert.match(world,/hqIntelSectors\.clear\(\)/);
assert.match(core,/mapSector\(it\.x,it\.z\)/);
assert.match(marine,/MAP_SCALE===2\?2:1/);
import('../src/game-intel-core.mjs').then(gameIntel=>{
  progression(1,gameIntel);progression(2,gameIntel);
  console.log('OK: 9/6/3/1 HQ intel, unique quadrants, true-HQ safety, sector maps, candidate geography');
}).catch(error=>{console.error(error);process.exitCode=1});
