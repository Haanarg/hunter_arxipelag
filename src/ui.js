// HUD i menús. Manté la presentació fora del bucle principal de simulació.
window.HUNTER_UI=Object.freeze({
  create({hud,panel,title,body,resumeButton,minimap,getState,actions}){
    function renderHUD(){
      const s=getState(),state=s.vehicle?s.vehicleTypes[s.vehicle.t].n:s.inside?'Interior':s.swimming?'Nedant':'A peu',veh=s.vehicle,vehInfo=veh?'<br>🛡️ '+(veh.armor??0)+'/10 · Vida '+Math.max(0,veh.life??0)+'/'+(veh.maxLife??0)+(veh.t==='llanxa_coets'?' · 🚀 ∞':veh.rockets!=null?' · 🚀 '+veh.rockets:''):'',weaponInfo=s.bazookaEquipped&&!veh?' · 🚀 Bazooka '+(s.inventory.bazooka||0)+' coets':s.grenadeEquipped&&!veh?' · 💣 Granades '+(s.inventory.granada||0):s.cisallaEquipped&&!veh?' · ✂ Cisalla':s.sniperEquipped&&!veh?' · 🔭 Rifle '+s.sniperAmmo+' cartutxos'+(s.scopeActive?' · Mira x8':''):'';
      hud.innerHTML=`<b>HUNTER · ARXIPÈLAG</b><br>❤️ ${Math.round(s.hp)} · 🎯 ${s.ammo} · ☠ ${s.kills}<br>${state}${s.disguised?' · 🎭 Disfressat':''}${weaponInfo}${vehInfo}${s.nearVehicle&&!s.vehicle?'<br>Acció: puja a '+s.vehicleTypes[s.nearVehicle.t].n:''}${s.messageTime>0?'<br>'+s.message:''}${s.waypoint?'<br>Destinació: '+Math.round(Math.hypot(s.waypoint.x-s.player.x,s.waypoint.z-s.player.z))+' m':''}<br><span style="opacity:.72">Llavor ${s.seed>>>0} · X ${s.player.x|0} · Z ${s.player.z|0}</span>`;
    }
    function hide(){panel.style.display='none'}
    function show(mode){
      panel.style.display='flex';
      title.textContent=mode==='map'?'Carta de navegació':mode==='inventory'?'Inventari':mode==='restart'?'Nova operació?':mode==='performance'?'Rendiment':'Operació en pausa';panel.querySelector('.card').classList.toggle('inventory-card',mode==='inventory');
      if(mode==='inventory'){
        const state=getState(),keys=['med','paracaigudes','cisalla','expl','granada','bazooka','franctirador','disf','arma'],present=keys.filter(k=>state.inventory[k]>0);
        let selected=present[0]||null;
        const renderInventory=()=>{
          const st=getState(),items=keys.filter(k=>st.inventory[k]>0),def=selected&&st.itemTypes[selected];
          body.innerHTML='<div class="inv-wrap"><section><div class="inv-grid" id="invGrid"></div></section><aside class="inv-detail" id="invDetail"></aside></div>';
          const grid=document.getElementById('invGrid'),detail=document.getElementById('invDetail');
          const slots=Math.max(15,Math.ceil(Math.max(1,items.length)/5)*5);
          for(let i=0;i<slots;i++){
            const id=items[i],el=document.createElement('button');el.className='inv-slot'+(id===selected?' selected':'');
            if(id){const d=st.itemTypes[id];el.innerHTML='<span>'+d.icon+'</span><span class="inv-count">×'+st.inventory[id]+'</span>';el.title=d.n;el.onclick=()=>{selected=id;if(d.usable){const changed=actions.useItem(id);if(changed&&id!=='expl'&&id!=='granada'&&id!=='bazooka'&&id!=='franctirador'&&id!=='mapa'&&id!=='mapa_heli'&&id!=='mapa_tanc')renderInventory()}else renderInventory()}}
            else{el.disabled=true;el.setAttribute('aria-hidden','true')}
            grid.appendChild(el)
          }
          if(!selected||!st.inventory[selected])selected=items[0]||null;
          if(!selected){detail.innerHTML='<div class="inv-icon">🎒</div><h3>Inventari buit</h3><p>Explora edificis i assentaments per trobar equipament.</p>';return}
          const d=st.itemTypes[selected];detail.innerHTML='<div class="inv-icon">'+d.icon+'</div><h3>'+d.n+'</h3><p>'+d.desc+'</p>';
        };
        renderInventory();
      }else if(mode==='map'){
        body.innerHTML='<canvas id="fullmap" width="510" height="510" aria-label="Mapa: toca per marcar una destinació"></canvas><p>Toca per marcar una destinació. Blau: base · Groc: vehicles propers · Vermell: enemics i HQ descobert · Cian: helicòpter cartografiat · Taronja: tanc cartografiat.</p><button id="clearMark">Esborra destinació</button>';
        const map=document.getElementById('fullmap');minimap.drawFull(map,getState().waypoint);
        map.onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),s=getState();actions.setWaypoint({x:((e.clientX-r.left)/r.width-.5)*s.worldSize,z:((e.clientY-r.top)/r.height-.5)*s.worldSize});minimap.drawFull(map,getState().waypoint)};
        document.getElementById('clearMark').onclick=()=>{actions.setWaypoint(null);minimap.drawFull(map,null)}
      }else if(mode==='performance'){
        body.innerHTML='<p>Canvia les opcions en calent sense regenerar el mapa.</p>'+
          '<div class="performance-options">'+
          '<label><input id="disablePalmsPause" type="checkbox"> Sense palmeres</label>'+
          '<label><input id="disableWaterPause" type="checkbox"> Sense aigua</label>'+
          '<label><input id="disableShadowsPause" type="checkbox"> Sense ombres</label>'+
          '</div><div id="performanceBreakdown" style="font:13px/1.5 monospace;white-space:pre-line;background:#0d1d30;border-radius:8px;padding:12px;margin-top:12px"></div>'+
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
        document.getElementById('performanceRefresh').onclick=refresh;
        document.getElementById('performanceBack').onclick=()=>actions.open('pause');
        refresh();
      }else if(mode==='restart'){
        body.innerHTML='<p>Es perdrà el progrés d’aquesta partida. Tria la dificultat del nou arxipèlag.</p><button data-diff=".6">Fàcil</button><button data-diff="1">Normal</button><button data-diff="1.5">Difícil</button>';
        body.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>actions.restart(+b.dataset.diff))
      }else{
        body.innerHTML='<div class="controls"><b>WASD / fletxes</b><span>Avança, frena i gira</span><b>◀ ▶ / Y i U</b><span>Desplaçament lateral sense girar: a peu, en hovercraft i en helicòpters. Els botons apareixen a banda i banda del joystick.</span><b>Acció / E</b><span>Motxilla: inventari. Icona d’un vehicle: puja-hi o baixa’n</span><b>Dispar / F</b><span>Dispara l’arma equipada. Amb granades: mantén premut per allunyar el llançament i deixa anar per llençar-la; veuràs la trajectòria i el punt de caiguda</span><b>T / Mira</b><span>Activa/desactiva la mira x8 del rifle de franctirador; amb la mira activa, el joystick, WASD i Y/U mouen només el punt de vista, sense desplaçar el personatge</span><b>I</b><span>Obre l’inventari</span><b>M</b><span>Obre el mapa</span><b>H / J</b><span>Puja / baixa l’helicòpter</span><b>Arrossega</b><span>Gira la vista i el personatge</span><b>Roda</b><span>Acosta o allunya la càmera</span></div><p>Farmacioles, explosius, granades, bazooka, rifle de franctirador i disfressa es gestionen des de l’inventari. Els mapes de l’HQ, helicòpters i tancs s’activen automàticament quan els reculls. En helicòpter de combat, prem G o el botó 🚀 per llançar un míssil; la llanxa llançacoets dispara coets amb Dispar.</p><button id="inventoryMenu">Inventari</button><button id="chetosMenu">Chetos</button><button id="restartMenu">Nova partida</button><button id="performanceMenu">⚙️ Rendiment</button><button id="zoomOut">Allunya càmera</button><button id="zoomIn">Acosta càmera</button>';
        document.getElementById('inventoryMenu').onclick=()=>actions.open('inventory');
        document.getElementById('chetosMenu').onclick=()=>{
          actions.chetos();
          document.getElementById('chetosMenu').textContent='Chetos ✓';
        };
        document.getElementById('restartMenu').onclick=()=>actions.open('restart');
        document.getElementById('zoomOut').onclick=()=>actions.zoom(.2);
        document.getElementById('zoomIn').onclick=()=>actions.zoom(-.2);
        document.getElementById('performanceMenu').onclick=()=>actions.open('performance');
      }
    }
    resumeButton.onclick=actions.resume;
    return Object.freeze({renderHUD,show,hide})
  }
});

