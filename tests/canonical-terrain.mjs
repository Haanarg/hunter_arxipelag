import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createIslandLayout,createWorldRandom,generateTerrainFoundation} from '../src/world-generation-core.mjs';
import {createCanonicalWater,waveModel} from '../src/canonical-water.mjs';
import {createCoopTerrain} from '../server/coop-terrain.mjs';
import {createPlayerSimulation} from '../src/player-simulation.mjs';
const require=createRequire(import.meta.url),reference=require('./fixtures/terrain-generation-v0614.cjs');
const seeds=[0,1,67,12345,2147483648,4294967295];let cases=0;
for(const mapScale of [1,2])for(const seed of seeds){
  const actual=createIslandLayout(seed,mapScale),old=reference(seed,mapScale,'layout');
  assert.deepEqual(actual.islands,old.islands);assert.equal(actual.base,actual.islands[0]);assert.equal(actual.headquarters,actual.islands[1]);
  assert.equal(actual.random.getState(),old.random.getState());
  for(let k=0;k<100;k++)assert.equal(actual.random(),old.random(),'later generation keeps its random stream');
  const foundation=generateTerrainFoundation({seed,mapScale}),expected=reference(seed,mapScale);
  for(const k of Object.keys(expected))assert.deepEqual(foundation[k],expected[k],'initial terrain '+k);
  assert.equal(foundation.complete,false);assert.equal(foundation.playable,false);cases++;
}
const random=createWorldRandom(67);random();const state=random.getState(),next=random();random.setState(state);assert.equal(random(),next);
for(const seed of [-1,4294967296,1.1,NaN])assert.throws(()=>createIslandLayout(seed,1));
assert.throws(()=>generateTerrainFoundation({seed:67,mapScale:3}));assert.throws(()=>random.setState(-1));

const context=vm.createContext({window:{}});vm.runInContext(readFileSync(new URL('./fixtures/waves-v0614.cjs',import.meta.url),'utf8'),context);
const oldWaves=context.window.HUNTER_WAVES;
assert.equal(waveModel.glsl,oldWaves.glsl,'shader expression unchanged');
for(const bed of [-100,-9,-1,0,3,50])for(const x of [-4800,-17.3,0,52.1,4800])for(const z of [-4200,0,39.4])for(const t of [0,1/30,10,3600]){
  assert.equal(waveModel.height(x,z,t,bed),oldWaves.height(x,z,t,bed));
  assert.equal(createCanonicalWater(()=>bed).surfaceAt(x,z,t),oldWaves.height(x,z,t,bed));
}
const shared=vm.createContext({window:{HUNTER_CANONICAL_WATER:{waveModel}}});vm.runInContext(readFileSync(new URL('../src/waves.js',import.meta.url),'utf8'),shared);
assert.equal(shared.window.HUNTER_WAVES,waveModel,'production runtime uses shared wave model');
const fallback=vm.createContext({window:{}});vm.runInContext(readFileSync(new URL('../src/waves.js',import.meta.url),'utf8'),fallback);
assert.equal(fallback.window.HUNTER_WAVES.glsl,waveModel.glsl,'standalone preview compatibility');
assert.equal(fallback.window.HUNTER_WAVES.height(23,-47,13,-8),waveModel.height(23,-47,13,-8));
assert.throws(()=>createCanonicalWater(()=>NaN).surfaceAt(0,0,0));assert.throws(()=>createCanonicalWater(()=>0).surfaceAt(0,0,-1));
assert.throws(()=>createCanonicalWater(()=>0).surfaceAt(Infinity,0,0));
const terrain=createCoopTerrain({seed:67,mapScale:1}),snapshot=terrain.snapshot();snapshot.islands[0].x=99999;
assert.notEqual(terrain.snapshot().islands[0].x,99999);assert.equal(terrain.complete,false);assert.equal(terrain.playable,false);
for(const [x,z] of [[0,0],[-2300,2300],[1200,-1200]])assert.equal(terrain.water.surfaceAt(x,z,2),waveModel.height(x,z,2,terrain.world.heightAt(x,z)));

