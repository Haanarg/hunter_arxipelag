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
      const s=getState(context),state=s.vehicle?s.vehicleTypes[s.vehicle.t].n:s.swimming?'Nedant':s.crouching?'Ajupit':s.inside?'Interior':'A peu',veh=s.vehicle,vehInfo=veh?'<br>🛡️ '+Math.max(0,veh.life??0)+'/'+(veh.maxLife??0)+(veh.t==='llanxa_coets'?' · 🚀 ∞':veh.rockets!=null?' · 🚀 '+veh.rockets:veh.t!=='heli_combat'?' · 💣 '+(s.inventory.granada||0)+' granades · B':''):'',weaponInfo=s.bazookaEquipped&&!veh?' · 🚀 Bazooka '+(s.inventory.bazooka||0)+' coets':s.grenadeEquipped&&!veh?' · 💣 Granades '+(s.inventory.granada||0):s.cisallaEquipped&&!veh?' · ✂ Cisalla':s.sniperEquipped&&!veh?' · 🔭 Rifle '+s.sniperAmmo+' cartutxos'+(s.scopeActive?' · Mira x8':''):'';
      const html=`<b>HUNTER · ARXIPÈLAG</b><br>❤️ ${s.hp>0?Math.max(1,Math.ceil(s.hp)):0} · 🎯 ${s.ammo} · ☠ ${s.kills}<br>${state}${s.coop?'<br>✚ Company: '+Math.max(0,s.coop.health||0)+' PV · '+(s.coop.status==='running'?'Connectats':'Pausa de sala'):''}${s.disguised?' · 🎭 Disfressat':''}${weaponInfo}${vehInfo}${s.optionalAction?'<br>E · '+s.optionalAction.label:s.nearVehicle&&!s.vehicle?'<br>Acció: puja a '+s.vehicleTypes[s.nearVehicle.t].n:''}${s.messageTime>0?'<br>'+s.message:''}${s.waypoint?'<br>Destinació: '+Math.round(Math.hypot(s.waypoint.x-s.player.x,s.waypoint.z-s.player.z))+' m':''}<br><span style="opacity:.72">Llavor ${s.seed>>>0} · X ${s.player.x|0} · Z ${s.player.z|0}</span>`;
      if(hud.innerHTML!==html)hud.innerHTML=html;
      if(currentMode==='cheats'&&s.coop){
        for(const [id,key] of [['cheatItems','items'],['cheatInvisible','invisible'],
          ['cheatImmune','immune'],['cheatFly','fly']]){
          const checkbox=document.getElementById(id);
          if(checkbox){checkbox.checked=!!s.cheats?.[key];checkbox.disabled=!s.coop.host;}
        }
      }
    }
    let currentMode=null;
    function hide(){panel.style.display='none';currentMode=null}
    function show(mode){
      currentMode=mode;panel.style.display='flex';
      resumeButton.style.display=['saves','account','history','coop'].includes(mode)&&!getState().started?'none':'';
      resumeButton.onclick=mode==='bombtimer'?()=>actions.open('inventory'):actions.resume;
      title.textContent=mode==='bombtimer'?'Programar explosiu':mode==='map'?'Carta de navegació':
        mode==='inventory'?'Inventari':mode==='restart'?'Nova operació?':
        mode==='performance'?'Opcions':mode==='keys'?'Tecles i controls':
        mode==='cheats'?'Trucs':'Operació en pausa';
      const card=panel.querySelector('.card');
      card.classList.toggle('inventory-card',mode==='inventory');
      card.classList.toggle('pause-card',['pause','keys','performance','cheats','saves','account','restart'].includes(mode));
      if(mode==='coop'){
        title.textContent='Sala cooperativa';actions.renderCoop(body,()=>currentMode==='coop');
      }else if(mode==='history'){
        title.textContent='Estadístiques i llavors';actions.renderHistory(body,()=>currentMode==='history');
      }else if(mode==='account'){
        title.textContent='Compte';actions.renderAccount(body,()=>currentMode==='account');
      }else if(mode==='saves'){
        title.textContent='Operacions desades';actions.renderSaves(body,()=>currentMode==='saves');
      }else if(mode==='inventory'){
        const state=getState(),keys=['med','paracaigudes','cisalla','expl','granada','bazooka','franctirador','fusell_assalt','disf','arma'],present=keys.filter(k=>state.inventory[k]>0);
        let selected=present[0]||null;
        const renderInventory=(healed=0)=>{
          const st=getState(),maxHealth=window.HUNTER_COMBAT_BALANCE.player,items=keys.filter(k=>st.inventory[k]>0),
                life=Math.max(0,Math.min(maxHealth,st.hp>0?Math.ceil(st.hp):0));
          body.innerHTML='<div class="inv-health" role="status" aria-live="polite">'+
            '<div class="inv-health-line"><b>❤️ Vida '+life+' / '+maxHealth+'</b>'+
            (healed>0?'<strong class="inv-healed">+'+healed+' vida</strong>':'')+'</div>'+
            '<div class="inv-health-track"><div class="inv-health-fill" style="width:'+(life/maxHealth*100)+'%"></div></div></div>'+
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
        const st=getState(),hqIntel=st.hqIntel,
          hqProgress=hqIntel?.confirmed?'HQ enemic identificat.':
            hqIntel?.stage?st.mapScale===2?
              'Investigació de l’HQ: '+hqIntel.investigated+'/4 quadrants · '+hqIntel.remaining+' possibles localitzacions.':
              'Investigació de l’HQ: '+hqIntel.stage+'/3 mapes · '+hqIntel.remaining+' possibles localitzacions.':
              st.mapScale===2?'Troba un mapa de l’HQ a cada quadrant per identificar-lo.':
                'Els mapes de l’HQ permeten eliminar possibles ubicacions.';
        body.innerHTML='<p>'+hqProgress+'</p><canvas id="fullmap" width="510" height="510" aria-label="Mapa: toca per marcar una destinació"></canvas><p>Toca el mapa per marcar una destinació. Blau: base · Groc: vehicles · Vermell: enemics/HQ confirmat · ?: possible HQ · ? ratllat: descartat · Cian: helicòpters · Taronja: tancs. Descoberts: R ràdio · P presoners · M mecànic; gris indica desactivat.</p><button id="clearMark">Esborra marca</button>';
        const map=document.getElementById('fullmap');minimap.drawFull(map,getState().waypoint);
        map.onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),s=getState();actions.setWaypoint({x:((e.clientX-r.left)/r.width-.5)*s.worldSize,z:((e.clientY-r.top)/r.height-.5)*s.worldSize});minimap.drawFull(map,getState().waypoint)};
        document.getElementById('clearMark').onclick=()=>{actions.setWaypoint(null);minimap.drawFull(map,null)}
      }else if(mode==='cheats'){
        const coop=getState().coop;
        body.innerHTML='<p>'+(coop?(coop.host?'Els trucs s’apliquen als dos jugadors.':'Només el HOST pot modificar els trucs compartits.'):'Activa o desactiva cada avantatge per separat.')+'</p>'+
          '<div class="performance-options">'+
          '<label><input id="cheatItems" type="checkbox"> Tots els objectes i munició infinits (també vehicles)</label>'+
          '<label><input id="cheatInvisible" type="checkbox"> Invisible per als enemics</label>'+
          '<label><input id="cheatImmune" type="checkbox"> Immune als atacs</label>'+
          '<label><input id="cheatFly" type="checkbox"> Vol ràpid</label>'+
          '</div><button id="cheatsBack">← Pausa</button>';
        for(const [id,key] of [['cheatItems','items'],['cheatInvisible','invisible'],['cheatImmune','immune'],['cheatFly','fly']]){
          const input=document.getElementById(id);
          input.checked=!!getState().cheats?.[key];
          input.disabled=!!coop&&!coop.host;
          input.onchange=()=>{
            if(actions.setCheat(key,input.checked)===false)
              input.checked=!!getState().cheats?.[key];
          };
        }
        document.getElementById('cheatsBack').onclick=()=>actions.open('pause');
      }else if(mode==='keys'){
        // Totes les dreceres viuen aquí; la pausa principal és només navegació.
        body.innerHTML='<div class="pause-help" aria-label="Dreceres del teclat">'+
          '<div><b>WASD / fletxes</b><span>Moviment i gir</span></div>'+
          '<div><b>Majúscules / joystick ↑</b><span>Córrer o nedar a crol</span></div>'+
          '<div><b>Y / U</b><span>Desplaçament lateral, també nedant</span></div>'+
          '<div><b>X</b><span>Ajupir-se i moure’s amb sigil</span></div>'+
          '<div><b>E</b><span>Acció, portes, vehicles o motxilla</span></div>'+
          '<div><b>F</b><span>Disparar o utilitzar l’equipament</span></div>'+
          '<div><b>B</b><span>Granada des de vehicle compatible</span></div>'+
          '<div><b>G</b><span>Explosiu C4 / míssil segons el vehicle</span></div>'+
          '<div><b>T</b><span>Mira del franctirador (zoom ×8)</span></div>'+
          '<div><b>H / J</b><span>Helicòpter o vol amb trucs: pujar / baixar</span></div>'+
          '<div><b>M</b><span>Mapa i destinacions</span></div>'+
          '<div><b>I / R</b><span>Inventari i equipament</span></div>'+
          '<div><b>1–7 / V</b><span>Seleccionar arma / canviar d’arma</span></div>'+
          '<div><b>C</b><span>Activar o treure la disfressa</span></div>'+
          '<div><b>L</b><span>Marcar destinació</span></div>'+
          '<div><b>F9</b><span>Activar o desactivar la visualització de sigil</span></div>'+
          '<div><b>ESC / P</b><span>Obrir o tancar el menú de pausa</span></div>'+
          '<div><b>Arrossegar / roda</b><span>Girar la vista / ajustar la càmera</span></div>'+
          '</div>'+
          '<p class="pause-note">Mantén F amb les granades a peu per ajustar-ne la força.</p>'+
          '<button type="button" class="pause-back" id="keysBack">← TORNAR A PAUSA</button>';
        document.getElementById('keysBack').onclick=()=>actions.open('pause');
      }else if(mode==='performance'){
        body.innerHTML='<p class="pause-note">Ajustos aplicats sense tornar a generar l’arxipèlag.</p>'+
          '<div class="performance-options">'+
          '<label><input id="audioEnabledPause" type="checkbox"> So activat</label>'+
          '<label><input id="disablePalmsPause" type="checkbox"> Sense palmeres</label>'+
          '<label><input id="disableWaterPause" type="checkbox"> Sense aigua</label>'+
          '<label><input id="disableShadowsPause" type="checkbox"> Sense ombres</label>'+
          '</div><label class="pause-stats-toggle"><input id="showPerfStatsOptions" type="checkbox"> Mostrar estadístiques de rendiment durant la partida</label>'+
          '<label class="pause-stats-toggle"><input id="showStealthDebug" type="checkbox"> Cons de visió</label>'+
          '<label><input id="showStealthNoise" type="checkbox"> Radis de soroll</label>'+
          '<details class="pause-diagnostics"><summary>Diagnòstic de rendiment</summary>'+
          '<div id="performanceBreakdown" style="font:13px/1.5 monospace;white-space:pre-line;padding:10px"></div>'+
          '<button id="performanceRefresh" type="button">Actualitza diagnòstic</button></details>'+
          '<button type="button" class="pause-back" id="performanceBack">← TORNAR A PAUSA</button>';
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
        const sound=document.getElementById('audioEnabledPause');
        sound.checked=!getState().muted;
        sound.onchange=()=>actions.setAudioMuted(!sound.checked);
        document.getElementById('performanceRefresh').onclick=refresh;
        document.getElementById('performanceBack').onclick=()=>actions.open('pause');
        refresh();
      }else if(mode==='restart'){
        body.innerHTML='<p>Perdràs el progrés. Dificultat de la nova partida:</p><button data-diff=".6">Fàcil</button><button data-diff="1">Normal</button><button data-diff="1.5">Difícil</button>';
        body.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>actions.restart(+b.dataset.diff))
      }else{
        // Portada de pausa: navegació compacta. Les tecles es consulten a part.
        body.innerHTML='<div class="pause-menu-actions" aria-label="Accions de pausa">'+
          '<button id="pauseContinue" class="pause-continue" type="button">▶ CONTINUAR</button>'+
          '<button id="keysMenu" type="button"><span class="pause-menu-icon" aria-hidden="true">⌨️</span> TECLES</button>'+
          '<button id="accountMenu" type="button"><span class="pause-menu-icon" aria-hidden="true">👤</span> COMPTE</button>'+
          '<div class="pause-save-row">'+
          '<button id="savesMenu" type="button"><span class="pause-menu-icon" aria-hidden="true">💾</span> DESAR</button>'+
          '<label class="pause-autosave-label"><input id="autosaveEnabledPause" type="checkbox"> <span>Autodesat</span></label></div>'+
          '<button id="restartMenu" type="button">↻ NOVA PARTIDA</button>'+
          '<button id="performanceMenu" type="button">⚙ OPCIONS</button>'+
          '</div>'+
          '<p id="operationAutosaveStatus" class="pause-note" role="status"></p>'+
          '<button id="chetosMenu" class="pause-joker" type="button" aria-label="Trucs" title="Trucs">🃏</button>';
        const auto=document.getElementById('autosaveEnabledPause');
        auto.checked=!!getState().autosave?.enabled;
        auto.onchange=()=>actions.setAutosave(auto.checked);
        document.getElementById('operationAutosaveStatus').textContent=
          getState().autosave?.message||'';
        document.getElementById('pauseContinue').onclick=actions.resume;
        document.getElementById('keysMenu').onclick=()=>actions.open('keys');
        document.getElementById('accountMenu').onclick=()=>actions.open('account');
        document.getElementById('savesMenu').onclick=()=>actions.open('saves');
        document.getElementById('chetosMenu').onclick=()=>actions.open('cheats');
        document.getElementById('restartMenu').onclick=()=>actions.open('restart');
        document.getElementById('performanceMenu').onclick=()=>actions.open('performance');
      }
    }
    resumeButton.onclick=actions.resume;
    return Object.freeze({renderHUD,show,hide,isAccountOpen:()=>currentMode==='account',isBombTimerOpen:()=>currentMode==='bombtimer',getMode:()=>currentMode})
  }
});

