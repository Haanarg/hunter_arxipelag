// HUD i menús. Manté la presentació fora del bucle principal de simulació.
window.HUNTER_UI=Object.freeze({
  createCombatFeedback({element,hit,direction}){
    const HIT_SECONDS=.18,DAMAGE_SECONDS=.72,
      state={hitUntil:0,damageUntil:0,sourceX:null,sourceZ:null,
        directionAngle:0,hitVisible:false,damageVisible:false};
    function clear(){
      state.hitUntil=0;state.damageUntil=0;state.sourceX=null;state.sourceZ=null;
      state.directionAngle=0;state.hitVisible=false;state.damageVisible=false;
      element.hidden=true;hit.hidden=true;direction.hidden=true;
      hit.style.opacity='0';direction.style.opacity='0';
    }
    function confirmHit(now=performance.now()){
      if(Number.isFinite(now))state.hitUntil=now+HIT_SECONDS*1000;
    }
    function damage(source,now=performance.now()){
      if(!Number.isFinite(now))return;
      state.damageUntil=now+DAMAGE_SECONDS*1000;
      state.sourceX=Number.isFinite(source?.x)?source.x:null;
      state.sourceZ=Number.isFinite(source?.z)?source.z:null;
    }
    function update({now=performance.now(),active,playerX,playerZ,forwardX,forwardZ}){
      if(!active||!Number.isFinite(now)){clear();return}
      const hitLeft=Math.max(0,(state.hitUntil-now)/1000),
        damageLeft=Math.max(0,(state.damageUntil-now)/1000),
        dx=state.sourceX===null?0:state.sourceX-playerX,
        dz=state.sourceZ===null?0:state.sourceZ-playerZ,
        validDirection=state.sourceX!==null&&state.sourceZ!==null&&
          Math.hypot(dx,dz)>.1&&Math.hypot(forwardX,forwardZ)>.001;
      state.hitVisible=hitLeft>0;
      state.damageVisible=damageLeft>0&&validDirection;
      if(state.damageVisible){
        // Dalt = davant de la càmera; +90° = dreta de la pantalla.
        state.directionAngle=Math.atan2(-dx*forwardZ+dz*forwardX,dx*forwardX+dz*forwardZ);
        direction.style.transform='translate(-50%,-50%) rotate('+state.directionAngle+'rad)';
      }
      hit.hidden=!state.hitVisible;direction.hidden=!state.damageVisible;
      hit.style.opacity=String(Math.min(1,hitLeft/HIT_SECONDS));
      direction.style.opacity=String(.78*Math.min(1,damageLeft/DAMAGE_SECONDS));
      element.hidden=!state.hitVisible&&!state.damageVisible;
    }
    clear();
    return Object.freeze({state,confirmHit,damage,update,clear});
  },
  create({hud,panel,title,body,resumeButton,minimap,getState,actions}){
    function renderHUD(context){
      const s=getState(context),state=s.vehicle?s.vehicleTypes[s.vehicle.t].n:s.swimming?'Nedant':s.crouching?'Ajupit':s.inside?'Interior':'A peu',veh=s.vehicle,vehInfo=veh?'<br>🛡️ '+Math.max(0,veh.life??0)+'/'+(veh.maxLife??0)+(veh.t==='llanxa_coets'?' · 🚀 ∞':veh.rockets!=null?' · 🚀 '+veh.rockets:veh.t==='heli'?' · 💣 '+(s.inventory.granada||0)+' granades':''):'',weaponInfo=s.bazookaEquipped&&!veh?' · 🚀 Bazooka '+(s.inventory.bazooka||0)+' coets':s.grenadeEquipped&&!veh?' · 💣 Granades '+(s.inventory.granada||0):s.cisallaEquipped&&!veh?' · ✂ Cisalla':s.sniperEquipped&&!veh?' · 🔭 Rifle '+s.sniperAmmo+' cartutxos'+(s.scopeActive?' · Mira x8':''):'';
      const html=`<b>HUNTER · ARXIPÈLAG</b><br>❤️ ${s.hp>0?Math.max(1,Math.ceil(s.hp)):0} · 🎯 ${s.ammo} · ☠ ${s.kills}<br>${state}${s.disguised?' · 🎭 Disfressat':''}${weaponInfo}${vehInfo}${s.nearVehicle&&!s.vehicle?'<br>Acció: puja a '+s.vehicleTypes[s.nearVehicle.t].n:''}${s.messageTime>0?'<br>'+s.message:''}${s.waypoint?'<br>Destinació: '+Math.round(Math.hypot(s.waypoint.x-s.player.x,s.waypoint.z-s.player.z))+' m':''}<br><span style="opacity:.72">Llavor ${s.seed>>>0} · X ${s.player.x|0} · Z ${s.player.z|0}</span>`;
      if(hud.innerHTML!==html)hud.innerHTML=html;
    }
    let currentMode=null;
    function hide(){panel.style.display='none';currentMode=null}
    function show(mode){
      currentMode=mode;panel.style.display='flex';
      resumeButton.onclick=mode==='bombtimer'?()=>actions.open('inventory'):actions.resume;
      title.textContent=mode==='bombtimer'?'Programar explosiu':mode==='map'?'Carta de navegació':mode==='inventory'?'Inventari':mode==='restart'?'Nova operació?':mode==='performance'?'Rendiment':'Operació en pausa';panel.querySelector('.card').classList.toggle('inventory-card',mode==='inventory');
      if(mode==='inventory'){
        const state=getState(),keys=['med','paracaigudes','cisalla','expl','granada','bazooka','franctirador','disf','arma'],present=keys.filter(k=>state.inventory[k]>0);
        let selected=present[0]||null;
        const renderInventory=(healed=0)=>{
          const st=getState(),items=keys.filter(k=>st.inventory[k]>0),
                life=Math.max(0,Math.min(20,st.hp>0?Math.ceil(st.hp):0));
          body.innerHTML='<div class="inv-health" role="status" aria-live="polite">'+
            '<div class="inv-health-line"><b>❤️ Vida '+life+' / 20</b>'+
            (healed>0?'<strong class="inv-healed">+'+healed+' vida</strong>':'')+'</div>'+
            '<div class="inv-health-track"><div class="inv-health-fill" style="width:'+(life/20*100)+'%"></div></div></div>'+
            '<div class="inv-wrap"><section><div class="inv-grid" id="invGrid"></div></section><aside class="inv-detail" id="invDetail"></aside></div>';
          const grid=document.getElementById('invGrid'),detail=document.getElementById('invDetail');
          const slots=Math.max(15,Math.ceil(Math.max(1,items.length)/5)*5);
          for(let i=0;i<slots;i++){
            const id=items[i],el=document.createElement('button');el.className='inv-slot'+(id===selected?' selected':'');
            if(id){const d=st.itemTypes[id];el.innerHTML='<span>'+d.icon+'</span><span class="inv-count">×'+st.inventory[id]+'</span>';el.title=d.n;el.onclick=()=>{selected=id;if(d.usable){const before=getState().hp,changed=actions.useItem(id);if(changed){renderHUD();if(id!=='expl'&&id!=='granada'&&id!=='bazooka'&&id!=='franctirador'&&id!=='mapa'&&id!=='mapa_heli'&&id!=='mapa_tanc')renderInventory(Math.max(0,Math.round(getState().hp-before)))}}else renderInventory()}}
            else{el.disabled=true;el.setAttribute('aria-hidden','true')}
            grid.appendChild(el)
          }
          if(!selected||!st.inventory[selected])selected=items[0]||null;
          if(!selected){detail.innerHTML='<div class="inv-icon">🎒</div><h3>Inventari buit</h3><p>Explora edificis i assentaments per trobar equipament.</p>';return}
          const d=st.itemTypes[selected];detail.innerHTML='<div class="inv-icon">'+d.icon+'</div><h3>'+d.n+'</h3><p>'+d.desc+'</p>';
        };
        renderInventory();
      }else if(mode==='bombtimer'){
        // El LED és la mateixa disposició 00:SS del model 3D. Només
        // configuram els dos dígits dels segons, amb límit 00–59.
        let seconds=3,confirmed=false;
        const fromHelicopter=getState().vehicle?.t==='heli';
        body.innerHTML='<div class="bomb-timer-config" role="group" aria-label="Temporitzador de l’explosiu">'+
          '<p class="bomb-timer-hint">'+(fromHelicopter?
            'L’explosiu caurà de l’obertura lateral del Huey. Selecciona el temps (00–59 s).':
            'Selecciona els segons abans de la detonació (00–59).')+'</p>'+
          '<div class="bomb-timer-casing"><div class="bomb-timer-led" role="timer" aria-label="Compte enrere configurat">'+
          '<span class="bomb-timer-prefix">00:</span>'+
          '<div class="bomb-timer-digit"><button id="bombTensUp" type="button" aria-label="Augmenta les desenes de segons">▲</button><span id="bombTens" aria-live="polite">0</span><button id="bombTensDown" type="button" aria-label="Redueix les desenes de segons">▼</button></div>'+
          '<div class="bomb-timer-digit"><button id="bombOnesUp" type="button" aria-label="Augmenta les unitats de segons">▲</button><span id="bombOnes" aria-live="polite">3</span><button id="bombOnesDown" type="button" aria-label="Redueix les unitats de segons">▼</button></div>'+
          '</div><div class="bomb-timer-wires" aria-hidden="true"><i></i><i></i><i></i></div></div>'+
          '<p class="bomb-timer-warning">00 = detonació immediata'+(fromHelicopter?' en deixar-la anar.':' després de col·locar la bomba.')+'</p>'+
          '<div class="bomb-timer-actions"><button id="bombTimerCancel" type="button">Cancel·lar</button><button id="bombTimerConfirm" type="button">'+(fromHelicopter?'Activar i deixar caure':'Activar i col·locar')+'</button></div></div>';
        const tens=document.getElementById('bombTens'),ones=document.getElementById('bombOnes'),
              confirm=document.getElementById('bombTimerConfirm');
        const draw=()=>{tens.textContent=String(Math.floor(seconds/10));ones.textContent=String(seconds%10)};
        draw();
        const changeDigit=(place,step)=>{
          const n=Math.floor(seconds/10),u=seconds%10;
          seconds=place==='tens'?((n+step+6)%6)*10+u:
            n*10+(u+step+10)%10;
          draw();
        };
        document.getElementById('bombTensUp').onclick=()=>changeDigit('tens',1);
        document.getElementById('bombTensDown').onclick=()=>changeDigit('tens',-1);
        document.getElementById('bombOnesUp').onclick=()=>changeDigit('ones',1);
        document.getElementById('bombOnesDown').onclick=()=>changeDigit('ones',-1);
        document.getElementById('bombTimerCancel').onclick=()=>actions.open('inventory');
        confirm.onclick=()=>{
          if(confirmed)return;
          confirmed=true;confirm.disabled=true;
          if(!actions.placeExplosive(seconds)){
            confirmed=false;confirm.disabled=false;
          }
        };
      }else if(mode==='map'){
        body.innerHTML='<canvas id="fullmap" width="510" height="510" aria-label="Mapa: toca per marcar una destinació"></canvas><p>Toca el mapa per marcar una destinació. Blau: base · Groc: vehicles · Vermell: enemics · Cian: helicòpters · Taronja: tancs.</p><button id="clearMark">Esborra marca</button>';
        const map=document.getElementById('fullmap');minimap.drawFull(map,getState().waypoint);
        map.onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),s=getState();actions.setWaypoint({x:((e.clientX-r.left)/r.width-.5)*s.worldSize,z:((e.clientY-r.top)/r.height-.5)*s.worldSize});minimap.drawFull(map,getState().waypoint)};
        document.getElementById('clearMark').onclick=()=>{actions.setWaypoint(null);minimap.drawFull(map,null)}
      }else if(mode==='cheats'){
        body.innerHTML='<p>Activa o desactiva cada avantatge per separat.</p>'+
          '<div class="performance-options">'+
          '<label><input id="cheatItems" type="checkbox"> Tots els objectes i munició infinits (també vehicles)</label>'+
          '<label><input id="cheatInvisible" type="checkbox"> Invisible per als enemics</label>'+
          '<label><input id="cheatImmune" type="checkbox"> Immune als atacs</label>'+
          '<label><input id="cheatFly" type="checkbox"> Vol ràpid (H / J per pujar i baixar)</label>'+
          '</div><button id="cheatsBack">← Pausa</button>';
        for(const [id,key] of [['cheatItems','items'],['cheatInvisible','invisible'],['cheatImmune','immune'],['cheatFly','fly']]){
          const input=document.getElementById(id);
          input.checked=!!getState().cheats?.[key];
          input.onchange=()=>actions.setCheat(key,input.checked);
        }
        document.getElementById('cheatsBack').onclick=()=>actions.open('pause');
      }else if(mode==='performance'){
        body.innerHTML='<p>Canvis immediats, sense regenerar el mapa.</p>'+
          '<div class="performance-options">'+
          '<label><input id="disablePalmsPause" type="checkbox"> Sense palmeres</label>'+
          '<label><input id="disableWaterPause" type="checkbox"> Sense aigua</label>'+
          '<label><input id="disableShadowsPause" type="checkbox"> Sense ombres</label>'+
          '</div><label class="pause-stats-toggle"><input id="showPerfStatsOptions" type="checkbox"> Mostrar estadístiques de rendiment durant la partida</label>'+
          '<label class="pause-stats-toggle"><input id="showStealthDebug" type="checkbox"> Cons de visió (F9)</label>'+
          '<label><input id="showStealthNoise" type="checkbox"> Radis de soroll</label>'+
          '<p style="font:12px/1.4 system-ui;opacity:.8">Verd: visió · vermell: radi dels sorolls i crits d’alerta.</p>'+
          '<div id="performanceBreakdown" style="font:13px/1.5 monospace;white-space:pre-line;background:#0d1d30;border-radius:8px;padding:12px;margin-top:12px"></div>'+
          '<button id="performanceRefresh">Actualitza diagnòstic</button><button id="performanceBack">← Pausa</button>';
        for(const [id,key,callback] of [
          ['disablePalmsPause','palmsDisabled',actions.setPalmsDisabled],
          ['disableWaterPause','waterDisabled',actions.setWaterDisabled],
          ['disableShadowsPause','shadowsDisabled',actions.setShadowsDisabled]
        ]){
          const input=document.getElementById(id);input.checked=getState()[key];
          input.onchange=e=>callback(e.target.checked);
        }
        const refresh=()=>{
          const s=getState(),perf=s.performance||{},draw=perf.drawCategories||{};
          const rows=Object.entries(draw).sort((a,b)=>b[1]-a[1]);
          document.getElementById('performanceBreakdown').textContent=
            'FPS '+Math.round(perf.fps||0)+' · '+(perf.drawCalls||0)+' dibuixos totals'+
            '\nCrides per categoria (escena principal, sense ombres):\n'+
            rows.map(([name,count])=>name+': '+count).join('\n')+
            '\nEnemics LOD: '+JSON.stringify(s.enemyLodStats||{})+
            '\nObjectes ocults per distància: '+JSON.stringify(s.visibilityStats||{});
        };
        const statsToggle=document.getElementById('showPerfStatsOptions');
        statsToggle.checked=!!getState().performanceStatsVisible;
        statsToggle.onchange=()=>actions.setPerformanceStatsVisible(statsToggle.checked);
        const stealthToggle=document.getElementById('showStealthDebug');
        stealthToggle.checked=!!getState().stealthLayers?.sight;
        stealthToggle.onchange=()=>actions.setStealthLayer('sight',stealthToggle.checked);
        for(const [id,key] of [['showStealthNoise','noise']]){const el=document.getElementById(id);el.checked=!!getState().stealthLayers?.[key];el.onchange=()=>actions.setStealthLayer(key,el.checked)}
        document.getElementById('performanceRefresh').onclick=refresh;
        document.getElementById('performanceBack').onclick=()=>actions.open('pause');
        refresh();
      }else if(mode==='restart'){
        body.innerHTML='<p>Perdràs el progrés. Dificultat de la nova partida:</p><button data-diff=".6">Fàcil</button><button data-diff="1">Normal</button><button data-diff="1.5">Difícil</button>';
        body.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>actions.restart(+b.dataset.diff))
      }else{
        body.innerHTML='<div class="pause-help" aria-label="Controls bàsics">'+
          '<div><b>WASD / fletxes</b><span>Moviment i gir</span></div>'+
          '<div><b>Maj. / joystick ↑</b><span>Córrer o nedar a crol</span></div>'+
          '<div><b>X · AJUPIR</b><span>Sigil: menys velocitat, soroll i visibilitat</span></div>'+
          '<div><b>Y / U · ◀ ▶</b><span>Desplaçament lateral, també nedant</span></div>'+
          '<div><b>E · Acció</b><span>Pujar o baixar del vehicle; motxilla</span></div>'+
          '<div><b>F · Dispar</b><span>Arma, cisalla o granada (mantén per llançar lluny)</span></div>'+
          '<div><b>T · Mira</b><span>Zoom del franctirador</span></div>'+
          '<div><b>M</b><span>Mapa i destinació</span></div>'+
          '<div><b>H / J</b><span>Helicòpter: pujar / baixar</span></div>'+
          '<div><b>Arrossega / roda</b><span>Girar vista / ajustar càmera</span></div>'+
          '</div>'+
          '<p class="pause-note">Els mapes recollits s’activen sols. Gestiona l’equipament amb la motxilla.</p>'+
          '<p class="pause-note">Senyals sobre soldats visibles: ? ambre · sospita; ! coral · contacte confirmat; ◇ blau · cerca o investigació. Desapareixen darrere la cobertura.</p>'+
          '<label class="pause-stats-toggle"><input id="audioEnabledPause" type="checkbox"> So activat</label>'+
          '<div class="pause-menu-actions">'+
          '<button id="chetosMenu">Chetos</button>'+
          '<button id="restartMenu">Nova partida</button>'+
          '<button id="performanceMenu">⚙️ Rendiment</button>'+
          '</div>';
        document.getElementById('chetosMenu').onclick=()=>actions.open('cheats');
        document.getElementById('restartMenu').onclick=()=>actions.open('restart');
        document.getElementById('performanceMenu').onclick=()=>actions.open('performance');
        const audioEnabled=document.getElementById('audioEnabledPause');
        audioEnabled.checked=!getState().muted;
        audioEnabled.onchange=()=>actions.setAudioMuted(!audioEnabled.checked);
      }
    }
    resumeButton.onclick=actions.resume;
    return Object.freeze({renderHUD,show,hide,isBombTimerOpen:()=>currentMode==='bombtimer'})
  }
});

