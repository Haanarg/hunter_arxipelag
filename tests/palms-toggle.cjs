const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),
        ui=fs.readFileSync(path.join(root,'src/ui.js'),'utf8');
  assert(/<input id="disablePalms" type="checkbox">/.test(html),'the menu defaults to palms enabled (unchecked)');
  assert(ui.includes('id="disablePalmsPause"'),'the live switch is accessible from pause');
  const game=await require('./harness.cjs')();
  game.start('67');
  const results=game.run(`(()=>{
    const visibleInitially=PM.trunk.visible&&!palmsDisabled&&PM.stats.totalPalms>0;
    const sample=PL.find(t=>t.p&&t.alive);
    const beforeSeed=seed,beforeTerrain=hAt(P.x,P.z),
          beforeCount=PL.length,beforeWorld=V.length;
    const startValue=document.getElementById('disablePalms').checked;
    const disabled=setPalmsDisabled(true);
    const noVisibleMeshes=!PM.trunk.visible;
    const noPalmHit=sample&&!treeAt(sample.x,sample.z,.001)?.p;
    const noPalmCollision=sample&&!(treeHit(sample.x,sample.z,.001)&&
      (treeAt(sample.x,sample.z,.001)?.p));
    const stillExists=PL.length===beforeCount&&PM.stats.totalPalms>0;
    const unchecked=setPalmsDisabled(false);
    const visibleAgain=PM.trunk.visible&&!palmsDisabled;
    const worldSame=seed===beforeSeed&&hAt(P.x,P.z)===beforeTerrain&&
      V.length===beforeWorld&&PL.length===beforeCount;
    return {visibleInitially,startValue:startValue===false,disabled,
      noVisibleMeshes,noPalmHit,noPalmCollision,stillExists,
      unchecked:unchecked===false,visibleAgain,worldSame};
  })()`);
  for(const [name,passed] of Object.entries(results))assert(passed,name+' failed '+JSON.stringify(results));
  console.log('PASS: el menú té la casella buida, l’alternança és instantània i la llavor no canvia',JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1});
