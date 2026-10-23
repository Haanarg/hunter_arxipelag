// Hunter: Arxipèlag — derive symmetrical LOD previews from the real Humvee D mesh.
// Pure geometry utilities. Input: triangles of [{p:[x,y,z],uv:[u,v],n:[x,y,z]}, ...].
const EPS=1e-8;
function interpolate(a,b,t){
 return {p:a.p.map((v,i)=>v+(b.p[i]-v)*t),
  uv:a.uv.map((v,i)=>v+(b.uv[i]-v)*t),
  n:a.n.map((v,i)=>v+(b.n[i]-v)*t)};
}
function area(tri){
 const [a,b,c]=tri.map(v=>v.p);
 const u=a.map((v,i)=>b[i]-v),v=a.map((x,i)=>c[i]-x);
 return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])*.5;
}
export function positiveHalf(triangles,centerZ){
 const result=[];
 for(const triangle of triangles){
  const input=triangle.map(v=>({p:[v.p[0],v.p[1],v.p[2]-centerZ],uv:[...v.uv],n:[...v.n]}));
  const polygon=[];
  for(let i=0;i<3;i++){
   const a=input[(i+2)%3],b=input[i],insideA=a.p[2]>=-EPS,insideB=b.p[2]>=-EPS;
   if(insideA!==insideB){
    const t=Math.max(0,Math.min(1,-a.p[2]/(b.p[2]-a.p[2])));
    const cross=interpolate(a,b,t);cross.p[2]=0;polygon.push(cross);
   }
   if(insideB){const kept={...b,p:[...b.p]};if(Math.abs(kept.p[2])<EPS)kept.p[2]=0;polygon.push(kept);}
  }
  for(let j=1;j<polygon.length-1;j++){
   const tri=[polygon[0],polygon[j],polygon[j+1]];
   if(area(tri)>1e-9)result.push(tri);
  }
 }
 return result;
}
function clusterHalf(triangles,pitch,uvCells){
 const map=new Map(),verts=[],weights=[],indices=[];
 const keyOf=v=>{
  const p=v.p,uv=v.uv,z=p[2]<EPS?'S':Math.floor(p[2]/pitch);
  return `${Math.floor(p[0]/pitch)}/${Math.floor(p[1]/pitch)}/${z}/${Math.floor(uv[0]*uvCells)}/${Math.floor(uv[1]*uvCells)}`;
 };
 for(const tri of triangles){
  const face=[];
  for(const v of tri){
   const key=keyOf(v);let id=map.get(key);
   if(id===undefined){id=verts.length;map.set(key,id);verts.push({p:[0,0,0],uv:[0,0],n:[0,0,0]});weights.push(0);}
   const dst=verts[id];weights[id]++;
   for(let j=0;j<3;j++){dst.p[j]+=v.p[j];dst.n[j]+=v.n[j];}
   for(let j=0;j<2;j++)dst.uv[j]+=v.uv[j];
   face.push(id);
  }
  indices.push(face);
 }
 for(let i=0;i<verts.length;i++){
  const v=verts[i],count=weights[i];
  for(let j=0;j<3;j++){v.p[j]/=count;v.n[j]/=count;}
  for(let j=0;j<2;j++)v.uv[j]/=count;
  if(v.p[2]<EPS)v.p[2]=0;
  const norm=Math.hypot(...v.n)||1;v.n=v.n.map(x=>x/norm);
 }
 const faces=[],seen=new Set();
 for(const face of indices){
  if(new Set(face).size<3)continue;
  const key=[...face].sort((a,b)=>a-b).join('/');
  if(seen.has(key))continue;seen.add(key);
  const tri=face.map(i=>verts[i]);if(area(tri)>1e-9)faces.push(tri);
 }
 return faces;
}
function countMirrored(half){
 let n=0;for(const tri of half)n+=tri.every(v=>v.p[2]<EPS)?1:2;
 return n;
}
function mirror(half,centerZ){
 const all=[];
 for(const tri of half){
  all.push(tri.map(v=>({...v,p:[v.p[0],v.p[1],v.p[2]+centerZ]})));
  if(tri.every(v=>v.p[2]<EPS))continue;
  // Reflection reverses winding: flip the triangle order and the Z normal.
  all.push([tri[0],tri[2],tri[1]].map(v=>({...v,
   p:[v.p[0],v.p[1],centerZ-v.p[2]],n:[v.n[0],v.n[1],-v.n[2]]})));
 }
 return all;
}
function reduce(half,target,maxFaces){
 let lo=.0001,hi=.85,best=null,bestError=Infinity;
 for(let i=0;i<21;i++){
  const pitch=(lo+hi)*.5;
  const candidate=clusterHalf(half,pitch,16);
  const faces=countMirrored(candidate);
  if(faces<=maxFaces&&Math.abs(faces-target)<bestError){
   best=candidate;bestError=Math.abs(faces-target);
  }
  if(faces>target)lo=pitch;else hi=pitch;
 }
 // Preserve UV islands where possible; relax buckets only as a fallback.
 if(!best){
  for(const cells of [8,4,2,1]){
   for(const pitch of [.06,.10,.16,.24,.36,.50,.72]){
    const candidate=clusterHalf(half,pitch,cells),faces=countMirrored(candidate);
    if(faces<=maxFaces&&Math.abs(faces-target)<bestError){
     best=candidate;bestError=Math.abs(faces-target);
    }
   }
   if(best)break;
  }
 }
 if(!best)throw Error('Triangle budget not reachable without damaging UV seams');
 return best;
}
export function deriveSymmetricD3(triangles,centerZ,limits=[2200,1900,1600,1300]){
 const half=positiveHalf(triangles,centerZ);
 const output=[];let upperBudget=Infinity;
 for(const requested of limits){
  const budget=Math.min(requested,upperBudget-1);
  const reduced=reduce(half,budget,budget);
  const triangles=mirror(reduced,centerZ);
  if(triangles.length>=upperBudget)throw Error('LOD triangle count must decrease');
  output.push({triangles,faces:triangles.length});
  upperBudget=triangles.length;
 }
 return output;
}
