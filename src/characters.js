// Model i animació visual del jugador. No conté moviment, inventari ni combat.
window.HUNTER_CHARACTERS=Object.freeze({
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
    u.ph=0;u.breath=0;u.firePose=0;u.meleePose=0;

    const gun=new THREE.Group();gun.position.set(0,-.72,-.1);gun.rotation.x=-Math.PI/2;u.aer.add(gun);
    box(gun,.2,.25,1.8,P.metal,0,0,-.2);box(gun,.2,.5,.25,P.dark,0,-.3,.1);box(gun,.22,.3,.6,0x6b4a2a,0,0,.9);u.gun=gun;
    const knife=new THREE.Group();knife.position.set(0,-.72,-.08);knife.rotation.x=-Math.PI/2;u.aer.add(knife);box(knife,.09,.08,.75,0xc7ced0,0,0,-.28);box(knife,.18,.16,.28,0x4b3626,0,0,.25);knife.visible=false;u.knife=knife;
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
    player.scale.setScalar(2/3);
    return player;
  },
  animatePlayer(player,{forward,dt,swimming,inVehicle,ammo,bazookaEquipped=false,grenadeEquipped=false}){
    const u=player.userData,k=1-Math.exp(-11*dt),limbK=1-Math.exp(-15*dt),move=Math.min(1,Math.abs(forward)),dir=forward<0?-1:1;
    u.firePose=Math.max(0,(u.firePose||0)-dt);u.meleePose=Math.max(0,(u.meleePose||0)-dt);u.grenadeThrow=Math.max(0,(u.grenadeThrow||0)-dt);if(grenadeEquipped&&u.grenadeThrow<=0)u.grenadeReleased=false;u.breath=(u.breath||0)+dt*1.7;
    u.ph+=dt*(swimming?(move?4.2:2.1):8.4*move);const ph=u.ph,breath=Math.sin(u.breath);

    const tx=(joint,target,rate=limbK)=>joint.rotation.x+=(target-joint.rotation.x)*rate;
    const tz=(joint,target,rate=limbK)=>joint.rotation.z+=(target-joint.rotation.z)*rate;

    if(swimming&&!inVehicle){
      const stroke=Math.sin(ph),recover=(1-Math.cos(ph))*.5;
      u.gun.visible=false;u.knife.visible=false;u.bazooka.visible=false;u.grenade.visible=false;
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
          grenade=!!grenadeEquipped&&!inVehicle,throwing=u.grenadeThrow>0&&!inVehicle;
    u.bazooka.visible=bazooka;u.grenade.visible=(grenade||throwing)&&!u.grenadeReleased;u.gun.visible=!bazooka&&!grenade&&!melee&&(ammo>0||aiming);u.knife.visible=!bazooka&&!grenade&&melee;

    if(grenade||throwing){
      const p=throwing?1-Math.max(0,Math.min(1,u.grenadeThrow/.55)):0;
      if(throwing&&p<.42){
        // Càrrega lateral natural (opció 2): el braç surt cap al costat, no cap enrere.
        const q=p/.42;tx(u.ar,-.08-.08*q);tz(u.ar,1.18+.06*q);tx(u.aer,.72);tz(u.aer,.12);
      }else if(throwing){
        // Llançament: des de la posició lateral cap endavant i amunt.
        const q=Math.min(1,(p-.42)/.58);tx(u.ar,-.16+1.58*q);tz(u.ar,1.24-1.42*q);tx(u.aer,.72-.45*q);tz(u.aer,.12-.08*q);
      }else{
        tx(u.ar,-.08);tz(u.ar,1.18);tx(u.aer,.72);tz(u.aer,.12)
      }
      tx(u.al,-.08);tz(u.al,-.12);tx(u.ael,.18);tz(u.ael,-.04);
    }else if(bazooka){
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
      tz(u.al,-.12);tz(u.ar,.12);tz(u.ael,-.04);tz(u.aer,.04);
      tz(u.al,-.025);tz(u.ar,.025);
      const bendL=.16+Math.max(0,Math.cos(ph))*.2*move,bendR=.16+Math.max(0,-Math.cos(ph))*.2*move;
      tx(u.ael,bendL);tx(u.aer,bendR);
    }

    if(move>.02)player.position.y+=Math.abs(Math.sin(ph))*0.085*move;
    else player.position.y+=breath*.012;
  }
});



