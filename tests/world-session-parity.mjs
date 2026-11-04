#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanupGeneratedWorld} from '../src/start-lifecycle-core.mjs';
import {createWorldEntityCollections} from '../src/game-state-core.mjs';

// Independent v0.6.133 oracle, including assignment order and errors.
const oldSource="function discardGeneratedWorld(){\n  operationRegistry=null;activeOperation=null;operationRun=null;\n  resetOptionalSystems();\n  if(terrainStream)terrainStream.dispose();terrainStream=null;\n  if(world){scene.remove(world);window.HUNTER_RESOURCES.dispose(world)}world=null;\n  B=[];Wl=[];Dr=[];stairs=[];piers=[];items=[];V=[];E=[];fa=[];PL.length=FA.length=0;\n  TG.clear();terrainLevels=[];terrainLevelGrid.clear();PM={};cv=null;ib=null;activeBunker=null;\n  waterUpgradePending=false;seedCompounds=[];elapsed=0;clearKeys();resetSimulationClock();\n}";
const runOld=new Function('state','with(state){ ('+oldSource+')(); }');
const runNew=new Function('state','with(state){ ('+
 "function discardGeneratedWorld(){\n  // Conservam els bindings clàssics que comparteixen generació, HUD i desaments.\n  window.HUNTER_START_LIFECYCLE.cleanupGeneratedWorld({\n    clearOperations:()=>{operationRegistry=null;activeOperation=null;operationRun=null;},\n    resetOptionalSystems,\n    terrainStream,forgetTerrainStream:()=>{terrainStream=null;},\n    world,scene,resources:window.HUNTER_RESOURCES,forgetWorld:()=>{world=null;},\n    resetEntities:()=>{\n      ({B,Wl,Dr,stairs,piers,items,V,E,fa}=\n        window.HUNTER_GAME_STATE.createWorldEntityCollections(Array));\n    },\n    PL,FA,TG,resetTerrainLevels:()=>{terrainLevels=[];},terrainLevelGrid,\n    resetTransients:()=>{\n      PM={};cv=null;ib=null;activeBunker=null;\n      waterUpgradePending=false;seedCompounds=[];elapsed=0;\n    },\n    clearKeys,resetSimulationClock\n  });\n}"+
 ')(); }');

