// Retall selectiu de peces independents anotades al Model 2 BTR-82.
// No es decideix per material: cada GLB barreja peces i carrosseria sota
// hull_material_0/1 i turret_material_3. Es busquen components connectats
// de mida reduïda al voltant de les coordenades marcades per l'usuari.

export const BTR82_DELETE_MARKS=Object.freeze({
 hull_material_0:[
  [1.585,1.665,-3.063],[1.427,1.660,-3.063],[1.485,1.699,-3.063],
  [1.491,1.705,-3.063],[1.420,1.624,-2.937],[1.509,1.697,-2.937],
  [1.577,1.585,-2.937],[1.522,1.531,-3.063],
  [-1.682,1.278,-3.300],[-1.720,1.227,-3.300]
 ],
 hull_material_1:[
  [-1.364,1.760,-3.063],[-1.459,1.710,-3.063],
  [-1.371,1.766,-2.937],[-1.446,1.632,-2.937],
  [-1.431,1.622,-2.937],[-1.295,1.690,-2.937],
  [-1.296,1.687,-2.937],[-1.397,1.603,-3.063],
  [-1.322,1.621,-3.063],[-1.439,1.621,-3.063],
  [-1.441,1.741,-3.063],[-1.406,1.763,-2.937]
 ],
 hull_material_2:[[-1.008,2.060,-0.244]],
 turret_material_3:[
  [0.258,2.715,-1.137],[0.162,2.667,-1.166],
  [0.134,2.545,-1.041],[0.243,2.625,-0.992],
  [0.580,2.720,-0.884],[0.601,2.777,-0.702],
  [0.607,2.666,-0.607],[0.597,2.647,-0.678],
  [0.450,2.723,-0.787],[0.517,2.804,-0.924],
  [0.450,2.787,-0.601],[0.575,2.820,-0.814],
  [-0.476,2.741,-1.122],[-0.378,2.724,-0.933],
  [-0.358,2.660,-1.171],[-0.373,2.716,-0.938],
  [-0.482,2.738,-1.124],[-0.331,2.349,-1.310]
 ],
 turret_material_2:[
  [-0.049,2.871,-1.019],[-0.450,2.333,-1.311]
 ]
});

const RULES={
 hull_material_0:{search:.19,maxTriangles:24,maxSpan:[.48,.43,.30],
  valid:(p)=>p[2]<-2.85&&p[2]>-3.45&&
   (p[0]>1.30&&p[1]>1.40||p[0]<-1.56&&p[1]>1.12&&p[1]<1.48)},
 hull_material_1:{search:.19,maxTriangles:48,maxSpan:[.48,.44,.32],
  valid:(p)=>p[0]<-1.20&&p[0]>-1.70&&p[1]>1.50&&p[1]<1.89&&p[2]<-2.82&&p[2]>-3.20},
 hull_material_2:{search:.13,maxTriangles:5,maxSpan:[.35,.22,.42],
  valid:(p)=>p[0]<-.80&&p[0]>-1.25&&p[1]>1.95&&p[1]<2.15&&p[2]>-.55&&p[2]<-.03},
 turret_material_3:{search:.16,maxTriangles:55,maxSpan:[.43,.49,.53],
  valid:(p)=>p[1]>2.27&&p[1]<2.98&&p[2]>-1.46&&p[2]<-.38&&Math.abs(p[0])<.76},
 turret_material_2:{search:.17,maxTriangles:7,maxSpan:[.40,.25,.38],
  valid:(p)=>p[1]>2.24&&p[1]<3.02&&p[2]>-1.53&&p[2]<-.85}
};
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const vertexKey=(v)=>v.map(x=>Math.round(x*1e4)).join(',');

function connectedPatches(geo){
 const pos=geo.getAttribute('position'),idx=geo.getIndex();
 if(!pos||!idx)return null;
 const parent=new Int32Array(pos.count);
 for(let i=0;i<parent.length;i++)parent[i]=i;
 function root(i){
  while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}
  return i;
 }
 function join(a,b){
  a=root(a);b=root(b);
  if(a!==b)parent[b]=a;
 }
 const keyed=new Map(),v=new Array(pos.count);
 for(let i=0;i<pos.count;i++){
  const p=[pos.getX(i),pos.getY(i),pos.getZ(i)];
  v[i]=p;
  const k=vertexKey(p);
  if(keyed.has(k))join(i,keyed.get(k));else keyed.set(k,i);
 }
 for(let t=0;t<idx.count;t+=3){
  const a=idx.getX(t),b=idx.getX(t+1),c=idx.getX(t+2);
  join(a,b);join(b,c);
 }
 const components=new Map();
 for(let t=0;t<idx.count;t+=3){
  const a=idx.getX(t),b=idx.getX(t+1),c=idx.getX(t+2);
  const id=root(a),entry=components.get(id)||{
   triangles:[],min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity],centroids:[]
  };
  entry.triangles.push(t);
  const pts=[v[a],v[b],v[c]];
  entry.centroids.push([0,1,2].map(k=>(v[a][k]+v[b][k]+v[c][k])/3));
  for(let axis=0;axis<3;axis++){
   entry.min[axis]=Math.min(entry.min[axis],...pts.map(x=>x[axis]));
   entry.max[axis]=Math.max(entry.max[axis],...pts.map(x=>x[axis]));
  }
  components.set(id,entry);
 }
 return [...components.values()];
}

export function removeBtr82AnnotatedDetails(scene){
 const report=[];
 for(const [name,marks] of Object.entries(BTR82_DELETE_MARKS)){
  const mesh=scene.getObjectByName(name);
  if(!mesh?.isMesh||!mesh.geometry?.index)throw Error('No s’ha trobat la malla anotada '+name);
  const geo=mesh.geometry,idx=geo.index,rule=RULES[name];
  const patches=connectedPatches(geo);
  if(!patches)throw Error('Malla no indexada: '+name);
  const removed=new Set();
  let components=0;
  for(const patch of patches){
   const span=patch.max.map((x,k)=>x-patch.min[k]);
   if(patch.triangles.length>rule.maxTriangles||span.some((x,k)=>x>rule.maxSpan[k]))continue;
   const center=patch.min.map((x,k)=>(x+patch.max[k])/2);
   if(!rule.valid(center))continue;
   // No eliminar per una gran caixa rectangular: cal que alguna de les cares
   // del component estigui realment a prop d'una marca de l'editor.
   const near=marks.some(mark=>patch.centroids.some(p=>distance(mark,p)<rule.search));
   if(!near)continue;
   components++;
   for(const t of patch.triangles)removed.add(t);
  }
  if(!removed.size){report.push({mesh:name,components:0,triangles:0});continue}
  const index=[];
  for(let t=0;t<idx.count;t+=3){
   if(removed.has(t))continue;
   index.push(idx.getX(t),idx.getX(t+1),idx.getX(t+2));
  }
  if(!index.length)throw Error('Retall insegur: la malla '+name+' quedaria buida');
  const trimmed=geo.clone();
  trimmed.setIndex(index);
  trimmed.computeBoundingBox();trimmed.computeBoundingSphere();
  trimmed.userData.candidateSimplified=true;
  mesh.geometry=trimmed;
  report.push({mesh:name,components,triangles:removed.size});
 }
 scene.userData.btr82AnnotatedDetailCleanup=report;
 return report;
}
