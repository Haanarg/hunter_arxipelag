// Hunter: Arxipèlag — editable D3.1 preview mesh refinements.
// Operates on the real mirrored D3.1 triangles; never covers doors with solid green boxes.
const average=(a)=>a.reduce((s,v)=>s+v,0)/a.length;
const centroid=t=>[0,1,2].map(i=>average(t.map(v=>v.p[i])));
const round=(v)=>Math.round(v*1e5)/1e5;
const faceSignature=(t,axis)=>t.map(v=>[round(v.p[0]),round(v.p[1]),round(Math.abs(v.p[2]-axis))].join(':')).sort().join('|');
// Match the complete ORIGINAL tyre, including the high outer tread and the
// inner circular hub/brake-looking disk.  These are removed before placing
// independent A4.3 wheels.  Retain large body/fender polygons around the hole.
export const HUMVEE_WHEEL_SPEC=Object.freeze({
 axles:Object.freeze([-1.78,1.45]),
 centerY:.49,
 offsetZ:1.02,
 radius:.50,
 truckScale:.625  // truck A4.3 radius .80 * .625 = .50
});
function wheelVolume(t,axles,axis){
 const c=centroid(t),lateral=Math.abs(c[2]-axis);
 if(lateral<.47||lateral>1.34||c[1]<-.08||c[1]>1.13)return false;
 const xs=t.map(v=>v.p[0]),ys=t.map(v=>v.p[1]);
 // Wide lower body panels and the wheel arch itself are not tyres.
 if(Math.max(...xs)-Math.min(...xs)>.96||Math.max(...ys)-Math.min(...ys)>.96)return false;
 return axles.some(x=>{
  const radius=Math.hypot(c[0]-x,c[1]-HUMVEE_WHEEL_SPEC.centerY);
  const tread=lateral>=.70 && radius<=.595;
  // Inner circular disc left over from the original hub / brake assembly.
  const hub=lateral>=.47 && radius<=.435;
  // Upper black tyre fragments sat above the previous .84 Y clipping limit.
  const upper=lateral>=.77 && c[1]>=.84 && radius<=.615;
  return tread||hub||upper;
 });
}
export function removeOriginalTires(triangles,axis,axles=HUMVEE_WHEEL_SPEC.axles){
 let removed=0;
 const kept=triangles.filter(t=>{
  if(!wheelVolume(t,axles,axis))return true;
  removed++;return false;
 });
 return {triangles:kept,removed};
}
function vertexUV(v){
 return {p:[...v.p],uv:[...v.uv],n:[...v.n]};
}
function twoFaceRectangle(corners,normalSign){
 const ids=normalSign>=0?[[0,1,2],[0,2,3]]:[[0,2,1],[0,3,2]];
 return ids.map(f=>f.map(i=>vertexUV(corners[i])));
}
export function mergeFourDoorTriangles(triangles,selected,axis){
 if(!Array.isArray(selected)||selected.length!==4||new Set(selected).size!==4){
  throw new Error('Selecciona quatre triangles originals diferents de la mateixa porta.');
 }
 if(selected.some(i=>!Number.isInteger(i)||i<0||i>=triangles.length)){
  throw new Error('Hi ha un índex de triangle invàlid.');
 }
 const chosen=selected.map(i=>triangles[i]);
 const sampled=chosen.flatMap(t=>t);
 const coords=chosen.map(centroid);
 const positives=coords.every(c=>c[2]>axis+.70);
 const negatives=coords.every(c=>c[2]<axis-.70);
 if(!positives&&!negatives)throw new Error('Selecciona quatre cares del mateix costat de la porta.');
 const minX=Math.min(...sampled.map(v=>v.p[0])),maxX=Math.max(...sampled.map(v=>v.p[0]));
 const minY=Math.min(...sampled.map(v=>v.p[1])),maxY=Math.max(...sampled.map(v=>v.p[1]));
 if(minX<-.95||maxX>.95||minY<.75||maxY>1.52 ||maxX-minX<.035||maxY-minY<.035){
  throw new Error('La selecció no correspon a la superfície de la porta.');
 }
 const sign=positives?1:-1;
 const z=average(sampled.map(v=>v.p[2]));
 // The replacement is made of two triangles forming a single planar rectangle.
 const sampleUV=(x,y)=>{
  let nearest=sampled[0],dist=Infinity;
  for(const v of sampled){
   const d=(v.p[0]-x)**2+(v.p[1]-y)**2;
   if(d<dist){nearest=v;dist=d;}
  }
  return [...nearest.uv];
 };
 const corners2D=[[minX,minY],[maxX,minY],[maxX,maxY],[minX,maxY]];
 const makeCorners=(mz,mSign)=>corners2D.map(([x,y])=>({p:[x,y,mz],uv:sampleUV(x,y),n:[0,0,mSign]}));
 const positive=twoFaceRectangle(makeCorners(z,sign),sign);
 const negative=twoFaceRectangle(makeCorners(2*axis-z,-sign),-sign);
 const signatures=new Set(chosen.map(t=>faceSignature(t,axis)));
 const removal=new Set(selected);
 for(let i=0;i<triangles.length;i++){
  if(removal.has(i))continue;
  if(signatures.has(faceSignature(triangles[i],axis)))removal.add(i);
 }
 // A conservative guard: each of the four selected faces needs its opposite.
 if(removal.size<8)throw new Error('No es troba la cara simètrica; no he canviat la malla.');
 const newTriangles=triangles.filter((t,i)=>!removal.has(i)).concat(positive,negative);
 return {triangles:newTriangles,removed:removal.size,added:4,bounds:{minX,maxX,minY,maxY}};
}
export function sideDoorCandidate(t,axis,side=1){
 const c=centroid(t);
 return c[0]>-.92&&c[0]<.93&&c[1]>.78&&c[1]<1.48&&
   (c[2]-axis)*side>.72;
}
