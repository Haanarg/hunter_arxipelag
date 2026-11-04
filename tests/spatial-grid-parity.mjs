import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialCellGrid} from '../src/spatial-grid-core.mjs';

// Independent oracle of the cell loops formerly embedded in game-core.
function legacy(size){
 const cells=new Map(),key=(cx,cz)=>cx+','+cz;
 return {
  clear(){cells.clear();},
  insert(e,x0,x1,z0,z1){
   for(let cx=Math.floor(x0/size);cx<=Math.floor(x1/size);cx++)
    for(let cz=Math.floor(z0/size);cz<=Math.floor(z1/size);cz++){
     const k=key(cx,cz),bucket=cells.get(k);
     if(bucket)bucket.push(e);else cells.set(k,[e]);
    }
  },
  at(x,z){return cells.get(key(Math.floor(x/size),Math.floor(z/size)));},
  query(x,z,r,stampKey,stamp){
   const result=[];
   for(let cx=Math.floor((x-r)/size);cx<=Math.floor((x+r)/size);cx++)
    for(let cz=Math.floor((z-r)/size);cz<=Math.floor((z+r)/size);cz++){
     const bucket=cells.get(key(cx,cz));if(!bucket)continue;
     for(const e of bucket)if(e[stampKey]!==stamp){
      e[stampKey]=stamp;result.push(e);
     }
    }
   return result;
  }
 };
}
let rng=0x8a123eed;
const random=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return (rng>>>0)/4294967296};
const rnd=(min,max)=>min+(max-min)*random(),ids=rows=>rows?.map(row=>row.id)??[];
let checks=0;
for(const [kind,size] of [['wall',64],['building',96],['terrain',256],['island',512]]){
 const before=legacy(size),after=createSpatialCellGrid(size);
 const originals=[],refactored=[];
 for(let i=0;i<180;i++){
  const x=rnd(-1800,1800),z=rnd(-1800,1800),
    dx=rnd(.1,size*2.3),dz=rnd(.1,size*2.3);
  const a={id:i,x0:x-dx/2,x1:x+dx/2,z0:z-dz/2,z1:z+dz/2},b={...a};
  originals.push(a);refactored.push(b);
  before.insert(a,a.x0,a.x1,a.z0,a.z1);
  after.insert(b,b.x0,b.x1,b.z0,b.z1);
 }
 // Repeated insertion: the original stamp-based deduplication is preserved.
 for(const i of [0,4,4,17]){
  const a=originals[i],b=refactored[i];
  before.insert(a,a.x0,a.x1,a.z0,a.z1);
  after.insert(b,b.x0,b.x1,b.z0,b.z1);
 }
 const key=kind==='wall'?'_wallQueryStamp':kind==='building'?'_buildingQueryStamp':'_testStamp';
 for(let n=0;n<460;n++){
  const x=rnd(-2000,2000),z=rnd(-2000,2000),r=n%13===0?0:rnd(0,size*2);
  assert.deepEqual(ids(after.at(x,z)),ids(before.at(x,z)),kind+' point '+n);
  assert.deepEqual(ids(after.query(x,z,r,key,n+1)),
    ids(before.query(x,z,r,key,n+1)),kind+' rectangle '+n);
  checks++;
 }
 before.clear();after.clear();
 assert.equal(after.at(0,0),undefined);
 for(let i=0;i<180;i+=2){
  const a=originals[i],b=refactored[i];
  before.insert(a,a.x0,a.x1,a.z0,a.z1);
  after.insert(b,b.x0,b.x1,b.z0,b.z1);
 }
 for(let n=460;n<525;n++){
  const x=rnd(-2000,2000),z=rnd(-2000,2000);
  assert.deepEqual(ids(after.query(x,z,size/2,'_resetStamp',n)),
   ids(before.query(x,z,size/2,'_resetStamp',n)),kind+' invalidation '+n);
  checks++;
 }
}
assert.throws(()=>createSpatialCellGrid(0),RangeError);
const edge=createSpatialCellGrid(64),wall={id:'edge'};
edge.insert(wall,-64,64,-64,64);
for(const [x,z] of [[-64,-64],[-1,-1],[0,0],[64,64]])
 assert.deepEqual(edge.at(x,z),[wall]);
assert.equal(edge.at(129,0),undefined);
const game=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8'),
 boot=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8');
for(const size of [64,96,256,512])
 assert(game.includes('createSpatialCellGrid('+size+')'),size+' grid not in game-core');
assert(game.includes("wallGrid.query(x,z,r,'_wallQueryStamp',++wallQueryStamp)")&&
 game.includes("buildingGrid.query(x,z,r,'_buildingQueryStamp',++buildingQueryStamp)"));
assert(game.includes('wallGridCount=-1')&&game.includes('terrainLevelGrid.clear()'));
assert(boot.includes('window.HUNTER_SPATIAL_GRID=spatialGrid'));
const harness=readFileSync(new URL('./harness.cjs',import.meta.url),'utf8');
assert(harness.includes('c.HUNTER_SPATIAL_GRID=await import('),
 'la configuració de proves del motor ha de carregar el mateix mòdul abans del runtime');

console.log('PASS spatial grid parity: '+checks+' deterministic before/after queries');
