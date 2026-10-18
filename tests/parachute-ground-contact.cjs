const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/game-core.js','utf8');
const begin=source.indexOf('function parachuteRoofLanding(');
const end=source.indexOf('\n// Compartida per al salt voluntari',begin);
assert.ok(begin>0&&end>begin,'La funció de col·lisió amb teulades existeix');
const ctx={buildingCandidates:(x,z)=>x>=2&&x<=7&&Math.abs(z)<3?[{id:1}]:[],
  solidRoofAt:()=>({top:12,bottom:11})};
vm.createContext(ctx);
vm.runInContext(source.slice(begin,end),ctx);
assert.equal(ctx.parachuteRoofLanding(3,0,15,4,0,11),12,
  'El paracaigudista aterra sobre la teulada quan la travessa');
assert.equal(ctx.parachuteRoofLanding(0,0,15,6,0,11),12,
  'Un desplaçament lateral pot interceptar un sostre durant el fotograma');
assert.equal(ctx.parachuteRoofLanding(3,0,10,4,0,8),null,
  'No es teletransporta a un sostre que ja té a sobre');
assert.equal(ctx.parachuteRoofLanding(3,0,15,4,0,13),null,
  'No aterra abans que la caiguda arribi al sostre');
assert.match(source,/desiredX=-Math\.sin\(P\.hd\)\*f\*2\.8/);
assert.match(source,/fall\.leanF\+=/);
assert.match(source,/pl\.rotation\.z=playerFall\.leanS/);
assert.match(source,/const boots=pl\.userData\.boots/);
assert.match(source,/slopePitch=.*Math\.atan2\(frontY-backY/);
assert.match(source,/previous>=roof\.top-\.22/);
console.log('OK: sostres, deriva del paracaigudes i contacte visual amb el terreny');
