'use strict';
// Independent integration: real progressive controller plus audible graph state.
const assert=require('node:assert/strict');
const createGame=require('./harness.cjs');
const {createFakeAudioClass}=require('./helpers/fake-spatial-audio.cjs');
(async()=>{
  const game=await createGame(),FakeAudio=createFakeAudioClass();
  game.context.AudioContext=FakeAudio;
  assert.equal(typeof game.context.HUNTER_START_GAME,'function','phase 10 controller is present');
  await game.run('initAudio()');
  const ac=game.run('AC'),engine=game.run('eng'),sea=game.run('seaAudio');
  game.run(`world=new THREE.Group();scene.add(world);seedSearchMode=true;
    started=1;paused=false;over=0;simulationFocused=true;document.hidden=false;
    P.x=0;P.y=0;P.z=0;cv=null;STEALTH.clear();
    snd('boom',1,{x:0,y:1.65,z:0},{});deathBell(.5);`);
  assert.ok(game.run('audioRuntime.voices.size')>0,'old operation has sounds to clear');
  const oldVoices=game.run('[...audioRuntime.voices]');
  const loading=game.startAsync('67',1);
  let settled=false,failure,turns=0;
  loading.then(()=>settled=true,error=>{failure=error;settled=true});
  for(const voice of oldVoices)assert.ok(voice.source.ended,'starting a new operation immediately stops old sounds');
  while(!settled){
    const worked=await game.runTask();
    if(!settled&&worked){
      turns++;
      assert.equal(game.run('started'),0);
      assert.equal(game.run('audioRuntime.voices.size'),0,'loading cannot retain transient voices');
      assert.equal(game.run('audioRuntime.master.gain.value'),0,'loading keeps the output silent');
      assert.equal(game.run('eng.g.gain.value'),0);
      assert.equal(game.run('seaAudio.gain.gain.value'),0);
      assert.equal(game.run("snd('shot',1,{x:P.x,y:P.y+1.65,z:P.z},{})"),false,'loading does not queue new sounds');
      game.frame(250);
    }
    if(!worked)await game.microtasks();
    assert.ok(turns<100000,'progressive operation terminates');
  }
  if(failure)throw failure;
  await loading;await game.microtasks();
  assert.ok(turns>10,'real world generation yielded multiple times');
  assert.equal(game.run('AC'),ac,'progressive restart keeps the same audio context');
  assert.equal(game.run('eng'),engine);assert.equal(game.run('seaAudio'),sea);
  assert.equal(FakeAudio.instances.length,1);
  assert.equal(game.run('elapsed'),0);
  assert.equal(game.run('audioRuntime.voices.size'),0,'completion does not replay old sounds');
  assert.equal(game.run('audioRuntime.master.gain.value'),1,'ready operation restores the output');

  game.run('P.x=0;P.y=0;P.z=0;audioReset();updateAudioListener();STEALTH.clear()');
  const beforeCull=ac.nodes.length;
  assert.equal(game.run("snd('boom',1,{x:0,y:201.65,z:0},{})"),false,'vertical distance participates in culling');
  assert.equal(ac.nodes.length,beforeCull,'distant vertical sources allocate no voice graph');
  assert.equal(game.run("snd('boom',1,{x:0,y:101.65,z:0},{})"),true);
  assert.ok(Math.abs(game.run('[...audioRuntime.voices][0].gain.gain.value')-.25)<1e-9,'height receives exactly one distance attenuation');
  assert.equal(game.run('STEALTH.events().length'),0,'positional audio never changes game hearing');
  game.run('audioReset()');

  const panner=ac.createPanner.bind(ac),bufferSource=ac.createBufferSource.bind(ac);
  let first=ac.nodes.length;
  ac.createPanner=()=>{const node=panner();node.connect=()=>{throw new Error('independent graph connection failure')};return node};
  assert.equal(game.run("snd('shot',1,{x:1,y:1.65,z:0},{})"),false);
  assert.equal(game.run('audioRuntime.voices.size'),0,'a failed spatial graph releases its voice slot');
  assert.ok(ac.nodes.slice(first).every(node=>node.disconnected),'partially connected graphs are disconnected');
  ac.createPanner=panner;first=ac.nodes.length;
  ac.createBufferSource=()=>{const node=bufferSource();node.start=()=>{throw new Error('independent start failure')};return node};
  assert.equal(game.run("snd('shot',1,{x:1,y:1.65,z:0},{})"),false);
  assert.equal(game.run('audioRuntime.voices.size'),0,'a start exception releases the reserved voice');
  assert.ok(ac.nodes.slice(first).every(node=>node.disconnected),'start exceptions release all graph nodes');
  ac.createBufferSource=bufferSource;
  assert.equal(game.run("snd('shot',1,{x:1,y:1.65,z:0},{})"),true,'audio can play again after graph failures');
  game.dispatch('window','blur');
  assert.equal(game.run('audioRuntime.voices.size'),0,'actual blur handler stops sounds immediately');
  assert.equal(ac.state,'suspended');
  console.log('OK independent audio: progressive loading stays silent, single context/loops, no stale replay, height, graph failures, blur and unchanged STEALTH');
})().catch(error=>{console.error(error);process.exitCode=1});
