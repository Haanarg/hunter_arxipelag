// HUD i menús. Manté la presentació fora del bucle principal de simulació.
window.HUNTER_UI=Object.freeze({
  create({hud,panel,title,body,resumeButton,minimap,getState,actions}){
    function renderHUD(){
      const s=getState(),state=s.vehicle?s.vehicleTypes[s.vehicle.t].n:s.inside?'Interior':s.swimming?'Nedant':'A peu',veh=s.vehicle,vehInfo=veh?'<br>🛡️ '+(veh.armor??0)+'/10 · Vida '+Math.max(0,veh.life??0)+'/'+(veh.maxLife??0)+(veh.rockets!=null?' · 🚀 '+veh.rockets:''):'';
      hud.innerHTML=`<b>HUNTER · ARXIPÈLAG</b><br>❤️ ${Math.round(s.hp)} · 🔫 ${s.ammo} · ☠ ${s.kills}<br>${state}${s.disguised?' · 🎭 Disfressat':''}${vehInfo}${s.nearVehicle&&!s.vehicle?'<br>Acció: puja a '+s.vehicleTypes[s.nearVehicle.t].n:''}${s.messageTime>0?'<br>'+s.message:''}${s.waypoint?'<br>Destinació: '+Math.round(Math.hypot(s.waypoint.x-s.player.x,s.waypoint.z-s.player.z))+' m':''}<br><span style="opacity:.72">Llavor ${s.seed>>>0} · X ${s.player.x|0} · Z ${s.player.z|0}</span>`;
    }
    function hide(){panel.style.display='none'}
    function show(mode){
      panel.style.display='flex';
      title.textContent=mode==='map'?'Carta de navegació':mode==='inventory'?'Inventari':mode==='restart'?'Nova operació?':'Operació en pausa';panel.querySelector('.card').classList.toggle('inventory-card',mode==='inventory');
      if(mode==='inventory'){
        const state=getState(),keys=['med','expl','disf','mapa','mapa_heli','mapa_tanc','arma'],present=keys.filter(k=>state.inventory[k]>0);
        let selected=present[0]||null;
        const renderInventory=()=>{
          const st=getState(),items=keys.filter(k=>st.inventory[k]>0),def=selected&&st.itemTypes[selected];
          body.innerHTML='<div class="inv-wrap"><section><div class="inv-head"><div><strong>Motxilla</strong><div style="opacity:.7;font-size:13px">Objectes trobats</div></div><div>'+items.reduce((n,k)=>n+(st.inventory[k]||0),0)+' objectes</div></div><div class="inv-grid" id="invGrid"></div></section><aside class="inv-detail" id="invDetail"></aside></div>';
          const grid=document.getElementById('invGrid'),detail=document.getElementById('invDetail');
          const slots=Math.max(20,Math.ceil(Math.max(1,items.length)/5)*5);
          for(let i=0;i<slots;i++){
            const id=items[i],el=document.createElement('button');el.className='inv-slot'+(id===selected?' selected':'');
            if(id){const d=st.itemTypes[id];el.innerHTML='<span>'+d.icon+'</span><span class="inv-count">×'+st.inventory[id]+'</span>';el.title=d.n;el.onclick=()=>{selected=id;renderInventory()}}
            else{el.disabled=true;el.setAttribute('aria-hidden','true')}
            grid.appendChild(el)
          }
          if(!selected||!st.inventory[selected])selected=items[0]||null;
          if(!selected){detail.innerHTML='<div class="inv-icon">🎒</div><h3>Inventari buit</h3><p>Explora edificis i assentaments per trobar equipament.</p>';return}
          const d=st.itemTypes[selected],usable=!!d.usable;
          detail.innerHTML='<div class="inv-icon">'+d.icon+'</div><h3>'+d.n+'</h3><p>'+d.desc+'</p><div class="inv-actions">'+(usable?'<button id="invUse">Usa</button>':'')+(selected!=='arma'?'<button id="invDrop">Deixa</button>':'')+'</div>';
          const use=document.getElementById('invUse'),drop=document.getElementById('invDrop');
          if(use)use.onclick=()=>{const id=selected,changed=actions.useItem(id);if(changed&&id!=='expl'&&id!=='mapa'&&id!=='mapa_heli'&&id!=='mapa_tanc')renderInventory()};
          if(drop)drop.onclick=()=>{actions.dropItem(selected);renderInventory()}
        };
        renderInventory();
      }else if(mode==='map'){
        body.innerHTML='<canvas id="fullmap" width="510" height="510" aria-label="Mapa: toca per marcar una destinació"></canvas><p>Toca per marcar una destinació. Blau: base · Groc: vehicles propers · Vermell: enemics i HQ descobert · Cian: helicòpter cartografiat · Taronja: tanc cartografiat.</p><button id="clearMark">Esborra destinació</button>';
        const map=document.getElementById('fullmap');minimap.drawFull(map,getState().waypoint);
        map.onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),s=getState();actions.setWaypoint({x:((e.clientX-r.left)/r.width-.5)*s.worldSize,z:((e.clientY-r.top)/r.height-.5)*s.worldSize});minimap.drawFull(map,getState().waypoint)};
        document.getElementById('clearMark').onclick=()=>{actions.setWaypoint(null);minimap.drawFull(map,null)}
      }else if(mode==='restart'){
        body.innerHTML='<p>Es perdrà el progrés d’aquesta partida. Tria la dificultat del nou arxipèlag.</p><button data-diff=".6">Fàcil</button><button data-diff="1">Normal</button><button data-diff="1.5">Difícil</button>';
        body.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>actions.restart(+b.dataset.diff))
      }else{
        body.innerHTML='<div class="controls"><b>WASD / fletxes</b><span>Avança, frena i gira</span><b>Acció / E</b><span>Vehicle o inventari segons el context</span><b>Dispar / F</b><span>Dispara amb ajuda suau de punteria</span><b>I</b><span>Obre l’inventari</span><b>M</b><span>Obre el mapa</span><b>U / J</b><span>Puja / baixa l’helicòpter</span><b>Arrossega</b><span>Gira la vista i el personatge</span><b>Roda</b><span>Acosta o allunya la càmera</span></div><p>Farmacioles, explosius, disfressa i mapa es gestionen des de l’inventari.</p><button id="inventoryMenu">Inventari</button><button id="restartMenu">Nova partida</button><button id="zoomOut">Allunya càmera</button><button id="zoomIn">Acosta càmera</button>';
        document.getElementById('inventoryMenu').onclick=()=>actions.open('inventory');
        document.getElementById('restartMenu').onclick=()=>actions.open('restart');
        document.getElementById('zoomOut').onclick=()=>actions.zoom(.2);
        document.getElementById('zoomIn').onclick=()=>actions.zoom(-.2)
      }
    }
    resumeButton.onclick=actions.resume;
    return Object.freeze({renderHUD,show,hide})
  }
});
