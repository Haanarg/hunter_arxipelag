import * as THREE from '../vendor/three-r186.module.mjs';
import {fromFacets,buildBtr82NoseCandidate} from './btr82-nose-candidates.mjs?rev=model3-angular-a3';

// Alternativa aprovada per l'usuari: candidat 3 (plans blindats).
// Les variants són malles REALMENT diferents, no sols shading:
export const BTR82_ANGULAR_VARIANTS=Object.freeze([
 {id:'facets',title:'Model 3 · base simètrica',tag:'Cares reflectides respecte al canó',
  description:'Morro de plans blindats amb els baixos ampliats fins a les rodes i triangles reflectits a esquerra i dreta.'},
 {id:'angular-mild',title:'Model 3A · angular moderat',tag:'Menys arestes · mateix volum',
  description:'Elimina perfils redundants, però manté el tall del sostre, les espatlles, el passamans de les rodes i la quilla.'},
 {id:'angular-strong',title:'Model 3B · angular fort',tag:'Quilla ampla · simetria axial',
  description:'Quilla ampla i plana entre rodes, amb lleixa superior protectora i paret interior marcada. Set seccions longitudinals.'}
]);

// 14 punts per secció: al 3B conservem la lleixa i el mur protector.
// Menys seccions en Z mantenen els plans laterals grans i angulars.
// El pla longitudinal del canó és X=0, sense simetria davant/darrere.
const PROFILES=Object.freeze({
 'facets':['roof','brow','shoulder','belt','lip','shelf','wheelWell','stepFoot','belly','keel'],
 'angular-mild':['roof','brow','shoulder','belt','wheelWell','stepFoot','keel'],
 'angular-strong':['roof','shoulder','belt','shelf','wheelWell','stepFoot','keel']
});
const LONGITUDES=Object.freeze({
 'angular-mild':[-5.425,-4.77,-4.18,-3.74,-3.23,-2.15,.85,3.54,4.58,5.425],
 'angular-strong':[-5.425,-4.18,-3.74,-3.23,.85,4.58,5.425]
});

function snapStations(method){
 const original=fromFacets();
 const lengths=LONGITUDES[method];
 if(!lengths)throw Error('Variant angular desconeguda: '+method);
 return lengths.map(z=>{
  const source=original.find(section=>Math.abs(section.z-z)<1e-5);
  if(!source)throw Error('Falta la secció longitudinal '+z);
  return source;
 });
}
// L'interior dels pneumàtics és a |X|=1.4375.
export const BTR82_ANGULAR_LOWER_WIDTHS=Object.freeze({
 shelf:1.59,wheelWell:1.47,stepFoot:1.405,belly:1.38,keel:1.34
});
export function btr82LowerArmourBlend(z){
 const front=Math.max(0,Math.min(1,(z+4.77)/1.03));
 const rear=Math.max(0,Math.min(1,(5.425-z)/.845));
 return Math.min(front,rear);
}
function makeRing(station,names){
 const factor=btr82LowerArmourBlend(station.z);
 const right=names.map(key=>{
  const p=station[key],target=BTR82_ANGULAR_LOWER_WIDTHS[key];
  if(!p||p.length!==3)throw Error('Falta el perfil '+key);
  const x=target===undefined?p[0]:p[0]+(Math.max(target,p[0])-p[0])*factor;
  return [x,p[1],station.z+p[2]];
 });
 return [[-right[0][0],right[0][1],right[0][2]],...right,
  ...right.slice(1).reverse().map(([x,y,z])=>[-x,y,z])];
}

