#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/world-generation.js',import.meta.url),'utf8');
const start=source.indexOf('async function buildProgressively('),end=source.indexOf('function* buildSteps(){',start);
assert.ok(start>0&&end>start,'progressive generator must be available');
let clock=0;
const context={window:{},performance:{now:()=>clock},Promise};
vm.runInNewContext(`let generationDrainActive=false;
  function generationAbortError(){const e=new Error('cancelled');e.name='AbortError';return e}
  function scheduleGenerationTurn(){return Promise.resolve()}
  ${source.slice(start,end)}
  globalThis.testBuild=buildProgressively;`,context);
const reports=[],stages=['Preparant illes','Palmeres','Decoració'];
function* generator(){
 for(let i=0;i<1200;i++){
  yield {stage:stages[i<400?0:i<800?1:2],completed:i,total:1200};
 }
 return 'ready';
}
const result=await context.testBuild({
 iterator:generator(),schedule:()=>{clock+=12},
 onProgress:r=>reports.push({...r}),maxSteps:30,budgetMs:6
});
assert.equal(result,'ready');
assert.equal(context.window.HUNTER_GENERATION_STATE.status,'complete');
assert.equal(context.window.HUNTER_GENERATION_STATE.steps,1201);
assert.ok(reports.length<100,'a thousand checkpoints must not produce a thousand DOM updates');
assert.ok(reports.some(r=>r.stage===stages[0]));
assert.ok(reports.some(r=>r.stage===stages[1]));
assert.ok(reports.some(r=>r.stage===stages[2]));
assert.equal(reports[0].stage,'Preparant el món');
assert.equal(reports.at(-1).stage,'Món preparat');
assert.equal(reports.at(-1).status,'complete');
const broken=[];
try{
 await context.testBuild({
  iterator:(function*(){yield {stage:'fallada'};throw Error('Bad terrain')})(),
  schedule:()=>{},onProgress:r=>broken.push({...r})
 });
 assert.fail('generation exception must propagate');
}catch(e){assert.equal(e.message,'Bad terrain')}
assert.equal(broken.at(-1).status,'error');
console.log('PASS: startup progress is throttled without losing stage changes, checkpoints, final state or failures');
