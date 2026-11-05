'use strict';
// Regressió: LOD costaner progressiu sense canviar el relleu ni la física.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/terrain.js'),'utf8');
const context=vm.createContext({console,Math,Object});
context.window=context;
vm.runInContext(source,context,{filename:'src/terrain.js'});
const needsHigh=context.hunterCoastNeedsHighDetail;
assert.equal(typeof needsHigh,'function');
const limits=[
  ['desktop',1120,1280],
  ['mobile',760,880],
  ['ultra',500,580]
];
for(const [profile,upgradeAt,demoteAt] of limits){
  assert.equal(needsHigh(upgradeAt-1,-1,profile),true,profile+' near coast starts at high LOD');
  assert.equal(needsHigh(upgradeAt,-1,profile),false,profile+' distant coast stays medium LOD');
  assert.equal(needsHigh(demoteAt-1,3,profile),true,profile+' existing high LOD survives jitter');
  assert.equal(needsHigh(demoteAt,3,profile),false,profile+' far coast leaves high LOD');
  assert.equal(needsHigh(2500,-1,profile),false,profile+' distant coastline no longer forces full detail');
}
assert.equal(needsHigh(1500,-1,'unknown'),false);
assert.match(source,/tile\.coastline&&\s*hunterCoastNeedsHighDetail\(distance,tile\.level,profile\)/);
assert.match(source,/return Math\.max\(level,coastHighDetail\?3:floor\)/);
assert.doesNotMatch(source,/tile\.coastline&&distance<3000\?3:floor/);
console.log('OK · coast LOD profiles, hysteresis, and progressive targetLevel');
