// Cinemàtica de mort: recreació a càmera lenta de la causa, fosa al buit
// i trobada amb la Parca. No reprèn la simulació ni torna a aplicar dany.
const DEATH_REPLAY_SECONDS=4.5,DEATH_FADE_SECONDS=1.8,DEATH_REAPER_SECONDS=6.3;
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
// La simulació de combat s'atura després del cop fatal, però el model,
 // la càmera i els efectes continuen a temps cinematogràfic. Cada causa
 // té una trajectòria pròpia fins que el cos arriba a la postura definitiva.
function deathReplayPose(v){
 const t=Math.min(v.t,DEATH_REPLAY_SECONDS),kind=v.cause.kind;
 const explosion=kind==='explosion'||kind==='vehicleExplosion';
 const shark=kind==='shark',fall=kind==='fall',runover=kind==='runover';
 let settle=0,launch=0,lift=0,roll=0,extraPitch=0,crush=0;
 if(explosion){
  const flight=deathClamp((t-.32)/3.13);
  settle=deathEase((t-2.55)/.83);
  launch=7.8*deathEase(flight);
  // Conservam l'altura real si el jugador sortia d'un vehicle aeri.
  lift=Math.max(0,v.initialY-v.floor)*(1-deathEase(flight))+
    6.5*Math.sin(Math.PI*flight);
  extraPitch=-.9*Math.sin(Math.PI*flight);
  roll=.7*Math.sin(Math.PI*flight)*Math.sin(flight*Math.PI*2);
 }else if(fall){
  const drop=deathEase((t-.15)/2.85);
  settle=deathEase((t-2.78)/.53);
  lift=8.7*(1-drop);
  crush=.38*Math.exp(-Math.pow((t-3.16)/.28,2));
 }else if(shark){
  const sink=deathEase((t-.40)/3.38);
  settle=.17*sink;
  lift=-3.5*sink;
  roll=.30*Math.sin(8*t)*(1-sink);
  extraPitch=-.24*sink;
 }else if(runover){
  const flight=deathClamp((t-.48)/2.95);
  settle=deathEase((t-1.78)/1.2);
  launch=3.9*deathEase(flight);
  lift=2.4*Math.sin(Math.PI*flight);
  roll=-.48*Math.sin(Math.PI*flight);
  crush=.28*Math.exp(-Math.pow((t-3.12)/.32,2));
 }else{
  settle=deathEase((t-.56)/2.7);
  launch=(kind==='bullet'?1.55:.85)*settle;
  lift=.55*Math.sin(Math.PI*settle);
  roll=.22*Math.sin(Math.PI*settle)*(kind==='bullet'?-1:1);
 }
 // direction apunta des del jugador cap a l'origen del cop: sortim
 // projectats en el sentit contrari, també en caigudes o atropellaments.
 const fx=-Math.sin(v.heading),fz=-Math.cos(v.heading);
 const x=v.originX-v.direction.x*launch,z=v.originZ-v.direction.z*launch;
 const bodyY=v.floor+lift;
 deathPoseProne(pl,{x,y:bodyY,z},v.heading);
 const u=pl.userData,open=deathClamp(settle+(explosion ? .35*Math.sin(Math.PI*deathClamp((t-.3)/3.2)) : 0));
 pl.position.set(x-fx*1.05*settle,bodyY+.39*settle,z-fz*1.05*settle);
 pl.rotation.set(-Math.PI/2*settle+extraPitch,v.heading,roll);
 pl.scale.copy(v.previousPlayerPose.scale);
 pl.scale.y*=1-crush;
 if(u.lowerBody)u.lowerBody.rotation.set(0,0,0);
 if(u.upperBody)u.upperBody.rotation.x=shark ? .16*Math.sin(t*7)*(1-settle) : -.13*Math.sin(Math.PI*settle);
 if(u.al)u.al.rotation.z=-(.18+.47*open);
 if(u.ar)u.ar.rotation.z=.18+.47*open;
 if(u.ael)u.ael.rotation.x=.16+.44*open;
 if(u.aer)u.aer.rotation.x=.16+.44*open;
 if(shark){
  const thrash=(1-deathClamp((t-.4)/3.4));
  if(u.al)u.al.rotation.x=-.25+Math.sin(t*9)*.45*thrash;
  if(u.ar)u.ar.rotation.x=-.25-Math.sin(t*8.3)*.45*thrash;
  if(u.ll)u.ll.rotation.x=.20*Math.sin(t*7)*thrash;
  if(u.lr)u.lr.rotation.x=-.20*Math.sin(t*7+.5)*thrash;
 }
 const focusY=shark ? bodyY+1.8 : bodyY+(1-settle)*2.2+settle*.75;
 v.bodyFocus.set(x,focusY,z);
 if(!v.impactSoundPlayed&&t>=v.impactTime){
  v.impactSoundPlayed=true;
  if(shark)snd('swim',.95);
  else if(explosion)snd('boom',.5);
  else if(fall||runover)snd('hurt',.75);
  else snd('shot',.32);
 }
 pl.updateMatrixWorld(true);
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
 const shaft=part(new THREE.CylinderGeometry(.065,.085,4.45,8),trim,1.45,2.395,.3);
 shaft.rotation.z=0;
 // Fulla plana i corbada com la referència: NOMÉS el perfil de la
 // fulla, no el mànec de la fotografia. La silueta afuada no és un tub.
 const blade=new THREE.Shape();
 // El tall apunta cap a fora (dreta) en lloc de travessar el cap.
 // Mirall del perfil original respecte a l'eix vertical del mànec.
 blade.moveTo(1.45,4.62);
 blade.bezierCurveTo(2.02,4.83,3.15,4.70,3.73,2.96);
 blade.bezierCurveTo(3.78,3.77,3.16,4.40,1.45,4.62);
 const bladeMesh=part(new THREE.ShapeGeometry(blade,22),steel,0,0,.30);
 bladeMesh.material.side=THREE.DoubleSide;
 // Un fil clar al tall interior, en el mateix pla, sense gruix cilíndric.
 const cuttingEdge=new THREE.CubicBezierCurve3(
  new THREE.Vector3(3.73,2.96,.32),new THREE.Vector3(3.78,3.77,.32),
  new THREE.Vector3(3.16,4.40,.32),new THREE.Vector3(1.45,4.62,.32));
 const edgeGeometry=new THREE.BufferGeometry().setFromPoints(cuttingEdge.getPoints(22));
 const edgeMaterial=new THREE.LineBasicMaterial({color:0xe1e5e3,transparent:true,opacity:.85});
 owned.push(edgeGeometry,edgeMaterial);
 g.add(new THREE.Line(edgeGeometry,edgeMaterial));
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
// Efectes de l'últim instant: projectil retardat, ona expansiva i
// anells plans d'impacte/esquitx. No reprenen lògica de combat ni fan mal.
function deathReplayEffect(v){
 const type=v.cause.kind,from=v.source.clone(),to=v.hit.clone();
 const toward=to.clone().sub(from);
 if(toward.lengthSq()<.01)toward.set(0,0,1);
 if(toward.length()>19)from.copy(to).addScaledVector(toward.normalize(),-19);
 let geometry,material,mesh;
 const ripple=type==='fall'||type==='runover'||type==='shark';
 if(ripple){
  geometry=new THREE.RingGeometry(.65,.89,32);
  material=new THREE.MeshBasicMaterial({
   color:type==='shark'?0x9cd8e4:0xd1b7a0,
   side:THREE.DoubleSide,transparent:true,opacity:.58,depthWrite:false
  });
  mesh=new THREE.Mesh(geometry,material);
  mesh.rotation.x=-Math.PI/2;
  mesh.position.set(v.originX,type==='shark'?v.waterLevel+.12:v.floor+.1,v.originZ);
 }else if(type==='bullet'){
  geometry=new THREE.SphereGeometry(.15,10,7);
  material=new THREE.MeshBasicMaterial({color:0xffe6b8});
  mesh=new THREE.Mesh(geometry,material);mesh.position.copy(from);
 }else{
  geometry=new THREE.SphereGeometry(1.05,12,8);
  material=new THREE.MeshBasicMaterial({color:0xff8c55,
   transparent:true,opacity:.75,depthWrite:false});
  mesh=new THREE.Mesh(geometry,material);mesh.position.copy(v.source);
 }
 mesh.visible=false;
 scene.add(mesh);
 return {mesh,geometry,material,from,ripple};
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
 // En explosions de vehicles o cops en vol, P.y pot quedar a
 // l'altura de l'helicòpter: l'animació ha d'aterrar al terreny real.
 const ground=groundAt(P.x,P.z,P.y);
 const airborneDeath=info.kind==='vehicleExplosion'||info.kind==='explosion'||info.kind==='runover';
 const floor=onWater?Math.max(P.y,wy(P.x,P.z,elapsed)-.15):
  (cv||airborneDeath)?ground:P.y;
 const heading=P.hd||0;
 const bodyFocus=new THREE.Vector3(P.x-Math.sin(heading)*.45,floor+.6,
   P.z-Math.cos(heading)*.45);
 const v={active:true,finished:false,t:0,phase:'replay',cause:info,source,hit,direction,
  overlay,shade,replayLabel,causeEl,finale,button,previousVisibility:{},previousFov:cam.fov,
  previousPlayerPose:{position:pl.position.clone(),rotation:pl.rotation.clone(),scale:pl.scale.clone(),visible:pl.visible},
  heading,bodyFocus,originX:P.x,originZ:P.z,initialY:P.y,floor,waterLevel:wy(P.x,P.z,elapsed),
  impactTime:info.kind==='fall' ? 3.01 : info.kind==='shark' ? .68 :
   info.kind==='runover' ? 2.9 : .62,
  impactSoundPlayed:false,lastBell:-1,voidScene:null,reaper:null,replayEffect:null};
 deathCinematic=v;
 deathUi(true);endEl.style.display='none';
 // En morir conduint el model del jugador estava ocult: també ha de
 // poder veure's ajagut durant la repetició del darrer impacte.
 deathReplayPose(v);
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
 pl.scale.copy(v.previousPlayerPose.scale);
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
  // Seguiment lateral cinematogràfic del cos: la càmera acompanya
  // l'enlairament, la caiguda o l'enfonsament, sense teleportar el model.
  deathReplayPose(v);
  const right=new THREE.Vector3(Math.cos(v.heading),0,-Math.sin(v.heading));
  cam.position.copy(v.bodyFocus).addScaledVector(right,9-replay*2.5)
    .addScaledVector(v.direction,-2.8+replay*.8);
  if(v.cause.kind==='shark'){
   // La càmera es capbussa amb el jugador: si es quedàs sobre l'aigua,
   // la superfície opaca taparia justament l'enfonsament.
   const dive=deathEase((v.t-.28)/3.38);
   cam.position.y=v.waterLevel+1.7-5.7*dive;
  }else cam.position.y+=3.8-replay*.65;
  cam.lookAt(v.bodyFocus);
  const fieldOfView=(v.cause.kind==='explosion'||v.cause.kind==='vehicleExplosion'?58:53)-replay*4;
  if(Math.abs(cam.fov-fieldOfView)>.05){cam.fov=fieldOfView;cam.updateProjectionMatrix()}
  if(v.replayEffect){
   const effect=v.replayEffect,material=effect.material,type=v.cause.kind;
   if(type==='bullet'){
    // La bala arriba al personatge JUST quan comença a caure.
    const f=deathEase((v.t-.09)/.49);
    effect.mesh.visible=v.t>.09&&v.t<.71;
    effect.mesh.position.copy(effect.from).lerp(v.hit,f);
    effect.mesh.scale.setScalar(1+.7*f);
   }else if(effect.ripple){
    const impact=type==='shark' ? .68 : type==='fall' ? 3.02 : 3.01;
    const p=deathClamp((v.t-impact)/1.35);
    effect.mesh.visible=v.t>=impact&&p<1;
    effect.mesh.scale.setScalar(.5+5*p);
    material.opacity=.58*(1-p);
   }else{
    const p=deathClamp((v.t-.42)/2.15);
    effect.mesh.scale.setScalar(.3+4.1*p);
    material.opacity=.72*(1-p);
    effect.mesh.visible=v.t>=.42&&p<1;
   }
  }
  if(replay>.8&&v.cause.kind!=='shark')deathFaceCamera(pl,cam.position);
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

