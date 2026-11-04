import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFrameDiagnostics} from '../src/frame-diagnostics-core.mjs';
// The old game-core.js instrumentation (0.6.124) as independent parity oracle.
function legacyFactory({performanceAudit,adaptivePerformance,perfHotspots,shadowStats,shadowCache,ren,
 renderCategories,shadowRenderCategories,renderOtherDetails,vehicleDrawTypes,vehicleDrawParts,vehicleShadowTypes}){
 return {
  resetHotspots(){for(const key in perfHotspots)perfHotspots[key]=0;},
  resetDrawCounters(roadFrameStats){if(roadFrameStats)for(const key in roadFrameStats)roadFrameStats[key]=0;
for(const k in renderCategories)renderCategories[k]=0;
for(const k in shadowRenderCategories)delete shadowRenderCategories[k];
for(const k in renderOtherDetails)delete renderOtherDetails[k];
for(const k in vehicleDrawTypes)delete vehicleDrawTypes[k];
for(const k in vehicleDrawParts)delete vehicleDrawParts[k];
for(const k in vehicleShadowTypes)delete vehicleShadowTypes[k];},
  recordFrame({gameplayActive,rawDt,P,gpuSample,cpuStarted,simulationEnded,terrainEnded,
   renderStarted,renderCompleted,postRenderCompleted,simulated,roadFrameStats,shadowRedrawn,now,
   simulationActive,performanceStatsVisible}){
   const started=simulationActive,paused=false,over=false;
   if(performanceAudit)performanceAudit.onFrame({
  active:gameplayActive,frameMs:rawDt*1000,x:P.x,z:P.z,gpuSample,
  updateCpuMs:simulationEnded-cpuStarted,terrainCpuMs:terrainEnded-simulationEnded,
  renderCpuMs:renderCompleted-renderStarted,
  roadFastSkips:roadFrameStats?.fastSkips||0,
  roadVersionChecks:roadFrameStats?.versionChecks||0,
  roadRefits:roadFrameStats?.refits||0,
  roadVersionCpuMs:roadFrameStats?.versionCpuMs||0,
  roadRefitCpuMs:roadFrameStats?.refitCpuMs||0,
  postRenderCpuMs:postRenderCompleted-renderCompleted,
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
  active:!!started&&!paused&&!over,now,display:performanceStatsVisible});
  }
 };
}
let seed=0x679c42a5;
const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296};
const metric=()=>Math.round(rand()*27000)/100,count=()=>Math.floor(rand()*800);
function dependencies(on,output){
 return {
  performanceAudit:on?{onFrame:r=>output.audit.push(r)}:null,
  adaptivePerformance:{sample:r=>output.adaptive.push(r)},
  perfHotspots:{aiMs:metric(),aiNavMs:metric(),aiSweepMs:metric(),aiPathMs:metric(),
   aiPathChecks:count(),aiPathDeferred:count(),aiPathNodes:count(),aiPassivePathNodes:count(),
   aiUpdated:count(),aiSkipped:count(),aiSweepChecks:count(),aiSweepSamples:count()},
  shadowStats:{deferredFaunaCasters:count(),boatMotionProxies:count()},
  shadowCache:{stats:{lastReason:'movement',lastCulprit:'vehicle'}},
  ren:{info:{render:{calls:count(),triangles:count()}}},
  renderCategories:{terreny:count(),vehicles:count(),altres:count()},
  shadowRenderCategories:{vehicles:count(),other:count()},
  renderOtherDetails:{grass:count()},vehicleDrawTypes:{cotxe:count()},
  vehicleDrawParts:{wheels:count()},vehicleShadowTypes:{ferry:count()}
 };
}
const clone=o=>JSON.parse(JSON.stringify(o));
function frame(i){
 const base=metric();
 return {gameplayActive:i%2===0,rawDt:rand()/10,P:{x:metric(),z:-metric()},
  gpuSample:i%3?null:{id:i},cpuStarted:base,simulationEnded:base+metric(),
  terrainEnded:base+metric(),renderStarted:base+metric(),
  renderCompleted:base+metric(),postRenderCompleted:base+metric(),
  simulated:{steps:i%17,simulatedDt:rand()/10,droppedDt:rand()/10},
  roadFrameStats:{fastSkips:count(),versionChecks:count(),refits:count(),
   versionCpuMs:metric(),refitCpuMs:metric()},
  shadowRedrawn:i%5===0,now:2000+i*16,
  simulationActive:i%4===0,performanceStatsVisible:i%3===0};
}
let cases=0;
for(const enabled of [true,false])for(let i=0;i<120;i++){
 const lhs={audit:[],adaptive:[]},rhs={audit:[],adaptive:[]},l=dependencies(enabled,lhs);
 const r={...clone(l),performanceAudit:enabled?{onFrame:x=>rhs.audit.push(x)}:null,
  adaptivePerformance:{sample:x=>rhs.adaptive.push(x)}};
 const old=legacyFactory(l),fresh=createFrameDiagnostics(r);
 old.resetHotspots();fresh.resetHotspots();
 assert.deepEqual(r.perfHotspots,l.perfHotspots);
 const roads=[{fastSkips:8,roadCpuMs:5},{fastSkips:8,roadCpuMs:5}];
 old.resetDrawCounters(roads[0]);fresh.resetDrawCounters(roads[1]);
 assert.deepEqual(roads[1],roads[0]);
 for(const key of ['renderCategories','shadowRenderCategories','renderOtherDetails',
   'vehicleDrawTypes','vehicleDrawParts','vehicleShadowTypes'])
  assert.deepEqual(r[key],l[key],'counter cleanup: '+key);
 const f=frame(i);
 old.recordFrame(clone(f));fresh.recordFrame(clone(f));
 assert.deepEqual(rhs.audit,lhs.audit,'audit '+i);
 assert.deepEqual(rhs.adaptive,lhs.adaptive,'adaptive '+i);
 if(!enabled)assert.equal(rhs.audit.length,0);
 if(enabled){
  const saved=rhs.audit[0],value=saved.groups.terreny;
  r.renderCategories.terreny=999999;
  assert.equal(saved.groups.terreny,value,'counters are immutable snapshots');
 }
 cases++;
}
const core=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8'),
 boot=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8'),
 harness=readFileSync(new URL('./harness.cjs',import.meta.url),'utf8');
assert(core.includes('frameDiagnostics.resetHotspots()'));
assert(core.includes('frameDiagnostics.resetDrawCounters(roadFrameStats)'));
assert(core.includes('frameDiagnostics.recordFrame({'));
assert(!core.includes('if(performanceAudit)performanceAudit.onFrame({'));
assert(boot.includes('window.HUNTER_FRAME_DIAGNOSTICS=frameDiagnostics'));
assert(harness.includes('c.HUNTER_FRAME_DIAGNOSTICS=await import('));
console.log('PASS '+cases+' legacy/modern frame metrics scenarios, reset/parity/immutability');
