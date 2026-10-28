// Capture physical data only; never graphics, inventory or account credentials.
function captureCoopWorldGeometry(){
  if(!started||generationPromise||operationBusy)throw new Error('Cal un món generat abans de capturar la geometria.');
  return window.HUNTER_WORLD_ADAPTER.normalizeWorldGeometry({format:2,generatorVersion:OPERATION_GENERATOR_VERSION,
    seed:seed>>>0,mapScale:MAP_SCALE,islands,levels:terrainLevels,walls:Wl,
    trees:[...new Set([...TG.values()].flat())],stairs,piers,buildings:B,bunker:activeBunker?.basement?activeBunker:null,
    terminalRamps:(world?.userData.compounds||[]).filter(c=>c.loadingRamp).map(c=>terminalRampState(c.loadingRamp)).filter(Boolean)});
}
window.HUNTER_COOP_WORLD=Object.freeze({capture:captureCoopWorldGeometry,
  create:()=>window.HUNTER_WORLD_ADAPTER.createStaticWorldAdapter(captureCoopWorldGeometry())});
