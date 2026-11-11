import * as THREE from '../vendor/three-r186.module.mjs';
import {fromFacets,buildBtr82NoseCandidate} from './btr82-nose-candidates.mjs';

// Alternativa aprovada per l'usuari: candidat 3 (plans blindats).
// Les variants són malles REALMENT diferents, no sols shading:
export const BTR82_ANGULAR_VARIANTS=Object.freeze([
 {id:'facets',title:'Model 3 · original',tag:'508 triangles · control',
  description:'El morro de plans blindats escollit. Cap vèrtex ni cara retocats.'},
 {id:'angular-mild',title:'Model 3A · angular moderat',tag:'Menys arestes · mateix volum',
  description:'Elimina perfils redundants, però manté el tall del sostre, les espatlles, el passamans de les rodes i la quilla.'},
 {id:'angular-strong',title:'Model 3B · angular fort',tag:'Plans grans · molt low-poly',
  description:'Només cinc nivells per perfil i set seccions longitudinals. Falca i panxa amb arestes molt més contundents.'}
]);

// Dels 20 punts de secció de l'original, en queden 14 o 10.
// El pla longitudinal del canó és X=0, sense simetria davant/darrere.
const PROFILES=Object.freeze({
 'angular-mild':['roof','brow','shoulder','belt','wheelWell','stepFoot','keel'],
 'angular-strong':['roof','shoulder','belt','stepFoot','keel']
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
function makeRing(station,names){
 const right=names.map(key=>{
  const p=station[key];
  if(!p||p.length!==3)throw Error('Perfil inexistent: '+key);
  return [p[0],p[1],station.z+p[2]];
 });
 // 0 = roof left, 1 = roof right, then right flank, then mirrored left.
 return [
  [-right[0][0],right[0][1],right[0][2]],
  ...right,
  ...right.slice(1).reverse().map(([x,y,z])=>[-x,y,z])
 ];
}

export function createBtr82AngularGeometry(method){
 const levels=PROFILES[method];
 if(!levels)throw Error('Cal triar angular-mild o angular-strong');
 const rings=snapStations(method).map(st=>makeRing(st,levels));
 const num=rings[0].length,steps=levels.length;
 const vertices=rings.flat(2),faces=[];
 // Same winding convention as the approved v3k hull.
 for(let ring=0;ring<rings.length-1;ring++)
  for(let i=0;i<num;i++){
   const a=ring*num+i,b=ring*num+(i+1)%num,
    c=(ring+1)*num+(i+1)%num,d=(ring+1)*num+i;
   faces.push(a,c,b,a,d,c);
  }
 // Front and back caps split at X=0: no giant asymmetric diagonal.
 // One central spine per cap; a mirrored fan on each side.
 const cap=(end,front)=>{
  const offset=end*num;
  const r=j=>offset+1+j;
  const l=j=>offset+(j===0?0:num-j);
  const centre=new Map();
  for(let j=1;j<steps-1;j++){
   const p=rings[end][1+j],index=vertices.length/3;
   vertices.push(0,p[1],p[2]);
   centre.set(j,index);
  }
  const tri=(a,b,c)=>front?faces.push(a,b,c):faces.push(a,c,b);
  const top=centre.get(1);
  tri(l(0),r(0),top);
  tri(l(0),top,l(1));
  tri(r(0),r(1),top);
  for(let j=1;j<steps-2;j++){
   const a=centre.get(j),b=centre.get(j+1);
   tri(l(j),a,l(j+1));tri(a,b,l(j+1));
   tri(a,r(j),r(j+1));tri(a,r(j+1),b);
  }
  const last=steps-1,low=centre.get(last-1);
  tri(l(last-1),low,l(last));
  tri(low,r(last-1),r(last));
  tri(low,r(last),l(last));
 };
 cap(0,true);cap(rings.length-1,false);

 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setIndex(faces);
 geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.computeBoundingBox();
 geometry.userData.candidateSimplified=true;
 geometry.userData.angularVariant=method;
 geometry.userData.angularStations=rings.length;
 geometry.userData.angularProfiles=steps;
 return geometry;
}

export function buildBtr82AngularCandidate(method,baseline){
 if(!BTR82_ANGULAR_VARIANTS.some(v=>v.id===method))
  throw Error('Candidat angular desconegut: '+method);
 const {scene}=buildBtr82NoseCandidate('facets',baseline,null);
 const hull=scene.getObjectByName('BTR82_v3_lowered_centre_hull');
 const referenceTriangles=hull.geometry.index.count/3;
 if(method==='facets')
  return {scene,details:{hullTriangles:referenceTriangles,reductionPercent:0,
   profiles:10,stations:fromFacets().length}};
 const geometry=createBtr82AngularGeometry(method);
 hull.geometry.dispose();
 hull.geometry=geometry;
 // Explicitly render large plate facets; no smoothing of shared normals.
 hull.material=hull.material.clone();
 hull.material.flatShading=true;
 hull.material.needsUpdate=true;
 const hullTriangles=geometry.index.count/3;
 const reductionPercent=Math.round((1-hullTriangles/referenceTriangles)*100);
 if(!(hullTriangles<referenceTriangles))throw Error('La simplificació no ha reduït cares');
 for(let i=0;i<8;i++)if(!scene.getObjectByName('BTR82_truck_A43_wheel_'+i))
  throw Error('Falta roda '+i);
 for(const name of ['BTR82_new_black_barrel','BTR82_new_black_muzzle'])
  if(!scene.getObjectByName(name))throw Error('Falta una part del canó: '+name);
 return {scene,details:{hullTriangles,reductionPercent,
  profiles:PROFILES[method].length,stations:LONGITUDES[method].length}};
}
