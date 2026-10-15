// Patrulles navals: física, IA, armes i tripulació separades de la navegació terrestre.
const MARINE_PATROL_MIN=5,MARINE_PATROL_MAX=10;
const marineAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
function createMarinePatrolVisual(boat){
  // Mateix buc i cabina oberta que la llanxa pilotable.
  const metal=0x313c3d,paint=0x596b57;
  for(const side of [-1,1]){
    const soldier=window.HUNTER_CHARACTERS.createCommando(THREE);
    soldier.scale.setScalar(.43);soldier.position.set(side*.55,1.18,side<0?.9:1.75);
    soldier.rotation.y=side*.18;
    soldier.userData.ar.rotation.x=-.55;soldier.userData.al.rotation.x=-.72;
    boat.add(soldier);
  }
  const barrel=(root,r,length,y,z,color)=>{
    const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,8),M(color,'metal'));
    o.rotation.x=Math.PI/2;o.position.set(0,y,z);root.add(o);return o;
  };
  const createMount=(x,rocket)=>{
    const mount=new THREE.Group();
    mount.position.set(x,2.08,rocket?.1:-.4);boat.add(mount);
    bx(mount,.65,.27,.65,metal,0,0,0,'metal');
    bx(mount,rocket?.78:.4,rocket?.45:.32,.75,paint,0,.28,-.43,'paint');
    if(rocket){
      for(const off of [-.18,.18])barrel(mount,.145,1.45,.29,-1.21,metal).position.x=off;
    }else barrel(mount,.115,1.65,.29,-1.25,metal);
    const muzzle=new THREE.Object3D();
    muzzle.position.set(0,.29,rocket?-1.95:-2.075);mount.add(muzzle);
    return {mount,muzzle};
  };
  const machineGun=createMount(-.8,false),rockets=createMount(.8,true);
  boat.userData.marineWeapons={machineGun,rockets};
}
function marineSeaClear(x,z,r=10){
  return Math.abs(x)<H-28&&Math.abs(z)<H-28&&
    hAt(x,z)<-3.3&&hAt(x+r*.65,z)<-2.7&&hAt(x-r*.65,z)<-2.7&&
    hAt(x,z+r*.65)<-2.7&&hAt(x,z-r*.65)<-2.7;
}
function marineTrafficClear(u,x,z,margin=23){
  for(const v of vehicleCandidatesAt(x,z,margin+22)){
    if(v===u||v.destroyed)continue;
    const r=vehicleRadius(vehicleHitType(v.t));
    if(Math.hypot(v.x-x,v.z-z)<margin+r*.55)return false;
  }
  return true;
}
function marinePickWaypoint(u){
  // Patrulla d'una badia a una altra; mai no triem rumbs terrestres.
  for(let i=0;i<28;i++){
    const a=R()*Math.PI*2,d=130+R()*390,
          x=u.home.x+Math.cos(a)*d,z=u.home.z+Math.sin(a)*d;
    if(marineSeaClear(x,z,12)){u.tx=x;u.tz=z;u.wt=12+R()*12;return}
  }
  u.tx=u.home.x;u.tz=u.home.z;u.wt=8;
}
function spawnMarinePatrols(){
  const count=MARINE_PATROL_MIN+Math.floor(R()*(MARINE_PATROL_MAX-MARINE_PATROL_MIN+1));
  const starts=islands.slice().sort(()=>R()-.5);
  let made=0;
  const place=(x,z,hd)=>{
    if(!marineSeaClear(x,z,13)||
       E.some(e=>e.t==='patrulla_marina'&&Math.hypot(e.x-x,e.z-z)<130)||
       V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(v.t)+20))return false;
    const u=mkEn('patrulla_marina',x,z);
    u.hd=hd;u.navHd=hd;u.home={x,z};u.speed=12+R()*5;
    u.orbitSign=R()<.5?-1:1;u.mgCd=.8+R();u.rocketCd=3+R()*3;
    u.o.position.set(x,wy(x,z,0)+.2,z);u.o.rotation.y=hd;
    marinePickWaypoint(u);made++;return true;
  };
  // Aproximació per la costa, però prou mar endins per maniobrar.
  for(let pass=0;pass<5&&made<count;pass++)for(const island of starts){
    if(made>=count)break;
    for(let attempt=0;attempt<24;attempt++){
      const a=R()*Math.PI*2,dist=island.r*(1.05+R()*.65)+30,
            x=island.x+Math.cos(a)*dist,z=island.z+Math.sin(a)*dist;
      if(place(x,z,a+Math.PI/2))break;
    }
  }
  // Garantia de densitat en mapes amb costes difícils.
  for(let attempts=0;made<count&&attempts<3500;attempts++){
    const x=(R()*2-1)*(H-65),z=(R()*2-1)*(H-65);
    if(place(x,z,R()*Math.PI*2))continue;
  }
  world.userData.marinePatrols={target:count,spawned:made};
}
function marineAimGun(u,weapon,target,dt){
  const root=u.o,mount=weapon.mount;
  root.updateWorldMatrix(true,true);
  const origin=weapon.muzzle.getWorldPosition(new THREE.Vector3());
  const worldDir=new THREE.Vector3(target.x-origin.x,target.y-origin.y,target.z-origin.z);
  const local=worldDir.clone().applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()).invert());
  const wanted=Math.atan2(-local.x,-local.z),
        diff=marineAngle(wanted-mount.rotation.y);
  mount.rotation.y+=Math.max(-1.9*dt,Math.min(1.9*dt,diff));
  root.updateWorldMatrix(true,true);
  return Math.abs(marineAngle(wanted-mount.rotation.y))<.16;
}
function marineFire(u,weapon,target,heavy){
  const p=weapon.muzzle.getWorldPosition(new THREE.Vector3()),
        dy=target.y-p.y,
        dx=target.x-p.x+rn(-1.7,1.7),dz=target.z-p.z+rn(-1.7,1.7),
        n=Math.max(.01,Math.hypot(dx,dy,dz));
  if(!weaponAimClear(p.x,p.y,p.z,target.x,target.y,target.z))return false;
  // Les costes i els turons també intercepten el foc disparat des del mar.
  for(let i=1;i<8;i++){
    const k=i/8,x=p.x+(target.x-p.x)*k,z=p.z+(target.z-p.z)*k,
          y=p.y+(target.y-p.y)*k;
    if(hAt(x,z)>y-.35)return false;
  }
  shoot(p.x,p.y,p.z,dx/n,dy/n,dz/n,heavy?75:125,
    heavy?38:6,heavy?8:0,'e',heavy?mS:mW,heavy?2:SMALL_ARMS_SCALE);
  return true;
}
function updateMarinePatrol(u,dt){
  const q=cv||P,targetY=cv?cv.o.position.y+(VT[cv.t]?.m==='a'?2:1.6):P.y+1.45,
        distance=Math.hypot(q.x-u.x,q.z-u.z);
  // Lluny de la càmera n'hi ha prou amb 10 actualitzacions/s.
  u.marineAcc=(u.marineAcc||0)+dt;
  if(distance>700&&u.marineAcc<.1)return;
  dt=Math.min(.12,u.marineAcc);u.marineAcc=0;
  // El test de visió només es recalcula cada 0,25 s: evita escanejar
  // centenars de punts costaners a cada fotograma.
  u.marineSightT=(u.marineSightT||0)-dt;
  if(u.marineSightT<=0){
    u.marineSightT=.25;
    u.marineVisible=distance<470&&sight(u.x,u.z,q.x,q.z,u.o.position.y+3);
  }
  const hostile=!disg&&!over&&distance<470&&!!u.marineVisible;
  u.wt-=dt;u.mgCd-=dt;u.rocketCd-=dt;
  if(!Number.isFinite(u.tx)||u.wt<=0||Math.hypot(u.tx-u.x,u.tz-u.z)<35)marinePickWaypoint(u);
  let goalX=u.tx,goalZ=u.tz;
  if(hostile){
    if(distance>165){goalX=q.x;goalZ=q.z}
    else{
      // Aproximació tangencial, mantenint distància per poder disparar.
      const radialX=(u.x-q.x)/Math.max(1,distance),
            radialZ=(u.z-q.z)/Math.max(1,distance);
      goalX=q.x+radialX*135-radialZ*u.orbitSign*150;
      goalZ=q.z+radialZ*135+radialX*u.orbitSign*150;
    }
  }
  const wanted=Math.atan2(u.x-goalX,u.z-goalZ);
  let best=wanted,bestScore=Infinity,open=false;
  // Estudiem un ventall de rumbs sense girar instantàniament la llanxa.
  for(const offset of [0,.27,-.27,.55,-.55,.9,-.9,1.35,-1.35,Math.PI]){
    const hd=marineAngle(wanted+offset),fx=-Math.sin(hd),fz=-Math.cos(hd);
    const safe=marineSeaClear(u.x+fx*36,u.z+fz*36,11)&&
      marineSeaClear(u.x+fx*69,u.z+fz*69,11)&&
      marineTrafficClear(u,u.x+fx*34,u.z+fz*34,17);
    if(!safe)continue;
    const score=Math.abs(marineAngle(hd-wanted))*.8+
      Math.abs(marineAngle(hd-u.hd))*.55;
    if(score<bestScore){bestScore=score;best=hd;open=true}
  }
  if(!open){
    // Costa al davant: primer reduir marxa i descriure una corba ampla.
    best=marineAngle(u.hd+u.orbitSign*1.25);
    if(u.wt>2)u.wt=2;
  }
  const steer=marineAngle(best-u.hd),
        maxYaw=u.speed>12?.27:.39,
        desiredYaw=Math.max(-maxYaw,Math.min(maxYaw,steer*1.1));
  u.yawRate+=(desiredYaw-(u.yawRate||0))*(1-Math.exp(-2.3*dt));
  u.hd=marineAngle(u.hd+u.yawRate*dt);
  const bowX=-Math.sin(u.hd),bowZ=-Math.cos(u.hd),
        nextSpeed=open?(Math.abs(steer)>.75?9:hostile?20:17):2.5;
  u.speed+=(nextSpeed-u.speed)*(1-Math.exp(-1.15*dt));
  const nx=u.x+bowX*u.speed*dt,nz=u.z+bowZ*u.speed*dt;
  if(marineSeaClear(nx,nz,10)&&marineTrafficClear(u,nx,nz,16)){
    const ox=u.x,oz=u.z;u.x=nx;u.z=nz;enemyReindex(u,ox,oz);
  }else{
    u.speed=Math.max(0,u.speed-13*dt);
    u.wt=Math.min(u.wt,.5);
  }
  u.o.position.set(u.x,wy(u.x,u.z,elapsed)+.2,u.z);
  const wave=Math.sin(elapsed*2+u.x*.03+u.z*.024);
  u.o.rotation.set(wave*.028,u.hd,-u.yawRate*.12+wave*.024,'YXZ');
  const weapons=u.o.userData.marineWeapons;
  if(!hostile||distance>245)return;
  const target=new THREE.Vector3(q.x,targetY,q.z);
  const gunAligned=marineAimGun(u,weapons.machineGun,target,dt);
  const rocketAligned=marineAimGun(u,weapons.rockets,target,dt);
  if(distance<170&&gunAligned&&u.mgCd<=0&&marineFire(u,weapons.machineGun,target,false))u.mgCd=.28+rn(0,.15);
  if(distance<245&&rocketAligned&&u.rocketCd<=0&&marineFire(u,weapons.rockets,target,true))u.rocketCd=4.4+rn(0,1.8);
}
