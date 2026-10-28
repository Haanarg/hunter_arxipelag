import {configuredAccounts} from './account-client.mjs';
import {GAME_VERSION} from './version.mjs?v=0.6.21';
import {createPlayConnection,playInput} from './coop-play-connection.mjs?v=0.6.21';
import {createMissionView} from './coop-play-view.mjs?v=0.6.21';
const $=id=>document.getElementById(id),message=$('message'),launch=$('launch'),connection=$('connection'),keys=new Set(),touch=new Map();
let channel=null,room=null,view=null,meta=null,self=null,state=null,viewGeneration=0,pendingDoor=null,doorTimer=null;
function clearDoor(){if(doorTimer!==null)clearTimeout(doorTimer);doorTimer=null;pendingDoor=null;}
function nearestDoor(){
  if(!meta||state?.status!=='running'||!['relay','extract'].includes(state.phase))return null;
  const p=state.players.find(p=>p.id===self);if(!p||p.hp<=0||p.fall)return null;
  return (meta.doors||[]).filter(d=>Math.hypot(p.x-d.cx,p.z-d.cz)<=4.5&&Math.abs(p.y-d.floor)<=2).sort((a,b)=>Math.hypot(p.x-a.cx,p.z-a.cz)-Math.hypot(p.x-b.cx,p.z-b.cz))[0]||null;
}
function requestDoor(){
  const door=nearestDoor();if(!door||pendingDoor)return;
  const open=!(state.doors||[]).find(d=>d.id===door.id)?.open,id=crypto.randomUUID();
  if(channel?.door(door.id,open,id)){pendingDoor=id;doorTimer=setTimeout(()=>{clearDoor();message.textContent='Sense confirmació de la porta. Comprova la connexió i torna-ho a provar.';drawHUD();},5000);drawHUD();}
}
$('door').onclick=requestDoor;
let pendingInventory=null,inventoryTimer=null;
function clearInventory(){clearTimeout(inventoryTimer);pendingInventory=null;}
function nearestSupply(){const p=state?.players.find(p=>p.id===self);if(!p||p.hp<=0||p.fall||state.status!=='running'||!['relay','extract'].includes(state.phase))return null;return (meta?.supplies||[]).filter(s=>!state.claimedSupplies?.includes(s.id)&&Math.hypot(p.x-s.x,p.z-s.z)<=3.2&&Math.abs(p.y-s.y)<2).find(s=>{const bag=state.inventories?.find(i=>i.actorId===self);return bag&&bag[s.item]+s.amount<=({bullets:120,grenades:8,disguise:1})[s.item];});}
function requestInventory(operation){if(pendingInventory)return;const bag=state?.inventories?.find(i=>i.actorId===self),supply=nearestSupply();if(!bag||operation==='pickup'&&!supply)return;const id=crypto.randomUUID();if(channel?.inventory(operation,operation==='pickup'?supply.id:!bag.disguised,id)){pendingInventory=id;inventoryTimer=setTimeout(()=>{clearInventory();message.textContent='Sense confirmació de l’inventari. Torna-ho a provar.';drawHUD();},5000);drawHUD();}}
$('pickup').onclick=()=>requestInventory('pickup');$('disguise').onclick=()=>requestInventory('disguise');
function clear(){keys.clear();touch.clear();document.querySelectorAll('[data-key]').forEach(b=>b.classList.remove('pressed'));}
addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;if(['KeyR','KeyC'].includes(e.code)){e.preventDefault();if(!e.repeat)requestInventory(e.code==='KeyR'?'pickup':'disguise');return;}if(e.code==='KeyF'){e.preventDefault();if(!e.repeat)requestDoor();return;}if(['KeyW','KeyS','KeyA','KeyD','KeyY','KeyU','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
for(const button of document.querySelectorAll('[data-key]')){
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);touch.set(e.pointerId,button.dataset.key);button.classList.add('pressed');});
  const release=e=>{touch.delete(e.pointerId);if(![...touch.values()].includes(button.dataset.key))button.classList.remove('pressed');};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,release);
}
function drawHUD(){
  if(!state||!meta)return;
  if(['relay','extract'].includes(state.phase))$('instructions').classList.add('playing');else $('instructions').classList.remove('playing');
  const slot=meta.members.findIndex(m=>m.id===self),mine=state.players.find(p=>p.id===self),target=state.phase==='relay'?meta.terminals[slot]:meta.extraction,
    distance=mine?Math.round(Math.hypot(mine.x-target.x,mine.z-target.z)):0;
  $('objective').textContent=state.phase==='won'?'MISSIÓ COMPLETADA · Relleu activat i equip extret!':state.phase==='failed'?'Missió finalitzada sense èxit. Podeu tornar-ho a provar.':state.status==='paused'?'Missió pausada · Esperant la connexió del company.':state.phase==='relay'?`Terminal ${slot+1} · ${distance} m · Activació simultània: ${Math.floor(state.hold/90*100)}%`:`Reuniu-vos al cercle verd · ${distance} m · Extracció: ${Math.floor(state.hold/60*100)}%`;
  $('players').textContent=meta.members.map((m,i)=>`${i===0?'🔵':'🟡'} ${m.name}${m.id===self?' (tu)':''}`).join('   ·   ')+` · ${Math.ceil(state.remaining)} s`;
  launch.hidden=['relay','extract'].includes(state.phase);launch.textContent='Tornar a jugar (tots dos)';
  const door=nearestDoor();$('door').disabled=!door||!!pendingDoor;$('door').textContent=pendingDoor?'Enviant…':door?((state.doors||[]).find(d=>d.id===door.id)?.open?'Tancar · F':'Obrir · F'):'Porta · F';
  const bag=state.inventories?.find(i=>i.actorId===self),active=state.status==='running'&&['relay','extract'].includes(state.phase)&&mine?.hp>0&&!mine.fall;
  $('inventory').textContent=bag?`El teu inventari · Bales: ${bag.bullets}/120 · Granades: ${bag.grenades}/8 · Disfressa: ${bag.disguise}${bag.disguised?' (posada)':''}`:'';
  $('pickup').disabled=!!pendingInventory||!nearestSupply();$('disguise').disabled=!!pendingInventory||!active||!bag?.disguise;$('disguise').textContent=bag?.disguised?'Treure disfressa · C':'Posar disfressa · C';
  view?.setState(state);
}
launch.onclick=()=>{if(room&&channel?.launch(room.revision))message.textContent='Esperant la confirmació dels dos jugadors…';else message.textContent='Espera que s’obri la connexió.';};
try{
  const accounts=await configuredAccounts(),user=accounts.status().user;
  if(!user||accounts.status().approval!=='approved')throw Error('Cal iniciar sessió amb un compte aprovat des de la portada.');
  self=user.id;const result=await accounts.request('coop/current',{headers:{'X-Hunter-User':self}});room=result.room;
  if(!room||new URL(location.href).searchParams.get('room')!==room.id)throw Error('Obre la teva sala cooperativa des de la portada.');
  const url=new URL('/api/coop/socket',location.origin);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('room',room.id);
  channel=createPlayConnection({url:url.href,version:GAME_VERSION,getInput:()=>playInput(new Set([...keys,...touch.values()]),document.hidden),
    onStatus:status=>{connection.textContent=({connecting:'Connectant…',open:'Connexió oberta',retrying:'Reconnectant…',replaced:'Connexió oberta en una altra pestanya',ended:'Connexió finalitzada. Torna a la sala.'}[status]||status);if(status!=='open'){clearInventory();$('pickup').disabled=true;$('disguise').disabled=true;clear();clearDoor();$('door').disabled=true;}},
    onMessage:async data=>{
      if(data.type==='room'){
        room=data.room;launch.disabled=!room?.allReady;
        if(!room){message.textContent='La sala s’ha tancat. Torna a la portada.';launch.disabled=true;clear();}
        else if(!meta)message.textContent=room.allReady?'Tots dos preparats. Cadascú ha de prémer Iniciar missió.':'Torneu a la sala i marqueu-vos tots dos com a preparats.';
      }else if(data.type==='mission'){
        if(data.self!==self){channel.stop();message.textContent='Identitat de missió incorrecta.';return;}
        clearInventory();clearDoor();const token=++viewGeneration;meta=data.meta;state=data.state;view?.destroy();view=null;drawHUD();message.textContent='Tu ets el jugador '+(meta.members.findIndex(m=>m.id===self)+1)+'. Segueix el recorregut del teu color.';
        const next=await createMissionView($('view'),meta,data.geometry);if(token!==viewGeneration){next.destroy();return;}view=next;drawHUD();
      }else if(data.type==='state'&&data.state?.missionId===meta?.id){state=data.state;drawHUD();}
      else if(data.type==='action'){if(pendingInventory===data.commandId){clearInventory();message.textContent=({PICKED_UP:'Subministrament afegit al teu inventari.',EQUIPPED:'Disfressa actualitzada.',TAKEN:'Aquest subministrament ja s’ha recollit.',FULL:'Inventari ple per a aquest objecte.',EMPTY:'No tens cap disfressa.',TOO_FAR:'Acosta’t al subministrament.',NOT_ACTIVE:'La missió ha d’estar en marxa.',SAVE_FAILED:'No s’ha pogut desar el canvi. Torna-ho a provar.'}[data.code]||'Ordre d’inventari confirmada.');drawHUD();return;}if(pendingDoor===data.commandId)clearDoor();message.textContent=data.duplicate?'Ordre ja confirmada. Estat actual sincronitzat.':({OPENED:'Porta oberta.',CLOSED:'Porta tancada.',UNCHANGED:'La porta ja és en aquest estat.',OCCUPIED:'Hi ha un jugador al pas. Allunyeu-vos abans de tancar.',TOO_FAR:'Acosta’t a la porta.',COOLDOWN:'Espera un moment abans de tornar a moure la porta.',NOT_ACTIVE:'La missió ha d’estar en marxa.',SAVE_FAILED:'No s’ha pogut desar el canvi. Torna-ho a provar.'}[data.code]||'No s’ha pogut moure la porta.');drawHUD();}
      else if(['waiting','error','ended'].includes(data.type)){message.textContent=data.message;if(data.type==='ended'){clearInventory();$('pickup').disabled=true;$('disguise').disabled=true;clear();clearDoor();$('door').disabled=true;state=null;meta=null;viewGeneration++;view?.destroy();view=null;launch.hidden=false;}}
    }});
  channel.start();
}catch(e){message.textContent=e.message;connection.textContent='No s’ha pogut obrir la missió';}
addEventListener('pagehide',()=>{clearInventory();clear();clearDoor();channel?.stop();viewGeneration++;view?.destroy();});
