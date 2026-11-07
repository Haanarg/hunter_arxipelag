#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const core=read('src/game-core.js'),compound=read('src/compound-generation.js'),
  world=read('src/world-generation.js'),layouts=read('src/compound-phase4-layouts.mjs');
const start=core.indexOf('function rollCivilianHouseLoot(random){'),
  end=core.indexOf('\nfunction itemInsideHangar(',start);
assert(start>=0&&end>start,'civilian loot roll found');
const roll=new Function(core.slice(start,end)+'\nreturn rollCivilianHouseLoot;')();
let value=123456789;
const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296};
const totals={none:0,med:0,arma:0,cisalla:0},N=200000;
for(let i=0;i<N;i++){
  const item=roll(random);assert(item===null||item==='med'||item==='arma'||item==='cisalla');
  totals[item??'none']++;
}
const placed=N-totals.none;
assert(Math.abs(placed/N-.50)<.007,'50% chance of any object');
assert(Math.abs(totals.med/placed-.60)<.015,'60% medicine among found objects');
assert(Math.abs(totals.arma/placed-.30)<.015,'30% ammunition among found objects');
assert(Math.abs(totals.cisalla/placed-.10)<.012,'10% bolt cutters among found objects');
assert.match(core,/if\(b\?\.civilian&&!CIVILIAN_HOUSE_LOOT\.has\(t\)\)return false/);
assert.match(core,/buildingItemCount\(b\)>=\(b\.civilian\?1:MAX_BUILDING_ITEMS\)/);
const buildingStart=compound.indexOf('if(layout.civilian)for(const house of record.buildings){');
const buildingEnd=compound.indexOf('\n  const lootKinds=',buildingStart);
assert(buildingStart>=0&&buildingEnd>buildingStart,'single house roll at generation');
const buildingRoll=new Function('layout','record','R','rollCivilianHouseLoot','addIt','items',
  compound.slice(buildingStart,buildingEnd));
const record={buildings:[],loot:[]},items=[],seen=new Map();
for(let i=0;i<1000;i++)record.buildings.push({civilianHut:i%4!==0,id:i});
buildingRoll({civilian:true},record,random,roll,(kind,house)=>{
  assert(!seen.has(house.id),'each building may only receive one item');
  seen.set(house.id,kind);items.push({t:kind,building:house});return true;
},items);
assert([...seen.keys()].every(k=>k%4!==0),'only residential wooden houses receive random loot');
assert(record.loot.length===seen.size,'loot registered on compound');
assert.match(compound,/for\(const loot of layout\.civilian\?\[\]:layout\.loot\)/,
  'civilian fixed loot bypassed');
assert.match(world,/if\(b\.civilian\)continue;/,'civilian houses excluded from military random loot');
assert.match(layouts,/l\.loot=\[\];/,'settlement designs have no fixed medkit');
for(const needle of ["loot:[],entrances:[[0,-60]]","loot:[],entrances:[[0,-95]","loot:[],entrances:[[18,-70]"])
  assert(layouts.includes(needle),'civilian authored loot removed: '+needle);
console.log('OK civilian houses: 50% total, 60/30/10 weighted, one permitted item, no fixed/extra loot');
