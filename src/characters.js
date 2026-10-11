// Model i animació visual del jugador. No conté moviment, inventari ni combat.
// Pistola del protagonista i IK de les dues mans. Els models enemics NO usen això.
function createPlayerPistol(T,gun){
  const material=(color,metalness=.1,roughness=.8)=>new T.MeshStandardMaterial({color,metalness,roughness,flatShading:true});
  const steel=material(0x41494c,.58,.43),edge=material(0x7c8481,.65,.38),
        black=material(0x202729,.3,.65),dark=material(0x0c1418,.1,.82),wood=material(0x6a442e,.02,.87);
  const part=(parent,w,h,d,mat,x=0,y=0,z=0)=>{
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;
  };
  // Canó/corredera curts i empunyadura sense culata: inspiració Colt M1911.
  const slide=new T.Group();gun.add(slide);
  part(slide,.238,.165,.78,steel,0,.19,-.36);
  part(slide,.247,.026,.73,black,0,.10,-.37);
  part(slide,.204,.023,.72,edge,0,.28,-.36);
  part(slide,.047,.055,.24,dark,.125,.224,-.24);
  part(slide,.047,.019,.15,edge,.153,.245,-.24);
  for(const side of[-1,1])for(let i=0;i<5;i++)
    part(slide,.008,.106,.013,black,side*.126,.19,.006-i*.033);
  part(slide,.074,.055,.060,black,0,.315,-.693);
  for(const side of[-1,1])part(slide,.045,.06,.065,black,side*.076,.313,-.005);
  const muzzle=new T.Mesh(new T.CylinderGeometry(.074,.074,.09,12),edge);
  muzzle.rotation.x=Math.PI/2;muzzle.position.set(0,.183,-.771);slide.add(muzzle);
  const bore=new T.Mesh(new T.CylinderGeometry(.047,.047,.006,12),dark);
  bore.rotation.x=Math.PI/2;bore.position.set(0,.183,-.821);slide.add(bore);
  part(gun,.213,.12,.48,steel,0,.069,-.22);
  part(gun,.168,.065,.37,black,0,-.022,-.30);
  const grip=new T.Group();grip.position.set(0,-.12,.055);grip.rotation.x=-.20;gun.add(grip);
  part(grip,.208,.36,.185,black,0,-.08,0);
  for(const side of[-1,1]){
    part(grip,.018,.265,.145,wood,side*.111,-.075,.002);
    for(const y of[-.175,.025]){
      const screw=new T.Mesh(new T.CylinderGeometry(.018,.018,.018,8),edge);
      screw.rotation.z=Math.PI/2;screw.position.set(side*.129,y,.014);grip.add(screw);
    }
  }
  part(grip,.230,.034,.215,steel,0,-.274,.013);
  part(gun,.237,.055,.112,steel,0,.037,.095);
  const loop=new T.CatmullRomCurve3([
    new T.Vector3(0,.016,-.055),new T.Vector3(0,-.02,-.38),
    new T.Vector3(0,-.135,-.40),new T.Vector3(0,-.19,-.30),
    new T.Vector3(0,-.18,-.09),new T.Vector3(0,-.06,-.055)
  ],true);
  gun.add(new T.Mesh(new T.TubeGeometry(loop,28,.018,6,true),black));
  part(gun,.034,.115,.028,black,0,-.07,-.185).rotation.x=-.23;
  part(gun,.092,.060,.078,black,0,.286,.063).rotation.x=-.3;
  part(gun,.045,.033,.072,edge,.123,.055,.007);

  const flash=new T.Group(),flashMat=new T.MeshBasicMaterial({color:0xffd76d,depthWrite:false});
  const cone=new T.Mesh(new T.ConeGeometry(.13,.41,6),flashMat);
  cone.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(0,0,-1));
  cone.position.z=-.18;flash.add(cone);
  flash.add(new T.Mesh(new T.SphereGeometry(.11,8,6),new T.MeshBasicMaterial({color:0xfff4bb,depthWrite:false})));
  flash.position.set(0,.183,-.838);flash.visible=false;gun.add(flash);
  return {slide,flash};
}
// Postura 4B escollida: exactament la del comparador Three.js.
// X positiu al colze = flexió cap al davant; ganivet orientat cap al front (-Z).
const PLAYER_KNIFE_4B=Object.freeze({
  shoulder:Object.freeze({x:-.10,y:0,z:.55}),
  elbow:Object.freeze({x:.92,y:0,z:-.08}),
  blade:Object.freeze({x:.25,y:0,z:.50})
});
// Escollida l'estocada lateral 3B: gir de canell +90° durant l'impacte.
// Compartim aquests valors amb la pàgina de proves.
const PLAYER_KNIFE_ATTACK_3B=Object.freeze({
  turn:Object.freeze([.14,.44,.64,.90]),
  thrust:Object.freeze([.32,.57,.83]),
  windup:.30,reach:1.12,open:-.45,extend:.58,knifeX:-.07,knifeZ:-.25
});
const PLAYER_KNIFE_ATTACK_SECONDS=.48;
// La postura anterior és ara el 50 % de càrrega. En començar, el braç
// és més recollit; a força màxima, l'espatlla s'obre i retrocedeix.
function grenadeChargeArmPose(power=0){
  const t=Math.max(0,Math.min(1,Number.isFinite(power)?power:0));
  return {
    shoulderX:.28-.72*t,
    shoulderZ:.78+.80*t,
    elbowX:.56+.32*t,
    elbowZ:.08+.08*t
  };
}
const knifeEase=t=>{const n=Math.max(0,Math.min(1,t));return n*n*(3-2*n)};
const knifePulse=(p,a,m,b)=>p<=a||p>=b?0:
  p<m?knifeEase((p-a)/(m-a)):1-knifeEase((p-m)/(b-m));
