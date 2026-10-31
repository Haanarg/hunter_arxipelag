// Índex espacial dels murs per al pilot local. No canvia els murs ni
// les seves col·lisions: només replica el filtre AABB que abans revisava
// tota la geometria a cada subpas de predicció (30 Hz + replay).
const CELL=128,MAX_WALL_CELLS=128;
const key=(x,z)=>x+','+z;
const includesWall=(wall,cx,cz,reach)=>
 wall.x0<=cx+reach&&wall.x1>=cx-reach&&
 wall.z0<=cz+reach&&wall.z1>=cz-reach;

export function createNativeWallCandidateIndex(walls){
 const grid=new Map(),oversized=[];
 for(let i=0;i<walls.length;i++){
  const w=walls[i],xa=Math.floor(w.x0/CELL),xb=Math.floor(w.x1/CELL),
   za=Math.floor(w.z0/CELL),zb=Math.floor(w.z1/CELL);
  const cells=(xb-xa+1)*(zb-za+1);
  if(!Number.isSafeInteger(cells)||cells>MAX_WALL_CELLS){
   oversized.push(i);continue;
  }
  for(let x=xa;x<=xb;x++)for(let z=za;z<=zb;z++){
   const k=key(x,z),bucket=grid.get(k);
   if(bucket)bucket.push(i);else grid.set(k,[i]);
  }
 }
 function nearby(cx,cz,reach){
  const xa=Math.floor((cx-reach)/CELL),xb=Math.floor((cx+reach)/CELL),
   za=Math.floor((cz-reach)/CELL),zb=Math.floor((cz+reach)/CELL);
  const cells=(xb-xa+1)*(zb-za+1);
  // Salt excepcional: consultar les parets directament és més barat.
  if(!Number.isSafeInteger(cells)||cells>64)
   return walls.filter(w=>includesWall(w,cx,cz,reach));
  const candidates=new Set(oversized);
  for(let x=xa;x<=xb;x++)for(let z=za;z<=zb;z++){
   const bucket=grid.get(key(x,z));
   if(bucket)for(const i of bucket)candidates.add(i);
  }
  const ordered=[...candidates].sort((a,b)=>a-b),result=[];
  for(const i of ordered){
   const wall=walls[i];
   if(includesWall(wall,cx,cz,reach))result.push(wall);
  }
  return result;
 }
 return {nearby};
}
