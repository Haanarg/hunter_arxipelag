// Capture physical data only; never graphics, inventory or account credentials.
function captureCoopWorldGeometry(){
  if(!started||generationPromise||operationBusy)throw new Error('Cal un món generat abans de capturar la geometria.');
  return window.HUNTER_WORLD_ADAPTER.normalizeWorldGeometry({format:1,generatorVersion:OPERATION_GENERATOR_VERSION,
    seed:seed>>>0,mapScale:MAP_SCALE,islands,levels:terrainLevels,walls:Wl,
    trees:[...new Set([...TG.values()].flat())]});
}
window.HUNTER_COOP_WORLD=Object.freeze({capture:captureCoopWorldGeometry,
  create:()=>window.HUNTER_WORLD_ADAPTER.createStaticWorldAdapter(captureCoopWorldGeometry())});
