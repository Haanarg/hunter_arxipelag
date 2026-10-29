import {hashAt,rawTerrainAt} from './world-physics.mjs';
function settings(seed,mapScale){if(!Number.isInteger(seed)||seed<0||seed>4294967295||![1,2].includes(mapScale))throw new RangeError('Invalid terrain settings');}
export function createWorldRandom(seed){
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new RangeError('Invalid random seed');
  let a=seed;
  const next=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  next.getState=()=>a>>>0;
  next.setState=value=>{if(!Number.isInteger(value)||value<0||value>4294967295)throw new RangeError('Invalid random state');a=value|0;};
  return next;
}
export function createIslandLayout(seed,mapScale){
  settings(seed,mapScale);
  const random=createWorldRandom(seed),rr=(a,b)=>a+random()*(b-a),q=random()<.5?-1:1,q2=random()<.5?-1:1,
    extent=mapScale===1?1000:2200,baseMin=mapScale===1?500:1200,baseMax=mapScale===1?800:1800,
    base={x:-q*rr(baseMin,baseMax)*2,z:-q2*rr(baseMin,baseMax)*2,r:rr(520,680)},
    hqSectorChoice=mapScale===2?Math.floor(random()*3):2,
    headquarters={x:(hqSectorChoice===0?-q:q)*rr(baseMin,baseMax)*2,z:(hqSectorChoice===1?-q2:q2)*rr(baseMin,baseMax)*2,r:rr(520,680)},
    islands=[base,headquarters];
  for(let i=0;i<22*mapScale*mapScale;i++)islands.push({x:rr(-extent,extent)*2,z:rr(-extent,extent)*2,r:rr(180,520)});
  for(let i=0;i<2*mapScale*mapScale;i++)islands.push({x:rr(-extent*.55,extent*.55)*2,z:rr(-extent*.55,extent*.55)*2,r:rr(800,1040)});
  for(let n=0;n<islands.length;n++){
    const i=islands[n],ox=(hashAt(i.x*.013+n*1.37,i.z*.011-7.1,seed)-.5)*.42*i.r,
      oz=(hashAt(i.z*.017-n*.91,i.x*.009+11.3,seed)-.5)*.42*i.r;
    i.peakX=i.x+ox;i.peakZ=i.z+oz;
  }
  return {islands,base,headquarters,random};
}
// Only the initial, empty-world search. Later placement has occupancy rules
// (buildings/trees/etc.) which this foundation intentionally does not invent.
function initialLand(island,random,heightAt,halfSize){
  for(let k=0;k<2000;k++){
    const a=random()*6.283,d=random()*island.r*.75,x=island.x+Math.cos(a)*d,z=island.z+Math.sin(a)*d,h=heightAt(x,z);
    if(h>3&&h<14&&Math.abs(heightAt(x+5,z)-h)+Math.abs(heightAt(x,z+5)-h)<2.5&&Math.abs(x)<halfSize-150&&Math.abs(z)<halfSize-150)return {x,z,h};
  }
  return null;
}
export function generateTerrainFoundation({seed:requestedSeed,mapScale}){
  settings(requestedSeed,mapScale);
  for(let attempt=0;attempt<8;attempt++){
    const seed=(requestedSeed+Math.imul(attempt,0x9e3779b1))>>>0,layout=createIslandLayout(seed,mapScale),
      heightAt=(x,z)=>rawTerrainAt(x,z,layout.islands,seed,2400*mapScale),
      baseCandidate=initialLand(layout.base,layout.random,heightAt,2400*mapScale),
      headquartersCandidate=initialLand(layout.headquarters,layout.random,heightAt,2400*mapScale);
    if(baseCandidate&&headquartersCandidate)return {kind:'terrain-foundation',version:1,complete:false,playable:false,
      requestedSeed,seed,mapScale,attempts:attempt+1,generatorVersion:'world:0.6.2',islands:layout.islands,
      baseCandidate,headquartersCandidate,randomState:layout.random.getState()};
  }
  throw new Error('No valid initial terrain for this seed');
}

// Original seed-local bunker layout; independent of the global generation RNG.
export function bunkerBasementPlan(seed,b){
 const random=createWorldRandom((seed^Math.imul(Math.round(b.x),73856093)^Math.imul(Math.round(b.z),19349663)^0x6e7b32e1)>>>0),variant=Math.floor(random()*4),stairSide=(variant&1)?-1:1;
 return {variant,floorY:b.fy-9.15,halfX:27,halfZ:23,stairSide,
 divisions:[-7+(variant%2)*1.3,6.4+Math.floor(variant/2)*1.3],westDoors:[-15+(variant%2)*.7,Math.floor(variant/2)*.7,15-(variant%2)],eastDivider:-stairSide*7,
 stairX:(variant&2)?14.6:10.8,stairTop:stairSide*13.6,stairBottom:stairSide*1.3};
}
