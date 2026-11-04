// Índex espacial estàtic sense Three.js, RNG ni dependències globals.
// Conserva l'ordre de les cel·les i de les insercions per evitar canvis
// en la prioritat de col·lisions, cobertures i altures del món.
export function createSpatialCellGrid(cellSize){
 if(!Number.isFinite(cellSize)||cellSize<=0)
  throw new RangeError('cellSize ha de ser positiu');
 const cells=new Map(),cellKey=(cx,cz)=>cx+','+cz;
 function clear(){cells.clear();}
 function insert(entity,x0,x1,z0,z1){
  const minX=Math.floor(x0/cellSize),maxX=Math.floor(x1/cellSize),
    minZ=Math.floor(z0/cellSize),maxZ=Math.floor(z1/cellSize);
  for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
   const key=cellKey(cx,cz),bucket=cells.get(key);
   if(bucket)bucket.push(entity);else cells.set(key,[entity]);
  }
 }
 function at(x,z){
  return cells.get(cellKey(Math.floor(x/cellSize),Math.floor(z/cellSize)));
 }
 function query(x,z,r=0,stampKey,stamp){
  const out=[],minX=Math.floor((x-r)/cellSize),maxX=Math.floor((x+r)/cellSize),
    minZ=Math.floor((z-r)/cellSize),maxZ=Math.floor((z+r)/cellSize);
  for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
   const bucket=cells.get(cellKey(cx,cz));if(!bucket)continue;
   for(const entity of bucket)if(entity[stampKey]!==stamp){
    entity[stampKey]=stamp;out.push(entity);
   }
  }
  return out;
 }
 return Object.freeze({clear,insert,at,query});
}
