#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCoastRoadSolver} from '../src/compound-planning.mjs';

// Oracle independent: literal A* implementation from v0.6.141.
const oldSource="function* solveCoastRoadSteps(start,goal){\n const step=12,nodes=new Map(),open=[],cache=new Map(),key=(x,z)=>x+','+z;\n const sample=(x,z)=>{const k=key(x,z);if(cache.has(k))return cache.get(k);let y=hAt(x,z),ok=y>.15&&Math.abs(x)<H-20&&Math.abs(z)<H-20;\n  for(const b of B)if(Math.abs(x-b.x)<b.w/2+7&&Math.abs(z-b.z)<b.d/2+7)ok=false;\n  for(const [dx,dz]of[[-5,0],[5,0],[0,-5],[0,5]])if(hAt(x+dx,z+dz)<.1)ok=false;\n  const value={y,ok};cache.set(k,value);return value;\n };\n const first={x:start.x,z:start.z,ix:0,iz:0,g:0,h:Math.hypot(goal.x-start.x,goal.z-start.z)};first.f=first.h;open.push(first);nodes.set('0,0',first);let found=null,count=0;\n while(open.length&&count++<14000){if(count%8===0)yield {stage:'Camí de la base a la costa',completed:count,total:null,unit:'nodes'};open.sort((a,b)=>b.f-a.f);const n=open.pop();if(n.closed)continue;n.closed=true;\n  if(Math.hypot(n.x-goal.x,n.z-goal.z)<step*1.3){found=n;break}\n  for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){\n   const ix=n.ix+dx,iz=n.iz+dz,x=start.x+ix*step,z=start.z+iz*step,k=key(ix,iz),old=nodes.get(k);if(old?.closed||Math.hypot(x-start.x,z-start.z)>1600)continue;\n   const a=sample(n.x,n.z),b=sample(x,z),mid=sample((x+n.x)/2,(z+n.z)/2),dist=step*Math.hypot(dx,dz);if(!b.ok||!mid.ok||Math.abs(b.y-a.y)>dist*.38)continue;\n   const g=n.g+dist+Math.abs(b.y-a.y)*8;if(old&&g>=old.g)continue;\n   const next={ix,iz,x,z,g,f:g+Math.hypot(x-goal.x,z-goal.z),parent:n};nodes.set(k,next);open.push(next);\n  }\n }\n if(!found)return null;\n const points=[{...goal,y:.86}];for(let n=found;n;n=n.parent)points.push({x:n.x,z:n.z,y:hAt(n.x,n.z)});points.reverse();\n // Forward/backward slope projection fixes both endpoints and limits the road to 12%.\n for(let pass=0;pass<6;pass++){\n  points[0].y=hAt(start.x,start.z);for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],rise=Math.hypot(a.x-b.x,a.z-b.z)*.12;b.y=Math.max(a.y-rise,Math.min(a.y+rise,b.y))}\n  points.at(-1).y=.86;for(let i=points.length-2;i>=0;i--){const a=points[i+1],b=points[i],rise=Math.hypot(a.x-b.x,a.z-b.z)*.12;b.y=Math.max(a.y-rise,Math.min(a.y+rise,b.y))}\n }\n if(Math.abs(points[0].y-hAt(start.x,start.z))>.2||points.some(p=>Math.abs(p.y-hAt(p.x,p.z))>7))return null;\n return points;\n}";
const original=new Function('hAt','getHalfSize','getBuildings','MapConstructor',
 'const H=getHalfSize(),B=getBuildings(),Map=MapConstructor;\n'+oldSource+'\nreturn solveCoastRoadSteps;');
