'use strict';
// Prova del controlador A/B sense WebGL: evita modificar la configuració permanent.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(startFlags={shadowsDisabled:false,waterDisabled:false}){
  const nodes=[];
  const document={body:{append(node){nodes.push(node)}},
    createElement(tag){return {tag,style:{},append(...children){this.children=children},
      textContent:'',onclick:null,click(){this.clicked=true},remove(){this.removed=true},
      select(){document.selected=this.value},setAttribute(){}}},execCommand(command){
      document.command=command;return command==='copy';
    }};
  const copied=[];
  const win={document,navigator:{clipboard:{writeText:async text=>{copied.push(text)}}},
    Blob,URL:{createObjectURL(blob){win.downloaded=blob;return 'blob:report'},
      revokeObjectURL(url){win.revoked=url}},
    setTimeout(callback){callback()},
    console:{info(){},table(){}}};
  vm.runInNewContext(fs.readFileSync('src/performance-audit.js','utf8'),{window:win});
  let shadows=startFlags.shadowsDisabled,water=startFlags.waterDisabled;
  const changes=[];
  const controller=win.HUNTER_PERFORMANCE_AUDIT.create({
    windowObject:win,warmupMs:100,sampleMs:200,
    getState:()=>({seed:67,quality:'desktop',pixelRatio:1,
      shadowsDisabled:shadows,waterDisabled:water,
      stressPreset:{seed:2407759483,x:1208,z:-1594,scale:1},
      vehicleFleet:{llanxa:{count:2,meshes:80,shadowCasters:60}}}),
    setShadowsDisabled:x=>{shadows=x;changes.push(['shadows',x])},
    setWaterDisabled:x=>{water=x;changes.push(['water',x])}
  });
  const frame={active:true,x:10,z:20,frameMs:100,renderCpuMs:24,
    postRenderCpuMs:1,updateCpuMs:16,terrainCpuMs:.1,drawCalls:2344,
    triangles:769000,simulationSteps:6,aiMs:15,aiNavMs:9.1,aiSweepMs:7.6,
    sweepChecks:135,sweepSamples:426,aiUpdated:170,aiSkipped:490,
    groups:{edificis:600,vegetacio:800,enemics:500},
    shadowGroups:{jugador:3,vehicles:7},otherDetails:{BoxGeometry:12},shadowRedrawn:1,
    shadowReason:'moviment gran',shadowCulprit:'jugador / braç',deferredFaunaCasters:2,
    vehicleTypes:{llanxa:8,camio:12},vehicleParts:{'llanxa / hull':4},
    vehicleShadowTypes:{llanxa:2},boatMotionProxies:1};
  return {controller,frame,win,changes,flags:()=>({shadows,water}),nodes,copied};
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
assert.equal(s.controller.results[0].stats.vehicleTypes.camio,12);
assert.equal(s.controller.results[0].stats.vehicleParts['llanxa / hull'],4);
assert.equal(s.controller.results[0].stats.vehicleShadowTypes.llanxa,2);
assert.equal(s.controller.results[0].stats.p99FrameMs,100);
assert.equal(s.controller.results[0].stats.slowFrames20,2);
assert.equal(s.controller.results[0].stats.frames20to25,0);
assert.equal(s.controller.results[0].stats.frames24to25,0);
assert.equal(s.controller.results[0].stats.slowFrames25,2);
assert.equal(s.win.HUNTER_PERF_AUDIT_RESULTS.stressPreset.seed,2407759483);
assert.equal(s.win.HUNTER_PERF_AUDIT_RESULTS.vehicleFleet.llanxa.count,2);
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

(async()=>{
  const buttons=s.nodes[0].children.slice(2);
  assert.equal(buttons.length,3);
  assert.equal(buttons[0].textContent,'Copia resum (per al xat)');
  buttons[0].onclick();
  await new Promise(resolve=>setImmediate(resolve));
  const shared=JSON.parse(s.copied.at(-1));
  assert.equal(shared.format,'hunter-perf-share-v1');
  assert.equal(shared.phases.length,5);
  assert.equal(shared.phases[0].stats.aiNavMs,9.1);
  assert.equal(shared.phases[0].stats.slowFrames20,2);
  assert.equal(shared.phases[0].stats.frames24to25,0);
  assert.equal(shared.phases[0].stats.vehicleParts['llanxa / hull'],4);
  assert.equal(shared.vehicleFleet.llanxa.count,2);
  buttons[1].onclick();
  await new Promise(resolve=>setImmediate(resolve));
  const full=JSON.parse(s.copied.at(-1));
  assert.equal(full.phases.length,5);
  assert.equal(full.phases[4].stats.vehicleParts['llanxa / hull'],4);
  assert(s.copied.at(-1).length>JSON.stringify(shared).length);
  buttons[2].onclick();
  assert.equal(s.win.downloaded.type,'application/json;charset=utf-8');
  assert.equal(s.win.revoked,'blob:report');
  assert.equal(JSON.parse(await s.win.downloaded.text()).phases.length,5);
  s.win.navigator.clipboard.writeText=()=>Promise.reject(new Error('no permission'));
  buttons[0].onclick();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(JSON.parse(s.win.document.selected).phases.length,5);
  assert.equal(s.win.document.command,'copy');
  console.log('OK: còpia compacta i completa, descàrrega íntegra i fallback');
})().catch(error=>{console.error(error);process.exitCode=1});

