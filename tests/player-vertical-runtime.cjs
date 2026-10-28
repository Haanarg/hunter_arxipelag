const assert=require('node:assert/strict');
const legacy=require('./fixtures/player-vertical-v0612.cjs');
(async()=>{
  const g=await require('./harness.cjs')();g.start('67');
  for(const parachute of [false,true]){
    g.context.testChute=parachute;
    g.run(`cv=null;scopeActive=false;playerEject=null;cheats.fly=false;cheats.god=true;paused=false;
      P.hd=.8;P.y=1000;playerFall={y:1000,vy:0,vx:12,vz:4,t:0,leanF:0,leanS:0,startHeight:1000,parachute:testChute};`);
    for(let k=0;k<60;k++){
      const before=JSON.parse(g.run('JSON.stringify({p:P,fall:playerFall,limit:H-2})'));
      const expected=legacy.air({...before.p},{...before.fall},0,0,1/30,before.limit);
      g.run('update(1/30,elapsed)');
      const after=JSON.parse(g.run('JSON.stringify({p:P,fall:playerFall})'));
      assert.equal(after.p.x,expected.x);assert.equal(after.p.z,expected.z);assert.equal(after.p.y,expected.fall.y);
      assert.deepEqual(after.fall,expected.fall,'actual game update preserves falling trajectory');
    }
  }
  console.log('vertical runtime: freefall and parachute trajectories through actual game update passed');
})().catch(e=>{console.error(e);process.exitCode=1});
