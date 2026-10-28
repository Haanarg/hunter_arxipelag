let coopPanelEpoch=0;
function openCoopPanel(){if(operationBusy||generationPromise)return;if(started)panel('coop');else ui.show('coop');}
async function renderCoop(body,isCurrent){
  const epoch=++coopPanelEpoch,active=()=>isCurrent()&&epoch===coopPanelEpoch;
  body.replaceChildren();
  const add=(tag,text,parent=body)=>{const el=document.createElement(tag);el.textContent=text;parent.appendChild(el);return el;};
  add('p','Sala privada per a dos jugadors. Aquesta fase prepara el grup; la missió compartida encara no es pot iniciar.');
  const status=add('p','Comprovant el compte…');status.setAttribute('role','status');
  const accounts=window.HUNTER_ACCOUNT_SERVICE;
  const button=(label,action,parent=body)=>{const el=add('button',label,parent);el.type='button';el.onclick=async()=>{
    el.disabled=true;try{await action();}catch(e){if(active())status.textContent=e.message;}finally{el.disabled=false;}
  };return el;};
  button(started?'← Pausa':'← Portada',()=>started?ui.show('pause'):ui.hide());
  if(!accounts?.configured){status.textContent='Cal activar els comptes per utilitzar sales cooperatives.';return;}
  let user;try{user=await accounts.verifiedUser();}catch(e){status.textContent=e.message;return;}
  if(!active())return;
  if(!user||accounts.status().approval!=='approved'){
    status.textContent='Cal iniciar sessió amb un compte aprovat.';button('Obrir compte',openAccountPanel);return;
  }
  const owner=user.id,view=add('div','');let room=null,requestEpoch=0,drawn='';
  async function call(path,data){
    if(accounts.status().user?.id!==owner)throw new Error('El compte ha canviat. Torna a obrir la sala.');
    const ticket=++requestEpoch;const result=await accounts.request('coop/'+path,{method:data===undefined?'GET':'POST',data,headers:{'X-Hunter-User':owner}});
    return ticket===requestEpoch?result:null;
  }
  function input(label,value,type='text'){
    const wrap=add('label',label,view),el=document.createElement('input');el.className='account-input';el.type=type;el.value=value;wrap.appendChild(el);return el;
  }
  function draw(result){
    if(!active()||!result)return;room=result.room;status.textContent='';
    const signature=JSON.stringify(room);if(signature===drawn)return;drawn=signature;view.replaceChildren();
    if(!room){
      add('h3','Crear sala',view);
      const seedField=input('Llavor (0–4294967295)',String(crypto.getRandomValues(new Uint32Array(1))[0]),'number');
      const choose=(label,values)=>{const wrap=add('label',label,view),el=document.createElement('select');el.className='account-input';for(const [value,text] of values){const op=document.createElement('option');op.value=value;op.textContent=text;el.appendChild(op);}wrap.appendChild(el);return el;};
      const scale=choose('Mida',[[1,'Petit'],[2,'Gran']]),difficulty=choose('Dificultat',[[1,'Normal'],[.6,'Fàcil'],[1.5,'Difícil']]);
      button('Crear sala privada',async()=>{if(!seedField.value.trim())throw new Error('Introdueix una llavor numèrica.');draw(await call('rooms',{seed:Number(seedField.value),mapScale:Number(scale.value),difficulty:Number(difficulty.value)}));},view);
      add('h3','Entrar amb invitació',view);const code=input('Codi de sala','');code.autocomplete='off';code.maxLength=30;
      button('Entrar a la sala',async()=>draw(await call('join',{code:code.value})),view);
      return;
    }
    add('p','Codi privat: '+room.code,view);
    add('p','Llavor '+room.seed+' · '+(room.mapScale===1?'Petit':'Gran')+' · '+({'.6':'Fàcil','0.6':'Fàcil',1:'Normal','1.5':'Difícil'}[room.difficulty]),view);
    add('p','La sala caduca al cap de 24 hores. Tancar aquest menú conserva la plaça.',view);
    for(const member of room.members)add('p',member.name+(member.host?' · Amfitrió':'')+' · '+(!member.online?'Sense connexió recent':member.ready?'Preparat':'Esperant'),view);
    const mine=room.members.find(m=>m.id===owner);
    add('p',room.allReady?'Tots dos preparats. La simulació compartida arribarà en una fase posterior.':'Esperant dos jugadors preparats.',view);
    button(mine?.ready?'Encara no estic preparat':'Estic preparat',async()=>draw(await call('ready',{ready:!mine?.ready,revision:room.revision})),view);
    button('Actualitzar sala',async()=>draw(await call('current')),view);
    button(room.host===owner?'Tancar sala i sortir':'Sortir de la sala',async()=>draw(await call('leave',{})),view);
  }
  try{draw(await call('current'));}catch(e){if(active())status.textContent=e.message;}
  async function poll(){
    if(!active())return;
    if(room&&!document.hidden){try{draw(await call('current'));}catch(e){if(active())status.textContent=e.message;}}
    if(active())setTimeout(poll,5000);
  }
  if(active())setTimeout(poll,5000);
}
