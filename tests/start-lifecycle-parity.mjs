#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  createGenerationAttempt,resolveStartOptions,normalizeStartState
} from '../src/start-lifecycle-core.mjs';

// The original inline implementation in game-core v0.6.126.
function legacyAttempt(document){
 const listeners=new Set(),signal={aborted:false,
  addEventListener(type,fn){if(type==='abort')listeners.add(fn)},
  removeEventListener(type,fn){if(type==='abort')listeners.delete(fn)}};
 const cancel=()=>{signal.aborted=true;for(const fn of [...listeners])fn()};
 const loading=document.getElementById('generationLoading'),
   label=document.getElementById('generationStatus'),
   bar=document.getElementById('generationProgress');
 const controls=[...document.querySelectorAll('#ini button, #ini input, #ini select')],
   disabled=controls.map(el=>el.disabled);
 const report=state=>{
  const count=Number.isFinite(state.completed)?state.completed:null,
    total=Number.isFinite(state.total)?state.total:null;
  label.textContent=state.stage+(count===null?'':(' · '+count+
    (total===null?'':' / '+total)+(state.unit?' '+state.unit:'')));
  if(total>0&&count!==null){bar.max=total;bar.value=Math.min(total,count)}
  else bar.removeAttribute('value');
 };
 const enter=()=>{loading.hidden=false;controls.forEach(el=>el.disabled=true)};
 const leave=()=>{controls.forEach((el,i)=>el.disabled=disabled[i]);loading.hidden=true};
 return {signal,cancel,report,enter,leave};
}
function makeDocument(flags){
 const events=[],nodes={
  generationLoading:{hidden:true},generationStatus:{textContent:'-'},
  generationProgress:{max:100,value:0,removed:[],
   removeAttribute(name){this.removed.push(name);events.push('remove:'+name)}}
 };
 const controls=flags.map(v=>({disabled:v}));
 const doc={
  getElementById(id){events.push('get:'+id);return nodes[id]},
  querySelectorAll(query){
   events.push('query:'+query);return controls;
  }
 };
 return {doc,nodes,controls,events,snapshot(){
  return {nodes:JSON.parse(JSON.stringify(nodes)),controls:controls.map(x=>x.disabled),events:[...events]};
 }};
}
function same(a,b,info){assert.deepEqual(a.snapshot(),b.snapshot(),info)}
let seed=0x829abbd1;
function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296}
const choose=xs=>xs[Math.floor(random()*xs.length)];
let progressCases=0,aborts=0;
for(let j=0;j<130;j++){
 const flags=Array.from({length:j%9},(_,i)=>(i+j)%3===0),
   left=makeDocument(flags),right=makeDocument(flags);
 const old=legacyAttempt(left.doc),fresh=createGenerationAttempt(right.doc);
 same(left,right,'initial control snapshot '+j);
 old.enter();fresh.enter();same(left,right,'enter/disabled '+j);
 const historyA=[],historyB=[];
 const callback=(array,name)=>()=>array.push(name);
 const a1=callback(historyA,'a'),a2=callback(historyA,'b'),
   b1=callback(historyB,'a'),b2=callback(historyB,'b');
 old.signal.addEventListener('abort',a1);fresh.signal.addEventListener('abort',b1);
 old.signal.addEventListener('abort',a2);fresh.signal.addEventListener('abort',b2);
 old.signal.addEventListener('change',()=>{throw Error('unregistered')});
 fresh.signal.addEventListener('change',()=>{throw Error('unregistered')});
 if(j%4===0){old.signal.removeEventListener('abort',a1);fresh.signal.removeEventListener('abort',b1);}
 if(j%4===1){old.signal.removeEventListener('abort',a2);fresh.signal.removeEventListener('abort',b2);}
 for(let i=0;i<8;i++){
  const state={stage:choose(['Preparant','Mar','Costes',''],),
   completed:choose([null,undefined,NaN,Infinity,0,-1,1,2,3,4.5,10,100]),
   total:choose([null,undefined,NaN,Infinity,-1,0,1,2,9,10,18,100]),
   unit:choose([undefined,'','illes','passos'])};
  old.report(state);fresh.report(state);
  same(left,right,'progress '+j+':'+i);
  progressCases++;
 }
 if(j%3!==0){old.cancel();fresh.cancel();aborts++;}
 if(j%5===0){old.cancel();fresh.cancel();aborts++;}
 assert.equal(fresh.signal.aborted,old.signal.aborted);
 assert.deepEqual(historyB,historyA,'abort listener ordering '+j);
 old.leave();fresh.leave();same(left,right,'restored initial disabled flags '+j);
}

