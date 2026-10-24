#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const c=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/simulation-clock.js'),'utf8'),c);
const create=options=>c.window.HUNTER_SIMULATION_CLOCK.create(options),
  close=(a,b,message)=>assert(Math.abs(a-b)<1e-10,`${message}: ${a} / ${b}`);
const clock=create(),steps=[];
const advance=(now,active=true)=>clock.advance(now,dt=>steps.push(dt),active);
assert.equal(advance(1000).steps,0,'First timestamp establishes a baseline');
let frame=advance(1100);
assert.equal(frame.steps,6);close(frame.acceptedDt,.1,'100ms accepted');
close(steps.reduce((a,b)=>a+b,0),.1,'100ms actually stepped');
assert(steps.every(dt=>dt>0&&dt<=1/60));
frame=advance(1350);
assert.equal(frame.steps,15);assert.equal(frame.acceptedDt,.25);assert.equal(frame.droppedDt,0);
frame=advance(4350);
assert.equal(frame.steps,15);assert.equal(frame.acceptedDt,.25);assert.equal(frame.droppedDt,2.75);
assert.equal(advance(4350).steps,0,'A long stall leaves no debt on the next frame');
frame=advance(4350+1000/120);
assert.equal(frame.steps,1);close(frame.simulatedDt,1/120,'120FPS keeps a smaller remainder');
clock.reset(5000);frame=advance(5100);
close(frame.simulatedDt,.1,'Reset discards all prior time');
const before=steps.length;frame=advance(6000,false);
assert.equal(steps.length,before,'Inactive time never reaches callback');
close(frame.idleDt,.9,'Idle accounting');assert.equal(frame.droppedDt,0);
close(advance(6010).simulatedDt,.01,'No idle backlog');
for(const bad of [NaN,Infinity,-1]){
  assert.equal(advance(bad).invalid,true);assert.equal(advance(7000).steps,0);
  close(advance(7010).simulatedDt,.01,'Recovers from invalid timestamps');
}
assert.equal(advance(7009).invalid,true,'Regressing timestamps reset the baseline');
assert.equal(advance(7020).steps,0);
clock.reset();assert.equal(advance(99999).steps,0,'Unspecified reset disarms the clock');
clock.reset(100000);let called=0;
frame=clock.advance(100250,()=>++called<3);
assert.equal(frame.steps,3);close(frame.simulatedDt,.05,'Callback stops at the current substep');
close(frame.interruptedDt,.2,'Unstepped accepted time is counted');close(frame.droppedDt,.2,'Stopped time is discarded');
close(advance(100350).simulatedDt,.1,'Callback stop leaves no hidden backlog');
clock.reset(101000);called=0;
frame=clock.advance(101250,()=>{called++;clock.reset(101250);return true});
assert.equal(called,1,'A lifecycle reset inside a callback ends the frame');
close(frame.simulatedDt,1/60,'Reset callback stepping');
const bounded=create({maxStep:.02,maxFrame:1,maxSteps:4});bounded.reset(0);
frame=bounded.advance(1000,()=>{});
assert.equal(frame.steps,4);assert.equal(frame.acceptedDt,.08);assert.equal(frame.droppedDt,.92);
for(const options of [{maxStep:0},{maxFrame:NaN},{maxSteps:1.5}])
  assert.throws(()=>create(options),{name:'RangeError'});
const stats=clock.stats;
close(stats.rawSeconds,stats.simulatedSeconds+stats.droppedSeconds+stats.idleSeconds,'All valid raw time is accounted for');
close(stats.acceptedSeconds,stats.simulatedSeconds+stats.interruptedSeconds,'All accepted time is accounted for');
assert.equal(stats.invalidFrames,4);
console.log('OK rellotge semi-fix: límits, restes, temps descartat, aturada, reset, timestamps invàlids i cap deute');
