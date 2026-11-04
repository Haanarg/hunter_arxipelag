// Fàbriques per als objectes d'estat inicial del motor.
// Una nova crida crea nous Sets/Maps/registre de comptadors, sense
// subscriure observers ni tocar render, combat o generació de llavors.
export function createIntelCollections(){
  const hqIntelSectors=new Set(),hqIntelDiscarded=new Set();
  const knownVehicleSectors={heli:new Set(),tanc:new Set()};
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
