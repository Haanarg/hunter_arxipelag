// Model i animació visual del jugador. No conté moviment, inventari ni combat.
window.HUNTER_CHARACTERS=Object.freeze({
  createSoldier(THREE,{box,material,general=false,palette=window.HUNTER_PALETTE}){
    const P=palette.enemy,round=(g,r,h,c,x,y,z)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),material(c));m.position.set(x,y,z);g.add(m);return m};
    const g=new THREE.Group(),cloth=general?P.general:P.primary,vest=general?P.secondary:P.vest;g.userData.legs=[];g.userData.arms=[];
    for(const x of[-.34,.34]){
      const p=new THREE.Group();p.position.set(x,1.45,0);g.add(p);
      box(p,.38,1.2,.46,cloth,0,-.6,0);box(p,.46,.24,.52,P.dark,0,-1.05,-.02);box(p,.48,.35,.72,P.dark,0,-1.28,-.11);g.userData.legs.push(p)
    }
    box(g,.98,1.25,.6,cloth,0,2.02,0);box(g,1.08,.92,.72,vest,0,2.08,0);
    box(g,.22,1.02,.1,P.dark,-.35,2.08,.41);box(g,.22,1.02,.1,P.dark,.35,2.08,.41);
    box(g,.76,.22,.78,P.dark,0,1.62,0);box(g,.74,1,.34,P.secondary,0,2.12,.46);
    for(const x of[-.4,0,.4])box(g,.28,.4,.19,general?P.gold:P.primary,x,1.98,-.5);
    box(g,.62,.72,.62,P.skin,0,2.99,0);box(g,.58,.12,.07,P.dark,0,3.07,-.34);
    if(general){
      round(g,.52,.22,P.secondary,0,3.43,0);box(g,.85,.08,.65,P.dark,0,3.34,-.18);box(g,.18,.18,.04,P.gold,0,3.44,-.5);
      for(const x of[-.65,.65]){box(g,.3,.12,.52,P.gold,x,2.6,0);box(g,.12,.5,.12,P.gold,x,2.36,.28)}
    }else{
      const h=new THREE.Mesh(new THREE.SphereGeometry(.46,8,5,0,Math.PI*2,0,Math.PI/2),material(cloth));h.position.y=3.2;h.scale.set(1,.98,1.08);g.add(h);
      round(g,.49,.11,P.dark,0,3.18,0)
    }
    for(const x of[-.62,.62]){
      const p=new THREE.Group();p.position.set(x,2.55,0);g.add(p);box(p,.28,.95,.34,cloth,0,-.46,0);box(p,.36,.18,.42,P.dark,0,-.16,0);box(p,.25,.3,.27,P.skin,0,-1.02,0);g.userData.arms.push(p)
    }
    const gun=new THREE.Group();gun.position.set(0,-1,-.05);gun.rotation.x=-Math.PI/2;g.userData.arms[1].add(gun);
    box(gun,.16,.2,1.5,P.metal,0,0,-.25);box(gun,.18,.36,.25,P.dark,0,-.24,0);box(gun,.18,.2,.45,0x66513c,0,0,.55);
    return g
  },
  createPlayer(THREE,{box,palette=window.HUNTER_PALETTE}){
    const P=palette.player,player=new THREE.Group(),mats=[],J=(w,h,d,c,x,y,z,g,swap)=>{const m=box(g,w,h,d,c,x,y,z);if(swap)mats.push([m.material,c,swap]);return m},u=player.userData;
    u.ph=0;u.breath=0;u.firePose=0;u.meleePose=0;

    const leg=x=>{
      const hip=new THREE.Group();hip.position.set(x,1.9,0);player.add(hip);
      J(.46,.92,.56,P.primary,0,-.44,0,hip,window.HUNTER_PALETTE.enemy.primary);
      box(hip,.5,.16,.58,P.dark,0,-.86,0);
      const knee=new THREE.Group();knee.position.set(0,-.88,0);hip.add(knee);
      J(.43,.86,.52,P.primary,0,-.4,0,knee,window.HUNTER_PALETTE.enemy.primary);
      box(knee,.48,.18,.54,P.dark,0,-.02,0);
      box(knee,.56,.36,.76,0x171a18,0,-.88,-.1);
      return {hip,knee}
    };
    const L=leg(-.31),R=leg(.31);u.ll=L.hip;u.lr=R.hip;u.lkl=L.knee;u.lkr=R.knee;

    J(1.32,1.7,.78,P.secondary,0,2.8,0,player,window.HUNTER_PALETTE.enemy.general);box(player,1.42,.28,.86,P.dark,0,1.98,0);
    box(player,.96,1.38,.46,P.webbing,0,2.9,.59);box(player,.22,1.28,.1,P.dark,-.34,2.9,.43);box(player,.22,1.28,.1,P.dark,.34,2.9,.43);
    box(player,.4,.46,.1,P.dark,-.36,3.2,-.44);

    const arm=x=>{
      const shoulder=new THREE.Group();shoulder.position.set(x,3.5,0);player.add(shoulder);
      J(.36,.76,.42,P.secondary,0,-.36,0,shoulder,window.HUNTER_PALETTE.enemy.general);
      box(shoulder,.38,.16,.45,P.dark,0,-.73,0);
      const elbow=new THREE.Group();elbow.position.set(0,-.72,0);shoulder.add(elbow);
      J(.33,.74,.36,P.secondary,0,-.34,0,elbow,window.HUNTER_PALETTE.enemy.general);
      box(elbow,.31,.18,.34,P.skin,0,-.73,0);
      return {shoulder,elbow}
    };
    const AL=arm(-.78),AR=arm(.78);u.al=AL.shoulder;u.ar=AR.shoulder;u.ael=AL.elbow;u.aer=AR.elbow;

    // Coll, cap superior retallat, cabell curt, gorra amb visera i ulleres de sol.
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.24,.27,.34,10),new THREE.MeshStandardMaterial({color:P.skin,roughness:.74}));
    neck.position.set(0,3.72,0);player.add(neck);
    const headMat=new THREE.MeshStandardMaterial({color:P.skin,roughness:.72}),
      headGeom=new THREE.SphereGeometry(.5,12,8,0,Math.PI*2,.28,Math.PI-.62),
      head=new THREE.Mesh(headGeom,headMat);
    head.scale.set(.8,1,.78);head.position.set(0,4.08,0);player.add(head);
    const hairMat=new THREE.MeshStandardMaterial({color:0x3a2b22,roughness:.92});
    // Cabell més orgànic: volum suau al clatell i laterals, una mica més llarg per darrere.
    const hairBack=new THREE.Mesh(new THREE.SphereGeometry(.36,12,7,0,Math.PI*2,.18,Math.PI*.78),hairMat);
    hairBack.scale.set(1,.95,.78);hairBack.position.set(0,4.14,.31);player.add(hairBack);
    for(const x of[-.31,.31]){
      const sideHair=new THREE.Mesh(new THREE.SphereGeometry(.18,10,6,0,Math.PI*2,.15,Math.PI*.72),hairMat);
      sideHair.scale.set(.72,1.05,.72);sideHair.position.set(x,4.21,.08);player.add(sideHair);
    }
    const nape=new THREE.Mesh(new THREE.SphereGeometry(.26,10,6,0,Math.PI*2,.2,Math.PI*.7),hairMat);
    nape.scale.set(.9,1.05,.7);nape.position.set(0,3.99,.28);player.add(nape);
    const hairTop=new THREE.Mesh(new THREE.SphereGeometry(.46,12,6,0,Math.PI*2,0,.78),hairMat);
    hairTop.scale.set(.9,.34,.88);hairTop.position.set(0,4.36,.02);player.add(hairTop);
    const glasses=new THREE.Group();glasses.position.set(0,4.16,-.37);player.add(glasses);
    box(glasses,.34,.16,.06,0x11161a,-.2,0,0);box(glasses,.34,.16,.06,0x11161a,.2,0,0);box(glasses,.12,.06,.06,P.dark,0,0,0);
    const cap=new THREE.Group();cap.position.set(0,4.43,0);player.add(cap);
    const capCrown=new THREE.Mesh(new THREE.SphereGeometry(.5,12,6,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:P.primary,roughness:.8}));
    capCrown.scale.set(.93,.46,.96);cap.add(capCrown);
    const visor=box(cap,.72,.08,.48,P.primary,0,-.01,-.38);visor.rotation.x=-.08;
    mats.push([capCrown.material,P.primary,window.HUNTER_PALETTE.enemy.secondary],[visor.material,P.primary,window.HUNTER_PALETTE.enemy.secondary]);

    const gun=new THREE.Group();gun.position.set(0,-.72,-.1);gun.rotation.x=-Math.PI/2;u.aer.add(gun);
    box(gun,.2,.25,1.8,P.metal,0,0,-.2);box(gun,.2,.5,.25,P.dark,0,-.3,.1);box(gun,.22,.3,.6,0x6b4a2a,0,0,.9);u.gun=gun;
    const knife=new THREE.Group();knife.position.set(0,-.72,-.08);knife.rotation.x=-Math.PI/2;u.aer.add(knife);box(knife,.09,.08,.75,0xc7ced0,0,0,-.28);box(knife,.18,.16,.28,0x4b3626,0,0,.25);knife.visible=false;u.knife=knife;

    const bazooka=new THREE.Group();bazooka.position.set(.62,3.48,-.5);player.add(bazooka);
    const bazMat=new THREE.MeshStandardMaterial({color:0x58664a,roughness:.78,metalness:.08}),bazDark=new THREE.MeshStandardMaterial({color:0x252b27,roughness:.68,metalness:.25}),bazMetal=new THREE.MeshStandardMaterial({color:0x707873,roughness:.5,metalness:.42});
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,2.9,10),bazMat);tube.rotation.x=Math.PI/2;tube.position.z=-.12;bazooka.add(tube);
    const rear=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.16,10),bazDark);rear.rotation.x=Math.PI/2;rear.position.z=1.34;bazooka.add(rear);
    const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(.3,.24,.24,10),bazDark);muzzle.rotation.x=Math.PI/2;muzzle.position.z=-1.52;bazooka.add(muzzle);
    box(bazooka,.18,.35,.38,0x252b27,0,-.3,.25);box(bazooka,.12,.18,.42,0x707873,-.12,.26,-.48);box(bazooka,.16,.12,.5,0x707873,.18,.22,.28);
    bazooka.rotation.x=-.08;bazooka.visible=false;u.bazooka=bazooka;
    u.mats=mats;player.scale.setScalar(2/3);
    return player;
  },
  animatePlayer(player,{forward,dt,swimming,inVehicle,ammo,bazookaEquipped=false}){
    const u=player.userData,k=1-Math.exp(-11*dt),limbK=1-Math.exp(-15*dt),move=Math.min(1,Math.abs(forward)),dir=forward<0?-1:1;
    u.firePose=Math.max(0,(u.firePose||0)-dt);u.meleePose=Math.max(0,(u.meleePose||0)-dt);u.breath=(u.breath||0)+dt*1.7;
    u.ph+=dt*(swimming?(move?4.2:2.1):8.4*move);const ph=u.ph,breath=Math.sin(u.breath);

    const tx=(joint,target,rate=limbK)=>joint.rotation.x+=(target-joint.rotation.x)*rate;
    const tz=(joint,target,rate=limbK)=>joint.rotation.z+=(target-joint.rotation.z)*rate;

    if(swimming&&!inVehicle){
      const stroke=Math.sin(ph),recover=(1-Math.cos(ph))*.5;
      u.gun.visible=false;u.knife.visible=false;u.bazooka.visible=false;
      player.rotation.x+=(-.1-player.rotation.x)*k;player.rotation.z+=(stroke*.035-player.rotation.z)*k;
      tx(u.al,1.15+.18*stroke);tx(u.ar,1.15-.18*stroke);
      tz(u.al,-.42-.38*stroke);tz(u.ar,.42+.38*stroke);
      tx(u.ael,.72+.45*recover);tx(u.aer,.72+.45*(1-recover));
      const kick=.22*Math.sin(ph*2);tx(u.ll,.18+kick);tx(u.lr,.18-kick);tx(u.lkl,.48-.18*kick);tx(u.lkr,.48+.18*kick);
      player.position.y+=Math.sin(ph*2)*.035;
      return
    }

    player.rotation.x+=(0-player.rotation.x)*k;
    const walk=Math.sin(ph)*move*dir,walk2=Math.cos(ph)*move;
    const hip=.62*walk,kneeL=-(.08+Math.max(0,-Math.sin(ph)*dir)*.92*move),kneeR=-(.08+Math.max(0,Math.sin(ph)*dir)*.92*move);
    tx(u.ll,hip);tx(u.lr,-hip);tx(u.lkl,kneeL);tx(u.lkr,kneeR);
    tz(u.ll,-.025*walk2);tz(u.lr,.025*walk2);
    player.rotation.z+=(-.035*walk-player.rotation.z)*k;

    const aiming=u.firePose>0&&!inVehicle,melee=u.meleePose>0&&!inVehicle,bazooka=!!bazookaEquipped&&!inVehicle;
    u.bazooka.visible=bazooka;u.gun.visible=!bazooka&&!melee&&(ammo>0||aiming);u.knife.visible=!bazooka&&melee;

    if(bazooka){
      tx(u.ar,1.2);tz(u.ar,-.18);tx(u.aer,.72);
      tx(u.al,1.02);tz(u.al,.3);tx(u.ael,.88);
    }else if(melee){
      tx(u.ar,.88);tz(u.ar,-.82);tx(u.aer,1.05);
      tx(u.al,-.08);tz(u.al,.08);tx(u.ael,.22);
    }else if(aiming){
      tx(u.ar,1.18);tz(u.ar,-.08);tx(u.aer,.7);
      tx(u.al,1.05);tz(u.al,-.28);tx(u.ael,.82);
    }else{
      const armSwing=.46*walk;
      tx(u.al,-armSwing+.018*breath);tx(u.ar,armSwing-.018*breath);
      tz(u.al,-.025);tz(u.ar,.025);
      const bendL=.16+Math.max(0,Math.cos(ph))*.2*move,bendR=.16+Math.max(0,-Math.cos(ph))*.2*move;
      tx(u.ael,bendL);tx(u.aer,bendR);
    }

    if(move>.02)player.position.y+=Math.abs(Math.sin(ph))*0.085*move;
    else player.position.y+=breath*.012;
  }
});
