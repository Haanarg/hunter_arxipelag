// Hunter: Arxipèlag — editable D3.1 preview mesh refinements.
// Operates on the real mirrored D3.1 triangles; never covers doors with solid green boxes.
const average=(a)=>a.reduce((s,v)=>s+v,0)/a.length;
const centroid=t=>[0,1,2].map(i=>average(t.map(v=>v.p[i])));
const round=(v)=>Math.round(v*1e5)/1e5;
const faceSignature=(t,axis)=>t.map(v=>[round(v.p[0]),round(v.p[1]),round(Math.abs(v.p[2]-axis))].join(':')).sort().join('|');
function wheelVolume(t,axles,axis){
 const c=centroid(t);
 if(Math.abs(c[2]-axis)<.80 || Math.abs(c[2]-axis)>1.35)return false;
 if(c[1]<-.08 || c[1]>.84)return false;
 // Wheel tread occupies a bounded radial disc. Do not delete the upper fenders.
 return axles.some(x=>Math.hypot(c[0]-x,c[1]-.44)<.48);
}
export function removeOriginalTires(triangles,axis,axles=[-1.74,1.45]){
 const kept=triangles.filter(t=>!wheelVolume(t,axles,axis));
 return {triangles:kept,removed:triangles.length-kept.length};
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
