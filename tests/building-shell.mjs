import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import * as shell from '../src/building-shell.mjs';
import {createWorldRandom} from '../src/world-generation-core.mjs';
const require=createRequire(import.meta.url),legacy=require('./fixtures/building-shell-v0616.cjs'),s=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8'),implementation=s.slice(s.indexOf('function mkB('),s.indexOf('\nfunction mkEnemyBunker('));
const project=walls=>Array.from(walls,w=>Object.fromEntries([
 ...['x0','x1','z0','z1','y0','y1','hp'].map(k=>[k,w[k]]),...['door','open','rammable'].map(k=>[k,!!w[k]]),
 ['playerBlock',w.playerBlock!==false],...['nx','nz','doorWidth','doorHeight','supportSide','supportWeight'].map(k=>[k,w[k]??null])
]));
let cases=0;
for(const [w,d,h] of [[8,10,5],[24,26,7],[30,20,12]])for(const mode of [false,true])for(const seed of [1,67])for(const opt of [{},{doorSide:0},{doorSide:1},{doorSide:2},{doorSide:3},{floors:2},{noPartitions:true},{solidWalls:true},{workshop:true},{hangar:true,doorWidth:20},{civilianHut:true},{wood:true},{bunker:true,lockedDoor:true},{openDoor:true},{doorHeight:12}]){
 const a=createWorldRandom(seed),b=createWorldRandom(seed),args={w,d,h,opt,seedSearchMode:mode},expected=legacy({...args,random:a}),actual=legacy({...args,random:b,shell,implementation});
 assert.deepEqual(project(actual),project(expected),'actual constructor shell parity');assert.equal(a.getState(),b.getState(),'random stream preserved');
 assert.deepEqual(Array.from(actual,w=>w.doorAssembly?.length??0),Array.from(expected,w=>w.doorAssembly?.length??0),'door/flank/lintel destruction assemblies');
 if(!mode){const random=createWorldRandom(seed),physical=shell.shellColliders(10,-20,3,w,d,h,opt,random);assert.deepEqual(project(physical.walls),project(expected),'renderer-free shell matches normal gameplay');assert.equal(random.getState(),a.getState());}
 cases++;
}
assert.throws(()=>shell.planBuildingShell(0,10,6,{},()=>0));assert.throws(()=>shell.planBuildingShell(10,10,6,{doorSide:7},()=>0));
const b={x:0,z:0,w:24,d:26,fy:3,storey:6};assert.equal(shell.exteriorStair(b,0,()=>3.3),null);
const stair=shell.exteriorStair(b,0,()=>3);assert.equal(stair.steps,1);assert.equal(stair.top,3.3);assert.equal(stair.top-stair.rise*stair.steps,3);
console.log(`building shell: ${cases} normal/search constructors against frozen main, pure colliders, random sequence and destruction assemblies passed`);
