import {rawTerrainAt,levelHeight,pushWalls,pushTree} from './world-physics.mjs';
const finite=Number.isFinite,key=(x,z)=>x+','+z;
function number(value){if(!finite(value)||Math.abs(value)>1000000)throw new RangeError('Invalid geometry coordinate');return value;}
function pick(row,keys){if(!row||typeof row!=='object')throw new TypeError('Invalid geometry row');return Object.fromEntries(keys.map(k=>[k,number(row[k])]));}
function rows(value,max){if(!Array.isArray(value)||value.length>max)throw new RangeError('Invalid geometry count');return value;}
export function normalizeWorldGeometry(source){
  if(!source||source.format!==1||source.generatorVersion!=='world:0.6.2'||!Number.isInteger(source.seed)||source.seed<0||source.seed>4294967295||![1,2].includes(source.mapScale))throw new RangeError('Invalid world geometry');
  return {format:1,generatorVersion:source.generatorVersion,seed:source.seed,mapScale:source.mapScale,
    islands:rows(source.islands,1000).map(i=>{const row=pick(i,['x','z','r','peakX','peakZ']);if(row.r<=0)throw new RangeError('Invalid island');return row;}),
    levels:rows(source.levels,10000).map(i=>{const row=pick(i,['x','z','hw','hd','y','c','s','blend']);if(row.hw<0||row.hd<0||row.blend<=0)throw new RangeError('Invalid level');return row;}),
    walls:rows(source.walls,100000).map(w=>{const row=pick(w,['x0','x1','z0','z1','y0','y1']);if(row.x0>row.x1||row.z0>row.z1||row.y0>row.y1)throw new RangeError('Invalid wall');return {...row,open:!!w.open,playerBlock:w.playerBlock!==false,towerLegOwner:!!w.towerLegOwner};}),
    trees:rows(source.trees,200000).map(t=>{const row=pick(t,['x','z','r']);if(row.r<0)throw new RangeError('Invalid tree');return {...row,p:!!t.p,rock:!!t.rock,...(t.p?pick(t,['y','s','yaw']):{}),...(t.rock?pick(t,['topY','bottomY']):{})};})};
}
export function createStaticWorldAdapter(source){
  const data=normalizeWorldGeometry(source),halfSize=2400*data.mapScale,grids={islands:new Map(),levels:new Map(),walls:new Map(),trees:new Map()};let cells=0;
  function insert(grid,item,size,x0,x1,z0,z1){
    const xa=Math.floor(x0/size),xb=Math.floor(x1/size),za=Math.floor(z0/size),zb=Math.floor(z1/size),count=(xb-xa+1)*(zb-za+1);
    if(!Number.isSafeInteger(count)||count<0||cells+count>500000)throw new RangeError('Geometry spatial index exceeds limit');cells+=count;
    for(let x=xa;x<=xb;x++)for(let z=za;z<=zb;z++){const k=key(x,z),bucket=grid.get(k);if(bucket)bucket.push(item);else grid.set(k,[item]);}
  }
  for(const i of data.islands)insert(grids.islands,i,512,i.x-i.r*2,i.x+i.r*2,i.z-i.r*2,i.z+i.r*2);
  for(const m of data.levels){const reach=Math.hypot(m.hw,m.hd)+m.blend;insert(grids.levels,m,256,m.x-reach,m.x+reach,m.z-reach,m.z+reach);}
  for(const w of data.walls)insert(grids.walls,w,64,w.x0,w.x1,w.z0,w.z1);
  for(const t of data.trees)insert(grids.trees,t,16,t.x,t.x,t.z,t.z);
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
  return Object.freeze({kind:'static-terrain',limit:halfSize-2,heightAt,resolveBody,
    // Terrain-only vertical support. Stairs, floors, water and moving platforms are not modeled here yet.
    resolve(previous,candidate){const p=resolveBody(previous,candidate);p.y=heightAt(p.x,p.z);return p;},
    snapshot:()=>structuredClone(data)});
}
