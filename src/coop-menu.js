let coopPanelEpoch=0,coopRoomConnection=null;
function openCoopPanel(){if(operationBusy||generationPromise)return;if(started)panel('coop');else ui.show('coop');}
async function renderCoop(body,isCurrent){
  coopRoomConnection?.stop();coopRoomConnection=null;
  let connection=null,launching=false,waitingAsGuest=false;
  const epoch=++coopPanelEpoch,active=()=>isCurrent()&&epoch===coopPanelEpoch;
  body.replaceChildren();
  const add=(tag,text,parent=body)=>{const el=document.createElement(tag);el.textContent=text;parent.appendChild(el);return el;};
  add('p','Sala privada per jugar plegats al món original de Hunter: Arxipèlag. Mateixa pantalla, controls i càmera darrere del personatge.');
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
  const owner=user.id,channel=add('p',''),view=add('div','');let room=null,requestEpoch=0,drawn='';
  // Només el HOST prem Començar. El GUEST preparat rep el senyal
  // automàticament, fins i tot si ha tornat a la portada.
  async function launchIfSignalled(next){
    if(launching||nativeCoopSession||!next||next.id!==room?.id||
       !['starting','playing'].includes(next.phase)||!next.allReady||
       !next.members?.find(m=>m.id===owner)?.ready)return;
    launching=true;waitingAsGuest=false;
    ++coopPanelEpoch;connection?.stop();connection=null;coopRoomConnection=null;
    try{await window.HUNTER_NATIVE_COOP.start(next);}
    catch(error){
      launching=false;
      // Deixam visible l'error; l'usuari pot tornar a obrir la sala.
      console.error('No s’ha pogut entrar al COOP iniciat pel HOST',error);
      if(!started){ui.show('coop');}else{paused=true;ui.show('pause');}
    }
  }
  async function call(path,data){
    if(accounts.status().user?.id!==owner)throw new Error('El compte ha canviat. Torna a obrir la sala.');
    const ticket=++requestEpoch;const result=await accounts.request('coop/'+path,{method:data===undefined?'GET':'POST',data,headers:{'X-Hunter-User':owner}});
    return ticket===requestEpoch?result:null;
  }
  function input(label,value,type='text'){
    const wrap=add('label',label,view),el=document.createElement('input');el.className='account-input';el.type=type;el.value=value;wrap.appendChild(el);return el;
  }
  function draw(result){
    if(!active()||!result)return;
    if(room&&result.room?.id===room.id&&result.room.revision<room.revision)return;
    // /current consulta D1: no ha de rebaixar la fase de
    // llançament que ja ens ha comunicat el Durable Object.
    if(room&&result.room?.id===room.id&&room.phase!=='lobby'&&result.room.phase==='lobby')
      result={...result,room:{...result.room,phase:room.phase}};
    room=result.room;status.textContent='';
    waitingAsGuest=!!room&&room.host!==owner&&
      !!room.members.find(m=>m.id===owner)?.ready;
    const signature=JSON.stringify(room);if(signature===drawn)return;drawn=signature;view.replaceChildren();
    if(!room){
      connection?.stop();connection=null;channel.textContent='';
      add('h3','Crear sala',view);
      const seedField=input('Llavor (0–4294967295)',String(crypto.getRandomValues(new Uint32Array(1))[0]),'number');
      const choose=(label,values)=>{const wrap=add('label',label,view),el=document.createElement('select');el.className='account-input';for(const [value,text] of values){const op=document.createElement('option');op.value=value;op.textContent=text;el.appendChild(op);}wrap.appendChild(el);return el;};
      const scale=choose('Mida',[[1,'Petit'],[2,'Gran']]),difficulty=choose('Dificultat',[[1,'Normal'],[.6,'Fàcil'],[1.5,'Difícil']]);
      button('Crear sala privada',async()=>{if(!seedField.value.trim())throw new Error('Introdueix una llavor numèrica.');draw(await call('rooms',{seed:Number(seedField.value),mapScale:Number(scale.value),difficulty:Number(difficulty.value)}));},view);
      add('h3','Entrar amb invitació',view);const code=input('Codi de sala','');code.autocomplete='off';code.maxLength=30;
      button('Entrar a la sala',async()=>draw(await call('join',{code:code.value})),view);
      return;
    }
    if(!nativeCoopSession&&!connection&&window.HUNTER_COOP_CONNECTION&&!document.hidden){
      const socketURL=new URL('/api/coop/socket',location.origin);socketURL.protocol=socketURL.protocol==='https:'?'wss:':'ws:';socketURL.searchParams.set('room',room.id);
      const expectedRoom=room.id;
      connection=window.HUNTER_COOP_CONNECTION({url:socketURL.href,
        isActive:()=>!document.hidden&&accounts.status().user?.id===owner&&
          !nativeCoopSession&&(active()||waitingAsGuest),
        onRoom:result=>{
          if(result.room?.id===expectedRoom&&result.room.phase==='starting')launchIfSignalled(result.room);
          if(active()&&(!result.room||result.room.id===expectedRoom))draw(result);
        },
        onStatus:state=>{if(active())channel.textContent=({open:'Sala connectada en temps real',connecting:'Connectant la sala…',retrying:'Reconnectant… Actualització periòdica disponible.',replaced:'Connexió oberta en una altra pestanya.',unauthorized:'La connexió de sala ha finalitzat.',closed:''}[state]||'');}
      });coopRoomConnection=connection;connection.start();
    }
    add('p','Codi privat: '+room.code,view);
    add('p','Llavor '+room.seed+' · '+(room.mapScale===1?'Petit':'Gran')+' · '+({'.6':'Fàcil','0.6':'Fàcil',1:'Normal','1.5':'Difícil'}[room.difficulty]),view);
    add('p','La sala caduca al cap de 24 hores. Tancar aquest menú conserva la plaça.',view);
    for(const member of room.members)add('p',member.name+(member.host?' · Amfitrió':'')+' · '+(!member.online?'Sense connexió recent':member.ready?'Preparat':'Esperant'),view);
    const mine=room.members.find(m=>m.id===owner);
    const guest=room.members.find(member=>!member.host);
    if(nativeCoopSession){
      const offline=!window.HUNTER_NATIVE_COOP.connected()||nativeCoopSession.preparing;
      if(room.host!==owner&&offline){
        add('p','Has perdut la connexió amb la partida. La sala i el món es conserven.',view);
        button('↻ Reconnectar a la partida',()=>{
          window.HUNTER_NATIVE_COOP.reconnect();
          resume();
        },view);
      }else button('▶ Reprendre el joc',()=>resume(),view);
    }
    else if(room.host===owner){
      add('p',guest?.ready?'El convidat està preparat. Pots començar la partida.':
        'Esperant que el convidat confirmi que està preparat.',view);
      if(guest?.ready)button('▶ Començar la partida per a tots dos',async()=>{
        const started=await call('start',{revision:room.revision});
        if(started?.room){draw(started);await launchIfSignalled(started.room);}
      },view);
    }else{
      if(room.phase==='playing'){
        add('p','Hi ha una partida COOP iniciada. Pots tornar a entrar sense demanar al HOST que la comenci de nou.',view);
        button('↻ Reconnectar a la partida',async()=>{
          let next=room;
          if(!mine?.ready){
            const updated=await call('ready',{ready:true,revision:room.revision});
            if(updated?.room)next={...updated.room,phase:'playing'};
          }
          if(next){room=next;await launchIfSignalled(next);}
        },view);
      }else{
        add('p',mine?.ready?'Preparat. Esperant que el HOST comenci la partida.':
          'Confirma que estàs preparat. El HOST us farà entrar a tots dos.',view);
        button(mine?.ready?'Encara no estic preparat':'Estic preparat',
          async()=>draw(await call('ready',{ready:!mine?.ready,revision:room.revision})),view);
      }
    }
    button('Actualitzar sala',async()=>draw(await call('current')),view);
    button(room.host===owner?'Tancar sala i sortir':'Sortir de la sala',async()=>{const result=await call('leave',{});if(nativeCoopSession){stopNativeCoop();location.assign('/');}else draw(result);},view);
  }
  try{draw(await call('current'));}catch(e){if(active())status.textContent=e.message;}
  async function poll(){
    if(!active()&&!waitingAsGuest){connection?.stop();connection=null;return;}
    // Si el convidat ja és Preparat, conserva la subscripció també
    // fora del menú: en tornar d'una pestanya oculta recupera el socket
    // i pot rebre l'ordre d'inici pendent del HOST.
    if(document.hidden&&!waitingAsGuest){
      connection?.stop();connection=null;drawn='';
    }
    if(waitingAsGuest&&!active()&&!document.hidden&&connection&&!connection.isOpen())
      connection.start();
    if(room&&!document.hidden&&!connection?.isOpen()&&active()){
      try{const result=await call('current');draw(result);if(result?.room?.phase==='starting')launchIfSignalled(result.room);}
      catch(e){if(active())status.textContent=e.message;}
    }
    if(active())setTimeout(poll,5000);
  }
  if(active())setTimeout(poll,5000);
}
