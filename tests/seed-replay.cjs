const assert=require('node:assert/strict');
(async()=>{
 const g=await require('./harness.cjs')();
 const seeds=g.run("({numeric:seedFromText('2407759483'),max:seedFromText('4294967295'),negative:seedFromText('-1'),wrap:seedFromText('4294967296'),huge:seedFromText('18446744073709551617'),text:seedFromText('arxipèlag')})");
 assert.equal(seeds.numeric,2407759483);
 assert.equal(seeds.max,4294967295);
 assert.equal(seeds.negative,4294967295);
 assert.equal(seeds.wrap,0);
 assert.equal(seeds.huge,1);
 assert(Number.isInteger(seeds.text));
 const snapshot=()=>JSON.parse(JSON.stringify(g.run("({effectiveSeed:seed>>>0,requestedSeed,scale:MAP_SCALE,initial:P.base,hq:HQ,islands:islands.map(i=>[i.x,i.z,i.r,i.peakX,i.peakZ]),compounds:seedCompounds,vehicles:V.map(v=>[v.t,v.x,v.z])})")));
 // Captura real d'Android; la llavor del HUD s'ha de reproduir literalment.
 g.start('2407759483');const original=snapshot();
 assert.equal(original.requestedSeed,2407759483);
 assert.equal(original.effectiveSeed,2407759483);
 g.start(String(original.effectiveSeed));
 assert.deepEqual(snapshot(),original,'retyping the HUD seed restores the entire map');
 g.start('12345');const another=snapshot();
 assert.equal(another.requestedSeed,12345);
 assert.notDeepEqual(another.islands,original.islands,'different input changes island layout');
 const finder=g.run("(()=>{requestedSeed=1;build();const first={seed,base:[P.base.x,P.base.z],hq:[HQ.x,HQ.z]};requestedSeed=first.seed;build();return{first,last:{seed,base:[P.base.x,P.base.z],hq:[HQ.x,HQ.z]}}})()");
 assert.deepEqual(JSON.parse(JSON.stringify(finder.first)),JSON.parse(JSON.stringify(finder.last)),
  'search result effective seed matches next loaded world');
 console.log('PASS: literal seeds, exact 32bit parsing, HUD replay, changing seeds, and search',
  JSON.stringify({userSeed:original.effectiveSeed,other:another.effectiveSeed}));
})().catch(err=>{console.error(err);process.exitCode=1});