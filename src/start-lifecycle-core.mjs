// Cicle de vida de l'arrencada: estat d'opcions, senyal de cancel·lació
// i visualització del progrés. No importa cap sistema del joc ni fa RNG.
// El nucli continua governant els desaments, el generador i l'activació.
export function resolveStartOptions({
  difficulty,stressPreset=null,readScale,randomSeed,readSeedText,seedFromText
}){
  // L'auditoria no ha de llegir els controls ni la llavor ordinària.
  if(stressPreset)return {difficulty,scale:stressPreset.scale,seed:stressPreset.seed};
  return {difficulty,scale:readScale(),
    seed:randomSeed()?null:seedFromText(readSeedText()||'hunter')};
}

export function normalizeStartState({difficulty,scale,seed},seedFromText){
  const mapScale=+scale===2?2:1,size=4800*mapScale;
  return {difficulty:+difficulty,mapScale,size,halfSize:size/2,
    requestedSeed:seed==null?null:seedFromText(seed)};
}

export function createGenerationAttempt(document){
  const listeners=new Set(),signal={aborted:false,
    addEventListener(type,fn){if(type==='abort')listeners.add(fn)},
    removeEventListener(type,fn){if(type==='abort')listeners.delete(fn)}};
  // Conservam l'ordre dels avisos, incloent la còpia prèvia dels listeners.
  const cancel=()=>{signal.aborted=true;for(const fn of [...listeners])fn()};
  const loading=document.getElementById('generationLoading'),
    label=document.getElementById('generationStatus'),
    bar=document.getElementById('generationProgress');
  const controls=[...document.querySelectorAll('#ini button, #ini input, #ini select')],
    disabled=controls.map(el=>el.disabled);
  function report(state){
    const count=Number.isFinite(state.completed)?state.completed:null,
      total=Number.isFinite(state.total)?state.total:null;
    label.textContent=state.stage+(count===null?'':(' · '+count+
      (total===null?'':' / '+total)+(state.unit?' '+state.unit:'')));
    if(total>0&&count!==null){bar.max=total;bar.value=Math.min(total,count)}
    else bar.removeAttribute('value');
  }
  function enter(){
    loading.hidden=false;
    controls.forEach(el=>el.disabled=true);
  }
  function leave(){
    controls.forEach((el,i)=>el.disabled=disabled[i]);
    loading.hidden=true;
  }
  return Object.freeze({signal,cancel,report,enter,leave});
}

// Descartar una partida generada o una generació parcial/cancel·lada.
// Les callbacks conserven els bindings del runtime clàssic; no s'hi
// traslladen recursos ni col·leccions a cap estat global independent.
// Ordre explícit (important per al cicle de vida de desaments i inputs):
// registres -> opcionals -> terreny -> escena -> entitats -> pools ->
// índexs -> transitoris -> controls -> rellotge.
// Sense try/finally: una excepció interromp el procés al mateix punt
// que al contracte anterior; el caller conserva el tractament de l'error.
export function cleanupGeneratedWorld({
  clearOperations,resetOptionalSystems,
  terrainStream,forgetTerrainStream,
  world,scene,resources,forgetWorld,
  resetEntities,PL,FA,TG,resetTerrainLevels,terrainLevelGrid,
  resetTransients,clearKeys,resetSimulationClock
}){
  clearOperations();
  resetOptionalSystems();
  if(terrainStream)terrainStream.dispose();
  forgetTerrainStream();
  if(world){scene.remove(world);resources.dispose(world)}
  forgetWorld();
  resetEntities();
  PL.length=FA.length=0;
  TG.clear();
  resetTerrainLevels();
  terrainLevelGrid.clear();
  resetTransients();
  clearKeys();
  resetSimulationClock();
}
