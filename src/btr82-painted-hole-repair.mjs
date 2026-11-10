// Correccions guiades per les anotacions "TAPAR FORAT" de l'editor.
// IMPORTANT: punts del pinzell sobre un pla virtual NO SON vertices reals.
// Tanquem sols petites esquerdes entre vores lliures verifiques de la malla;
// les traçades que no donin dues vores compatibles s'informen com a pendents.
export const BTR82_PAINTED_HOLES=Object.freeze([
 {id:2,mesh:'hull_material_1',radius:.40,points:[[-.374,1.972,5.209],[-.431,1.973,5.162],[-.474,1.972,5.191]]},
 {id:3,mesh:'hull_material_0',radius:.40,points:[[-.552,1.960,4.613]]},
 {id:4,mesh:'hull_material_0',radius:.40,points:[[-1.266,1.960,4.602],[-1.119,1.952,5.036],[-.885,1.945,5.381],[-.645,1.942,5.557],[-.386,1.941,5.615]]},
 {id:5,mesh:'hull_material_0',radius:.40,points:[[-.715,1.468,5.768],[-.440,1.461,5.774],[-.206,1.453,5.780],[.034,1.454,5.779],[.308,1.468,5.768]]},
 {id:6,mesh:'hull_material_0',radius:.40,points:[[.822,.347,5.461],[.643,.373,5.468],[.415,.493,5.504],[.196,.568,5.526],[-.027,.573,5.527]]},
 {id:7,mesh:'hull_material_0',radius:.40,points:[[1.180,.614,5.539]]},
 {id:8,mesh:'hull_material_0',radius:.40,points:[[-.852,2.058,.415],[-.802,2.064,.186],[-.802,2.062,-.110],[-.840,2.061,.688]]},
 {id:9,mesh:'hull_material_0',radius:.40,points:[[.809,2.062,.490],[.804,2.061,.211],[.822,2.059,-.085],[.733,2.060,-.662]]},
 {id:10,mesh:'hull_material_0',radius:.10,points:[[-.862,2.052,-.560],[-.795,2.060,-.828],[-.709,2.073,-.500]]},
 {id:11,mesh:'hull_material_0',radius:.10,points:[[-1.042,.340,-3.753]]},
 {id:12,mesh:'hull_material_0',radius:.10,points:[[-1.370,.589,-3.822],[-1.395,.635,-4.019],[-1.349,.674,-4.192],[-1.277,.631,-4.005]]},
 {id:13,mesh:'hull_material_0',radius:.10,points:[[-.719,2.061,-.977],[-.719,2.171,-.116],[-.719,2.282,.201],[-.719,2.425,1.133],[-.719,2.422,1.392]]},
 {id:14,mesh:'hull_material_0',radius:.10,points:[[.702,2.063,1.041],[.123,2.063,1.063],[-.414,2.063,.982],[-.661,2.063,1.019],[.923,2.063,.896],[.966,2.063,.456],[.819,2.063,-.588],[.755,2.063,-1.552],[.645,2.063,-.458]]},
 {id:15,mesh:'hull_material_0',radius:.10,points:[[-.633,2.063,-.056],[-.713,2.063,-.468],[-.783,2.063,-1.029]]}
 ,
 // Fitxer «Text enganxat(6)» — dues traçades noves. Waypoints del pinzell
 // (altres punts intermedis queden dins dels segments consecutius).
 {id:105,mesh:'hull_material_0',radius:.10,points:[
  [-.779,2.056,1.070],[-.701,2.059,1.059],[-.544,2.058,1.063],
  [-.387,2.057,1.068],[-.229,2.060,1.052],[-.059,2.062,1.043],
  [.100,2.065,1.034],[.259,2.064,1.038],[.417,2.061,1.049],
  [.575,2.060,1.054],[.734,2.059,1.058],[.891,2.055,1.076],[1.056,2.053,1.081]
 ]},
 {id:106,mesh:'hull_material_0',radius:.10,points:[
  [-.646,.430,5.485],[-.427,.467,5.496],[-.193,.459,5.494],
  [.026,.434,5.486],[.251,.373,5.468],[.495,.300,5.447],
  [.729,.255,5.433],[.877,.259,5.435],[.702,.376,5.469],
  [.462,.420,5.482],[.650,.519,5.511],[.794,.531,5.515],
  [.568,.487,5.502],[.334,.477,5.499],[.104,.578,5.529],
  [-.128,.724,5.572],[.185,.762,5.583],[.315,.605,5.537],
  [.603,.537,5.517],[.891,.537,5.517],[.622,.620,5.541],
  [.331,.654,5.551],[.056,.765,5.584],[-.143,.708,5.567],
  [-.018,.445,5.489],[.210,.401,5.477],[.437,.403,5.477],
  [.657,.313,5.451],[.745,.196,5.416],[.763,.319,5.452],
  [.813,.598,5.535],[.580,.679,5.558],[.363,.693,5.563],
  [.089,.811,5.597],[-.164,.741,5.577],[-.139,.475,5.498],
  [.115,.323,5.453],[.344,.333,5.457],[.570,.288,5.443]
 ]}]);

