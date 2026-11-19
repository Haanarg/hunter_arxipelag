let accountCloud=null,cloudRetryAt=0,cloudStatus='';
function initializeAccounts(){
  const accounts=window.HUNTER_ACCOUNT_SERVICE;
  if(accounts?.configured)accountCloud=window.HUNTER_CLOUD_FACTORY.createCloudSync({accounts,
    remote:window.HUNTER_CLOUD_FACTORY.createCloudflareRemote(accounts),local:getOperationStore(),validate:validateOperationRuntime,
    onStatus:text=>{cloudStatus=text;const el=document.getElementById('cloudStatus');if(el)el.textContent=text;}});
  let lastIdentity=accounts?.status().user?.id||null;
  window.HUNTER_AUTH_CHANGED=()=>{const identity=accounts?.status().user?.id||null;
    if(identity!==lastIdentity&&ui.isAccountOpen())ui.show('account');lastIdentity=identity;
    if(accountCloud&&accounts.status().approval==='approved')accountCloud.retry().catch(()=>{});
  };
  addEventListener('online',()=>{if(accounts?.status().approval==='approved')accountCloud?.retry().catch(()=>{});});
  document.getElementById('accountOpen').onclick=openAccountPanel;
}
function cloudTick(){
  if(!accountCloud||window.HUNTER_ACCOUNT_SERVICE.status().approval!=='approved'||performance.now()<cloudRetryAt)return;
  cloudRetryAt=performance.now()+30000;accountCloud.retry().catch(()=>{});
}
function openAccountPanel(){if(operationBusy||generationPromise)return;if(started)panel('account');else ui.show('account');}
async function renderAccount(body,isCurrent,view='home'){
  // Cada apartat disposa de la seva pròpia pantalla. No es carreguen
  // la llista d'usuaris o les partides al núvol quan s'obre el menú.
  body.replaceChildren();
  const add=(tag,text,parent=body)=>{
    const el=document.createElement(tag);el.textContent=text;parent.appendChild(el);return el;
  };
  const status=add('p',cloudStatus);status.id='cloudStatus';status.setAttribute('role','status');
  const accounts=window.HUNTER_ACCOUNT_SERVICE;
  const go=next=>renderAccount(body,isCurrent,next);
  const field=(label,type='text')=>{
    const wrap=add('label',label),input=document.createElement('input');
    input.type=type;input.className='account-input';
    input.autocomplete=type==='password'?'current-password':'username';
    wrap.appendChild(input);return input;
  };
  const button=(text,action,parent=body)=>{
    const el=add('button',text,parent);el.type='button';
    el.onclick=async()=>{
      el.disabled=true;
      try{await action();}
      catch(error){if(isCurrent())status.textContent=error.message||String(error);}
      finally{el.disabled=false;}
    };return el;
  };
  const heading=text=>add('h3',text);
  const back=()=>{if(view!=='home')button('← Tornar a Compte',()=>go('home'));};
  if(!accounts?.configured){
    add('p','Els comptes encara no estan activats. Pots jugar i desar partides en aquest dispositiu.');
    if(!started)button('← Portada',()=>ui.hide());
    return;
  }
  let user=null;
  try{user=await accounts.verifiedUser();}
  catch(error){status.textContent=error.message||String(error);}
  if(!isCurrent())return;
  const state=accounts.status();
  if(view==='home'){
    heading('Compte');
    add('p',user?'Sessió iniciada: '+user.name:'No has iniciat sessió.');
    if(user&&state.approval!=='approved'){
      add('p',state.approval==='suspended'
        ?'Compte suspès. Les còpies locals continuen disponibles.'
        :'Pendent d’aprovació de l’administrador. Encara no pots sincronitzar.');
      button('Comprovar aprovació',async()=>{await accounts.verifiedUser();await go('home');});
    }
    // Els submenús només mostren allò que correspon als permisos del titular.
    button(user?'Sessió i dades del compte':'Entrar o crear compte',()=>go('access'));
    button(user?'Recuperació i contrasenya':'Recuperar l’accés',()=>go('recovery'));
    if(user&&state.approval==='approved'){
      button('Núvol · sincronització i partides',()=>go('cloud'));
      button('Obrir sala cooperativa',openCoopPanel);
    }
    if(user&&state.role==='admin'&&state.approval==='approved')
      button('Gestió de comptes · administració',()=>go('admin'));
  }else if(view==='access'){
    heading('Sessió i dades del compte');
    if(!user){
      const name=field('Nom d’usuari'),password=field('Contrasenya','password');
      name.maxLength=32;
      const credentials=()=>{
        if(!name.value.trim()||!password.value)
          throw new Error('Introdueix el nom d’usuari i la contrasenya.');
        return [name.value.trim(),password.value];
      };
      add('p','Els comptes nous necessiten aprovació de l’administrador per sincronitzar. No es demana cap correu.');
      button('Entrar',async()=>{
        try{await accounts.signIn(...credentials());await go('home');}
        finally{password.value='';}
      });
      button('Crear compte',async()=>{
        try{await accounts.signUp(...credentials());await go('home');}
        finally{password.value='';}
      });
      button('He perdut l’accés',()=>go('recovery'));
    }else{
      add('p','Usuari: '+user.name);
      add('p','Les còpies locals es conserven quan surts del compte.');
      add('p','Estat: '+({approved:'aprovat',pending:'pendent',suspended:'suspès'}[state.approval]||state.approval||'sense verificar'));
      button('Sortir del compte',async()=>{await accounts.signOut();await go('home');});
    }
    back();
  }else if(view==='recovery'){
    heading('Recuperació i contrasenya');
    if(!user){
      add('p','Utilitza un codi personal o el codi temporal facilitat per l’administrador. Cada codi només serveix una vegada.');
      add('p','Si has perdut tots els codis, contacta directament amb l’administrador perquè verifiqui que el compte és teu.');
      const name=field('Nom d’usuari'),code=field('Codi de recuperació'),password=field('Nova contrasenya','password');
      code.autocomplete='one-time-code';password.autocomplete='new-password';
      button('Canviar contrasenya amb el codi',async()=>{
        try{
          await accounts.recover(name.value.trim(),code.value,password.value);
          await go('access');
          const message=body.querySelector('[role="status"]');
          if(message)message.textContent='Contrasenya canviada. Torna a entrar.';
        }finally{password.value='';code.value='';}
      });
    }else{
      add('p',state.recoveryCodes
        ?state.recoveryCodes+' codis disponibles. Generar-ne de nous invalida els anteriors.'
        :'Encara no has generat els codis de recuperació.');
      const current=field('Contrasenya actual','password'),next=field('Nova contrasenya','password');
      next.autocomplete='new-password';
      button('Canviar contrasenya',async()=>{
        try{
          await accounts.changePassword(next.value,current.value);
          status.textContent='Contrasenya canviada.';
        }finally{current.value='';next.value='';}
      });
      const codesBox=add('div','');
      button('Generar 8 codis de recuperació',async()=>{
        try{
          const codes=await accounts.recoveryCodes(current.value);
          codesBox.replaceChildren();
          add('p','Guarda aquests codis fora del joc. Només es mostren ara i cadascun serveix una vegada.',codesBox);
          const pre=add('pre',codes.join('\n'),codesBox);
          pre.style.cssText='white-space:pre-wrap;user-select:text';
          button('Descarregar codis',()=>{
            const blob=new Blob(['Hunter · '+user.name+'\n\n'+codes.join('\n')],
              {type:'text/plain;charset=utf-8'});
            const url=URL.createObjectURL(blob),link=document.createElement('a');
            link.href=url;link.download='hunter-codis-recuperacio.txt';
            document.body.appendChild(link);link.click();link.remove();
            setTimeout(()=>URL.revokeObjectURL(url),30000);
          },codesBox);
        }finally{current.value='';}
      });
    }
    back();
  }else if(view==='cloud'){
    heading('Núvol · sincronització i partides');
    if(!user||state.approval!=='approved'){
      add('p','Cal tenir la sessió iniciada i el compte aprovat per accedir al núvol.');
    }else if(!accountCloud){
      add('p','La sincronització al núvol no està disponible.');
    }else{
      button('Sincronitzar canvis locals pendents',async()=>{
        await accountCloud.retry();status.textContent='Sincronització comprovada.';
      });
      button('Sincronitzar historial d’aquest dispositiu',async()=>{
        if(started)await recordJournalNow();
        await accountCloud.syncHistory(getOperationJournal());
        status.textContent='Historial sincronitzat.';
      });
      heading('Partides al núvol');
      try{
        const rows=await accountCloud.list();
        if(!isCurrent())return;
        if(!rows.length)add('p','Encara no hi ha partides al núvol. Puja’n una des d’Operacions desades.');
        for(const row of rows){
          add('p',row.name+' · Llavor '+row.seed+' · '+Math.floor(row.played_seconds/60)+' min');
          button('Baixar com a còpia local',async()=>{
            const saved=await accountCloud.pull(row.operation_id);
            status.textContent='Còpia local creada: '+saved.name;
          });
          let confirmed=false;
          const remove=button('Eliminar del núvol',async()=>{
            if(!confirmed){confirmed=true;remove.textContent='Confirma eliminar del núvol';return;}
            await accountCloud.remove(row.operation_id,row.revision);await go('cloud');
          });
        }
      }catch(error){status.textContent=error.message||String(error);}
    }
    back();
  }else if(view==='admin'){
    heading('Gestió de comptes · administració');
    if(!user||state.role!=='admin'||state.approval!=='approved'){
      add('p','Aquest apartat només és accessible per a administradors aprovats.');
    }else{
      add('p','Per emetre un codi temporal cal verificar el titular fora del joc i introduir la teva contrasenya. No es poden recuperar altres administradors des d’aquí.');
      const current=field('Contrasenya d’administrador','password');
      try{
        for(const candidate of await accounts.users()){
          if(!isCurrent())return;
          const row=add('div','');row.className='account-admin-user';
          add('p',candidate.name+' · '+({pending:'pendent',approved:'aprovat',suspended:'suspès'}[candidate.status]||candidate.status),row);
          if(candidate.id===user.id)continue;
          if(candidate.status!=='approved')button('Aprovar '+candidate.name,async()=>{
            await accounts.approve(candidate.id,'approved');await go('admin');
          },row);
          if(candidate.role!=='admin'&&candidate.status!=='suspended'){
            const verify=add('label','He verificat personalment que el compte és seu: '+candidate.name,row);
            const checkbox=document.createElement('input');checkbox.type='checkbox';verify.prepend(checkbox);
            const assistedBox=add('div','',row);
            button('Codi temporal per a '+candidate.name,async()=>{
              try{
                const result=await accounts.issueRecovery(candidate.id,current.value,checkbox.checked);
                if(!isCurrent()||accounts.status().user?.id!==user.id)return;
                assistedBox.replaceChildren();
                add('p','Per a '+candidate.name+' · Caduca en 30 minuts. Comparteix-lo només amb el titular verificat.',assistedBox);
                const pre=add('pre',result.code,assistedBox);
                pre.style.cssText='white-space:pre-wrap;user-select:text';
                checkbox.checked=false;
              }finally{current.value='';}
            },row);
          }
          if(candidate.status==='approved'){
            let confirmed=false;
            const suspend=button('Suspendre '+candidate.name,async()=>{
              if(!confirmed){confirmed=true;suspend.textContent='Confirma suspendre '+candidate.name;return;}
              await accounts.approve(candidate.id,'suspended');await go('admin');
            },row);
          }
        }
      }catch(error){status.textContent=error.message||String(error);}
    }
    back();
  }else{
    await go('home');return;
  }
  if(!started)button('← Portada',()=>ui.hide());
}
