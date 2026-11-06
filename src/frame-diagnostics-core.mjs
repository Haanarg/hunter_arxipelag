// Recollida de mètriques de fotograma separada del coordinador del joc.
// Només llegeix els objectes injectats i conserva exactament l'esquema
// públic de l'auditoria i de l'adaptador de rendiment existent.
export function createFrameDiagnostics({
  performanceAudit,adaptivePerformance,perfHotspots,shadowStats,shadowCache,ren,
  renderCategories,shadowRenderCategories,renderOtherDetails,
  vehicleDrawTypes,vehicleDrawParts,vehicleShadowTypes
}){
 function resetHotspots(){
   for(const key in perfHotspots)perfHotspots[key]=0;
 }
 function resetDrawCounters(roadFrameStats){
   if(roadFrameStats)for(const key in roadFrameStats)roadFrameStats[key]=0;
   for(const k in renderCategories)renderCategories[k]=0;
   for(const k in shadowRenderCategories)delete shadowRenderCategories[k];
   for(const k in renderOtherDetails)delete renderOtherDetails[k];
   for(const k in vehicleDrawTypes)delete vehicleDrawTypes[k];
   for(const k in vehicleDrawParts)delete vehicleDrawParts[k];
   for(const k in vehicleShadowTypes)delete vehicleShadowTypes[k];
 }
 function recordFrame({
   gameplayActive,rawDt,P,gpuSample,cpuStarted,simulationEnded,
   terrainEnded,renderStarted,renderCompleted,postRenderCompleted,
   terrainTextureCpuMs=0,waterUpgradeCpuMs=0,renderMatrixCpuMs=undefined,
   simulated,roadFrameStats,shadowRedrawn,now,simulationActive,
   performanceStatsVisible
 }){
   if(performanceAudit)performanceAudit.onFrame({
     active:gameplayActive,frameMs:rawDt*1000,x:P.x,z:P.z,gpuSample,
     updateCpuMs:simulationEnded-cpuStarted,terrainCpuMs:terrainEnded-simulationEnded,
     renderCpuMs:renderCompleted-renderStarted,
     ...(renderMatrixCpuMs===undefined?{}:{renderMatrixCpuMs}),
     roadFastSkips:roadFrameStats?.fastSkips||0,
     roadVersionChecks:roadFrameStats?.versionChecks||0,
     roadRefits:roadFrameStats?.refits||0,
     roadVersionCpuMs:roadFrameStats?.versionCpuMs||0,
     roadRefitCpuMs:roadFrameStats?.refitCpuMs||0,
     postRenderCpuMs:postRenderCompleted-renderCompleted,
     preRenderCpuMs:renderStarted-terrainEnded,
     terrainTextureCpuMs,waterUpgradeCpuMs,
     simulationSteps:simulated.steps,drawCalls:ren.info.render.calls,
     triangles:ren.info.render.triangles,
     aiMs:perfHotspots.aiMs,aiNavMs:perfHotspots.aiNavMs,aiSweepMs:perfHotspots.aiSweepMs,
     aiPathMs:perfHotspots.aiPathMs,aiPathChecks:perfHotspots.aiPathChecks,
     aiPathDeferred:perfHotspots.aiPathDeferred,
     aiPathNodes:perfHotspots.aiPathNodes,
     aiPassivePathNodes:perfHotspots.aiPassivePathNodes,
     sweepChecks:perfHotspots.aiSweepChecks,sweepSamples:perfHotspots.aiSweepSamples,
     aiUpdated:perfHotspots.aiUpdated,aiSkipped:perfHotspots.aiSkipped,
     groups:{...renderCategories},shadowGroups:{...shadowRenderCategories},
     otherDetails:{...renderOtherDetails},
     vehicleTypes:{...vehicleDrawTypes},vehicleParts:{...vehicleDrawParts},
     vehicleShadowTypes:{...vehicleShadowTypes},
     shadowRedrawn:shadowRedrawn?1:0,
     deferredFaunaCasters:shadowStats.deferredFaunaCasters,
     boatMotionProxies:shadowStats.boatMotionProxies||0,
     shadowReason:shadowRedrawn?shadowCache.stats.lastReason:'',
     shadowCulprit:shadowRedrawn?shadowCache.stats.lastCulprit:''
   });
   adaptivePerformance.sample({dt:rawDt,renderCpuMs:renderCompleted-renderStarted,
     postRenderCpuMs:postRenderCompleted-renderCompleted,
     updateCpuMs:simulationEnded-cpuStarted,terrainCpuMs:terrainEnded-simulationEnded,
     simulationSteps:simulated.steps,simulationMs:simulated.simulatedDt*1000,
     droppedMs:simulated.droppedDt*1000,
     active:simulationActive,now,display:performanceStatsVisible});
   if(gameplayActive&&simulated.steps>0)adaptivePerformance.captureActiveFrame?.({
     rawDt,hotspots:perfHotspots,drawCategories:renderCategories,
     detailed:performanceStatsVisible
   });
 }
 return Object.freeze({resetHotspots,resetDrawCounters,recordFrame});
}
