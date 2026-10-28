import {walkingHeightAt,solidRoofAt} from './walk-surfaces.mjs';
import {sweptRoofLanding} from './player-vertical.mjs';
import {rawTerrainAt,levelHeight,pushWalls,pushTree} from './world-physics.mjs';
const finite=Number.isFinite,key=(x,z)=>x+','+z;
function number(value){if(!finite(value)||Math.abs(value)>1000000)throw new RangeError('Invalid geometry coordinate');return value;}
function pick(row,keys){if(!row||typeof row!=='object')throw new TypeError('Invalid geometry row');return Object.fromEntries(keys.map(k=>[k,number(row[k])]));}
function rows(value,max){if(!Array.isArray(value)||value.length>max)throw new RangeError('Invalid geometry count');return value;}
function normalizeStair(s){
  const out=pick(s,['x','z','nx','nz','top','length','width']);
  if(out.length<=0||out.width<=0||Math.abs(Math.hypot(out.nx,out.nz)-1)>1e-6)throw new RangeError('Invalid stair');
  if(!s.ramp&&(!Number.isInteger(s.steps)||s.steps<1||s.tread<=0||s.rise<0))throw new RangeError('Invalid stair treads');
  return {...out,ramp:!!s.ramp,internal:!!s.internal,owner:{rb:!!s.owner?.rb},
    ...(s.ramp?pick(s,['bottom']):pick(s,['steps','tread','rise']))};
}
function normalizeBuilding(b){
  const out=pick(b,['x','z','w','d','h','fy']);if(out.w<=0||out.d<=0)throw new RangeError('Invalid building');
  return {...out,angle:number(b.angle??0),rb:!!b.rb,rhp:number(b.rhp??1),hangar:!!b.hangar,
    roof:{scale:{x:number(b.roof?.scale?.x||1),z:number(b.roof?.scale?.z||1)}},upperFloor:!!b.upperFloor,
    ...(b.upperFloor?{...pick(b,['localW','localD','storey']),interiorStair:normalizeStair(b.interiorStair)}:{})};
}
function normalizeSurfaces(source){
  if(source.format===1)return {stairs:[],piers:[],buildings:[],bunker:null,terminalRamps:[]};
  const bunker=source.bunker;
  if(bunker&&(!bunker.basement||bunker.basement.halfX<=0||bunker.basement.halfZ<=0||bunker.basement.stair?.width<=0||bunker.basement.stair?.zTop===bunker.basement.stair?.zBottom))throw new RangeError('Invalid bunker');
  return {stairs:rows(source.stairs,20000).map(normalizeStair),
    piers:rows(source.piers,20000).map(p=>{const out=pick(p,['x','z','ux','uz','px','pz','length','width','y']);if(out.length<=0||out.width<=0)throw new RangeError('Invalid pier');return out;}),
    buildings:rows(source.buildings,20000).map(normalizeBuilding),
    terminalRamps:rows(source.terminalRamps,1000).map(p=>{const out=pick(p,['x','z','ux','uz','length','startY','endY']);if(out.length<=0)throw new RangeError('Invalid terminal ramp');return out;}),
    bunker:bunker?{...normalizeBuilding(bunker),basement:{...pick(bunker.basement,['halfX','halfZ','floorY']),stair:pick(bunker.basement.stair,['x','width','zTop','zBottom'])}}:null};
}
export function normalizeWorldGeometry(source){
  if(!source||![1,2].includes(source.format)||source.generatorVersion!=='world:0.6.2'||!Number.isInteger(source.seed)||source.seed<0||source.seed>4294967295||![1,2].includes(source.mapScale))throw new RangeError('Invalid world geometry');
  return {format:2,...normalizeSurfaces(source),generatorVersion:source.generatorVersion,seed:source.seed,mapScale:source.mapScale,
    islands:rows(source.islands,1000).map(i=>{const row=pick(i,['x','z','r','peakX','peakZ']);if(row.r<=0)throw new RangeError('Invalid island');return row;}),
    levels:rows(source.levels,10000).map(i=>{const row=pick(i,['x','z','hw','hd','y','c','s','blend']);if(row.hw<0||row.hd<0||row.blend<=0)throw new RangeError('Invalid level');return row;}),
    walls:rows(source.walls,100000).map(w=>{const row=pick(w,['x0','x1','z0','z1','y0','y1']);if(row.x0>row.x1||row.z0>row.z1||row.y0>row.y1)throw new RangeError('Invalid wall');return {...row,open:!!w.open,playerBlock:w.playerBlock!==false,towerLegOwner:!!w.towerLegOwner};}),
    trees:rows(source.trees,200000).map(t=>{const row=pick(t,['x','z','r']);if(row.r<0)throw new RangeError('Invalid tree');return {...row,p:!!t.p,rock:!!t.rock,...(t.p?pick(t,['y','s','yaw']):{}),...(t.rock?pick(t,['topY','bottomY']):{})};})};
}
export function createStaticWorldAdapter(source){
  const data=normalizeWorldGeometry(source),halfSize=2400*data.mapScale,grids={islands:new Map(),levels:new Map(),walls:new Map(),trees:new Map(),buildings:new Map()};let cells=0;
  function insert(grid,item,size,x0,x1,z0,z1){
    const xa=Math.floor(x0/size),xb=Math.floor(x1/size),za=Math.floor(z0/size),zb=Math.floor(z1/size),count=(xb-xa+1)*(zb-za+1);
    if(!Number.isSafeInteger(count)||count<0||cells+count>500000)throw new RangeError('Geometry spatial index exceeds limit');cells+=count;
    for(let x=xa;x<=xb;x++)for(let z=za;z<=zb;z++){const k=key(x,z),bucket=grid.get(k);if(bucket)bucket.push(item);else grid.set(k,[item]);}
  }
  for(const i of data.islands)insert(grids.islands,i,512,i.x-i.r*2,i.x+i.r*2,i.z-i.r*2,i.z+i.r*2);
  for(const m of data.levels){const reach=Math.hypot(m.hw,m.hd)+m.blend;insert(grids.levels,m,256,m.x-reach,m.x+reach,m.z-reach,m.z+reach);}
  for(const w of data.walls)insert(grids.walls,w,64,w.x0,w.x1,w.z0,w.z1);
  for(const t of data.trees)insert(grids.trees,t,16,t.x,t.x,t.z,t.z);
  for(const b of data.buildings)insert(grids.buildings,b,96,b.x-b.w/2,b.x+b.w/2,b.z-b.d/2,b.z+b.d/2);
  function heightAt(x,z){
    number(x);number(z);const list=grids.islands.get(key(Math.floor(x/512),Math.floor(z/512)))||data.islands;
    const h=rawTerrainAt(x,z,list,data.seed,halfSize),levels=grids.levels.get(key(Math.floor(x/256),Math.floor(z/256)));
    return levels?levelHeight(h,x,z,levels):h;
  }
  function wallsAt(x,z){const seen=new Set(),out=[];for(let a=Math.floor((x-.6)/64);a<=Math.floor((x+.6)/64);a++)for(let b=Math.floor((z-.6)/64);b<=Math.floor((z+.6)/64);b++)for(const w of grids.walls.get(key(a,b))||[])if(!seen.has(w)){seen.add(w);out.push(w);}return out;}
  function resolveBody(previous,candidate){
    const p={x:number(candidate.x),z:number(candidate.z),hd:number(candidate.hd),y:number(previous.y)};
    pushWalls(p,wallsAt(p.x,p.z));const x=Math.floor(p.x/16),z=Math.floor(p.z/16);
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const t of grids.trees.get(key(x+a,z+b))||[])pushTree(p,t,false);
    return p;
  }
  function groundAt(x,z,previous=-Infinity,visible=null){return walkingHeightAt({physical:heightAt(x,z),visible,
    stairs:data.stairs,piers:data.piers,buildings:grids.buildings.get(key(Math.floor(x/96),Math.floor(z/96)))||[],
    bunker:data.bunker,terminalRamps:data.terminalRamps},x,z,previous);}
  return Object.freeze({kind:'static-surfaces',limit:halfSize-2,heightAt,groundAt,resolveBody,
    roofLanding(from,to){return sweptRoofLanding(from,to,{solidRoofAt,
      buildingCandidates:(x,z)=>grids.buildings.get(key(Math.floor(x/96),Math.floor(z/96)))||[]});},
    // Static support only: no gravity, water motion or moving platforms yet.
    resolve(previous,candidate){const p=resolveBody(previous,candidate);p.y=groundAt(p.x,p.z,previous.y);return p;},
    snapshot:()=>structuredClone(data)});
}
