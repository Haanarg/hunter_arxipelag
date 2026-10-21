// Cinemàtica de victòria: la simulació queda aturada, però l'escena,
 // la càmera, les gavines i el mar continuen renderitzant-se.
const VICTORY_REPLAY_SECONDS=2.35,VICTORY_OVERHEAD_SECONDS=3.25,
      VICTORY_SUNSET_SECONDS=8.7;
let victoryCinematic=null;

const victoryClamp=t=>Math.max(0,Math.min(1,t));
const victoryEase=t=>{const p=victoryClamp(t);return p*p*(3-2*p)};

function victoryShotSnapshot(general,shot){
  const attack=shot?.weapon==='knife'?'knife':shot?.weapon==='grenade'?'grenade':
    shot?.weapon==='bazooka'||shot?.own==='pb'?'rocket':
    !shot?'impact':shot.spl>0&&!Number.isFinite(shot.vx)?'explosion':'bullet';
  const hit=new THREE.Vector3(general.x,general.o.position.y+1.6,general.z),
        from=shot&&Number.isFinite(shot.sx)&&Number.isFinite(shot.sz)
          ?new THREE.Vector3(shot.sx,shot.sy,shot.sz)
          :new THREE.Vector3(cv?.x??P.x,(cv?.o?.position.y??P.y)+1.6,cv?.z??P.z),
        impact=shot&&Number.isFinite(shot.x)&&Number.isFinite(shot.y)
          ?new THREE.Vector3(shot.x,shot.y,shot.z):hit.clone();
  let direction=impact.clone().sub(from);
  if(direction.lengthSq()<.01)direction=hit.clone().sub(from);
  if(direction.lengthSq()<.01)direction.set(0,0,-1);
  direction.normalize();
  const distance=Math.min(34,Math.max(7,from.distanceTo(hit)));
  return {hit,from,impact,direction,attack,
    approach:attack==='grenade'?from.clone():hit.clone().addScaledVector(direction,-distance),
    heavy:!!(shot?.spl>0),source:shot?.own||'p'};
}

function victoryReplayProjectile(shot,source){
  if(shot.attack==='knife'||shot.attack==='impact'||shot.attack==='explosion')return null;
  if(shot.attack==='grenade'&&source?.o)return source.o.clone(true);
  if(shot.attack==='rocket'){
    // Coet amb cos i aletes recognoscibles, diferent de l'ojiva del canó.
    const rocket=new THREE.Group(),metal=new THREE.MeshStandardMaterial({color:0x6f7960,metalness:.48,roughness:.48}),
          body=new THREE.Mesh(gHeavy,metal);
    body.scale.set(1.1,1.1,2.25);rocket.add(body);
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2,fin=new THREE.Mesh(new THREE.BoxGeometry(.09,.39,.46),metal);
      fin.position.set(Math.cos(a)*.23,Math.sin(a)*.23,.68);fin.rotation.z=a;rocket.add(fin);
    }
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.15,.54,8),
      new THREE.MeshBasicMaterial({color:0xffb04e,transparent:true,opacity:.85,depthWrite:false}));
    flame.rotation.x=Math.PI/2;flame.position.z=1.34;rocket.add(flame);
    return rocket;
  }
  // gB va desaparèixer en substituir les bales per gLight: el darrer tret
  // al general provocava ReferenceError just en començar la victòria.
  return new THREE.Mesh(shot.heavy?gHeavy:gLight,shot.heavy?mS:mW);
}

function victoryKnifeSlash(shot){
  if(shot.attack!=='knife')return null;
  const points=[];
  for(let i=0;i<=16;i++){
    const a=-1.15+2.3*i/16;
    points.push(shot.hit.clone().addScaledVector(shot.direction,Math.sin(a)*.78)
      .add(new THREE.Vector3(0,Math.cos(a)*.68-.14,0)));
  }
  const slash=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.045,5,false),
    new THREE.MeshBasicMaterial({color:0xdbe9ed,transparent:true,opacity:.82,depthWrite:false}));
  slash.visible=false;scene.add(slash);return slash;
}

