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
    const P=palette.player,player=new THREE.Group(),mats=[],J=(w,h,d,c,x,y,z,g,swap)=>{const m=box(g,w,h,d,c,x,y,z);if(swap)mats.push([m.material,c,swap]);return m},u=player.userData;u.ph=0;u.firePose=0;
    const leg=x=>{const g=new THREE.Group();g.position.set(x,1.9,0);player.add(g);J(.46,1.9,.56,P.primary,0,-.95,0,g,window.HUNTER_PALETTE.enemy.primary);box(g,.54,.22,.58,P.dark,0,-1.15,0);box(g,.56,.4,.76,0x171a18,0,-1.75,-.1);return g};
    u.ll=leg(-.31);u.lr=leg(.31);
    J(1.32,1.7,.78,P.secondary,0,2.8,0,player,window.HUNTER_PALETTE.enemy.general);box(player,1.42,.28,.86,P.dark,0,1.98,0);
    box(player,.96,1.38,.46,P.webbing,0,2.9,.59);box(player,.22,1.28,.1,P.dark,-.34,2.9,.43);box(player,.22,1.28,.1,P.dark,.34,2.9,.43);
    box(player,.4,.46,.1,P.dark,-.36,3.2,-.44);
    const arm=x=>{const g=new THREE.Group();g.position.set(x,3.5,0);player.add(g);J(.36,1.5,.42,P.secondary,0,-.7,0,g,window.HUNTER_PALETTE.enemy.general);box(g,.36,.18,.46,P.dark,0,-.22,0);box(g,.32,.45,.36,P.skin,0,-1.55,0);return g};u.al=arm(-.78);u.ar=arm(.78);
    box(player,.78,.95,.78,P.skin,0,4.1,0);box(player,.7,.2,.08,P.dark,0,4.15,-.41);
    J(.94,.5,.94,P.primary,0,4.6,0,player,window.HUNTER_PALETTE.enemy.secondary);box(player,1,.1,.78,P.dark,0,4.43,-.06);
    const gun=new THREE.Group();gun.position.set(0,-1.5,-.1);gun.rotation.x=-Math.PI/2;u.ar.add(gun);
    box(gun,.2,.25,1.8,P.metal,0,0,-.2);box(gun,.2,.5,.25,P.dark,0,-.3,.1);box(gun,.22,.3,.6,0x6b4a2a,0,0,.9);u.gun=gun;u.mats=mats;player.scale.setScalar(2/3);
    return player;
  },
  animatePlayer(player,{forward,dt,swimming,inVehicle,ammo}){
    const u=player.userData,k=1-Math.exp(-14*dt);u.firePose=Math.max(0,(u.firePose||0)-dt);u.ph+=dt*(swimming?(forward?4:2.2):10*Math.abs(forward));const ph=u.ph;
    if(swimming&&!inVehicle){const sweep=(1-Math.cos(ph))*.5;u.gun.visible=false;player.rotation.x+=(-.12-player.rotation.x)*k;u.ar.rotation.x+=(1.53-u.ar.rotation.x)*k;u.al.rotation.x+=(1.53-u.al.rotation.x)*k;u.ar.rotation.z+=((.12+sweep*1.1)-u.ar.rotation.z)*k;u.al.rotation.z+=((-.12-sweep*1.1)-u.al.rotation.z)*k;u.ll.rotation.x+=(.3+Math.sin(ph+.8)*.2-u.ll.rotation.x)*k;u.lr.rotation.x+=(.3+Math.sin(ph+.8)*.2-u.lr.rotation.x)*k;u.ll.rotation.z=-sweep*.25;u.lr.rotation.z=sweep*.25;return}
    player.rotation.x+=(0-player.rotation.x)*k;u.ll.rotation.z*=1-k;u.lr.rotation.z*=1-k;const s=forward?Math.sin(ph)*.7:0,aiming=u.firePose>0&&!inVehicle;u.ll.rotation.x=s;u.lr.rotation.x=-s;u.gun.visible=ammo>0||aiming;u.ar.rotation.x+=((aiming?1.48:-s*.35)-u.ar.rotation.x)*k;u.al.rotation.x+=((aiming?1.3:s*.35)-u.al.rotation.x)*k;u.ar.rotation.z*=1-k;u.al.rotation.z+=((aiming?-.3:0)-u.al.rotation.z)*k;player.position.y+=Math.abs(Math.sin(ph))*.12*Math.abs(forward)
  }
});
