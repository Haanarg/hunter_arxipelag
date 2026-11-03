// Patrulles navals: física, IA, armes i tripulació separades de la navegació terrestre.
const MARINE_PATROL_MIN=5,MARINE_PATROL_MAX=10;
const marineAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const MARINE_COURSE_OFFSETS=Object.freeze([0,.27,-.27,.55,-.55,.9,-.9,1.35,-1.35,Math.PI]);
// Una única tripulació per a les patrulleres i les llanxes requisades.
// Les armes són les dels comandos, sense metralladores ni tubs muntats al casc.
function attachEnemyBoatCrew(boat,{initiallyHidden=false}={}){
  if(boat.userData.enemyCarCrew)return boat.userData.enemyCarCrew;
  const crew=[];
  for(let seat=0;seat<2;seat++){
    const rider=window.HUNTER_CHARACTERS.createCommando(THREE);
    const rocket=seat===1,rig=rider.userData;
    rider.scale.setScalar(.43);
    rider.position.set(seat===0?-.58:.58,.89,seat===0?.88:1.14);
    rig.ll.rotation.x=-1.10;rig.lr.rotation.x=-1.10;
    rig.ar.rotation.x=1.12;rig.al.rotation.x=1.14;
    rig.aer.rotation.x=.18;rig.ael.rotation.x=.14;
    if(rocket)window.HUNTER_CHARACTERS.equipBazooka(THREE,rider,{box:bx});
    const weapon=rocket?rig.bazooka:rig.gun;
    const muzzle=new THREE.Object3D();
    // La boca real és filla de l'arma real i gira amb el comando.
    muzzle.position.set(0,0,rocket?-1.66:-.96);
    weapon.add(muzzle);
    rider.visible=!initiallyHidden;
    boat.add(rider);
    crew.push({rider,weapon,muzzle,rocket,seat,basePitch:weapon.rotation.x});
  }
  boat.userData.enemyCarCrew={
    driver:crew[0].rider,gunner:crew[1].rider,boatWeapons:crew,
    mount:null,pitch:null,muzzle:null
  };
  return boat.userData.enemyCarCrew;
}
// La bandera mira sempre cap a la popa (+Z). No es multiplica quan
// entren o surten soldats ni quan el món es reconstrueix al COOP.
function ensureEnemyVehicleFlag(mesh,type,visible=true){
  if(!mesh)return null;
  if(mesh.userData.enemyFlag){
    mesh.userData.enemyFlag.visible=!!visible;return mesh.userData.enemyFlag;
  }
  const sea=type==='llanxa'||type==='llanxa_coets'||type==='patrulla_marina',
    truck=type==='camio',armored=type==='tanc'||type==='tanqueta';
  const flag=new THREE.Group();
  flag.position.set(sea?1.07:truck?1.4:armored?1.15:1.06,
    sea?1.28:truck?2.52:armored?2.62:1.25,
    sea?3.36:truck?2.28:armored?1.8:1.72);
  const mat=new THREE.MeshStandardMaterial({color:0x121517,roughness:.77});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.028,.035,1.95,7),mat);
  pole.position.y=.975;flag.add(pole);
  const red=new THREE.MeshStandardMaterial({color:0xd91f2c,roughness:.88,side:THREE.DoubleSide});
  const cloth=new THREE.BufferGeometry();
  cloth.setAttribute('position',new THREE.Float32BufferAttribute([
    0,1.91,0, 0,1.87,1.04, 0,1.47,0,
    0,1.47,0, 0,1.87,1.04, 0,1.49,.89
  ],3));
  cloth.computeVertexNormals();
  flag.add(new THREE.Mesh(cloth,red));
  flag.visible=!!visible;mesh.add(flag);
  mesh.userData.enemyFlag=flag;
  return flag;
}
function createMarinePatrolVisual(boat){
  attachEnemyBoatCrew(boat);
  ensureEnemyVehicleFlag(boat,'patrulla_marina');
}
function aimEnemyBoatCrew(boat,seat,target,dt=.1){
  const w=boat?.userData?.enemyCarCrew?.boatWeapons?.[seat];
  if(!w?.rider.visible||!target)return false;
  boat.updateMatrixWorld(true);
  const position=boat.worldToLocal(new THREE.Vector3(target.x,target.y,target.z)),
    dx=position.x-w.rider.position.x,dz=position.z-w.rider.position.z,
    wanted=Math.atan2(-dx,-dz),
    delta=marineAngle(wanted-w.rider.rotation.y),
    limit=Math.max(.02,dt)*2.5;
  w.rider.rotation.y+=Math.max(-limit,Math.min(limit,delta));
  const height=w.rider.position.y+2.7*w.rider.scale.y,
    desired=Math.max(-.55,Math.min(.65,Math.atan2(position.y-height,Math.hypot(dx,dz)))),
    pitchDiff=desired-(w.weapon.rotation.x-w.basePitch);
  w.weapon.rotation.x+=Math.max(-1.5*dt,Math.min(1.5*dt,pitchDiff));
  return Math.abs(delta)<.23&&Math.abs(pitchDiff)<.23;
}
function enemyBoatCrewMuzzle(boat,seat){
  const w=boat?.userData?.enemyCarCrew?.boatWeapons?.[seat];
  if(!w?.rider.visible)return null;
  boat.updateMatrixWorld(true);
  return w.muzzle.getWorldPosition(new THREE.Vector3());
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
  u.marineCourse=null; // Un nou objectiu sempre invalida el rumb memoritzat.
  // Patrulla d'una badia a una altra; mai no triem rumbs terrestres.
  for(let i=0;i<28;i++){
    const a=R()*Math.PI*2,d=130+R()*390,
          x=u.home.x+Math.cos(a)*d,z=u.home.z+Math.sin(a)*d;
    if(marineSeaClear(x,z,12)){u.tx=x;u.tz=z;u.wt=12+R()*12;return}
  }
  u.tx=u.home.x;u.tz=u.home.z;u.wt=8;
}
function spawnMarinePatrols(){return drainBuildSteps(spawnMarinePatrolsSteps())}
function* spawnMarinePatrolsSteps(){
  // Llocs deterministes per llavor: el cercador calcula el mateix mapa
  // sense haver de construir geometries, tripulació ni IA.
  const count=(MARINE_PATROL_MIN+Math.floor(R()*(MARINE_PATROL_MAX-MARINE_PATROL_MIN+1)))*(MAP_SCALE===2?2:1);
  const starts=islands.slice().sort(()=>R()-.5),spots=[];
  const place=(x,z,hd)=>{
    if(!marineSeaClear(x,z,13)||
       spots.some(p=>Math.hypot(p.x-x,p.z-z)<130)||
       V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(v.t)+20))return false;
    spots.push({t:'patrulla_marina',x,z,hd});
    return true;
  };
  for(let pass=0;pass<5&&spots.length<count;pass++)for(const island of starts){
    if(spots.length>=count)break;
    for(let attempt=0;attempt<24;attempt++){
      if(attempt%8===0)yield {stage:'Emplaçant patrulles navals',completed:spots.length,total:count,unit:'patrulles'};
      const a=R()*Math.PI*2,dist=island.r*(1.05+R()*.65)+30,
            x=island.x+Math.cos(a)*dist,z=island.z+Math.sin(a)*dist;
      if(place(x,z,a+Math.PI/2))break;
    }
  }
  // Zones de mar obert: evita quedarnos sense patrulles en llavors
  // amb costes estretes. No acceptam ni aigua poc profunda ni solapaments.
  for(let attempt=0;spots.length<count&&attempt<3500;attempt++){
    if(attempt%16===0)yield {stage:'Mar obert per a les patrulles',completed:spots.length,total:count,unit:'patrulles'};
    const x=(R()*2-1)*(H-65),z=(R()*2-1)*(H-65);
    place(x,z,R()*Math.PI*2);
  }
  world.userData.marinePatrolPositions=spots;
  world.userData.marinePatrols={target:count,spawned:spots.length};
  if(seedSearchMode)return spots;
  for(const p of spots){
    yield {stage:'Construint patrulles navals',completed:null,total:spots.length};
    const u=mkEn('patrulla_marina',p.x,p.z);
    u.hd=p.hd;u.navHd=p.hd;u.home={x:p.x,z:p.z};u.speed=12+R()*5;
    u.yawRate=0;u.orbitSign=R()<.5?-1:1;
    u.mgCd=.8+R();u.rocketCd=3+R()*3;
    u.o.position.set(p.x,wy(p.x,p.z,0)+.2,p.z);u.o.rotation.y=p.hd;
    marinePickWaypoint(u);
  }
  return spots;
}
function marineFire(u,seat,target,heavy){
  const p=enemyBoatCrewMuzzle(u.o,seat);
  if(!p)return false;
  const aimX=target.x-p.x,aimY=target.y-p.y,aimZ=target.z-p.z,
    offset=window.HUNTER_ENEMY_ACCURACY.sample(
      DIF,heavy?'marineRocket':'marineMG',aimX,aimY,aimZ,rn),
    dx=aimX+offset.x,dy=aimY+offset.y,dz=aimZ+offset.z,
    n=Math.max(.01,Math.hypot(dx,dy,dz));
  if(!weaponAimClear(p.x,p.y,p.z,target.x,target.y,target.z))return false;
  for(let i=1;i<8;i++){
    const k=i/8,x=p.x+(target.x-p.x)*k,z=p.z+(target.z-p.z)*k,
      y=p.y+(target.y-p.y)*k;
    if(hAt(x,z)>y-.35)return false;
  }
  const speed=heavy?75:125;
  shoot(p.x,p.y,p.z,dx/n,dy/n,dz/n,speed,
    heavy?COMBAT_BALANCE.weapons.boatRocket:COMBAT_BALANCE.weapons.rifle,
    heavy?8:0,'e',heavy?mS:mW,heavy?2:SMALL_ARMS_SCALE,u);
  if(heavy)Pj[Pj.length-1].life=Math.max(2.2,n/(speed*HEAVY_SHOT_SPEED_FACTOR)+.75);
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
    // Contra aeronaus, la línia de visió és tridimensional: una
    // paret a la costa no ha de tapar un helicòpter que hi passa per damunt.
    const aerial=!!cv&&VT[cv.t]?.m==='a';
    u.marineVisible=distance<470&&(aerial
      ?weaponAimClear(u.x,u.o.position.y+3,u.z,q.x,targetY,q.z)
      :sight(u.x,u.z,q.x,q.z,u.o.position.y+3));
  }
  const hostile=!cheats.invisible&&!disg&&!over&&distance<470&&!!u.marineVisible;
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
  let best=wanted,open=false;
  const course=u.marineCourse;
  // Lluny del jugador, el ventall de deu rumbs és el càlcul més car de
  // la patrulla (molts mostrejos d'altura en mar obert). El reutilitzam
  // només mentre el vaixell, l'objectiu i l'orientació pràcticament no
  // han canviat; prop del combat es revisa a cada actualització.
  u.marineCourseT=(u.marineCourseT||0)-dt;
  const recalc=distance<=700||!course||!course.open||u.marineCourseT<=0||
    Math.hypot(course.x-u.x,course.z-u.z)>18||
    Math.hypot(course.goalX-goalX,course.goalZ-goalZ)>8||
    Math.abs(marineAngle(course.hd-u.hd))>.28;
  if(!recalc){best=course.best;open=course.open;}
  else{
    let bestScore=Infinity;
    // Els mateixos deu candidats de navegació, sense canviar col·lisions.
    for(const offset of MARINE_COURSE_OFFSETS){
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
      best=marineAngle(u.hd+u.orbitSign*1.25);
      if(u.wt>2)u.wt=2;
    }
    u.marineCourse={best,open,x:u.x,z:u.z,hd:u.hd,goalX,goalZ};
    u.marineCourseT=distance>700?.36:0;
  }
  const steer=marineAngle(best-u.hd),
        maxYaw=u.speed>12?.27:.39,
        desiredYaw=Math.max(-maxYaw,Math.min(maxYaw,steer*1.1));
  u.yawRate=(u.yawRate||0)+(desiredYaw-(u.yawRate||0))*(1-Math.exp(-2.3*dt));
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
    u.marineCourse=null;
  }
  u.o.position.set(u.x,wy(u.x,u.z,elapsed)+.2,u.z);
  const wave=Math.sin(elapsed*2+u.x*.03+u.z*.024);
  u.o.rotation.set(wave*.028,u.hd,-u.yawRate*.12+wave*.024,'YXZ');
  if(!hostile||distance>245)return;
  const target=new THREE.Vector3(q.x,targetY,q.z);
  // El pilot gira amb el fusell; el passatger, amb el llançacoets.
  const rifleAligned=aimEnemyBoatCrew(u.o,0,target,dt);
  const rocketAligned=aimEnemyBoatCrew(u.o,1,target,dt);
  if(distance<170&&rifleAligned&&u.mgCd<=0&&marineFire(u,0,target,false))u.mgCd=.28+rn(0,.15);
  if(distance<245&&rocketAligned&&u.rocketCd<=0&&marineFire(u,1,target,true))u.rocketCd=5;
}
