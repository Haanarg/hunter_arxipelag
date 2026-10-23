// D3.1 selected bodywork: remove original mirror geometry, remove door
// armour/facets and reconstruct flush door skins, close rear apertures.
// All returned faces preserve the original GLB material and UV atlas.
const EPS=1e-7;
const center=tri=>tri.reduce((s,v)=>s.map((n,i)=>n+v.p[i]/3),[0,0,0]);
const lerp=(a,b,t)=>({
 p:a.p.map((n,i)=>n+(b.p[i]-n)*t),
 uv:a.uv.map((n,i)=>n+(b.uv[i]-n)*t),
 n:a.n.map((n,i)=>n+(b.n[i]-n)*t)
});
function area(tri){
 const [a,b,c]=tri.map(v=>v.p);
 const u=a.map((n,i)=>b[i]-n),v=a.map((n,i)=>c[i]-n);
 return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;
}
function triangulate(poly){
 const faces=[];
 for(let i=1;i<poly.length-1;i++){
  const face=[poly[0],poly[i],poly[i+1]];
  if(area(face)>1e-8)faces.push(face);
 }
 return faces;
}
function clip(poly,axis,edge,keepGreater){
 const inside=v=>keepGreater?v.p[axis]>=edge-EPS:v.p[axis]<=edge+EPS;
 const out=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[(i+poly.length-1)%poly.length],b=poly[i];
  const ai=inside(a),bi=inside(b);
  if(ai!==bi){
   const denom=b.p[axis]-a.p[axis];
   if(Math.abs(denom)>EPS){
    const point=lerp(a,b,Math.max(0,Math.min(1,(edge-a.p[axis])/denom)));
    point.p[axis]=edge;
    out.push(point);
   }
  }
  if(bi)out.push(b);
 }
 return out;
}
// Exactly clips the rectangle from the existing door-facing polygons, rather
// than dropping whole triangles that cross the edge and creating new holes.
function removeRectPart(face,xmin,xmax,ymin,ymax){
 let inside=face,out=[];
 const planes=[[0,xmin,true],[0,xmax,false],[1,ymin,true],[1,ymax,false]];
 for(const [axis,edge,greater] of planes){
  if(inside.length<3)break;
  out.push(...triangulate(clip(inside,axis,edge,!greater)));
  inside=clip(inside,axis,edge,greater);
 }
 return {outside:out,removed:inside.length>=3?triangulate(inside).length:0};
}
function vertex(x,y,z,u,v,normal){
 return {p:[x,y,z],uv:[u,v],n:[...normal]};
}
function panel(a,b,c,d){
 return [[a,b,c],[a,c,d]];
}
function newDoorPanels(axis){
 const result=[];
 const doors=[[-.825,.006],[.006,.824]];
 for(const side of [-1,1]){
  for(const [x0,x1] of doors){
   // Flush skin slopes slightly with the original lower-door contour.
   const z0=axis+side*1.125,z1=axis+side*1.102;
   const n=[0,0,side],baseU=x0<0?.607:.647;
   const vertices=[
    vertex(x0,.758,z0,baseU,.868,n),
    vertex(x1,.758,z0,baseU+.042,.868,n),
    vertex(x1,1.272,z1,baseU+.042,.933,n),
    vertex(x0,1.272,z1,baseU,.933,n)
   ];
   result.push(...(side===1?
    panel(vertices[0],vertices[1],vertices[2],vertices[3]):
    panel(vertices[0],vertices[3],vertices[2],vertices[1])));
  }
 }
 return result;
}
function rearFill(axis){
 const out=[];
 const n=[1,0,0],u=.644,v=.898;
 const V=(x,y,z)=>vertex(x,y,axis+z,u+(z+1)*.023,v+(y-.7)*.039,n);
 // Backing surfaces sit just INBOARD of the original rear fascia. Exterior
 // tail lamps and original seams remain visible; gaps show matching bodywork.
 out.push(...panel(
  V(2.105,.704,-.905),V(2.105,.704,.905),
  V(2.117,1.293,.905),V(2.117,1.293,-.905)
 ));
 // Sloping upper rear deck: stops voids appearing between roof and tailgate.
 out.push(...panel(
  V(2.112,1.28,-.915),V(2.112,1.28,.915),
  V(1.505,1.683,.902),V(1.505,1.683,-.902)
 ));
 // Tapered side returns: close the corners where roof and back meet the sides.
 for(const sign of [-1,1]){
  const z=sign;
  out.push(...panel(
   V(2.105,.738,z*.905),V(1.926,.738,z*.986),
   V(1.565,1.638,z*.911),V(2.105,1.289,z*.905)
  ));
 }
 return out;
}
function isMirror(face,axis){
 const c=center(face),z=Math.abs(c[2]-axis);
 if(c[0]<-1.22||c[0]>-.88||c[1]<1.13||c[1]>1.52||z<1.076)return false;
 const uv=face.reduce((sum,v)=>sum+v.uv[0],0)/3;
 // The dark mirror arm and housing use the black/grey atlas section;
 // surrounding green windshield pillars remain untouched.
 return z>1.198||(z>1.08&&uv>.267&&uv<.495);
}
export function cleanSelectedD31(triangles,axis){
 const doorMinX=-.825,doorMaxX=.824,doorBottom=.758,doorTop=1.272;
 const result=[];let mirrors=0,cutFaces=0,trimmed=0;
 for(const face of triangles){
  if(isMirror(face,axis)){mirrors++;continue;}
  const c=center(face),z=Math.abs(c[2]-axis);
  // Target the raised outer door skin only, never interior cabin structures.
  const outer=z>1.065 &&
   face.some(v=>Math.abs(v.p[2]-axis)>1.074);
  const overlaps=face.some(v=>v.p[0]>doorMinX&&v.p[0]<doorMaxX&&
   v.p[1]>doorBottom&&v.p[1]<doorTop);
  const roofOrWindow=c[1]>1.40;
  if(outer&&overlaps&&!roofOrWindow &&
    face.every(v=>Math.sign(v.p[2]-axis)===Math.sign(c[2]-axis))){
   const split=removeRectPart(face,doorMinX,doorMaxX,doorBottom,doorTop);
   cutFaces+=split.removed;
   result.push(...split.outside);trimmed++;
  }else result.push(face);
 }
 const doors=newDoorPanels(axis);
 const back=rearFill(axis);
 result.push(...doors,...back);
 return {triangles:result,stats:{
  mirrorsRemoved:mirrors,doorFacesCut:cutFaces,doorTrianglesAdded:doors.length,
  rearTrianglesAdded:back.length,doorSourceTouched:trimmed
 }};
}
