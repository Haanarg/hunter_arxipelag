// L'àudio només representa el món: mai no emet ni consumeix sorolls de STEALTH.
// Els buffers es comparteixen; cada reproducció té una font i nodes propis.
const AUDIO_SOUNDS=Object.freeze({
 shot:{duration:.12,filter:'highpass',frequency:1200,gain:.5,range:140},
 cannon:{duration:.35,frequency:600,gain:.5,range:140},
 boom:{duration:.7,frequency:300,gain:.5,range:200,priority:2},
 hurt:{duration:.15,frequency:600,gain:.5},
 step:{duration:.085,frequency:440,gain:.15,fade:3},
 enemyStep:{duration:.085,frequency:440,gain:.15,fade:3,range:30,throttle:.18,priority:0},
 swim:{duration:.24,frequency:1100,gain:.32},
 pick:{duration:.2,gain:.15},
 alert:{duration:.38,frequency:1250,gain:.32,range:70,throttle:.8,priority:2},
 glassBreak:{duration:.43,filter:'highpass',frequency:1650,gain:.46,range:105,priority:2},
 woodBreak:{duration:.34,filter:'lowpass',frequency:900,gain:.48,range:100,priority:2},
 hornCar:{duration:.46,gain:.43,range:115,throttle:.14,priority:2},
 hornTruck:{duration:.72,gain:.68,range:145,throttle:.18,priority:2},
 hornMoto:{duration:.39,gain:.36,range:105,throttle:.14,priority:2},
 bikeBell:{duration:.82,gain:.33,range:75,throttle:.14,priority:2},
 replayShot:{duration:.24,frequency:750,gain:.31,fade:2.4,rate:.55},
 replayCannon:{duration:.42,frequency:340,gain:.44,fade:2.4,rate:.55}
});
const audioRuntime={context:null,master:null,buffers:new WeakMap(),voices:new Set(),
 objectTimes:new WeakMap(),sourceTimes:new Map(),steps:new WeakMap(),paused:false,
 muted:false,resumeSerial:0,listener:{x:0,y:1.65,z:0},maxVoices:24,maxWorldVoices:18};
