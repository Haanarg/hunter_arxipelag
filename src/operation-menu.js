let operationStore=null,operationMenuSerial=0,operationWritePromise=null,operationAutosave=null;
function waitOperationWrite(){return operationWritePromise?operationWritePromise.catch(()=>{}):Promise.resolve()}
function persistOperation(snapshot){
  if(operationWritePromise)throw new Error('Ja hi ha un desament en curs.');
  const owner=operationRegistry;
  const task=getOperationStore().save(snapshot,{expectedRevision:snapshot.revision}).then(saved=>{
    if(owner===operationRegistry)activeOperation=saved;
    accountCloud?.enqueue(saved).catch(()=>{});return saved;
  });
  operationWritePromise=task;task.then(()=>{if(operationWritePromise===task)operationWritePromise=null},()=>{if(operationWritePromise===task)operationWritePromise=null});
  return task;
}
function requestOperationAutosave(reason,options){return operationAutosave?.request(reason,options)}
function setOperationAutosave(enabled){
  operationAutosave?.setEnabled(enabled);try{localStorage.setItem('hunter.autosave.enabled',String(!!enabled))}catch(_){}
}
function initializeOperationAutosave(){
  operationAutosave=window.HUNTER_AUTOSAVE.create({time:()=>elapsed,
    eligible:()=>!!started&&!over&&!generationPromise&&!seedSearchMode&&!operationBusy&&!operationWritePromise&&!!operationRegistry&&!playerFall&&!playerEject&&!grenades.length&&!pl.userData.grenadePending,
    capture:()=>captureOperation(),write:persistOperation,status:text=>{
      const el=document.getElementById('operationAutosaveStatus');if(el)el.textContent=text;
      if(text.startsWith('No s’ha')||text.startsWith('Una altra')){msg=text;msgT=6;}
    }});
  try{operationAutosave.setEnabled(localStorage.getItem('hunter.autosave.enabled')!=='false')}catch(_){}
  const background=()=>{if(started&&!over)requestOperationAutosave('background',{urgent:true})};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)background()});
  addEventListener('pagehide',background);addEventListener('blur',background);
}
function getOperationStore(){return operationStore||(operationStore=window.HUNTER_SAVES.createOperationStore())}
async function saveOperation({name,asNew=false,exit=false}={}){
  if(operationBusy)throw new Error('Hi ha una operació de desament en curs.');
  if(!paused)panel('pause');
  operationBusy=true;
  try{
    await waitOperationWrite();
    const snapshot=captureOperation(name);
    if(asNew){snapshot.operationId=window.HUNTER_SAVES.newOperationId();snapshot.revision=0;snapshot.createdAt=snapshot.updatedAt=Date.now();}
    const saved=await persistOperation(snapshot);
    operationAutosave?.markSaved(saved.world.time);
    if(exit){
      await recordJournalNow();started=0;paused=false;audioPause();discardGeneratedWorld();operationRegistry=null;activeOperation=null;
      ui.hide();document.body.classList.remove('game-started');iniEl.style.display='flex';startMenuEl.style.display='flex';
    }
    return saved;
  }finally{operationBusy=false;}
}
async function loadOperation(operationId,{previous=false}={}){
  if(operationBusy||generationPromise||seedSearchRunning)throw new Error('Espera que acabi l’operació en curs.');
  operationBusy=true;
  try{
    await waitOperationWrite();
    const store=getOperationStore(),current=await store.load(operationId,{generatorVersion:OPERATION_GENERATOR_VERSION});
    if(!current)throw new Error('No s’ha trobat aquesta operació.');
    const snapshot=previous?await store.load(operationId,{previous:true,generatorVersion:OPERATION_GENERATOR_VERSION}):current;
    if(!snapshot)throw new Error('Aquesta operació no té còpia anterior.');
    validateOperationRuntime(snapshot);
    // A chosen backup is promoted only by a later explicit save against the latest revision.
    if(previous)snapshot.revision=current.revision;
    await startGameProgressively({difficulty:snapshot.world.runtime.difficulty,
      scale:snapshot.world.mapScale,seed:snapshot.world.seed,restoreSnapshot:snapshot});
    return snapshot;
  }finally{operationBusy=false;}
}
function openOperations(){
  if(operationBusy||generationPromise)return;
  if(started)panel('saves');else ui.show('saves');
}
async function exportOperationFile(operationId){
  await waitOperationWrite();
  const snapshot=await getOperationStore().load(operationId);
  if(!snapshot)throw new Error('No s’ha trobat aquesta operació.');
  return window.HUNTER_SAVE_FILES.serializeSaveFile(snapshot);
}
async function downloadOperationFile(operationId){
  const file=await exportOperationFile(operationId),blob=new Blob([file.text],{type:'application/json;charset=utf-8'}),
    url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=file.fileName;link.style.display='none';document.body.appendChild(link);
  try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
}
async function prepareOperationImport(input){
  const snapshot=await window.HUNTER_SAVE_FILES.parseSaveFile(input);
  validateOperationRuntime(snapshot);
  return snapshot;
}
async function commitOperationImport(snapshot){
  if(operationBusy||generationPromise||seedSearchRunning)throw new Error('Espera que acabi l’operació en curs.');
  validateOperationRuntime(snapshot);operationBusy=true;
  try{
    await waitOperationWrite();
    // Imports are always new operations: neither the original save nor the running world is replaced.
    const imported=operationClone(snapshot),now=Date.now();
    imported.operationId=window.HUNTER_SAVES.newOperationId();imported.revision=0;
    imported.createdAt=imported.updatedAt=now;imported.name=(imported.name+' (importada)').slice(0,100);
    for(const participant of Object.values(imported.participants))participant.accountId=null;
    return await getOperationStore().save(imported,{expectedRevision:0});
  }finally{operationBusy=false;}
}
async function importOperationFile(input){return commitOperationImport(await prepareOperationImport(input));}
async function renderOperations(body,isCurrent=()=>true,notice=''){
  const serial=++operationMenuSerial;
  body.replaceChildren();
  const add=(tag,text,parent=body)=>{const element=document.createElement(tag);element.textContent=text;parent.appendChild(element);return element};
  const status=add('p','Carregant operacions…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const buttons=[];
  const button=(text,action,parent=body)=>{const el=add('button',text,parent);el.type='button';el.dataset.ready='true';buttons.push(el);el.onclick=async()=>{
    if(operationBusy)return;buttons.forEach(b=>b.disabled=true);
    try{await action();}catch(error){if(isCurrent())status.textContent=error.message||'No s’ha pogut completar l’acció.';}
    finally{buttons.forEach(b=>b.disabled=operationBusy||b.dataset.ready==='false');}
  };return el;};
  if(started&&!over){
    const label=add('label','Nom de l’operació '),input=document.createElement('input');input.type='text';input.maxLength=100;
    input.value=activeOperation?.name||'Operació '+(seed>>>0);input.style.cssText='display:block;max-width:100%;padding:10px;margin:8px 0';label.appendChild(input);
    button('Desar',async()=>{await saveOperation({name:input.value});if(isCurrent())renderOperations(body,isCurrent);});
    button('Desar com a nova',async()=>{await saveOperation({name:input.value,asNew:true});if(isCurrent())renderOperations(body,isCurrent);});
    button('Desar i sortir',()=>saveOperation({name:input.value,exit:true}));
  }
  add('p','Les operacions es desen en aquest navegador i dispositiu.');
  add('p','Exportar descarrega la darrera còpia desada. Importar crea una operació nova.');
  const importBox=add('section',''),importLabel=add('label','Importar un fitxer de partida ',importBox),
    importInput=document.createElement('input');importInput.type='file';importInput.id='operationImportFile';
  importInput.accept='.json,.hunter-save.json,application/json';importInput.style.cssText='display:block;max-width:100%;margin:10px 0';
  importLabel.appendChild(importInput);
  const preview=add('p','',importBox);preview.setAttribute('role','status');
  let pendingImport=null,importSerial=0;
  const confirmImport=button('Importar com a nova operació',async()=>{
    if(!pendingImport)throw new Error('Tria primer un fitxer de partida vàlid.');
    const saved=await commitOperationImport(pendingImport);
    if(isCurrent())await renderOperations(body,isCurrent,'Importada: '+saved.name);
  },importBox);
  confirmImport.dataset.ready='false';confirmImport.disabled=true;
  importInput.onchange=async()=>{
    const token=++importSerial;pendingImport=null;confirmImport.dataset.ready='false';confirmImport.disabled=true;
    const file=importInput.files?.[0];if(!file){preview.textContent='';return;}
    preview.textContent='Verificant el fitxer…';
    try{
      const snapshot=await prepareOperationImport(file);
      if(token!==importSerial||!isCurrent())return;
      pendingImport=snapshot;
      preview.textContent=snapshot.name+' · Llavor '+snapshot.world.seed+' · '+
        (snapshot.world.mapScale===2?'Gran':'Petit')+' · '+Math.floor(snapshot.world.time/60)+' min. Es crearà una còpia nova.';
      confirmImport.dataset.ready='true';confirmImport.disabled=operationBusy;
    }catch(error){if(token===importSerial&&isCurrent())preview.textContent=error.message||'Fitxer invàlid.';}
  };
  const list=add('div','');
  try{
    const rows=await getOperationStore().list();
    if(serial!==operationMenuSerial||!isCurrent())return;
    status.textContent=(notice?notice+' · ':'')+(rows.length?rows.length+' operacions desades.':'Encara no hi ha operacions desades.');
    for(const row of rows){
      const card=add('section','',list);card.style.cssText='border-top:1px solid #ffffff44;padding:12px 0';
      add('strong',row.name,card);
      add('p','Llavor '+row.seed+' · '+(row.mapScale===2?'Gran':'Petit')+' · '+Math.floor(row.time/60)+' min · '+new Date(row.updatedAt).toLocaleString('ca-ES'),card);
      const compatible=row.generatorVersion===OPERATION_GENERATOR_VERSION;
      button('Exportar fitxer',()=>downloadOperationFile(row.operationId),card);
      if(accountCloud&&window.HUNTER_ACCOUNT_SERVICE.status().approval==='approved'){
        button('Pujar al núvol',async()=>{await accountCloud.push(row.operationId);status.textContent='Partida sincronitzada.';},card);
        button('Pujar com a nova al núvol',async()=>{await accountCloud.push(row.operationId,{asNew:true});status.textContent='Còpia nova al núvol.';},card);
      }
      if(!compatible)add('p','Necessita una versió compatible del generador.',card);
      function loadButton(text,previous){
        let confirmed=!started;
        const el=button(text,async()=>{
          if(!confirmed){confirmed=true;el.textContent='Confirma: substituir la partida actual';return;}
          await loadOperation(row.operationId,{previous});
        },card);
      }
      if(compatible){loadButton('Continuar',false);if(row.hasPrevious)loadButton('Còpia anterior',true);}
      let confirmDelete=false;
      const remove=button('Eliminar',async()=>{
        if(!confirmDelete){confirmDelete=true;remove.textContent='Confirma eliminar';return;}
        await getOperationStore().remove(row.operationId,{expectedRevision:row.revision});
        if(activeOperation?.operationId===row.operationId){activeOperation=null;operationAutosave?.suspend();}
        if(isCurrent())renderOperations(body,isCurrent);
      },card);
    }
  }catch(error){if(isCurrent())status.textContent=error.message||'No s’han pogut llegir les operacions.';}
  button(started?'← Pausa':'← Portada',()=>{if(started)ui.show('pause');else ui.hide();});
}
window.HUNTER_OPERATIONS=Object.freeze({capture:captureOperation,save:saveOperation,load:loadOperation,open:openOperations,
  exportFile:exportOperationFile,importFile:importOperationFile});