const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)};
const key=a=>a.map(x=>Math.round(x*10000)).join(',');
const midway=(a,b)=>a.map((v,i)=>(v+b[i])/2);
function pointToTrack(p,track){
 let d=Infinity;
 for(let i=0;i<track.length;i++){
  d=Math.min(d,dist(p,track[i]));
  if(i===0)continue;
  const a=track[i-1],b=track[i],v=sub(b,a),w=sub(p,a);
  const len=dot(v,v);
  const t=len?Math.max(0,Math.min(1,dot(w,v)/len)):0;
  d=Math.min(d,dist(p,a.map((x,k)=>x+v[k]*t)));
 }
 return d;
}
function boundaryEdges(geo){
 const pos=geo.getAttribute('position'),idx=geo.index;
 const coord=i=>[pos.getX(i),pos.getY(i),pos.getZ(i)];
 const edges=new Map();
 for(let t=0;t<idx.count;t+=3){
  const tri=[idx.getX(t),idx.getX(t+1),idx.getX(t+2)];
  for(let i=0;i<3;i++){
   const a=tri[i],b=tri[(i+1)%3],c=tri[(i+2)%3];
   const pa=coord(a),pb=coord(b),pc=coord(c),ka=key(pa),kb=key(pb);
   if(ka===kb)continue;
   const k=ka<kb?ka+'|'+kb:kb+'|'+ka;
   const existing=edges.get(k);
   if(existing){existing.count++;continue}
   edges.set(k,{a,b,pa,pb,mid:midway(pa,pb),normal:norm(cross(sub(pb,pa),sub(pc,pa))),len:dist(pa,pb),count:1});
  }
 }
 return [...edges.values()].filter(e=>e.count===1&&e.len>.03&&e.len<.60);
}
function stitchGeometry(mesh,strokes){
 const geometry=mesh.geometry;
 if(!geometry?.index)return strokes.map(s=>({id:s.id,bridges:0,reason:'no indexada'}));
 const edges=boundaryEdges(geometry);
 const matches=[],used=new Set(),byStroke=new Map();
 for(const stroke of strokes){
  const maxDistance=stroke.radius===.10?.18:.27;
  const candidates=edges.filter(e=>pointToTrack(e.mid,stroke.points)<maxDistance);
  const scored=[];
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
   const a=candidates[i],b=candidates[j];
   if(a===b||[a.a,a.b].includes(b.a)||[a.a,a.b].includes(b.b))continue;
   const midpointDistance=dist(a.mid,b.mid);
   if(midpointDistance<.035||midpointDistance>.24)continue;
   if(dot(a.normal,b.normal)<.72)continue;
   if(Math.abs(a.len-b.len)>.12)continue;
   const direct=dist(a.pa,b.pa)+dist(a.pb,b.pb),reverse=dist(a.pa,b.pb)+dist(a.pb,b.pa);
   const reverseOrder=reverse<direct;
   const q0=reverseOrder?b.pb:b.pa,q1=reverseOrder?b.pa:b.pb;
   const maxGap=Math.max(dist(a.pa,q0),dist(a.pb,q1));
   if(maxGap>.28||maxGap<.025)continue;
   if(pointToTrack(midway(a.mid,b.mid),stroke.points)>maxDistance)continue;
   const p=sub(a.pb,a.pa),q=sub(q0,a.pa),normal=norm(cross(p,q));
   const area=Math.hypot(...cross(p,q))/2+Math.hypot(...cross(sub(q1,a.pb),sub(q0,a.pb)))/2;
   if(area<.0008||area>.032)continue;
   if(Math.abs(dot(normal,a.normal))<.65)continue;
   scored.push({a,b,reverseOrder,score:direct<reverse?direct:reverse,normal});
  }
  scored.sort((a,b)=>a.score-b.score);
  let count=0;
  for(const item of scored){
   if(used.has(item.a)||used.has(item.b)||count>=12)continue;
   used.add(item.a);used.add(item.b);count++;
   matches.push(item);
  }
  byStroke.set(stroke.id,count);
 }
 if(matches.length){
  const joined=geometry.clone(),positions=[];
  for(let i=0;i<geometry.index.count;i++)positions.push(geometry.index.getX(i));
  for(const {a,b,reverseOrder,normal} of matches){
   const f0=reverseOrder?b.b:b.a,f1=reverseOrder?b.a:b.b;
   // Manté un sol index buffer; la costura és coplanar amb les vores reals.
   const forward=dot(normal,a.normal)>=0;
   if(forward)positions.push(a.a,a.b,f0,a.b,f1,f0);
   else positions.push(a.b,a.a,f0,a.b,f0,f1);
  }
  joined.setIndex(positions);
  joined.computeBoundingBox();joined.computeBoundingSphere();
  joined.userData.candidateSimplified=true;
  mesh.geometry=joined;
 }
 return strokes.map(s=>({id:s.id,bridges:byStroke.get(s.id)||0,triangles:2*(byStroke.get(s.id)||0)}));
}

