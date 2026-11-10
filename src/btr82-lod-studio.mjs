import * as THREE from '../vendor/three-r186.module.mjs';
import {createTruckModel} from './truck-model.mjs';
import {SimplifyModifier} from 'three/addons/modifiers/SimplifyModifier.js';
import {repairMarkedRearSeams} from './btr82-rear-seam-repair.mjs';
// Low Poly BTR-82 by SIpriv (CC BY 4.0): base Three.js al 25%.
 // El punt de partida de les quatre reduccions és la variant actual amb
 // vuit rodes del camió A4.3 i canó negre cilíndric, NO el GLB original.
export const BTR82_VERSION='btr82-front-decor-remove-v4';
const ASSET_DIR='./assets/vehicle-candidates/tanqueta/';
const BASE_FILE='btr82-base-100.glb';
const CREDIT='https://sketchfab.com/3d-models/low-poly-btr-82-6226acae68424d99bf03882b245ff7c5';
const PASSES=Object.freeze([
 {slot:0,level:0,title:'Original · base aprovada',ratio:0},
 {slot:1,level:4,title:'Low-poly · iteració 4',ratio:.32}
]);
const LOD_RATIOS=[.18,.22,.27,.32];
// Les primeres vuit malles de la base 25% són les rodes, separades de la carrosseria.
// Substitució no destructiva: no es toca cap triangle de casc, torreta o canó.
function withTruckWheels(source){
 const scene=source.clone(true);
 const wheels=[];
 scene.traverse(o=>{if(o.isMesh&&/^Object_(428|431|434|436|439|441|444|446)_material_9$/.test(o.name))wheels.push(o)});
 if(wheels.length!==8)throw Error('La base 25% no conté exactament les vuit rodes esperades');
 const truck=createTruckModel(THREE);
 const donor=truck.userData.wheels?.[0];
 if(!donor||donor.children.length<3)throw Error('No s’han trobat les rodes A4.3 del camió');
 scene.updateMatrixWorld(true);
 for(const old of wheels){
  const bounds=new THREE.Box3().setFromObject(old);
  const center=bounds.getCenter(new THREE.Vector3());
  const size=bounds.getSize(new THREE.Vector3());
  const replacement=donor.clone(true);
  replacement.name='BTR82_truck_A43_wheel_'+wheels.indexOf(old);
  // Les rodes del camió tenen diàmetre 1,60 i amplada 0,50.
  // Mantenim el centre i les dimensions de les rodes del BTR-82 base.
  replacement.position.copy(old.parent.worldToLocal(center.clone()));
  replacement.scale.set(size.x/.50,size.y/1.60,size.z/1.60);
  replacement.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  old.parent.add(replacement);
  old.parent.remove(old);
 }
 scene.userData.btr82WheelDonor='truck-A4.3';
 return scene;
}
// El canó de la base 25% està integrat a turret_material_3, no és una malla independent.
// Només se'n retiren els triangles situats davant la torreta, en el corredor estret
// del canó original. La resta de la torreta, el casc i les rodes es conserven.
function replaceBarrelWithCylinders(scene){
 const turret=scene.getObjectByName('turret_material_3');
 if(!turret?.isMesh||!turret.geometry?.index)throw Error('No s’ha trobat la torreta de la base Three.js 25%');
 const geometry=turret.geometry;
 const positions=geometry.getAttribute('position'),indices=geometry.index;
 const retained=[];
 let removed=0;
 for(let i=0;i<indices.count;i+=3){
  const a=indices.getX(i),b=indices.getX(i+1),c=indices.getX(i+2);
  const x=(positions.getX(a)+positions.getX(b)+positions.getX(c))/3;
  const y=(positions.getY(a)+positions.getY(b)+positions.getY(c))/3;
  const z=(positions.getZ(a)+positions.getZ(b)+positions.getZ(c))/3;
  if(z < -1.55 && y > 2.50 && Math.abs(x) < .26){removed++;continue}
  retained.push(a,b,c);
 }
 if(removed<35||removed>110)throw Error('La selecció del canó original no és segura: '+removed+' triangles');
 const cleaned=geometry.clone();
 cleaned.setIndex(retained);
 cleaned.computeBoundingBox();cleaned.computeBoundingSphere();
 turret.geometry=cleaned;
 // En les coordenades del GLB, -Z és la direcció de la proa.
 // El canó comença profundament DINS la torreta, a z=-0,46, per evitar qualsevol buit.
 const black=new THREE.MeshStandardMaterial({color:0x101010,roughness:.78,metalness:.20});
 const addCylinder=(name,radius,length,z)=>{
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,12,1,false),black);
  mesh.name=name;
  mesh.rotation.x=Math.PI/2;
  mesh.position.set(-.06,2.69,z);
  mesh.castShadow=true;mesh.receiveShadow=true;
  turret.parent.add(mesh);
  return mesh;
 };
 // Cos principal: de z=-0,46 a z=-3,36; el darrere travessa la boca de la torreta.
 addCylinder('BTR82_new_black_barrel',.085,2.90,-1.91);
 // Boca de foc de diàmetre lleugerament més gran; s'encavalca 3 cm.
 addCylinder('BTR82_new_black_muzzle',.115,.28,-3.47);
 scene.userData.btr82Gun='forward-black-two-cylinders';
 scene.userData.btr82OriginalBarrelFacesRemoved=removed;
 return scene;
}

