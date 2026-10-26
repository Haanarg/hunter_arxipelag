'use strict';
// Prova del controlador A/B sense WebGL: evita modificar la configuració permanent.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(startFlags={shadowsDisabled:false,waterDisabled:false}){
  const nodes=[];
  const document={body:{append(node){nodes.push(node)}},
    createElement(tag){return {tag,style:{},append(...children){this.children=children},textContent:'',onclick:null}}};
  const win={document,navigator:{clipboard:{writeText:async()=>{}}},
    console:{info(){},table(){}}};
  vm.runInNewContext(fs.readFileSync('src/performance-audit.js','utf8'),{window:win});
  let shadows=startFlags.shadowsDisabled,water=startFlags.waterDisabled;
  const changes=[];
  const controller=win.HUNTER_PERFORMANCE_AUDIT.create({
    windowObject:win,warmupMs:100,sampleMs:200,
    getState:()=>({seed:67,quality:'desktop',pixelRatio:1,
      shadowsDisabled:shadows,waterDisabled:water}),
    setShadowsDisabled:x=>{shadows=x;changes.push(['shadows',x])},
    setWaterDisabled:x=>{water=x;changes.push(['water',x])}
  });
  const frame={active:true,x:10,z:20,frameMs:100,renderCpuMs:24,
    postRenderCpuMs:1,updateCpuMs:16,terrainCpuMs:.1,drawCalls:2344,
    triangles:769000,simulationSteps:6,aiMs:15,aiNavMs:9.1,aiSweepMs:7.6,
    sweepChecks:135,sweepSamples:426,aiUpdated:170,aiSkipped:490,
    groups:{edificis:600,vegetacio:800,enemics:500},
    shadowGroups:{jugador:3,vehicles:7},otherDetails:{BoxGeometry:12},shadowRedrawn:1,
    shadowReason:'moviment gran',shadowCulprit:'jugador / braç',deferredFaunaCasters:2};
  return {controller,frame,win,changes,flags:()=>({shadows,water}),nodes};
}
const s=setup();
assert.equal(s.controller.status,'pending');
s.controller.onFrame({...s.frame,active:false});
assert.equal(s.controller.status,'pending');
s.controller.onFrame(s.frame);
for(let n=0;n<40&&s.controller.status==='running';n++)s.controller.onFrame(s.frame);
assert.equal(s.controller.status,'finished');
assert.deepEqual(Array.from(s.controller.results,p=>p.id),
  ['base-1','no-shadows','no-water','no-both','base-2']);
assert.deepEqual(s.flags(),{shadows:false,water:false});
assert.equal(s.win.HUNTER_PERF_AUDIT_RESULTS.phases.length,5);
assert.equal(s.win.HUNTER_PERF_AUDIT_RESULTS.phases[0].stats.fps,10);
assert.equal(s.win.HUNTER_PERF_AUDIT_RESULTS.phases[0].stats.groups.vegetacio,800);
assert.equal(s.controller.results[1].stats.drawCalls,2344);
assert.equal(s.controller.results[0].stats.shadowDrawCalls,10);
assert.equal(s.controller.results[0].stats.otherDetails.BoxGeometry,12);
assert.equal(s.controller.results[0].stats.shadowRedrawRate,1);
assert.equal(s.controller.results[0].stats.deferredFaunaCasters,2);
assert.equal(s.controller.results[0].stats.shadowReasons['moviment gran'],2);
assert.equal(s.controller.results[0].stats.shadowCulprits['jugador / braç'],2);
assert(s.changes.some(([key,value])=>key==='shadows'&&value===true));
assert(s.changes.some(([key,value])=>key==='water'&&value===true));
const stopped=setup();
stopped.controller.onFrame(stopped.frame);
stopped.controller.onFrame({...stopped.frame,x:30});
assert.equal(stopped.controller.status,'aborted');
assert.deepEqual(stopped.flags(),{shadows:false,water:false});
const disabled=setup({shadowsDisabled:true,waterDisabled:true});
disabled.controller.onFrame(disabled.frame);
for(let n=0;n<40&&disabled.controller.status==='running';n++)
  disabled.controller.onFrame(disabled.frame);
assert.equal(disabled.controller.status,'finished');
assert.deepEqual(disabled.flags(),{shadows:true,water:true});
console.log('OK: auditoria A/B, fases, estadístiques, cancel·lació i restauració');
