// Cinemàtica de victòria: la simulació queda aturada, però l'escena,
 // la càmera, les gavines i el mar continuen renderitzant-se.
const VICTORY_REPLAY_SECONDS=2.35,VICTORY_OVERHEAD_SECONDS=3.25,
      VICTORY_SUNSET_SECONDS=4.7;
let victoryCinematic=null;

const victoryClamp=t=>Math.max(0,Math.min(1,t));
const victoryEase=t=>{const p=victoryClamp(t);return p*p*(3-2*p)};

function victoryShotSnapshot(general,shot){
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
  return {hit,from,impact,direction,
    approach:hit.clone().addScaledVector(direction,-distance),
    heavy:!!(shot?.spl>0),source:shot?.own||'p'};
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
  if(v.bullet)scene.remove(v.bullet);
  if(v.impactFlash)scene.remove(v.impactFlash);
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
        initialQuaternion=general.o.quaternion.clone(),
        axis=new THREE.Vector3(0,1,0).cross(shot.direction.clone().setY(0)).normalize(),
        fallingAxis=axis.lengthSq()<.001?new THREE.Vector3(1,0,0):axis;
  setSniperScope(false);
  over=1;Object.keys(K).forEach(k=>K[k]=0);
  if(eng)eng.g.gain.value=0;
  // El personatge havia entrat al sistema normal de morts.
  // Durant el replay animarem exclusivament aquest general.
  const bg=new THREE.Mesh(shot.heavy?gHeavy:gB,shot.heavy?mS:mW);
  bg.scale.setScalar(shot.heavy?1.6:.85);
  bg.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),shot.direction);
  scene.add(bg);bg.visible=false;
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
  caption.textContent='EL DARRER DISPAR';
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
  hint.onclick=()=>panel('restart');
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
  victoryCinematic={active:true,t:0,phase:'replay1',general,base,initialQuaternion,
    fallingAxis,shot,seaDir,seaCamera,bullet:bg,impactFlash:flash,
    gulls,overlay,caption,title,hint,originalVisibility:{},
    lastReplay:-1,cryTime:0,finished:false};
  victoryUi(true);endEl.style.display='none';
  return true;
}
function victorySetFall(progress){
  const v=victoryCinematic,u=v.general,fall=victoryEase(progress);
  u.o.quaternion.copy(v.initialQuaternion)
    .multiply(new THREE.Quaternion().setFromAxisAngle(v.fallingAxis,1.55*fall));
  u.o.position.copy(v.base);
  u.o.position.y+=.12*Math.sin(Math.PI*fall);
  const rig=u.o.userData;
  if(rig?.arms){
    rig.arms.forEach((a,i)=>{a.rotation.x=(i?-.72:.85)*fall;
      a.rotation.z=(i?.85:-.9)*fall});
  }
  if(rig?.knees)rig.knees.forEach((k,i)=>{k.rotation.x=-(i?.4:.7)*fall});
  if(rig?.elbows)rig.elbows.forEach((e,i)=>{e.rotation.x=(i?.45:.8)*fall});
}
function victoryAnimateGulls(v){
  const offset=v.t-(VICTORY_REPLAY_SECONDS*3+VICTORY_OVERHEAD_SECONDS);
  for(const gull of v.gulls){
    const i=gull.index,span=50+i*8,side=((i%5)-2)*12,
      lateral=new THREE.Vector3(-v.seaDir.z,0,v.seaDir.x);
    gull.o.visible=true;
    gull.o.position.copy(v.seaCamera)
      .addScaledVector(v.seaDir,span+offset*.7)
      .addScaledVector(lateral,side+Math.sin(v.t*.7+i)*5);
    gull.o.position.y+=5+(i%4)*4+Math.sin(v.t*1.2+i)*1.7;
    gull.o.rotation.y=Math.atan2(-v.seaDir.x,-v.seaDir.z);
    gull.wl.rotation.z=Math.sin(v.t*5+i*1.8)*.48;
    gull.wr.rotation.z=-gull.wl.rotation.z;
  }
  if(offset>1.2&&v.t-v.cryTime>1.7){victoryGullCry();v.cryTime=v.t}
}
function updateVictoryCinematic(dt){
  const v=victoryCinematic;
  if(!v||(!v.active&&!v.finished))return;
  v.t+=Math.max(0,Math.min(.1,dt));
  if(v.finished){victoryAnimateGulls(v);return}
  const replayTotal=VICTORY_REPLAY_SECONDS*3,overheadEnd=replayTotal+VICTORY_OVERHEAD_SECONDS,
        end=overheadEnd+VICTORY_SUNSET_SECONDS;
  const target=v.shot.hit,dir=v.shot.direction,
        across=new THREE.Vector3(-dir.z,0,dir.x),base=v.base;
  v.bullet.visible=false;v.impactFlash.visible=false;
  v.caption.style.opacity=v.t<replayTotal?'1':'0';
  if(v.t<replayTotal){
    const idx=Math.floor(v.t/VICTORY_REPLAY_SECONDS),
          local=v.t-idx*VICTORY_REPLAY_SECONDS;
    v.phase='replay'+(idx+1);
    if(v.lastReplay!==idx){v.lastReplay=idx;victorySlowGunshot(v.shot.heavy)}
    const fall=victoryClamp((local-.85)/1.22);
    victorySetFall(fall);
    // El mateix tret torna a aparèixer tres vegades: sense tornar a fer
    // dany ni a modificar la partida. Velocitat visual ≈ 20% de la normal.
    const bulletT=victoryClamp((local-.18)/.88);
    if(local>=.18&&local<=1.06){
      v.bullet.visible=true;
      v.bullet.position.copy(v.shot.approach).lerp(target,bulletT);
    }
    if(local>=.98&&local<1.35){
      v.impactFlash.visible=true;
      v.impactFlash.position.copy(target);
      const k=(local-.98)/.37;
      v.impactFlash.scale.setScalar(.5+k*1.5);
      v.impactFlash.material.opacity=(1-k)*.85;
    }
    const side=idx===0?1:idx===1?-1:.42,
          distance=idx===2?11:15,
          elev=idx===1?5.2:idx===2?3.2:6;
    const desired=target.clone().addScaledVector(across,side*distance)
      .addScaledVector(dir,idx===2?-8:idx===1?8:-2);
    desired.y=Math.max(hAt(desired.x,desired.z)+2,target.y+elev);
    cam.position.copy(desired);
    cam.lookAt(target.x,target.y+(idx===1?.3:0),target.z);
    const fov=idx===2?43:48;
    if(cam.fov!==fov){cam.fov=fov;cam.updateProjectionMatrix()}
  }else if(v.t<overheadEnd){
    v.phase='overhead';victorySetFall(1);
    const f=victoryEase((v.t-replayTotal)/VICTORY_OVERHEAD_SECONDS),
          h=10+175*f;
    cam.position.set(base.x+Math.sin(f*1.3)*h*.12,base.y+h,
      base.z+Math.cos(f*1.3)*h*.12);
    cam.lookAt(base.x,base.y+.5,base.z);
    if(cam.fov!==54){cam.fov=54;cam.updateProjectionMatrix()}
  }else{
    v.phase='sunset';victorySetFall(1);
    const f=victoryEase((v.t-overheadEnd)/2.6);
    const from=new THREE.Vector3(base.x+Math.sin(1.3)*185*.12,base.y+185,
      base.z+Math.cos(1.3)*185*.12);
    cam.position.copy(from).lerp(v.seaCamera,f);
    const down=new THREE.Vector3(base.x,base.y+.5,base.z),
          horizon=v.seaCamera.clone().addScaledVector(v.seaDir,340);
    horizon.y=v.seaCamera.y+10;
    cam.lookAt(down.lerp(horizon,f));
    const fov=54+6*f;
    if(Math.abs(cam.fov-fov)>.01){cam.fov=fov;cam.updateProjectionMatrix()}
    v.title.style.opacity=String(victoryEase((v.t-overheadEnd-2.0)/1.15));
    v.title.style.transform='scale('+(1-.04*(1-victoryEase((v.t-overheadEnd-2)/1.3)))+')';
    victoryAnimateGulls(v);
    if(v.t>=end){
      v.phase='finished';v.finished=true;v.active=false;
      v.title.style.opacity='1';
      v.hint.style.display='block';v.hint.style.opacity='1';
    }
  }
}