const knifeHeldTurn=(p,a,m,r,b)=>p<=a||p>=b?0:
  p<m?knifeEase((p-a)/(m-a)):p<=r?1:1-knifeEase((p-r)/(b-r));
function knifeAttack3BTargets(progress){
  const p=Math.max(0,Math.min(1,progress)),
        c=PLAYER_KNIFE_ATTACK_3B,b=PLAYER_KNIFE_4B,
        preparation=knifePulse(p,.025,.17,.37),
        thrust=knifePulse(p,...c.thrust),
        wrist=knifeHeldTurn(p,...c.turn);
  return {
    shoulderX:b.shoulder.x-c.windup*preparation+c.reach*thrust,
    shoulderZ:b.shoulder.z+c.windup*.65*preparation+c.open*thrust,
    elbowX:b.elbow.x+.18*preparation-c.extend*thrust,
    elbowZ:b.elbow.z,
    bladeX:b.blade.x+c.knifeX*thrust,
    bladeY:Math.PI/2*wrist,
    bladeZ:b.blade.z+c.knifeZ*thrust,
    // Contrapès petit del braç esquerre, sense interferir amb l'arma.
    leftShoulderX:-.075*preparation+.17*thrust,
    leftShoulderZ:-.07*thrust,
    leftElbowX:.13*thrust+.03*preparation,
    preparation,thrust,wrist
  };
}
function makePlayerKnife(T,knife,box){
  // Compartit pel model en joc i els previews. Mà i mànec tenen el
  // mateix centre: ja no queda una fulla penjada sota el canell.
  const palm={x:0,y:-.62*1.2,z:-.025*1.2};
  knife.position.set(palm.x,palm.y,palm.z);
  const grip=box(knife,.16,.42,.155,0x59402d,0,0,0);
  for(const y of[-.105,.095])box(knife,.166,.026,.163,0x9f9e90,0,y,0);
  box(knife,.205,.065,.185,0x353e40,0,.233,0);
  box(knife,.39,.07,.18,0x404c4e,0,-.248,0);
  const profile=new T.Shape();
  profile.moveTo(-.102,-.284);profile.lineTo(.105,-.284);
  profile.lineTo(.117,-.63);profile.lineTo(.044,-.97);
  profile.lineTo(-.045,-1.055);profile.lineTo(-.115,-.69);
  profile.closePath();
  const bladeGeo=new T.ExtrudeGeometry(profile,{
    depth:.065,bevelEnabled:true,bevelThickness:.012,bevelSize:.008,
    bevelSegments:1,steps:1
  });
  bladeGeo.translate(0,0,-.0325);
  const blade=new T.Mesh(bladeGeo,new T.MeshStandardMaterial({
    color:0xbac6ca,metalness:.65,roughness:.34,flatShading:true
  }));
  blade.castShadow=true;knife.add(blade);
  box(knife,.026,.48,.012,0xe5eded,0,-.52,-.052);
  // Els mateixos punts geomètrics permeten verificar posició i direcció.
  knife.userData.previewGrip=grip;
  knife.userData.previewBlade=blade;
  knife.userData.previewPalm=palm;
  knife.userData.previewTip=new T.Vector3(-.045,-1.055,0);
}
// Solució geomètrica dels colzes. Barreja amb la postura base per evitar salts.
function aimPlayerPistolArm(shoulder,elbow,wrist,side,rig,blend){
  const start=shoulder.position,goal=rig.v1.copy(wrist).sub(start);
  const upper=Math.abs(elbow.position.y),lower=rig.forearmLength;
  const dist=Math.min(upper+lower-.001,Math.max(.001,goal.length()));
  const axis=goal.normalize(),along=(upper*upper+dist*dist-lower*lower)/(2*dist);
  const radius=Math.sqrt(Math.max(0,upper*upper-along*along));
  const pole=rig.v2.set(side*.2,-1,.18);
  pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const elbowP=rig.v3.copy(start).addScaledVector(axis,along).addScaledVector(pole,radius);
  const shoulderDir=rig.v4.copy(elbowP).sub(start).normalize();
  rig.q1.setFromUnitVectors(rig.down,shoulderDir);
  const forearmDir=rig.v4.copy(wrist).sub(elbowP).normalize().applyQuaternion(rig.q3.copy(rig.q1).invert());
  rig.q2.setFromUnitVectors(rig.forearm,forearmDir);
  shoulder.quaternion.slerp(rig.q1,blend);
  elbow.quaternion.slerp(rig.q2,blend);
}
window.HUNTER_CHARACTERS=Object.freeze({
  grenadeChargeArmPose,
  knifePose4B:PLAYER_KNIFE_4B,
  knifeAttack3B:PLAYER_KNIFE_ATTACK_3B,
  knifeAttack3BTargets,
  createCommando(T,{palette=window.HUNTER_PALETTE}={}){
 const g=window.HUNTER_PLAYER_MODEL.create(T,{palette}),u=g.userData,h=u.head,P=palette.enemy;
 for(const [m,,enemy]of u.mats)m.color.setHex(enemy);
 // Same silhouette, limbs, knee direction and boots as the approved protagonist.
 g.traverse(o=>{if(o.isMesh&&o.material.color.getHex()===0xf0c9a0)o.material.color.setHex(P.skin)});
 h.remove(u.cap,u.visor);
 // El comando porta la cara descoberta i boina.
 for(const o of [...h.children])if(o.material?.color.getHex()===0x162021)h.remove(o);
 const cache=new Map(),mat=c=>{if(!cache.has(c))cache.set(c,new T.MeshStandardMaterial({color:c,roughness:.88,flatShading:true}));return cache.get(c)};
 const mesh=(pa,geo,c,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,mat(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;pa.add(m);return m};
 const box=(pa,w,hh,d,c,x,y,z)=>mesh(pa,new T.BoxGeometry(w,hh,d),c,x,y,z);
 const dome=(pa,rx,ry,rz,c,x,y,z)=>{const m=mesh(pa,new T.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2),c,x,y,z);m.scale.set(rx,ry,rz);return m};
 // Small face features retain a readable face when no goggles are worn.
 for(const side of[-1,1]){box(h,.11,.045,.035,P.dark,side*.145,.075,-.324);box(h,.13,.025,.03,0x503324,side*.15,.14,-.308)}
  const beret=dome(h,.405,.165,.36,P.secondary,.045,.265,.01);beret.rotation.z=-.16;
  const band=mesh(h,new T.CylinderGeometry(.345,.345,.06,12),P.dark,0,.24,0);band.scale.z=.98;
  box(h,.085,.09,.025,0xd8c6a0,-.17,.30,-.286);
  // Diagonal webbing and radio, without broadening the shoulders.
  const belt=box(g,.09,.77,.06,P.dark,-.12,2.51,-.438);belt.rotation.z=-.5;
  box(g,.17,.25,.11,P.dark,.36,2.64,-.445);
  box(g,.025,.31,.025,0x343238,.36,2.89,-.45);
 // Fusell compacte unit al canell articulat.
 const gun=new T.Group();gun.position.set(0,-.59,-.035);gun.rotation.x=-Math.PI/2;u.aer.add(gun);
 box(gun,.11,.14,.85,P.metal,0,0,-.2);box(gun,.09,.09,.35,P.dark,0,0,-.77);
 box(gun,.10,.24,.15,P.dark,0,-.17,-.12);box(gun,.13,.16,.29,0x66513c,0,0,.36);
 u.gun=gun;u.legs=[u.ll,u.lr];u.arms=[u.al,u.ar];u.knees=[u.lkl,u.lkr];u.elbows=[u.ael,u.aer];
 u.profile='enemy-commando-approved';
 // Escala visual 80% del model de referència; no canvia la hitbox ni la IA.
 g.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(g);
 const height=bounds.max.y-bounds.min.y;
 for(const child of g.children)child.position.y-=bounds.min.y;
 const fit=3.66/height;
 g.traverse(o=>{if(o!==g)o.position.multiplyScalar(fit);if(o.isMesh)o.geometry.scale(fit,fit,fit)});
 g.scale.setScalar(.8);
 return g;
  },

  createSoldier(THREE,{box,material,general=false,palette=window.HUNTER_PALETTE}){
    return general?window.HUNTER_GENERAL_MODEL.create(THREE,{palette}):this.createCommando(THREE,{palette});
  },
  animateSoldier(model,{phase=0,moving=false,aim=false,dt=0,death=0}){
    const a=model.userData;if(!a.knees)return;
    const k=1-Math.exp(-12*dt),swing=moving?Math.sin(phase)*.45:0;
    const blend=(joint,x,z=0)=>{joint.rotation.x+=(x-joint.rotation.x)*k;joint.rotation.z+=(z-joint.rotation.z)*k};
    if(death>0){
      a.knees.forEach((j,i)=>{j.rotation.x=-(i?.38:.62)*death});
      a.elbows.forEach((j,i)=>{j.rotation.x=(i?.3:.65)*death});return;
    }
    a.legs[0].rotation.x=swing;a.legs[1].rotation.x=-swing;
    a.knees.forEach((j,i)=>blend(j,-(.06+Math.max(0,Math.sin(phase)*(i?1:-1))*.8*(moving?1:0))));
    a.arms.forEach((j,i)=>blend(j,aim?(i?.96:1.03):(i?swing:-swing)*.5,aim?(i?-.05:.12):(i?.025:-.025)));
    a.elbows.forEach((j,i)=>blend(j,aim?(i?.61:.55):.16+Math.max(0,Math.cos(phase)*(i?-1:1))*.18*(moving?1:0)));
  },
  createPlayer(THREE,{box,palette=window.HUNTER_PALETTE}){
    const P=palette.player,player=window.HUNTER_PLAYER_MODEL.create(THREE,{unitScale:1.2,palette,headVariant:'compactD'}),u=player.userData;
    u.ph=0;u.breath=0;u.firePose=0;u.meleePose=0;u.knifeAttackDuration=PLAYER_KNIFE_ATTACK_SECONDS;
    u.pistolAimTime=0;u.pistolShotAge=10;u.pistolBlend=0;

    // La pistola és filla del jugador; en repòs segueix un pivot del canell
    // dret i, en disparar, passa amb interpolació a la subjecció a dues mans.
    const gun=new THREE.Group();gun.scale.setScalar(.95);player.add(gun);u.gun=gun;
    const gunMount=new THREE.Group();gunMount.position.set(0,-.72,-.1);
    gunMount.rotation.x=-Math.PI/2;u.aer.add(gunMount);u.pistolIdleMount=gunMount;
    const pistol=createPlayerPistol(THREE,gun);
    u.pistolSlide=pistol.slide;u.pistolFlash=pistol.flash;
    const V=()=>new THREE.Vector3(),Q=()=>new THREE.Quaternion();
    u.pistolRig={
      down:new THREE.Vector3(0,-1,0),forearm:new THREE.Vector3(0,-.62*1.2,-.025*1.2).normalize(),
      forearmLength:Math.hypot(.62*1.2,.025*1.2),
      axisX:new THREE.Vector3(1,0,0),
      v1:V(),v2:V(),v3:V(),v4:V(),right:V(),left:V(),idle:V(),aim:V(),
      q1:Q(),q2:Q(),q3:Q(),idleQ:Q(),aimQ:Q()
    };
    const knife=new THREE.Group();u.aer.add(knife);
    makePlayerKnife(THREE,knife,box);
    knife.rotation.set(PLAYER_KNIFE_4B.blade.x,PLAYER_KNIFE_4B.blade.y,PLAYER_KNIFE_4B.blade.z);
    knife.visible=false;u.knife=knife;
    const grenade=new THREE.Group();grenade.position.set(0,-.82,-.08);u.aer.add(grenade);
    const grenadeBody=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),new THREE.MeshStandardMaterial({color:0x46513f,roughness:.82,metalness:.08}));grenadeBody.scale.set(.88,1.08,.88);grenade.add(grenadeBody);
    box(grenade,.08,.13,.08,0x252b27,0,.18,0);box(grenade,.05,.04,.18,0x747b73,.07,.24,0,'metal');grenade.visible=false;u.grenade=grenade;

    const bazooka=new THREE.Group();bazooka.position.set(.62,3.48,-.5);player.add(bazooka);
    const bazMat=new THREE.MeshStandardMaterial({color:0x58664a,roughness:.78,metalness:.08}),bazDark=new THREE.MeshStandardMaterial({color:0x252b27,roughness:.68,metalness:.25}),bazMetal=new THREE.MeshStandardMaterial({color:0x707873,roughness:.5,metalness:.42});
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,2.9,10),bazMat);tube.rotation.x=Math.PI/2;tube.position.z=-.12;bazooka.add(tube);
    const rear=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.16,10),bazDark);rear.rotation.x=Math.PI/2;rear.position.z=1.34;bazooka.add(rear);
    const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(.3,.24,.24,10),bazDark);muzzle.rotation.x=Math.PI/2;muzzle.position.z=-1.52;bazooka.add(muzzle);
    box(bazooka,.18,.35,.38,0x252b27,0,-.3,.25);box(bazooka,.12,.18,.42,0x707873,-.12,.26,-.48);box(bazooka,.16,.12,.5,0x707873,.18,.22,.28);
    bazooka.rotation.x=-.08;bazooka.visible=false;u.bazooka=bazooka;
    // Rifle de franctirador amb culata, canó llarg i visor elevat.
    const sniper=new THREE.Group();sniper.position.set(.23,3.1,-.58);player.add(sniper);
    box(sniper,.23,.24,2.2,0x596b5e,0,0,-.24,'paint');
    box(sniper,.15,.15,1.55,0x303938,0,.03,-1.95,'metal');
    box(sniper,.3,.32,.82,0x806847,0,-.07,1.05,'paint');
    box(sniper,.22,.4,.32,0x806847,0,-.13,1.43,'paint');
    box(sniper,.21,.21,.73,0x273232,0,.31,-.42,'metal');
    box(sniper,.26,.24,.13,0x273232,0,.31,-.73,'metal');
    box(sniper,.1,.22,.15,0x353b38,0,-.22,.1,'metal');
    sniper.visible=false;u.sniper=sniper;
    player.scale.setScalar(2/3);
    return player;
  },
  animatePlayer(player,{forward,dt,swimming,inVehicle,ammo,bazookaEquipped=false,grenadeEquipped=false,sniperEquipped=false,grenadeChargePower=0}){
    const u=player.userData,k=1-Math.exp(-11*dt),limbK=1-Math.exp(-15*dt),move=Math.min(1,Math.abs(forward)),dir=forward<0?-1:1;
    u.firePose=Math.max(0,(u.firePose||0)-dt);u.meleePose=Math.max(0,(u.meleePose||0)-dt);u.grenadeThrow=Math.max(0,(u.grenadeThrow||0)-dt);
    u.pistolAimTime=Math.max(0,(u.pistolAimTime||0)-dt);u.pistolShotAge=Math.min(10,(u.pistolShotAge??10)+dt);
    if(grenadeEquipped&&u.grenadeThrow<=0)u.grenadeReleased=false;u.breath=(u.breath||0)+dt*1.7;
    u.ph+=dt*(swimming?(move?4.2:2.1):8.4*move);const ph=u.ph,breath=Math.sin(u.breath);

    const tx=(joint,target,rate=limbK)=>joint.rotation.x+=(target-joint.rotation.x)*rate;
    const tz=(joint,target,rate=limbK)=>joint.rotation.z+=(target-joint.rotation.z)*rate;

    if(swimming&&!inVehicle){
      const stroke=Math.sin(ph),recover=(1-Math.cos(ph))*.5;
      u.gun.visible=false;u.knife.visible=false;u.bazooka.visible=false;u.grenade.visible=false;u.sniper.visible=false;
      player.rotation.x+=(-.1-player.rotation.x)*k;player.rotation.z+=(stroke*.035-player.rotation.z)*k;
      tx(u.al,1.15+.18*stroke);tx(u.ar,1.15-.18*stroke);
      tz(u.al,-.42-.38*stroke);tz(u.ar,.42+.38*stroke);
      tx(u.ael,.72+.45*recover);tx(u.aer,.72+.45*(1-recover));
      const kick=.22*Math.sin(ph*2);tx(u.ll,.18+kick);tx(u.lr,.18-kick);tx(u.lkl,-(.48-.18*kick));tx(u.lkr,-(.48+.18*kick));
      player.position.y+=Math.sin(ph*2)*.035;
      return
    }

    player.rotation.x+=(0-player.rotation.x)*k;
    const walk=Math.sin(ph)*move*dir,walk2=Math.cos(ph)*move;
    const hip=.62*walk,kneeL=-(.08+Math.max(0,-Math.sin(ph)*dir)*.92*move),kneeR=-(.08+Math.max(0,Math.sin(ph)*dir)*.92*move);
    tx(u.ll,hip);tx(u.lr,-hip);tx(u.lkl,kneeL);tx(u.lkr,kneeR);
    tz(u.ll,-.025*walk2);tz(u.lr,.025*walk2);
    player.rotation.z+=(-.035*walk-player.rotation.z)*k;

    const aiming=u.firePose>0&&!inVehicle,melee=u.meleePose>0&&!inVehicle,bazooka=!!bazookaEquipped&&!inVehicle,
          grenade=!!grenadeEquipped&&!inVehicle,sniper=!!sniperEquipped&&!inVehicle,throwing=u.grenadeThrow>0&&!inVehicle;
    u.bazooka.visible=bazooka;u.sniper.visible=sniper;u.grenade.visible=(grenade||throwing)&&!u.grenadeReleased;
    u.gun.visible=!bazooka&&!sniper&&!grenade&&!melee&&(ammo>0||aiming);
    // Deixem acabar el retrocés de l'última bala: mai es veuen
    // pistola i ganivet superposats durant la transició.
    const knifeReady=!inVehicle&&ammo<=0&&!aiming&&u.pistolAimTime<=0;
    u.knife.visible=!bazooka&&!sniper&&!grenade&&(melee||knifeReady);

    if(grenade||throwing){
      // La càrrega i el llançament comparteixen la mateixa pose inicial.
      const chargePose=grenadeChargeArmPose(throwing?u.grenadeThrowPower:grenadeChargePower);
      const p=throwing?1-Math.max(0,Math.min(1,u.grenadeThrow/.55)):0;
      if(throwing&&p<.42){
        const q=p/.42;
        tx(u.ar,chargePose.shoulderX-.08*q);
        tz(u.ar,chargePose.shoulderZ+.06*q);
        tx(u.aer,chargePose.elbowX);
        tz(u.aer,chargePose.elbowZ);
      }else if(throwing){
        // Impuls cap endavant i amunt des de l'angle carregat real.
        const q=Math.min(1,(p-.42)/.58);
        tx(u.ar,chargePose.shoulderX-.08+(1.42-(chargePose.shoulderX-.08))*q);
        tz(u.ar,chargePose.shoulderZ+.06+(-.18-(chargePose.shoulderZ+.06))*q);
        tx(u.aer,chargePose.elbowX+(.27-chargePose.elbowX)*q);
        tz(u.aer,chargePose.elbowZ+(.04-chargePose.elbowZ)*q);
      }else{
        tx(u.ar,chargePose.shoulderX);tz(u.ar,chargePose.shoulderZ);
        tx(u.aer,chargePose.elbowX);tz(u.aer,chargePose.elbowZ);
      }
      tx(u.al,-.08);tz(u.al,-.12);tx(u.ael,.18);tz(u.ael,-.04);
    }else if(bazooka){
      tx(u.ar,1.2);tz(u.ar,-.18);tx(u.aer,.72);
      tx(u.al,1.02);tz(u.al,.3);tx(u.ael,.88);
    }else if(sniper){
      tx(u.ar,1.12);tz(u.ar,-.25);tx(u.aer,.72);
      tx(u.al,1.06);tz(u.al,.3);tx(u.ael,.7);
    }else if(u.knife.visible){
      // Postura 4B en repòs i moviment. En atacar, trajectòria 3B:
      // preparació lateral, estocada, canell +90° i retorn a guàrdia.
      const p=melee?Math.max(0,Math.min(1,1-u.meleePose/u.knifeAttackDuration)):0,
            target=knifeAttack3BTargets(p),
            armRate=1-Math.exp(-(melee?38:16)*dt);
      tx(u.ar,target.shoulderX+.035*walk,armRate);
      tz(u.ar,target.shoulderZ+.025*walk,armRate);
      tx(u.aer,target.elbowX,armRate);
      tz(u.aer,target.elbowZ,armRate);
      u.knife.rotation.x+=(target.bladeX-u.knife.rotation.x)*armRate;
      // El gir ja porta easing temporal: aplicació exacta per arribar als 90° a l'impacte.
      u.knife.rotation.y=target.bladeY;
      u.knife.rotation.z+=(target.bladeZ-u.knife.rotation.z)*armRate;
      // L'esquerra acompanya la punyalada amb un contrapès moderat.
      tx(u.al,-.40*walk+.018*breath+target.leftShoulderX,armRate);
      tz(u.al,-.12+target.leftShoulderZ,armRate);
      tx(u.ael,.16+.1*move+target.leftElbowX,armRate);
      tz(u.ael,-.04,armRate);
    }else if(aiming&&!u.pistolAimTime){
      // La pose antiga queda reservada al dispar d'altres armes.
      tx(u.ar,1.18);tz(u.ar,-.08);tx(u.aer,.7);
      tx(u.al,1.05);tz(u.al,-.28);tx(u.ael,.82);
    }else{
      const armSwing=.46*walk;
      tx(u.al,-armSwing+.018*breath);tx(u.ar,armSwing-.018*breath);
      tz(u.al,-.12);tz(u.ar,.12);tz(u.ael,-.04);tz(u.aer,.04);
      tz(u.al,-.025);tz(u.ar,.025);
      const bendL=.16+Math.max(0,Math.cos(ph))*.2*move,bendR=.16+Math.max(0,-Math.cos(ph))*.2*move;
      tx(u.ael,bendL);tx(u.aer,bendR);
    }

    // L'animació es llança només amb un tret real de pistola (combat.js).
    // Retrocés mitjà: aprox. 10 cm de reculament local i 5.4 graus de pujada.
    const pistolAllowed=!inVehicle&&!grenade&&!throwing&&!bazooka&&!sniper&&!melee;
    const targetBlend=pistolAllowed&&u.pistolAimTime>0?1:0;
    u.pistolBlend+=(targetBlend-u.pistolBlend)*(1-Math.exp(-18*dt));
    const blend=pistolAllowed?u.pistolBlend:0,rig=u.pistolRig;
    const age=u.pistolShotAge;
    const kick=targetBlend&&(age<.55)?(age<.065?
      1-Math.pow(Math.max(0,1-age/.065),3):Math.exp(-(age-.065)*13)):0;
    const back=kick*.10,up=kick*.03;
    // La pose normal continua marcant l'animació de caminar i dels altres objectes.
    // El rig de pistola hi superposa una presa a dues mans només durant el tir.
    u.ar.rotation.y=0;u.al.rotation.y=0;u.aer.rotation.y=0;u.ael.rotation.y=0;
    if(blend>.001){
      rig.right.set(.12,2.95+up,-1.07+back);
      rig.left.set(-.075,2.96+up,-1.115+back);
      aimPlayerPistolArm(u.ar,u.aer,rig.right,1,rig,blend);
      aimPlayerPistolArm(u.al,u.ael,rig.left,-1,rig,blend);
    }
    // Retorn de l'arma a la mà dreta sense un salt visual en deixar de disparar.
    rig.idle.copy(u.pistolIdleMount.position).applyQuaternion(u.aer.quaternion)
      .add(u.aer.position).applyQuaternion(u.ar.quaternion).add(u.ar.position);
    rig.idleQ.copy(u.ar.quaternion).multiply(u.aer.quaternion).multiply(u.pistolIdleMount.quaternion);
    rig.aim.set(.045,3.10+up,-1.13+back);
    rig.aimQ.setFromAxisAngle(rig.axisX,.045+kick*.095);
    u.gun.position.copy(rig.idle).lerp(rig.aim,blend);
    u.gun.quaternion.copy(rig.idleQ).slerp(rig.aimQ,blend);
    u.pistolSlide.position.z=kick*.065;
    u.pistolFlash.visible=targetBlend>0&&u.pistolShotAge<.055;
    if(move>.02)player.position.y+=Math.abs(Math.sin(ph))*0.085*move;
    else player.position.y+=breath*.012;
  }
});



