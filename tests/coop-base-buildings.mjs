import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createCoopTerrain} from '../server/coop-terrain.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
const require=createRequire(import.meta.url);let cases=0;const variants=new Set();
for(const [seed,mapScale] of [[0,1],[1,1],[3,1],[4,1],[67,2]]){
 const server=createCoopTerrain({seed,mapScale}),snapshot=server.snapshot(),expected=server.world.snapshot(),g=await require('./harness.cjs')();
 variants.add(snapshot.basePlan.layoutId);g.context.startOptions={seed,scale:mapScale};
 g.run("applyGameStartOptions(startOptions);globalThis.baseSteps=buildSteps();let r;do{r=baseSteps.next();if(r.done)throw Error('Missing initial compounds');}while(r.value?.stage!=='Base i quarter general');");
 const actual=JSON.parse(g.run(`JSON.stringify((()=>{const base=world.userData.compounds[0];return window.HUNTER_WORLD_ADAPTER.normalizeWorldGeometry({format:2,generatorVersion:OPERATION_GENERATOR_VERSION,seed,mapScale:MAP_SCALE,islands,levels:[terrainLevels[0]],walls:Wl.filter(w=>base.buildings.includes(w.owner)),stairs:base.buildings.flatMap(b=>[b.stair,b.interiorStair]).filter(Boolean),buildings:base.buildings,trees:[],piers:[],terminalRamps:[],bunker:null});})())`));
 for(const k of ['walls','stairs','buildings'])assert.deepEqual(expected[k],actual[k],'real base '+snapshot.basePlan.layoutId+' '+k);
 const ids=[...snapshot.baseStructures.buildings,...snapshot.baseStructures.walls,...snapshot.baseStructures.stairs].map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);assert.ok(ids.every(id=>typeof id==='string'));
 const door=snapshot.baseStructures.walls.find(w=>w.door),p={x:door.cx,z:door.cz,y:door.y0+1,hd:0},closed=server.world.resolveBody(p,p);
 assert.ok(closed.x!==p.x||closed.z!==p.z,'closed door blocks actor');
 const geometry=server.world.snapshot(),index=snapshot.baseStructures.walls.indexOf(door);geometry.walls[index].open=true;
 const opened=createStaticWorldAdapter(geometry).resolveBody(p,p);assert.equal(opened.x,p.x);assert.equal(opened.z,p.z,'open door permits passage in rebuilt static adapter');
 snapshot.baseStructures.walls[0].open=true;assert.equal(server.snapshot().baseStructures.walls[0].open,false,'structure snapshot is detached');
 assert.equal(server.complete,false);assert.equal(server.playable,false);g.run('baseSteps.return();discardGeneratedWorld()');cases++;
}
assert.ok(variants.has('base')&&variants.has('base-v2')&&variants.has('base-v3')&&variants.has('base-v4'));
console.log(`base shells: ${cases} real generation checkpoints, all four base variants, walls/doors/lintels, exterior/interior stairs, upper floors, IDs, collision and copies passed`);
