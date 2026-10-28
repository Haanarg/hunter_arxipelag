import {configuredAccounts} from './account-client.mjs';
import {GAME_VERSION} from './version.mjs?v=0.6.28';
import {createPlayConnection,playInput} from './coop-play-connection.mjs?v=0.6.28';
import {createMissionView} from './coop-play-view.mjs?v=0.6.28';
const $=id=>document.getElementById(id),message=$('message'),launch=$('launch'),connection=$('connection'),keys=new Set(),touch=new Map();
let channel=null,room=null,view=null,meta=null,self=null,state=null,viewGeneration=0,pendingDoor=null,doorTimer=null;
function clearDoor(){if(doorTimer!==null)clearTimeout(doorTimer);doorTimer=null;pendingDoor=null;}
function nearestDoor(){
  if(!meta||state?.status!=='running'||!['relay','extract'].includes(state.phase))return null;
  const p=state.players.find(p=>p.id===self);if(!p||p.hp<=0||p.fall)return null;
  return (meta.doors||[]).filter(d=>Math.hypot(p.x-d.cx,p.z-d.cz)<=4.5&&Math.abs(p.y-d.floor)<=2).sort((a,b)=>Math.hypot(p.x-a.cx,p.z-a.cz)-Math.hypot(p.x-b.cx,p.z-b.cz))[0]||null;
}
function requestDoor(){
  const door=contextDoor();if(!door||pendingDoor)return;
  const open=!(state.doors||[]).find(d=>d.id===door.id)?.open,id=crypto.randomUUID();
  if(channel?.door(door.id,open,id)){pendingDoor=id;doorTimer=setTimeout(()=>{clearDoor();message.textContent='Sense confirmació de la porta. Comprova la connexió i torna-ho a provar.';drawHUD();},5000);drawHUD();}
}