function makeState({terrain=true,sceneWorld=true,throwAt=null}={}){
 const events=[];
 const state={
  operationRegistry:{saved:1},activeOperation:{a:1},operationRun:{r:1},
  terrainStream:terrain?{dispose(){events.push('terrain.dispose');if(throwAt==='terrain')throw Error('terrain');}}:null,
  world:sceneWorld?{id:'world'}:null,
  scene:{remove(world){events.push('scene.remove:'+world.id);
    if(throwAt==='scene')throw Error('scene');}},
  B:[1],Wl:[2],Dr:[3],stairs:[4],piers:[5],items:[6],V:[7],E:[8],fa:[9],
  PL:[1,2,3],FA:[3,4],TG:new Set([10]),terrainLevels:[12],
  terrainLevelGrid:{clears:0,clear(){events.push('terrainGrid.clear');this.clears++;
    if(throwAt==='grid')throw Error('grid');}},
  PM:{old:true},cv:{id:1},ib:{id:2},activeBunker:{id:3},waterUpgradePending:true,
  seedCompounds:[1],elapsed:87,
  resetOptionalSystems(){events.push('optional');
    assert.equal(state.operationRegistry,null);
    if(throwAt==='optionals')throw Error('optionals');},
  clearKeys(){events.push('keys');if(throwAt==='keys')throw Error('keys');},
  resetSimulationClock(){events.push('clock');if(throwAt==='clock')throw Error('clock');},
 };
 state.window={HUNTER_RESOURCES:{dispose(world){events.push('resources.dispose:'+world.id);
   if(throwAt==='resources')throw Error('resources');}},
  HUNTER_START_LIFECYCLE:{cleanupGeneratedWorld},
  HUNTER_GAME_STATE:{createWorldEntityCollections}};
 return {state,events,refs:{PL:state.PL,FA:state.FA,TG:state.TG,grid:state.terrainLevelGrid}};
}
function view({state,events,refs}){
 return {
  events:[...events],regs:[state.operationRegistry,state.activeOperation,state.operationRun],
  terrain:state.terrainStream?.dispose?'present':state.terrainStream,
  world:state.world?.id??null,
  arrays:Object.fromEntries(['B','Wl','Dr','stairs','piers','items','V','E','fa',
    'PL','FA','terrainLevels','seedCompounds'].map(k=>[k,[...state[k]]])),
  cleared:Object.fromEntries(['B','Wl','Dr','stairs','piers','items','V','E','fa']
    .map(k=>[k,state[k]!==undefined && state[k].length===0])),
  refs:{PL:state.PL===refs.PL,FA:state.FA===refs.FA,TG:state.TG===refs.TG,
    grid:state.terrainLevelGrid===refs.grid},
  tree:[...state.TG],grid:state.terrainLevelGrid.clears,
  PM:state.PM,cv:state.cv,ib:state.ib,activeBunker:state.activeBunker,
  waterUpgradePending:state.waterUpgradePending,elapsed:state.elapsed
 };
}
let checked=0;
for(const terrain of [false,true])for(const sceneWorld of [false,true])
 for(const throwAt of [null,'optionals','terrain','scene','resources','grid','keys','clock']){
 const original=makeState({terrain,sceneWorld,throwAt}),newer=makeState({terrain,sceneWorld,throwAt});
 let oldError=null,newError=null;
 try{runOld(original.state)}catch(e){oldError=e.message}
 try{runNew(newer.state)}catch(e){newError=e.message}
 assert.equal(newError,oldError,'same error for '+[terrain,sceneWorld,throwAt]);
 assert.deepEqual(view(newer),view(original),'exact teardown state/order '+[terrain,sceneWorld,throwAt]);
 if(newError===null){
  for(const key of ['B','Wl','Dr','stairs','piers','items','V','E','fa']){
   assert.equal(newer.state[key].length,0,key+' empty');
   assert.notStrictEqual(newer.state[key],original.state[key]);
  }
  assert.strictEqual(newer.state.PL,newer.refs.PL,'pool identity retained');
  assert.strictEqual(newer.state.FA,newer.refs.FA,'effects identity retained');
  assert.strictEqual(newer.state.TG,newer.refs.TG,'palm map identity retained');
 }
 checked++;
}
// The arrays must belong to the owning runtime (VM realm, not ESM realm).
class GameArray extends Array{}
const first=createWorldEntityCollections(GameArray);
const second=createWorldEntityCollections(GameArray);
assert.deepEqual(Object.keys(first),['B','Wl','Dr','stairs','piers','items','V','E','fa']);
for(const key of Object.keys(first)){
 assert(first[key] instanceof GameArray,key+' in game realm');
 assert.notStrictEqual(first[key],second[key],key+' distinct between missions');
 first[key].push(42);
 assert.equal(second[key].length,0,key+' no stale entities leak');
}
const core=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
const bootstrap=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8');
const harness=readFileSync(new URL('./harness.cjs',import.meta.url),'utf8');
assert(core.includes('HUNTER_START_LIFECYCLE.cleanupGeneratedWorld({'));
assert(core.includes('HUNTER_GAME_STATE.createWorldEntityCollections(Array)'));
assert(!core.includes('if(terrainStream)terrainStream.dispose();terrainStream=null;'));
assert(bootstrap.includes('window.HUNTER_GAME_STATE=gameState'));
assert(bootstrap.includes('window.HUNTER_START_LIFECYCLE=startLifecycle'));
assert(harness.includes('c.HUNTER_START_LIFECYCLE=await import('));
console.log('PASS phase 3 teardown parity: '+checked+
 ' lifecycle scenarios (partial/cancelled/errors) and 9 fresh realm-local collections');