// Única retirada nova: component petit al voltant del primer punt (coberta
// posterior), sense eliminar en bloc hull_material_1 que també és estructural.
function removeSmallRearDetail(scene){
 const mesh=scene.getObjectByName('hull_material_1');
 if(!mesh?.isMesh||!mesh.geometry?.index)return {removed:0,reason:'malla no disponible'};
 const target=[-.793,1.973,5.128],geo=mesh.geometry;
 const pos=geo.getAttribute('position'),idx=geo.index;
 const count=pos.count,parent=new Int32Array(count);
 for(let i=0;i<count;i++)parent[i]=i;
 function root(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i}
 function join(i,j){i=root(i);j=root(j);if(i!==j)parent[j]=i}
 const welded=new Map();
 for(let i=0;i<count;i++){
  const p=[pos.getX(i),pos.getY(i),pos.getZ(i)],k=key(p);
  if(welded.has(k))join(i,welded.get(k));else welded.set(k,i);
 }
 for(let i=0;i<idx.count;i+=3){
  const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
  join(a,b);join(b,c);
 }
 const comps=new Map();
 for(let i=0;i<idx.count;i+=3){
  const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)],group=root(ids[0]);
  const entry=comps.get(group)||{faces:[],points:[],min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  entry.faces.push(i);
  const vertices=ids.map(j=>[pos.getX(j),pos.getY(j),pos.getZ(j)]);
  entry.points.push([0,1,2].map(k=>vertices.reduce((sum,p)=>sum+p[k],0)/3));
  for(const p of vertices)for(let k=0;k<3;k++){
   entry.min[k]=Math.min(entry.min[k],p[k]);entry.max[k]=Math.max(entry.max[k],p[k]);
  }
  comps.set(group,entry);
 }
 const selected=[];
 for(const c of comps.values()){
  const span=c.min.map((n,i)=>c.max[i]-n);
  if(c.faces.length>14||span[0]>.36||span[1]>.28||span[2]>.40)continue;
  if(c.points.some(p=>dist(p,target)<.17))selected.push(...c.faces);
 }
 if(!selected.length)return {removed:0,reason:'cap component independent prou petit'};
 const remove=new Set(selected),kept=[];
 for(let i=0;i<idx.count;i+=3){
  if(remove.has(i))continue;
  kept.push(idx.getX(i),idx.getX(i+1),idx.getX(i+2));
 }
 if(kept.length<60)return {removed:0,reason:'massa geometria afectada'};
 const cleaned=geo.clone();cleaned.setIndex(kept);
 cleaned.computeBoundingBox();cleaned.computeBoundingSphere();
 cleaned.userData.candidateSimplified=true;mesh.geometry=cleaned;
 return {removed:selected.length};
}
export function applyBtr82PaintAnnotations(scene){
 const removal=removeSmallRearDetail(scene);
 const groups=new Map();
 for(const s of BTR82_PAINTED_HOLES){
  if(!groups.has(s.mesh))groups.set(s.mesh,[]);
  groups.get(s.mesh).push(s);
 }
 const fills=[];
 for(const [name,strokes] of groups){
  const mesh=scene.getObjectByName(name);
  if(!mesh?.isMesh){fills.push(...strokes.map(s=>({id:s.id,bridges:0,reason:'malla absent'})));continue}
  fills.push(...stitchGeometry(mesh,strokes));
 }
 const summary={removed:removal.removed,removalReason:removal.reason||null,
  bridges:fills.reduce((n,f)=>n+f.bridges,0),fills,
  unresolved:fills.filter(x=>!x.bridges).map(x=>x.id)};
 scene.userData.btr82PaintedAnnotations=summary;
 return summary;
}
