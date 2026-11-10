// Low Poly BTR-82 by SIpriv (CC BY 4.0). Only two verified models in the
// candidate page: 5,371-triangle iteration base and corrected chosen 50%.
export const BTR82_VERSION='corrected-50-body-wheels-lamps-v1';
const URL='./assets/vehicle-candidates/tanqueta/';
const CREDIT='https://sketchfab.com/3d-models/low-poly-btr-82-6226acae68424d99bf03882b245ff7c5';
const MODELS=Object.freeze([
 {slot:1,file:'btr82-base-100.glb',triangles:5371,meshes:18,
  title:'BTR-82 · base original 100%',detail:'Antic 25% · referència de 5.371 triangles'},
 {slot:2,file:'btr82-50-repaired.glb',triangles:3671,meshes:23,
  title:'BTR-82 · 50% escollit i corregit',detail:'Casc reparat · 8 rodes tancades · 4 fars visibles'}
]);
const requiredRepairs=['hull_continuous_roof_liner','hull_continuous_side_liners',
 'eight_closed_wheel_hubs','auxiliary_headlamp_housings_2','auxiliary_front_headlamps_2'];
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
  if(stats.triangles!==spec.triangles||stats.meshes!==spec.meshes)
   throw Error('GLB inesperat: '+stats.triangles+' triangles i '+stats.meshes+' malles');
  if(spec.slot===2)for(const item of requiredRepairs)
   if(!stats.names.has(item))throw Error('Falta '+item);
  setModel(slot,gltf.scene,false,gltf.animations);
  slot.bold.textContent=spec.title;
  slot.sub.textContent='SIpriv · CC BY 4.0 · '+spec.detail;
  slot.source.href=CREDIT;slot.source.hidden=false;
  slot.status.textContent=metrics(slot.model)+(local?' · importat localment':' · GLB verificat a GitHub');
  slot.downloadBtr.hidden=false;
  slot.downloadBtr.onclick=()=>download(blob,spec.file);
 }
 async function load(token){
  const run=++revision;
  const results=await Promise.all(MODELS.map(async spec=>{
   const slot=slots[spec.slot];
   slot.status.textContent='Carregant '+spec.file+'…';
   try{
    const response=await fetch(URL+spec.file+'?rev='+BTR82_VERSION,{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status+' ('+spec.file+')');
    const blob=await check(await response.blob());
    const gltf=await loadUploadedGlb(blob);
    if(!alive(token,run))return false;
    present(spec,blob,gltf);return true;
   }catch(error){
    if(alive(token,run))slot.status.textContent='Error GLB: '+(error?.message||String(error));
    return false;
   }
  }));
  if(alive(token,run))notice.textContent=results.every(Boolean)?
   'Només dos BTR-82: base 5.371 triangles i 50% reparat de 3.671. Casc, vuit rodes i quatre fars. Sense canvis al vehicle jugable.':
   'No s’han pogut carregar els dos GLB. Recarrega el visor o comprova el desplegament.';
 }
 async function importGlb(blob,token,slotIndex){
  const spec=MODELS.find(m=>m.slot===slotIndex);if(!spec)return;
  const run=revision;
  try{
   await check(blob);const gltf=await loadUploadedGlb(blob);
   if(alive(token,run))present(spec,blob,gltf,true);
  }catch(e){
   if(alive(token,run))slots[slotIndex].status.textContent='Error GLB: '+(e?.message||String(e));
  }
 }
 return {load,importGlb};
}
