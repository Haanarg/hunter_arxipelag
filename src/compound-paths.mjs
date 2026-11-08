// One terrain-conforming surface for the whole network: intersections never overlap.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
export function smoothPath(points,width=4){
 const p=points.filter((v,i)=>!i||distance(v,points[i-1])>.01).map(v=>[...v]);if(p.length<3)return p;
 const out=[p[0]];
 for(let i=1;i<p.length-1;i++){
  const a=p[i-1],b=p[i],c=p[i+1],ab=distance(a,b),bc=distance(b,c),cut=Math.min(width*.8,ab*.24,bc*.24),entry=mix(b,a,cut/ab),exit=mix(b,c,cut/bc);
  out.push(entry);const n=Math.max(4,Math.ceil(cut*2));
  for(let k=1;k<=n;k++){const t=k/n;out.push(mix(mix(entry,b,t),mix(b,exit,t),t))}
 }
 out.push(p.at(-1));return out;
}
function projection(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1));return{t,d:distance(p,mix(a,b,t))}}
export function preparePaths(routes){
 const paths=routes.filter(r=>r.points.length>1).map(r=>({...r,points:smoothPath(r.points,r.width),feather:Math.max(1.5,r.width*.3)}));
 for(const r of paths){
  const connected=p=>paths.some(other=>other!==r&&other.points.slice(1).some((b,i)=>projection(p,other.points[i],b).d<=other.width*.5+.5));
  const closed=distance(r.points[0],r.points.at(-1))<.01;r.fadeStart=!closed&&!connected(r.points[0]);r.fadeEnd=!closed&&!connected(r.points.at(-1));r.length=0;r.segments=[];
  for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],length=distance(a,b);if(length<.001)continue;r.segments.push({a,b,length,start:r.length,path:r});r.length+=length;}
 }
 return paths;
}
export function createPathNetwork(T,options){const steps=createPathNetworkSteps(T,options);let next;while(!(next=steps.next()).done){}return next.value}
export function* createPathNetworkSteps(T,{routes,heightAt=()=>0,heightVersion=()=>0,step=1.5,parent=null,chunkCells=128,heightRevision=null,measure=()=>false}){
 const paths=preparePaths(routes),group=new T.Group();group.name='compound-path-network';if(parent)parent.add(group);
 const roadRenderStats={fastSkips:0,versionChecks:0,refits:0,versionCpuMs:0,refitCpuMs:0};
 group.userData.pathRenderStats=roadRenderStats;
 const bucketSize=24,buckets=new Map(),cells=new Set(),key=(x,z)=>x+','+z;
 for(const path of paths){path.rgb=new T.Color(path.color??0x8a795e);
  let processed=0;
  for(const s of path.segments){if(processed++%8===0)yield {stage:'Traçant camins',completed:processed-1,total:path.segments.length,unit:'trams'};const reach=path.width*.5+path.feather+step*2,minX=Math.min(s.a[0],s.b[0])-reach,maxX=Math.max(s.a[0],s.b[0])+reach,minZ=Math.min(s.a[1],s.b[1])-reach,maxZ=Math.max(s.a[1],s.b[1])+reach;
   for(let x=Math.floor(minX/bucketSize);x<=Math.floor(maxX/bucketSize);x++)for(let z=Math.floor(minZ/bucketSize);z<=Math.floor(maxZ/bucketSize);z++){const k=key(x,z);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(s)}
   // Long diagonal roads are rasterised locally, without filling their entire bounding rectangle.
   const n=Math.max(1,Math.ceil(s.length/step));for(let i=0;i<=n;i++){const p=mix(s.a,s.b,i/n),cx=Math.floor(p[0]/step),cz=Math.floor(p[1]/step),r=Math.ceil(reach/step);for(let x=cx-r;x<=cx+r;x++)for(let z=cz-r;z<=cz+r;z++)cells.add(key(x,z))}
  }
 }
 const cache=new Map();
 const sample=(ix,iz)=>{const k=key(ix,iz);if(cache.has(k))return cache.get(k);const x=ix*step,z=iz*step;let alpha=0,rgb=new T.Color(0x8a795e);
  const nearest=new Map();
  for(const s of buckets.get(key(Math.floor(x/bucketSize),Math.floor(z/bucketSize)))||[]){const q=projection([x,z],s.a,s.b),old=nearest.get(s.path);if(!old||q.d<old.d)nearest.set(s.path,{d:q.d,along:s.start+q.t*s.length})}
  for(const [r,q] of nearest){const edge=1-smooth((q.d-r.width*.5)/r.feather),fade=Math.min(r.fadeStart?smooth(q.along/(r.width*1.5)):1,r.fadeEnd?smooth((r.length-q.along)/(r.width*1.5)):1),a=edge*fade;
   if(a>alpha){alpha=a;rgb=r.rgb}
  }
  const v={x,z,alpha,r:rgb.r,g:rgb.g,b:rgb.b};cache.set(k,v);return v;
 };
 // Sectors més grans: menys draw calls i exactament els mateixos triangles.
 // chunkCells opcional manté les proves de la versió anterior reproduïbles.
 const chunks=new Map(),heightCacheStats={samples:0,reuses:0};
 let processedCells=0;
 for(const cell of cells){if(processedCells++%128===0)yield {stage:'Ajustant camins al terreny',completed:processedCells-1,total:cells.size,unit:'cel·les'};const [x,z]=cell.split(',').map(Number),vs=[sample(x,z),sample(x,z+1),sample(x+1,z),sample(x+1,z+1)];if(vs.every(v=>v.alpha<.001))continue;
  const k=key(Math.floor(x/chunkCells),Math.floor(z/chunkCells));if(!chunks.has(k))chunks.set(k,{positions:[],colors:[]});const out=chunks.get(k);
  for(const j of[0,1,2,2,1,3]){
   const v=vs[j];
   // One height query per unique grid vertex, not one per triangle corner.
   // The terrain is unchanged during initial road rasterisation; later LOD
   // changes still trigger the existing per-mesh onBeforeRender refit.
   if(v.roadHeight===undefined){
    v.roadHeight=heightAt(v.x,v.z)+.12;
    heightCacheStats.samples++;
   }else heightCacheStats.reuses++;
   out.positions.push(v.x,v.roadHeight,v.z);
   out.colors.push(v.r,v.g,v.b,v.alpha);
  }
 }
 yield {stage:'Preparant els materials dels camins',completed:cells.size,total:cells.size,unit:'cel·les'};
 const material=new T.MeshStandardMaterial({vertexColors:true,transparent:true,depthWrite:false,roughness:1,metalness:0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 let processedChunks=0;
 for(const data of chunks.values()){
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(data.colors,4));geo.computeVertexNormals();geo.computeBoundingSphere();geo.boundingSphere.radius+=40;
  const mesh=new T.Mesh(geo,material);mesh.receiveShadow=true;mesh.renderOrder=1;geo.computeBoundingBox();const bounds=geo.boundingBox;
  // Detectam canvis de LOD del terreny també a l'interior de les
  // agrupacions grosses: mostres com a màxim cada 32 metres.
  const axis=(min,max)=>{
    const sites=[min];for(let x=min+32;x<max;x+=32)sites.push(x);
    if(max>min)sites.push(max);return sites;
  };
  const revisionSites=[];
  for(const x of axis(bounds.min.x,bounds.max.x))
    for(const z of axis(bounds.min.z,bounds.max.z))revisionSites.push([x,z]);
  const version=()=>revisionSites.map(([x,z])=>heightVersion(x,z)).join(',');
  let revision=version(),lastSurfaceRevision=heightRevision?.();
  mesh.onBeforeRender=()=>{
   // Si no ha canviat cap tile de terreny, no cal consultar ni una sola
   // versió local ni construir la signatura de la graella de 32 metres.
   const profiling=measure();
   if(heightRevision){
    const currentRevision=heightRevision();
    if(currentRevision===lastSurfaceRevision){
     if(profiling)roadRenderStats.fastSkips++;
     return;
    }
    lastSurfaceRevision=currentRevision;
   }
   const checkStarted=profiling?performance.now():0,next=version();
   if(profiling){
    roadRenderStats.versionChecks++;
    roadRenderStats.versionCpuMs+=performance.now()-checkStarted;
   }
   if(next===revision)return;
   revision=next;
   const refitStarted=profiling?performance.now():0,p=geo.attributes.position;
   for(let i=0;i<p.count;i++)p.setY(i,heightAt(p.getX(i),p.getZ(i))+.12);
   p.needsUpdate=true;geo.computeVertexNormals();
   geo.computeBoundingSphere();geo.boundingSphere.radius+=40;
   if(profiling){
    roadRenderStats.refits++;
    roadRenderStats.refitCpuMs+=performance.now()-refitStarted;
   }
  };group.add(mesh);
  yield {stage:'Malles dels camins',completed:++processedChunks,total:chunks.size,unit:'sectors'};
 }
 if(!chunks.size)material.dispose();
 group.userData.pathStats={routes:paths.length,chunks:chunks.size,chunkCells,triangles:[...chunks.values()].reduce((n,c)=>n+c.positions.length/9,0),heightSamples:heightCacheStats.samples,heightReuses:heightCacheStats.reuses};
 return group;
}
