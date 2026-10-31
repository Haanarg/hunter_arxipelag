// Broadphase estable dels vehicles del COOP. La selecció exacta usa la
// mateixa condició de distància de la predicció original; l'índex només
// evita examinar vehicles llunyans a cada subpas de 30 Hz.
// S'indexa un snapshot immutable; mai s'utilitza per física autoritativa.
import {vehicleSpecs} from './vehicle-specs.mjs';

const CELL=128;
const key=(x,z)=>x+','+z;

export function createNativeVehicleCandidateIndex(vehicles){
 const radiusByType=Object.create(null);
 for(const type of Object.keys(vehicleSpecs.hitboxes)){
  const box=vehicleSpecs.hitboxes[type];
  radiusByType[type]=Math.hypot(...box)*vehicleSpecs.scales[type]/2;
 }
 const radius=vehicles.map(row=>radiusByType[row.t]);
 const maxRadius=radius.length?Math.max(...radius):0;
 const grid=new Map();
 for(let i=0;i<vehicles.length;i++){
  const row=vehicles[i],k=key(Math.floor(row.x/CELL),Math.floor(row.z/CELL));
  const bucket=grid.get(k);
  if(bucket)bucket.push(i);else grid.set(k,[i]);
 }
 function nearby(cx,cz,reach){
  const extra=reach+maxRadius,
   xa=Math.floor((cx-extra)/CELL),xb=Math.floor((cx+extra)/CELL),
   za=Math.floor((cz-extra)/CELL),zb=Math.floor((cz+extra)/CELL),
   indices=[];
  // Salt/teletransport poc habitual: si consultar moltes cel·les és
  // més costós que fer un recorregut total, conserva el filtre original.
  if((xb-xa+1)*(zb-za+1)>64){
   for(let i=0;i<vehicles.length;i++)indices.push(i);
  }else{
   for(let x=xa;x<=xb;x++)for(let z=za;z<=zb;z++){
    const bucket=grid.get(key(x,z));
    if(bucket)for(const i of bucket)indices.push(i);
   }
   // L'ordre de la llista original és important si dues col·lisions
   // serien simultànies. Cada vehicle viu exactament en una cel·la.
   if(indices.length>1)indices.sort((a,b)=>a-b);
  }
  const result=[];
  for(const i of indices){
   const row=vehicles[i];
   if(Math.hypot(row.x-cx,row.z-cz)<=reach+radius[i])result.push(row);
  }
  return result;
 }
 return {nearby};
}
