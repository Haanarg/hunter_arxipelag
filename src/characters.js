// Model i animació visual del jugador. No conté moviment, inventari ni combat.
window.HUNTER_CHARACTERS=Object.freeze({
  createSoldier(THREE,{box,material,general=false}){
    const round=(g,r,h,c,x,y,z)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),material(c));m.position.set(x,y,z);g.add(m);return m};
const g=new THREE.Group(),cloth=general?0xff303c:0xe82432,vest=0xac1426;g.userData.legs=[];g.userData.arms=[];
for(const x of[-.34,.34]){const p=new THREE.Group();p.position.set(x,1.45,0);g.add(p);box(p,.5,1.2,.55,cloth,0,-.6,0);box(p,.55,.35,.85,0x242727,0,-1.28,-.13);g.userData.legs.push(p)}
box(g,1.18,1.25,.68,cloth,0,2.02,0);box(g,1.25,.9,.82,vest,0,2.08,0);box(g,.86,1,.38,0xb92232,0,2.12,.53);for(const x of[-.4,0,.4])box(g,.28,.4,.19,0xf35043,x,1.98,-.5);box(g,.72,.7,.7,0xc89a74,0,2.99,0);box(g,.68,.13,.08,0x30373b,0,3.07,-.39);
if(general){round(g,.52,.22,0xc51c2d,0,3.43,0);box(g,.85,.08,.65,0x343230,0,3.34,-.18);box(g,.18,.18,.04,0xe6c666,0,3.44,-.5);for(const x of[-.65,.65])box(g,.25,.1,.48,0xc9ab60,x,2.6,0)}else{const h=new THREE.Mesh(new THREE.SphereGeometry(.51,8,4,0,Math.PI*2,0,Math.PI/2),material(cloth));h.position.y=3.2;h.scale.z=1.12;g.add(h);round(g,.52,.15,cloth,0,3.2,0)}
for(const x of[-.78,.78]){const p=new THREE.Group();p.position.set(x,2.55,0);g.add(p);box(p,.36,.95,.4,cloth,0,-.46,0);box(p,.32,.3,.33,0xc89a74,0,-1.02,0);g.userData.arms.push(p)}
const gun=new THREE.Group();gun.position.set(0,-1,-.05);gun.rotation.x=-Math.PI/2;g.userData.arms[1].add(gun);box(gun,.16,.2,1.5,0x292e30,0,0,-.25);box(gun,.18,.36,.25,0x24282b,0,-.24,0);box(gun,.18,.2,.45,0x66513c,0,0,.55);return g
  },
  createPlayer(THREE,{box}){
    const player=new THREE.Group(),mats=[],J=(w,h,d,c,x,y,z,g,swap)=>{const m=box(g,w,h,d,c,x,y,z);if(swap)mats.push([m.material,c,swap]);return m},u=player.userData;u.ph=0;u.firePose=0;
    const leg=x=>{const g=new THREE.Group();g.position.set(x,1.9,0);player.add(g);J(.6,1.9,.7,0x32c52a,0,-.95,0,g,0xe82932);box(g,.7,.4,.95,0x1c1c1c,0,-1.75,-.12);return g};
    u.ll=leg(-.4);u.lr=leg(.4);
    J(1.7,1.7,.95,0x49e52c,0,2.8,0,player,0xf02c38);box(player,1.8,.28,1.05,0x2a2a2a,0,1.98,0);box(player,1.1,1.3,.5,0x6a5632,0,2.9,.72);box(player,.5,.5,.12,0x2a2a2a,-.45,3.2,-.52);
    const arm=x=>{const g=new THREE.Group();g.position.set(x,3.5,0);player.add(g);J(.5,1.5,.55,0x49e52c,0,-.7,0,g,0xf02c38);box(g,.45,.45,.5,0xf0c9a0,0,-1.55,0);return g};u.al=arm(-1.1);u.ar=arm(1.1);
    box(player,.95,.95,.95,0xf0c9a0,0,4.1,0);box(player,.85,.22,.1,0x151515,0,4.15,-.5);J(1.1,.5,1.1,0x22b72c,0,4.6,0,player,0xd91b2e);
    const gun=new THREE.Group();gun.position.set(0,-1.5,-.1);gun.rotation.x=-Math.PI/2;u.ar.add(gun);box(gun,.2,.25,1.8,0x222222,0,0,-.2);box(gun,.2,.5,.25,0x333333,0,-.3,.1);box(gun,.22,.3,.6,0x6b4a2a,0,0,.9);u.gun=gun;u.mats=mats;player.scale.setScalar(2/3);
    return player;
  },
  animatePlayer(player,{forward,dt,swimming,inVehicle,ammo}){
    const u=player.userData,k=1-Math.exp(-14*dt);u.firePose=Math.max(0,(u.firePose||0)-dt);u.ph+=dt*(swimming?(forward?4:2.2):10*Math.abs(forward));const ph=u.ph;
    if(swimming&&!inVehicle){const sweep=(1-Math.cos(ph))*.5;u.gun.visible=false;player.rotation.x+=(-.12-player.rotation.x)*k;u.ar.rotation.x+=(1.53-u.ar.rotation.x)*k;u.al.rotation.x+=(1.53-u.al.rotation.x)*k;u.ar.rotation.z+=((.12+sweep*1.1)-u.ar.rotation.z)*k;u.al.rotation.z+=((-.12-sweep*1.1)-u.al.rotation.z)*k;u.ll.rotation.x+=(.3+Math.sin(ph+.8)*.2-u.ll.rotation.x)*k;u.lr.rotation.x+=(.3+Math.sin(ph+.8)*.2-u.lr.rotation.x)*k;u.ll.rotation.z=-sweep*.25;u.lr.rotation.z=sweep*.25;return}
    player.rotation.x+=(0-player.rotation.x)*k;u.ll.rotation.z*=1-k;u.lr.rotation.z*=1-k;const s=forward?Math.sin(ph)*.7:0,aiming=u.firePose>0&&!inVehicle;u.ll.rotation.x=s;u.lr.rotation.x=-s;u.gun.visible=ammo>0||aiming;u.ar.rotation.x+=((aiming?1.48:-s*.35)-u.ar.rotation.x)*k;u.al.rotation.x+=((aiming?1.3:s*.35)-u.al.rotation.x)*k;u.ar.rotation.z*=1-k;u.al.rotation.z+=((aiming?-.3:0)-u.al.rotation.z)*k;player.position.y+=Math.abs(Math.sin(ph))*.12*Math.abs(forward)
  }
});
