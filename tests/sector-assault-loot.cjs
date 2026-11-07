#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const generator=read('src/world-generation.js'),coop=read('src/coop-world-runtime.js');
assert(generator.includes("'fusell_assalt','fusell_assalt'"),
 'moderate random assault-rifle weight (2/13 eligible loot choices)');
assert(generator.indexOf('const assaultLootBuildings=')<generator.indexOf('const pool='),
 'sector guarantees are reserved before random loot fills buildings');
assert(generator.includes("if(!placed)throw new Error("),
 'a missing sector rifle cannot be silently ignored');
assert(coop.includes("fusell_assalt:['assault',1]"),
 'native coop converts the exact world pickup into assault-rifle inventory');
(async()=>{
 const game=await require('./harness.cjs')();
 game.run("seedSearchMode=true;seedSearchCategoryEl.value='item'");
 for(const [seed,scale] of [['67',1],['148',2]]){
  game.start(seed,scale);
  const counts=JSON.parse(game.run(`JSON.stringify((()=>{
    const sectors=MAP_SCALE===2?[0,1,2,3]:[null],
      rifles=items.filter(it=>it.t==='fusell_assalt'),
      byBuilding=new Map();
    for(const item of items)if(item.building)
      byBuilding.set(item.building,(byBuilding.get(item.building)||0)+1);
    return {perSector:sectors.map(sector=>rifles.filter(it=>sectorMatches(it.x,it.z,sector)).length),
      total:rifles.length,overfilled:[...byBuilding.values()].filter(n=>n>3).length,
      invalid:rifles.filter(it=>it.building?.civilian||it.building?.hangar).length};
  })())`));
  assert.equal(counts.perSector.length,scale===2?4:1);
  assert(counts.perSector.every(n=>n>=1),
   'at least one assault rifle per sector: '+seed+'/'+scale+' '+JSON.stringify(counts));
  assert.equal(counts.overfilled,0,'at most three items per military building');
  assert.equal(counts.invalid,0,'no assault rifles in houses or hangars');
  console.log('PASS assault rifle sector quotas '+seed+'/'+scale+' '+JSON.stringify(counts));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