// Independent oracle for the original start options and state normalizer.
function baselineRead(difficulty,stressPreset,readScale,randomSeed,readSeedText,seedFromText){
 if(stressPreset)return {difficulty,scale:stressPreset.scale,seed:stressPreset.seed};
 return {difficulty,scale:readScale(),seed:randomSeed()?null:seedFromText(readSeedText()||'hunter')};
}
function baselineNormalize({difficulty,scale,seed},hash){
 const DIF=+difficulty,MAP_SCALE=+scale===2?2:1,S=4800*MAP_SCALE,H=S/2;
 const requestedSeed=seed==null?null:hash(seed);
 return {difficulty:DIF,mapScale:MAP_SCALE,size:S,halfSize:H,requestedSeed};
}
function seedFromText(v){
 v=String(v??'').trim();if(/^-?\d+$/.test(v))return Number(BigInt(v)&0xffffffffn);
 let h=2166136261>>>0;
 for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}
 return h>>>0;
}
let options=0;
for(let i=0;i<720;i++){
 const flags={difficulty:choose([0,1,2,3,'1','2',null,undefined]),
  stressPreset:i%11===0?{scale:1,seed:2407759483}:null};
 const scale=choose([1,2,'2','0',3,null,undefined]),
   seeded=choose([true,false]),
   text=choose(['hunter','148','-1','-4294967298','',undefined,'🎯','llavor',' 67 ']);
 let oldReads=[],freshReads=[];
 function inputs(log){
  return {readScale:()=>{log.push('scale');return scale},
   randomSeed:()=>{log.push('random');return seeded},
   readSeedText:()=>{log.push('seed');return text},seedFromText:v=>{log.push('hash:'+v);return seedFromText(v)}};
 }
 const x=inputs(oldReads),y=inputs(freshReads);
 const expected=baselineRead(flags.difficulty,flags.stressPreset,
  x.readScale,x.randomSeed,x.readSeedText,x.seedFromText);
 const actual=resolveStartOptions({...flags,...y});
 assert.deepEqual(actual,expected,'start options '+i);
 assert.deepEqual(freshReads,oldReads,'lazy evaluation of stress and random-seed options '+i);
 const stateA=baselineNormalize({difficulty:flags.difficulty,scale,seed:text},seedFromText),
  stateB=normalizeStartState({difficulty:flags.difficulty,scale,seed:text},seedFromText);
 assert.deepEqual(stateB,stateA,'world size and exact seed '+i);
 options++;
}
const core=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8'),
 boot=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8'),
 harness=readFileSync(new URL('./harness.cjs',import.meta.url),'utf8');
assert(core.includes('generationAttempt.enter()')&&core.includes('generationAttempt.leave()'));
assert(core.includes('generationCancel=generationAttempt.cancel'));
assert(core.includes('signal:generationAttempt.signal'));
assert(core.includes('onProgress:generationAttempt.report'));
assert(core.includes('normalizeStartState('));
assert(boot.includes('window.HUNTER_START_LIFECYCLE=startLifecycle'));
assert(harness.includes('c.HUNTER_START_LIFECYCLE=await import('));
console.log('PASS startup lifecycle parity: '+progressCases+' progress samples, '+
  aborts+' aborts, '+options+' seed/size combinations and DOM cleanup');
