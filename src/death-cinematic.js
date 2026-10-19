// Cinemàtica de mort: recreació a càmera lenta de la causa, fosa al buit
// i trobada amb la Parca. No reprèn la simulació ni torna a aplicar dany.
const DEATH_REPLAY_SECONDS=3.2,DEATH_FADE_SECONDS=2.2,DEATH_REAPER_SECONDS=6.3;
let deathCinematic=null;
const deathClamp=t=>Math.max(0,Math.min(1,t));
const deathEase=t=>{const p=deathClamp(t);return p*p*(3-2*p)};
function deathStageAt(t){
 if(t<DEATH_REPLAY_SECONDS)return 'replay';
 if(t<DEATH_REPLAY_SECONDS+DEATH_FADE_SECONDS)return 'fade';
 if(t<DEATH_REPLAY_SECONDS+DEATH_FADE_SECONDS+DEATH_REAPER_SECONDS)return 'reaper';
 return 'finished';
}
function deathCauseInfo(cause){
 const names={
  bullet:['UN DISPAR','El projectil que t’ha abatut'],
  explosion:['UNA EXPLOSIÓ','L’ona expansiva'],
  fall:['UNA CAIGUDA','L’impacte contra el terra'],
  shark:['UN TAURÓ','Un atac sota l’aigua'],
  runover:['UN ATROPELLAMENT','L’envestida d’un vehicle'],
  vehicleExplosion:['EL TEU VEHICLE','L’explosió del vehicle'],
  impact:['UN IMPACTE','El cop definitiu']
 };
 const kind=names[cause?.type]?cause.type:'impact';
 return {kind,title:names[kind][0],detail:names[kind][1]};
}
function deathUi(show){
 const v=deathCinematic;if(!v)return;
 for(const id of ['hud','mm','perfStats','contextButtons','joystick','strafeLeft','strafeRight','sniperScope','bazookaReticle']){
  const el=document.getElementById(id);if(!el)continue;
  if(show){v.previousVisibility[id]=el.style.visibility;el.style.visibility='hidden'}
  else el.style.visibility=v.previousVisibility[id]||'';
 }
}
function deathBuildReaper(THREE){
 const g=new THREE.Group(),owned=[];
 const mat=(color,extras={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.93,...extras});owned.push(m);return m};
 const cloak=mat(0x11151b),inner=mat(0x030509),trim=mat(0x31313c),
       bone=mat(0xb7b5a8),steel=mat(0x9da5ad,{metalness:.64,roughness:.33});
 function part(geometry,material,x,y,z){owned.push(geometry);const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);g.add(m);return m}
 part(new THREE.ConeGeometry(.93,3.05,9,1),cloak,0,1.49,0);
 const shoulder=part(new THREE.SphereGeometry(.69,10,8),cloak,0,2.48,0);
 shoulder.scale.set(1.24,.68,.85);
 const hood=part(new THREE.SphereGeometry(.65,12,10),cloak,0,2.88,.12);
 hood.scale.set(1,1.04,1.04);
 const dark=part(new THREE.SphereGeometry(.47,10,8),inner,0,2.84,.55);
 dark.scale.set(.83,.91,.3);
 const skull=part(new THREE.SphereGeometry(.29,12,9),bone,0,2.83,.678);
 skull.scale.set(1,.95,.42);
 for(const x of [-.12,.12]){
  const eye=part(new THREE.SphereGeometry(.083,8,6),inner,x,2.87,.795);
  eye.scale.set(1,.72,.45);
 }
 const jaw=part(new THREE.BoxGeometry(.27,.1,.09),bone,0,2.64,.77);
 jaw.rotation.x=.1;
 for(const side of [-1,1]){
  const sleeve=part(new THREE.ConeGeometry(.33,1.45,8),cloak,side*.67,2.13,.15);
  sleeve.rotation.z=side*.42;
  part(new THREE.SphereGeometry(.13,8,6),bone,side*.95,1.46,.27);
 }
 const shaft=part(new THREE.CylinderGeometry(.065,.085,3.6,8),trim,1.05,2.07,.3);
 shaft.rotation.z=-.16;
 const bladeCurve=new THREE.CatmullRomCurve3([
  new THREE.Vector3(.83,3.55,.3),new THREE.Vector3(1.16,3.89,.3),
  new THREE.Vector3(1.69,4.05,.3),new THREE.Vector3(2.12,3.84,.3),
  new THREE.Vector3(2.24,3.46,.3)]);
 part(new THREE.TubeGeometry(bladeCurve,18,.095,5,false),steel,0,0,0);
 const edge=part(new THREE.ConeGeometry(.18,.7,5),steel,2.2,3.56,.3);
 edge.rotation.z=Math.PI*.12;
 return {group:g,owned};
}
function deathCreateVoid(v){
 const voidScene=new THREE.Scene();voidScene.background=new THREE.Color(0x000000);
 const voidCamera=new THREE.PerspectiveCamera(46,cam.aspect,.2,100);
 voidCamera.position.set(0,3.35,10.8);voidCamera.lookAt(0,1.65,0);
 voidScene.add(new THREE.AmbientLight(0x5f6479,.72));
 const rim=new THREE.DirectionalLight(0x9a9cbc,2.6);
 rim.position.set(-4,8,-6);voidScene.add(rim);
 const key=new THREE.SpotLight(0xf4ede1,10,22,Math.PI/4,.65,1.4);
 key.position.set(3,7,5);key.target.position.set(0,1.2,0);
 voidScene.add(key,key.target);
 const player=window.HUNTER_CHARACTERS.createPlayer(THREE,{box:bx});
 if(disg)for(const [material,original,disguise] of player.userData.mats)
  material.color.copy(vivid(disguise));
 player.visible=true;player.position.set(0,0,1.45);
 player.rotation.set(0,Math.PI*.1,0);
 player.traverse(o=>{if(o.isMesh)o.castShadow=false});
 voidScene.add(player);
 const reaper=deathBuildReaper(THREE);
 reaper.group.position.set(2.15,0,-14);
 voidScene.add(reaper.group);
 v.voidScene=voidScene;v.voidCamera=voidCamera;v.voidPlayer=player;
 v.reaper=reaper;
}
function deathReplayEffect(v){
 const type=v.cause.kind;
 if(type==='fall')return null;
 const from=v.source.clone(),to=v.hit.clone();
 const toward=to.clone().sub(from);
 if(toward.lengthSq()<.01)toward.set(0,0,1);
 if(toward.length()>19)from.copy(to).addScaledVector(toward.normalize(),-19);
 let geometry,material,mesh;
 if(type==='bullet'){
  geometry=new THREE.SphereGeometry(.15,10,7);
  material=new THREE.MeshBasicMaterial({color:0xffe6b8});
  mesh=new THREE.Mesh(geometry,material);mesh.position.copy(from);
 }else{
  geometry=new THREE.SphereGeometry(type==='explosion'||type==='vehicleExplosion'?1.05:.54,12,8);
  material=new THREE.MeshBasicMaterial({color:type==='shark'?0x94cddd:type==='runover'?0xffd6a5:0xff8c55,
   transparent:true,opacity:.75,depthWrite:false});
  mesh=new THREE.Mesh(geometry,material);mesh.position.copy(v.source);
 }
 scene.add(mesh);
 return {mesh,geometry,material,from};
}
function startDeathCinematic(cause=null){
 if(deathCinematic||victoryCinematic)return false;
 const info=deathCauseInfo(cause),
       hit=new THREE.Vector3(P.x,P.y+1.45,P.z),
       source=new THREE.Vector3(
        Number.isFinite(cause?.x)?cause.x:P.x-Math.sin(P.hd||0)*8,
        Number.isFinite(cause?.y)?cause.y:P.y+2,
        Number.isFinite(cause?.z)?cause.z:P.z-Math.cos(P.hd||0)*8);
 const direction=source.clone().sub(hit);direction.y=0;
 if(direction.lengthSq()<.001)direction.set(0,0,-1);
 direction.normalize();
 setSniperScope(false);over=1;Object.keys(K).forEach(k=>K[k]=0);
 if(eng)eng.g.gain.value=0;
 const overlay=document.createElement('div');overlay.id='deathCinematicOverlay';
 overlay.setAttribute('aria-live','polite');
 overlay.innerHTML='<div class="death-shade"></div>'+
  '<div class="death-replay-label">DARRER INSTANT · CÀMERA LENTA</div>'+
  '<div class="death-cause">MORT PER <strong></strong><small></small></div>'+
  '<div class="death-finale"><div class="death-sigil" aria-hidden="true">✝</div>'+
  '<p>LA PARCA HA VINGUT A BUSCAR-TE</p><h2>HAS MORT</h2></div>'+
  '<button type="button" class="death-new-game">NOVA PARTIDA</button>';
 const shade=overlay.querySelector('.death-shade'),replayLabel=overlay.querySelector('.death-replay-label'),
       causeEl=overlay.querySelector('.death-cause'),finale=overlay.querySelector('.death-finale'),
       button=overlay.querySelector('.death-new-game');
 causeEl.querySelector('strong').textContent=info.title;
 causeEl.querySelector('small').textContent=info.detail;
 button.onclick=()=>window.location.reload();
 document.body.appendChild(overlay);
 const v={active:true,finished:false,t:0,phase:'replay',cause:info,source,hit,direction,
  overlay,shade,replayLabel,causeEl,finale,button,previousVisibility:{},previousFov:cam.fov,
  lastBell:-1,voidScene:null,reaper:null,replayEffect:null};
 deathCinematic=v;
 deathUi(true);endEl.style.display='none';
 deathCreateVoid(v);
 v.replayEffect=deathReplayEffect(v);
 return true;
}
function clearDeathCinematic(){
 const v=deathCinematic;if(!v)return;
 deathUi(false);
 if(v.replayEffect){
  scene.remove(v.replayEffect.mesh);
  v.replayEffect.geometry.dispose();v.replayEffect.material.dispose();
 }
 if(v.reaper)for(const resource of v.reaper.owned)resource.dispose();
 if(v.overlay.parentNode)v.overlay.parentNode.removeChild(v.overlay);
 cam.fov=v.previousFov;cam.updateProjectionMatrix();
 deathCinematic=null;
}
function deathVoidReady(){
 return !!deathCinematic&&deathCinematic.t>=DEATH_REPLAY_SECONDS+DEATH_FADE_SECONDS/2;
}
function updateDeathCinematic(dt){
 const v=deathCinematic;if(!v||v.finished)return;
 v.t+=Math.max(0,Math.min(.1,dt));
 v.phase=deathStageAt(v.t);
 const replay=deathClamp(v.t/DEATH_REPLAY_SECONDS);
 if(v.phase==='replay'||v.phase==='fade'){
  const a=v.direction,side=new THREE.Vector3(-a.z,0,a.x);
  cam.position.copy(v.hit).addScaledVector(a,-9.5+replay*2.2)
    .addScaledVector(side,5.5-replay*2.5);
  cam.position.y+=3.3-replay*.65;
  cam.lookAt(v.hit);
  if(cam.fov!==51){cam.fov=51;cam.updateProjectionMatrix()}
  if(v.replayEffect){
   const effect=v.replayEffect,material=effect.material;
   if(v.cause.kind==='bullet'){
    const f=deathEase((v.t-.24)/2.18);
    effect.mesh.visible=v.t>.24&&v.t<2.72;
    effect.mesh.position.copy(effect.from).lerp(v.hit,f);
    effect.mesh.scale.setScalar(1+.9*f);
   }else{
    const p=deathEase((v.t-.38)/2.35);
    effect.mesh.scale.setScalar(.35+3.8*p);
    material.opacity=.7*(1-p);
    effect.mesh.visible=v.t<2.95;
   }
  }
  if(v.cause.kind==='fall'&&!cv&&pl){
   pl.position.y=Math.max(P.y,Math.min(P.y+3.6,P.y+3.6*(1-deathEase(v.t/2.8))));
   pl.rotation.x=-.55*(1-deathEase(v.t/3));
  }
 }
 const fadeStart=DEATH_REPLAY_SECONDS,half=DEATH_FADE_SECONDS/2;
 const alpha=v.t<fadeStart?0:v.t<fadeStart+half
  ?deathEase((v.t-fadeStart)/half)
  :v.t<fadeStart+DEATH_FADE_SECONDS
   ?1-deathEase((v.t-fadeStart-half)/half):0;
 v.shade.style.opacity=String(alpha);
 v.replayLabel.style.opacity=v.t<fadeStart?.94:0;
 v.causeEl.style.opacity=v.t<fadeStart?.98:0;
 if(deathVoidReady()){
  const start=DEATH_REPLAY_SECONDS+DEATH_FADE_SECONDS,
        p=deathEase((v.t-start)/(DEATH_REAPER_SECONDS-.75));
  v.reaper.group.position.set(2.15-p*1.65,Math.sin(v.t*1.35)*.045,-14+p*12.3);
  v.reaper.group.rotation.y=-.35+p*.35;
  v.voidPlayer.rotation.y=.1+Math.sin(v.t*.62)*.015;
  if(v.t>=start&&v.lastBell<0){deathBell(.83);v.lastBell=0}
  if(v.t>=start+2.15&&v.lastBell===0){deathBell(.65);v.lastBell=1}
  if(v.t>=start+4.4&&v.lastBell===1){deathBell(.55);v.lastBell=2}
  const rise=deathEase((v.t-start-2.6)/2.2);
  v.finale.style.opacity=String(rise);
 }
 if(v.phase==='finished'){
  v.active=false;v.finished=true;
  v.finale.style.opacity='1';
  v.button.style.display='block';v.button.focus();
 }
}
