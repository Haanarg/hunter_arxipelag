import assert from 'node:assert/strict';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
import {traceArena} from '../server/coop-combat.mjs';
const geometry={format:2,generatorVersion:'world:0.6.2',seed:1,mapScale:1,islands:[],levels:[],walls:[],buildings:[],stairs:[],piers:[],terminalRamps:[],bunker:null,trees:[{x:0,z:0,r:.6,p:true,y:0,s:1,yaw:0},{x:10,z:0,r:2,rock:true,topY:1.5,bottomY:0}]};
const world=createStaticWorldAdapter(geometry);
assert.ok(world.vegetationAt(0,2,0)?.p);
assert.equal(world.vegetationAt(0,7,0),null);
assert.ok(world.vegetationAt(10,1,0)?.rock);
assert.equal(world.vegetationAt(10,2,0),null);
for(const x of [0,10]){
 const y=x===0?2:1,from={x:x-5,y,z:0},to={x:x+5,y,z:0};
 const trace=traceArena(from,to,geometry,world);
 assert.ok(trace.hit&&trace.fraction<.5);
 assert.equal(trace.wallIndex,null);
 assert.equal(traceArena({...from,y:8},{...to,y:8},geometry,world).hit,false);
}
assert.deepEqual(createStaticWorldAdapter(world.snapshot()).vegetationAt(0,2,0),world.vegetationAt(0,2,0));
console.log('coop vegetation cover: palms, rocks, height limits, swept shots and checkpoint passed');
