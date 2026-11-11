import * as THREE from '../vendor/three-r186.module.mjs';
import {makeBtr82HullV3,BTR82_HULL_V3_STATIONS,createBtr82HullGeometryFromStations} from './btr82-hull-v3.mjs';

// Sis alternatives, amb el mateix xassís, torreta, vuit rodes i canó.
// El pla de simetria és X=0. La proa apunta cap a -Z.
export const BTR82_NOSE_CANDIDATES=Object.freeze([
 {id:'current',title:'01 · V3k actual',tag:'Control',description:'La geometria existent, sense modificar.'},
 {id:'bottom',title:'02 · De baix cap amunt',tag:'Quilla directora',description:'Primer definim la quilla i el ventre; després els unim al blindatge superior.'},
 {id:'facets',title:'03 · Plans blindats',tag:'Poliedre',description:'Morro de grans superfícies planes, amb poques seccions i una punta explícita.'},
 {id:'silhouette',title:'04 · Tres siluetes',tag:'Projeccions del GLB',description:'Amplada, sostre i fons deduïts dels perfils projectats del model original.'},
 {id:'slices',title:'05 · Seccions transversals',tag:'Talls del GLB',description:'Altures dels panells calculades a partir de talls geomètrics del casc original.'},
 {id:'original',title:'06 · Morro original retallat',tag:'Retall original · simplificació pendent',description:'Proa original retallada i casc posterior low-poly; la costura és oberta i encara falta simplificar aquesta peça.'}
]);
export const BTR82_NOSE_ASSET='./assets/vehicle-candidates/tanqueta/btr82-base-100.glb';
const ORDER=['roof','brow','shoulder','belt','lip','shelf','wheelWell','stepFoot','belly','keel'];
const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const clone=s=>Object.fromEntries(Object.entries(s).map(([k,v])=>[k,Array.isArray(v)?[...v]:v]));
const JOIN=-3.23,FRONT=-5.425,CUT=-3.74;
function at(stations,z){
 if(z<=stations[0].z)return clone(stations[0]);
 if(z>=stations.at(-1).z)return clone(stations.at(-1));
 const j=stations.findIndex(s=>s.z>=z),a=stations[j-1],b=stations[j],t=(z-a.z)/(b.z-a.z),v={z};
 for(const key of ORDER)v[key]=a[key].map((p,i)=>lerp(p,b[key][i],t));
 return v;
}
function attach(front){
 const result=front.map(clone).sort((a,b)=>a.z-b.z);
 if(Math.abs(result.at(-1).z-JOIN)>1e-5)result.push(clone(BTR82_HULL_V3_STATIONS.find(s=>s.z===JOIN)));
 return result.concat(BTR82_HULL_V3_STATIONS.filter(s=>s.z>JOIN).map(clone));
}
function constructStation(z,w,roof,bottom){
 const h=Math.max(.32,roof-bottom),width=limit(w,.73,1.92);
 const y=f=>roof-h*f;
 return {z,roof:[width*.62,roof,0],brow:[width*.80,y(.09),0],
  shoulder:[width*.95,y(.24),0],belt:[width,y(.42),0],
  lip:[width*.96,y(.51),0],shelf:[width*.79,y(.59),0],
  wheelWell:[width*.64,y(.64),0],stepFoot:[width*.56,y(.81),0],
  belly:[width*.45,y(.92),0],keel:[width*.16,bottom,0]};
}
// 1: Mètode de la quilla. El pendent inferior, no el sostre, guia la construcció.
function fromBottom(){
 const axis=[[-5.425,.82],[-5.06,.70],[-4.71,.54],[-4.36,.36],
  [-4.03,.10],[-3.75,-.12],[-3.23,-.32]];
 return attach(axis.map(([z,y])=>{
  const s=at(BTR82_HULL_V3_STATIONS,z);s.z=z;
  for(const key of ORDER)if(z!==FRONT)s[key][2]=0;
  const upper=s.belt[1],half=s.belt[0],f=t=>lerp(y,upper,t);
  s.keel=[.30,y,0];s.belly=[half*.46,f(.11),0];
  s.stepFoot=[half*.56,f(.28),0];s.wheelWell=[half*.63,f(.61),0];
  s.shelf=[half*.77,f(.72),0];s.lip=[half*.94,f(.86),0];
  return s;
 }));
}
// 2: Quatre grans cares consecutives, sense anar apilant 10 perfils frontals.
export function fromFacets(){
 const stations=[
  constructStation(-5.425,1.06,1.18,.81),
  constructStation(-4.77,1.40,1.36,.52),
  constructStation(-4.18,1.72,1.57,.11),
  constructStation(-3.74,1.84,1.70,-.12)
 ];
 return attach(stations);
}
// Superfícies originals, transformades al sistema local del GLB.
export function extractBtr82SourceTriangles(root){
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),v=new THREE.Vector3(),out=[];
 root.traverse(o=>{
  if(!o.isMesh||!/^hull_material_[01]$/.test(o.name))return;
  const pos=o.geometry?.getAttribute('position'),idx=o.geometry?.index;
  if(!pos)return;
  const count=idx?idx.count:pos.count;
  for(let k=0;k+2<count;k+=3){
   const tri=[];
   for(let j=0;j<3;j++){
    const n=idx?idx.getX(k+j):k+j;
    v.fromBufferAttribute(pos,n).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);
    tri.push([v.x,v.y,v.z]);
   }
   out.push(tri);
  }
 });
 if(out.length<200)throw Error('No es troben les superfícies originals del casc');
 return out;
}
// Intersecció real entre els triangles del GLB i el pla transversal Z=z.
export function btr82SliceAtZ(triangles,z){
 const lines=[],eps=1e-7;
 for(const tri of triangles){
  const pts=[];
  for(let i=0;i<3;i++){
   const a=tri[i],b=tri[(i+1)%3],da=a[2]-z,db=b[2]-z;
   if(Math.abs(da)<eps)pts.push([a[0],a[1]]);
   if((da<-eps&&db>eps)||(da>eps&&db<-eps)){
    const t=-da/(db-da);pts.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t)]);
   }
  }
  const unique=[];
  for(const p of pts)if(!unique.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-5))unique.push(p);
  if(unique.length>=2)lines.push([unique[0],unique[1]]);
 }
 return lines;
}
function boundsAt(tris,z){
 const lines=btr82SliceAtZ(tris,z),points=lines.flat();
 if(points.length<4)return null;
 return {lines,
  halfWidth:Math.max(...points.map(p=>Math.abs(p[0]))),
  roof:Math.max(...points.map(p=>p[1])),
  belly:Math.min(...points.map(p=>p[1]))};
}
// 3: Tres projeccions independents. En aquest prototip, cada Z
// agafa els extrems X/Y de la silueta original.
function fromSilhouettes(tris){
 const front=[];
 for(const z of [-5.425,-5.04,-4.75,-4.48,-4.21,-3.97,-3.76]){
  const b=boundsAt(tris,Math.max(-4.97,z));
  if(!b)throw Error('Sense silueta del GLB a Z='+z);
  const w=limit(b.halfWidth,.83,1.91);
  const roof=limit(b.roof,1.07,1.76);
  const bottom=limit(b.belly,-.18,roof-.35);
  front.push(constructStation(z,w,roof,bottom));
 }
 return attach(front);
}
function envelopeAtX(lines,x){
 const ys=[];
 for(const [a,b] of lines){
  if(x<Math.min(a[0],b[0])-1e-5||x>Math.max(a[0],b[0])+1e-5)continue;
  const dx=b[0]-a[0];
  if(Math.abs(dx)<1e-6){ys.push(a[1],b[1]);continue}
  ys.push(lerp(a[1],b[1],limit((x-a[0])/dx,0,1)));
 }
 return ys.length?{highest:Math.max(...ys),lowest:Math.min(...ys)}:null;
}
// 4: A diferència de les siluetes, captura també el relleu del perfil
// a diferents distàncies de X=0 en cada tall transversal del GLB.
function fromSections(tris){
 const front=[];
 for(const z of [-5.425,-5.04,-4.76,-4.50,-4.24,-3.99,-3.76]){
  const b=boundsAt(tris,Math.max(-4.97,z));
  if(!b)throw Error('Sense tall transversal del GLB a Z='+z);
  const w=limit(b.halfWidth,.84,1.91),roof=limit(b.roof,1.1,1.77),bottom=limit(b.belly,-.17,roof-.36);
  const ring=constructStation(z,w,roof,bottom);
  for(const [key,part,top] of [['brow',.80,true],['shoulder',.95,true],
    ['lip',.96,false],['shelf',.79,false],['wheelWell',.64,false],['belly',.45,false]]){
   const env=envelopeAtX(b.lines,w*part);
   if(env)ring[key][1]=lerp(ring[key][1],limit(top?env.highest:env.lowest,bottom,roof),.48);
  }
  let last=roof;
  for(const key of ORDER.slice(1)){ring[key][1]=Math.min(ring[key][1],last-.025);last=ring[key][1];}
  front.push(ring);
 }
 return attach(front);
}
function fromGeometry(geometry){
 const idx=geometry.index,pos=geometry.getAttribute('position'),out=[];
 for(let k=0;k+2<(idx?idx.count:pos.count);k+=3){
  out.push(Array.from({length:3},(_,j)=>{
   const n=idx?idx.getX(k+j):k+j;
   return [pos.getX(n),pos.getY(n),pos.getZ(n)];
  }));
 }
 return out;
}
export function clipBtr82Triangles(triangles,planeZ,front){
 const vertices=[],inside=p=>front?p[2]<=planeZ+1e-7:p[2]>=planeZ-1e-7;
 for(const triangle of triangles){
  const polygon=[];
  for(let k=0;k<3;k++){
   const a=triangle[k],b=triangle[(k+1)%3],one=inside(a),two=inside(b);
   if(one)polygon.push(a);
   if(one!==two){
    const t=(planeZ-a[2])/(b[2]-a[2]);
    polygon.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t),planeZ]);
   }
  }
  for(let k=1;k+1<polygon.length;k++){
   const a=polygon[0],b=polygon[k],c=polygon[k+1];
   const u=b.map((v,j)=>v-a[j]),v=c.map((x,j)=>x-a[j]);
   const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
   if(Math.hypot(...cross)<1e-7)continue;
   vertices.push(...a,...b,...c);
  }
 }
 return vertices;
}
function geometryFromVertices(points){
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 geometry.computeVertexNormals();geometry.computeBoundingSphere();
 geometry.userData.candidateSimplified=true;
 return geometry;
}
// 5: Retall real dels triangles originals de proa i retall oposat
// del casc low-poly. Costura oberta i pendent de soldar: és un experiment.
function originalNose(scene,originalTriangles){
 const hull=scene.getObjectByName('BTR82_v3_lowered_centre_hull');
 const rear=clipBtr82Triangles(fromGeometry(hull.geometry),CUT,false);
 const front=clipBtr82Triangles(originalTriangles,CUT,true);
 if(rear.length<150||front.length<150)throw Error('No s’ha pogut fer el retall del morro');
 hull.geometry.dispose();hull.geometry=geometryFromVertices(rear);
 const panel=new THREE.Mesh(geometryFromVertices(front),new THREE.MeshStandardMaterial({
  color:0x74816d,roughness:.94,metalness:0,flatShading:true,side:THREE.DoubleSide
 }));
 panel.name='BTR82_original_nose_clip';panel.castShadow=true;panel.receiveShadow=true;
 scene.add(panel);
 return {frontTriangles:front.length/9,rearTriangles:rear.length/9,openSeam:true};
}
export function buildBtr82NoseCandidate(id,baseline,originalTriangles){
 if(!BTR82_NOSE_CANDIDATES.some(c=>c.id===id))throw Error('Candidat desconegut: '+id);
 const scene=makeBtr82HullV3(baseline);
 const hull=scene.getObjectByName('BTR82_v3_lowered_centre_hull');
 let geometry=null,details={closed:true};
 if(id==='bottom')geometry=createBtr82HullGeometryFromStations(fromBottom());
 if(id==='facets')geometry=createBtr82HullGeometryFromStations(fromFacets());
 if(id==='silhouette')geometry=createBtr82HullGeometryFromStations(fromSilhouettes(originalTriangles));
 if(id==='slices')geometry=createBtr82HullGeometryFromStations(fromSections(originalTriangles));
 if(id==='original')details=originalNose(scene,originalTriangles);
 if(geometry){hull.geometry.dispose();hull.geometry=geometry;}
 if(!scene.getObjectByName('BTR82_new_black_barrel')||
    !Array.from({length:8},(_,i)=>scene.getObjectByName('BTR82_truck_A43_wheel_'+i)).every(Boolean))
  throw Error('El candidat no conserva el canó i les vuit rodes');
 return {scene,details:{...details,triangles:(hull.geometry.index?.count??hull.geometry.getAttribute('position').count)/3}};
}