function victoryReplaySound(shot){
  if(shot.attack==='knife'||shot.attack==='impact'){snd('hurt',.55);return}
  if(shot.attack==='grenade'||shot.attack==='rocket'||shot.attack==='explosion'){snd('boom',.72);return}
  victorySlowGunshot(shot.heavy);
}

function victoryClearObstructions(v){
  // La simulació s'atura quan mor el general: els fragments i el flaix
  // de l'explosió quedarien congelats davant de la càmera.
  for(const d of DB){
    const mesh=d.m;if(!mesh||v.dimmedFragments.has(mesh))continue;
    const original=mesh.material;
    const dim=material=>{
      if(!material)return material;
      if(!v.fragmentMaterials.has(material)){
        const faded=material.clone();faded.transparent=true;faded.opacity=.23;faded.depthWrite=false;
        v.fragmentMaterials.set(material,faded);
      }
      return v.fragmentMaterials.get(material);
    };
    v.dimmedFragments.set(mesh,original);
    mesh.material=Array.isArray(original)?original.map(dim):dim(original);
  }
  for(const f of fx)if(f.o&&!v.hiddenExplosionFx.has(f.o)){
    v.hiddenExplosionFx.set(f.o,f.o.visible);f.o.visible=false;
  }
}

function victorySlowGunshot(heavy){
  if(!AC)return;
  try{
    const now=AC.currentTime,duration=heavy?.42:.24,
          length=Math.max(1,Math.floor(AC.sampleRate*duration)),
          buffer=AC.createBuffer(1,length,AC.sampleRate),samples=buffer.getChannelData(0);
    for(let i=0;i<length;i++){
      const p=i/length;
      samples[i]=(Math.random()*2-1)*Math.pow(1-p,2.4);
    }
    const source=AC.createBufferSource(),filter=AC.createBiquadFilter(),gain=AC.createGain();
    source.buffer=buffer;source.playbackRate.value=.55;
    filter.type='lowpass';filter.frequency.value=heavy?340:750;
    gain.gain.value=heavy?.44:.31;
    source.connect(filter);filter.connect(gain);gain.connect(AC.destination);
    source.start(now);
  }catch(e){snd(heavy?'cannon':'shot',.75)}
}
function victoryGullCry(){
  if(!AC)return;
  try{
    const now=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();
    o.type='sine';o.frequency.setValueAtTime(1280,now);
    o.frequency.exponentialRampToValueAtTime(830,now+.14);
    o.frequency.exponentialRampToValueAtTime(1100,now+.28);
    g.gain.setValueAtTime(.001,now);g.gain.linearRampToValueAtTime(.055,now+.06);
    g.gain.exponentialRampToValueAtTime(.001,now+.36);
    o.connect(g);g.connect(AC.destination);o.start(now);o.stop(now+.37);
  }catch(e){}
}
function victoryFindSea(general){
  // Cercar aigua real, no un fons inventat. Afavorim el mateix costat del sol.
  let best=null,score=-Infinity;
  const sunHeading=new THREE.Vector3(sunDir.x,0,sunDir.z).normalize();
  for(let i=0;i<24;i++){
    const a=i*Math.PI*2/24,dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
    let water=0;
    for(const dist of [140,260,400,600,820]){
      const x=Math.max(-H+35,Math.min(H-35,general.x+dir.x*dist)),
            z=Math.max(-H+35,Math.min(H-35,general.z+dir.z*dist));
      if(hAt(x,z)<-.9)water+=1;
    }
    const rank=water*3+dir.dot(sunHeading)*2;
    if(rank>score){score=rank;best=dir}
  }
  return best||sunHeading;
}
function victoryUi(show){
  const ids=['hud','mm','perfStats','contextButtons','joystick','strafeLeft',
    'strafeRight','sniperScope'],c=victoryCinematic;
  if(!c)return;
  if(show){
    for(const id of ids){
      const node=document.getElementById(id);
      c.originalVisibility[id]=node.style.visibility;
      node.style.visibility='hidden';
    }
  }else for(const id of ids)
    document.getElementById(id).style.visibility=c.originalVisibility[id]||'';
}
function clearVictoryCinematic(){
  const v=victoryCinematic;if(!v)return;
  victoryUi(false);
  if(v.pose)window.HUNTER_VICTORY_POSE.apply(v.pose,0);
  if(v.bullet)scene.remove(v.bullet);
  if(v.knifeSlash){scene.remove(v.knifeSlash);v.knifeSlash.geometry.dispose();v.knifeSlash.material.dispose()}
  if(v.impactFlash)scene.remove(v.impactFlash);
  for(const [mesh,material] of v.dimmedFragments)mesh.material=material;
  for(const material of v.fragmentMaterials.values())material.dispose();
  for(const [mesh,visible] of v.hiddenExplosionFx)mesh.visible=visible;
  for(const gull of v.gulls)scene.remove(gull.o);
  if(v.overlay?.parentNode)v.overlay.parentNode.removeChild(v.overlay);
  // No manipulem ni destruïm geometries/materials compartits del joc.
  if(cam.fov!==58){cam.fov=58;cam.updateProjectionMatrix()}
  victoryCinematic=null;
}
function startVictoryCinematic(general,killingShot=null){
  if(victoryCinematic||!general?.o)return false;
  const shot=victoryShotSnapshot(general,killingShot),
        seaDir=victoryFindSea(general),base=general.o.position.clone(),
        pose=window.HUNTER_VICTORY_POSE.capture(THREE,general.o,shot.direction);
  setSniperScope(false);
  over=1;Object.keys(K).forEach(k=>K[k]=0);
  if(eng)eng.g.gain.value=0;
  // El personatge havia entrat al sistema normal de morts.
  // Durant el replay animarem exclusivament aquest general.
  const bg=victoryReplayProjectile(shot,killingShot),knifeSlash=victoryKnifeSlash(shot);
  if(bg){
    bg.scale.setScalar(shot.attack==='grenade'?2.7:shot.attack==='rocket'?1.35:shot.heavy?1.6:.85);
    bg.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),shot.direction);
    scene.add(bg);bg.visible=false;
  }
  const flash=new THREE.Mesh(new THREE.SphereGeometry(.52,9,6),
    new THREE.MeshBasicMaterial({color:0xffc975,transparent:true,opacity:.8,depthWrite:false}));
  flash.visible=false;scene.add(flash);
  const overlay=document.createElement('div');
  overlay.id='victoryCinematicOverlay';
  overlay.setAttribute('aria-live','polite');
  Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'20',
    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
    pointerEvents:'none',fontFamily:'system-ui,sans-serif',textAlign:'center'});
  const caption=document.createElement('div');
  caption.textContent='KILL CAM';
  Object.assign(caption.style,{position:'absolute',top:'7%',fontSize:'clamp(14px,2vw,24px)',
    fontWeight:'700',letterSpacing:'.28em',color:'#fff1da',textShadow:'0 2px 10px #000',
    opacity:'0',transition:'opacity .3s'});
  const title=document.createElement('div');
  title.textContent='MISSIÓ COMPLERTA';
  Object.assign(title.style,{fontSize:'clamp(44px,8vw,116px)',fontWeight:'900',
    letterSpacing:'.075em',lineHeight:'1.05',color:'#ffe3ab',
    textShadow:'0 3px 6px #382211,0 6px 28px #000',
    opacity:'0',transform:'scale(.96)',transition:'opacity .45s'});
  const hint=document.createElement('button');
  hint.textContent='NOVA PARTIDA';
  Object.assign(hint.style,{position:'absolute',bottom:'12%',background:'#11263bde',
    border:'1px solid #ffe3ab',borderRadius:'10px',padding:'12px 22px',color:'#fff',
    fontSize:'17px',letterSpacing:'.08em',cursor:'pointer',pointerEvents:'auto',opacity:'0',
    display:'none'});
  // Nova partida torna directament a la portada, sense obrir el diàleg de reinici.
  hint.onclick=()=>window.location.reload();
  overlay.append(caption,title,hint);document.body.appendChild(overlay);
  const gulls=[];
  for(let i=0;i<9;i++){
    const gull=window.HUNTER_FAUNA.createGull(THREE,{box:bx,material:M});
    gull.o.visible=false;gull.o.scale.setScalar(.95+(i%4)*.33);
    scene.add(gull.o);gulls.push({...gull,index:i})
  }
  // Triar el primer punt de mar obert en el rumb escollit, perquè el
  // darrer pla sigui REALMENT damunt l'aigua fins i tot si l'HQ és interior.
  const seaCamera=base.clone();
  let bestSea=Infinity;
  for(const dist of [130,190,270,380,520,680,850,1050]){
    const x=Math.max(-H+35,Math.min(H-35,base.x+seaDir.x*dist)),
          z=Math.max(-H+35,Math.min(H-35,base.z+seaDir.z*dist)),
          level=hAt(x,z);
    if(level<bestSea){bestSea=level;seaCamera.x=x;seaCamera.z=z}
    if(level<-1.5)break;
  }
  seaCamera.y=Math.max(20,hAt(seaCamera.x,seaCamera.z)+16);
  // Dues orientacions estables: zenital sense gir i sol real del joc.
  // La vista zenital té un "amunt" horitzontal fix, oposat al rumb del sol:
  // així el gir posterior és només un pitch suau, sense inversions de 180°.
  const overheadUp=new THREE.Vector3(-sunDir.x,0,-sunDir.z).normalize(),
        overheadOrientation=new THREE.Quaternion().setFromRotationMatrix(
          new THREE.Matrix4().lookAt(
            new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,0),overheadUp)),
        sunsetOrientation=new THREE.Quaternion().setFromRotationMatrix(
          new THREE.Matrix4().lookAt(
            new THREE.Vector3(0,0,0),sunDir,new THREE.Vector3(0,1,0)));
  victoryCinematic={active:true,t:0,phase:'replay1',general,base,pose,
    overheadOrientation,sunsetOrientation,
    shot,seaDir,seaCamera,bullet:bg,knifeSlash,impactFlash:flash,
    gulls,overlay,caption,title,hint,originalVisibility:{},
    lastReplay:-1,gullCries:0,finished:false,
    dimmedFragments:new Map(),fragmentMaterials:new Map(),hiddenExplosionFx:new Map()};
  victoryUi(true);endEl.style.display='none';
  return true;
}
function victorySetFall(progress){
  // Exactament la mateixa postura que a final-proves.html:
  // braços alçats abans del cop, colzes enfora i rotació sobre el maluc.
  window.HUNTER_VICTORY_POSE.apply(victoryCinematic.pose,progress);
}
function victoryAnimateGulls(v){
  // Entrada per darrere de la càmera, des del costat esquerre.
  // Creuen el quadre amb aleteig visible i fugen cap a la dreta
  // fins al mar i a l'horitzó, no orbiten al voltant de la càmera.
  const offset=v.t-(VICTORY_REPLAY_SECONDS*3+VICTORY_OVERHEAD_SECONDS)-2.15,
        forward=new THREE.Vector3(sunDir.x,0,sunDir.z).normalize(),
        right=new THREE.Vector3(-forward.z,0,forward.x),
        cameraBase=v.seaCamera;
  for(const gull of v.gulls){
    const i=gull.index,local=offset-i*.17,
          p=victoryClamp(local/(4.25+i*.10));
    gull.o.visible=local>=0&&p<1;
    if(!gull.o.visible)continue;
    const launch=cameraBase.clone()
      .addScaledVector(forward,-9-i*.65)
      .addScaledVector(right,-16-i*2);
    launch.y+=4+(i%3)*2;
    const cross=cameraBase.clone()
      .addScaledVector(forward,25+i*3)
      .addScaledVector(right,2+(i%4)*2);
    cross.y+=5+(i%4)*1.6;
    const horizon=cameraBase.clone()
      .addScaledVector(forward,215+i*27)
      .addScaledVector(right,85+i*9);
    horizon.y+=3+(i%5);
    const waypoint=.37,
          f=p<waypoint?victoryEase(p/waypoint):victoryEase((p-waypoint)/(1-waypoint));
    gull.o.position.copy(p<waypoint?launch:cross)
      .lerp(p<waypoint?cross:horizon,f);
    // La cara del model de gavina apunta a -Z.
    const tangent=(p<waypoint
      ?cross.clone().sub(launch)
      :horizon.clone().sub(cross)).normalize();
    gull.o.rotation.y=Math.atan2(-tangent.x,-tangent.z);
    gull.o.rotation.z=Math.sin(v.t*2.3+i)*.12;
    const flap=Math.sin(local*8.1+i*.55)*.66;
    gull.wl.rotation.z=flap;
    gull.wr.rotation.z=-flap;
    const size=.95+(i%4)*.33;
    gull.o.scale.setScalar(size*(1-.62*victoryEase(p)));
  }
  if(v.gullCries<2&&offset>.5+v.gullCries*2.2){victoryGullCry();v.gullCries++}
}
function updateVictoryCinematic(dt){
  const v=victoryCinematic;
  if(!v||(!v.active&&!v.finished))return;
  v.t+=Math.max(0,Math.min(.1,dt));
  victoryClearObstructions(v);
  if(v.finished){victoryAnimateGulls(v);return}
  const replayTotal=VICTORY_REPLAY_SECONDS*3,overheadEnd=replayTotal+VICTORY_OVERHEAD_SECONDS,
        end=overheadEnd+VICTORY_SUNSET_SECONDS;
  const target=v.shot.hit,dir=v.shot.direction,
        across=new THREE.Vector3(-dir.z,0,dir.x),base=v.base;
  if(v.bullet)v.bullet.visible=false;
  if(v.knifeSlash)v.knifeSlash.visible=false;
  v.impactFlash.visible=false;
  v.caption.style.opacity=v.t<replayTotal?'1':'0';
  if(v.t<replayTotal){
    const idx=Math.floor(v.t/VICTORY_REPLAY_SECONDS),
          local=v.t-idx*VICTORY_REPLAY_SECONDS;
    v.phase='replay'+(idx+1);
    if(v.lastReplay!==idx){v.lastReplay=idx;victoryReplaySound(v.shot)}
    const fall=victoryClamp((local-.85)/1.22);
    victorySetFall(fall);
    // Tres repeticions visuals de l'atac real, sense tornar a fer dany.
    const bulletT=victoryClamp((local-.18)/.88);
    if(v.bullet&&local>=.18&&local<=1.06){
      v.bullet.visible=true;
      const destination=v.shot.heavy?v.shot.impact:target;
      v.bullet.position.copy(v.shot.approach).lerp(destination,bulletT);
      if(v.shot.attack==='grenade'){
        v.bullet.position.y+=Math.sin(Math.PI*bulletT)*Math.min(7,v.shot.from.distanceTo(destination)*.23);
        v.bullet.rotateX(dt*5);v.bullet.rotateZ(dt*3);
      }
    }
    if(v.shot.attack==='knife'){
      // Animació de l'arma i del braç del jugador, no una bala inventada.
      const knifeProgress=victoryClamp((local-.32)/.82);
      pl.userData.meleePose=Math.max(.001,(pl.userData.knifeAttackDuration||.48)*(1-knifeProgress));
      window.HUNTER_CHARACTERS.animatePlayer(pl,{forward:0,dt:.055,
        swimming:false,inVehicle:false,ammo:0});
      if(v.knifeSlash&&local>=.48&&local<=1.12){
        v.knifeSlash.visible=true;
        v.knifeSlash.material.opacity=.8*(1-victoryClamp((local-.62)/.5));
      }
    }
    if(v.shot.attack!=='knife'&&v.shot.attack!=='impact'&&local>=.98&&local<1.35){
      v.impactFlash.visible=true;
      v.impactFlash.position.copy(v.shot.heavy?v.shot.impact:target);
      const k=(local-.98)/.37;
      v.impactFlash.scale.setScalar(v.shot.heavy?1+k*4:.5+k*1.5);
      v.impactFlash.material.opacity=(1-k)*.85;
    }
    const side=idx===0?1:idx===1?-1:.42,
          distance=idx===2?11:15,
          elev=idx===1?5.2:idx===2?3.2:6;
    let desired=target.clone().addScaledVector(across,side*distance)
      .addScaledVector(dir,idx===2?-8:idx===1?8:-2);
    desired.y=Math.max(hAt(desired.x,desired.z)+2,target.y+elev);
    if(v.general.basement?.basement){
      // El general ara cau al despatx subterrani: tres angles dins de
      // l'habitació, no càmeres a la superfície mirant a través del sostre.
      const b=v.general.basement,p=b.basement.generalLocal,
            relative=[[2.8,2.7],[-3.1,1.4],[.8,-3.2]][idx],
            look=buildingWorldPoint(b,p.x+relative[0],p.z+relative[1]);
      desired.set(look.x,b.basement.floorY+3.3,look.z);
    }
    cam.position.copy(desired);
    cam.lookAt(target.x,target.y+(idx===1?.3:0),target.z);
    const fov=idx===2?43:48;
    if(cam.fov!==fov){cam.fov=fov;cam.updateProjectionMatrix()}
  }else if(v.t<overheadEnd){
    v.phase='overhead';victorySetFall(1);
    if(v.general.basement?.basement){
      for(const mesh of v.general.basement.basement.upperSlabMeshes)mesh.visible=false;
      v.general.basement.roof.visible=false;
    }
    const f=victoryEase((v.t-replayTotal)/VICTORY_OVERHEAD_SECONDS),
          h=10+175*f;
    // Ascens absolutament vertical, sense orbitar ni cridar lookAt
    // prop del pol zenital (que provocava el gir sobtat de 180°).
    cam.position.set(base.x,base.y+h,base.z);
    cam.quaternion.copy(v.overheadOrientation);
    if(cam.fov!==54){cam.fov=54;cam.updateProjectionMatrix()}
  }else{
    v.phase='sunset';victorySetFall(1);
    const f=victoryEase((v.t-overheadEnd)/2.6);
    const from=new THREE.Vector3(base.x,base.y+185,base.z);
    cam.position.copy(from).lerp(v.seaCamera,f);
    // El gir comença DESPRÉS de l'ascens. Interpolem quaternions,
    // evitant la singularitat de lookAt entre el zenital i el sol real.
    // La direcció solar prové del mateix rendering.js de la partida.
    cam.quaternion.copy(v.overheadOrientation).slerp(v.sunsetOrientation,f);
    const fov=54+6*f;
    if(Math.abs(cam.fov-fov)>.01){cam.fov=fov;cam.updateProjectionMatrix()}
    v.title.style.opacity=String(victoryEase((v.t-overheadEnd-3.1)/1.2));
    v.title.style.transform='scale('+(1-.04*(1-victoryEase((v.t-overheadEnd-3.1)/1.3)))+')';
    victoryAnimateGulls(v);
    if(v.t>=end){
      v.phase='finished';v.finished=true;v.active=false;
      v.title.style.opacity='1';
      v.hint.style.display='block';v.hint.style.opacity='1';
    }
  }
}
