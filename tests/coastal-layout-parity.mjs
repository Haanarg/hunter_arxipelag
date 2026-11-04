#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCoastalLayoutPlanner,compoundPoint} from '../src/compound-planning.mjs';
// Independent v0.6.140 oracle, before module extraction.
const legacyFits="function coastalLayoutFits(l,q){\n const tr=compoundTransform(q,q.angle),shore=l.waterfront?.shore??8;\n for(const x of[-l.size[0]/2,0,l.size[0]/2])for(const z of[-l.size[1]/2,-l.size[1]/4,shore-8]){const p=tr(x,z);if(Math.abs(p[0])>H-15||Math.abs(p[1])>H-15||rawHAt(...p)<(z===shore-8?-2:.12))return false}\n for(const b of l.buildings)for(const dx of[-b.w/2,0,b.w/2])for(const dz of[-b.d/2,0,b.d/2])if(rawHAt(...tr(b.x+dx,b.z+dz))<.2)return false;\n for(const v of l.vehicles.filter(v=>['w','wl'].includes(VT[v.t]?.m))){\n  const hb=window.HUNTER_VEHICLES.hitboxes[v.t],sc=VS[v.t]||1,hw=hb[0]*sc/2+1,hd=hb[1]*sc/2+1;\n  for(const dx of[-hw,0,hw])for(let dz=-hd;dz<=hd+(v.t==='ferry'?45:16);dz+=5)if(rawHAt(...tr(v.x+dx,v.z+dz))>-2)return false;\n }\n return true;\n}";
const legacySearch="function* findCoastalLayoutSteps(l,anchor,accept=()=>true){\n const shore=l.waterfront?.shore??8;\n for(const offset of[0,60,-60,120,-120,180,-180,240,-240,300,-300,360,-360])for(let turn=0;turn<4;turn++){\n  yield {stage:'Emplaçaments de costa',completed:null,total:null};\n  const angle=turn*Math.PI/2,tr=compoundTransform(anchor,angle);\n  let landSeen=false;\n  for(let d=0;d<Math.min(900,(anchor.r||400)*1.6);d+=12){\n   const p=tr(offset,d),h=rawHAt(...p);if(h>.2){landSeen=true;continue}if(!landSeen)continue;\n   for(const shift of[-18,-12,-6,0,6,12,18,24]){\n    const center=tr(offset,d-shore+shift),q={x:center[0],z:center[1],angle,h:.86,r:anchor.r};\n    if(coastalLayoutFits(l,q)){\n      const accepted=accept(q);\n      if(accepted&&typeof accepted.next==='function'){if(yield* accepted)return q}\n      else if(accepted)return q;\n    }\n   }\n   break;\n  }\n }\n return null;\n}";
const oldFactory=new Function('compoundTransform','rawHAt','getHalfSize',
 'getVehicleTypes','getVehicleScales','getVehicleHitboxes',
 'const H=getHalfSize(),VT=getVehicleTypes(),VS=getVehicleScales();'+
 'const window={HUNTER_VEHICLES:{hitboxes:getVehicleHitboxes()}};\n'+
 legacyFits+'\n'+legacySearch+'\nreturn {coastalLayoutFits,findCoastalLayoutSteps};');
const vehicleTypes={ferry:{m:'wl'},llanxa:{m:'w'},barca_rems:{m:'w'},jeep:{m:'land'}},
 vehicleScales={ferry:1.1,llanxa:1.2,barca_rems:1,jeep:1},
 hitboxes={ferry:[18,42],llanxa:[10,23],barca_rems:[5,11]};
const layoutSet=[
 {id:'civil-dock',size:[66,48],waterfront:{shore:8},
  buildings:[{x:5,z:-10,w:12,d:9}],
  vehicles:[{t:'barca_rems',x:0,z:42}]},
 {id:'ferry-terminal',size:[125,94],waterfront:{shore:12},
  buildings:[{x:-12,z:-24,w:24,d:30},{x:25,z:-14,w:10,d:17}],
  vehicles:[{t:'ferry',x:0,z:42},{t:'llanxa',x:23,z:43}]},
 {id:'civil-shore',size:[90,78],buildings:[],
  vehicles:[{t:'jeep',x:0,z:10}]},
 {id:'piers',size:[80,68],waterfront:{shore:8},
  buildings:[],vehicles:[{t:'llanxa',x:4,z:30}]}
];
function height(kind,seed,x,z){
 const bias=(seed%17-8)*.75;
 switch(kind){
  case 0:return 6;
  case 1:return -5;
  case 2:return z>24+bias?-5:7;
  case 3:return x>40+bias?-5:7;
  case 4:return z< -35+bias?-5:7;
  case 5:return x< -45+bias?-5:7;
  case 6:return Math.hypot(x-90,z+75)<180?7:-6;
  case 7:return 6*(Math.sin(x*.013)+Math.cos(z*.011))-.4;
  case 8:return z>24+bias?-1:6;
  default:return (x*x+z*z)>12000?-4.5:6;
 }
}
function createScenario(seed,scale,kind,mode){
 const trace={heights:[],transforms:[],accepts:[],events:[]},
   rawHAt=(x,z)=>{trace.heights.push([x,z]);return height(kind,seed,x,z)},
   compoundTransform=(q,angle)=>{trace.transforms.push([q.x,q.z,angle]);return compoundPoint(q,angle)};
 const settings={compoundTransform,rawHAt,getHalfSize:()=>2400*scale,
   getVehicleTypes:()=>vehicleTypes,getVehicleScales:()=>vehicleScales,
   getVehicleHitboxes:()=>hitboxes};
 const api=mode==='old'?oldFactory(...Object.values(settings)):createCoastalLayoutPlanner(settings);
 return {api,trace};
}
function serialize(value){return value===undefined?'undefined':value===null?'null':value;}
function drain(gen,limit=7000){
 const events=[];let latest;
 for(let i=0;i<limit;i++){
  latest=gen.next();
  if(latest.done)break;
  events.push(latest.value);
 }
 assert(latest?.done,'coastal search finishes within checkpoint limit');
 return {events,result:serialize(latest.value)};
}
function acceptedFor(mode,trace){
 let count=0;
 return q=>{
  trace.accepts.push({x:q.x,z:q.z,angle:q.angle});
  if(mode===0)return false;
  if(mode===1)return true;
  if(mode===2)return ++count>=2;
  if(mode===3)return (function*(){
    yield {stage:'camí',completed:count++,total:2};
    return count>=2;
  })();
  if(mode===4)return (function*(){
    yield {stage:'camí',completed:0,total:2};
    yield {stage:'camí',completed:1,total:2};
    return true;
  })();
 };
}
let fitCases=0,searchCases=0,cancelCases=0;
for(const seed of [0,67,148,4294967295])
 for(const scale of [1,2])
 for(const kind of [0,1,2,3,4,5,6,7,8,9])
 for(const layout of layoutSet)
 for(const q of [{x:0,z:0,angle:0},{x:135,z:-75,angle:Math.PI/2},
  {x:2390*scale,z:0,angle:0}]){
  const a=createScenario(seed,scale,kind,'old'),b=createScenario(seed,scale,kind,'new');
  const prev=a.api.coastalLayoutFits(layout,q);
  const next=b.api.coastalLayoutFits(layout,q);
  assert.equal(next,prev,'layout fit '+[seed,scale,kind,layout.id,q.x]);
  assert.deepEqual(b.trace,a.trace,'identical sample and transform order');
  fitCases++;
 }
