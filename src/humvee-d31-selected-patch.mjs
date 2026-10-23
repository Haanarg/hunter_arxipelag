// Humvee D3.1 — seed-guided door relief flattening.
// Geometry is taken from the actual 2,200-face symmetric D3.1 preview.
// The four source triangle IDs are from the user's editor on this EXACT
// unmodified model, after removeOriginalTires(). Do not renumber them.
export const SELECTED_D31_FRONT_PLUS_Z=Object.freeze([1242,1246,1250,1252]);

// Door opening/edge bounds measured in the D3.1 model (front axis -X).
const DOOR_X=Object.freeze([Object.freeze([-.785,-.035]),Object.freeze([.045,.790])]);
const AREA_EPS=1e-9;
const posCenter=t=>[0,1,2].map(k=>t.reduce((sum,v)=>sum+v.p[k],0)/3);
const area=t=>{
 const [a,b,c]=t.map(v=>v.p),u=a.map((x,k)=>b[k]-x),w=a.map((x,k)=>c[k]-x);
 return Math.hypot(u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0])*.5;
};
function interpolate(a,b,t){
 return {p:a.p.map((v,k)=>v+t*(b.p[k]-v)),
  uv:a.uv.map((v,k)=>v+t*(b.uv[k]-v)),
  n:a.n.map((v,k)=>v+t*(b.n[k]-v))};
}
function clip(poly,axis,bound,keepGreater){
 const inside=v=>keepGreater?v.p[axis]>=bound-1e-9:v.p[axis]<=bound+1e-9;
 const out=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[(i+poly.length-1)%poly.length],b=poly[i];
  const ain=inside(a),bin=inside(b);
  if(ain!==bin){
   const denom=b.p[axis]-a.p[axis];
   if(Math.abs(denom)>1e-10){
    const v=interpolate(a,b,Math.max(0,Math.min(1,(bound-a.p[axis])/denom)));
    v.p[axis]=bound;out.push(v);
   }
  }
  if(bin)out.push(b);
 }
 return out;
}
function tris(poly){
 const faces=[];
 for(let i=1;i+1<poly.length;i++){
  const f=[poly[0],poly[i],poly[i+1]];
  if(area(f)>AREA_EPS)faces.push(f);
 }
 return faces;
}
// Polygon difference: triangle minus an axis-aligned XY rectangle.
// Retaining the remaining clipped triangles prevents gaps at the door frame.
function trimRectangle(t,r){
 let inside=t.slice(),outside=[];
 for(const [axis,bound,greater] of [
  [0,r.x0,true],[0,r.x1,false],[1,r.y0,true],[1,r.y1,false]
 ]){
  if(inside.length<3)break;
  outside.push(...tris(clip(inside,axis,bound,!greater)));
  inside=clip(inside,axis,bound,greater);
 }
 const covered=tris(inside);
 return {outside,covered};
}
function uvMedian(values){
 const sorted=values.slice().sort((a,b)=>a-b);
 return sorted[Math.floor(sorted.length/2)];
}
function nearestDepth(faces,r,side,axis){
 // Use the median elevation of the actual neighbouring outer door surface
 // so the replacement does not protrude from the rear door.
 const candidates=[];
 for(const t of faces){
  const p=posCenter(t),z=(p[2]-axis)*side;
  if(p[0]<r.x0||p[0]>r.x1||p[1]<r.y0||p[1]>r.y1||z<1.045||z>1.20)continue;
  if(t.some(v=>(v.p[2]-axis)*side<0))continue;
  candidates.push(z);
 }
 if(!candidates.length)throw Error('No hi ha geometria lateral de porta per ajustar el pla');
 return uvMedian(candidates);
}
function makePlane(r,depth,uv,axis,side){
 const z=axis+side*depth;
 const [u,v]=uv;
 const normal=[0,0,side],V=(x,y)=>({p:[x,y,z],uv:[u,v],n:[...normal]});
 const a=V(r.x0,r.y0),b=V(r.x1,r.y0),c=V(r.x1,r.y1),d=V(r.x0,r.y1);
 return side>0?[[a,b,c],[a,c,d]]:[[a,c,b],[a,d,c]];
}
export function flattenSelectedDoorPatchOnAllDoors(faces,axis,ids=SELECTED_D31_FRONT_PLUS_Z){
 if(!Array.isArray(faces)||!Array.isArray(ids)||ids.length!==4||
  new Set(ids).size!==4||ids.some(i=>!Number.isInteger(i)||i<0||i>=faces.length)){
  throw Error('La selecció ha de tenir exactament els 4 triangles originals de D3.1');
 }
 const selected=ids.map(i=>faces[i]);
 for(const t of selected){
  const c=posCenter(t);
  if(c[0]<DOOR_X[0][0]-.02||c[0]>DOOR_X[0][1]+.02||
     c[1]<.65||c[1]>1.28||c[2]<axis+1.02){
   throw Error('Els identificadors no coincideixen amb la porta davantera +Z del D3.1');
  }
 }
 const xvals=selected.flatMap(t=>t.map(v=>v.p[0]));
 const yvals=selected.flatMap(t=>t.map(v=>v.p[1]));
 const minX=Math.min(...xvals),maxX=Math.max(...xvals);
 const minY=Math.min(...yvals),maxY=Math.max(...yvals);
 // The chosen faces cover the raised X; include its surrounding triangles
 // to reach the original panel edges, never the window or door pillars.
 const ref={
  x0:Math.max(DOOR_X[0][0],minX-.012),
  x1:Math.min(DOOR_X[0][1],maxX+.012),
  y0:Math.max(.686,minY-.018),
  y1:Math.min(1.275,maxY+.085)
 };
 const u0=(ref.x0-DOOR_X[0][0])/(DOOR_X[0][1]-DOOR_X[0][0]);
 const u1=(ref.x1-DOOR_X[0][0])/(DOOR_X[0][1]-DOOR_X[0][0]);
 const rects=DOOR_X.map(([min,max])=>({
  x0:min+u0*(max-min),x1:min+u1*(max-min),y0:ref.y0,y1:ref.y1
 }));
 // The seed UVs sample the ORIGINAL olive bodywork on the GLB atlas.
 // Using the real patch UVs avoids the white door bug of previous versions.
 const sampled=selected.flatMap(t=>t.map(v=>v.uv));
 const paintUV=[uvMedian(sampled.map(x=>x[0])),uvMedian(sampled.map(x=>x[1]))];
 const patches=[];
 for(let door=0;door<2;door++)for(const side of [-1,1]){
  patches.push({door,side,rect:rects[door],
   depth:nearestDepth(faces,rects[door],side,axis)});
 }
 const output=[];let coveredTriangles=0,retainedBoundaryTriangles=0;
 // Remove only the EXTERIOR door skins. Structural triangles behind the
 // flattened panels remain untouched. Each crossing face is clipped exactly.
 for(const triangle of faces){
  const c=posCenter(triangle);
  const p=patches.find(p=>{
   const z=(c[2]-axis)*p.side,r=p.rect;
   const xlo=Math.min(...triangle.map(v=>v.p[0])),
         xhi=Math.max(...triangle.map(v=>v.p[0])),
         ylo=Math.min(...triangle.map(v=>v.p[1])),
         yhi=Math.max(...triangle.map(v=>v.p[1]));
   return z>Math.min(1.032,p.depth-.105)&&z<1.25&&
    triangle.every(v=>(v.p[2]-axis)*p.side>0)&&
    xhi>r.x0&&xlo<r.x1&&yhi>r.y0&&ylo<r.y1;
  });
  if(!p){output.push(triangle);continue;}
  const cut=trimRectangle(triangle,p.rect);
  if(!cut.covered.length){output.push(triangle);continue;}
  coveredTriangles+=cut.covered.length;
  retainedBoundaryTriangles+=cut.outside.length;
  output.push(...cut.outside);
 }
 const panels=[];
 for(const patch of patches)panels.push(...makePlane(patch.rect,patch.depth,paintUV,axis,patch.side));
 output.push(...panels);
 if(!coveredTriangles)throw Error('No s’ha trobat cap relleu per aplanar');
 if(output.length>=faces.length){
  // Clipping can add faces along the frame; report the true count rather
  // than claiming the overall geometry is lighter when it is not.
 }
 return {triangles:output,stats:{
  source:ids.slice(),inputTriangles:faces.length,outputTriangles:output.length,
  removedPatchFragments:coveredTriangles,trimmedFrameTriangles:retainedBoundaryTriangles,
  doors:4,panels:panels.length,perDoorTriangles:2,
  paintUV,rectangles:patches.map(p=>({door:p.door,side:p.side,...p.rect,depth:p.depth}))
 }};
}
