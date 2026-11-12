import * as THREE from '../vendor/three-r186.module.mjs';
import {symmetrizeModel} from './vehicle-live-geometry.mjs';
export const LAB_REVISION='live-editor-20261112-side-access-2';
const clone=root=>{const copy=root.clone(true),overlays=[];copy.traverse(o=>{if(o.userData.vehicleAnnotationOverlay)overlays.push(o)});for(const o of overlays)o.removeFromParent();return copy};
const pathOf=(root,node)=>{const path=[];while(node&&node!==root){path.unshift(node.parent.children.indexOf(node));node=node.parent}return path};
const atPath=(root,path)=>path.reduce((node,i)=>node?.children[i],root);
const storageKey='hunter-model-requests-v1';

export function createVehicleLiveEditor({slots,getType,annotations,getView,restoreView,reload,onChange=()=>{},resumeSelection=null}){
 const $=id=>document.getElementById(id),panel=$('liveEditor'),status=$('liveStatus');
 const states=new WeakMap();let selected=null,path=[],queue=[],typing=null,restoring=false;
 try{queue=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(queue))queue=[]}catch{}
 const say=text=>status.textContent=text;
 const state=slot=>states.get(slot);
 const node=()=>selected&&atPath(selected.model,path);
 function saveQueue(){try{localStorage.setItem(storageKey,JSON.stringify(queue));return true}catch{say('No s’ha pogut desar la cua. Copia-la abans de sortir.');return false}}
 function renderQueue(){
  $('liveQueue').replaceChildren();
  for(const item of queue){
   const row=document.createElement('div'),text=document.createElement('span'),button=document.createElement('button');
   text.textContent=item.status+' · '+item.vehicle+' · '+item.text;
   button.textContent=item.status==='pendent'?'Marcar resolta':'Reobrir';
   button.onclick=()=>{item.status=item.status==='pendent'?'resolta':'pendent';saveQueue();renderQueue()};
   row.append(text,button);$('liveQueue').append(row);
  }
 }
 function modelOptions(){
  const select=$('liveModel');select.replaceChildren();
  slots.forEach((slot,i)=>{if(slot.model&&!slot.outer.hidden){const option=new Option(slot.bold.textContent,String(i));select.add(option)}});
  if(selected)select.value=String(slots.indexOf(selected));
 }
 function endCompare(){
  if(selected){const s=state(selected);s?.original.removeFromParent();if(selected.model)selected.model.visible=true}
  $('liveOriginal').checked=false;panel.querySelector('.live-fields').inert=false;
 }
 function parts(){
  const select=$('livePart');select.replaceChildren(new Option('Model complet','[]'));
  if(!selected)return;
  const visit=(object,prefix=[],depth=0)=>{
   object.children.forEach((child,i)=>{
    if(child.userData.vehicleAnnotationOverlay)return;
    const p=[...prefix,i];select.add(new Option('· '.repeat(depth)+(child.name|| (child.isMesh?'Malla':'Grup'))+' ['+p.join('.')+']',JSON.stringify(p)));
    visit(child,p,depth+1);
   });
  };visit(selected.model);
  if(!atPath(selected.model,path))path=[];
  select.value=JSON.stringify(path);syncInputs();
 }
 function syncInputs(){
  const object=node(),s=selected&&state(selected);
  panel.querySelectorAll('[data-transform],#liveColor,#liveSymmetry,#liveApprove,#liveExport').forEach(el=>el.disabled=!object);
  $('liveUndo').disabled=!s?.undo.length;$('liveRedo').disabled=!s?.redo.length;
  if(!object)return;
  for(const el of panel.querySelectorAll('[data-transform]')){
   const [prop,axis]=el.dataset.transform.split('.');
   el.value=Number((object[prop][axis]*(prop==='rotation'?180/Math.PI:1)).toFixed(4));
  }
  const mesh=object.isMesh?object:(()=>{let first;object.traverse(o=>{if(!first&&o.isMesh)first=o});return first})();
  const mat=Array.isArray(mesh?.material)?mesh.material[0]:mesh?.material;
  $('liveColor').value='#'+(mat?.color?.getHexString()||'888888');
 }
 function remember(){
  if(!selected)return;
  annotations.detach();
  const s=state(selected);s.undo.push(clone(selected.model));s.redo=[];
  if(s.undo.length>20)s.undo.shift();
  s.dirty=true;s.approved=false;
 }
 function replace(slot,model){endCompare();slot.model.removeFromParent();slot.model=model;slot.scene.add(model);slot.mixer=null;}
 function finish(text){
  selected.model.updateMatrixWorld(true);onChange(selected);syncInputs();say(text);scheduleDraft();
 }
 function restore(direction){
  if(!selected)return;typing=null;
  const s=state(selected),from=s[direction],to=s[direction==='undo'?'redo':'undo'];
  if(!from.length)return;
  annotations.detach();to.push(clone(selected.model));replace(selected,from.pop());s.dirty=true;s.approved=false;
  parts();finish(direction==='undo'?'Canvi desfet.':'Canvi refet.');
 }
 // IndexedDB keeps actual candidate geometry across refreshes, including imports.
 const dbPromise=new Promise((resolve,reject)=>{
  const request=indexedDB.open('hunter-live-models',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('drafts');
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
 dbPromise.catch(()=>say('Desament local no disponible; exporta el candidat abans de sortir.'));
 let timer=null;
 const key=slot=>getType()+':'+slots.indexOf(slot);
 async function writeDraft(slot){
  const s=state(slot);if(!s||!slot.model||restoring)return;
  const draftKey=key(slot);
  const data={revision:LAB_REVISION,model:(()=>{const copy=clone(slot.model);copy.visible=true;return copy.toJSON()})(),view:getView(),path:selected===slot?path:[],approved:s.approved};
  const db=await dbPromise;
  await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(data,draftKey);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
 }
 function scheduleDraft(){
  clearTimeout(timer);const slot=selected;
  timer=setTimeout(()=>writeDraft(slot).catch(()=>say('No s’ha pogut desar l’esborrany. Exporta el candidat.')),300);
 }
 async function ready(slot,{restore=true}={}){
  const expected=slot.model;
  states.set(slot,{undo:[],redo:[],original:clone(slot.model),dirty:false,approved:false});
  if(!selected||!selected.model){selected=slot;path=[]}
  if(resumeSelection?.slot===slots.indexOf(slot)){selected=slot;path=resumeSelection.path||[];resumeSelection=null}
  modelOptions();if(slot===selected)parts();
  try{
   const db=await dbPromise;
   const data=await new Promise((resolve,reject)=>{const req=db.transaction('drafts').objectStore('drafts').get(key(slot));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
   if(slot.model!==expected||!data||!restore)return;
   if(data.revision!==LAB_REVISION){say('Hi ha un esborrany anterior. «Recuperar esborrany» permet revisar-lo sobre aquesta versió.');return}
   applyDraft(slot,data);
  }catch{say('No s’ha pogut recuperar l’esborrany local.')}
 }
 function applyDraft(slot,data){
  const model=new THREE.ObjectLoader().parse(data.model);
  annotations.detach();restoring=true;replace(slot,model);
  const s=state(slot);s.dirty=true;s.approved=data.approved;s.undo.push(clone(s.original));
  selected=slot;path=data.path||[];restoreView(data.view);modelOptions();parts();restoring=false;
  say('Esborrany recuperat. Pots desfer per veure la versió publicada.');
 }
 $('liveRecover').onclick=async()=>{
  if(!selected)return;
  try{const slot=selected,db=await dbPromise;const data=await new Promise((resolve,reject)=>{const req=db.transaction('drafts').objectStore('drafts').get(key(slot));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});if(data&&slot===selected)applyDraft(slot,data);else say('No hi ha cap esborrany desat.')}
  catch{say('No s’ha pogut recuperar l’esborrany.')}
 };
 $('liveModel').onchange=()=>{typing=null;endCompare();selected=slots[Number($('liveModel').value)];path=[];parts()};
 $('livePart').onchange=()=>{typing=null;path=JSON.parse($('livePart').value);syncInputs()};
 for(const input of panel.querySelectorAll('[data-transform]')){
  input.addEventListener('input',()=>{
   const object=node();if(!object||input.value==='')return;
   const value=Number(input.value),[prop,axis]=input.dataset.transform.split('.');
   if(!Number.isFinite(value)||(prop==='scale'&&value<=0))return;
   if(typing!==input){remember();typing=input}
   object[prop][axis]=value*(prop==='rotation'?Math.PI/180:1);
   object.updateMatrix();selected.mixer=null;
   selected.model.updateMatrixWorld(true);onChange(selected);scheduleDraft();say('Canvi aplicat en directe.');
   $('liveUndo').disabled=false;$('liveRedo').disabled=true;
  });
  input.addEventListener('change',()=>{typing=null;syncInputs()});
 }
 $('liveColor').oninput=()=>{
  const object=node();if(!object)return;
  if(typing!==$('liveColor')){remember();typing=$('liveColor')}
  object.traverse(o=>{if(!o.isMesh||o.userData.vehicleAnnotationOverlay)return;
   const paint=m=>{const copy=m.clone();copy.color?.set($('liveColor').value);return copy};
   o.material=Array.isArray(o.material)?o.material.map(paint):paint(o.material);
  });finish('Color aplicat en directe.');
 };
 $('liveColor').onchange=()=>{typing=null};
 $('liveSymmetry').onclick=()=>{
  if(!selected)return;typing=null;
  // Prepare on a copy: failures cannot leave half of the model modified.
  try{
   annotations.detach();const candidate=clone(selected.model);
   symmetrizeModel(candidate,$('livePlane').value,Number($('liveSide').value),Number($('liveOffset').value));
   remember();replace(selected,candidate);parts();finish('Simetria aplicada al model complet. Desfer restaura l’original.');
  }catch(error){say(error.message)}
 };
 $('liveUndo').onclick=()=>restore('undo');$('liveRedo').onclick=()=>restore('redo');
 $('liveOriginal').onchange=()=>{
  const s=selected&&state(selected);if(!s)return;
  if($('liveOriginal').checked){selected.model.visible=false;s.original.visible=true;selected.scene.add(s.original)}
  else{selected.model.visible=true;s.original.removeFromParent()}
  panel.querySelector('.live-fields').inert=$('liveOriginal').checked;
 };
 function download(data,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 const candidate=()=>({format:'hunter-model-candidate-v1',revision:LAB_REVISION,vehicle:getType(),variant:selected?.bold.textContent,selection:path,model:selected?clone(selected.model).toJSON():null});
 $('liveExport').onclick=()=>{if(selected)download(candidate(),'hunter-'+getType()+'-candidat.json')};
 $('liveApprove').onclick=async()=>{
  if(!selected)return;state(selected).approved=true;
  try{await writeDraft(selected);download(candidate(),'hunter-'+getType()+'-aprovat.json');say('Candidat aprovat i exportat. Adjunta el fitxer al xat per integrar-lo al joc.')}
  catch{say('No s’ha pogut desar. Exporta el candidat abans de sortir.')}
 };
 $('liveImport').onchange=async e=>{
  const file=e.target.files?.[0];if(!file||!selected)return;
  try{const slot=selected,data=JSON.parse(await file.text());if(slot!==selected)return;
   if(data.format!=='hunter-model-candidate-v1'||data.vehicle!==getType())throw Error('El fitxer no correspon a aquest vehicle');
   const model=new THREE.ObjectLoader().parse(data.model);remember();replace(slot,model);path=[];parts();finish('Candidat importat.');
  }catch(error){say('Error: '+error.message)}finally{e.target.value=''}
 };
 $('liveEnqueue').onclick=()=>{
  const text=$('liveRequest').value.trim();if(!text)return;
  const object=node();queue.push({id:crypto.randomUUID(),status:'pendent',createdAt:new Date().toISOString(),revision:LAB_REVISION,vehicle:getType(),variant:selected?.bold.textContent,path:[...path],piece:object?.name||'Model complet',position:object?.position.toArray(),rotation:object?.rotation.toArray(),scale:object?.scale.toArray(),text,annotations:annotations.description()});
  const saved=saveQueue();renderQueue();if(saved){$('liveRequest').value='';say('Petició desada al navegador. Copia la cua al xat perquè la pugui aplicar.')}
 };
 $('liveCopy').onclick=async()=>{
  const text=JSON.stringify({format:'hunter-model-requests-v1',requests:queue.filter(x=>x.status==='pendent')},null,2);
  try{await navigator.clipboard.writeText(text);say('Cua copiada. Enganxa-la al xat.')}
  catch{$('liveRequest').value=text;$('liveRequest').focus();$('liveRequest').select();say('Copia el text seleccionat manualment.')}
 };
 $('liveShare').onclick=async()=>{
  const button=$('liveShare');button.disabled=true;
  try{
   const session=await fetch('/api/auth/get-session',{cache:'no-store'}).then(r=>r.json());
   if(!session?.user)throw Error('Inicia sessió amb el compte administrador des del menú Compte del joc.');
   const response=await fetch('/api/model-lab/queue',{method:'PUT',headers:{'Content-Type':'application/json','X-Hunter-User':session.user.id},body:JSON.stringify({revision:LAB_REVISION,requests:queue})});
   const data=await response.json();if(!response.ok)throw Error(data.message||'No s’ha pogut compartir');
   const link=document.createElement('a');link.href=data.url;link.textContent='Enllaç de lectura de la cua (7 dies)';link.target='_blank';link.rel='noopener';
   $('liveSharedLink').replaceChildren(link);say('Cua compartida. Passa aquest enllaç al xat; les actualitzacions conserven el mateix enllaç.');
  }catch(error){say(error.message)}finally{button.disabled=false}
 };
 $('liveDownloadQueue').onclick=()=>download({format:'hunter-model-requests-v1',requests:queue},'hunter-peticions-models.json');
 $('liveReload').onclick=async()=>{
  try{if(selected&&state(selected)?.dirty)await writeDraft(selected);await reload();say('Model publicat recarregat. L’esborrany queda disponible a «Recuperar esborrany».')}
  catch(error){say('No s’ha pogut recarregar: '+error.message)}
 };
 function reset(){
  endCompare();clearTimeout(timer);typing=null;
  for(const slot of slots){const s=state(slot);s?.original.removeFromParent();if(s?.dirty)writeDraft(slot).catch(()=>{});states.delete(slot)}
  selected=null;path=[];$('liveOriginal').checked=false;panel.querySelector('.live-fields').inert=false;
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&selected&&state(selected)?.dirty)writeDraft(selected).catch(()=>{})});
 renderQueue();syncInputs();
 return {ready,reset,getSelection:()=>({slot:slots.indexOf(selected),path:[...path]}),select(slot,object){if(!states.has(slot))return;endCompare();selected=slot;path=pathOf(slot.model,object);modelOptions();parts()},dirty:()=>slots.some(s=>state(s)?.dirty)};
}