for(const seed of [67,148,2407759483])for(const scale of [1,2])
 for(const kind of [0,2,3,6,7,8])
 for(const layout of layoutSet.slice(0,3))
 for(const acceptMode of [0,1,3,4]){
  const anchor={x:0,z:0,r:90+((seed%3)*30)};
  const a=createScenario(seed,scale,kind,'old'),b=createScenario(seed,scale,kind,'new');
  const old=drain(a.api.findCoastalLayoutSteps(layout,anchor,acceptedFor(acceptMode,a.trace)));
  const next=drain(b.api.findCoastalLayoutSteps(layout,anchor,acceptedFor(acceptMode,b.trace)));
  assert.deepEqual(next,old,'coastal yield/result '+[seed,scale,kind,layout.id,acceptMode]);
  assert.deepEqual(b.trace,a.trace,'coastal exact reads/transforms/accept calls');
  searchCases++;
 }
for(const kind of [0,2,3,6])for(const scale of [1,2]){
 const c=createScenario(67,scale,kind,'new');
 const one=c.api.findCoastalLayoutSteps(layoutSet[0],{x:0,z:0,r:150},()=>true),
   two=c.api.findCoastalLayoutSteps(layoutSet[0],{x:0,z:0,r:150},()=>true);
 assert.deepEqual(one.next(),two.next(),'same first cooperative checkpoint');
 const n=c.trace.heights.length;
 one.return('cancelled');
 assert.equal(one.next().done,true);
 assert.equal(c.trace.heights.length,n,'cancelled generator stops work');
 drain(two);
 cancelCases++;
}
// Mission-scale and fleet configuration must remain live after planner creation.
for(const kind of [0,2,3,8]){
 let half=2400,scale=1;
 const context={compoundTransform:compoundPoint,rawHAt:(x,z)=>height(kind,148,x,z),
  getHalfSize:()=>half,getVehicleTypes:()=>vehicleTypes,
  getVehicleScales:()=>({...vehicleScales,ferry:scale}),getVehicleHitboxes:()=>hitboxes};
 const newPlanner=createCoastalLayoutPlanner(context);
 const site={x:2390,z:0,angle:0};
 const before=newPlanner.coastalLayoutFits(layoutSet[1],site);
 half=4800;scale=1.5;
 const after=newPlanner.coastalLayoutFits(layoutSet[1],site);
 const referenceBefore=oldFactory(context.compoundTransform,context.rawHAt,
  ()=>2400,context.getVehicleTypes,()=>({...vehicleScales,ferry:1}),context.getVehicleHitboxes)
  .coastalLayoutFits(layoutSet[1],site);
 const referenceAfter=oldFactory(...Object.values(context)).coastalLayoutFits(layoutSet[1],site);
 assert.equal(before,referenceBefore,'small-map fit');
 assert.equal(after,referenceAfter,'large-map fit after changing state');
}
const runtime=readFileSync(new URL('../src/compound-coast-runtime.js',import.meta.url),'utf8');
const boot=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8');
assert(runtime.includes('HUNTER_COMPOUND_PLANNING.createCoastalLayoutPlanner'));
assert(runtime.includes('getHalfSize:()=>H'));
assert(runtime.includes('return yield* getCoastalLayoutPlanner().findCoastalLayoutSteps('));
assert(!runtime.includes('const shore=l.waterfront?.shore??8;'),'original coastal loops removed');
assert(boot.includes('window.HUNTER_COMPOUND_PLANNING=compoundPlanning'));
console.log('PASS phase4 coastal layout parity: '+fitCases+' fit profiles, '+
  searchCases+' search/yield paths, '+cancelCases+' cancellations, live mission size/vehicle scale');