// Reflex de CADA cara a X=0; no només els seus vèrtexs.
// La triangulació anterior dibuixava diagonals desiguals als costats.
export function createBtr82AngularGeometry(method){
 const levels=PROFILES[method];if(!levels)throw Error('Variant desconeguda');
 const rings=(method==='facets'?fromFacets():snapStations(method))
  .map(st=>makeRing(st,levels));
 const n=levels.length*2,steps=levels.length,positions=rings.flat(2),indices=[],mirror=[];
 const refl=i=>i===0?1:i===1?0:n+1-i;
 for(let r=0;r<rings.length;r++)for(let i=0;i<n;i++)
  mirror[r*n+i]=r*n+refl(i);
 const roofAxis=[],keelAxis=[];
 for(let r=0;r<rings.length;r++){
  const roof=rings[r][1],keel=rings[r][steps];
  roofAxis[r]=positions.length/3;positions.push(0,roof[1],roof[2]);mirror[roofAxis[r]]=roofAxis[r];
  keelAxis[r]=positions.length/3;positions.push(0,keel[1],keel[2]);mirror[keelAxis[r]]=keelAxis[r];
 }
 const pair=(a,b,c,d)=>{
  indices.push(a,c,b,a,d,c);
  indices.push(mirror[a],mirror[b],mirror[c],mirror[a],mirror[c],mirror[d]);
 };
 for(let r=0;r<rings.length-1;r++){
  const a=r*n,b=(r+1)*n;
  pair(roofAxis[r],a+1,b+1,roofAxis[r+1]);
  for(let j=1;j<steps;j++)pair(a+j,a+j+1,b+j+1,b+j);
  pair(a+steps,keelAxis[r],keelAxis[r+1],b+steps);
 }
 const cap=(end,front)=>{
  const offset=end*n,right=i=>offset+1+i,left=i=>offset+(i===0?0:n-i);
  const centre=new Map();
  for(let i=1;i<steps-1;i++){
   const p=rings[end][1+i],index=positions.length/3;
   positions.push(0,p[1],p[2]);centre.set(i,index);
  }
  const tri=(a,b,c)=>front?indices.push(a,b,c):indices.push(a,c,b);
  const top=centre.get(1);
  tri(left(0),roofAxis[end],top);tri(roofAxis[end],right(0),top);
  tri(left(0),top,left(1));tri(right(0),right(1),top);
  for(let i=1;i<steps-2;i++){
   const a=centre.get(i),b=centre.get(i+1);
   tri(left(i),a,left(i+1));tri(a,b,left(i+1));
   tri(a,right(i),right(i+1));tri(a,right(i+1),b);
  }
  const last=steps-1,low=centre.get(last-1);
  tri(left(last-1),low,left(last));tri(low,right(last-1),right(last));
  tri(low,right(last),keelAxis[end]);tri(low,keelAxis[end],left(last));
 };
 cap(0,true);cap(rings.length-1,false);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox();
 g.userData.candidateSimplified=true;g.userData.angularVariant=method;
 g.userData.angularStations=rings.length;g.userData.angularProfiles=steps;
 g.userData.mirroredFacePairs=true;
 return g;
}

// Alineació dels detalls amb l'eix real del canó (-Z).
// Una parella de rodes de la base GLB estava decalant-se 12,5 cm en Z.
export function centreBtr82AngularHardware(scene){
 for(const name of ['BTR82_new_black_barrel','BTR82_new_black_muzzle']){
  const o=scene.getObjectByName(name);if(!o?.position)throw Error('Falta '+name);
  o.position.x=0;
 }
 for(const [l,r] of [[0,1],[3,2],[5,4],[6,7]]){
  const left=scene.getObjectByName('BTR82_truck_A43_wheel_'+l);
  const right=scene.getObjectByName('BTR82_truck_A43_wheel_'+r);
  if(!left?.position||!right?.position)throw Error('Falta parella de rodes');
  const x=(Math.abs(left.position.x)+Math.abs(right.position.x))/2;
  const z=(left.position.z+right.position.z)/2;
  left.position.x=-x;right.position.x=x;
  left.position.z=z;right.position.z=z;
 }
}
export function buildBtr82AngularCandidate(method,baseline){
 if(!BTR82_ANGULAR_VARIANTS.some(v=>v.id===method))throw Error('Variant desconeguda');
 const {scene,details:baseDetails}=buildBtr82NoseCandidate('facets',baseline,null);
 const hull=scene.getObjectByName('BTR82_v3_lowered_centre_hull');
 const geometry=createBtr82AngularGeometry(method);
 hull.geometry.dispose();hull.geometry=geometry;
 hull.material=hull.material.clone();hull.material.flatShading=true;hull.material.needsUpdate=true;
 centreBtr82AngularHardware(scene);
 const referenceTriangles=createBtr82AngularGeometry('facets').index.count/3;
 const hullTriangles=geometry.index.count/3;
 return {scene,details:{hullTriangles,
  reductionPercent:Math.round((1-hullTriangles/referenceTriangles)*100),
  profiles:PROFILES[method].length,stations:geometry.userData.angularStations,
  bodyLowering:baseDetails.bodyLowering}};
}
