#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createFrameTickCoordinator} from '../src/frame-tick-core.mjs';

const context=vm.createContext({window:{}});
vm.runInContext(readFileSync(new URL('../src/simulation-clock.js',import.meta.url),'utf8'),context);
const createClock=()=>context.window.HUNTER_SIMULATION_CLOCK.create();

// Oracle: exactly the original coordinator from game-core.js v0.6.125.
function legacyCoordinator({
 simulationClock,cinematicClock,resetEnemyPathFrameBudget,
 update,getElapsed,shouldContinueGameplay,setSimulationFrameActive,
 syncWeaponPicker,tickPersistence,getVictoryCinematic,getDeathCinematic,
 updateVictoryCinematic,updateDeathCinematic,canContinueCinematics
}){
 return {
  suspend(now){simulationClock.reset(now);cinematicClock.reset(now);},
  advanceGameplay(now,gameplayActive){
   resetEnemyPathFrameBudget();setSimulationFrameActive(true);
   let simulated;
   try{
    simulated=simulationClock.advance(now,dt=>{
     update(dt,getElapsed()+dt);
     return shouldContinueGameplay();
    },gameplayActive);
   }finally{setSimulationFrameActive(false);}
   if(!simulated.steps)update(0,getElapsed());
   syncWeaponPicker();tickPersistence();
   return simulated;
  },
  advanceCinematics(now,cinematicActive,victoryAtStart,deathAtStart){
   return cinematicClock.advance(now,dt=>{
    if(getVictoryCinematic()===victoryAtStart&&(victoryAtStart?.active||victoryAtStart?.finished))
     updateVictoryCinematic(dt);
    if(getDeathCinematic()===deathAtStart&&deathAtStart?.active)updateDeathCinematic(dt);
    return canContinueCinematics()&&
     (getVictoryCinematic()===victoryAtStart&&(victoryAtStart?.active||victoryAtStart?.finished)||
      getDeathCinematic()===deathAtStart&&deathAtStart?.active);
   },cinematicActive);
  }
 };
}
let seed=0x4352379a;
function random(){
 seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
 return (seed>>>0)/4294967296;
}
const timeline=[];
let now=1000;
for(let i=0;i<360;i++){
 now+=i%27===0?340:i%17===0?0:i%11===0?80:8+Math.floor(random()*25);
 timeline.push({now,started:i>2,paused:i%43===0,over:i%59===0,
  focused:i%41!==0,hidden:i%47===0,coop:i%9===0,
  generating:i%67===0,spawnVictory:i%37===0,spawnDeath:i%53===0,
  clearCinematic:i%29===0,finishAfter:i%61===0,
  swapVictory:i%73===0,swapDeath:i%83===0,
  gameplayInterruption:i%71===0,cinematicInterruption:i%79===0});
}
function run(creator){
 const state={elapsed:0,started:false,paused:false,over:false,focused:true,hidden:false,
  coop:false,frameActive:false,victory:null,death:null,updateCalls:0,cinematicCalls:0,
  finishAfter:false,swapVictory:false,swapDeath:false,gameplayInterruption:false,
  cinematicInterruption:false};
 const events=[];
 const gameplayClock=createClock(),cinematicClock=createClock();
 const deps={
  simulationClock:gameplayClock,cinematicClock,
  resetEnemyPathFrameBudget:()=>events.push('budget'),
  setSimulationFrameActive:b=>{state.frameActive=b;events.push('frame:'+b);},
  update:(dt,t)=>{
   state.elapsed+=dt;
   state.updateCalls++;
   events.push('update:'+dt.toFixed(12)+':'+t.toFixed(12)+':'+state.frameActive);
   if(state.finishAfter&&dt>0)state.over=true;
   if(state.gameplayInterruption&&dt>0)state.paused=true;
  },
  getElapsed:()=>state.elapsed,
  shouldContinueGameplay:()=>state.started&&!state.paused&&!state.over&&state.focused&&!state.hidden,
  syncWeaponPicker:()=>events.push('picker'),
  tickPersistence:()=>{
   if(!state.coop)events.push('autosave','cloud','journal');
  },
  getVictoryCinematic:()=>state.victory,
  getDeathCinematic:()=>state.death,
  updateVictoryCinematic:dt=>{
   state.cinematicCalls++;events.push('victory:'+dt.toFixed(12));
   if(state.swapVictory)state.victory={active:true,finished:false};
   if(state.cinematicInterruption)state.paused=true;
  },
  updateDeathCinematic:dt=>{
   state.cinematicCalls++;events.push('death:'+dt.toFixed(12));
   if(state.swapDeath)state.death={active:true};
  },
  canContinueCinematics:()=>!state.paused&&state.focused&&!state.hidden
 };
 const scheduler=creator(deps);
 gameplayClock.reset(1000);cinematicClock.reset(1000);
 const frames=[];
 for(let i=0;i<timeline.length;i++){
  const item=timeline[i];
  Object.assign(state,{
   started:item.started,paused:item.paused,over:item.over,focused:item.focused,
   hidden:item.hidden,coop:item.coop,finishAfter:item.finishAfter,
   swapVictory:item.swapVictory,swapDeath:item.swapDeath,
   gameplayInterruption:item.gameplayInterruption,
   cinematicInterruption:item.cinematicInterruption
  });
  if(item.clearCinematic){state.victory=null;state.death=null;}
  if(item.spawnVictory)state.victory={active:true,finished:false};
  if(item.spawnDeath)state.death={active:true};
  const begin=events.length;
  if(item.generating){scheduler.suspend(item.now);events.push('generating');continue;}
  const victoryAtStart=state.victory,deathAtStart=state.death;
  const visible=state.focused&&!state.hidden,
    gameplayActive=state.started&&!state.paused&&!state.over&&visible,
    cinematicActive=state.started&&!state.paused&&visible&&
     (!!victoryAtStart&&(victoryAtStart.active||victoryAtStart.finished)||!!deathAtStart?.active);
  const result=scheduler.advanceGameplay(item.now,gameplayActive);
  assert.equal(state.frameActive,false,'simulation flag must be cleared after every frame');
  const cinematic=scheduler.advanceCinematics(item.now,cinematicActive,victoryAtStart,deathAtStart);
  frames.push({index:i,sim:{...result},cin:{...cinematic},trace:events.slice(begin)});
 }
 return {frames,events,elapsed:state.elapsed,updateCalls:state.updateCalls,
  cinematicCalls:state.cinematicCalls,gameplayStats:JSON.parse(JSON.stringify(gameplayClock.stats)),
  cinematicStats:JSON.parse(JSON.stringify(cinematicClock.stats))};
}
const baseline=run(legacyCoordinator),refactored=run(createFrameTickCoordinator);
assert.deepEqual(refactored,baseline,'clock outcomes, event order, dt=0, lifecycle and both modes');
assert(baseline.events.some(e=>e==='generating'),'suspension after generation tested');
assert(baseline.events.some(e=>e.startsWith('death:')),'death cinematic tested');
assert(baseline.events.some(e=>e.startsWith('victory:')),'victory cinematic tested');
assert(baseline.events.includes('autosave'),'solo persistence tested');
// Exceptions in the gameplay callback must always release the flag.
for(const create of [legacyCoordinator,createFrameTickCoordinator]){
 let frameActive=false;
 const boom=new Error('forced step failure');
 const clock={reset(){},advance(_now,step){step(1/60);return {steps:1}}};
 const deps={
  simulationClock:clock,cinematicClock:clock,resetEnemyPathFrameBudget(){},
  update(){throw boom},getElapsed:()=>0,shouldContinueGameplay:()=>true,
  setSimulationFrameActive:x=>{frameActive=x},
  syncWeaponPicker(){},tickPersistence(){},getVictoryCinematic:()=>null,
  getDeathCinematic:()=>null,updateVictoryCinematic(){},
  updateDeathCinematic(){},canContinueCinematics:()=>false
 };
 const scheduler=create(deps);
 assert.throws(()=>scheduler.advanceGameplay(1000,true),e=>e===boom);
 assert.equal(frameActive,false,'exception must restore simulationFrameActive');
}
const core=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8'),
 boot=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8'),
 harness=readFileSync(new URL('./harness.cjs',import.meta.url),'utf8');
assert(core.includes('frameTickCoordinator.advanceGameplay(now,gameplayActive)'));
assert(core.includes('frameTickCoordinator.advanceCinematics(now,cinematicActive,victoryAtStart,deathAtStart)'));
assert(core.includes('frameTickCoordinator.suspend(now)'));
assert(!core.includes('simulated=simulationClock.advance(now,dt=>{'));
assert(boot.includes('window.HUNTER_FRAME_TICK=frameTick'));
assert(harness.includes('c.HUNTER_FRAME_TICK=await import('));
console.log('PASS frame tick coordinator: '+baseline.frames.length+
 ' frames, '+baseline.events.length+' ordered events, gameplay/cinematic clocks, suspension, exceptions');
