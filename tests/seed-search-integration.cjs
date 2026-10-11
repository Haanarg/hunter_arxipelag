(async()=>{
  const assert=require('assert');
  const game=await require('./harness.cjs')();
  const {el,run}=game;
  const search=el('seedSearchRun'),category=el('seedSearchCategory'),type=el('seedSearchType');
  assert.equal(category.value,'vehicle');
  assert.equal(type.value,'ferry','legacy ferry search stays the initial choice');
  const scenarios=[['vehicle','heli_combat',run('Object.keys(VT).length')+1],
    ['item','mapa_tanc',run('Object.keys(IT).length')+1],
    ['compound','hq',run('Object.keys(seedSearch.compounds).length')+1]];
  for(const [cat,selected,count] of scenarios){
    category.value=cat;category.onchange();
    assert.equal(type.options.length,count,cat+' exposes complete catalog');
    assert(type.options.some(o=>o.value===selected),selected+' option is present');
  }
  type.value='hq';
  el('seedSearchStart').value='1';
  el('seedSearchCount').value='1';
  el('seedSearchDistance').value='9000';
  search.disabled=false;
  // El generador real crea una llavor i el cercador consulta l'HQ.
  const promise=search.onclick();
  assert(search.disabled,'search button prevents concurrent runs');
  game.frame(16); // resume after yielded UI frame
  await promise;
  assert.equal(el('seedSearchResults').children.length,1,'one HQ result');
  const result=el('seedSearchResults').children[0];
  const expectedSeed=String(run('seed>>>0'));
  assert(result.children[0].children[1].textContent.includes('HQ enemic'),'HQ label rendered');
  assert(run('seedSearchMode===false&&MAP_SCALE===1&&S===4800'),'search restores world settings');
  result.children[2].onclick();
  assert(!search.disabled,'seed search can be reopened after returning to menu');
  el('seedSearchOpen').onclick();
  assert.equal(el('seedSearchScreen').style.display,'block','finder reopens');
  el('seedSearchBack').onclick();
  assert(!search.disabled,'search button still enabled after leaving finder');
  assert.equal(el('seedInput').value,expectedSeed,'effective seed is transferred to start menu');
  assert(!el('seedRandom').checked,'random seed disabled when applying a result');
  game.start(expectedSeed,1);
  assert.equal(run('seed>>>0'),Number(expectedSeed),'replaying a finder result preserves the real seed');
  assert(run('started===1&&!!terrainStream&&V.length>0'),
    'normal game build still restores terrain and vehicles');
  console.log(JSON.stringify({passed:true,scenarios:scenarios.length,
    checks:['category controls','real HQ search','seed selection','world restoration','game start']}));
})().catch(err=>{console.error(err);process.exitCode=1});
