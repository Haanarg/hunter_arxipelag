// BTR-82 SIpriv (CC BY 4.0): source + four independently rendered LODs.
// Importing a 5/4/3/2% GLB NEVER re-simplifies that GLB as a new original.
import {BTR82_RATIOS,BTR82_GOAL,buildBtr82Lod,countBtrTriangles,countBtrMeshes,normalizeBtr82Glb}
 from './btr82-aggressive-simplification.mjs';
import {classifyBtr82Upload} from './btr82-upload-policy.mjs';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

export const BTR82_ID='6226acae68424d99bf03882b245ff7c5';
export const BTR82_URL='./assets/vehicle-candidates/tanqueta/btr82-original.glb';
const MAX_BYTES=64*1024*1024,KEY='source:'+BTR82_ID;
let dbPending=null;
function db(){
 if(dbPending)return dbPending;
 if(typeof indexedDB==='undefined')return dbPending=Promise.resolve(null);
 return dbPending=new Promise(resolve=>{
  try{
   const r=indexedDB.open('hunter-btr82-lod-v1',1);
   r.onupgradeneeded=()=>r.result.createObjectStore('source');
   r.onsuccess=()=>resolve(r.result);
   r.onerror=()=>resolve(null);
   r.onblocked=()=>resolve(null);
  }catch{resolve(null)}
 });
}
async function readSource(){
 const database=await db();if(!database)return null;
 return new Promise(resolve=>{
  try{
   const r=database.transaction('source','readonly').objectStore('source').get(KEY);
   r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>resolve(null);
  }catch{resolve(null)}
 });
}
async function saveSource(blob){
 const database=await db();if(!database)return;
 await new Promise(resolve=>{
  try{
   const tx=database.transaction('source','readwrite');
   tx.objectStore('source').put(blob,KEY);
   tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();
  }catch{resolve()}
 });
}
async function repoSource(){
 try{
  const r=await fetch(BTR82_URL,{cache:'no-store'});
  if(r.ok)return await r.blob();
 }catch{}
 return null;
}
async function verify(blob){
 if(!blob||blob.size<20||blob.size>MAX_BYTES)throw Error('Cal un GLB complet de fins a 64 MiB');
 const header=new DataView(await blob.slice(0,12).arrayBuffer());
 if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2||
   header.getUint32(8,true)!==blob.size)
  throw Error('Capçalera GLB 2.0 o longitud incorrecta');
 return blob;
}
const countTriangles=countBtrTriangles;
function download(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function setReference(slot,text){
 slot.source.href='https://sketchfab.com/3d-models/low-poly-btr-82-'+BTR82_ID;
 slot.source.hidden=false;
 slot.sub.textContent='SIpriv · CC BY 4.0 · '+text;
}
// The original exported by Sketchfab carries the correct indexed PNG palette.
// Old OFFLINE LODs accidentally stored palette indexes as RGB (0–16) and
// alpha as 0 or 1 instead of 0 or 255. Share the original PBR materials by
// name (UVs match), rather than showing an invisible alpha-tested object.
function originalMaterialMap(scene){
 const map=new Map();
 scene?.traverse(o=>{
  if(!o.isMesh)return;
  for(const mat of Array.isArray(o.material)?o.material:[o.material]){
   if(mat?.name&&!map.has(mat.name))map.set(mat.name,mat);
  }
 });
 return map;
}
function restoreSourceMaterials(scene,sourceScene){
 if(!sourceScene)return false;
 const originals=originalMaterialMap(sourceScene);let replaced=0;
 scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const list=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const materials=list.map(mat=>{
   const source=originals.get(mat?.name);
   if(source){replaced++;return source}
   return mat;
  });
  mesh.material=Array.isArray(mesh.material)?materials:materials[0];
 });
 return replaced>0;
}
// Solid-color compatibility fallback for old, corrupted LODs imported BEFORE
// the 100% source. Their pixel values are not recoverable without the source.
function fallbackColors(scene){
 const palette=[0x626d55,0x525a54,0x404843,0x5f684f,0x777c69,
  0x9b9b84,0x555d58,0x77836d,0x4f5950,0x20252a];let changes=0;
 scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const clean=mats.map(material=>{
   if(!material)return material;
   const mat=material.clone();
   const id=Number((mat.name||'').match(/material_(\d+)/)?.[1]);
   mat.map=null;mat.alphaMap=null;
   mat.color.setHex(palette[Number.isInteger(id)?id%palette.length:0]);
   mat.transparent=false;mat.opacity=1;mat.alphaTest=0;
   mat.depthWrite=true;mat.needsUpdate=true;changes++;return mat;
  });
  mesh.material=Array.isArray(mesh.material)?clean:clean[0];
 });
 return changes;
}
export function createBtr82Studio({slots,loadUploadedGlb,setModel,metrics,isCurrent,showOfficial,notice}){
 let cached=null,sourceScene=null,revision=0;
 const valid=(token,run)=>isCurrent(token)&&revision===run;
 function resetButtons(){
  for(const slot of slots.slice(1)){
   slot.downloadBtr.hidden=true;slot.downloadBtr.onclick=null;
  }
 }
 function linkDownload(slot,index,blob){
  const pct=Math.round(BTR82_RATIOS[index-1]*100);
  slot.downloadBtr.hidden=false;
  slot.downloadBtr.onclick=async()=>{
   slot.downloadBtr.disabled=true;
   try{
    if(index===1){download(blob,'btr82-original.glb');return}
    if(!slot.model?.children?.[0])throw Error('No hi ha una malla simplificada');
    slot.status.textContent='Exportant '+pct+'% a GLB…';
    const buffer=await new GLTFExporter().parseAsync(slot.model.children[0],
     {binary:true,maxTextureSize:2048,onlyVisible:true,includeCustomExtensions:false});
    const output=new Blob([buffer],{type:'model/gltf-binary'});
    download(output,'btr82-lod-'+pct+'.glb');
    slot.status.textContent=metrics(slot.model)+' · exportat ('+(output.size/1048576).toFixed(2)+' MiB)';
   }catch(e){slot.status.textContent='Error exportant '+pct+'%: '+String(e?.message||e)}
   finally{slot.downloadBtr.disabled=false}
  };
 }
 function linkRawDownload(slot,blob,name){
  slot.downloadBtr.hidden=false;
  slot.downloadBtr.onclick=()=>download(blob,name);
 }
 async function load(token,uploaded=null){
  const run=++revision;
  resetButtons();
  const blob=uploaded||cached||await readSource()||await repoSource();
  if(!valid(token,run))return;
  if(!blob){
   for(let i=1;i<slots.length;i++){
    const slot=slots[i],pct=Math.round(BTR82_RATIOS[i-1]*100);
    slot.bold.textContent='BTR-82 · '+pct+'%';setReference(slot,'esperant GLB');
    slot.status.textContent=i===1?'Importa aquí el GLB original per generar els quatre nivells.':
     'Pots importar directament el GLB reduït d’aquest nivell.';
   }
   await showOfficial(token);
   if(valid(token,run))notice.textContent='BTR-82: importa l’original 100% per calcular 5/4/3/2%, o importa directament els GLB reduïts a les seves targetes.';
   return;
  }
  try{
   await verify(blob);
   const compatible=await normalizeBtr82Glb(blob);
   const gltf=await loadUploadedGlb(compatible);
   if(!valid(token,run))return;
   const original=gltf.scene.clone(true),initial=countTriangles(original),
    initialMeshes=countBtrMeshes(original);
   if(initial<6000||initialMeshes<90)
    throw Error('Aquest no és el BTR-82 original: importa’l a la targeta del nivell reduït.');
   cached=blob;sourceScene=original;
   if(uploaded)await saveSource(blob);
   if(!valid(token,run))return;
   const slot=slots[1];
   slot.bold.textContent='BTR-82 · original 100%';
   setReference(slot,initial.toLocaleString('ca')+' triangles originals');
   setModel(slot,gltf.scene,false,gltf.animations);
   slot.status.textContent=metrics(slot.model)+' · '+initialMeshes+' malles originals';
   linkDownload(slot,1,blob);
   notice.textContent='Original: '+initial.toLocaleString('ca')+' triangles, '+initialMeshes+' malles. Generant 5%, 4%, 3% i 2%…';
   let previous=initial;
   for(let i=2;i<slots.length;i++){
    if(!valid(token,run))return;
    const s=slots[i],ratio=BTR82_RATIOS[i-1],pct=Math.round(ratio*100);
    s.bold.textContent='BTR-82 · '+pct+'%';
    setReference(s,'objectiu '+pct+'%');
    s.status.textContent='Calculant la simplificació del '+pct+'%…';
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const result=await buildBtr82Lod(original,ratio,{isCurrent:()=>valid(token,run)});
    if(!result||!valid(token,run))return;
    const actual=countTriangles(result),meshCount=countBtrMeshes(result);
    if(actual>=initial*.7||meshCount>=initialMeshes){
     s.status.textContent='Error: reducció inefectiva ('+actual+' triangles, '+meshCount+' malles).';
     console.error('BTR-82: la reducció ha retornat massa geometria',{pct,actual,meshCount});
     continue; // Don't display the source again and claim it's 5%!
    }
    setModel(s,result,false,[]);
    s.status.textContent=metrics(s.model)+' · '+(actual/initial*100).toFixed(1)+
     '% real · '+meshCount+' malles (abans '+initialMeshes+')'+
     (actual<=BTR82_GOAL?' · ≤3.000 △':' · >3.000 △')+
     (actual>=previous?' · atenció: no millora el nivell anterior':'');
    previous=Math.min(previous,actual);
    linkDownload(s,i,blob);
   }
   if(valid(token,run))notice.textContent='Reduccions generades amb meshoptimizer. Cada targeta mostra triangles i malles reals; els GLB reduïts importats NO es tornen a simplificar.';
  }catch(e){
   if(valid(token,run)){
    slots[1].status.textContent='Error amb el BTR-82 original: '+String(e?.message||e);
    notice.textContent='No s’ha pogut generar el LOD: '+String(e?.message||e);
   }
  }
 }
 async function importLod(file,token,slotIndex,policy,gltf){
  const run=++revision;
  const slot=slots[policy.slot];
  const restored=restoreSourceMaterials(gltf.scene,sourceScene);
  // These four legacy filenames identify the badly exported ZIP of 2026-11-09.
  const oldCorrupt=/^btr82-[2345]pct\.glb$/i.test(file.name||'');
  const emergency=oldCorrupt&&!restored&&fallbackColors(gltf.scene)>0;
  if(!valid(token,run))return;
  const triangles=countTriangles(gltf.scene),meshes=countBtrMeshes(gltf.scene);
  slot.bold.textContent='BTR-82 · '+policy.percent+'% · importat';
  setReference(slot,triangles.toLocaleString('ca')+' triangles · fitxer extern');
  setModel(slot,gltf.scene,false,gltf.animations);
  slot.status.textContent=metrics(slot.model)+' · GLB carregat directament'+
   (emergency?' · colors provisionals':restored?' · textures originals restaurades':'');
  linkRawDownload(slot,file,file.name||('btr82-'+policy.percent+'pct.glb'));
  notice.textContent='Variant '+policy.percent+'% importada directament: '+
   triangles.toLocaleString('ca')+' triangles, '+meshes+' malles. '+
   (emergency?'El GLB antic tenia la paleta d’imatges defectuosa; importa els GLB corregits per recuperar els colors.':
    'La resta de targetes no s’han modificat.');
 }
 return {
  load,
  async importGlb(file,token,slotIndex=1){
   try{
    await verify(file);
    const compatible=await normalizeBtr82Glb(file);
    const gltf=await loadUploadedGlb(compatible);
    if(!isCurrent(token))return;
    const triangles=countTriangles(gltf.scene),meshes=countBtrMeshes(gltf.scene);
    const policy=classifyBtr82Upload({name:file.name,triangles,meshes,targetSlot:slotIndex});
    if(policy.kind==='source'){
     cached=null;
     await load(token,file);
    }else await importLod(file,token,slotIndex,policy,gltf);
   }catch(e){
    if(isCurrent(token))notice.textContent='Error important GLB: '+String(e?.message||e);
   }
  }
 };
}
