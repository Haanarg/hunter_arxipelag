'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const zlib=require('node:zlib');
const vm=require('node:vm');
const snapshotSource=require('./phase10-snapshot.cjs');
const createGame=require('./harness.cjs');
const ROOT=path.resolve(__dirname,'..');
const FIXTURES=path.join(__dirname,'fixtures/phase10');
const manifest=JSON.parse(fs.readFileSync(path.join(FIXTURES,'manifest.json'),'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const plain=value=>JSON.parse(JSON.stringify(value));
function seedAmbientRandom(game){
  // v0.5.79 intentionally uses unseeded Math.random for beached-boat heading.
  // Isolate it for comparison without changing global Math or the world's R().
  const math=Object.create(Math),ambient={calls:0};let state=0x10c0ffee;
  math.random=()=>{ambient.calls++;state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
  game.context.Math=math;
  game.phase10ReviewAmbient=ambient;return ambient;
}
function installReviewAudio(game){
  const stats={contexts:0,resumes:0,buffers:0,bufferSamples:0};
  const parameter=()=>({value:0,setValueAtTime(){},setTargetAtTime(){},
    exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}});
  const node=()=>({frequency:parameter(),gain:parameter(),connect(){return this},start(){},stop(){}});
  game.context.AudioContext=class {
    constructor(){stats.contexts++;this.state='suspended';this.sampleRate=32;this.currentTime=0;this.destination={}}
    resume(){stats.resumes++;this.state='running';return Promise.resolve()}
    suspend(){this.state='suspended';return Promise.resolve()}
    createOscillator(){return node()}createGain(){return node()}
    createBufferSource(){return node()}createBiquadFilter(){return node()}
    createBuffer(channels,length){stats.buffers++;stats.bufferSamples+=length;return {getChannelData:()=>new Float32Array(length)}}
  };
  return stats;
}
function firstDifference(actual,expected,at='$'){
  if(Object.is(actual,expected))return null;
  if(typeof actual!==typeof expected||actual===null||expected===null||typeof actual!=='object')
    return `${at}: actual ${JSON.stringify(actual)}, baseline ${JSON.stringify(expected)}`;
  const actualKeys=Object.keys(actual),expectedKeys=Object.keys(expected);
  if(actualKeys.join('\0')!==expectedKeys.join('\0'))return `${at}: keys differ (${actualKeys.join(',')}) vs (${expectedKeys.join(',')})`;
  for(const k of actualKeys){const difference=firstDifference(actual[k],expected[k],at+'.'+k);if(difference)return difference}
  return null;
}
function checkSnapshot(game,testCase,label){
  const actual=game.run(snapshotSource),bytes=Buffer.from(JSON.stringify(actual));
  if(hash(bytes)!==testCase.sha256){
    let difference=Object.keys(testCase.fingerprints).filter(key=>hash(JSON.stringify(actual[key]))!==testCase.fingerprints[key]).join(', ');
    // Full original snapshots remain optional diagnostics outside the repository.
    if(process.env.PHASE10_BASELINE_DIAGNOSTIC_DIR){
      const baselineBytes=zlib.gunzipSync(fs.readFileSync(path.join(process.env.PHASE10_BASELINE_DIAGNOSTIC_DIR,testCase.file)));
      assert.equal(hash(baselineBytes),testCase.sha256,'original full diagnostic fixture integrity');
      difference=firstDifference(actual,JSON.parse(baselineBytes));
    }
    assert.fail(`${label}: semantic state differs from untouched v0.5.79: ${difference}`);
  }
  return actual;
}
const observeSource=`(()=>({
  started,elapsed,hp,kills,projectiles:Pj.length,
  seed,requestedSeed,world:world?.uuid??null,
  buildings:B.length,walls:Wl.length,palms:PL.length,loot:items.length,vehicles:V.length,enemies:E.length,
  work:{...phase10ReviewWork},
  terrainVertices:terrainStream?.stats?.processedVertices??0,
  generation:window.HUNTER_GENERATION_STATE?{
    status:window.HUNTER_GENERATION_STATE.status,stage:window.HUNTER_GENERATION_STATE.stage,
    completed:window.HUNTER_GENERATION_STATE.completed,total:window.HUNTER_GENERATION_STATE.total,
    steps:window.HUNTER_GENERATION_STATE.steps,yields:window.HUNTER_GENERATION_STATE.yields,
    maxStepMs:window.HUNTER_GENERATION_STATE.maxStepMs,
    maxStepStage:window.HUNTER_GENERATION_STATE.maxStepStage,
    maxTurnMs:window.HUNTER_GENERATION_STATE.maxTurnMs
  }:null
}))()`;
async function reviewGame(testCase){
  const game=await createGame(ROOT);
  seedAmbientRandom(game);
  const audio=installReviewAudio(game);
  const originalQuery=game.context.document.querySelectorAll.bind(game.context.document),previouslyDisabled=game.el('phase10-review-disabled');
  previouslyDisabled.disabled=true;
  const controls=['normal','seedRandom','seedInput','mapSize'].map(id=>game.el(id));controls.push(previouslyDisabled);
  game.context.document.querySelectorAll=selector=>selector==='#ini button, #ini input, #ini select'?controls:originalQuery(selector);
  if(!testCase.physical)game.run('seedSearchMode=true');
  // Measure actual work as well as reported progress. These wrappers preserve every return value.
  game.run(`var phase10ReviewWork={heightCalls:0,rngCalls:0,aiCalls:0,damageCalls:0};
    var phase10ReviewFailHeight=false;
    var phase10ReviewHeight=hAt;
    hAt=function(...args){phase10ReviewWork.heightCalls++;
      if(phase10ReviewFailHeight)throw new Error('phase10 independent injected generation failure');
      return phase10ReviewHeight(...args)};
    var phase10ReviewIslands=genIslands;
    genIslands=function(...args){const result=phase10ReviewIslands(...args),next=R;
      R=function(){phase10ReviewWork.rngCalls++;return next()};return result};
    var phase10ReviewAI=updEn;
    updEn=function(...args){phase10ReviewWork.aiCalls++;return phase10ReviewAI(...args)};
    var phase10ReviewDamage=hurtP;
    hurtP=function(...args){phase10ReviewWork.damageCalls++;return phase10ReviewDamage(...args)};`);
  game.context.performance.now=()=>performance.now();
  const queue=[],records=[];
  game.context.HUNTER_GENERATION_SCHEDULE=checkpoint=>{
    records.push({...plain(checkpoint),observed:plain(game.run(observeSource)),ambientCalls:game.phase10ReviewAmbient.calls,at:performance.now()});
    return new Promise((resolve,reject)=>queue.push({resolve,reject,checkpoint}));
  };
  game.el('seedInput').value=String(testCase.seed);game.el('mapSize').value=String(testCase.scale);
  let eventCount=0;game.context.addEventListener('phase10-review-input',()=>eventCount++);
  return {game,queue,records,audio,controls,audioWasReady:false,get eventCount(){return eventCount}};
}
function clickStart(review){return review.game.el('normal').onclick()}
function track(promise){
  assert.ok(promise&&typeof promise.then==='function','real start UI returns the pending generation promise');
  const status={settled:false,value:null,error:null};
  promise.then(value=>{status.settled=true;status.value=value},error=>{status.settled=true;status.error=error});
  return status;
}
async function nextTask(review,{frames=false}={}){
  const {game,queue}=review;
  if(!queue.length)await flush();
  assert.ok(queue.length,'generation schedules a real task before continuing');
  const state=plain(game.run(observeSource));
  assert.equal(state.started,0,'gameplay remains inactive before world readiness');
  assert.equal(state.elapsed,0,'loading time never advances mission elapsed time');
  assert.equal(state.projectiles,0,'loading cannot fire or spawn projectiles');
  assert.equal(state.kills,0,'loading cannot run combat');
  assert.equal(state.work.aiCalls,0,'enemy AI never runs before readiness');
  assert.equal(state.work.damageCalls,0,'damage is never applied before readiness');
  assert.ok(review.controls.every(control=>control.disabled),'difficulty and seed controls are disabled during a build');
  assert.equal(game.el('generationLoading').hidden,false,'loading surface stays visible until real readiness');
  assert.equal(game.context.document.body.classList.contains('game-generating'),true);
  if(!review.audioWasReady)assert.equal(review.audio.buffers,0,'audio buffer synthesis is deferred until the world is complete');
  assert.notEqual(state.generation?.status,'ready','pending task is not already reported ready');
  assert.doesNotMatch(game.el('startLoading').textContent,/\b100\s*%/,'UI never reports 100% before readiness');
  assert.doesNotMatch(game.el('generationStatus').textContent,/Món preparat|100\s*%/i,'a completed stage does not claim global readiness');
  const before={hp:state.hp,elapsed:state.elapsed,rngCalls:state.work.rngCalls,heightCalls:state.work.heightCalls};
  game.dispatch('window','phase10-review-input');
  if(frames){
    game.frame(250);game.frame(250);
    const after=plain(game.run(observeSource));
    assert.equal(after.started,0);assert.equal(after.hp,before.hp,'frames do not damage player during loading');
    assert.equal(after.elapsed,before.elapsed,'frames do not age mission during loading');
    assert.equal(after.work.rngCalls,before.rngCalls,'frames do not run AI/RNG during loading');
    assert.equal(after.work.heightCalls,before.heightCalls,'frames do not run terrain/gameplay during loading');
    assert.equal(after.work.aiCalls,0,'frames do not run enemy AI before readiness');
    assert.equal(after.work.damageCalls,0,'frames do not apply damage before readiness');
  }
  const task=queue.shift();task.resolve();await flush();return task;
}
async function finish(review,status,options={}){
  let tasks=0;
  while(!status.settled){await nextTask(review,options);assert.ok(++tasks<100000,'generation terminates in bounded task count')}
  if(status.error)throw status.error;
  assert.equal(review.game.run('started'),1,'simulation begins only after async world completion');
  assert.equal(review.game.run('elapsed'),0,'new mission starts at elapsed zero');
  assert.equal(review.game.context.HUNTER_GENERATION_STATE.status,'ready');
  assert.equal(review.game.el('normal').disabled,false,'start controls recover after completion');
  assert.equal(review.game.el('phase10-review-disabled').disabled,true,'preexisting disabled controls retain their original state');
  assert.equal(review.audio.contexts,1,'audio unlock reuses one context');
  assert.ok(review.audio.resumes>=1,'audio context is resumed');
  assert.equal(review.audio.buffers,1,'recurring sea buffer is synthesised after successful generation');
  review.audioWasReady=true;
  return tasks;
}
function summarizeWork(review){
  let heights=0,rng=0,maxHeightCalls=0,maxRngCalls=0;
  const stages=new Map();
  for(const record of review.records){
    const work=record.observed.work;
    maxHeightCalls=Math.max(maxHeightCalls,work.heightCalls-heights);heights=work.heightCalls;
    maxRngCalls=Math.max(maxRngCalls,work.rngCalls-rng);rng=work.rngCalls;
    const stage=record.stage??record.observed.generation?.stage??'unknown';
    stages.set(stage,(stages.get(stage)||0)+1);
  }
  return {scheduledTasks:review.records.length,maxHeightCalls,maxRngCalls,
    maxStepMs:review.game.context.HUNTER_GENERATION_STATE.maxStepMs,
    maxStepStage:review.game.context.HUNTER_GENERATION_STATE.maxStepStage,
    maxTurnMs:review.game.context.HUNTER_GENERATION_STATE.maxTurnMs,stages:Object.fromEntries(stages)};
}
async function semanticCase(testCase){
  const label=`${testCase.seed}/${testCase.scale}/${testCase.physical?'physical':'logical'}`;
  const sync=await createGame(ROOT);
  seedAmbientRandom(sync);
  if(!testCase.physical)sync.run('seedSearchMode=true');
  sync.el('seedInput').value=String(testCase.seed);sync.el('mapSize').value=String(testCase.scale);
  // Explicitly exercise the synchronous adapter, separately from the real UI below.
  sync.run(`requestedSeed=${testCase.seed};MAP_SCALE=${testCase.scale};S=4800*MAP_SCALE;H=S/2;build()`);
  checkSnapshot(sync,testCase,label+' sync');
  const review=await reviewGame(testCase);
  let primed=null;
  if(testCase.physical){
    primed=new review.game.context.AudioContext();
    review.game.context.HUNTER_PRIMED_AUDIO_CONTEXT=primed;
  }
  const promise=clickStart(review),status=track(promise);
  assert.equal(review.game.run('started'),0,'click returns while generation is still pending');
  assert.equal(status.settled,false);
  assert.equal(review.audio.contexts,1,'audio is unlocked in the activation task');
  if(primed)assert.equal(review.game.run('AC'),primed,'runtime reuses the actual context primed by the deferred loader');
  assert.equal(review.audio.buffers,0,'unlock-only does not synthesise audio before generation');
  assert.equal(review.game.phase10ReviewAmbient.calls,0,'unlock-only does not consume ambient randomness before generation');
  const firstWorld=review.game.run('world?.uuid');
  review.game.el('seedInput').value='404';
  const duplicate=clickStart(review);
  assert.equal(duplicate,promise,'double click shares the pending start promise');
  assert.equal(review.game.run('world?.uuid'),firstWorld,'double click does not replace partial world');
  review.game.el('seedInput').value=String(testCase.seed);
  const tasks=await finish(review,status,{frames:testCase.physical});
  checkSnapshot(review.game,testCase,label+' real UI async');
  assert.ok(tasks>2,'generation is split into multiple scheduled tasks');
  assert.equal(review.eventCount,tasks,'input events run between every generation task');
  const intermediate=review.records.map(r=>r.observed.palms).filter(n=>n>0&&n<testCase.counts.palms);
  assert.ok(new Set(intermediate).size>2,'vegetation placement is genuinely progressive');
  const work=summarizeWork(review);
  assert.ok(Number.isFinite(work.maxStepMs)&&work.maxStepMs>=0,'maximum generator step duration is recorded');
  assert.ok(work.maxRngCalls<review.game.run('phase10ReviewWork.rngCalls')*.5,'largest RNG chunk is smaller than half of actual generation work');
  console.log('OK: phase10 untouched baseline parity and real UI tasks',label,JSON.stringify(work));
  return review;
}
async function recoveryCase(testCase){
  const review=await reviewGame(testCase),{game,queue}=review;
  const first=track(clickStart(review));
  while(game.run('B.length')===0)await nextTask(review);
  const stale=queue.shift();assert.ok(stale,'retain an old scheduler callback');
  await game.context.HUNTER_CANCEL_START();await flush();
  assert.equal(first.settled,true,'cancel settles without waiting for retained scheduler');
  assert.equal(first.error?.name,'AbortError');
  assert.equal(game.run('started'),0);
  assert.equal(game.el('normal').disabled,false,'cancel unlocks start UI');
  const second=track(clickStart(review));await flush();
  const beforeStale=plain(game.run(observeSource));
  stale.resolve();await flush();
  const afterStale=plain(game.run(observeSource));
  assert.deepEqual(afterStale,beforeStale,'late callback from cancelled job cannot mutate new world/state');
  assert.equal(second.settled,false);
  game.run('phase10ReviewFailHeight=true');
  while(!second.settled)await nextTask(review);
  assert.match(second.error?.message||'',/independent injected generation failure/,'mid-generation error is surfaced');
  assert.equal(game.run('started'),0);
  assert.equal(game.context.HUNTER_GENERATION_STATE.status,'error');
  assert.equal(game.el('normal').disabled,false,'failure unlocks retry');
  assert.match(game.el('startLoading').textContent,/error|reintent|prova/i,'failure is visible');
  game.run('phase10ReviewFailHeight=false');
  seedAmbientRandom(game);
  const retry=track(clickStart(review));await finish(review,retry);
  checkSnapshot(game,testCase,'retry after cancel/error');
  // Use the actual restart menu handler and its action closure.
  const restartButton=game.el('phase10-review-restart');restartButton.dataset.diff='1';
  const body=game.el('panelBody'),oldQuery=body.querySelectorAll;
  body.querySelectorAll=selector=>selector==='[data-diff]'?[restartButton]:oldQuery(selector);
  game.run("panel('restart')");
  assert.equal(typeof restartButton.onclick,'function','actual restart menu installs its click action');
  seedAmbientRandom(game);
  const restarted=track(restartButton.onclick());
  assert.equal(game.run('started'),0,'restart disables gameplay while rebuilding');
  await finish(review,restarted);
  checkSnapshot(game,testCase,'actual restart UI');
  console.log('OK: phase10 cancel, stale callback, generation error, retry and actual restart UI');
}
async function earlyFailureCase(testCase){
  const review=await reviewGame(testCase),{game}=review;
  game.run(`var phase10ReviewApply=applyGameStartOptions;
    applyGameStartOptions=function(...args){applyGameStartOptions=phase10ReviewApply;
      throw new Error('phase10 independent failure before first await')};`);
  const rejectedPromise=clickStart(review),failed=track(rejectedPromise);await flush();
  assert.equal(failed.settled,true);
  assert.match(failed.error?.message||'',/before first await/);
  assert.equal(game.run('generationPromise'),null,'failure before first await cannot retain a rejected generation slot');
  assert.equal(game.context.HUNTER_GENERATION_STATE.status,'error','startup error cannot leave a stale ready state');
  assert.equal(game.run('started'),0);assert.equal(game.el('normal').disabled,false);
  const retriedPromise=clickStart(review);
  assert.notEqual(retriedPromise,rejectedPromise,'retry after a synchronous startup error creates a new generation');
  const retry=track(retriedPromise);await finish(review,retry);
  checkSnapshot(game,testCase,'retry after first-await error');
  console.log('OK: phase10 startup error before first await releases slot and permits real UI retry');
}
async function focusCase(testCase){
  assert.equal(testCase.physical,true,'resumed simulation uses a physical world with real materials');
  for(const lost of ['blur','hidden']){
    const review=await reviewGame(testCase),{game}=review,status=track(clickStart(review));
    if(lost==='blur')game.dispatch('window','blur');
    else{game.context.document.hidden=true;game.dispatch('document','visibilitychange')}
    await finish(review,status);
    assert.equal(game.run('paused'),true,lost+' while loading keeps the ready game paused');
    const before=plain(game.run(observeSource));game.frame(250);game.frame(250);
    const after=plain(game.run(observeSource));
    assert.equal(after.elapsed,before.elapsed,lost+' cannot accumulate simulation while ready but unfocused');
    assert.equal(after.hp,before.hp);assert.equal(after.work.aiCalls,0);
    assert.equal(game.el('gamepanel').style.display,'flex','ready but unfocused shows an actionable pause menu');
    game.context.document.hidden=false;game.dispatch('document','visibilitychange');game.dispatch('window','focus');
    game.frame(250);game.frame(250);
    assert.equal(game.run('elapsed'),0,'returning focus still requires the explicit resume gesture');
    assert.equal(typeof game.el('resumeButton').onclick,'function');game.el('resumeButton').onclick();
    // This test measures real generator wall time, so align RAF timestamps with
    // that same performance clock when starting actual simulation after loading.
    const resumeAt=performance.now();game.frameAt(resumeAt+16);game.frameAt(resumeAt+32);
    assert.ok(game.run('elapsed')>0,'actual resume button activates the ready world');
  }
  console.log('OK: phase10 blur/hidden during load preserve pause until actual resume');
}
async function partialTerrainCancelCase(testCase){
  const review=await reviewGame(testCase),{game,queue}=review,initial=track(clickStart(review));
  let partial;
  for(let n=0;n<10000;n++){
    partial=game.run("world?.getObjectByName('hunter-terrain-stream')");
    if(partial?.children.length&&!game.run('terrainStream'))break;
    await nextTask(review,{frames:true});
  }
  assert.ok(partial?.children.length,'observe actual committed tiles while initial terrain is still being built');
  assert.equal(game.run('terrainStream'),null,'terrain generator has not returned its completed stream yet');
  const oldWorld=game.run('world'),resources=new Set();
  partial.traverse(node=>{if(node.geometry)resources.add(node.geometry);if(node.material)resources.add(node.material)});
  let disposed=0;for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
  const stale=queue.shift();assert.ok(stale);
  await game.el('generationCancel').onclick();await flush();
  assert.equal(initial.error?.name,'AbortError');
  assert.equal(game.run('world'),null);assert.equal(game.run('terrainStream'),null);
  assert.equal(oldWorld.parent,null,'cancel detaches the actual partially rendered world');
  assert.equal(partial.parent,null,'incomplete terrain generator removes its local root');
  assert.ok(disposed>=resources.size,'committed partial terrain geometries/material are disposed');
  game.run('seedSearchMode=true');
  const next=track(clickStart(review));await flush();
  const before=plain(game.run(observeSource));stale.resolve();await flush();
  assert.deepEqual(plain(game.run(observeSource)),before,'cancelled terrain callback cannot resume into a replacement world');
  await game.el('generationCancel').onclick();await flush();assert.equal(next.error?.name,'AbortError');
  console.log('OK: phase10 actual cancel UI disposes incomplete physical terrain and ignores late scheduler callback');
}
async function menuEnvironment({bootFailures=0}={}){
  const elements=new Map(),frames=[],eventTasks=[];let now=0,bootCalls=0,worldStarts=0,worldResolve,worldReject;
  let worldPromise;
  const noop=()=>{};
  function element(id){
    if(!elements.has(id)){
      const listeners=[];
      elements.set(id,{id,dataset:{},style:{},textContent:'',value:'desktop',checked:false,
        setAttribute:noop,focus:noop,querySelectorAll:()=>[],
        addEventListener(type,fn,capture){listeners.push({type,fn,capture})},
        click(){
          const event={type:'click',preventDefault:noop,stopped:false,stopImmediatePropagation(){this.stopped=true}};
          for(const listener of listeners.filter(l=>l.type==='click'&&l.capture)){
            const result=listener.fn(event);if(result?.then)eventTasks.push(result);if(event.stopped)return;
          }
          // Native HTMLElement.click() returns undefined even if onclick returns a Promise.
          if(this.onclick)this.onclick(event);
        }
      });
    }
    return elements.get(id);
  }
  const button=element('normal');button.dataset.d='1';element('ini').querySelectorAll=()=>[button];
  const context=vm.createContext({
    GAME_VERSION:'review',RUNTIME_BUNDLE_PATH:null,URL,URLSearchParams,
    location:{search:'',href:'https://example.invalid/',replace:noop},navigator:{connection:{saveData:true}},
    performance:{now:()=>now},requestAnimationFrame:fn=>frames.push(fn),setTimeout:noop,
    console:{info:noop,error:noop},document:{getElementById:element,createElement:()=>element(Symbol()),head:{appendChild:noop}},
    __phase10Boot:async()=>{
      bootCalls++;if(bootCalls<=bootFailures)throw new Error('independent boot import failure');
      context.HUNTER_READY=true;
      button.onclick=context.HUNTER_START_GAME=()=>{
        worldStarts++;worldPromise=new Promise((resolve,reject)=>{worldResolve=resolve;worldReject=reject});
        worldPromise.catch(()=>{});
        context.HUNTER_START_PROMISE=worldPromise;
        return worldPromise;
      };
    }
  });context.window=context;
  const menuHost={context},audio=installReviewAudio(menuHost),ambient=seedAmbientRandom(menuHost);
  let source=fs.readFileSync(path.join(ROOT,'src/menu-boot.mjs'),'utf8');
  source=source.replace(/^import[^\n]*;\s*$/gm,'');
  source=source.replace(/import\('\.\/bootstrap\.mjs[^']*'\)/g,'__phase10Boot()');
  source=source.replaceAll('import.meta.url',JSON.stringify('https://example.invalid/src/menu-boot.mjs'));
  vm.runInContext(source,context,{filename:'src/menu-boot.mjs (dependency mocks only)'});
  return {context,element,audio,ambient,
    click(){const previous=eventTasks.length;button.click();return eventTasks[previous]},
    async reachWorld(){
      await flush();
      // The loader may paint through one or two frames before world work begins.
      for(let i=0;i<8&&!worldStarts;i++){
        assert.ok(frames.length,'loader yields animation frame before generation');
        now+=20;frames.shift()(now);await flush();
      }
      assert.equal(worldStarts,1);
    },
    resolve(){now+=400;worldResolve()},reject(){worldReject(new Error('independent world failure'))},
    get bootCalls(){return bootCalls},get worldStarts(){return worldStarts}
  };
}
async function menuBootCase(){
  const env=await menuEnvironment(),begin=env.click();
  assert.equal(env.audio.contexts,1,'real deferred-engine click primes audio in the activation task');
  assert.equal(env.audio.resumes,1);assert.equal(env.audio.buffers,0);
  assert.equal(env.ambient.calls,0,'menu audio priming never consumes randomness');
  await flush();
  assert.equal(env.context.HUNTER_READY,true,'observe engine-ready handoff before first paint');
  assert.equal(env.worldStarts,0);
  env.click();await flush();
  assert.equal(env.worldStarts,0,'second click during ready/double-RAF handoff cannot start a competing world');
  await env.reachWorld();
  assert.equal(env.bootCalls,1);
  assert.notEqual(env.element('startLoading').style.display,'none','menu label remains visible until actual world promise settles');
  assert.equal(env.context.HUNTER_STARTUP_TIMINGS,undefined,'startup timings are not published at world request time');
  env.resolve();await begin;
  assert.ok(env.context.HUNTER_STARTUP_TIMINGS.worldMs>=400,'world timing covers full asynchronous generation');
  assert.ok(env.context.HUNTER_STARTUP_TIMINGS.totalMs>=400);
  assert.equal(env.element('startLoading').style.display,'none');
  assert.equal(env.worldStarts,1);
  const failedBoot=await menuEnvironment({bootFailures:1});await failedBoot.click();
  assert.equal(failedBoot.bootCalls,1);assert.equal(failedBoot.context.HUNTER_STARTUP_TIMINGS,undefined);
  assert.match(failedBoot.element('startLoading').textContent,/error|reintent/i);
  const retried=failedBoot.click();await failedBoot.reachWorld();
  assert.equal(failedBoot.bootCalls,2,'failed engine bootstrap can be retried by the real click handler');
  assert.equal(failedBoot.audio.contexts,1,'bootstrap retry reuses the primed audio context');
  failedBoot.resolve();await retried;
  assert.ok(failedBoot.context.HUNTER_STARTUP_TIMINGS.worldMs>=400);
  const failedWorld=await menuEnvironment(),badStart=failedWorld.click();await failedWorld.reachWorld();
  failedWorld.reject();await badStart;
  assert.equal(failedWorld.context.HUNTER_STARTUP_TIMINGS,undefined,'world rejection cannot publish success timings');
  assert.match(failedWorld.element('startLoading').textContent,/error|reintent/i);
  console.log('OK: phase10 actual menu bootstrap awaits native-click world promise, timings, boot retry and world errors');
}
(async()=>{
  const markup=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  assert.match(markup,/<label[^>]*for="generationProgress"[^>]*>Progrés de l’etapa actual<\/label>/,'stage progress has an explicit visible label');
  assert.match(markup,/<progress[^>]*id="generationProgress"[^>]*aria-label="Progrés de l’etapa actual"/,'stage progress has an explicit accessible label');
  const selected=manifest.cases.filter(testCase=>!process.env.PHASE10_CASE||
    `${testCase.seed}/${testCase.scale}/${testCase.physical?'physical':'logical'}`.includes(process.env.PHASE10_CASE));
  assert.ok(selected.length,'selected untouched baseline cases exist');
  if(process.env.PHASE10_ONLY==='menu'){await menuBootCase();return}
  if(process.env.PHASE10_ONLY==='recovery'){await recoveryCase(manifest.cases[0]);return}
  if(process.env.PHASE10_ONLY==='early'){await earlyFailureCase(manifest.cases[0]);return}
  if(process.env.PHASE10_ONLY==='focus'){await focusCase(manifest.cases.find(testCase=>testCase.physical));return}
  if(process.env.PHASE10_ONLY==='terrain-cancel'){await partialTerrainCancelCase(manifest.cases.find(testCase=>testCase.physical));return}
  for(const testCase of selected)await semanticCase(testCase);
  if(!process.env.PHASE10_ONLY){
    await recoveryCase(manifest.cases[0]);await earlyFailureCase(manifest.cases[0]);
    await focusCase(manifest.cases.find(testCase=>testCase.physical));await partialTerrainCancelCase(manifest.cases.find(testCase=>testCase.physical));await menuBootCase();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
