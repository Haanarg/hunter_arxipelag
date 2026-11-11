import * as THREE from '../vendor/three-r186.module.mjs';
import {fromFacets,buildBtr82NoseCandidate} from './btr82-nose-candidates.mjs?rev=model3-angular-a3';
import {BTR82_CABIN_SHIFT_Z} from './btr82-hull-v3.mjs';

// Alternativa aprovada per l'usuari: candidat 3 (plans blindats).
// Les variants són malles REALMENT diferents, no sols shading:
export const BTR82_ANGULAR_VARIANTS=Object.freeze([
 {id:'facets',title:'Model 3 · base simètrica',tag:'Cares reflectides respecte al canó',
  description:'Morro de plans blindats amb els baixos ampliats fins a les rodes i triangles reflectits a esquerra i dreta.'},
 {id:'angular-mild',title:'Model 3A · angular moderat',tag:'Menys arestes · mateix volum',
  description:'Elimina perfils redundants, però manté el tall del sostre, les espatlles, el passamans de les rodes i la quilla.'},
 {id:'angular-strong',title:'Model 3B · angular fort',tag:'Torreta invertida · corba al davant',
  description:'Quilla ampla, escaló protector i cos de la torreta girat 180°: el retall corb mira cap al morro. El canó continua endavant.'}
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
// GIR NOMÉS DE LA TORRETA 3B: el corbat posterior passa a mirar -Z.
// Pivot sobre l'eix longitudinal original (cz=-.69 + setback de .38).
// Les peces del canó continuen orientades a -Z i mantenen la llargada.
export const BTR82_3B_TURRET_PIVOT_Z=BTR82_CABIN_SHIFT_Z-.69;
export const BTR82_3B_TURRET_ROTATION_DEGREES=180;
// El centre del canó original és a Y=2.69. La vora frontal amb el
// retall màxim de la mitja lluna girada és a Y=2.36 (anella 3).
// Abaixem totes dues peces 33 cm, només per al candidat 3B.
export const BTR82_3B_BARREL_LOWERING_Y=.33;
export const BTR82_3B_BARREL_RETRACTION_Z=0;
// El canó llarg 2.90 m acaba a Z=-.08 (amb el desplaçament de cabina).
// A Y=2.36, la cara frontal del retall és a Z≈-.78: l'extrem posterior
// ja entra uns 70 cm dins del cos. No cal fer-lo retrocedir ni escurçar-lo.
export function reverseBtr82StrongTurretBody(scene){
 const body=scene.getObjectByName('BTR82_v3_low_angular_turret');
 if(!body?.isMesh||!body.geometry?.getAttribute)throw Error('No es troba la torreta');
 if(body.userData?.rotated180)throw Error('La torreta ja està girada');
 // Clonem, per no alterar ni la geometria compartida ni els models 3/3A.
 const turned=body.geometry.clone();
 const pos=turned.getAttribute('position'),pivot=BTR82_3B_TURRET_PIVOT_Z;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  pos.setXYZ(i,-x,y,2*pivot-z); // gir 180º sobre l'eix Y pel pivot
 }
 pos.needsUpdate=true;
 turned.computeVertexNormals();turned.computeBoundingBox();turned.computeBoundingSphere();
 // Abans de mutar el cos, garantim que les dues peces del canó existeixen.
 const gunParts=['BTR82_new_black_barrel','BTR82_new_black_muzzle'].map(name=>{
  const part=scene.getObjectByName(name);
  if(!part?.isMesh||!part.position)throw Error('Falta canó: '+name);
  return part;
 });
 body.geometry=turned;
 // Centrem el canó a l'altura del rebaix màxim de la corba frontal.
 // No cal tocar-ne Z: la culata continua ben endins de la torreta.
 for(const part of gunParts)part.position.y-=BTR82_3B_BARREL_LOWERING_Y;
 body.userData={...body.userData,rotated180:true,pivotZ:pivot};
 if(scene.userData)scene.userData.btr82StrongTurret={
  bodyRotationY:180,pivotZ:pivot,barrelLoweringY:BTR82_3B_BARREL_LOWERING_Y,
  barrelRetractionZ:BTR82_3B_BARREL_RETRACTION_Z,gunAxis:'-Z'
 };
 return body;
}

export function buildBtr82AngularCandidate(method,baseline){
 if(!BTR82_ANGULAR_VARIANTS.some(v=>v.id===method))throw Error('Variant desconeguda');
 const {scene,details:baseDetails}=buildBtr82NoseCandidate('facets',baseline,null);
 const hull=scene.getObjectByName('BTR82_v3_lowered_centre_hull');
 const geometry=createBtr82AngularGeometry(method);
 hull.geometry.dispose();hull.geometry=geometry;
 hull.material=hull.material.clone();hull.material.flatShading=true;hull.material.needsUpdate=true;
 centreBtr82AngularHardware(scene);
 // Els dos altres candidats no giren la torreta; 3B sí.
 if(method==='angular-strong')reverseBtr82StrongTurretBody(scene);
 const referenceTriangles=createBtr82AngularGeometry('facets').index.count/3;
 const hullTriangles=geometry.index.count/3;
 return {scene,details:{hullTriangles,
  reductionPercent:Math.round((1-hullTriangles/referenceTriangles)*100),
  profiles:PROFILES[method].length,stations:geometry.userData.angularStations,
  bodyLowering:baseDetails.bodyLowering,
  turretBodyRotationY:method==='angular-strong'?180:0,
  barrelLoweringY:method==='angular-strong'?BTR82_3B_BARREL_LOWERING_Y:0,
  barrelRetractionZ:BTR82_3B_BARREL_RETRACTION_Z}};
}
