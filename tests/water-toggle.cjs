const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
  const root=path.resolve(__dirname,'..'),
        html=fs.readFileSync(path.join(root,'index.html'),'utf8'),
        ui=fs.readFileSync(path.join(root,'src/ui.js'),'utf8');
  assert(/<input id="disableWater" type="checkbox">/.test(html),
    'water is enabled by default: the menu checkbox must be unchecked');
  assert(ui.includes('id="disableWaterPause"'),
    'water switch is accessible while playing');
  const game=await require('./harness.cjs')();
  const pre=game.run(`(()=>{
    const before=water.surfaceHeight(7,10,1.5),
          oceanInScene=water.mesh.parent===scene&&water.deep.parent===scene,
          initiallyVisible=water.mesh.visible&&water.deep.visible&&!waterDisabled;
    setWaterDisabled(true);
    const hidden=!water.mesh.visible&&!water.deep.visible&&waterDisabled&&
      window.HUNTER_WATER_DISABLED===true&&
      document.getElementById('disableWater').checked;
    const unchanged=water.surfaceHeight(7,10,1.5)===before;
    waves(2.5);
    const simulated=water.uniforms.time.value===2.5;
    setWaterDisabled(false);
    const restored=water.mesh.visible&&water.deep.visible&&!waterDisabled&&
      !document.getElementById('disableWater').checked;
    return {oceanInScene,initiallyVisible,hidden,unchanged,simulated,restored};
  })()`);
  for(const [name,pass] of Object.entries(pre))assert(pass,'immediate '+name);
  game.el('disableWater').checked=true;
  game.start('67');
  const world=game.run(`(()=>{
    const terrain=hAt(P.x,P.z),surface=wy(P.x,P.z,1.3),
          oceanMeshesDisabled=waterDisabled&&!water.mesh.visible&&!water.deep.visible;
    const original={seed,map:S,terrain,vehicles:V.length,waterGeometry:water.geometry,
      surface};
    // El nou mapa conserva la física i la geometria, encara que sigui invisible.
    setWaterDisabled(false);
    const recovered=!waterDisabled&&water.mesh.visible&&water.deep.visible;
    const physicsSame=wy(P.x,P.z,1.3)===original.surface;
    setWaterDisabled(true);
    const worldUnchanged=seed===original.seed&&S===original.map&&
      hAt(P.x,P.z)===original.terrain&&V.length===original.vehicles&&
      water.geometry===original.waterGeometry;
    return {oceanMeshesDisabled,recovered,physicsSame,worldUnchanged};
  })()`);
  for(const [name,pass] of Object.entries(world))assert(pass,'during game '+name);
  game.run('panel("pause")');
  game.el('performanceMenu').onclick();
  const pause=game.el('disableWaterPause');
  assert.equal(pause.checked,true,'pause controls reflect initial water setting');
  pause.onchange({target:{checked:false}});
  assert(game.run('!waterDisabled && water.mesh.visible && water.deep.visible'),
    'pause control turns sea back on immediately');
  pause.onchange({target:{checked:true}});
  assert(game.run('waterDisabled && !water.mesh.visible && !water.deep.visible'),
    'pause control hides all ocean meshes again');
  console.log('PASS: water mesh+deep toggles, pre-game default, pause, unchanged seed and wave physics',
    JSON.stringify({pre,world}));
})().catch(error=>{console.error(error);process.exitCode=1});
