// Rendiment observat, sense cap reassignació de buffers WebGL mentre es juga.
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({Math,console});ctx.window=ctx;
vm.runInContext(fs.readFileSync(path.join(root,'src/performance.js'),'utf8'),ctx);
let reallocations=0;
const renderer={info:{render:{calls:137,triangles:82000}},
  setPixelRatio:()=>reallocations++};
const display={textContent:''};
const perf=ctx.HUNTER_PERFORMANCE.create({renderer,maxPixelRatio:1.2,minPixelRatio:1,element:display});
assert.equal(perf.stats.mode,'fixed');
let now=0;
for(let i=0;i<300;i++){now+=1000/23;perf.sample({dt:1/23,now,renderCpuMs:6,active:true});}
assert(perf.stats.fps>22&&perf.stats.fps<24,'FPS sampling works while slow');
assert.equal(perf.stats.pixelRatio,1.2,'runtime ratio matches actual renderer quality');
assert.equal(reallocations,0,'no WebGL buffer reallocations at low FPS');
for(let i=0;i<540;i++){now+=1000/90;perf.sample({dt:1/90,now,renderCpuMs:3,active:true});}
assert(perf.stats.fps>75,'FPS estimate recovers when rendering improves');
assert.equal(reallocations,0,'no reallocations during fast recovery');
assert.equal(perf.stats.drawCalls,137);
assert.equal(perf.stats.triangles,82000);
assert(display.textContent.includes('Resolució fixa'),'display documents static internal resolution');
assert(display.textContent.includes('CPU render'),'CPU time shown separately from frame time');
perf.sample({dt:3,now:now+3000,active:true});
assert.equal(reallocations,0,'background stall does not resize');
perf.sample({dt:.016,now:now+3016,active:false});
assert(!perf.stats.active,'pauses deactivate the sample accumulator');
const mobile=ctx.HUNTER_PERFORMANCE.create({
 renderer,maxPixelRatio:.9,minPixelRatio:1,compact:true});
assert.equal(mobile.stats.pixelRatio,.9,'DPR below 1 remains supported without upscaling');
assert.equal(reallocations,0);
console.log(JSON.stringify({passed:true,ratio:perf.stats.pixelRatio,
  finalFPS:Math.round(perf.stats.fps),rendererResizes:reallocations,
  calls:perf.stats.drawCalls,triangles:perf.stats.triangles}));
