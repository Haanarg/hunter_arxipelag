import {generateTerrainFoundation,createWorldRandom} from '../src/world-generation-core.mjs';
import {planCompound} from '../src/compound-planning.mjs';
import {chooseCompoundLayout} from '../src/compound-runtime-layouts.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
import {createCanonicalWater} from '../src/canonical-water.mjs';
import {buildBaseShells} from './coop-base-buildings.mjs';

// Server-generated foundation, not an API accepting client geometry and not a
// complete mission world. No Worker request/room starts it automatically yet.
export function createCoopTerrain(settings){
  const terrain=generateTerrainFoundation(settings),random=createWorldRandom(terrain.randomState),
    layout=chooseCompoundLayout('base',random),basePlan=planCompound(layout,terrain.baseCandidate,{random,rawHeightAt:()=>terrain.baseCandidate.h}),
    foundation={...terrain,version:3,basePlan},geometry={
    format:2,generatorVersion:foundation.generatorVersion,seed:foundation.seed,mapScale:foundation.mapScale,
    islands:foundation.islands,levels:[basePlan.level],walls:[],trees:[],stairs:[],piers:[],buildings:[],bunker:null,terminalRamps:[]
  },padded=createStaticWorldAdapter(geometry),shells=buildBaseShells(basePlan,padded,random),
    world=createStaticWorldAdapter({...geometry,...shells}),water=createCanonicalWater(world.heightAt);
  foundation.baseStructures=shells;
  return Object.freeze({kind:'terrain-foundation',complete:false,playable:false,world,water,
    snapshot:()=>structuredClone(foundation)});
}
