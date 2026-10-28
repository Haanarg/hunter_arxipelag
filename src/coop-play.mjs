import {configuredAccounts} from './account-client.mjs';
import {GAME_VERSION} from './version.mjs?v=0.6.18';
import {createPlayConnection,playInput} from './coop-play-connection.mjs?v=0.6.18';
import {createMissionView} from './coop-play-view.mjs?v=0.6.18';
const $=id=>document.getElementById(id),message=$('message'),launch=$('launch'),connection=$('connection'),keys=new Set(),touch=new Map();
let channel=null,room=null,view=null,meta=null,self=null,state=null,viewGeneration=0;
function clear(){keys.clear();touch.clear();document.querySelectorAll('[data-key]').forEach(b=>b.classList.remove('pressed'));}
addEventListener('keydown',e=>{if(['KeyW','KeyS','KeyA','KeyD','KeyY','KeyU','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);}});
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
    onStatus:status=>{connection.textContent=({connecting:'Connectant…',open:'Connexió oberta',retrying:'Reconnectant…',replaced:'Connexió oberta en una altra pestanya',ended:'Connexió finalitzada. Torna a la sala.'}[status]||status);if(status!=='open')clear();},
    onMessage:async data=>{
      if(data.type==='room'){
        room=data.room;launch.disabled=!room?.allReady;
        if(!room){message.textContent='La sala s’ha tancat. Torna a la portada.';launch.disabled=true;clear();}
        else if(!meta)message.textContent=room.allReady?'Tots dos preparats. Cadascú ha de prémer Iniciar missió.':'Torneu a la sala i marqueu-vos tots dos com a preparats.';
      }else if(data.type==='mission'){
        if(data.self!==self){channel.stop();message.textContent='Identitat de missió incorrecta.';return;}
        const token=++viewGeneration;meta=data.meta;state=data.state;view?.destroy();view=null;drawHUD();message.textContent='Tu ets el jugador '+(meta.members.findIndex(m=>m.id===self)+1)+'. Segueix el recorregut del teu color.';
        const next=await createMissionView($('view'),meta,data.geometry);if(token!==viewGeneration){next.destroy();return;}view=next;drawHUD();
      }else if(data.type==='state'&&data.state?.missionId===meta?.id){state=data.state;drawHUD();}
      else if(['waiting','error','ended'].includes(data.type)){message.textContent=data.message;if(data.type==='ended'){clear();state=null;meta=null;viewGeneration++;view?.destroy();view=null;launch.hidden=false;}}
    }});
  channel.start();
}catch(e){message.textContent=e.message;connection.textContent='No s’ha pogut obrir la missió';}
addEventListener('pagehide',()=>{clear();channel?.stop();viewGeneration++;view?.destroy();});