function audioIsMuted(){return typeof muted!=='undefined'&&!!muted}
function audioVisible(){return !(typeof document!=='undefined'&&document.hidden)}
function audioCanPlay(){
 return !!AC&&!audioRuntime.paused&&!audioIsMuted()&&audioVisible()&&
   !(typeof simulationFocused!=='undefined'&&!simulationFocused)&&
   AC.state!=='suspended'&&AC.state!=='interrupted'&&AC.state!=='closed';
}
function audioDisconnect(node){try{node?.disconnect?.()}catch(e){}}
function audioReleaseVoice(voice,stop=false){
 if(!audioRuntime.voices.delete(voice))return;
 voice.source.onended=null;
 if(stop)try{voice.source.stop()}catch(e){}
 for(const node of voice.nodes)audioDisconnect(node);
}
function audioClearVoices(){
 for(const voice of [...audioRuntime.voices])audioReleaseVoice(voice,true);
 audioRuntime.objectTimes=new WeakMap();audioRuntime.sourceTimes.clear();audioRuntime.steps=new WeakMap();
}
function audioPrune(){
 const now=AC?.currentTime||0;
 for(const voice of audioRuntime.voices)if(now>voice.end+.05)audioReleaseVoice(voice,true);
 for(const [key,time] of audioRuntime.sourceTimes)if(now-time>8)audioRuntime.sourceTimes.delete(key);
}
function audioReserveVoice(priority,spatial){
 audioPrune();
 if(spatial){
  const world=[...audioRuntime.voices].filter(voice=>voice.position);
  if(world.length>=audioRuntime.maxWorldVoices){
   const victim=world.find(voice=>voice.priority<=priority);if(!victim)return false;
   audioReleaseVoice(victim,true);
  }
 }
 if(audioRuntime.voices.size>=audioRuntime.maxVoices){
  const victim=[...audioRuntime.voices].find(voice=>voice.priority<=priority);
  if(!victim)return false;
  audioReleaseVoice(victim,true);
 }
 return true;
}
function audioOwnVoice(source,nodes,{duration,priority=2,position=null,gain=null,baseGain=0,range=0}={}){
 const voice={source,nodes,priority,position,gain,baseGain,range,end:AC.currentTime+duration};
 audioRuntime.voices.add(voice);source.onended=()=>audioReleaseVoice(voice);
 return voice;
}
function audioStopLoops(){
 if(eng?.g?.gain){eng.g.gain.cancelScheduledValues?.(AC?.currentTime||0);eng.g.gain.value=0}
 if(seaAudio?.gain?.gain){seaAudio.gain.gain.cancelScheduledValues?.(AC?.currentTime||0);seaAudio.gain.gain.value=0}
}
function audioDisposeGraph(){
 audioClearVoices();
 const engine=typeof eng!=='undefined'?eng:null,sea=typeof seaAudio!=='undefined'?seaAudio:null;
 for(const source of [engine?.o,sea?.noise])if(source)try{source.stop()}catch(e){}
 for(const node of [engine?.o,engine?.g,sea?.noise,sea?.filter,sea?.gain,audioRuntime.master])audioDisconnect(node);
 eng=null;seaAudio=null;audioRuntime.master=null;
}
function audioUseContext(){
 if(audioRuntime.context===AC)return;
 audioDisposeGraph();audioRuntime.context=AC;audioRuntime.resumeSerial++;
}
function audioOutput(){
 audioUseContext();
 if(!audioRuntime.master){
  const gain=AC.createGain();gain.gain.value=audioIsMuted()?0:1;
  gain.connect(AC.destination);audioRuntime.master=gain;
 }
 return audioRuntime.master;
}
function audioNoise(seed){
 let state=seed>>>0;
 return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2147483648-1};
}
function audioBuffer(type){
 let cache=audioRuntime.buffers.get(AC);if(!cache)audioRuntime.buffers.set(AC,cache=new Map());
 if(cache.has(type))return cache.get(type);
 const spec=AUDIO_SOUNDS[type],duration=type==='sea'?8:spec.duration,
       length=Math.max(1,Math.floor(AC.sampleRate*duration)),buffer=AC.createBuffer(1,length,AC.sampleRate),
       samples=buffer.getChannelData(0),noise=audioNoise([...type].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),5171));
 let low=0,phase=0;
 for(let i=0;i<length;i++){
  const p=i/length,t=i/AC.sampleRate,n=noise();
  if(type==='sea'){
   low=.985*low+.015*n;const swell=.35+.65*Math.pow(.5+.5*Math.sin(p*Math.PI*4),2);
   samples[i]=low*9*swell;
  }else if(type==='swim'){
   low=low*.83+n*.17;samples[i]=(low*.8+n*.18)*Math.pow(1-p,2.4);
  }else if(type==='pick'){
   phase+=Math.PI*2*(t<.08?660:990)/AC.sampleRate;
   samples[i]=Math.sin(phase)*Math.pow(.001/.15,p);
  }else if(type==='glassBreak'){
   const crack=p<.035?(1-p/.035):0,shards=Math.pow(1-p,1.7);
   samples[i]=(n*.65+Math.sin(t*11700)*.35)*(.45*shards+crack*.75);
  }else if(type==='woodBreak'){
   const crack=p<.075?1-p/.075:0;
   low=.87*low+.13*n;samples[i]=(low*.6+n*.4)*(.8*crack+.45*Math.pow(1-p,2));
  }else if(type==='alert'){
   // Dos accents breus i aspres; diferent del cop de bota i de la recollida.
   phase+=Math.PI*2*(t<.18?310:420)/AC.sampleRate;
   const syllable=t<.18?t/.18:(t-.18)/.2,envelope=Math.sin(Math.PI*syllable)**2;
   samples[i]=(Math.sin(phase)*.65+n*.35)*envelope;
  }else if(type==='hornCar'||type==='hornTruck'||type==='hornMoto'){
   // Cotxe bitonal, camió greu i fort, moto aguda i esquerdada.
   const truck=type==='hornTruck',moto=type==='hornMoto',
         f1=truck?148:moto?560:362,f2=truck?184:moto?711:437,
         attack=Math.min(1,t/.012),release=Math.min(1,(spec.duration-t)/.065),
         tone=Math.sin(Math.PI*2*f1*t)*.64+Math.sin(Math.PI*2*f2*t)*.36;
   samples[i]=Math.max(0,attack*release)*(moto
     ?Math.tanh(2.3*tone+Math.sin(Math.PI*2*38*t)*.15+n*.075)*.76
     :truck?Math.tanh(1.5*tone)*.86:Math.tanh(1.15*tone)*.78);
  }else if(type==='bikeBell'){
   // Doble repic metàl·lic de bicicleta, amb ressonància.
   const strength=Math.exp(-t*6)+(t>.21?.65*Math.exp(-(t-.21)*8):0),
         metal=Math.sin(Math.PI*2*1480*t)*.56+
           Math.sin(Math.PI*2*2335*t)*.30+Math.sin(Math.PI*2*2980*t)*.14;
   samples[i]=metal*strength*Math.min(1,t/.004)*.72;
  }else samples[i]=n*Math.pow(1-p,spec.fade||2);
 }
 cache.set(type,buffer);return buffer;
}
function audioInitLoops(){
 const output=audioOutput();
 if(!eng){
  const o=AC.createOscillator(),g=AC.createGain();
  try{o.type='sawtooth';o.frequency.value=40;g.gain.value=0;o.connect(g);g.connect(output);o.start();eng={o,g}}
  catch(e){try{o.stop()}catch(e){}audioDisconnect(o);audioDisconnect(g)}
 }
 if(!seaAudio){
  const noise=AC.createBufferSource(),filter=AC.createBiquadFilter(),gain=AC.createGain();
  try{
   noise.buffer=audioBuffer('sea');noise.loop=true;filter.type='lowpass';filter.frequency.value=850;gain.gain.value=0;
   noise.connect(filter);filter.connect(gain);gain.connect(output);noise.start();seaAudio={noise,filter,gain};
  }catch(e){try{noise.stop()}catch(e){}audioDisconnect(noise);audioDisconnect(filter);audioDisconnect(gain)}
 }
}
function audioSuspend(){
 const context=AC;
 try{return Promise.resolve(context?.suspend?.()).then(()=>false,()=>false)}catch(e){return Promise.resolve(false)}
}
function audioResume(){
 audioRuntime.paused=false;
 if(!AC||audioIsMuted()||!audioVisible()||typeof simulationFocused!=='undefined'&&!simulationFocused)return Promise.resolve(false);
 const context=AC,serial=++audioRuntime.resumeSerial;
 // resume() s'invoca ara, dins del gest; la promesa sempre queda capturada.
 let resumed;try{resumed=context.resume?.()}catch(e){return Promise.resolve(false)}
 return Promise.resolve(resumed).then(()=>{
  if(AC!==context)return false;
  if(audioRuntime.paused||audioIsMuted()||!audioVisible()||
    typeof simulationFocused!=='undefined'&&!simulationFocused){audioSuspend();return false}
  if(serial!==audioRuntime.resumeSerial)return false;
  if(audioRuntime.master)audioRuntime.master.gain.value=1;
  return context.state!=='suspended'&&context.state!=='closed';
 },()=>false);
}
function initAudio(options={}){
 try{
  const host=typeof window!=='undefined'?window:globalThis;
  if(!AC||AC.state==='closed'){
   const primed=host.HUNTER_PRIMED_AUDIO_CONTEXT,
         Constructor=host.AudioContext||host.webkitAudioContext;
   if(primed&&primed.state!=='closed')AC=primed;
   else if(Constructor)AC=new Constructor();
   else return Promise.resolve(false);
  }
  host.HUNTER_PRIMED_AUDIO_CONTEXT=AC;
  audioUseContext();
  const resumed=audioResume();
  if(!options.unlockOnly)audioInitLoops();
  return resumed;
 }catch(e){return Promise.resolve(false)}
}
function audioPause(){
 audioRuntime.paused=true;audioRuntime.resumeSerial++;audioClearVoices();audioStopLoops();
 if(audioRuntime.master)audioRuntime.master.gain.value=0;
 return audioSuspend();
}
function audioReset(){
 audioRuntime.resumeSerial++;audioClearVoices();audioStopLoops();
}
function setAudioMuted(value){
 muted=!!value;audioRuntime.muted=muted;
 if(muted){
  audioRuntime.resumeSerial++;audioClearVoices();audioStopLoops();
  if(audioRuntime.master)audioRuntime.master.gain.value=0;
  audioSuspend();
 }else if(!audioRuntime.paused&&!(typeof paused!=='undefined'&&paused))return audioResume();
 return Promise.resolve(false);
}
function audioSetPosition(node,point){
 if(node.positionX){node.positionX.value=point.x;node.positionY.value=point.y;node.positionZ.value=point.z}
 else node.setPosition?.(point.x,point.y,point.z);
}
function audioDistanceGain(position,range){
 const ear=audioRuntime.listener;
 return Math.max(0,1-Math.hypot(position.x-ear.x,position.y-ear.y,position.z-ear.z)/range);
}
function updateAudioListener(){
 if(!AC)return;
 let player=typeof P!=='undefined'?P:null;
 if(typeof deathCinematic!=='undefined'&&deathCinematic?.active&&typeof pl!=='undefined')player=pl.position;
 if(player)audioRuntime.listener={x:player.x,y:(player.y||0)+1.65,z:player.z};
 const listener=AC.listener;
 if(listener){
  audioSetPosition(listener,audioRuntime.listener);
  let camera=typeof cam!=='undefined'?cam:null;
  if(typeof deathVoidReady==='function'&&deathVoidReady())camera=deathCinematic.voidCamera;
  camera?.updateMatrixWorld?.(true);
  const e=camera?.matrixWorld?.elements;
  if(e){
   const f=Math.hypot(e[8],e[9],e[10])||1,u=Math.hypot(e[4],e[5],e[6])||1,
         forward=[-e[8]/f,-e[9]/f,-e[10]/f],up=[e[4]/u,e[5]/u,e[6]/u];
   if(listener.forwardX){
    for(const [name,values] of [['forward',forward],['up',up]])
     for(let i=0;i<3;i++)listener[name+'XYZ'[i]].value=values[i];
   }else listener.setOrientation?.(...forward,...up);
  }
 }
 for(const voice of audioRuntime.voices)if(voice.position&&voice.gain)
  voice.gain.gain.value=voice.baseGain*audioDistanceGain(voice.position,voice.range);
}
function updateAudioFrame(){
 if(!AC)return;
 if(audioRuntime.muted!==audioIsMuted())setAudioMuted(audioIsMuted());
 if((typeof paused!=='undefined'&&paused)||!audioVisible()||
   typeof simulationFocused!=='undefined'&&!simulationFocused){
  if(!audioRuntime.paused)audioPause();
  return;
 }
 if(typeof over!=='undefined'&&over)audioStopLoops();
 updateAudioListener();audioPrune();
}
function audioThrottle(type,source,position,interval){
 const now=AC.currentTime;
 if(source&&(typeof source==='object'||typeof source==='function')){
  let times=audioRuntime.objectTimes.get(source);
  if(!times)audioRuntime.objectTimes.set(source,times=new Map());
  const previous=times.get(type);if(previous!==undefined&&now-previous<interval)return false;
  times.set(type,now);return true;
 }
 const key=type+':'+(source??(position?Math.round(position.x)+','+Math.round(position.y)+','+Math.round(position.z):'personal')),
       previous=audioRuntime.sourceTimes.get(key);
 if(previous!==undefined&&now-previous<interval)return false;
 // Cap estricte també quan el context no avança o hi ha molts impactes diferents.
 if(audioRuntime.sourceTimes.size>=256)audioRuntime.sourceTimes.delete(audioRuntime.sourceTimes.keys().next().value);
 audioRuntime.sourceTimes.set(key,now);return true;
}
function snd(type,volume=1,position=null,source=null){
 if(!audioCanPlay()||!Number.isFinite(volume)||volume<=.02)return false;
 const t=Object.hasOwn(AUDIO_SOUNDS,type)?type:'hurt',spec=AUDIO_SOUNDS[t],
       spatial=position&&Number.isFinite(position.x)&&Number.isFinite(position.y)&&Number.isFinite(position.z),
       point=spatial?{x:position.x,y:position.y,z:position.z}:null,range=spec.range||140,
       priority=spatial?(spec.priority??1):3;
 try{
  audioOutput();updateAudioListener();
  if(point&&audioDistanceGain(point,range)<=.001)return false;
  if(!audioThrottle(t,source,point,spec.throttle||.06)||!audioReserveVoice(priority,spatial))return false;
  const buffer=audioBuffer(t),voiceNodes=[],s=AC.createBufferSource();voiceNodes.push(s);
  let voice;
  try{
   s.buffer=buffer;if(spec.rate)s.playbackRate.value=spec.rate;
   const gain=AC.createGain();voiceNodes.push(gain);
   const baseGain=spec.gain*Math.min(1,volume);
   gain.gain.value=baseGain*(point?audioDistanceGain(point,range):1);
   let tail=s;
   if(spec.frequency){
    const filter=AC.createBiquadFilter();voiceNodes.push(filter);filter.type=spec.filter||'lowpass';
    filter.frequency.value=spec.frequency;tail.connect(filter);tail=filter;
   }
   tail.connect(gain);tail=gain;
   if(point&&AC.createPanner){
    let panner;
    try{
     panner=AC.createPanner();panner.panningModel='HRTF';panner.distanceModel='linear';
     // Una sola atenuació, al gain anterior; el Panner només aporta direcció.
     panner.refDistance=1;panner.maxDistance=range;panner.rolloffFactor=0;
     audioSetPosition(panner,point);gain.connect(panner);tail=panner;voiceNodes.push(panner);
    }catch(e){audioDisconnect(panner)}
   }
   tail.connect(audioRuntime.master);
   voice=audioOwnVoice(s,voiceNodes,{duration:spec.duration/(spec.rate||1),priority,
     position:point,gain,baseGain,range});
   s.start(AC.currentTime);return true;
  }catch(e){if(voice)audioReleaseVoice(voice,true);else for(const node of voiceNodes)audioDisconnect(node);return false}
 }catch(e){return false}
}
function enemyStepSound(unit,distance){
 if(!audioCanPlay()||!(distance>0)||distance>4)return;
 let travelled=(audioRuntime.steps.get(unit)||0)+distance;
 if(travelled>=1.6){
  travelled%=1.6;snd('enemyStep',.9,{x:unit.x,y:unit.o.position.y+.12,z:unit.z},unit);
 }
 audioRuntime.steps.set(unit,travelled);
}
// Campanes i cant cinematogràfic conserven síntesi i cadència originals,
// però ara participen del límit de veus i de la neteja de pausa/reinici.
function deathBell(volume=1){
 if(!audioCanPlay())return;
 try{
  const now=AC.currentTime,partials=[1,2.01,2.49,3.98,5.03],strengths=[.38,.17,.13,.08,.045],output=audioOutput();
  for(let i=0;i<partials.length;i++){
   if(!audioReserveVoice(4,false))break;
   const osc=AC.createOscillator(),gain=AC.createGain(),
         start=Math.min(1,Math.max(0,volume))*strengths[i],length=4.4-i*.43;
   osc.type='sine';osc.frequency.setValueAtTime(174.61*partials[i],now);
   gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(start,now+.012);
   gain.gain.exponentialRampToValueAtTime(.0001,now+length);
   osc.connect(gain);gain.connect(output);
   audioOwnVoice(osc,[osc,gain],{duration:length+.03,priority:4});
   osc.start(now);osc.stop(now+length+.03);
  }
 }catch(e){}
}
function audioGullCry(){
 if(!audioCanPlay())return;
 try{
  const now=AC.currentTime,output=audioOutput();if(!audioReserveVoice(3,false))return;
  const o=AC.createOscillator(),g=AC.createGain();
  o.type='sine';o.frequency.setValueAtTime(1280,now);
  o.frequency.exponentialRampToValueAtTime(830,now+.14);o.frequency.exponentialRampToValueAtTime(1100,now+.28);
  g.gain.setValueAtTime(.001,now);g.gain.linearRampToValueAtTime(.055,now+.06);
  g.gain.exponentialRampToValueAtTime(.001,now+.36);
  o.connect(g);g.connect(output);audioOwnVoice(o,[o,g],{duration:.37,priority:3});o.start(now);o.stop(now+.37);
 }catch(e){}
}
