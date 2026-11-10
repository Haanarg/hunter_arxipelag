import * as THREE from '../vendor/three-r186.module.mjs';
import {createTruckModel} from './truck-model.mjs';
import {SimplifyModifier} from 'three/addons/modifiers/SimplifyModifier.js';
// Low Poly BTR-82 by SIpriv (CC BY 4.0): base Three.js al 25%.
 // El punt de partida de les quatre reduccions és la variant actual amb
 // vuit rodes del camió A4.3 i canó negre cilíndric, NO el GLB original.
export const BTR82_VERSION='base25-sealed-side-rear-v2';
const ASSET_DIR='./assets/vehicle-candidates/tanqueta/';
const BASE_FILE='btr82-base-100.glb';
const CREDIT='https://sketchfab.com/3d-models/low-poly-btr-82-6226acae68424d99bf03882b245ff7c5';
const PASSES=Object.freeze([
 {slot:0,level:0,title:'Base · rodes A4.3 i canó nou',ratio:0},
 {slot:1,level:1,title:'Iteració 1 · detalls fins',ratio:.18},
 {slot:2,level:2,title:'Iteració 2 · superfícies',ratio:.22},
 {slot:3,level:3,title:'Iteració 3 · xassís',ratio:.27},
 {slot:4,level:4,title:'Iteració 4 · low-poly',ratio:.32}
]);
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
   ['housing',.154,.075,-5.12,housing],['lens',.112,.042,-5.18,lens]]){
   const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,10),mat);
   mesh.name='BTR82_front_headlight_'+(i+1)+'_'+part;
   mesh.rotation.x=Math.PI/2;
   mesh.position.set(x,.54,z);
   mesh.castShadow=true;mesh.receiveShadow=true;
   scene.add(mesh);
  }
 }
 scene.userData.btr82Headlights=4;
 return scene;
}

function sealArmourPanels(scene){
 // Peces de tancament afegides a la base abans de les simplificacions.
 // Tots els tancaments utilitzen superfícies contínues (no meitats separades),
 // amb les vores lleugerament encavalcades sobre el casc existent.
 const armor=new THREE.MeshStandardMaterial({
  color:0x626d49,roughness:.93,metalness:.05,side:THREE.DoubleSide
 });
 const underside=new THREE.MeshStandardMaterial({
  color:0x48523d,roughness:.97,metalness:.02,side:THREE.DoubleSide
 });
 const makeSurface=(name,vertices,faces,material)=>{
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));
  geometry.setIndex(faces.flat());
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  scene.add(mesh);
  return mesh;
 };
 // Coberta lateral esquerra i dreta: tira contínua entre el sostre i
 // l'espatlla de les rodes. La inclinació segueix la silueta de la carrosseria.
 // La base actual conté forats entre fragments del GLB; les tirades
 // encavalquen les vores per evitar que hi aparegui el fons.
 for(const side of [-1,1]){
  const profile=[
   [-4.78,1.18,1.73,2.04],
   [-3.70,1.22,1.79,2.15],
   [-1.90,1.20,1.81,2.15],
   [  .10,1.20,1.81,2.15],
   [ 2.15,1.19,1.80,2.12],
   [ 4.35,1.16,1.73,2.01],
   [ 5.56,1.11,1.48,1.86]
  ];
  const vertices=[];
  for(const [z,yLow,xLow,yHigh] of profile){
   vertices.push([side*xLow,yLow,z],[side*1.53,yHigh,z]);
  }
  const faces=[];
  for(let i=0;i<profile.length-1;i++){
   const k=i*2;
   if(side===1)faces.push([k,k+2,k+1],[k+1,k+2,k+3]);
   else faces.push([k+1,k+2,k],[k+3,k+2,k+1]);
  }
  makeSurface('BTR82_sealed_side_cover_'+(side<0?'left':'right'),vertices,faces,armor);
 }
 // Coberta posterior: UNA sola superfície que travessa l'eix central
 // des d'una espatlla fins a l'altra, sense junta al mig.
 makeSurface('BTR82_unified_rear_upper_cover',[
  [-1.58,2.04,3.78],[0,2.09,3.78],[1.58,2.04,3.78],
  [-1.73,1.88,5.49],[0,1.94,5.62],[1.73,1.88,5.49],
  [-1.72,1.54,5.78],[0,1.57,5.83],[1.72,1.54,5.78]
 ],[[0,3,1],[1,3,4],[1,4,2],[2,4,5],
    [3,6,4],[4,6,7],[4,7,5],[5,7,8]],armor);
 // Baixos posteriors: una sola peça transversal que uneix els dos costats;
 // la llengüeta inferior i la paret posterior comparteixen vèrtexs.
 makeSurface('BTR82_unified_rear_underside',[
  [-1.65,.92,4.95],[0,.92,4.95],[1.65,.92,4.95],
  [-1.67,.26,5.61],[0,.26,5.61],[1.67,.26,5.61],
  [-1.67,.12,5.84],[0,.12,5.84],[1.67,.12,5.84],
  [-1.62,1.01,5.86],[0,1.01,5.86],[1.62,1.01,5.86]
 ],[[0,3,1],[1,3,4],[1,4,2],[2,4,5],
    [3,6,4],[4,6,7],[4,7,5],[5,7,8],
    [6,9,7],[7,9,10],[7,10,8],[8,10,11]],underside);
 scene.userData.btr82SealedPanels=4;
 return scene;
}

function makeBaseline(original){
 const base=installFourHeadlights(sealArmourPanels(replaceBarrelWithCylinders(withTruckWheels(original))));
 const lights=[];
 base.traverse(o=>{if(o.name.endsWith('_lens')&&o.name.startsWith('BTR82_front_headlight_'))lights.push(o)});
 if(lights.length!==4||!base.getObjectByName('BTR82_new_black_barrel')||
    !base.getObjectByName('BTR82_unified_rear_upper_cover')||
    !base.getObjectByName('BTR82_unified_rear_underside'))
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
 if(result.getObjectByName('BTR82_new_black_barrel')===undefined||
    !result.getObjectByName('BTR82_front_headlight_4_lens')||
    !result.getObjectByName('BTR82_unified_rear_upper_cover')||
    !result.getObjectByName('BTR82_unified_rear_underside'))
  throw Error('La simplificació ha perdut un detall identificatiu');
 return result;
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
     ![1,2,3,4].every(i=>stats.names.has('BTR82_front_headlight_'+i+'_lens'))||
     !stats.names.has('BTR82_unified_rear_upper_cover')||
     !stats.names.has('BTR82_unified_rear_underside'))
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
  for(const spec of PASSES.slice(1)){
   if(!alive(token,run))return;
   const slot=slots[spec.slot];
   slot.status.textContent='Simplificant superfícies · iteració '+spec.level+' de 4…';
   const next=await reduceSurfaces(previous,spec.ratio);
   if(!alive(token,run))return;
   const total=inspect(next).triangles;
   if(total>last)throw Error('La iteració '+spec.level+' ha augmentat els triangles');
   present(spec,next,local);
   previous=next;last=total;
  }
  if(alive(token,run))notice.textContent=
   'BTR-82: costats i cobertes posteriors tancats en peces contínues, canó allargat fins a la torreta i quatre fars sota el morro; vuit rodes A4.3 i quatre reduccions acumulatives de superfícies (meshoptimizer). Les xifres de triangles són reals. La tanqueta jugable no canvia.';
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
