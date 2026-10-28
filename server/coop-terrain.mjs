import {generateTerrainFoundation} from '../src/world-generation-core.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
import {createCanonicalWater} from '../src/canonical-water.mjs';

// Server-generated foundation, not an API accepting client geometry and not a
// complete mission world. No Worker request/room starts it automatically yet.
export function createCoopTerrain(settings){
  const foundation=generateTerrainFoundation(settings),world=createStaticWorldAdapter({
    format:2,generatorVersion:foundation.generatorVersion,seed:foundation.seed,mapScale:foundation.mapScale,
    islands:foundation.islands,levels:[],walls:[],trees:[],stairs:[],piers:[],buildings:[],bunker:null,terminalRamps:[]
  }),water=createCanonicalWater(world.heightAt);
  return Object.freeze({kind:'terrain-foundation',complete:false,playable:false,world,water,
    snapshot:()=>structuredClone(foundation)});
}
