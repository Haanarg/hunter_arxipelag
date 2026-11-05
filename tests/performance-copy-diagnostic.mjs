import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
let html='',clipboardAllowed=true,execAllowed=true,selected='',invoked=0;
const nodes=new Map(),copied=[];
const document={
  body:{append(el){el.appended=true}},
  createElement(tag){assert.equal(tag,'textarea');return{
    value:'',style:{},setAttribute(){},select(){selected=this.value},
    remove(){this.removed=true}
  }},
  execCommand:cmd=>{assert.equal(cmd,'copy');return execAllowed},
  getElementById(id){
    assert(html.includes('id="'+id+'"'),'diagnostic UI '+id);
    if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:true,value:'',
      checked:false,style:{},onclick:null,onchange:null});
    return nodes.get(id);
  }
};
const window={HUNTER_COMBAT_BALANCE:{player:25},HUNTER_VERSION:'0.6.154',
  navigator:{clipboard:{writeText:text=>clipboardAllowed?(copied.push(text),Promise.resolve()):
    Promise.reject(new Error('denied'))}}};
vm.runInNewContext(readFileSync(new URL('../src/ui.js',import.meta.url),'utf8'),
 {window,document,performance:{now:()=>0}});
const state={started:true,seed:148,mapScale:2,player:{x:75,z:-35},
 palmsDisabled:false,waterDisabled:false,shadowsDisabled:false,muted:false,
 performanceStatsVisible:true,stealthLayers:{},performance:{
  fps:23.6,drawCalls:2200,triangles:2000000,updateCpuMs:13,renderCpuMs:22,
  hotspots:{aiMs:3.8},drawCategories:{buildings:720}
 },enemyLodStats:{hidden:20},visibilityStats:{hidden:450},shadowStats:{redraws:4}};
const panel={style:{},querySelector(){return {classList:{toggle(){}}}}};
const body={get innerHTML(){return html},set innerHTML(s){html=s;nodes.clear()}};
const ui=window.HUNTER_UI.create({hud:{innerHTML:''},panel,title:{},body,
  resumeButton:{style:{},setAttribute(){},removeAttribute(){}},minimap:{},getState:()=>state,actions:{
  getPerformanceDiagnostic(){invoked++;return {version:'0.6.154',quality:'desktop',
    viewport:{width:2560,height:1440,devicePixelRatio:1},
    worldGeneration:{totalMs:1200},rendererMemory:{geometries:400},
    roadStats:{chunkCells:128},staticBatchStats:{batchedMeshes:300}}},
  setAudioMuted(){},setPalmsDisabled(){},setWaterDisabled(){},
  setShadowsDisabled(){},setPerformanceStatsVisible(){},setStealthLayer(){}
}});
const settle=()=>new Promise(r=>setImmediate(r));
ui.show('performance');
assert(html.includes('id="performanceRefresh"'));
assert(html.includes('id="performanceCopy"'));
assert(html.indexOf('id="performanceRefresh"')<html.indexOf('id="performanceCopy"'));
assert.equal(invoked,0,'diagnostic is not collected on render');
document.getElementById('performanceCopy').onclick();await settle();
let report=JSON.parse(copied.at(-1));
assert.equal(report.format,'hunter-performance-diagnostic-v1');
assert.equal(report.seed,148);assert.equal(report.mapScale,2);
assert.equal(report.performance.hotspots.aiMs,3.8);
assert.equal(report.worldGeneration.totalMs,1200);
assert.equal(report.rendererMemory.geometries,400);
assert.equal(report.quality,'desktop');assert.equal(invoked,1);
assert.match(document.getElementById('performanceCopyStatus').textContent,/copiat/);
state.performance.fps=15.3;
document.getElementById('performanceRefresh').onclick();
assert.match(document.getElementById('performanceBreakdown').textContent,/FPS 15/);
document.getElementById('performanceCopy').onclick();await settle();
assert.equal(JSON.parse(copied.at(-1)).performance.fps,15.3);
clipboardAllowed=false;document.getElementById('performanceCopy').onclick();await settle();
assert.equal(JSON.parse(selected).mapScale,2,'execCommand fallback copied JSON');
assert.match(document.getElementById('performanceCopyStatus').textContent,/copiat/);
execAllowed=false;document.getElementById('performanceCopy').onclick();await settle();
assert.equal(document.getElementById('performanceCopyManual').hidden,false);
assert.equal(JSON.parse(document.getElementById('performanceCopyManual').value).seed,148);
console.log('PASS performance copy: latest metrics, clipboard, fallback and manual selection');
