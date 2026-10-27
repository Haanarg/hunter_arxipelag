'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=fs.readFileSync(path.join(__dirname,'../src/game-core.js'),'utf8');
const world=fs.readFileSync(path.join(__dirname,'../src/world-generation.js'),'utf8');
const marine=fs.readFileSync(path.join(__dirname,'../src/marine-patrol.js'),'utf8');
const body=core.slice(core.indexOf('function revealMapPickup(kind,allSectors=false){'),core.indexOf('\nfunction useInvItem(id)'));
assert(body.startsWith('function revealMapPickup('));
function test(scale){
  const code=[
    'const MAP_SCALE='+scale+';',
    'const mapSector=(x,z)=>(x>=0?1:0)+(z>=0?2:0);',
    'const sectorMatches=(x,z,k)=>k==null||mapSector(x,z)===k;',
    'let hqMapKnown=false,hqIntelStage=0,intelMarks=[];',
    'const knownVehicleSectors={heli:new Set(),tanc:new Set()};',
    "const V=[{t:'tanc',x:-120,z:-120},{t:'tanc',x:120,z:-120},{t:'heli',x:-120,z:-120},{t:'heli_combat',x:120,z:-120}],E=[],P={x:-100,z:-100};",
    body,
    "revealMapPickup('mapa');assert.equal(hqIntelStage,1);assert.equal(hqMapKnown,false);",
    "revealMapPickup('mapa');assert.equal(hqIntelStage,2);assert.equal(hqMapKnown,false);",
    "revealMapPickup('mapa');assert.equal(hqIntelStage,3);assert.equal(hqMapKnown,true);",
    "revealMapPickup('mapa_tanc');assert.equal(intelMarks.length,"+(scale===2?1:2)+");",
    "P.x=100;revealMapPickup('mapa_tanc');assert.equal(intelMarks.length,2);",
    "P.x=-100;revealMapPickup('mapa_heli');assert.equal(intelMarks.length,"+(scale===2?3:4)+");",
    "revealMapPickup('mapa_heli',true);assert.equal(intelMarks.length,4);"
  ].join('\n');
  new Function('assert',code)(assert);
}
test(1);test(2);
assert.match(core,/const hqSectorChoice=MAP_SCALE===2/);
assert.match(world,/const activeSectors=MAP_SCALE===2/);
assert.match(world,/ensureVehicleCount\('tanc',2,sector\)/);
assert.match(world,/ensureDistributedCount\('heli',2,sector\)/);
assert.match(world,/ensureDistributedCount\('heli_combat',1,sector\)/);
assert.match(world,/while\(countVehicles\('llanxa_coets',sector\)<2/);
assert.match(world,/while\(countVehicles\('moto_aquatica',sector\)<4/);
assert.match(world,/hqIntelSites=hqPositions/);
assert.match(marine,/MAP_SCALE===2\?2:1/);
console.log('OK sector vehicles, HQ clues, and regional charts');