let pendingInventory=null,inventoryTimer=null;
function clearInventory(){clearTimeout(inventoryTimer);pendingInventory=null;}
function requestInventory(operation){if(pendingInventory)return;const bag=state?.inventories?.find(i=>i.actorId===self);if(!bag)return;const id=crypto.randomUUID();if(channel?.inventory(operation,operation==='drop'?$('drop-item').value:!bag.disguised,id)){pendingInventory=id;inventoryTimer=setTimeout(()=>{clearInventory();message.textContent='Sense confirmació de l’inventari. Torna-ho a provar.';drawHUD();},5000);drawHUD();}}
$('drop').onclick=()=>requestInventory('drop');$('disguise').onclick=()=>requestInventory('disguise');$('drop-item').onchange=drawHUD;
function requestCombat(weapon){if(channel?.combat(weapon,crypto.randomUUID()))message.textContent='Ordre de combat enviada…';}
$('shoot').onclick=()=>requestCombat('pistol');$('grenade').onclick=()=>requestCombat('grenade');
function reviveTarget(requireMedkit=true){if(requireMedkit&&!(state?.inventories?.find(b=>b.actorId===self)?.medkits>0))return null;const me=state?.players.find(p=>p.id===self);if(!me||me.hp<=0||me.fall||me.swimming||state.status!=='running'||!['relay','extract'].includes(state.phase))return null;const down=state.rescue?.down.find(d=>d.actorId!==self),other=state.players.find(p=>p.id===down?.actorId);return down?.helpers?.includes(self)&&other&&!other.fall&&!other.swimming&&Math.hypot(me.x-other.x,me.z-other.z)<=3.2&&Math.abs(me.y-other.y)<2?down:null;}
function atTerminal(){const p=state?.players.find(p=>p.id===self),slot=meta?.members.findIndex(m=>m.id===self),q=meta?.terminals[slot];return !!(p&&q&&state.status==='running'&&state.phase==='relay'&&p.hp>0&&!p.fall&&Math.hypot(p.x-q.x,p.z-q.z)<=3.2&&Math.abs(p.y-q.y)<2);}
function contextDoor(){return reviveTarget()||atTerminal()?null:nearestDoor();}
$('action').addEventListener('pointerdown',e=>{e.preventDefault();$('action').setPointerCapture(e.pointerId);if(contextDoor())requestDoor();else if(reviveTarget()||atTerminal()){touch.set(e.pointerId,'KeyE');$('action').classList.add('pressed');}});
$('action').addEventListener('keydown',e=>{if(!['Enter','Space'].includes(e.code))return;e.preventDefault();e.stopPropagation?.();if(!e.repeat){if(contextDoor())requestDoor();else if(reviveTarget()||atTerminal())keys.add('KeyE');}});
$('action').addEventListener('keyup',e=>{if(['Enter','Space'].includes(e.code)){e.preventDefault();e.stopPropagation?.();keys.delete('KeyE');}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('action').addEventListener(type,e=>{touch.delete(e.pointerId);$('action').classList.remove('pressed');});
function clear(){keys.clear();touch.clear();document.querySelectorAll('[data-key]').forEach(b=>b.classList.remove('pressed'));$('action').classList.remove('pressed');}
addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||['SELECT','INPUT','TEXTAREA'].includes(e.target?.tagName))return;if(['KeyF','KeyB'].includes(e.code)){e.preventDefault();if(!e.repeat)requestCombat(e.code==='KeyF'?'pistol':'grenade');return;}if(['KeyG','KeyC'].includes(e.code)){e.preventDefault();if(!e.repeat)requestInventory(e.code==='KeyG'?'drop':'disguise');return;}if(['KeyE','Space'].includes(e.code)){e.preventDefault();if(!e.repeat){if(contextDoor())requestDoor();else keys.add('KeyE');}return;}if(['KeyW','KeyS','KeyA','KeyD','KeyY','KeyU','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);}});
addEventListener('keyup',e=>{keys.delete(e.code);if(['KeyE','Space'].includes(e.code))keys.delete('KeyE');});addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
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
  $('players').textContent=meta.members.map((m,i)=>`${i===0?'🔵':'🟡'} ${m.name}${m.id===self?' (tu)':''} · ${state.players.find(p=>p.id===m.id)?.hp??0}/20 PV${state.rescue?.down.find(d=>d.actorId===m.id)?' · FERIT':''}${state.rescue?.immune.some(d=>d.actorId===m.id&&state.tick<d.untilTick)?' · PROTEGIT':''}`).join('   ·   ')+` · ${Math.ceil(state.remaining)} s`;
  const down=state.rescue?.down||[],mineDown=down.find(d=>d.actorId===self);
  if(['relay','extract'].includes(state.phase)&&down.length&&state.status==='running')$('objective').textContent=mineDown?`Estàs ferit · El company té ${Math.ceil(mineDown.remaining)} s per reanimar-te.`:`Company ferit · ${Math.ceil(down[0].remaining)} s · ${state.inventories?.find(b=>b.actorId===self)?.medkits>0?'Acosta’t, queda’t quiet i mantén E':'Et cal una farmaciola'}: ${Math.floor(down[0].progress/90*100)}%`;
  launch.hidden=['relay','extract'].includes(state.phase);launch.textContent='Tornar a jugar (tots dos)';
  const door=contextDoor(),terminal=atTerminal(),reviving=reviveTarget(),needsMedkit=!reviving&&reviveTarget(false);$('action').disabled=!!pendingDoor||(!door&&!terminal&&!reviving);$('action').textContent=pendingDoor?'Enviant…':reviving?`✚ Reanimar · ${Math.floor(reviving.progress/90*100)}% · E`:door?((state.doors||[]).find(d=>d.id===door.id)?.open?'🚪 Tancar · E':'🚪 Obrir · E'):terminal?'✋ Mantenir Activar · E':needsMedkit?'✚ Cal una farmaciola':'✋ Acció · E';
  $('action').setAttribute('aria-label',reviving?'Mantenir per reanimar el company':door?((state.doors||[]).find(d=>d.id===door.id)?.open?'Tancar porta':'Obrir porta'):terminal?'Mantenir per activar terminal':needsMedkit?'Cal una farmaciola per reanimar':'Acció');
  const bag=state.inventories?.find(i=>i.actorId===self),active=state.status==='running'&&['relay','extract'].includes(state.phase)&&mine?.hp>0&&!mine.fall;
  $('inventory').textContent=bag?`El teu inventari · Bales: ${bag.bullets}/120 · Granades: ${bag.grenades}/8 · Farmacioles: ${bag.medkits}/3 · Disfressa: ${bag.disguise}${bag.disguised?' (posada)':''}`:'';
  $('drop').disabled=!!pendingInventory||!active||!bag?.[$('drop-item').value];$('disguise').disabled=!!pendingInventory||!active||!bag?.disguise;$('disguise').textContent=bag?.disguised?'Treure disfressa · C':'Posar disfressa · C';
  $('shoot').disabled=!active||!bag?.bullets;$('grenade').disabled=!active||!bag?.grenades;const targets=state.combat?.targets||[];$('combat-status').textContent=`Guàrdies: ${targets.filter(t=>t.hp<=0).length}/${targets.length} · Sense foc amic`;
  view?.setState(state);
}
launch.onclick=()=>{if(room&&channel?.launch(room.revision))message.textContent='Esperant la confirmació dels dos jugadors…';else message.textContent='Espera que s’obri la connexió.';};
try{
  const accounts=await configuredAccounts(),user=accounts.status().user;
  if(!user||accounts.status().approval!=='approved')throw Error('Cal iniciar sessió amb un compte aprovat des de la portada.');
  self=user.id;const result=await accounts.request('coop/current',{headers:{'X-Hunter-User':self}});room=result.room;
  if(!room||new URL(location.href).searchParams.get('room')!==room.id)throw Error('Obre la teva sala cooperativa des de la portada.');
  const url=new URL('/api/coop/socket',location.origin);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('room',room.id);
  channel=createPlayConnection({url:url.href,version:GAME_VERSION,getInput:()=>{const input=playInput(new Set([...keys,...touch.values()]),document.hidden);if(!reviveTarget()&&!atTerminal())input.interact=false;return input;},
    onStatus:status=>{connection.textContent=({connecting:'Connectant…',open:'Connexió oberta',retrying:'Reconnectant…',replaced:'Connexió oberta en una altra pestanya',ended:'Connexió finalitzada. Torna a la sala.'}[status]||status);if(status!=='open'){clearInventory();$('shoot').disabled=true;$('grenade').disabled=true;$('drop').disabled=true;$('disguise').disabled=true;clear();clearDoor();$('action').disabled=true;}},
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
      else if(data.type==='action'){if(data.kind==='combat'){message.textContent=data.duplicate?'Ordre de combat ja confirmada.':({HIT:'Impacte confirmat!',FIRED:'Tret efectuat.',THROWN:'Granada llançada.',EMPTY:'No tens munició per a aquesta arma.',COOLDOWN:'Espera abans de tornar a atacar.',NOT_ACTIVE:'La missió ha d’estar en marxa i el jugador a terra.',SAVE_FAILED:'No s’ha pogut desar l’atac. Torna-ho a provar.'}[data.code]||'Ordre de combat rebutjada.');drawHUD();return;}if(pendingInventory===data.commandId){clearInventory();message.textContent=({DROPPED:'Objecte deixat a terra. El company el pot recollir passant-hi per sobre.',GROUND_FULL:'Hi ha massa objectes a terra.',EQUIPPED:'Disfressa actualitzada.',TAKEN:'Aquest subministrament ja s’ha recollit.',FULL:'Inventari ple per a aquest objecte.',EMPTY:'No tens aquest objecte.',TOO_FAR:'Acosta’t al subministrament.',NOT_ACTIVE:'La missió ha d’estar en marxa.',SAVE_FAILED:'No s’ha pogut desar el canvi. Torna-ho a provar.'}[data.code]||'Ordre d’inventari confirmada.');drawHUD();return;}if(pendingDoor===data.commandId)clearDoor();message.textContent=data.duplicate?'Ordre ja confirmada. Estat actual sincronitzat.':({OPENED:'Porta oberta.',CLOSED:'Porta tancada.',UNCHANGED:'La porta ja és en aquest estat.',OCCUPIED:'Hi ha un jugador al pas. Allunyeu-vos abans de tancar.',TOO_FAR:'Acosta’t a la porta.',COOLDOWN:'Espera un moment abans de tornar a moure la porta.',NOT_ACTIVE:'La missió ha d’estar en marxa.',SAVE_FAILED:'No s’ha pogut desar el canvi. Torna-ho a provar.'}[data.code]||'No s’ha pogut moure la porta.');drawHUD();}
      else if(['waiting','error','ended'].includes(data.type)){message.textContent=data.message;if(data.type==='ended'){clearInventory();$('shoot').disabled=true;$('grenade').disabled=true;$('drop').disabled=true;$('disguise').disabled=true;clear();clearDoor();$('action').disabled=true;state=null;meta=null;viewGeneration++;view?.destroy();view=null;launch.hidden=false;}}
    }});
  channel.start();
}catch(e){message.textContent=e.message;connection.textContent='No s’ha pogut obrir la missió';}
addEventListener('pagehide',()=>{clearInventory();clear();clearDoor();channel?.stop();viewGeneration++;view?.destroy();});
