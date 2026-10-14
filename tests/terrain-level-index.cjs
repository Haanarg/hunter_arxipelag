const assert = require('node:assert/strict');
(async () => {
  const game = await require('./harness.cjs')();
  for (const [seed, scale] of [['67', 1], ['12345', 2]]) {
    game.start(seed, scale);
    const report = game.run(`(()=>{
      let compared=0;
      let different=0;
      const exact=(x,z)=>{
        let h=rawHAt(x,z);
        for (const m of terrainLevels) {
          const dx=x-m.x,dz=z-m.z;
          const lx=dx*m.c+dz*m.s,lz=-dx*m.s+dz*m.c;
          const ox=Math.max(0,Math.abs(lx)-m.hw),oz=Math.max(0,Math.abs(lz)-m.hd);
          const out=Math.hypot(ox,oz);
          if(out<m.blend) {
            const k=out<=0?1:1-smooth01(out/m.blend);
            h=h+(m.y-h)*k;
          }
        }
        return h;
      };
      const check=(x,z)=>{compared++;if(!Object.is(hAt(x,z),exact(x,z)))different++};
      for(let x=-H+20;x<H;x+=213)for(let z=-H+20;z<H;z+=223)check(x,z);
      for(const m of terrainLevels) {
        for(const dx of [-m.hw-m.blend,0,m.hw+m.blend])
          for(const dz of [-m.hd-m.blend,0,m.hd+m.blend]){
            const x=m.x+dx*m.c-dz*m.s,z=m.z+dx*m.s+dz*m.c;
            check(x,z);check(x+.001,z-.001);
          }
      }
      return {compared,different,areas:terrainLevels.length,buckets:terrainLevelGrid.size};
    })()`);
    assert(report.areas>2 && report.buckets>2);
    assert.equal(report.different, 0, JSON.stringify(report));
    console.log('PASS terrain level index', seed, scale, report);
  }
})().catch(error=>{console.error(error);process.exitCode=1});
