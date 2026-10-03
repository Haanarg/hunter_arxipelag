// HUD i menús. Manté la presentació fora del bucle principal de simulació.
window.HUNTER_UI=Object.freeze({
  create({hud,panel,title,body,resumeButton,minimap,getState,actions}){
    function renderHUD(){
      const s=getState(),items=Object.keys(s.inventory).map(k=>s.itemTypes[k].n+' ×'+s.inventory[k]).join(', ')||'—';
      hud.innerHTML=`HUNTER · ARXIPÈLAG<br>Vida: ${Math.round(s.hp)} · Munició: ${s.ammo} · Baixes: ${s.kills}<br>${s.vehicle?s.vehicleTypes[s.vehicle.t].n:s.inside?'Dins d’un edifici':s.swimming?'Nedant':'A peu'} ${s.disguised?' · Disfressat':''}<br>Joystick / WASD · E vehicle · F dispara · G explosiu<br>C disfressa · L coordenades · U/J alçada<br>M mapa · Esc pausa · Roda: zoom<br>Objectes: ${items}<br>Llavor: ${s.seed>>>0}<br>X: ${s.player.x|0} · Z: ${s.player.z|0}${s.nearVehicle&&!s.vehicle?'<br>E: puja a '+s.vehicleTypes[s.nearVehicle.t].n:''}${s.messageTime>0?'<br>'+s.message:''}${s.waypoint?'<br>Destinació: '+Math.round(Math.hypot(s.waypoint.x-s.player.x,s.waypoint.z-s.player.z))+' m':''}`;
    }
    function hide(){panel.style.display='none'}
    function show(mode){
      panel.style.display='flex';
      title.textContent=mode==='map'?'Carta de navegació':mode==='restart'?'Nova operació?':'Operació en pausa';
      if(mode==='map'){
        body.innerHTML='<canvas id="fullmap" width="510" height="510" aria-label="Mapa: toca per marcar una destinació"></canvas><p>Toca per marcar una destinació. Blau: base · Groc: vehicles · Vermell: enemics i HQ descobert.</p><button id="clearMark">Esborra destinació</button>';
        const map=document.getElementById('fullmap');minimap.drawFull(map,getState().waypoint);
        map.onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),s=getState();actions.setWaypoint({x:((e.clientX-r.left)/r.width-.5)*s.worldSize,z:((e.clientY-r.top)/r.height-.5)*s.worldSize});minimap.drawFull(map,getState().waypoint)};
        document.getElementById('clearMark').onclick=()=>{actions.setWaypoint(null);minimap.drawFull(map,null)}
      }else if(mode==='restart'){
        body.innerHTML='<p>Es perdrà el progrés d’aquesta partida. Tria la dificultat del nou arxipèlag.</p><button data-diff=".6">Fàcil</button><button data-diff="1">Normal</button><button data-diff="1.5">Difícil</button>';
        body.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>actions.restart(+b.dataset.diff))
      }else{
        body.innerHTML='<div class="controls"><b>WASD / fletxes</b><span>Avança, frena i gira</span><b>E</b><span>Puja o baixa del vehicle</span><b>F (mantén)</b><span>Dispara amb ajuda suau de punteria</span><b>G</b><span>Col·loca una bomba: allunya’t abans de 3 s</span><b>C</b><span>Posa o treu la disfressa</span><b>U / J</b><span>Puja / baixa l’helicòpter</span><b>L / M</b><span>Anota coordenades / obre el mapa</span><b>Arrossega</b><span>Gira la vista i el personatge</span><b>Roda</b><span>Acosta o allunya la càmera</span></div><p>Busca objectes dins dels edificis. Les portes s’obren quan t’hi acostes. Un mapa revela l’HQ; també pots descobrir-lo explorant. El general és al seu interior.</p><button id="restartMenu">Nova partida</button><button id="zoomOut">Allunya càmera</button><button id="zoomIn">Acosta càmera</button>';
        document.getElementById('restartMenu').onclick=()=>actions.open('restart');
        document.getElementById('zoomOut').onclick=()=>actions.zoom(.2);
        document.getElementById('zoomIn').onclick=()=>actions.zoom(-.2)
      }
    }
    resumeButton.onclick=actions.resume;
    return Object.freeze({renderHUD,show,hide})
  }
});
