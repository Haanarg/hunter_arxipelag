import * as THREE from '../vendor/three-r186.module.mjs';

// Identifica contorns de vores lliures. Repara NOMÉS llaços simples tancats
// i prou plans a prop de la posició del pinzell: res de plans ficticis.
const vkey=p=>p.map(x=>Math.round(x*10000)).join(',');
const boundaryCache=new WeakMap();
function boundaries(mesh){
 const g=mesh.geometry,pos=g?.getAttribute('position'),idx=g?.index;
 if(!pos||!idx)return [];
 const cached=boundaryCache.get(g);
 if(cached)return cached;
 const point=i=>[pos.getX(i),pos.getY(i),pos.getZ(i)];
 const vertices=new Map(),edges=new Map();
 for(let t=0;t<idx.count;t+=3){
  const tri=[idx.getX(t),idx.getX(t+1),idx.getX(t+2)];
  for(let k=0;k<3;k++){
   const ia=tri[k],ib=tri[(k+1)%3],pa=point(ia),pb=point(ib);
   const a=vkey(pa),b=vkey(pb);
   if(a===b)continue;
   vertices.set(a,{i:ia,p:pa});vertices.set(b,{i:ib,p:pb});
   const id=a<b?a+'|'+b:b+'|'+a;
   const e=edges.get(id)||{a,b,count:0};e.count++;edges.set(id,e);
  }
 }
 const neighbors=new Map();
 for(const e of edges.values()){
  if(e.count!==1)continue;
  for(const [a,b] of [[e.a,e.b],[e.b,e.a]]){
   if(!neighbors.has(a))neighbors.set(a,[]);
   neighbors.get(a).push(b);
  }
 }
 const loops=[],seen=new Set();
 for(const [key,adj] of neighbors){
  if(adj.length!==2||seen.has(key))continue;
  const path=[],local=new Set();let current=key,previous=null,closed=false;
  for(let n=0;n<512;n++){
   if(local.has(current)){closed=current===key;break}
   const nexts=neighbors.get(current);
   if(!nexts||nexts.length!==2)break;
   local.add(current);path.push(vertices.get(current));
   const next=nexts.find(k=>k!==previous);
   previous=current;current=next;
  }
  for(const k of local)seen.add(k);
  if(closed&&path.length>=3&&path.length<=256)loops.push(path);
 }
 boundaryCache.set(g,loops);
 return loops;
}
const distance=(a,b)=>a.distanceTo(b);
export function getHoleBrushTarget(mesh,worldPoint,maxRadius,options={}){
 if(!mesh?.isMesh||!mesh.geometry?.index)return null;
 mesh.updateWorldMatrix(true,false);
 const hit=mesh.worldToLocal(worldPoint.clone()),loops=boundaries(mesh);
 const localScale=mesh.getWorldScale(new THREE.Vector3());
 const scale=Math.max(.0001,(Math.abs(localScale.x)+Math.abs(localScale.y)+Math.abs(localScale.z))/3);
 const radius=maxRadius/scale;
 const large=options.large===true;
 let best=null;
 for(const path of loops){
  const pts=path.map(v=>new THREE.Vector3(...v.p)),center=pts.reduce((v,p)=>v.add(p),new THREE.Vector3()).divideScalar(pts.length);
  // Distància a una ARESTA (no només a vèrtexs): fonamental en panells grans.
  let nearest=Infinity;
  for(let i=0;i<pts.length;i++){
   const a=pts[i],b=pts[(i+1)%pts.length],ab=b.clone().sub(a);
   const t=THREE.MathUtils.clamp(hit.clone().sub(a).dot(ab)/Math.max(1e-10,ab.lengthSq()),0,1);
   nearest=Math.min(nearest,hit.distanceTo(a.clone().addScaledVector(ab,t)));
  }
  if(nearest>Math.max(.11,radius*.85))continue;
  let span=0,perimeter=0;
  for(let i=0;i<pts.length;i++){
   span=Math.max(span,distance(center,pts[i]));
   perimeter+=distance(pts[i],pts[(i+1)%pts.length]);
  }
  const maxSpan=large?Math.min(4.0,Math.max(.3,radius*2.5)):Math.min(1.15,Math.max(.25,radius*1.55));
  if(span>maxSpan||perimeter>(large?24:7.5))continue;
  const normal=new THREE.Vector3();
  for(let i=0;i<pts.length;i++){
   const a=pts[i],b=pts[(i+1)%pts.length];
   normal.x+=(a.y-b.y)*(a.z+b.z);
   normal.y+=(a.z-b.z)*(a.x+b.x);
   normal.z+=(a.x-b.x)*(a.y+b.y);
  }
  if(normal.lengthSq()<1e-6)continue;
  normal.normalize();
  const maxPlanar=Math.max(...pts.map(p=>Math.abs(p.clone().sub(center).dot(normal))));
  if(maxPlanar>(large?.20:.065))continue;
  // Dues dimensions derivades del pla de la vora real.
  const u=new THREE.Vector3().crossVectors(normal,new THREE.Vector3(0,1,0));
  if(u.lengthSq()<.01)u.crossVectors(normal,new THREE.Vector3(1,0,0));
  u.normalize();
  const v=new THREE.Vector3().crossVectors(normal,u).normalize();
  const planar=pts.map(p=>new THREE.Vector2(p.clone().sub(center).dot(u),p.clone().sub(center).dot(v)));
  const triangles=THREE.ShapeUtils.triangulateShape(planar,[]);
  if(triangles.length!==pts.length-2)continue;
  const area=triangles.reduce((sum,[a,b,c])=>sum+Math.abs(
   (planar[b].x-planar[a].x)*(planar[c].y-planar[a].y)-
   (planar[c].x-planar[a].x)*(planar[b].y-planar[a].y))*.5,0);
  if(area<.0005||area>(large?12:2))continue;
  // Una obertura gran no s'ha de cobrir en mode automàtic petit.
  if(!large&&span>1.15)continue;
  // No fer créixer peces si el punter és lluny del pla real.
  if(Math.abs(hit.clone().sub(center).dot(normal))>Math.max(large?.38:.22,radius))continue;
  const score=nearest+maxPlanar*2;
  if(!best||score<best.score)best={mesh,path,center,normal,triangles,score,points:pts,area,span,large};
 }
 return best;
}
export function closeHoleUnderBrush(target){
 if(!target?.mesh?.geometry?.index)return null;
 const mesh=target.mesh,original=mesh.geometry,pos=original.getAttribute('position');
 const positions=Array.from(pos.array),indices=[];
 for(let i=0;i<original.index.count;i++)indices.push(original.index.getX(i));
 // Geometry indexed: vèrtexs nous propis per no corrompre normals de les cares.
 const offset=pos.count;
 for(const p of target.points)positions.push(p.x,p.y,p.z);
 for(const [a,b,c] of target.triangles){
  indices.push(offset+a,offset+b,offset+c);
  // Una sola cara per no anul·lar les normals sumant cares inverses.
 }
 const geo=original.clone();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 // No crear un índex amb UV/normal de llargada incorrecta.
 for(const name of Object.keys(geo.attributes)){
  if(name==='position')continue;
  const old=geo.getAttribute(name),values=Array.from(old.array);
  for(const v of target.path){
   for(let i=0;i<old.itemSize;i++)values.push(old.array[v.i*old.itemSize+i]);
  }
  geo.setAttribute(name,new THREE.Float32BufferAttribute(values,old.itemSize));
 }
 geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();
 geo.userData.candidateSimplified=true;
 const previousMaterial=mesh.material;
 // Doble cara al material reparat (no duplica triangles ni corromp normals).
 const repairedMaterial=Array.isArray(previousMaterial)
  ?previousMaterial.map(m=>{const copy=m.clone();copy.side=THREE.DoubleSide;return copy})
  :previousMaterial.clone();
 if(!Array.isArray(repairedMaterial))repairedMaterial.side=THREE.DoubleSide;
 mesh.material=repairedMaterial;
 mesh.geometry=geo;
 return {mesh,previous:original,current:geo,previousMaterial,repairedMaterial,triangles:target.triangles.length,vertices:target.points.length};
}
