import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStandalonePortPlanner} from '../src/compound-planning.mjs';

// Independent source oracle taken verbatim from the pre-refactor v0.6.151.
const legacyWater="const findPortWater=function* (q){let checkpointUnits=0;for(let a=0;a<32;a++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const aa=a*Math.PI/16;for(let d=28;d<Math.max(100,q.r||180);d+=8){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const wx=q.x+Math.cos(aa)*d,wz=q.z+Math.sin(aa)*d;if(rawHAt(wx,wz)<-3&&rawHAt(wx+Math.cos(aa)*12,wz+Math.sin(aa)*12)<-3)return{x:wx,z:wz,hd:Math.atan2(-Math.cos(aa),-Math.sin(aa)),aa}}}return null};";
const legacySite="const findPortSite=function* (island,tries=18){let checkpointUnits=0;for(let n=0;n<tries;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const q=(yield* landSteps(island,700,1));if(!q)continue;q.r=island.r;const portBest=(yield* findPortWater(q));if(portBest)return{...q,portBest}}return null};";
const legacyPier="const makeStandalonePier=function* (q){let checkpointUnits=0;const best=q.portBest||(yield* findPortWater(q));if(!best)return false;const dx=best.x-q.x,dz=best.z-q.z,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L;let shore=null;for(let d=3;d<L;d+=2.5){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const sx=q.x+ux*d,sz=q.z+uz*d;if(rawHAt(sx,sz)<.35){shore={x:sx-ux*1.8,z:sz-uz*1.8};break}}if(!shore)return false;const pierLen=Math.min(34,Math.max(14,L-5)),end={x:shore.x+ux*pierLen,z:shore.z+uz*pierLen};compoundPier(shore.x,shore.z,end.x,end.z,3.6);for(const side of[-1,1]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const px=-uz,pz=ux;compoundProp('bollard',end.x+px*side*1.1,end.z+pz*side*1.1,0)}compoundClear.push({x:q.x,z:q.z,r:18});return true};";
const legacyFactory=new Function('rawHAt','landSteps','compoundPier','compoundProp','compoundClear',
 legacyWater+'\n'+legacySite+'\n'+legacyPier+
 '\nreturn {findPortWater,findPortSite,makeStandalonePier};');
const worldSource=readFileSync(new URL('../src/world-generation.js',import.meta.url),'utf8');
const start=worldSource.indexOf('const standalonePortPlanner=window.HUNTER_COMPOUND_PLANNING.createStandalonePortPlanner(');
const end=worldSource.indexOf('\nconst phase3Options=',start);
assert(start>=0&&end>start,'runtime invokes standalone port planner');
const runtimeFactory=new Function('rawHAt','landSteps','compoundPier','compoundProp','compoundClear','window',
 worldSource.slice(start,end)+
 '\nreturn {findPortWater,findPortSite,makeStandalonePier};');
