const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=fs.readFileSync('src/game-core.js','utf8');
const world=fs.readFileSync('src/world-generation.js','utf8');
const compounds=fs.readFileSync('src/compound-generation.js','utf8');
const first=core.indexOf('function helicopterEnvironmentContact('),
  last=core.indexOf('// Les antenes i les parabòliques',first);
assert.ok(first>0&&last>first);
const trees=new Map(),buildings=[],heights=()=>0;
const ctx={VS:{heli:1},TG:trees,palmsDisabled:false,
  groundAt:(x,z)=>heights(x,z),
  buildingCandidates:()=>buildings,
  roofNearXZ:(b,x,z,r)=>Math.hypot(x-b.x,z-b.z)<=r?b.roof:null};
vm.createContext(ctx);
vm.runInContext(core.slice(first,last),ctx);
const heli={t:'heli',o:{userData:{skidContactHeight:.405,rotorContactHeight:3.87}},v:6,strafeV:0,verticalV:0};
const travel=(alt,x=0,z=0)=>ctx.helicopterEnvironmentContact(heli,
  {x,z,alt},{x,z,alt});
assert.equal(travel(30),null,'Un helicòpter alt no toca el terreny');
ctx.groundAt=(x)=>x>6?12:0;
assert.equal(travel(8)?.kind,'ground','Les puntes del rotor toquen el vessant');
ctx.groundAt=()=>0;
trees.set('0,0',[{p:true,alive:true,x:7,z:0,r:.6,s:1,y:0}]);
assert.equal(travel(2.3)?.kind,'tree','El rotor toca la capçada d’una palmera');
assert.equal(travel(28),null,'La palmera no bloqueja l’helicòpter a molta altura');
trees.clear();
buildings.push({x:5,z:0,roof:{bottom:5,top:6}});
assert.equal(travel(1.8)?.kind,'roof','El rotor col·lideix amb la teulada');
assert.match(core,/helicopterEnvironmentContact\(v,/);
assert.match(compounds,/if\(layout\.id==='hangar'\)\{/);
assert.match(world,/if\(hangarTanks<2\)/);
assert.match(world,/alternateHangar\+\+%2===0/);
assert.match(world,/else if\(t==='tanqueta'\)q=militaryCompoundSpot\(t\)/);
assert.match(world,/t==='tanqueta'\?militaryCompoundSpot\(t\)/);
console.log('OK: rotor i cos contra terreny, palmeres i sostres; vehicles militars');
