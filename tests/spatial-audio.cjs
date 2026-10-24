#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createFakeAudioClass}=require('./helpers/fake-spatial-audio.cjs');
const root=path.resolve(__dirname,'..'),audioSource=fs.readFileSync(path.join(root,'src/audio.js'),'utf8');
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-6,message+': '+actual+' / '+expected);
(async()=>{
 const THREE=await import(require('node:url').pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')));
 function fixture(options={}){
  const Constructor=createFakeAudioClass(options),context=vm.createContext({
   console,window:{AudioContext:Constructor},AC:null,eng:null,seaAudio:null,muted:false,paused:false,
   document:{hidden:false},simulationFocused:true,over:0,P:{x:0,y:0,z:0,hd:0},
   cam:new THREE.PerspectiveCamera(58,1,.1,1000),Math:Object.create(Math)
  });
  context.cam.position.set(0,5,10);context.cam.lookAt(0,5,0);
  // L'àudio no ha de consumir cap RNG compartit amb combat o generació.
  context.Math.random=()=>{throw new Error('Shared gameplay RNG consumed by audio')};
  vm.runInContext(audioSource,context,{filename:'src/audio.js'});
  return {context,Constructor,run:code=>vm.runInContext(code,context),get ac(){return context.AC}};
 }
 const game=fixture();
 const unlocked=game.context.initAudio({unlockOnly:true});
 assert.equal(game.Constructor.instances.length,1);
 assert.equal(game.ac.resumeCalls,1,'resume occurs synchronously inside the gesture');
 assert.equal(game.ac.buffers.length,0,'unlockOnly does not synthesise or allocate buffers');
 assert.equal(game.ac.liveSources().length,0,'unlockOnly creates no loops');
 await unlocked;await game.context.initAudio();
 const originalEngine=game.context.eng,originalSea=game.context.seaAudio;
 assert.equal(game.ac.liveSources().length,2,'one engine and one sea source');
 assert.equal(game.ac.buffers.length,1);
 for(let i=0;i<8;i++)await game.context.initAudio();
 assert.equal(game.Constructor.instances.length,1,'initAudio is idempotent');
 assert.equal(game.context.eng,originalEngine);assert.equal(game.context.seaAudio,originalSea);
 assert.equal(game.ac.liveSources().length,2,'restarts never duplicate persistent sources');
 const sourceA={},sourceB={};
 const position={x:70,y:1.65,z:0};
 assert.equal(game.context.snd('shot',.6,position,sourceA),true);
 assert.equal(game.context.snd('shot',.6,position,sourceB),true,'different enemies survive the same tick throttle');
 assert.equal(game.context.snd('shot',.6,position,sourceA),false,'one source is throttled even at currentTime=0');
 let voices=game.run('[...audioRuntime.voices]');
 assert.equal(voices.length,2);assert.notEqual(voices[0].source,voices[1].source);
 assert.equal(voices[0].source.buffer,voices[1].source.buffer,'a cached buffer feeds fresh sources');
 close(voices[0].gain.gain.value,.15,'distance attenuates exactly once at 70/140m');
 let panners=game.ac.nodes.filter(node=>node.kind==='panner');
 assert.equal(panners.length,2);assert.equal(panners[0].panningModel,'HRTF');
 assert.equal(panners[0].rolloffFactor,0,'native attenuation disabled because gain owns distance');
 close(panners[0].positionX.value,70,'world source position');
 game.context.P.x=35;game.context.updateAudioListener();
 close(voices[0].gain.gain.value,.225,'active sources follow listener movement');
 close(game.ac.listener.positionX.value,35,'ear anchored to player, not third person camera');
 close(game.ac.listener.positionY.value,1.65,'ear height');
 game.context.cam.position.set(-50,9,70);game.context.cam.lookAt(-40,14,70);game.context.updateAudioListener();
 const direction=game.context.cam.getWorldDirection(new THREE.Vector3());
 close(game.ac.listener.forwardX.value,direction.x,'actual free look / scope camera orientation X');
 close(game.ac.listener.forwardY.value,direction.y,'actual pitched camera orientation Y');
 close(game.ac.listener.forwardZ.value,direction.z,'actual camera orientation Z');
 assert.equal(game.context.P.hd,0,'looking did not change player heading');
 game.context.P.x=0;game.context.snd('pick');game.context.snd('hurt');
 voices=game.run('[...audioRuntime.voices]');
 assert.equal(voices.filter(voice=>!voice.position).length,2,'UI and personal damage remain centred');
 assert.equal(game.ac.nodes.filter(node=>node.kind==='panner').length,2);
 const ended=voices[0];ended.source.finish();
 assert.ok(ended.nodes.every(node=>node.disconnected),'ended disconnects source/filter/gain/panner');
 assert.equal(game.run('audioRuntime.voices.size'),3);
 game.context.audioReset();
 assert.equal(game.run('audioRuntime.voices.size'),0);assert.equal(game.run('audioRuntime.sourceTimes.size'),0);
 assert.equal(game.context.snd('shot',1,{x:140,y:1.65,z:0},{}),false,'outside shot range makes no source');
 assert.equal(game.context.snd('boom',1,{x:199,y:1.65,z:0},{}),true,'explosions retain 200m range');
 assert.equal(game.context.snd('enemyStep',1,{x:31,y:1.65,z:0},{}),false,'enemy steps are nearby cues');
 assert.equal(game.context.snd('alert',1,{x:69,y:1.65,z:0},{}),true,'alerts have their own audible range');
 game.context.audioReset();
 for(let i=0;i<100;i++)game.context.snd('boom',1,{x:i%20,y:1.65,z:0},{});
 assert.equal(game.run('[...audioRuntime.voices].filter(v=>v.position).length'),18,'world polyphony bounded');
 const protectedExplosions=game.run('[...audioRuntime.voices].map(v=>v.source)');
 assert.equal(game.context.snd('enemyStep',1,{x:1,y:1.65,z:0},{}),false,'a step cannot evict important world cues');
 assert.equal(game.context.snd('shot',1,{x:1,y:1.65,z:0},{}),false,'shots preserve ongoing explosion and alert cues');
 assert.ok(protectedExplosions.every(source=>!source.ended),'important cues keep playing under footstep pressure');
 game.context.deathBell(.8);game.context.audioGullCry();
 assert.equal(game.run('audioRuntime.voices.size'),24,'cinematics fit the global limit');
 for(let i=0;i<100;i++)game.context.snd('shot',1,{x:1,y:1.65,z:0},{});
 assert.ok(game.run('audioRuntime.voices.size')<=24);assert.ok(game.ac.liveSources().length<=26);
 game.context.audioReset();
 for(let i=0;i<600;i++)game.context.snd('shot',1,{x:1,y:1.65,z:0},'source-'+i);
 assert.ok(game.run('audioRuntime.sourceTimes.size')<=256,'primitive throttle map bounded with stopped clock');
 const bufferCount=game.ac.buffers.length;
 game.context.audioReset();game.context.snd('shot',1,position,sourceA);
 assert.equal(game.ac.buffers.length,bufferCount,'reset retains reusable buffers');
 game.ac.advance(.2);
 assert.equal(game.run('audioRuntime.voices.size'),0,'natural completion releases all short voices');
 game.context.snd('boom',1,{x:0,y:1.65,z:0},{});game.context.deathBell(.7);
 const beforePause=game.ac.liveSources().filter(node=>!node.loop&&node!==originalEngine.o);
 await game.context.audioPause();
 assert.equal(game.ac.state,'suspended');assert.equal(game.run('audioRuntime.voices.size'),0);
 assert.ok(beforePause.every(node=>node.ended&&node.disconnected));
 close(game.context.eng.g.gain.value,0,'pause silences engine');close(game.context.seaAudio.gain.gain.value,0,'pause silences sea');
 assert.equal(game.context.snd('pick'),false,'paused calls do not queue');
 await game.context.audioResume();game.ac.advance(6);
 assert.equal(game.run('audioRuntime.voices.size'),0,'resume does not replay old voices');
 game.context.deathBell(.5);await game.context.setAudioMuted(true);
 assert.equal(game.run('audioRuntime.voices.size'),0);assert.equal(game.run('audioRuntime.master.gain.value'),0);
 assert.equal(game.context.snd('hurt'),false);assert.equal(game.ac.state,'suspended');
 game.context.paused=true;await game.context.audioPause();
 const resumeCalls=game.ac.resumeCalls;await game.context.setAudioMuted(false);
 assert.equal(game.ac.resumeCalls,resumeCalls,'unmute in pause leaves context suspended');
 assert.equal(game.context.paused,true,'unmute does not resume gameplay');
 game.context.paused=false;await game.context.audioResume();
 assert.equal(game.ac.state,'running');assert.equal(game.run('audioRuntime.master.gain.value'),1);
 game.context.snd('boom',1,{x:1,y:1.65,z:0},{});game.context.document.hidden=true;game.context.updateAudioFrame();
 assert.equal(game.run('audioRuntime.voices.size'),0);assert.equal(game.ac.state,'suspended','hidden document suspends sound');
 game.context.document.hidden=false;await game.context.audioResume();
 game.context.snd('boom',1,{x:1,y:1.65,z:0},{});game.context.simulationFocused=false;game.context.updateAudioFrame();
 assert.equal(game.run('audioRuntime.voices.size'),0,'focus loss cleans sound even during cinematics');
 const oldContext=game.ac;oldContext.state='closed';game.context.simulationFocused=true;
 assert.equal(game.context.window.HUNTER_PRIMED_AUDIO_CONTEXT,oldContext,'closed context is still the menu handoff before recovery');
 await game.context.initAudio();
 assert.equal(game.Constructor.instances.length,2,'a closed context can be replaced');
 const recovered=game.ac;
 assert.equal(game.context.window.HUNTER_PRIMED_AUDIO_CONTEXT,recovered,'recovery updates the menu handoff to the live replacement');
 // Contracte del clic de menu-boot: reusar el slot viu, crear només si falta o és tancat.
 let nextGestureContext=game.context.window.HUNTER_PRIMED_AUDIO_CONTEXT;
 if(!nextGestureContext||nextGestureContext.state==='closed')
  nextGestureContext=game.context.window.HUNTER_PRIMED_AUDIO_CONTEXT=new game.context.window.AudioContext();
 await Promise.resolve(nextGestureContext.resume()).catch(()=>{});
 await game.context.initAudio();
 assert.equal(nextGestureContext,recovered,'the next menu gesture reuses the recovered context');
 assert.equal(game.Constructor.instances.length,2,'recovery and another menu click never create a third context');
 assert.ok(originalEngine.o.ended&&originalEngine.o.disconnected);assert.ok(originalSea.noise.ended&&originalSea.noise.disconnected);
 game.context.snd('shot',1,{x:1,y:1.65,z:0},{});
 assert.ok(game.ac.buffers.every(buffer=>!oldContext.buffers.includes(buffer)),'buffers never cross contexts');
 for(const option of [{noPanner:true},{throwPanner:true},{legacy:true}]){
  const fallback=fixture(option);await fallback.context.initAudio();
  assert.equal(fallback.context.snd('shot',.6,position,{}),true);
  close(fallback.run('[...audioRuntime.voices][0].gain.gain.value'),.15,'fallback single distance gain');
  fallback.context.audioReset();assert.equal(fallback.run('audioRuntime.voices.size'),0);
 }
 const noAudio=fixture();noAudio.context.window={};
 assert.equal(await noAudio.context.initAudio(),false);assert.equal(noAudio.context.snd('pick'),false);
 await noAudio.context.audioPause();await noAudio.context.audioResume();await noAudio.context.setAudioMuted(true);
 const primed=fixture(),primedContext=new primed.Constructor();primed.context.window={HUNTER_PRIMED_AUDIO_CONTEXT:primedContext};
 await primed.context.initAudio();assert.equal(primed.ac,primedContext,'adopts menu-boot context without constructor');
 const rejections=[];const onRejection=error=>rejections.push(error);process.on('unhandledRejection',onRejection);
 for(const options of [{rejectResume:true},{throwResume:true},{rejectSuspend:true}]){
  const blocked=fixture(options);await blocked.context.initAudio();
  await blocked.context.audioPause();await blocked.context.audioResume();await blocked.context.setAudioMuted(true);
  blocked.context.snd('shot',1,position,{});
 }
 const racing=fixture({deferResume:true});const pending=racing.context.initAudio();
 await racing.context.audioPause();racing.ac.resumePending.shift().resolve();await pending;
 assert.equal(racing.ac.state,'suspended','late resume resolution cannot revive paused context');
 const muting=fixture({deferResume:true});const mutePending=muting.context.initAudio();
 await muting.context.setAudioMuted(true);muting.ac.resumePending.shift().resolve();await mutePending;
 assert.equal(muting.ac.state,'suspended','late resume resolution cannot undo mute');
 assert.equal(muting.run('audioRuntime.master.gain.value'),0);
 await new Promise(resolve=>setImmediate(resolve));process.removeListener('unhandledRejection',onRejection);
 assert.equal(rejections.length,0,'all resume/suspend failures are handled');
 // Integració real: avisos i passes d'àudio no afegeixen sorolls d'IA.
 const actual=await require('./harness.cjs')();actual.context.AudioContext=createFakeAudioClass();
 await actual.run('initAudio()');
 const result=actual.run(`(()=>{
  world=new THREE.Group();scene.add(world);seedSearchMode=true;R=()=>.5;
  hAt=()=>3;groundAt=()=>3;treeHit=()=>false;TG.clear();Wl=[];B=[];V=[];E=[];
  started=1;over=0;paused=false;cv=null;ib=null;activeBunker=null;
  P.x=0;P.y=3;P.z=-30;cheats.invisible=false;playerCrouched=false;disg=false;
  const a=mkEn('soldat',0,0,3),b=mkEn('soldat',2,0,3);
  STEALTH.clear();audioReset();
  snd('shot',1,{x:2,y:4.65,z:0},a);snd('alert',1,{x:2,y:4.65,z:0},b);
  enemyStepSound(a,2);enemyStepSound(b,2);
  const audioOnlyEvents=STEALTH.events().length;
  audioReset();soldierWarnNeighbors(a,P,P.y);
  const warningEvents=STEALTH.events().map(e=>({kind:e.kind,radius:e.radius}));
  STEALTH.clear();audioReset();
  shoot(70,P.y+1.65,-30,0,0,-1,70,1,0,'e',mW,SMALL_ARMS_SCALE,a);
  const shotGain=[...audioRuntime.voices].at(-1).gain.gain.value;
  shoot(0,4.65,-30,0,0,-1,70,1,0,'p',mW,SMALL_ARMS_SCALE);
  const playerEvents=STEALTH.events().map(e=>({kind:e.kind,radius:e.radius}));
  cv=null;P.hd=0;cam.position.set(-10,9,0);cam.lookAt(0,4.65,0);updateAudioFrame();
  const forward=new THREE.Vector3();cam.getWorldDirection(forward);
  const listener={x:AC.listener.positionX.value,y:AC.listener.positionY.value,z:AC.listener.positionZ.value,
    fx:AC.listener.forwardX.value,fy:AC.listener.forwardY.value,fz:AC.listener.forwardZ.value};
  panel('pause');const checkbox=document.getElementById('audioEnabledPause');
  const checked=checkbox.checked;checkbox.checked=false;checkbox.onchange();
  const mutedByUI=muted;checkbox.checked=true;const before=AC.resumeCalls;checkbox.onchange();
  return {audioOnlyEvents,warningEvents,shotGain,playerEvents,listener,forward,checked,mutedByUI,
    pausedAfterUnmute:paused,resumesFromUnmute:AC.resumeCalls-before,voicesAfterPause:audioRuntime.voices.size};
 })()`);
 assert.equal(result.audioOnlyEvents,0,'playing spatial cues never creates AI noise');
 assert.equal(result.warningEvents.length,1);assert.equal(result.warningEvents[0].kind,'alert');assert.equal(result.warningEvents[0].radius,65);
 close(result.shotGain,.15,'shoot callsite passes base volume, without duplicate pre-attenuation');
 assert.equal(result.playerEvents.length,1);assert.equal(result.playerEvents[0].kind,'pistol');assert.equal(result.playerEvents[0].radius,140);
 close(result.listener.x,0,'real runtime listener uses player');close(result.listener.y,4.65,'real runtime ear height');
 close(result.listener.fx,result.forward.x,'real camera free look');close(result.listener.fy,result.forward.y,'real camera pitch');
 assert.equal(result.checked,true);assert.equal(result.mutedByUI,true);assert.equal(result.pausedAfterUnmute,true);
 assert.equal(result.resumesFromUnmute,0);assert.equal(result.voicesAfterPause,0);
 actual.run(`
  clearDeathCinematic();clearVictoryCinematic();clearKeys();
  started=1;paused=false;over=0;hp=20;swimming=false;scopeActive=false;
  playerFall=null;playerEject=null;activeBunker=null;cameraBasement=null;
  B=[];Wl=[];Dr=[];stairs=[];E=[];items=[];fa=[];Pj=[];TG.clear();
  worldVisualTick=1000;palmVisualTick=1000;uiTick=-1000;hAt=()=>10;
  const o=mkV('cotxe');
  cv={t:'cotxe',x:0,z:0,hd:.35,v:0,sideV:0,strafeV:0,verticalV:0,
    steerInput:0,driveInput:0,yawRate:0,alt:10,o,life:20,maxLife:20};
  V=[cv];world.add(o);place(cv,elapsed,0,0);P.x=0;P.z=0;P.y=10;P.hd=.35;
  document.body.classList.add('game-started');resetCameraState();resume();
  cam.position.set(Math.sin(cv.hd)*VT.cotxe.cd,o.position.y+VT.cotxe.ch,Math.cos(cv.hd)*VT.cotxe.cd);
  globalThis.audioCameraSnapshot=()=>{const d=cam.getWorldDirection(new THREE.Vector3());return {
    dx:d.x,dy:d.y,dz:d.z,fx:AC.listener.forwardX.value,fy:AC.listener.forwardY.value,fz:AC.listener.forwardZ.value,
    px:P.x,pz:P.z,lx:AC.listener.positionX.value,lz:AC.listener.positionZ.value,hd:P.hd,vhd:cv?.hd,fov:cam.fov}}
 `);
 actual.dispatch('canvas','pointerdown',{pointerId:12,clientX:100,clientY:100,button:0});
 actual.dispatch('canvas','pointermove',{pointerId:12,clientX:250,clientY:100});actual.frame(50);
 let cameraResult=actual.run('audioCameraSnapshot()');
 close(cameraResult.fx,cameraResult.dx,'vehicle free look is the real camera X');
 close(cameraResult.fz,cameraResult.dz,'vehicle free look is the real camera Z');
 close(cameraResult.lx,cameraResult.px,'vehicle ear follows player X');close(cameraResult.lz,cameraResult.pz,'vehicle ear follows player Z');
 close(cameraResult.hd,.35,'vehicle free look preserves player heading');close(cameraResult.vhd,.35,'vehicle free look preserves chassis heading');
 assert.ok(Math.abs(cameraResult.fx+Math.sin(.35))>.2,'listener actually turns away from chassis heading');
 actual.dispatch('canvas','pointerup',{pointerId:12,clientX:250,clientY:100});
 actual.run('cv=null;resetCameraState();sniperEquipped=true;inv.franctirador=1;sniperAmmo=5;setSniperScope(true)');
 actual.dispatch('canvas','pointerdown',{pointerId:13,clientX:100,clientY:100,button:0});
 actual.dispatch('canvas','pointermove',{pointerId:13,clientX:230,clientY:180});actual.frame(50);
 cameraResult=actual.run('audioCameraSnapshot()');
 close(cameraResult.fx,cameraResult.dx,'sniper listener follows scope yaw');close(cameraResult.fy,cameraResult.dy,'sniper listener follows scope pitch');
 close(cameraResult.hd,.35,'scope preserves player heading');assert.ok(cameraResult.fov<10&&Math.abs(cameraResult.fy)>.01);
 actual.dispatch('canvas','pointerup',{pointerId:13,clientX:230,clientY:180});
 actual.run("setSniperScope(false);over=1;deathBell(.5);snd('boom',1,{x:P.x,y:P.y,z:P.z},{})");
 actual.dispatch('window','blur');
 assert.equal(actual.run('audioRuntime.voices.size'),0,'blur cleans cinematic voices immediately without waiting for a frame');
 assert.equal(actual.run('AC.state'),'suspended');
 console.log('OK spatial audio: context/buffer reuse, HRTF/fallback, single attenuation, camera listener, source throttle, limits, cleanup, autoplay, pause/mute UI and independent STEALTH');
})().catch(error=>{console.error(error);process.exitCode=1});