const mainPlan=readFileSync(new URL('../src/compound-planning.mjs',import.meta.url),'utf8');
assert(mainPlan.includes('export function createStandalonePortPlanner('));
assert(!worldSource.includes('const findPortWater=function* (q)'),'old generator is no longer duplicated');
const seeds=[0,1,2,31,67,148,355,4099,90128,2407759483,4294967295];
function rng(seed){let state=seed>>>0;const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};next.state=()=>state;return next}
function terrain(kind,seed,x,z){
 const shift=seed%29-14;
 switch(kind){
  case 0:return 6; // all land
  case 1:return -8; // all deep sea
  case 2:return x>32+shift?-7:8; // east shore
  case 3:return z>42+shift?-7:6; // north shore
  case 4:return x< -60+shift?-7:6;
  case 5:return z< -76+shift?-7:6;
  case 6:return Math.hypot(x-90,z+45)>140?-8:7;
  case 7:return 3*Math.sin(x*.011)+4*Math.cos(z*.015)-2;
  case 8:return Math.abs(x)<20&&z>24?-6:5;
  case 9:return x>110+shift?-.5:3; // too shallow
  default:return Math.hypot(x,z)<90+shift?6:-8;
 }
}
function scenario(seed,scale,kind,mode,isLegacy=false){
 const reads=[],landCalls=[],effects={piers:[],props:[],clear:[]},random=rng(seed^Math.imul(scale,7));
 const rawHAt=(x,z)=>{reads.push([x,z]);return terrain(kind,seed,x,z)};
 function* landSteps(island,tries=700,flag=1){
  landCalls.push({island:{...island},tries,flag});
  const r=random();
  yield {stage:'Cercant terreny lliure',completed:0,total:tries,unit:'intents'};
  const distance=12+r*22;
  const theta=random()*Math.PI*2;
  if(mode===2||mode===3&&landCalls.length%3===0)return null;
  return {x:island.x+Math.cos(theta)*distance,
    z:island.z+Math.sin(theta)*distance,h:4+r*3};
 }
 const compoundPier=(...args)=>effects.piers.push(args);
 const compoundProp=(...args)=>effects.props.push(args);
 const compoundClear=effects.clear;
 const api=isLegacy
  ?legacyFactory(rawHAt,landSteps,compoundPier,compoundProp,compoundClear)
  :runtimeFactory(rawHAt,landSteps,compoundPier,compoundProp,compoundClear,
     {HUNTER_COMPOUND_PLANNING:{createStandalonePortPlanner}});
 return {api,reads,landCalls,effects,random};
}
function drain(iterator,limit=6000){
 const checkpoints=[];let step;
 for(let i=0;i<limit;i++){
  step=iterator.next();
  if(step.done)return {checkpoints,value:step.value};
  checkpoints.push(step.value);
 }
 assert.fail('generator exceeded cooperative checkpoint budget');
}
function compare(testName,a,b,make){
 const previous=drain(make(a)),next=drain(make(b));
 assert.deepEqual(next,previous,testName+' exact checkpoint/result');
 assert.deepEqual(b.reads,a.reads,testName+' exact terrain queries');
 assert.deepEqual(b.landCalls,a.landCalls,testName+' land attempts/RNG');
 assert.deepEqual(b.effects,a.effects,testName+' pier/bollard/clear mutations');
 assert.equal(b.random.state(),a.random.state(),testName+' RNG position');
 return next;
}
let waterCases=0,siteCases=0,pierCases=0,cancelCases=0;
for(const seed of seeds)for(const scale of [1,2])for(let kind=0;kind<11;kind++){
 const anchor={x:(seed%17-8)*scale,z:(seed%23-11)*scale,r:kind%3===0?undefined:kind%3===1?180:400};
 const a=scenario(seed,scale,kind,0,true),b=scenario(seed,scale,kind,0);
 compare('port water '+seed+'/'+scale+'/'+kind,a,b,c=>c.api.findPortWater({...anchor}));
 waterCases++;
}
for(const seed of seeds)for(const scale of [1,2])for(const kind of [0,1,2,3,7,10])
 for(const mode of [0,2,3])for(const tries of [0,1,3,6]){
  const island={x:seed%41-20,z:seed%33-16,r:180+scale*30};
  // Include null land-site results and different retry sequences, not just
  // successful coast searches. The injected callbacks remain identical.
  const actualOld=scenario(seed,scale,kind,mode,true),
    actualNew=scenario(seed,scale,kind,mode);
  compare('port site '+seed+'/'+scale+'/'+kind+'/'+mode+'/'+tries,
    actualOld,actualNew,c=>c.api.findPortSite({...island},tries));
  siteCases++;
 }
for(const seed of seeds)for(const scale of [1,2])for(const kind of [0,1,2,3,4,5,6,7,8,9,10])
 for(const preset of [false,true])for(const radius of [30,190,380]){
  const q={x:0,z:0,r:radius};
  if(preset)q.portBest={x:0,z:radius*.9};
  const a=scenario(seed,scale,kind,0,true),b=scenario(seed,scale,kind,0);
  compare('standalone pier '+seed+'/'+scale+'/'+kind+'/'+preset+'/'+radius,a,b,
    c=>c.api.makeStandalonePier({...q}));
  pierCases++;
 }
for(const seed of [67,148,355])for(const kind of [0,2,7]){
 const a=scenario(seed,1,kind,0,true),b=scenario(seed,1,kind,0);
 const q={x:0,z:0,portBest:{x:0,z:680}};
 const old=a.api.makeStandalonePier({...q}),next=b.api.makeStandalonePier({...q});
 const first=old.next(),second=next.next();
 assert.deepEqual(second,first,'first pause parity prior to cancelling');
 old.return();next.return();
 const total=a.reads.length;
 assert.deepEqual(b.reads,a.reads,'cancelled surveys read exactly the same samples');
 assert.equal(a.reads.length,total,'no new samples after cancellation');
 cancelCases++;
}
console.log('PASS phase4 standalone port parity: '+waterCases+
 ' water scans, '+siteCases+' site searches, '+pierCases+
 ' shore/pier placements, '+cancelCases+' cancellations (11 seeds, 2 scales)');
