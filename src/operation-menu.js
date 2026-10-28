let operationStore=null,operationMenuSerial=0;
function getOperationStore(){return operationStore||(operationStore=window.HUNTER_SAVES.createOperationStore())}
async function saveOperation({name,asNew=false,exit=false}={}){
  if(operationBusy)throw new Error('Hi ha una operació de desament en curs.');
  if(!paused)panel('pause');
  operationBusy=true;
  try{
    const snapshot=captureOperation(name);
    if(asNew){snapshot.operationId=window.HUNTER_SAVES.newOperationId();snapshot.revision=0;snapshot.createdAt=snapshot.updatedAt=Date.now();}
    const saved=await getOperationStore().save(snapshot,{expectedRevision:snapshot.revision});
    activeOperation=saved;
    if(exit){
      started=0;paused=false;audioPause();discardGeneratedWorld();operationRegistry=null;activeOperation=null;
      ui.hide();document.body.classList.remove('game-started');iniEl.style.display='flex';startMenuEl.style.display='flex';
    }
    return saved;
  }finally{operationBusy=false;}
}
async function loadOperation(operationId,{previous=false}={}){
  if(operationBusy||generationPromise||seedSearchRunning)throw new Error('Espera que acabi l’operació en curs.');
  operationBusy=true;
  try{
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
async function renderOperations(body,isCurrent=()=>true){
  const serial=++operationMenuSerial;
  body.replaceChildren();
  const add=(tag,text,parent=body)=>{const element=document.createElement(tag);element.textContent=text;parent.appendChild(element);return element};
  const status=add('p','Carregant operacions…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const buttons=[];
  const button=(text,action,parent=body)=>{const el=add('button',text,parent);el.type='button';buttons.push(el);el.onclick=async()=>{
    if(operationBusy)return;buttons.forEach(b=>b.disabled=true);
    try{await action();}catch(error){if(isCurrent())status.textContent=error.message||'No s’ha pogut completar l’acció.';}
    finally{buttons.forEach(b=>b.disabled=false);}
  };return el;};
  if(started&&!over){
    const label=add('label','Nom de l’operació '),input=document.createElement('input');input.type='text';input.maxLength=100;
    input.value=activeOperation?.name||'Operació '+(seed>>>0);input.style.cssText='display:block;max-width:100%;padding:10px;margin:8px 0';label.appendChild(input);
    button('Desar',async()=>{await saveOperation({name:input.value});if(isCurrent())renderOperations(body,isCurrent);});
    button('Desar com a nova',async()=>{await saveOperation({name:input.value,asNew:true});if(isCurrent())renderOperations(body,isCurrent);});
    button('Desar i sortir',()=>saveOperation({name:input.value,exit:true}));
  }
  add('p','Les operacions es desen en aquest navegador i dispositiu.');
  const list=add('div','');
  try{
    const rows=await getOperationStore().list();
    if(serial!==operationMenuSerial||!isCurrent())return;
    status.textContent=rows.length?rows.length+' operacions desades.':'Encara no hi ha operacions desades.';
    for(const row of rows){
      const card=add('section','',list);card.style.cssText='border-top:1px solid #ffffff44;padding:12px 0';
      add('strong',row.name,card);
      add('p','Llavor '+row.seed+' · '+(row.mapScale===2?'Gran':'Petit')+' · '+Math.floor(row.time/60)+' min · '+new Date(row.updatedAt).toLocaleString('ca-ES'),card);
      const compatible=row.generatorVersion===OPERATION_GENERATOR_VERSION;
      if(!compatible){add('p','Necessita una versió compatible del generador.',card);continue;}
      function loadButton(text,previous){
        let confirmed=!started;
        const el=button(text,async()=>{
          if(!confirmed){confirmed=true;el.textContent='Confirma: substituir la partida actual';return;}
          await loadOperation(row.operationId,{previous});
        },card);
      }
      loadButton('Continuar',false);if(row.hasPrevious)loadButton('Còpia anterior',true);
      let confirmDelete=false;
      const remove=button('Eliminar',async()=>{
        if(!confirmDelete){confirmDelete=true;remove.textContent='Confirma eliminar';return;}
        await getOperationStore().remove(row.operationId,{expectedRevision:row.revision});
        if(activeOperation?.operationId===row.operationId)activeOperation=null;
        if(isCurrent())renderOperations(body,isCurrent);
      },card);
    }
  }catch(error){if(isCurrent())status.textContent=error.message||'No s’han pogut llegir les operacions.';}
  button(started?'← Pausa':'← Portada',()=>{if(started)ui.show('pause');else ui.hide();});
}
window.HUNTER_OPERATIONS=Object.freeze({capture:captureOperation,save:saveOperation,load:loadOperation,open:openOperations});
