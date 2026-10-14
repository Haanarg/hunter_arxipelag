// Benchmarks an actual synchronous world generation with real wall-clock timing.
// The normal regression harness uses deterministic simulated frame timestamps.
const assert=require('node:assert/strict');
(async()=>{
  const create=require('./harness.cjs');
  for(const [seed,scale] of [['67',1],['12345',1],['675',2]]){
    const game=await create();
    game.context.performance.now=()=>Number(process.hrtime.bigint())/1e6;
    const start=performance.now();
    game.start(seed,scale);
    const stats=game.context.HUNTER_BUILD_STATS;
    const stages=stats?.stages||{};
    const ranked=Object.entries(stages).sort((a,b)=>b[1]-a[1]);
    console.log('BUILD_PROFILE',JSON.stringify({seed,scale,realMs:Math.round(performance.now()-start),totalMs:Math.round(stats.totalMs),stages,ranked:ranked.slice(0,12),compounds:game.run('world.userData.compounds.length'),vehicles:game.run('V.length'),buildings:game.run('B.length')}));
    assert(Object.keys(stages).length>=10,'Missing detailed world-generation stages');
    assert(stats.totalMs>=0);
  }
})().catch(error=>{console.error(error);process.exitCode=1});
