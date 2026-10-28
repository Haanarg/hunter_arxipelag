import {generateTerrainFoundation,createWorldRandom} from '../src/world-generation-core.mjs';
import {planCompound} from '../src/compound-planning.mjs';
import {chooseCompoundLayout} from '../src/compound-runtime-layouts.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
import {createCanonicalWater} from '../src/canonical-water.mjs';

// Server-generated foundation, not an API accepting client geometry and not a
// complete mission world. No Worker request/room starts it automatically yet.
export function createCoopTerrain(settings){
  const terrain=generateTerrainFoundation(settings),random=createWorldRandom(terrain.randomState),
    layout=chooseCompoundLayout('base',random),basePlan=planCompound(layout,terrain.baseCandidate,{random,rawHeightAt:()=>terrain.baseCandidate.h}),
    foundation={...terrain,version:2,basePlan},world=createStaticWorldAdapter({
    format:2,generatorVersion:foundation.generatorVersion,seed:foundation.seed,mapScale:foundation.mapScale,
    islands:foundation.islands,levels:[basePlan.level],walls:[],trees:[],stairs:[],piers:[],buildings:[],bunker:null,terminalRamps:[]
  }),water=createCanonicalWater(world.heightAt);
  return Object.freeze({kind:'terrain-foundation',complete:false,playable:false,world,water,
    snapshot:()=>structuredClone(foundation)});
}
