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
function reversedPanel(a,b,c,d){
 return panel(a,d,c,b);
}
// Original Humvee GLB atlas: the large olive/khaki body panels of BOTH
// lower doors use the flat main-body swatch (U < .25, V > .75).
// Prior hard-coded UVs (.607–.689) sampled a different palette swatch,
// giving noticeably pale/white-looking replacement panels.
export const D31_DOOR_SKIN_UV=Object.freeze({
 body:Object.freeze([.126,.885]),
 seam:Object.freeze([.375,.885])
});
function newDoorPanels(axis){
 const result=[];
 const bottom=.758,top=1.272;
 const minX=-.825,maxX=.824;
 // A narrow flush door shut-line is essential: previously the two quads
 // met without a visible joint and looked like ONE large unbroken panel.
 const center=-.001,halfSeam=.009;
 const ranges=[
  [minX,center-halfSeam,'front'],
  [center+halfSeam,maxX,'rear']
 ];
 for(const side of [-1,1]){
  const n=[0,0,side];
  const z0=axis+side*1.125,z1=axis+side*1.102;
  const pushQuad=(x0,x1,uv)=>{
   // All four corners sample the SAME flat swatch in the source atlas.
   // Therefore these faces render identically to the original door paint
   // and cannot interpolate across the white/pale atlas region.
   const [u,v]=uv;
   const p=[
    vertex(x0,bottom,z0,u,v,n),
    vertex(x1,bottom,z0,u,v,n),
    vertex(x1,top,z1,u,v,n),
    vertex(x0,top,z1,u,v,n)
   ];
   result.push(...(side===1?panel(...p):reversedPanel(...p)));
  };
  for(const [x0,x1] of ranges)pushQuad(x0,x1,D31_DOOR_SKIN_UV.body);
  // Slim recessed-looking dark seam occupies the actual join. It is
  // geometry IN the body surface, not an added armour/cover panel.
  pushQuad(center-halfSeam,center+halfSeam,D31_DOOR_SKIN_UV.seam);
 }
 return result;
}
function rearFill(axis){
 const out=[];
 const n=[1,0,0],u=D31_DOOR_SKIN_UV.body[0],v=D31_DOOR_SKIN_UV.body[1];
 const V=(x,y,z)=>vertex(x,y,axis+z,u,v,n);
 // Backing surfaces sit just INBOARD of the original rear fascia. Exterior
 // tail lamps and original seams remain visible; gaps show matching bodywork.
 out.push(...reversedPanel(
  V(2.105,.704,-.905),V(2.105,.704,.905),
  V(2.117,1.293,.905),V(2.117,1.293,-.905)
 ));
 // Sloping upper rear deck: stops voids appearing between roof and tailgate.
 out.push(...reversedPanel(
  V(2.112,1.28,-.915),V(2.112,1.28,.915),
  V(1.505,1.683,.902),V(1.505,1.683,-.902)
 ));
 // Tapered side returns: close the corners where roof and back meet the sides.
 for(const sign of [-1,1]){
  const z=sign;
  const points=[
   V(2.105,.738,z*.905),V(1.926,.738,z*.986),
   V(1.565,1.638,z*.911),V(2.105,1.289,z*.905)
  ];
  out.push(...(sign>0?reversedPanel(...points):panel(...points)));
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
  const minX=Math.min(...face.map(v=>v.p[0]));
  const maxX=Math.max(...face.map(v=>v.p[0]));
  const minY=Math.min(...face.map(v=>v.p[1]));
  const maxY=Math.max(...face.map(v=>v.p[1]));
  const overlaps=maxX>doorMinX&&minX<doorMaxX&&maxY>doorBottom&&minY<doorTop;
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