const {build}=await import('esbuild'),{Miniflare}=await import('miniflare');
const compiled=await build({stdin:{contents:`import {createCoopTerrain} from './server/coop-terrain.mjs';
import {createPlayerSimulation} from './src/player-simulation.mjs';
export default {async fetch(request){const options=await request.json(),terrain=createCoopTerrain(options),snapshot=terrain.snapshot(),b=snapshot.baseCandidate;
const actors=[{id:'a',x:b.x,z:b.z,y:b.h+.06,hd:0,hp:20},{id:'b',x:b.x+2,z:b.z,y:terrain.world.heightAt(b.x+2,b.z)+.06,hd:0,hp:20}];
const sim=createPlayerSimulation({epoch:'canonical',actors,limit:terrain.world.limit,world:terrain.world,vertical:{surfaceAt:terrain.water.surfaceAt}});
for(let k=1;k<=60;k++){for(const p of actors)sim.accept(p.id,{protocol:1,epoch:'canonical',sequence:k,input:{forward:1,turn:0,strafe:0,run:false}});sim.step();}
return Response.json({snapshot,water:[0,1/30,10].map(t=>terrain.water.surfaceAt(b.x,b.z,t)),state:sim.snapshot()});}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser'});
const mf=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-08-06'});
try{
  for(const mapScale of [1,2]){
    const response=await mf.dispatchFetch('http://localhost/',{method:'POST',body:JSON.stringify({seed:67,mapScale})});assert.equal(response.status,200,await response.clone().text());
    const actual=await response.json(),expected=createCoopTerrain({seed:67,mapScale}),s=expected.snapshot();
    assert.equal(actual.snapshot.seed,s.seed);assert.equal(actual.snapshot.randomState,s.randomState);assert.equal(actual.snapshot.complete,false);assert.equal(actual.snapshot.islands.length,s.islands.length);
    assert.equal(actual.snapshot.version,2);assert.equal(actual.snapshot.basePlan.layoutId,s.basePlan.layoutId);
    for(const k of ['x','z','hw','hd','y','rot','c','s','blend'])assert.ok(Math.abs(actual.snapshot.basePlan.level[k]-s.basePlan.level[k])<1e-7,'native base pad '+k);
    let maxIslandDelta=0;
    for(let i=0;i<s.islands.length;i++)for(const k of ['x','z','r','peakX','peakZ'])maxIslandDelta=Math.max(maxIslandDelta,Math.abs(actual.snapshot.islands[i][k]-s.islands[i][k]));
    assert.ok(maxIslandDelta<1e-8,'native island max delta '+maxIslandDelta);
    console.log('native scale '+mapScale+' maximum island coordinate delta: '+maxIslandDelta+' m');
    for(const k of ['baseCandidate','headquartersCandidate'])for(const field of ['x','z','h'])assert.ok(Math.abs(actual.snapshot[k][field]-s[k][field])<1e-9,'native initial placement');
    for(let i=0;i<3;i++)assert.ok(Math.abs(actual.water[i]-expected.water.surfaceAt(s.baseCandidate.x,s.baseCandidate.z,[0,1/30,10][i]))<1e-9);
    const b=s.baseCandidate,actors=[{id:'a',x:b.x,z:b.z,y:b.h+.06,hd:0,hp:20},{id:'b',x:b.x+2,z:b.z,y:expected.world.heightAt(b.x+2,b.z)+.06,hd:0,hp:20}],
      sim=createPlayerSimulation({epoch:'canonical',actors,limit:expected.world.limit,world:expected.world,vertical:{surfaceAt:expected.water.surfaceAt}});
    for(let k=1;k<=60;k++){for(const p of actors)sim.accept(p.id,{protocol:1,epoch:'canonical',sequence:k,input:{forward:1,turn:0,strafe:0,run:false}});sim.step();}
    assert.equal(actual.state.tick,60);
    for(let i=0;i<2;i++){const p=actual.state.players[i],node=sim.snapshot().players[i];
      for(const k of ['x','z','y','hd','hp'])assert.ok(Math.abs(p[k]-node[k])<1e-7,'native canonical actor '+k);
      assert.equal(p.acknowledged,60);assert.equal(p.swimming,node.swimming);assert.equal(!!p.fall,!!node.fall);
      if(p.fall)for(const k of ['y','vy','vx','vz','t','leanF','leanS','startHeight'])assert.ok(Math.abs(p.fall[k]-node.fall[k])<1e-7);
    }
  }
}finally{await mf.dispose();}
console.log(`canonical terrain: ${cases} seed/scale cases, frozen island/placement/random reference, waves/shader, copies, validation and native server generation + two actors passed`);
