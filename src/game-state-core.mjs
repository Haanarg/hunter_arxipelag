// Fàbriques per als objectes d'estat inicial del motor.
// Una nova crida crea nous conjunts i registres de comptadors, sense
// subscriure observers ni tocar render, combat o generació de llavors.
export function createIntelCollections(SetConstructor=Set){
  // Rebem Set del context dels scripts clàssics, també en el harness VM.
  const hqIntelSectors=new SetConstructor(),hqIntelDiscarded=new SetConstructor();
  const knownVehicleSectors={heli:new SetConstructor(),tanc:new SetConstructor()};
  return {hqIntelSectors,hqIntelDiscarded,knownVehicleSectors};
}
export function createVisibilityCounters(){
  const visibilityStats={buildings:0,fences:0,props:0,vehicles:0,enemies:0,items:0,fauna:0,antennas:0,terrainOccluded:0};
  const enemyLodStats={full:0,mid:0,far:0,hidden:0,vehicleFull:0};
  return {visibilityStats,enemyLodStats};
}
export function createDrawCounters(){
  const renderCategories={terreny:0,edificis:0,filferrades:0,vehicles:0,enemics:0,vegetacio:0,decoracio:0,objectes:0,fauna:0,jugador:0,mar:0,cel:0,efectes:0,altres:0};
  const shadowRenderCategories={};
  const renderOtherDetails={};
  const vehicleDrawTypes={},vehicleDrawParts={},vehicleShadowTypes={},vehicleFleet={};
  return {renderCategories,shadowRenderCategories,renderOtherDetails,
    vehicleDrawTypes,vehicleDrawParts,vehicleShadowTypes,vehicleFleet};
}

// Contenidors nous per una nova partida. Array s'injecta des del context
// dels scripts clàssics, evitant una Array d'un altre realm al harness.
// No es reutilitzen llistes del món anterior; els pools PL/FA sí es buiden.
export function createWorldEntityCollections(ArrayConstructor=Array){
  return {B:new ArrayConstructor(),Wl:new ArrayConstructor(),Dr:new ArrayConstructor(),
    stairs:new ArrayConstructor(),piers:new ArrayConstructor(),items:new ArrayConstructor(),
    V:new ArrayConstructor(),E:new ArrayConstructor(),fa:new ArrayConstructor()};
}
