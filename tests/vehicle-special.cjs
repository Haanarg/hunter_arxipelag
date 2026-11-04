#!/usr/bin/env node
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),core=read('src/game-core.js');
const start=core.indexOf('const VEHICLE_SIGNAL_SOUNDS='),end=core.indexOf('function readPlayerControls(',start);
assert.ok(start>=0&&end>start);
// The current dedicated vehicle horn/bell button needs a minimal DOM stub.
const hornEvents={},bodyClasses=new Set(),buttonClasses=new Set();
const hornButton={querySelector:()=>({textContent:''}),
 addEventListener:(type,handler)=>{hornEvents[type]=handler},
 classList:{add:name=>buttonClasses.add(name),remove:name=>buttonClasses.delete(name)},
 setAttribute:()=>{},setPointerCapture:()=>{}};
const document={getElementById:id=>id==='vehicleHornButton'?hornButton:null,
 body:{classList:{toggle:(key,on)=>{if(on)bodyClasses.add(key);else bodyClasses.delete(key)},
 contains:key=>bodyClasses.has(key)}}};
const calls=[],noises=[],ctx={started:1,paused:false,over:0,hp:10,cv:null,nativeCoopSession:null,K:{},joystick:{state:{running:false}},P:{y:0},
 playerFall:null,playerEject:null,scopeActive:false,document,addEventListener:()=>{},
 window:{HUNTER_ENEMY_PERCEPTION:{VEHICLE_SIGNAL_SOUNDS:{cotxe:'hornCar',cotxe_civil:'hornCar',camio:'hornTruck',moto:'hornMoto',bici:'bikeBell'}},
 HUNTER_STEALTH:{emit:(...a)=>noises.push(a)}},snd:(...a)=>calls.push(a)};
vm.createContext(ctx);vm.runInContext(core.slice(start,end)+'\nthis.press=updateVehicleSpecialAction;',ctx);
ctx.press();assert.equal(calls.length,0);
function release(){ctx.K.ShiftLeft=false;ctx.K.ShiftRight=false;ctx.joystick.state.running=false;ctx.press()}
for(const [type,sound,stick] of [['cotxe','hornCar'],['cotxe_civil','hornCar'],['camio','hornTruck'],['moto','hornMoto'],['bici','bikeBell',true]]){
 release();ctx.cv={t:type};ctx.K.ShiftLeft=!stick;ctx.joystick.state.running=!!stick;
 const n=calls.length;
 if(stick){
   ctx.press();assert.equal(calls.length,n,'joystick running does not ring the bell');
   ctx.K.ShiftRight=true;
 }
 ctx.press();ctx.press();assert.equal(calls.length,n+1);assert.equal(calls.at(-1)[0],sound);assert.equal(noises.at(-1)[0],sound);assert.equal(noises.length,calls.length);
}
release();const n=calls.length;ctx.cv={t:'ferry'};ctx.K.ShiftRight=true;ctx.press();assert.equal(calls.length,n);
release();ctx.cv={t:'moto'};ctx.paused=true;ctx.K.ShiftLeft=true;ctx.press();assert.equal(calls.length,n);
ctx.paused=false;release();ctx.over=1;ctx.K.ShiftLeft=true;ctx.press();assert.equal(calls.length,n);
ctx.over=0;release();ctx.nativeCoopSession={state:{status:'paused'}};ctx.K.ShiftLeft=true;ctx.press();assert.equal(calls.length,n);
release();const messages=[];ctx.nativeCoopSession.state.status='running';ctx.nativeCoopSession.channel={inventory:(...a)=>{messages.push(a);return true}};
ctx.cv={t:'moto',x:12,z:-22,o:{position:{y:4}}};ctx.K.ShiftRight=true;ctx.press();
assert.equal(calls.at(-1)[0],'hornMoto');assert.equal(messages.at(-1)[0],'signal');assert.equal(messages.at(-1)[1],'vehicle');
assert.equal(noises.at(-1)[1],12);assert.equal(noises.at(-1)[3],-22);
// Tapping the independent button must play immediately on pointerdown.
release();ctx.cv={t:'bici'};ctx.press();
const beforePointer=calls.length;
hornEvents.pointerdown({button:0,pointerId:14,preventDefault(){}});
assert.equal(calls.length,beforePointer+1,'touch bicycle bell triggers immediately');
assert.equal(calls.at(-1)[0],'bikeBell');
hornEvents.pointerup({pointerId:14});
const audio=read('src/audio.js'),AC={sampleRate:22050,createBuffer:(_n,len)=>{const samples=new Float32Array(len);return {getChannelData:()=>samples};}};
const ac=vm.createContext({AC});vm.runInContext(audio,ac);
const sig=Object.fromEntries(['hornTruck','hornCar','hornMoto','bikeBell'].map(t=>[t,vm.runInContext('audioBuffer('+JSON.stringify(t)+').getChannelData(0)',ac)]));
for(const [t,w] of Object.entries(sig))assert.ok(w.length>4000&&w.some(x=>Math.abs(x)>.02),t);
const xing=w=>{let n=0;for(let i=400;i<3000;i++)if(w[i-1]<0&&w[i]>=0)n++;return n};
assert.ok(xing(sig.hornTruck)<xing(sig.hornCar)&&xing(sig.hornCar)<xing(sig.hornMoto)&&xing(sig.hornMoto)<xing(sig.bikeBell));
assert.equal(vm.runInContext('AUDIO_SOUNDS.hornTruck.gain>AUDIO_SOUNDS.hornCar.gain',ac),true);
console.log('OK senyals de vehicle i pulsacions');
