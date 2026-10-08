// Resolució dinàmica amb histèresi, mètriques de dibuix i pausa.
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const context=vm.createContext({Math,console});context.window=context;
vm.runInContext(fs.readFileSync(path.join(root,'src/performance.js'),'utf8'),context);
const changes=[];
const renderer={info:{render:{calls:137,triangles:82000}},
  setPixelRatio:ratio=>changes.push(ratio)};
const output={textContent:''};
const monitor=context.HUNTER_PERFORMANCE.create({
  renderer,maxPixelRatio:1.85,minPixelRatio:.75,element:output
});
let now=0;
function frames(fps,seconds){
  const dt=1/fps;
  for(let i=0;i<Math.floor(fps*seconds);i++){
    now+=dt;
    monitor.sample({dt,now:now*1000,renderCpuMs:5,active:true});
  }
}
frames(28,12);
const reduced=monitor.stats.pixelRatio;
assert(reduced<1.85,'pixel ratio falls when FPS is low');
assert(monitor.stats.fps>=27&&monitor.stats.fps<=29);
assert.equal(monitor.stats.drawCalls,137);
assert.equal(monitor.stats.triangles,82000);
assert(output.textContent.includes('FPS')&&output.textContent.includes('triangles'),
  'HUD shows frame and geometry metrics');
frames(80,8);
assert(monitor.stats.pixelRatio>reduced,'pixel ratio recovers on fast frames');
assert(monitor.stats.pixelRatio<=1.85,'pixel ratio does not exceed quality ceiling');
const count=changes.length;
monitor.sample({dt:3,now:(now+3)*1000,active:true});
assert.equal(changes.length,count,'background tab stall must not reduce resolution');
monitor.sample({dt:.016,now:(now+3.016)*1000,active:false});
assert.equal(monitor.stats.active,false);
const lowRenderer={info:{render:{calls:1,triangles:1}},setPixelRatio:()=>{}};
const low=context.HUNTER_PERFORMANCE.create({renderer:lowRenderer,
  maxPixelRatio:1,minPixelRatio:.72,compact:true});
for(let i=0;i<180;i++)low.sample({dt:1/28,now:i*1000/28,active:true});
assert(low.stats.pixelRatio<1,'DPR-1 devices can reduce render resolution');
console.log(JSON.stringify({passed:true,slowRatio:reduced,
  recovered:monitor.stats.pixelRatio,steps:changes.length,
  lowDprRatio:low.stats.pixelRatio}));