function installFourHeadlights(scene){
 // Quatre fars frontals independents: la reducció de superfícies no els toca.
 const housing=new THREE.MeshStandardMaterial({color:0x333b32,roughness:.88,metalness:.12});
 const lens=new THREE.MeshStandardMaterial({color:0xffedb7,emissive:0x564621,roughness:.46,metalness:0});
 for(const [i,x] of [-1.53,-1.06,1.06,1.53].entries()){
  for(const [part,radius,length,z,mat] of [
   ['housing',.154,.075,-5.045,housing],['lens',.112,.042,-5.098,lens]]){
   const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,10),mat);
   mesh.name='BTR82_front_headlight_'+(i+1)+'_'+part;
   mesh.rotation.x=Math.PI/2;
   mesh.position.set(x,1.56,z);
   mesh.castShadow=true;mesh.receiveShadow=true;
   scene.add(mesh);
  }
 }
 scene.userData.btr82Headlights=4;
 return scene;
}

function makeBaseline(original){
 const base=installFourHeadlights(replaceBarrelWithCylinders(withTruckWheels(original)));
 const lights=[];
 base.traverse(o=>{if(o.name.endsWith('_lens')&&o.name.startsWith('BTR82_front_headlight_'))lights.push(o)});
 if(lights.length!==4||!base.getObjectByName('BTR82_new_black_barrel'))
  throw Error('Falten fars o el canó de la base de simplificació');
 return base;
}
const LOD_SURFACES=new Set(['hull_material_0','hull_material_1','turret_material_3']);
const modifier=new SimplifyModifier();
async function reduceSurfaces(scene,removeFraction){
 const result=scene.clone(true);
 let before=0,after=0;
 for(const name of LOD_SURFACES){
  const mesh=result.getObjectByName(name);
  if(!mesh?.isMesh)throw Error('Falta una superfície del blindat: '+name);
  const input=mesh.geometry;
  const n=input.index?.count??input.getAttribute('position').count;
  const count=Math.floor(input.getAttribute('position').count*removeFraction);
  before+=n/3;
  if(count<3){after+=n/3;continue}
  const simplified=await modifier.modify(input,count);
  simplified.userData.candidateSimplified=true;
  simplified.computeBoundingBox();
  simplified.computeBoundingSphere();
  const newTriangles=(simplified.index?.count??simplified.getAttribute('position').count)/3;
  // No substituïm una superfície si el simplificador la deixa buida.
  if(newTriangles<12||newTriangles>n/3){simplified.dispose();after+=n/3;continue}
  mesh.geometry=simplified;
  after+=newTriangles;
 }
 result.userData.btr82Reduction={before,after};
 if(!result.getObjectByName('BTR82_new_black_barrel')||
    !result.getObjectByName('BTR82_front_headlight_4_lens'))
  throw Error('La simplificació ha perdut un detall identificatiu');
 return result;
}
// Anotacions ELIMINAR PEÇA (Model 2) — sis marques sobre el frontal.
// S'han inspeccionat els triangles del GLB base: hull_material_4 inclou 4
// triangles de la part posterior (+Z) QUE ES CONSERVEN i 18 triangles
// frontals (-Z) que corresponen a les marques. hull_material_7 (66 △)
// i hull_material_8 (4 △) són exclusivament detalls frontals associats.
// No es toquen hull_material_0/1, fars, torreta, rodes ni model original.
export function removeMarkedFrontDetails(scene){
 const trim=scene.getObjectByName('hull_material_4');
 if(!trim?.isMesh||!trim.geometry?.index)throw Error('Falta hull_material_4');
 const geometry=trim.geometry,vertices=geometry.getAttribute('position'),index=geometry.index;
 if(index.count!==66)throw Error('hull_material_4 inesperat: no aplicar retall destructiu');
 const keep=[];
 let removed=0;
 for(let t=0;t<index.count;t+=3){
  const a=index.getX(t),b=index.getX(t+1),c=index.getX(t+2);
  const z=(vertices.getZ(a)+vertices.getZ(b)+vertices.getZ(c))/3;
  if(z < -2.6){removed++;continue}
  keep.push(a,b,c);
 }
 if(removed!==18||keep.length!==12)throw Error('Les peces frontals de hull_material_4 han canviat');
 const cleaned=geometry.clone();
 cleaned.setIndex(keep);
 cleaned.computeBoundingBox();cleaned.computeBoundingSphere();
 cleaned.userData.candidateSimplified=true;
 trim.geometry=cleaned;
 const removedMeshes=[];
 for(const [name,expectedTriangles] of [['hull_material_7',66],['hull_material_8',4]]){
  const mesh=scene.getObjectByName(name);
  if(!mesh?.isMesh)throw Error('Falta el detall frontal '+name);
  const triangles=(mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count)/3;
  mesh.geometry.computeBoundingBox();
  const bounds=mesh.geometry.boundingBox;
  // Guardes: eliminar només els detalls propers als punts de la selecció.
  if(triangles!==expectedTriangles||bounds.min.z < -3.35||bounds.max.z > -2.55)
   throw Error('La geometria de '+name+' no coincideix amb el detall anotat');
  mesh.parent.remove(mesh);
  removedMeshes.push(name);
 }
 scene.userData.btr82RemovedFrontDetails={triangles:removed+70,removedMeshes,retainedRearTriangles:4};
 return scene.userData.btr82RemovedFrontDetails;
}
function inspect(scene){
 let triangles=0,meshes=0;const names=new Set();
 scene.traverse(o=>{
  if(!o.isMesh||!o.geometry)return;
  names.add(o.name);meshes++;
  triangles+=(o.geometry.index?.count??o.geometry.attributes.position?.count??0)/3;
 });
 return {triangles:Math.round(triangles),meshes,names};
}
async function check(blob){
 if(!blob||blob.size<20||blob.size>64*1024*1024)throw Error('GLB invàlid o massa gran');
 const view=new DataView(await blob.slice(0,12).arrayBuffer());
 if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||
    view.getUint32(8,true)!==blob.size)throw Error('El GLB 2.0 és incomplet');
 return blob;
}
function download(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);
}
export function createBtr82Studio({slots,loadUploadedGlb,setModel,metrics,isCurrent,notice}){
 let revision=0;
 const alive=(token,run)=>isCurrent(token)&&revision===run;
 function present(spec,scene,local=false){
  const slot=slots[spec.slot],stats=inspect(scene);
  if(!stats.names.has('BTR82_new_black_barrel')||
     !stats.names.has('BTR82_new_black_muzzle')||
     ![1,2,3,4].every(i=>stats.names.has('BTR82_front_headlight_'+i+'_lens')))
   throw Error('La variant '+spec.level+' ha perdut fars, torreta o canó');
  setModel(slot,scene,false,[],true);
  slot.bold.textContent=spec.title;
  const delta=spec.level?' · '+Math.round(100*(1-stats.triangles/baselineTriangles))+'% menys triangles':' · punt de partida';
  slot.sub.textContent='SIpriv · CC BY 4.0 · '+stats.triangles.toLocaleString('ca')+' △'+delta;
  slot.source.href=CREDIT;slot.source.hidden=spec.slot===0;
  slot.downloadBtr.hidden=true; // Models generats en memòria: no descarregar el GLB sense transformar.
  slot.status.textContent=metrics(slot.model)+(local?' · importat':' · Three.js + meshoptimizer');
  return stats.triangles;
 }
 let baselineTriangles=0;
 async function renderFromSource(source,token,run,local=false){
  const baseline=makeBaseline(source);
  baselineTriangles=inspect(baseline).triangles;
  if(!alive(token,run))return;
  let previous=baseline,last=baselineTriangles;
  present(PASSES[0],baseline,local);
  for(const [i,ratio] of LOD_RATIOS.entries()){
   if(!alive(token,run))return;
   slots[1].status.textContent='Calculant low-poly · pas '+(i+1)+' de 4…';
   const next=await reduceSurfaces(previous,ratio);
   if(!alive(token,run))return;
   const total=inspect(next).triangles;
   if(total>last)throw Error('La reducció '+(i+1)+' ha augmentat els triangles');
   previous=next;last=total;
  }
  const joinedGroups=repairMarkedRearSeams(previous);
  const cleanup=removeMarkedFrontDetails(previous);
  present(PASSES[1],previous,local);
  const repairs=joinedGroups.map(g=>g.group===1?'coberta superior: 1 trapezi (2 triangles)':'baixos: '+g.bridges+' unions locals').join(' · ');
  slots[1].status.textContent+=' · '+repairs+' · '+cleanup.triangles+' △ de detalls frontals eliminats';
  if(alive(token,run))notice.textContent=
   'BTR-82: original de treball intacte. Al low-poly, els sis punts del grup 1 defineixen una única peça trapezoidal de dos triangles per cobrir l’obertura superior posterior. El grup 2 conserva les unions locals anteriors dels baixos. S’han eliminat 88 triangles de detalls frontals assenyalats (sense retirar peces posteriors ni blindatge estructural). Activa l’editor per revisar el resultat.';
 }
 async function load(token){
  const run=++revision;
  for(const spec of PASSES)slots[spec.slot].status.textContent='Preparant BTR-82…';
  try{
   const response=await fetch(ASSET_DIR+BASE_FILE+'?rev='+BTR82_VERSION,{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const blob=await check(await response.blob());
   const gltf=await loadUploadedGlb(blob);
   if(alive(token,run))await renderFromSource(gltf.scene,token,run);
  }catch(error){
   if(alive(token,run)){
    const detail=error?.message||String(error);
    notice.textContent='No s’ha pogut completar la comparació: '+detail;
    for(const spec of PASSES)if(!slots[spec.slot].model)
     slots[spec.slot].status.textContent='Error: '+detail;
   }
  }
 }
 async function importGlb(blob,token,slotIndex){
  if(!PASSES.some(p=>p.slot===slotIndex))return;
  const run=++revision;
  try{
   await check(blob);
   const gltf=await loadUploadedGlb(blob);
   if(alive(token,run))await renderFromSource(gltf.scene,token,run,true);
  }catch(e){
   if(alive(token,run))notice.textContent='Error en importar la base: '+(e?.message||String(e));
  }
 }
 return {load,importGlb};
}
