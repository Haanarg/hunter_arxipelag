// Focused generation checks on a straight shore, using the actual OBB helpers.
const assert=require('assert');
(async()=>{
  const game=await require('./harness.cjs')(),{run}=game;
  run(`hAt=(x,z)=>-x;B=[];islands=[{x:-40,z:0,r:100}];
    V=[{t:'moto_aquatica',x:2.5,z:0,hd:0},{t:'ferry',x:2.5,z:0,hd:0}];
    globalThis.originJet=V[0];globalThis.shifted=shiftJetSkiAlongCoast(originJet,originJet);`);
  assert(run('shifted&&Math.abs(shifted.x-2.5)<1e-6&&Math.abs(Math.abs(shifted.z)-100)<1e-6'),'move 100 m along shore, keeping water depth');
  run(`V.push({t:'llanxa',x:2.5,z:-100,hd:0},{t:'llanxa',x:2.5,z:100,hd:0});
    globalThis.second=shiftJetSkiAlongCoast(originJet,originJet);`);
  assert(run('second&&second.coastShift===200&&jetSkiSpotClear(second,originJet)'),'blocked 100 m candidates advance to another clear coastal segment');
  for(const half of [2400,4800]){
    run(`H=${half};ensureJetSkis((t,x,z,hd,meta)=>V.push({t,x,z,hd,...meta}));`);
    assert(run("V.filter(v=>v.t==='moto_aquatica').length>=4"));
    assert(run("V.filter(v=>v.t==='moto_aquatica').every(v=>jetSkiSpotClear(v,v))"));
  }
  run("E=[{t:'jeep',x:2.5,z:500,hd:0}];");assert(!run('jetSkiSpotClear({x:2.5,z:500,hd:0})'),'enemy vehicles also block spawning');
  const count=run('V.length');run('ensureJetSkis(()=>{throw Error("unexpected extra vehicle")})');assert.equal(run('V.length'),count);
  console.log(JSON.stringify({passed:true,checks:['100 m along coast','blocked destination','minimum four','no overlap with ferry or boats','both map bounds','idempotent final pass']}));
})().catch(e=>{console.error(e);process.exitCode=1});
