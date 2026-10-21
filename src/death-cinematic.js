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
// La postura de mort és la mateixa per a totes les causes: el cos queda
// bocaterrosa, amb les extremitats relaxades i la cara visible de costat.
// El model mira cap a -Z i té l'origen als peus, per això el compensam
// longitudinalment quan l'ajau per evitar que el tors surti del pla.
function deathPoseProne(player,centre,heading){
 const u=player.userData,forwardX=-Math.sin(heading),forwardZ=-Math.cos(heading);
 player.position.set(centre.x-forwardX*1.05,centre.y+.39,centre.z-forwardZ*1.05);
 player.rotation.set(-Math.PI/2,heading,0);
 if(u.upperBody)u.upperBody.rotation.set(0,0,0);
 if(u.head)u.head.rotation.set(-.06,0,0);
 // Els braços queden oberts i els colzes flexionen cap al costat
 // anatòmic correcte (en positiu, oposat a la postura invertida antiga).
 if(u.al)u.al.rotation.set(-.22,-.08,-.65);
 if(u.ar)u.ar.rotation.set(-.22,.08,.65);
 if(u.ael)u.ael.rotation.set(.60,0,-.09);
 if(u.aer)u.aer.rotation.set(.60,0,.09);
 if(u.ll)u.ll.rotation.set(.07,0,-.08);
 if(u.lr)u.lr.rotation.set(-.09,0,.08);
 if(u.lkl)u.lkl.rotation.set(-.12,0,0);
 if(u.lkr)u.lkr.rotation.set(-.16,0,0);
 for(const weapon of [u.gun,u.knife,u.bazooka,u.grenade,u.sniper,u.cisalla])
  if(weapon)weapon.visible=false;
 if(u.pistolFlash)u.pistolFlash.visible=false;
 player.visible=true;
 player.updateMatrixWorld(true);
}
function deathFaceCamera(player,cameraPosition){
 const head=player.userData?.head;
 if(!head)return;
 // El gir Y local, amb el cos ajagut, fa rodar la cara cap al costat
 // des d'on mira la càmera. Limitam el gir per respectar el coll.
 const headPosition=head.getWorldPosition(new THREE.Vector3()),
       localView=new THREE.Vector3().copy(cameraPosition).sub(headPosition),
       inverse=player.getWorldQuaternion(new THREE.Quaternion()).invert();
 localView.applyQuaternion(inverse);
 const angle=Math.atan2(-localView.x,-localView.z);
 head.rotation.y=Math.max(-1.48,Math.min(1.48,angle));
 head.rotation.x=-.06;
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
 // Fulla plana i corbada com la referència: NOMÉS el perfil de la
 // fulla, no el mànec de la fotografia. La silueta afuada no és un tub.
 const blade=new THREE.Shape();
 blade.moveTo(1.34,3.85);
 blade.bezierCurveTo(.80,4.03,-.32,3.91,-.86,2.18);
 blade.bezierCurveTo(-.90,2.98,-.30,3.61,1.34,3.85);
 const bladeMesh=part(new THREE.ShapeGeometry(blade,22),steel,0,0,.30);
 bladeMesh.material.side=THREE.DoubleSide;
 // Un fil clar al tall interior, en el mateix pla, sense gruix cilíndric.
 const cuttingEdge=new THREE.CubicBezierCurve3(
  new THREE.Vector3(-.86,2.18,.32),new THREE.Vector3(-.90,2.98,.32),
  new THREE.Vector3(-.30,3.61,.32),new THREE.Vector3(1.34,3.85,.32));
 const edgeGeometry=new THREE.BufferGeometry().setFromPoints(cuttingEdge.getPoints(22));
 const edgeMaterial=mat(0xdde4e5,{metalness:.52,roughness:.28});
 part(edgeGeometry,edgeMaterial,0,0,0);
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
 deathPoseProne(player,{x:0,y:0,z:.85},-Math.PI/2);
 deathFaceCamera(player,voidCamera.position);
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
 const onWater=info.kind==='shark'||(cv&&VT[cv.t]?.m==='w');
 const floor=onWater?Math.max(P.y,wy(P.x,P.z,elapsed)-.15):cv?hAt(P.x,P.z):P.y;
 const heading=P.hd||0;
 const bodyFocus=new THREE.Vector3(P.x-Math.sin(heading)*.45,floor+.6,
   P.z-Math.cos(heading)*.45);
 const v={active:true,finished:false,t:0,phase:'replay',cause:info,source,hit,direction,
  overlay,shade,replayLabel,causeEl,finale,button,previousVisibility:{},previousFov:cam.fov,
  previousPlayerPose:{position:pl.position.clone(),rotation:pl.rotation.clone(),visible:pl.visible},
  heading,bodyFocus,lastBell:-1,voidScene:null,reaper:null,replayEffect:null};
 deathCinematic=v;
 deathUi(true);endEl.style.display='none';
 // En morir conduint el model del jugador estava ocult: també ha de
 // poder veure's ajagut durant la repetició del darrer impacte.
 deathPoseProne(pl,{x:P.x,y:floor,z:P.z},heading);
 deathFaceCamera(pl,cam.position);
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
 pl.position.copy(v.previousPlayerPose.position);
 pl.rotation.copy(v.previousPlayerPose.rotation);
 pl.visible=v.previousPlayerPose.visible;
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
  // Pla lateral del cos: permet veure la cara girada fins i tot quan
  // el cop mortal ha arribat per l'esquena.
  const right=new THREE.Vector3(Math.cos(v.heading),0,-Math.sin(v.heading));
  cam.position.copy(v.bodyFocus).addScaledVector(right,8-replay*2)
    .addScaledVector(v.direction,-2.3+replay);
  cam.position.y+=3.7-replay*.7;
  cam.lookAt(v.bodyFocus);
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
  deathFaceCamera(pl,cam.position);
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
  if(v.voidPlayer?.userData?.head)
   deathFaceCamera(v.voidPlayer,v.voidCamera.position);
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

