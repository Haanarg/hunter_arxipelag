import * as THREE from '../vendor/three-r186.module.mjs';
import {createTruckModel} from './truck-model.mjs';
// Low Poly BTR-82 by SIpriv (CC BY 4.0). Only two verified models in the
// candidate page: 5,371-triangle iteration base and corrected chosen 50%.
export const BTR82_VERSION='base25-truck-wheels-v1';
const URL='./assets/vehicle-candidates/tanqueta/';
const CREDIT='https://sketchfab.com/3d-models/low-poly-btr-82-6226acae68424d99bf03882b245ff7c5';
const MODELS=Object.freeze([
 {slot:1,file:'btr82-base-100.glb',triangles:5371,meshes:18,
  title:'BTR-82 · base Three.js 25%',detail:'Transformació de 5.371 triangles, sense canvis'},
 {slot:2,file:'btr82-50-repaired.glb',triangles:4581,meshes:25,
  title:'BTR-82 · base 25% + rodes del camió',detail:'Carrosseria i torreta originals de la reducció 25% · vuit rodes A4.3 del camió'}
]);
const requiredRepairs=['BTR82_repair_olive_armour_repaired',
 'BTR82_repair_olive_bevel_repaired','BTR82_repair_olive_inner_shell',
 'BTR82_repair_black_barrel_protrudes_into_turret',
 'BTR82_repair_headlight_housings_matte','BTR82_repair_headlight_lens_ivory'];
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
 function present(spec,blob,gltf,local=false){
  const slot=slots[spec.slot],stats=inspect(gltf.scene);
  if(spec.slot===1&&(stats.triangles!==spec.triangles||stats.meshes!==spec.meshes))
   throw Error('GLB inesperat: '+stats.triangles+' triangles i '+stats.meshes+' malles');
  if(false)for(const item of requiredRepairs)
   if(!stats.names.has(item))throw Error('Falta '+item);
  setModel(slot,gltf.scene,false,gltf.animations);
  slot.bold.textContent=spec.title;
  slot.sub.textContent='SIpriv · CC BY 4.0 · '+spec.detail;
  slot.source.href=CREDIT;slot.source.hidden=false;
  slot.status.textContent=metrics(slot.model)+(local?' · importat localment':' · GLB verificat a GitHub');
  slot.downloadBtr.hidden=spec.slot===2; // Variant construïda a Three.js: no descarregar el GLB base com si fos el resultat.
  slot.downloadBtr.onclick=()=>download(blob,spec.file);
 }
 async function load(token){
  const run=++revision;
  const results=await Promise.all(MODELS.map(async spec=>{
   const slot=slots[spec.slot];
   slot.status.textContent='Carregant '+spec.file+'…';
   try{
    const response=await fetch(URL+(spec.slot===2?'btr82-base-100.glb':spec.file)+'?rev='+BTR82_VERSION,{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status+' ('+spec.file+')');
    const blob=await check(await response.blob());
    const gltf=await loadUploadedGlb(blob);
    if(!alive(token,run))return false;
    if(spec.slot===2)gltf.scene=withTruckWheels(gltf.scene);
    present(spec,blob,gltf);return true;
   }catch(error){
    if(alive(token,run))slot.status.textContent='Error GLB: '+(error?.message||String(error));
    return false;
   }
  }));
  if(alive(token,run))notice.textContent=results.every(Boolean)?
   'Comparador BTR-82: base Three.js al 25% (5.371 triangles) i la mateixa geometria amb vuit rodes del camió A4.3. Sense reduccions noves ni canvis a la tanqueta jugable.':
   'No s’han pogut carregar els dos GLB. Recarrega el visor o comprova el desplegament.';
 }
 async function importGlb(blob,token,slotIndex){
  const spec=MODELS.find(m=>m.slot===slotIndex);if(!spec)return;
  const run=revision;
  try{
   await check(blob);const gltf=await loadUploadedGlb(blob);
   if(alive(token,run)){if(spec.slot===2)gltf.scene=withTruckWheels(gltf.scene);present(spec,blob,gltf,true)}
  }catch(e){
   if(alive(token,run))slots[slotIndex].status.textContent='Error GLB: '+(e?.message||String(e));
  }
 }
 return {load,importGlb};
}