const seeds=[0,67,148,2407759483,4294967295];
const allStartGoals=[
 [{x:0,z:0},{x:48,z:0}],
 [{x:0,z:0},{x:54,z:42}],
 [{x:90,z:-60},{x:150,z:-12}],
 [{x:0,z:0},{x:-120,z:60}],
 [{x:170,z:0},{x:70,z:50}]
];
function makeWorld(seed,scale,kind,obstacle){
 const trace=[];
 const drift=(seed%23-11)*.031;
 const hAt=(x,z)=>{
  trace.push([x,z]);
  if(kind===0)return 5;
  if(kind===1)return 5+.04*x+.018*z;
  if(kind===2)return Math.abs(x-24)<10&&z>-35&&z<35?-3:6;
  if(kind===3)return (Math.abs(x)<18&&z>-45&&z<50)?-2:5;
  if(kind===4)return 6+Math.sin(x*.021+drift)*2+Math.cos(z*.017)*2;
  if(kind===5)return -5; // no reachable dry road
  return 5+Math.max(-4,Math.min(4,drift*x*.03));
 };
 const halfSize=2400*scale;
 const buildings=obstacle?[{x:24,z:0,w:28,d:32},{x:90,z:30,w:20,d:20}]:[];
 const startGoal=allStartGoals[(seed%5+kind)%allStartGoals.length];
 return {hAt,halfSize,buildings,trace,startGoal};
}
function drain(iterator,limit=18000){
 const yields=[];let result;
 for(let count=0;count<limit;count++){
  result=iterator.next();if(result.done)break;
  yields.push(result.value);
 }
 assert(result?.done,'road search finite and under 14,000 nodes');
 return {yields,result:result.value};
}
let samples=0,cancels=0;
for(const seed of seeds)for(const scale of [1,2])
 for(let kind=0;kind<=6;kind++)for(const obstacle of [false,true]){
  const a=makeWorld(seed,scale,kind,obstacle),b=makeWorld(seed,scale,kind,obstacle);
  const before=original(a.hAt,()=>a.halfSize,()=>a.buildings,Map);
  const after=createCoastRoadSolver({heightAt:b.hAt,getHalfSize:()=>b.halfSize,
    getBuildings:()=>b.buildings,MapConstructor:Map});
  const {startGoal:[start,goal]}=a;
  const old=drain(before(start,goal)),next=drain(after(start,goal));
  assert.deepEqual(next,old,'exact A* result + progress checkpoints '+[seed,scale,kind,obstacle]);
  assert.deepEqual(b.trace,a.trace,'exact height-query sequence');
  samples++;
 }
for(const seed of [67,148])for(const scale of [1,2])for(const kind of [0,2,4,5]){
 const r=makeWorld(seed,scale,kind,false),solver=createCoastRoadSolver({
  heightAt:r.hAt,getHalfSize:()=>r.halfSize,
  getBuildings:()=>r.buildings,MapConstructor:Map});
 const a=solver({x:0,z:0},{x:2400,z:2400}),b=solver({x:0,z:0},{x:48,z:48});
 const first=a.next(),n=r.trace.length;
 a.return('cancelled');assert(a.next().done);
 assert.equal(r.trace.length,n,'no terrain samples after cancellation');
 assert(first.done||first.value?.stage==='Camí de la base a la costa');
 const second=drain(b);
 assert(second.result===null||Array.isArray(second.result),'second search remains independent');
 cancels++;
}
// The dynamic world getter must not freeze a previous mission's buildings/map size.
for(const scale of [1,2]){
 let half=2400,buildings=[{x:24,z:0,w:20,d:30}];
 const terrain=(x,z)=>5;
 const solver=createCoastRoadSolver({heightAt:terrain,getHalfSize:()=>half,
   getBuildings:()=>buildings,MapConstructor:Map});
 for(const state of [0,1,2,3]){
  if(state===1)buildings=[];
  if(state===2)half=4800;
  if(state===3)buildings=[{x:18,z:20,w:25,d:10}];
  const actual=drain(solver({x:0,z:0},{x:84,z:42}));
  const expected=drain(original(terrain,()=>half,()=>buildings,Map)({x:0,z:0},{x:84,z:42}));
  assert.deepEqual(actual,expected,'live world data '+scale+'/'+state);
 }
}
const runtime=readFileSync(new URL('../src/compound-coast-runtime.js',import.meta.url),'utf8');
const planner=readFileSync(new URL('../src/compound-planning.mjs',import.meta.url),'utf8');
const bootstrap=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8');
assert(runtime.includes('HUNTER_COMPOUND_PLANNING.createCoastRoadSolver('));
assert(runtime.includes('getBuildings:()=>B'));
assert(!runtime.includes('const step=12,nodes=new Map()'));
assert(planner.includes('export function createCoastRoadSolver('));
assert(bootstrap.includes('window.HUNTER_COMPOUND_PLANNING=compoundPlanning;'));
console.log('PASS phase4 coast road planning parity: '+samples+
 ' A*/slope/query profiles, '+cancels+' cancelled searches, dynamic world bindings');
