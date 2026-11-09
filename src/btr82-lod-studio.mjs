// BTR-82 (SIpriv, CC BY 4.0): five source views, four REAL reductions.
// This module runs only in the existing 3D candidate studio, never in game.
import {SimplifyModifier} from 'three/addons/modifiers/SimplifyModifier.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
export const BTR82_RATIOS=Object.freeze([1,.75,.50,.25,.10]);
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
  const r=database.transaction('source','readonly').objectStore('source').get(KEY);
  r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>resolve(null);
 });
}
async function saveSource(blob){
 const database=await db();if(!database)return;
 await new Promise(resolve=>{
  try{
   const tx=database.transaction('source','readwrite');tx.objectStore('source').put(blob,KEY);
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
   header.getUint32(8,true)!==blob.size)throw Error('Capçalera GLB 2.0 o longitud incorrecta');
 return blob;
}
function countTriangles(root){
 let n=0;root.traverse(o=>{if(o.isMesh&&o.geometry)n+=
  (o.geometry.getIndex()?.count??o.geometry.getAttribute('position')?.count??0)/3});
 return Math.round(n);
}
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
async function simplify(source,ratio,isValid){
 const root=source.clone(true),modifier=new SimplifyModifier();
 let modified=0,skipped=0;const meshes=[];
 root.traverse(x=>{if(x.isMesh)meshes.push(x)});
 for(const mesh of meshes){
  if(!isValid())return null;
  const geo=mesh.geometry,pos=geo?.getAttribute('position');
  if(!pos)continue;
  const triangles=(geo.getIndex()?.count??pos.count)/3;
  if(mesh.isSkinnedMesh||Array.isArray(mesh.material)||geo.groups?.length>1||
    Object.values(geo.morphAttributes||{}).some(a=>a?.length)||triangles<12){
   skipped++;continue;
  }
  try{
   // Vendored Three.js r186 SimplifyModifier uses meshoptimizer, preserving
   // normals, UVs, material and mesh hierarchy whenever it can.
   const output=await modifier.modify(geo,Math.round(pos.count*(1-ratio)));
   const newTris=(output.getIndex()?.count??output.getAttribute('position')?.count??0)/3;
   if(newTris>0&&newTris<triangles){
    output.userData.candidateSimplified=true;mesh.geometry=output;modified++;
   }else{output.dispose();skipped++}
  }catch(e){console.warn('BTR-82 primitive kept intact',mesh.name,e);skipped++}
 }
 return {root,modified,skipped};
}
export function createBtr82Studio({slots,loadUploadedGlb,setModel,metrics,isCurrent,showOfficial,notice}){
 let cached=null;
 const live=token=>isCurrent(token);
 function resetButtons(){
  for(const slot of slots.slice(1)){slot.downloadBtr.hidden=true;slot.downloadBtr.onclick=null}
 }
 function linkDownload(slot,i,blob){
  const pct=Math.round(BTR82_RATIOS[i-1]*100);
  slot.downloadBtr.hidden=false;
  slot.downloadBtr.onclick=async()=>{
   slot.downloadBtr.disabled=true;
   try{
    if(i===1){download(blob,'btr82-original.glb');return}
    if(!slot.model?.children?.[0])throw Error('No hi ha model reduït');
    slot.status.textContent='Exportant '+pct+'% a GLB…';
    const buffer=await new GLTFExporter().parseAsync(slot.model.children[0],
     {binary:true,maxTextureSize:2048,onlyVisible:true,includeCustomExtensions:false});
    const output=new Blob([buffer],{type:'model/gltf-binary'});
    download(output,'btr82-lod-'+pct+'.glb');
    slot.status.textContent=metrics(slot.model)+' · exportat ('+(output.size/1048576).toFixed(2)+' MiB)';
   }catch(e){slot.status.textContent='Error exportant el '+pct+'%: '+String(e?.message||e)}
   finally{slot.downloadBtr.disabled=false}
  };
 }
 async function load(token,uploaded=null){
  resetButtons();
  const blob=uploaded||cached||await readSource()||await repoSource();
  if(!live(token))return;
  if(!blob){
   for(let i=1;i<slots.length;i++){
    const slot=slots[i],pct=Math.round(BTR82_RATIOS[i-1]*100);
    slot.bold.textContent='BTR-82 · '+pct+'%';setReference(slot,'esperant el GLB');
    slot.status.textContent=i===1?'Importa el GLB original (o publica’l a GitHub) per activar les reduccions.':
     'Disponible quan s’importi el GLB original.';
   }
   await showOfficial(token);
   if(live(token))notice.textContent='Low Poly BTR 82 seleccionat. Importa el GLB per generar quatre reduccions reals: 75, 50, 25 i 10%.';
   return;
  }
  try{
   await verify(blob);
   const gltf=await loadUploadedGlb(blob);
   if(!live(token))return;
   const original=gltf.scene.clone(true),initial=countTriangles(original);
   if(!initial)throw Error('GLB sense geometria triangulada');
   cached=blob;
   if(uploaded)await saveSource(blob);
   if(!live(token))return;
   const slot=slots[1];
   slot.bold.textContent='BTR-82 · 100%';setReference(slot,initial.toLocaleString('ca')+' triangles originals');
   setModel(slot,gltf.scene,false,gltf.animations);
   slot.status.textContent=metrics(slot.model)+' · GLB original';
   linkDownload(slot,1,blob);
   notice.textContent='GLB carregat. Generant quatre reduccions amb el meshoptimizer del joc…';
   for(let i=2;i<slots.length;i++){
    if(!live(token))return;
    const s=slots[i],ratio=BTR82_RATIOS[i-1],pct=Math.round(ratio*100);
    s.bold.textContent='BTR-82 · '+pct+'%';
    setReference(s,'objectiu '+pct+'%');
    s.status.textContent='Simplificant '+pct+'%…';
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const result=await simplify(original,ratio,()=>live(token));
    if(!result||!live(token))return;
    setModel(s,result.root,false,gltf.animations);
    const actual=countTriangles(result.root);
    s.status.textContent=metrics(s.model)+' · '+(actual/initial*100).toFixed(1)+'% real · '+result.modified+' malles';
    linkDownload(s,i,blob);
   }
   if(live(token))notice.textContent='BTR-82: original + quatre reduccions acabades (75, 50, 25, 10%). Les càmeres comparteixen orientació i escala; encara no s’ha integrat al joc.';
  }catch(e){
   if(live(token)){
    slots[1].status.textContent='Error BTR-82: '+String(e?.message||e);
    notice.textContent='No s’ha pogut carregar o reduir el GLB. Revisa el fitxer original.';
   }
  }
 }
 return {load,async importGlb(file,token){
  try{await verify(file);cached=null;await load(token,file)}
  catch(e){if(live(token))notice.textContent='Error fitxer BTR-82: '+String(e?.message||e)}
 }};
}
