// Compatibility extraction: shared state remains in game-core.js.
// FX de bales normals: un conjunt petit de malles compartides i reciclables.
// Les col·lisions sense projectils mantenen els seus FX; totes les explosions utilitzen el model arcade 03.
const BULLET_IMPACT_LIMIT=112,bulletImpacts=[],bulletImpactFree=[];
const bulletBloodGeometry=new THREE.IcosahedronGeometry(.061,0),
      bulletSparkGeometry=new THREE.BoxGeometry(.045,.045,.17),
      bulletRicochetGeometry=new THREE.BoxGeometry(.045,.045,.32);
const bulletImpactMaterials={
  blood:[0x87262a,0xab3535].map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.86,depthWrite:false})),
  wound:[0xb52b35,0xd84942].map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false})),
  spark:[0xffdb83,0xffa23d].map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.94,depthWrite:false})),
  ricochet:[0xd8f3ff,0x7ec9ed].map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.96,depthWrite:false})),
  glass:[0xb5eaff,0x6cb7dc].map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.78,depthWrite:false}))
};
let combatFeedback=null;
function confirmCombatDamage(source,before,after){
  if(Number.isFinite(before)&&Number.isFinite(after)&&after<before&&
    (source?.own==='p'||source?.own==='pb'||source?.own==='b'))combatFeedback?.confirmHit();
}
function shatterWindow(w,index,point,p){
  if(!w.windowPanes?.[index])return false;
  const broken=w.brokenWindows||(w.brokenWindows=new Set());
  if(broken.has(index))return false;
  broken.add(index);if(w.glassMeshes?.[index])w.glassMeshes[index].visible=false;
  snd('glassBreak',.8,point,w.glassMeshes?.[index]||w);
  spawnBulletImpact('glass',point.x,point.y,point.z,p);
  return true;
}
function shatterVehicleWindow(v,seat,point,p,silent=false){
  if(!v?.o)return false;
  // L'estat de joc pot arribar abans de l'efecte al coop: el model
  // necessita una marca pròpia per no repetir fragments ni sons.
  const core=window.HUNTER_VEHICLE_OCCUPANT_DAMAGE;
  core.breakVehicleSeatWindow(v,seat);
  const done=v.o.userData.shatteredVehicleSeats??=
    new Set();
  if(done.has(seat))return false;
  done.add(seat);
  // Amagam només el panell translúcid més pròxim al seient afectat.
  // La malla és individual per vehicle: mai no mutam materials compartits.
  v.o.updateMatrixWorld(true);
  // Al reconnectar, el snapshot pot haver avançat abans que el model
  // renderitzat: localitzam el panell sobre la pose visual actual.
  const modelPose={...v,x:v.o.position.x,z:v.o.position.z,
    hd:v.o.rotation.y},
    center=core.vehicleSeatWorld(modelPose,seat,v.o.position.y);
  let pane=null,best=Infinity;
  const pos=new THREE.Vector3();
  v.o.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.visible)return;
    const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    if(!mats.some(mat=>mat?.transparent&&mat.opacity<.9))return;
    mesh.getWorldPosition(pos);
    const d=Math.hypot(pos.x-center.x,pos.y-center.y,pos.z-center.z);
    if(d<best){best=d;pane=mesh;}
  });
  if(pane&&best<7)pane.visible=false;
  if(!silent){
    snd('glassBreak',.8,point,v.o);
    spawnBulletImpact('glass',point.x,point.y,point.z,p);
  }
  return true;
}
function projectileImpactImmune(kind,target,p){
  if(!(p.dmg>0))return false;
  const light=!p.spl;
  if(kind==='wall')return target.civicFurniture
    ?target.civicFurniture==='well'&&light
    :target.woodenDoor?false:target.towerLegOwner
    ?light||target.towerLegOwner.hp===Infinity
    :light&&isMilitaryWall(target)||target.hp===Infinity;
  if(kind==='building')return light&&isMilitaryBuilding(target)||target.rhp===Infinity;
  if(kind==='enemy')return target.hp===Infinity||light&&
    (target.t==='torre'||p.shotClass==='light'&&isArmoredVehicleType(target.t));
  if(kind==='vehicle')return target.life===Infinity||light&&isArmoredVehicleType(target.t)||cheats.immune&&target===cv;
  return kind==='player'&&cheats.immune;
}
function spawnBulletImpact(type,x,y,z,p){
  if(!world||!bulletImpactMaterials[type])return;
  const wound=type==='wound',blood=type==='blood'||wound,ricochet=type==='ricochet'||type==='glass',
        count=wound?9:blood?5:ricochet?10:7,
        // El servidor del cooperatiu anuncia vidres trencats sense un
        // projectil visual local. En aquest cas conservam els fragments
        // amb una direcció de reserva i evitam accedir a p.vx sobre null.
        vx=Number.isFinite(p?.vx)?p.vx:0,
        vy=Number.isFinite(p?.vy)?p.vy:0,
        vz=Number.isFinite(p?.vz)?p.vz:1,
        length=Math.max(.001,Math.hypot(vx,vy,vz)),
        backX=-vx/length,backY=-vy/length,backZ=-vz/length;
  for(let n=0;n<count&&bulletImpacts.length<BULLET_IMPACT_LIMIT;n++){
    const mats=bulletImpactMaterials[type],
          geometry=blood?bulletBloodGeometry:ricochet?bulletRicochetGeometry:bulletSparkGeometry,
          m=bulletImpactFree.pop()||new THREE.Mesh(geometry,mats[n%2]);
    m.geometry=geometry;m.material=mats[n%2];
    const size=wound?rn(1.6,2.6):blood?rn(.7,1.1):ricochet?rn(1,1.6):rn(.7,1.4),
          life=wound?rn(.4,.6):blood?rn(.24,.38):ricochet?rn(.22,.4):rn(.13,.27),
          speed=wound?rn(.7,2.8):blood?rn(.5,2.1):ricochet?rn(3.5,7.5):rn(1.8,5.4);
    m.position.set(x+backX*.09+rn(-.045,.045),y+backY*.09+rn(-.045,.045),z+backZ*.09+rn(-.045,.045));
    m.rotation.set(rn(0,6.28),rn(0,6.28),rn(0,6.28));
    m.scale.setScalar(size);m.visible=true;world.add(m);
    bulletImpacts.push({m,type,life,maxLife:life,size,
      vx:backX*speed+rn(-speed*.8,speed*.8),
      vy:backY*speed+rn(blood?.15:.7,blood?1.25:3.3),
      vz:backZ*speed+rn(-speed*.8,speed*.8),
      gravity:blood?9:14});
  }
}
function updateBulletImpacts(dt){
  for(let i=bulletImpacts.length-1;i>=0;i--){
    const f=bulletImpacts[i];f.life-=dt;
    if(f.life<=0){
      world.remove(f.m);f.m.visible=false;bulletImpactFree.push(f.m);
      bulletImpacts.splice(i,1);continue;
    }
    f.vy-=f.gravity*dt;
    f.m.position.x+=f.vx*dt;f.m.position.y+=f.vy*dt;f.m.position.z+=f.vz*dt;
    if(f.type==='spark'||f.type==='ricochet'){f.m.rotation.x+=dt*17;f.m.rotation.z+=dt*13}
    f.m.scale.setScalar(f.size*Math.max(.05,f.life/f.maxLife));
  }
}
function clearBulletImpacts(){
  for(const f of bulletImpacts){world?.remove(f.m);f.m.visible=false;bulletImpactFree.push(f.m)}
  bulletImpacts.length=0;
}

function setDis(v){disg=v;[...pl.userData.mats,...rider.userData.mats].forEach(([m,a,b])=>m.color.copy(vivid(v?b:a)))}
let playerBlastRagdoll=null;
function fin(m,cause=null){if(m==='HAS MORT')finishOperationRun('death');updateOptionalSystems(0,false);combatFeedback?.clear();if(m==='HAS MORT'&&startDeathCinematic(cause))return;setSniperScope(false);over=1;Object.keys(K).forEach(k=>K[k]=0);endEl.textContent=m+' · Obre Ⅱ / Esc per tornar a jugar';endEl.style.display='flex'}
// El dany no canvia amb la dificultat: només la dispersió del tir enemic.
function enemyWeaponDamageScale(){return 1}
function hurtP(d,fromEnemyWeapon=false,cause=null){
 if(over||cheats.immune)return;
 const amount=wholeDamage(d);
 if(amount<=0)return;
 const before=hp;
 hp=window.HUNTER_PLAYER_SIMULATION.damageHealth(hp,amount);recordOperationMetric('damageTaken',before-hp);snd('hurt',.5);
 if(hp<before)combatFeedback?.damage(cause);
 if(hp<=0)fin('HAS MORT',cause||{type:fromEnemyWeapon?'bullet':'impact'});
}
function destroyTower(u){
  if(!u?.o||u.destroyed)return;
  u.destroyed=true;
  // Desfer els col·lidors de les quatre potes i invalidar l'índex espacial.
  // Així cap projectil ni vehicle no col·lisiona amb una torre desapareguda.
  for(const leg of u.towerLegColliders||[]){
    const i=Wl.indexOf(leg);if(i>=0)Wl.splice(i,1);
  }
  wallGridCount=-1;
  u.towerLegColliders=[];
  // Abans es clonaven TOTES les malles, incloses les dues representacions
  // LOD (torres completes). Produïen dos esquelets gegants flotants.
  // Generam peces petites reals, sense copiar ni el LOD ni trams sencers.
  const base=u.o.position.y;
  for(let k=0;k<26;k++){
    const high=k<10,yy=base+(high?rn(7.5,10.2):rn(.8,7.6)),
          xx=u.x+rn(-1.85,1.85),zz=u.z+rn(-1.85,1.85),
          color=high?(k%3?0x7c2f2f:0x343a3e):0x4b5157,
          m=new THREE.Mesh(dgeo,dmat(color)),
          size=high?rn(.45,1.12):rn(.32,.78);
    m.scale.set(size*rn(.6,1.3),size*rn(.45,1),size*rn(.6,1.25));
    m.position.set(xx,yy,zz);m.rotation.set(rn(-.4,.4),rn(0,Math.PI),rn(-.4,.4));
    m.castShadow=true;world.add(m);
    const dx=xx-u.x,dz=zz-u.z,length=Math.max(.35,Math.hypot(dx,dz));
    DB.push({m,s0:m.scale.clone(),
      vx:dx/length*rn(6,13)+rn(-3,3),vy:rn(5,15),
      vz:dz/length*rn(6,13)+rn(-3,3),
      rx:rn(-7,7),ry:rn(-7,7),rz:rn(-7,7),
      life:rn(1.9,3.1),vehiclePart:true});
  }
  for(let k=0;k<8;k++)puff(u.x+rn(-2,2),base+rn(.5,9),u.z+rn(-2,2),
    k%2?0x55534f:0x8b8176,rn(1.5,3.5));
  boom(u.x,base+4,u.z,7,COMBAT_BALANCE.weapons.grenade,'p');
}
function explodeEnemyVehicle(u){
  // Mateixa explosió visual que els vehicles pilotables: fragments de la
  // geometria original, núvol de fum i ona de foc. No reapareix el model.
  if(u.destroyed)return;
  u.destroyed=true;
  const y=u.o?.position?.y??(u.gy??Math.max(0,hAt(u.x,u.z)));
  if(u.o){vehicleDebris(u,y);world.remove(u.o)}
  const heavy=u.t==='tanc'||u.t==='tanqueta';
  boom(u.x,y+(heavy?1.8:1.2),u.z,heavy?12:9,heavy?10:8,'e');
}
function killEnemy(u,killingShot=null){
  if(u.enemyVehicleClaim){
    const claim=u.enemyVehicleClaim,vehicle=claim.vehicle,
      partner=claim.seat===0?vehicle.enemyCrew?.[1]:null;
    enemyVehicleRelease(u,false);
    if(partner?.hp>0&&partner.enemyVehicleClaim?.phase==='riding'&&
       vehicle&&!vehicle.destroyed){
      vehicle.enemyCrew??=[null,null];
      vehicle.enemyCrew[0]=partner;vehicle.enemyCrew[1]=null;
      partner.enemyVehicleClaim.seat=0;
      partner.enemyVehicleClaim.phase='riding';
      window.HUNTER_ENEMY_CREW_VISUAL?.show(vehicle,1,false);
      window.HUNTER_ENEMY_CREW_VISUAL?.show(vehicle,0,true);
      partner.o.visible=false;
    }else if(partner&&partner.hp>0)enemyVehicleRelease(partner);
  }
  const i=E.indexOf(u);if(i<0)return;E.splice(i,1);kills++;
  if(u.t==='soldat'||u.t==='general'){window.HUNTER_ENEMY_LOD.setLevel(u.o,'full');u.deadT=0;
    const impulse=u.blastImpulse;
    u.deadSide=rn(-1,1)<0?-1:1;
    u.deadPose={yaw:rn(-Math.PI,Math.PI),roll:u.deadSide*rn(.95,1.65),
      pitch:rn(-.9,.9),armL:rn(-1.6,.8),armR:rn(-1.6,.8),
      legL:rn(-.8,.85),legR:rn(-.8,.85),
      vx:impulse?.vx??rn(-2.6,2.6),vz:impulse?.vz??rn(-2.6,2.6),
      vy:impulse?.vy??rn(1.5,3.8),height:0};
    if(u.blastRagdoll){window.HUNTER_RAGDOLL.reset(u.blastRagdoll);u.blastRagdoll=null}
    u.o.userData.legs?.forEach(l=>l.rotation.x=0);
    u.o.userData.arms?.forEach(a=>a.rotation.x=0);
    // El general conserva la seva representació teatral de victòria.
    if(u.t!=='general')u.ragdoll=window.HUNTER_RAGDOLL.make(u.o,{
      blast:!!impulse,impulse,seed:u.x*.41+u.z*.27});
    DEAD.push(u)}
  else if(u.t==='torre'){destroyTower(u);world.remove(u.o)}
  else if(u.t==='jeep'||u.t==='tanqueta'||u.t==='tanc'||u.t==='patrulla_marina')explodeEnemyVehicle(u);
  else world.remove(u.o);
  if(u.t==='general'){finishOperationRun('victory');updateOptionalSystems(0,false);combatFeedback?.clear();startVictoryCinematic(u,killingShot)}
}
function hurtE(u,d,killingShot=null){
  const amount=wholeDamage(d);
  if(amount<=0||u.hp<=0)return;
  const before=u.hp;
  u.hp=Math.max(0,Math.ceil(u.hp)-amount);u.alert=12;
  confirmCombatDamage(killingShot,before,u.hp);
  if(u.t==='soldat'&&!u.canSee){
    u.aiMode='search';u.searchT=window.HUNTER_STEALTH.CONFIG.searchSeconds;
    const vx=killingShot?.vx??0,vz=killingShot?.vz??0,
          norm=Math.max(.01,Math.hypot(vx,vz));
    u.lastSeenX=u.x-vx/norm*15;u.lastSeenZ=u.z-vz/norm*15;
    u.lastSeenY=u.o.position.y;
  }
  if(u.hp<before&&(u.t==='soldat'||u.t==='general')){
    // Ferides de bala, ganivet, explosions i atropellaments: la sang
    // surt del cos del soldat, també quan sobreviu a l'impacte.
    const bullet=killingShot?.spl===0&&Number.isFinite(killingShot.vx)&&
            Number.isFinite(killingShot.x)&&Number.isFinite(killingShot.y)&&Number.isFinite(killingShot.z),
          baseY=u.o?.position.y??u.gy??hAt(u.x,u.z),
          hitDistance=bullet?Math.hypot(killingShot.x-u.x,killingShot.z-u.z):0,
          hitScale=hitDistance>.6?.6/hitDistance:1,
          // La col·lisió usa una esfera ampla; només el FX es fixa al cos.
          x=bullet?u.x+(killingShot.x-u.x)*hitScale:u.x+rn(-.15,.15),
          y=bullet?Math.max(baseY+.6,Math.min(baseY+2.8,killingShot.y)):baseY+rn(1,1.5),
          z=bullet?u.z+(killingShot.z-u.z)*hitScale:u.z+rn(-.15,.15),
          sourceX=killingShot?.x??P.x,sourceZ=killingShot?.z??P.z;
    spawnBulletImpact(u.hp>0?'wound':'blood',x,y,z,{
      vx:bullet?killingShot.vx:u.x-sourceX,
      vy:bullet?killingShot.vy:0,
      vz:bullet?killingShot.vz:u.z-sourceZ
    });
  }
  if(u.hp<=0)killEnemy(u,killingShot);
}
// La bicicleta no té motor ni combustible: queda espanyada, però mai no
// origina una explosió, ona expansiva, dany en àrea ni expulsió balística.
function destroyBicycle(v){
  if(!v||v.destroyed)return;
  const wasRiding=cv===v;
  v.destroyed=true;v.life=0;v.v=0;v.driveInput=0;v.steerInput=0;
  v.reentryLockUntil=Infinity;
  if(wasRiding){
    resetCameraState();
    cv=null;P.x=v.x;P.z=v.z;P.hd=v.hd;
    P.y=groundAt(v.x,v.z,P.y);
    // Una ensopegada curta, sense velocitat d'ejecció ni girs aeris.
    playerEject={kind:'bicycle',vx:0,vz:0,t:.42,dur:.42};
    msg='La bicicleta s’ha romput!';msgT=2.5;
  }
  const i=V.indexOf(v);if(i>=0)V.splice(i,1);
  intelMarks=intelMarks.filter(mark=>mark.ref!==v);
  // La ferralla continua al món, tombada i fora de la llista de vehicles.
  // Ajustam l'altura després de girar-la perquè toqui el sòl.
  if(v.o){
    v.o.rotation.z=(Math.sin(v.x*2.13+v.z*.79)>0?1:-1)*Math.PI*.43;
    v.o.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(v.o),floor=hAt(v.x,v.z);
    if(Number.isFinite(bounds.min.y))v.o.position.y+=floor-bounds.min.y+.04;
  }
}
function explodeVehicle(v){
  if(v?.t==='bici'){destroyBicycle(v);return;}
  if(!v||v.destroyed)return;
  // L'explosió del vehicle mata també els ocupants enemics sense
  // provocar un segon vehicle fictici ni deixar reserves orfes.
  for(const occupant of [...(v.enemyCrew||[])])if(occupant?.hp>0)
    hurtE(occupant,Math.max(occupant.hp+1,100));
  v.destroyed=true;const wasPilot=cv===v,yy=v.o?.position?.y??Math.max(0,hAt(v.x,v.z));
  const destruction=window.HUNTER_SHARED_COMBAT.VEHICLE_DESTRUCTION;
  if(wasPilot){
    resetCameraState();
    if(VT[v.t]?.m==='a'){
      // Abandonament forçat en ple vol: el jugador surt realment des de
      // l'altura de l'helicòpter i rep el dany corresponent quan cau.
      ejectFromHelicopter(v);
      msg='L’helicòpter ha explotat! Estàs caient!';msgT=3;
    }else{
      cv=null;P.x=v.x;P.z=v.z;
      const a=rn(0,Math.PI*2),sp=rn(14,24);
      playerEject={kind:'blast',vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,t:.8,dur:.8,spin:rn(-1,1)<0?-1:1,height:1.25};
      hurtP(rn(destruction.occupantMin,destruction.occupantMax),false,{type:'vehicleExplosion',x:v.x,y:yy+1,z:v.z});msg='El vehicle ha explotat!';msgT=3;
    }
  }
  const i=V.indexOf(v);if(i>=0)V.splice(i,1);
  intelMarks=intelMarks.filter(m=>m.ref!==v);
  if(v.o){vehicleDebris(v,yy);world.remove(v.o)}
  boom(v.x,yy+1,v.z,destruction.damage,destruction.radius,'p',{skipPlayer:wasPilot});
}
// Carrosseria i ocupants són objectius independents. Primer s'ha de trencar
// el vidre del seient per poder ferir la persona asseguda.
// Projectils explosius: 50% més ràpids i meitat de mida visual.
const COMBAT_BALANCE=window.HUNTER_COMBAT_BALANCE;
const HEAVY_SHOT_SPEED_FACTOR=window.HUNTER_SHARED_WEAPONS.HEAVY_SPEED_FACTOR,HEAVY_SHOT_DAMAGE_FACTOR=1,HEAVY_SHOT_VISUAL_SCALE=.5;
const shotClassFromSplash=spl=>spl>0?'heavy':'light';
const isMilitaryBuilding=b=>!!b&&!b.civilian&&(!!b.compound||b.kind==='enemy_bunker');
const isMilitaryWall=w=>!!w?.towerLegOwner||isMilitaryBuilding(w?.owner);
const isArmoredVehicleType=window.HUNTER_SHARED_COMBAT.isArmoredVehicleType;
function damageVehicle(v,dmg,impacts=1,shotClass='collision',source=null){
 if(cheats.immune&&v===cv)return;
 if(!v)return;
 const before=v.life??VT[v.t]?.life??1;
 const result=window.HUNTER_SHARED_COMBAT.vehicleDamage(v,dmg,impacts,shotClass,VT[v.t]?.life??1);
 if(!result.damaged&&!result.destroyed)return;
 v.life=result.life;v.smokeT=0;
 confirmCombatDamage(source,before,v.life);
 if(v===cv&&v.life<before)combatFeedback?.damage({
   x:source?.spl===0?source.sx:source?.x,
   z:source?.spl===0?source.sz:source?.z
 });
 if(v.life<=0)explodeVehicle(v);
}

// Regla única: qualsevol mal positiu resta un nombre enter de punts de vida.
// La física (velocitats, trajectòries i impulsos) continua emprant decimals.
// Els nombres invàlids no afecten la vida.
function wholeDamage(value){
 return window.HUNTER_PLAYER_SIMULATION.wholeDamage(value)
}
// Xocs amb criteris compartits: massa del receptor, massa de l'altre i velocitat relativa.
// Els impactes ordinaris tenen un màxim de cinc punts de vida per contacte.
function impactDamage(...args){return window.HUNTER_SHARED_COMBAT.impactDamage(...args)}
function impactVehicle(v,dmg){
 if(!v||v.destroyed||v.t==='tanc'||dmg<=0)return;
 const amount=Math.min(5,wholeDamage(dmg));
 if(E.includes(v)){
  if(v.t==='jeep'||v.t==='tanqueta'||v.t==='patrulla_marina')hurtE(v,amount);
 }else damageVehicle(v,amount,1,'impact');
}

// Mateix atropellament per a soldats i jugador: velocitat i massa sense
// límit artificial per als vehicles pesants; 10 PV és el màxim global.
function runoverDamage(...args){return window.HUNTER_SHARED_COMBAT.runoverDamage(...args)}
// Consulta tot el moviment del vehicle, també quan travessa una diana
// entre dos fotogrames. El radi és el mateix que per a l'impacte puntual.
function runoverSweepHit(...args){return window.HUNTER_SHARED_COMBAT.runoverSweepHit(...args)}

function shoot(x,y,z,dx,dy,dz,sp,dmg,spl,own,mat,sc,audioSource=null){
  const claim=audioSource?.enemyVehicleClaim;
  // Un soldat al volant no dispara mai amb l'arma d'infanteria.
  if(own==='e'&&claim&&claim.seat===0&&
     ['waiting','riding'].includes(claim.phase))return;
  const shotClass=shotClassFromSplash(spl),speed=sp*(shotClass==='heavy'?HEAVY_SHOT_SPEED_FACTOR:1),
        power=wholeDamage(dmg);
  if(own==='p'||own==='pb'){
    const sound=spl?'bazooka':!cv&&sniperEquipped?'sniper':cv?'rifle':'pistol';
    window.HUNTER_STEALTH.emit(sound,x,y,z);
  }
  snd(spl?'cannon':'shot',own==='e'?.6:1,{x,y,z},audioSource||((own==='p'||own==='pb')?P:null));
  // Tots els projectils tenen l'eix longitudinal -Z: cilindres fins per
  // a les bales lleugeres i ojives per a les pesades. S'orienten en 3D,
  // també en tirs ascendents, descendents i diagonals.
  const heavy=shotClass==='heavy';
  const o=new THREE.Mesh(heavy?gHeavy:gLight,mat);
  o.scale.setScalar(sc*(heavy?HEAVY_SHOT_VISUAL_SCALE:1));
  const heading=new THREE.Vector3(dx,dy,dz);
  if(heading.lengthSq()>1e-12)
    o.quaternion.setFromUnitVectors(heavyForward,heading.normalize());
  o.position.set(x,y,z);world.add(o);
  Pj.push(window.HUNTER_SHARED_PROJECTILES.launchProjectile({x,y,z},[dx,dy,dz],speed,{
    dmg:power,spl,shotClass,own,o,
    sourceVehicle:own==='e'&&claim&&['waiting','riding'].includes(claim.phase)
      ?claim.vehicle:null
  }))
}
// Distància d'una explosió al CASC, no al centre del vehicle.
// Els coets impacten sobre l'esfera de col·lisió; en helicòpters grans
// aquesta superfície quedava fora del radi de l'explosió de 8 metres.
function explosionDistanceToVehicleHull(v,x,y,z){
  const vy=v.o?.position?.y??Math.max(0,hAt(v.x,v.z));
  return window.HUNTER_SHARED_COMBAT.vehicleHullDistance(v,vy,vehicleRadius(v.t)*.62,x,y,z);
}
// Impuls físic als personatges; els vehicles no s'envien volant.
function blastImpulseAt(x,z,px,pz,r,falloff){
  const dx=px-x,dz=pz-z,dist=Math.hypot(dx,dz),
        dir=dist>.05?{x:dx/dist,z:dz/dist}:{x:Math.cos(rn(0,6.28)),z:Math.sin(rn(0,6.28))},
        // L'ona de xoc projecta molt més lluny i més amunt.
        // Els radis més petits continuen fent un impuls apreciable.
        scale=Math.max(.45,Math.min(1.25,r/12)),
        speed=(15+28*falloff)*scale;
  return {vx:dir.x*speed,vz:dir.z*speed,vy:(9+13*falloff)*scale};
}
// Explosions: dany complet al centre, mínim d'un punt a la vora.
function explosionDamage(...args){return window.HUNTER_SHARED_COMBAT.explosionDamage(...args)}
// Les parets, portes, forjats, teulades i relleu fan de cobertura real.
// Especialment: una càrrega a la superfície no pot matar el general al soterrani.
function blastOccluded(x,y,z,tx,ty,tz,ignoreWall=null,ignoreTower=null){
 const dx=tx-x,dy=ty-y,dz=tz-z,length=Math.hypot(dx,dy,dz);
 if(length<.15)return false;
 const mx=(x+tx)/2,mz=(z+tz)/2,search=Math.hypot(dx,dz)/2+2;
 for(const w of wallCandidates(mx,mz,search)){
  if(w===ignoreWall||(ignoreTower&&w.towerLegOwner===ignoreTower)||w.open||w.barbed||w.hp<=0)continue;
  // L'origen pot estar encastat dins un obstacle just quan detona.
  if(x>w.x0+.03&&x<w.x1-.03&&y>w.y0+.03&&y<w.y1-.03&&z>w.z0+.03&&z<w.z1-.03)continue;
  const t=segmentAabbT(x,y,z,tx,ty,tz,w.x0,w.x1,w.y0,w.y1,w.z0,w.z1);
  if(t!=null&&t>=0&&t<.995)return true;
 }
 for(const b of buildingCandidates(mx,mz,search)){
  if(b.rhp<=0||b.rb)continue;
  const t=b.hangar?hangarRoofSegmentT(x,y,z,tx,ty,tz,b):
    segmentAabbT(x,y,z,tx,ty,tz,b.x-b.w/2,b.x+b.w/2,b.fy+b.h-.3,b.fy+b.h+1.15,b.z-b.d/2,b.z+b.d/2);
  if(t!=null&&t>.005&&t<.995)return true;
 }
 // Mostreig curt del terreny: bunkerProjectileSurface distingeix el
 // nivell excavable del búnquer i no crea una falsa roca a les habitacions.
 const samples=Math.min(32,Math.max(4,Math.ceil(length/2)));
 for(let i=1;i<samples;i++){
  const t=i/samples,px=x+dx*t,py=y+dy*t,pz=z+dz*t;
  if(py<bunkerProjectileSurface(px,pz,py)-.22)return true;
 }
 return false;
}
// La proximitat al tram real, no al centre de l'AABB de 6 m,
// determina si l'ona expansiva arriba a la filferrada.
function closestFenceBlastPoint(...args){return window.HUNTER_SHARED_COMBAT.closestFenceBlastPoint(...args)}
function presentExplosion(x,y,z,r,source=null){
 window.HUNTER_STEALTH.emit('explosion',x,y,z);
 snd('boom',1,{x,y,z},source);
 // Explosió arcade 03 única: granada per defecte, C4 més contundent.
 // Aquest mòdul només és visual; el dany i el radi físic no es toquen.
 const kind=source?.weapon==='c4'?'c4':
   source?.weapon==='grenade'||source?.weapon==='granada'?'grenade':
   source?.spl>0||source?.splash>0?'projectile':'grenade';
 if(!window.HUNTER_ARCADE_BLAST_FX||window.HUNTER_ARCADE_BLAST_FX.scene!==world){
   window.HUNTER_ARCADE_BLAST_FX?.dispose();
   window.HUNTER_ARCADE_BLAST_FX=window.HUNTER_CREATE_ARCADE_BLAST_FX(THREE,world,{
     quality:window.HUNTER_GRAPHICS_QUALITY==='mobile'?'mobile':'desktop'
   });
 }
 window.HUNTER_ARCADE_BLAST_FX.emit(x,y,z,kind==='projectile'?{
   weapon:kind,direction:source.direction,
   vx:source.vx,vy:source.vy,vz:source.vz
 }:kind);
}
function boom(x,y,z,r,dmg,own,source=null,visualWeapon=null){
 presentExplosion(x,y,z,r,visualWeapon?{weapon:visualWeapon}:source);
 // El casc protegeix el pilot mentre encara és dins. Si el vehicle
 // esclata dins aquest càlcul, no el feim rebre també un impacte directe.
 const pilotedAtStart=!!cv;
 for(const u of [...enemyCandidatesAt(x,z,r+vehicleRadius('llanxa')*.62+4)]){
  if(u.hp<=0||u.destroyed)continue;
  const marine=u.t==='patrulla_marina',
    towerAim=u.t==='torre'?window.HUNTER_SHARED_COMBAT.towerExplosionAim(
      u,{x,y,z},u.o.position.y):null,
    targetY=towerAim?.y??u.o.position.y+(marine?1.8:1.5),
    distance=Math.hypot(u.x-x,targetY-y,u.z-z),
    d=marine?Math.max(0,distance-vehicleRadius('llanxa')*.62):distance,
    dealt=explosionDamage(dmg,d,r);
  // L'ona arriba als pilars abans de la caseta. Els propis pilars no
  // bloquegen el C4, però qualsevol altra paret o terreny sí.
  if(!dealt||blastOccluded(x,y,z,u.x,targetY,u.z,null,towerAim?u:null))continue;
  if(u.t==='soldat'||u.t==='general'){
   u.blastImpulse=blastImpulseAt(x,z,u.x,u.z,r,1-d/r);
   if(u.hp>dealt){u.blastT=Math.max(u.blastT||0,.55+u.blastImpulse.vy/8);u.blastTotal=u.blastT}
  }
  // Els enemics també poden ferir els seus companys amb les explosions.
  hurtE(u,dealt,source||{x,y,z,sx:cv?.x??P.x,sy:(cv?.o?.position.y??P.y)+1.7,sz:cv?.z??P.z,spl:r,own});
  // Si sobreviu, també obre braços i cames mentre surt volant.
  if(u.hp>0&&u.blastT>0&&!u.blastRagdoll)
    u.blastRagdoll=window.HUNTER_RAGDOLL.make(u.o,{
      blast:true,impulse:u.blastImpulse,seed:u.x*.41+u.z*.27});
 }

 // Civilians use the same cover before this explosion damages any walls.
 for(const civilian of prisonerSystem.entities){
  if(civilian.hp<=0||civilian.destroyed)continue;
  const targetY=civilian.y+1,
    dealt=explosionDamage(dmg,Math.hypot(civilian.x-x,targetY-y,civilian.z-z),r);
  if(dealt&&!blastOccluded(x,y,z,civilian.x,targetY,civilian.z)){
   const lost=prisonerSystem.hurt(civilian,dealt,source||{x,y,z,own});
   if(lost)spawnBulletImpact('blood',civilian.x,targetY,civilian.z,{sx:x,sy:y,sz:z});
  }
 }
 PL.forEach(t=>{if(!t.alive)return;const dealt=explosionDamage(dmg,Math.hypot(t.x-x,t.z-z),r);if(dealt&&!blastOccluded(x,y,z,t.x,t.y+2,t.z))dmgP(t,dealt)});
 for(const v of [...vehicleCandidatesAt(x,z,r+12,true)]){
  if(v.destroyed)continue;
  const dealt=explosionDamage(dmg,explosionDistanceToVehicleHull(v,x,y,z),r);
  if(dealt&&!blastOccluded(x,y,z,v.x,(v.o?.position?.y??0)+1,v.z))damageVehicle(v,dealt,1,'heavy',source||{x,y,z,own});
 }
 // Les granades i el C4 propis també poden fer mal al jugador a peu.
 if(!pilotedAtStart&&!source?.skipPlayer){
  const d=Math.hypot(P.x-x,P.y+1-y,P.z-z),dealt=explosionDamage(dmg,d,r);
  if(dealt&&!blastOccluded(x,y,z,P.x,P.y+1,P.z)){
   const impulse=blastImpulseAt(x,z,P.x,P.z,r,1-d/r);
   if(!playerFall){
    const flight=Math.max(1.5,.55+impulse.vy/8);
    if(playerEject?.kind==='blast'&&playerEject.t>0){
      // Una segona ona expansiva modifica la trajectòria actual, però
      // no reinicia l'altura, la rotació ni l'animació del ragdoll.
      playerEject.vx+=impulse.vx;
      playerEject.vz+=impulse.vz;
      playerEject.vy=Math.max(playerEject.vy,0)+impulse.vy;
      playerEject.t=Math.max(playerEject.t,flight);
      playerEject.dur=Math.max(playerEject.dur,playerEject.t);
    }else{
      playerEject={kind:'blast',...impulse,t:flight,dur:flight,height:0,roll:rn(-1,1)<0?-1:1};
      if(playerBlastRagdoll)window.HUNTER_RAGDOLL.reset(playerBlastRagdoll);
      playerBlastRagdoll=window.HUNTER_RAGDOLL.make(pl,{
        blast:true,impulse,seed:P.x*.41+P.z*.27});
    }
   }
   hurtP(dealt,own==='e',{type:'explosion',x,y,z});
  }

 }
 // Les estructures absorbeixen el dany, fins i tot quan tapen els ocupants.
 // Una explosió trenca el filferro complet del tram si el front d'ona
 // l'assoleix: els 8 PV no han de deixar una barrera invisible o intacta
 // quan el projectil hi detona just al costat. Altres murs mantenen PV.
 const civicBlasts=new Map();
 for(const w of [...wallCandidates(x,z,r)]){
  if(w.open||w.hp<=0)continue;
  if(w.barbed){
    const near=closestFenceBlastPoint(w,x,y,z);
    if(near.distance<r&&!blastOccluded(x,y,z,near.x,near.y,near.z,w))
      dmgW(w,w.hp);
    continue;
  }
  const dealt=window.HUNTER_SHARED_COMBAT.wallBlastDamage(w,x,y,z,r,dmg);
  if(!dealt)continue;
  if(w.civicFurniture){
   const old=civicBlasts.get(w.civicGroup);
   if(!old||dealt>old.dealt)civicBlasts.set(w.civicGroup,{w,dealt});
  }else dmgW(w,dealt);
 }
 // Evita multiplicar el dany de la mateixa explosió pels dotze trams.
 for(const {w,dealt} of civicBlasts.values())dmgW(w,dealt,'heavy');
 for(const b of buildingCandidates(x,z,r)){
  // El sostre estructural del búnquer roman intacte encara que es destrueixin murs.
  if(b.kind==='enemy_bunker'||b.rhp<=0)continue;
  const dealt=window.HUNTER_SHARED_COMBAT.roofBlastDamage(b,x,z,r,dmg);
  if(dealt){b.rhp-=dealt;if(b.rhp<=0)roofBreak(b)}
 }
}
// Punt just fora de la porta dreta del Huey 3B. Les dimensions locals
// corresponen a l'obertura real (x=1,36; z=-0,76..1,76).
// localToWorld respecta gir, inclinació i escala del model 3D.
function helicopterBombDoor(v){
 v.o.updateWorldMatrix(true,false);
 return v.o.localToWorld(new THREE.Vector3(1.96,2.02,.52));
}
function executePlayerPlant(seconds=3){
 // La configuració surt sempre del LED. La validació també protegeix
 // l'acció davant clics repetits, entrada invàlida o una partida acabada.
 if(over||cv&&cv.t!=='heli'||swimming||playerFall||
    playerEject||!inv.expl||!Number.isInteger(seconds)||
    seconds<0||seconds>59)return false;
 const airborne=!!cv&&cv.t==='heli';
 // El Huey deixa caure l'artefacte des de l'obertura lateral;
 // no el dispara ni li transmet velocitat horitzontal del vehicle.
 const door=airborne?helicopterBombDoor(cv):null;
 if(--inv.expl<=0)delete inv.expl;setDis(false);
 const o=window.HUNTER_EXPLOSIVE_VISUALS.create(THREE,true,seconds);
 o.rotation.y=(cv?.hd??P.hd)+Math.PI;
 const forward=1.35,
       x=airborne?door.x:P.x-Math.sin(P.hd)*forward,
       z=airborne?door.z:P.z-Math.cos(P.hd)*forward,
       y=airborne?door.y:groundAt(x,z,P.y)+.24;
 o.position.set(x,y,z);world.add(o);
 if(seconds===0){
  // 00 és una detonació immediata, fins i tot en ple vol.
  boom(x,y,z,48,COMBAT_BALANCE.weapons.c4,'b',null,'c4');
  world.remove(o);
 }else bombs.push({x,y,z,t:seconds,o,falling:airborne,vy:0,landed:!airborne});
 msg=seconds===0?'Bomba detonada!':airborne?
   'Explosiu deixat anar: '+String(seconds).padStart(2,'0')+' s!':
   'Bomba col·locada: '+String(seconds).padStart(2,'0')+' s!';
 msgT=2;return true;
}
// La filferrada és permeable a la vista i al foc lleuger, però segueix
// impedint els atacs cos a cos quan ignoreBarbed=false.
function sight(x,z,tx,tz,y,ignoreBarbed=true,targetY=y){const from={x,y,z},to={x:tx,y:targetY,z:tz},reach=Math.hypot(tx-x,tz-z)/2+3;for(const w of wallCandidates((x+tx)/2,(z+tz)/2,reach)){if(w.open||ignoreBarbed&&w.barbed)continue;if(window.HUNTER_BUILDING_SHELL.wallShotHit(from,to,w)!=null)return false}return true}
function melee(){
 if(playerEject||playerFall||cv||swimming||fcd>0)return false;
 fcd=.52;pl.userData.meleePose=pl.userData.knifeAttackDuration||.38;
 window.HUNTER_STEALTH.emit('knife',P.x,P.y+1,P.z);
 const pane=window.HUNTER_BUILDING_SHELL.knifeWindowHit(
   P,wallCandidates(P.x-Math.sin(P.hd)*1.4,P.z-Math.cos(P.hd)*1.4,3),
   2.8,(_i,index,wall)=>!wall.brokenWindows?.has(index));
 if(pane)shatterWindow(pane.wall,pane.paneIndex,pane.point,null);
 const hit=window.HUNTER_SHARED_WEAPONS.meleeTarget(P,E,
   u=>sight(P.x,P.z,u.x,u.z,P.y+1.2,false));
 if(hit)hurtE(hit,COMBAT_BALANCE.weapons.knife,
   {weapon:'knife',own:'p',sx:P.x,sy:P.y+1.35,sz:P.z,
    x:hit.x,y:hit.o.position.y+1.35,z:hit.z});
 snd('hurt',hit?.45:.18);setDis(false);return true;
}
function secondaryWeapon(){if(playerEject||playerFall)return false;if(nativeCoopSession)return nativeCoopSession.channel?.combat('secondary');
  if(!cv||fcd>0)return false;const hd=cv.hd,fx_=-Math.sin(hd),fz=-Math.cos(hd),d45=Math.SQRT1_2;
  if(cv.t==='heli_combat'){if(cheats.items)cv.rockets=Math.max(cv.rockets||0,999);if((cv.rockets||0)<=0){msg='Sense míssils.';msgT=2;return false}cv.rockets--;fcd=.75;const shot=combatHeliMissileAim(cv),d=shot.direction;shoot(shot.x,shot.y,shot.z,d[0],d[1],d[2],72,COMBAT_BALANCE.weapons.heliMissile,10,'p',mS,2.4);Pj[Pj.length-1].life=3.3;msg='Míssils: '+cv.rockets;msgT=1;return true}
  if(cv.t==='llanxa_coets'){/* Munició infinita. */fcd=.9;
    const shot=combatBoatRocketAim(cv),d=shot.direction;
    shoot(shot.x,shot.y,shot.z,d[0],d[1],d[2],68,COMBAT_BALANCE.weapons.boatRocket,11,'p',mS,2.6);
    msg='Coets: ∞';msgT=1;return true}
  return false
}
// Un toc deixa caure la granada a prop; 1,4 s de pressió assoleixen
// l'abast màxim. La mateixa velocitat serveix per a la mira i el projectil.
const GRENADE_CHARGE_SECONDS=1.4,GRENADE_MIN_SPEED=3.5,GRENADE_MAX_SPEED=33;
let grenadeCharge=null,grenadeAimVisual=null;
function grenadeLaunchParams(power=0,origin=P,hd=P.hd){
  return window.HUNTER_SHARED_WEAPONS.grenadeLaunch(power,origin,hd);
}
function bunkerProjectileSurface(x,z,y,water=false){
  const floor=bunkerSubFloorAt(x,z,y);
  if(floor!==null&&activeBunker&&y<activeBunker.fy+.1)return floor+.16;
  return (water?Math.max(hAt(x,z),wy(x,z,elapsed)):Math.max(0,hAt(x,z)))+.16;
}
function grenadeImpactTrajectory(power=0,origin=P,hd=P.hd,flight=null){
  const g={...(flight||grenadeLaunchParams(power,origin,hd))},points=[{x:g.x,y:g.y,z:g.z}],dt=1/40;
  for(let i=0;i<96;i++){
    const next=window.HUNTER_SHARED_COMBAT.ballisticStep(g,dt),x0=g.x,y0=g.y,z0=g.z,x1=next.x,y1=next.y,z1=next.z,
          mx=(x0+x1)/2,mz=(z0+z1)/2,reach=Math.hypot(x1-x0,z1-z0)/2+.5;
    let hitT=null;
    for(const w of wallCandidates(mx,mz,reach)){
      if(w.open)continue;
      const q=segmentAabbT(x0,y0,z0,x1,y1,z1,w.x0,w.x1,w.y0,w.y1,w.z0,w.z1);
      if(q!=null&&(hitT==null||q<hitT))hitT=q;
    }
    for(const b of buildingCandidates(mx,mz,reach)){
      if(b.rhp<=0)continue;
      const q=b.hangar?hangarRoofSegmentT(x0,y0,z0,x1,y1,z1,b):
        segmentAabbT(x0,y0,z0,x1,y1,z1,b.x-b.w/2,b.x+b.w/2,b.fy+b.h-.35,b.fy+b.h+.8,b.z-b.d/2,b.z+b.d/2);
      if(q!=null&&(hitT==null||q<hitT))hitT=q;
    }
    const fraction=hitT==null?1:hitT;
    g.x=x0+(x1-x0)*fraction;g.y=y0+(y1-y0)*fraction;g.z=z0+(z1-z0)*fraction;
    g.vy=next.vy;g.t-=dt;
    const surface=bunkerProjectileSurface(g.x,g.z,g.y,true);
    if(hitT!=null||g.t<=0||g.y<=surface){
      g.y=Math.max(g.y,surface);points.push({x:g.x,y:g.y,z:g.z});break;
    }
    points.push({x:g.x,y:g.y,z:g.z});
  }
  const end=points[points.length-1];
  return {points,landing:{x:end.x,z:end.z,y:bunkerProjectileSurface(end.x,end.z,end.y,true)+.05}};
}
// Començam just davant i sobre el cap, sense que la cinta travessi la cara.
// La simulació es manté intacta i el cercle marca la caiguda real.
function grenadeAimStartIndex(points,origin=P){
  const minHeight=origin.y+2.2,minimumGap=.8;
  return points.findIndex((p,i)=>i>0&&p.y>=minHeight&&
    Math.hypot(p.x-origin.x,p.z-origin.z)>=minimumGap);
}
function beginGrenadeCharge(){if(playerEject||playerFall)return false;
  if(grenadeCharge||over||paused||cv||swimming||playerFall||fcd>0||!grenadeEquipped||!inv.granada)return false;
  grenadeCharge={elapsed:0};
  return true;
}
function cancelGrenadeCharge(){
  grenadeCharge=null;
  if(grenadeAimVisual){
    const a=grenadeAimVisual;world.remove(a.line,a.circle,a.fill);
    a.line.geometry.dispose();a.line.material.dispose();
    a.circle.geometry.dispose();a.circle.material.dispose();
    a.fill.geometry.dispose();a.fill.material.dispose();
    grenadeAimVisual=null;
  }
}
function releaseGrenadeCharge(){
  if(!grenadeCharge)return false;
  const power=Math.min(1,grenadeCharge.elapsed/GRENADE_CHARGE_SECONDS);
  cancelGrenadeCharge();
  return throwGrenade(power);
}
function updateGrenadeCharge(dt){
  const vehicleAim=!!cv&&cv.t!=='heli_combat'&&!over&&!paused&&(inv.granada||0)>0;
  if(!grenadeCharge&&!vehicleAim){if(grenadeAimVisual)cancelGrenadeCharge();return}
  if(grenadeCharge&&(!grenadeEquipped||!inv.granada||cv||swimming||playerFall||paused||over)){cancelGrenadeCharge();return}
  if(grenadeCharge)grenadeCharge.elapsed=Math.min(GRENADE_CHARGE_SECONDS,grenadeCharge.elapsed+dt);
  // Actualitzar només a 25 Hz per mantenir baix el cost de les interseccions.
  const state=grenadeCharge||(updateGrenadeCharge.heliState??={visualTimer:0});
  state.visualTimer=(state.visualTimer??0)-dt;
  if(state.visualTimer>0)return;
  state.visualTimer=.04;
  const aim=vehicleAim?grenadeImpactTrajectory(0,P,P.hd,vehicleGrenadeFlight(cv)):
    grenadeImpactTrajectory(grenadeCharge.elapsed/GRENADE_CHARGE_SECONDS);
  if(!grenadeAimVisual){
    // Cinta de triangles d'uns 25 cm: una línia WebGL simple d'1 px
    // és massa fina per veure-la amb claredat en mòbils.
    const geometry=new THREE.BufferGeometry(),
          positions=new THREE.BufferAttribute(new Float32Array(97*2*3),3),indices=[];
    for(let i=0;i<96;i++)indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
    positions.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position',positions);geometry.setIndex(indices);
    const line=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
      color:0xff4949,side:THREE.DoubleSide,transparent:true,opacity:.48,
      depthWrite:false,depthTest:false
    }));
    line.frustumCulled=false;line.renderOrder=1001;
    const circle=new THREE.Mesh(new THREE.RingGeometry(.72,1.03,40).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({color:0xff4242,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false,depthTest:false}));
    const fill=new THREE.Mesh(new THREE.CircleGeometry(.72,40).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({color:0xff4242,side:THREE.DoubleSide,transparent:true,opacity:.18,depthWrite:false,depthTest:false}));
    circle.renderOrder=1002;fill.renderOrder=1001;
    world.add(line,circle,fill);grenadeAimVisual={line,circle,fill};
  }
  const a=grenadeAimVisual,attr=a.line.geometry.attributes.position,
        start=vehicleAim?0:grenadeAimStartIndex(aim.points),visiblePoints=start<0?[]:aim.points.slice(start);
  for(let i=0;i<visiblePoints.length;i++){
    const p=visiblePoints[i],before=visiblePoints[Math.max(0,i-1)],
          after=visiblePoints[Math.min(visiblePoints.length-1,i+1)],
          dx=after.x-before.x,dz=after.z-before.z,d=Math.max(.001,Math.hypot(dx,dz)),
          sx=-dz/d*.125,sz=dx/d*.125;
    attr.setXYZ(i*2,p.x-sx,p.y+.06,p.z-sz);
    attr.setXYZ(i*2+1,p.x+sx,p.y+.06,p.z+sz);
  }
  a.line.geometry.setDrawRange(0,Math.max(0,visiblePoints.length-1)*6);attr.needsUpdate=true;
  a.circle.position.set(aim.landing.x,aim.landing.y+.035,aim.landing.z);
  a.fill.position.set(aim.landing.x,aim.landing.y+.02,aim.landing.z);
}
// Granades des de qualsevol vehicle excepte l'helicòpter de combat.
// La geometria de llançament és compartida amb el servidor cooperatiu.
function vehicleGrenadeFlight(v){
  return window.HUNTER_SHARED_WEAPONS.vehicleGrenadeLaunch(v,v.o?.position.y??v.y);
}
function throwVehicleGrenade(){if(nativeCoopSession)return nativeCoopSession.channel?.combat('grenade');
  if(!cv||cv.t==='heli_combat'||over||paused||playerFall||playerEject||fcd>0)return false;
  if(!inv.granada){msg='No tens granades a l’inventari.';msgT=2;return false}
  const flight=vehicleGrenadeFlight(cv);
  if(!flight)return false;
  inv.granada--;if(inv.granada<=0){delete inv.granada;grenadeEquipped=false}
  fcd=.7;setDis(false);launchGrenade({flight});
  msg='Granades: '+(inv.granada||0);msgT=1.5;
  return true;
}
function throwHelicopterGrenade(){return cv?.t==='heli'&&throwVehicleGrenade()}
function throwGrenade(power=0){if(playerEject||playerFall)return false;if(nativeCoopSession)return nativeCoopSession.channel?.combat('grenade',power);
  if(over||cv||swimming||fcd>0||!grenadeEquipped||!inv.granada)return false;
  // Fixem el llançament quan s'allibera el botó perquè la predicció i
  // el punt de caiguda no canviïn durant l'animació de llançament.
  const flight=grenadeLaunchParams(power);
  inv.granada--;if(inv.granada<=0){delete inv.granada;grenadeEquipped=false}
  fcd=.7;setDis(false);
  pl.userData.grenadeThrow=.55;pl.userData.grenadeReleased=false;
  pl.userData.grenadeThrowPower=Math.max(0,Math.min(1,power));
  pl.userData.grenadePending={t:.23,flight};
  msg='Granades: '+(inv.granada||0);msgT=1.5;
  return true;
}
function createGrenadeModel(){
  const o=new THREE.Group(),
        body=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),new THREE.MeshStandardMaterial({color:0x46513f,roughness:.82,metalness:.08}));
  body.scale.set(.88,1.08,.88);o.add(body);
  const cap=new THREE.Mesh(new THREE.BoxGeometry(.08,.13,.08),new THREE.MeshStandardMaterial({color:0x252b27,roughness:.7,metalness:.25}));cap.position.y=.18;o.add(cap);
return o;}
function launchGrenade(pending){
  const flight=pending.flight||grenadeLaunchParams(),{x,y,z,vx,vy,vz,t}=flight,
        o=createGrenadeModel();
  o.position.set(x,y,z);world.add(o);
  grenades.push({x,y,z,vx,vy,vz,t,o,sx:x,sy:y,sz:z});
}
// Les armes pesades prioritzen riscos immediats: torres, patrulleres
// i soldats amb bazuca; després altres soldats i finalment blindats/cotxes.
// Les armes lleugeres mantenen l'ordre antic.
function weaponTargetPriority(...args){return window.HUNTER_SHARED_AIMING.weaponTargetPriority(...args)}
// La caseta es troba al voltant de y=9,15, no al mig de les potes.
// Un sol punt de referència evita discrepàncies entre punteria,
// col·lisió dels projectils, retícula i dany d'explosió.
const TOWER_CABIN_CENTER_Y=9.15,TOWER_CABIN_RADIUS=2.05;
function enemyAimCenterY(e){
  return (e.o?.position?.y??e.gy??0)+(e.t==='torre'?TOWER_CABIN_CENTER_Y:1.5);
}
function enemyAimHitRadius(e){
  return e.t==='torre'?TOWER_CABIN_RADIUS:(e.r||1)+.6;
}
// Les bales lleugeres travessen la filferrada. Només els obstacles
// sòlids bloquegen l'apuntat assistit.
function weaponAimClear(x,y,z,tx,ty,tz,ignoreWall=null,ignoreBuilding=null,checkTerrain=false){
  // Una sola consulta als índexs espacials per candidat. Evitem centenars
  // de mostres petites a cada tret de metralladora de l'helicòpter.
  const mx=(x+tx)/2,mz=(z+tz)/2,reach=Math.hypot(tx-x,tz-z)/2+3;
  for(const w of wallCandidates(mx,mz,reach)){
    if(w===ignoreWall||(ignoreBuilding&&w.owner===ignoreBuilding)||w.open||w.barbed)continue;
    const t=window.HUNTER_BUILDING_SHELL.wallShotHit({x,y,z},{x:tx,y:ty,z:tz},w);
    if(t!=null&&t<.98)return false;
  }
  for(const b of buildingCandidates(mx,mz,reach)){
    if(b===ignoreBuilding||b.rhp<=0)continue;
    const t=b.hangar
      ?hangarRoofSegmentT(x,y,z,tx,ty,tz,b)
      :segmentAabbT(x,y,z,tx,ty,tz,
        b.x-b.w/2-.6,b.x+b.w/2+.6,b.fy+b.h-.4,b.fy+b.h+1.4,
        b.z-b.d/2-.6,b.z+b.d/2+.6);
    if(t!=null&&t<.98)return false;
  }
  if(checkTerrain){
    // Només per a les armes pesades: una muntanya no pot convertir-se en
    // una diana "visible". Mostreig limitat per protegir els FPS.
    const dx=tx-x,dy=ty-y,dz=tz-z,distance=Math.hypot(dx,dy,dz),
          steps=Math.min(20,Math.max(3,Math.ceil(distance/10)));
    for(let i=1;i<steps;i++){
      const t=i/steps,px=x+dx*t,py=y+dy*t,pz=z+dz*t;
      if(py<bunkerProjectileSurface(px,pz,py)+.12)return false;
    }
  }
  return true;
}
// Bazuca: fins a 185 m; el con normal és ±47° horitzontals i ±52°
// verticals. A més, la direcció FINAL té un límit estricte de ±60°
// horitzontals (arc total 120°), fins i tot si es relaxa el selector.
const BAZOOKA_AIM_RANGE=window.HUNTER_SHARED_WEAPONS.weaponCatalog.bazooka.range,BAZOOKA_AIM_CONE=window.HUNTER_SHARED_WEAPONS.weaponCatalog.bazooka.cone,BAZOOKA_AIM_VERTICAL=window.HUNTER_SHARED_WEAPONS.weaponCatalog.bazooka.vertical;
// Pistola i fusell d'assalt comparteixen el con d'autoapuntat 3D:
// aproximadament ±35° a peu pla i fins a ±90° horitzontals en blancs
// molt més alts o baixos. L'obertura vertical és de ±90°.
const {SMALL_ARMS_AIM_CONE,SMALL_ARMS_AIM_VERTICAL,SMALL_ARMS_RANGE}=window.HUNTER_SHARED_AIMING;
// Punt d'intercepció per a patrulleres mòbils, amb la velocitat real de
// cada arma: les bales ràpides també han d'arribar al centre del casc.
function bazookaInterceptPoint(...args){return window.HUNTER_SHARED_AIMING.bazookaInterceptPoint(...args)}
// Alçada del centre del CASC, no de la coberta ni de les armes de bord.
// El model de la llanxa s'escala uniformement des del seu origen flotant.
function marineHullTargetY(e){
 return (e.o?.position?.y??0)+.48*VS.llanxa;
}
// L'adquisició comprova el con horitzontal i el vertical per separat.
// Com que la mira del jugador és horitzontal al tanc i picada a l'heli,
// la vertical es compara amb el pendent ORIGINAL de cada arma.
function autoAimWeaponShot(x,y,z,fx,fy,fz,range,cone=.97,shotClass='light',focus=null,
    projectileSpeed=0,verticalCone=Math.PI/2){
  const selector=window.HUNTER_SHARED_AIMING.createAimSelector({origin:{x,y,z},direction:[fx,fy,fz],range,cone,shotClass,focus,verticalCone,isClear:weaponAimClear}),{consider}=selector;
  for(const e of E){
    const seated=e.nativeBoardedVehicle||
      (e.enemyVehicleClaim&&['riding','waiting'].includes(e.enemyVehicleClaim.phase)
        ?e.enemyVehicleClaim.vehicle:null);
    if(seated){
      if(!seated.destroyed&&!['tanc','tanqueta'].includes(seated.t)){
        const seat=e.nativeBoardedVehicle?e.nativeEnemySeat||0:e.enemyVehicleClaim.seat,
          point=window.HUNTER_VEHICLE_OCCUPANT_DAMAGE.vehicleOccupantHeadWorld(
            seated,seat,seated.o?.position?.y??hAt(seated.x,seated.z));
        consider(e,'enemy',weaponTargetPriority(e,shotClass),point.x,point.y,point.z);
      }
      continue;
    }
    if(e.destroyed||e.hp<=0||
      shotClass==='attackCannon'&&['torre','tanqueta','tanc'].includes(e.t))continue;
    const priority=weaponTargetPriority(e,shotClass);
    if(priority>=3||shotClass==='heavy'&&priority>selector.priority)continue;
    const modelY=e.o?.position?.y??(e.gy??0),
          groundTarget=['soldat','general','jeep','tanqueta','tanc'].includes(e.t),
          underground=!!e.basement&&(e.gy??modelY)<e.basement.fy-3.9,
          baseY=underground?(e.gy??modelY):
            groundTarget?Math.max(modelY,hAt(e.x,e.z),e.gy??-Infinity):modelY,
          ty=e.t==='patrulla_marina'?marineHullTargetY(e):
            baseY+(e.t==='torre'?TOWER_CABIN_CENTER_Y:
              e.t==='tanc'?2.8:e.t==='tanqueta'?2.1:1.5),
          aim=projectileSpeed>0&&e.t==='patrulla_marina'?
            bazookaInterceptPoint(e,x,y,z,ty,projectileSpeed):{x:e.x,y:ty,z:e.z};
    consider(e,'enemy',priority,aim.x,aim.y,aim.z);
    // Quan l'ampit tapa el centre del cos, també podem apuntar a la
    // part superior del soldat. El mateix raycast comprova que sigui visible.
    if(shotClass!=='heavy'&&['soldat','general'].includes(e.t))
      consider(e,'enemy',priority,aim.x,baseY+2.35,aim.z);
  }
  // Els vehicles neutrals competeixen amb els soldats, segons l'angle
  // respecte del centre de la mirada i només amb armes lleugeres.
  if(shotClass!=='heavy')for(const v of vehicleCandidatesAt(x,z,range,true)){
    if(v.destroyed||v===cv)continue;
    const vy=v.o?.position?.y??Math.max(0,hAt(v.x,v.z));
    consider(v,'vehicle',1,v.x,vy+Math.min(2.3,vehicleRadius(v.t)*.3),v.z);
  }
  // Les finestres de la planta alta no queden a l'alçada del canó
  // quan disparam des del carrer. Si no hi ha enemics seleccionats,
  // les armes lleugeres poden adquirir directament un vidre intacte.
  if(!selector.hasTarget&&!cv&&['pistol','assault','light'].includes(shotClass)){
    for(const w of wallCandidates(x,z,Math.min(range,90))){
      if(!w.upperFloorWindow||w.open||!w.windowPanes)continue;
      for(let i=0;i<w.windowPanes.length;i++){
        if(w.brokenWindows?.has(i))continue;
        const pane=w.windowPanes[i];
        consider(w,'window',3,pane.x,(pane.y0+pane.y1)/2,pane.z);
      }
    }
  }
  // Cap blanc militar visible dins el con? Les armes pesades
  // poden buscar una bretxa a la filferrada, vehicles buits o edificis.
  if(shotClass==='heavy'&&!selector.hasTarget){
    const fallbackPriority=3;
    for(const w of wallCandidates(x,z,range)){
      if(!w.barbed||w.open||w.hp<=0)continue;
      consider(w,'fence',fallbackPriority,w.cx??(w.x0+w.x1)/2,
        Math.min(w.y1-.35,Math.max(w.y0+.6,(w.y0+w.y1)/2)),
        w.cz??(w.z0+w.z1)/2,w);
    }
    for(const v of vehicleCandidatesAt(x,z,range,true)){
      if(v.destroyed||v===cv)continue;
      const vy=v.o?.position?.y??Math.max(0,hAt(v.x,v.z));
      consider(v,'vehicle',fallbackPriority,v.x,vy+Math.min(2.3,vehicleRadius(v.t)*.3),v.z);
    }
    for(const b of buildingCandidates(x,z,range)){
      if(b.rb||b.rhp<=0)continue;
      consider(b,'building',fallbackPriority,b.x,(b.fy??hAt(b.x,b.z))+b.h*.55,b.z,null,b);
    }
  }
  return selector.direction();
}
// Retícula lleugera: la mateixa adquisició que els projectils reals,
// sense prioritat artificial per classe de diana. Vermella només pels
// soldats enemics; blanca pels vehicles. Les armes pesants no la utilitzen.
const lightReticle=document.getElementById('lightAimReticle'),
  lightReticlePoint=new THREE.Vector3();
let lightReticleRefresh=0;
function updateLightAimReticle(dt){
  if(!lightReticle)return;
  const hide=()=>{lightReticle.style.display='none'};
  if(!started||paused||over||playerFall||hp<=0||swimming||scopeActive){
    hide();lightReticleRefresh=0;return;
  }
  lightReticleRefresh-=dt;
  if(lightReticleRefresh>0)return;
  lightReticleRefresh=.06;
  let x=P.x,y=P.y+1.55,z=P.z,
    fx=-Math.sin(P.hd),fy=0,fz=-Math.cos(P.hd),
    range=SMALL_ARMS_RANGE.pistol,cone=SMALL_ARMS_AIM_CONE,
    shotClass='pistol',vertical=SMALL_ARMS_AIM_VERTICAL;
  const passenger=cv&&nativeCoopSession&&
    nativeCoopSession.appliedVehicleRows?.get(cv.saveId)?.seats?.[0]!==nativeCoopSession.self;
  if(cv&&!passenger){
    if(cv.t==='tanqueta'){
      const gun=window.HUNTER_VEHICLES.turretShot(THREE,cv.o);
      if(!gun){hide();return}
      ({x,y,z}=gun.origin);
      fx=-Math.sin(cv.hd);fz=-Math.cos(cv.hd);
      shotClass='light';range=120;cone=.97;vertical=Math.PI/2;
    }else if(cv.t==='heli_combat'){
      const hd=cv.hd,frontX=-Math.sin(hd),frontZ=-Math.cos(hd),
        c=Math.cos(Math.PI/6);
      x=cv.x+frontX*4.1*VS.heli_combat;
      y=cv.o.position.y+.15;z=cv.z+frontZ*4.1*VS.heli_combat;
      fx=frontX*c;fy=-.5;fz=frontZ*c;
      shotClass='attackCannon';range=130;cone=.73;vertical=.97;
    }else if(!OPEN_RIDER_PISTOL.has(cv.t)){hide();return;}
    else {y=(cv.o?.position.y??P.y)+1.65;}
  }else if(!cv){
    if(bazookaEquipped||grenadeEquipped||knifeEquipped||cisallaEquipped){
      hide();return;
    }
    if(assaultRifleEquipped){
      shotClass='assault';range=SMALL_ARMS_RANGE.assault;
    }else if(sniperEquipped){
      shotClass='light';range=180;cone=.984;
    }
  }
  const focus={};
  autoAimWeaponShot(x,y,z,fx,fy,fz,range,cone,shotClass,focus,0,vertical);
  const obj=focus.target,enemySoldier=focus.kind==='enemy'&&
    (obj?.t==='soldat'||obj?.t==='general'),
    vehicle=focus.kind==='vehicle'||focus.kind==='enemy'&&
    ['jeep','tanqueta','tanc','patrulla_marina'].includes(obj?.t);
  if(!focus.point||!enemySoldier&&!vehicle){hide();return;}
  cam.updateMatrixWorld();
  lightReticlePoint.set(focus.point.x,focus.point.y,focus.point.z).project(cam);
  if(lightReticlePoint.z<-1||lightReticlePoint.z>1||
    Math.abs(lightReticlePoint.x)>1||Math.abs(lightReticlePoint.y)>1){
    hide();return;
  }
  lightReticle.style.display='block';
  lightReticle.classList.toggle('enemy',enemySoldier);
  lightReticle.style.left=(50+lightReticlePoint.x*50)+'%';
  lightReticle.style.top=(50-lightReticlePoint.y*50)+'%';
}
// La retícula i el míssil de l'helicòpter comparteixen la mateixa
// trajectòria menys picada, el mateix abast i el mateix autoapuntat.
const HELI_MISSILE_ANGLE=Math.PI*25/180,HELI_MISSILE_RANGE=210;
// Una sola solució per als coets de la llanxa pilotable. La retícula
// i el projectil comparteixen origen, elevació i autoapuntat.
function combatBoatRocketAim(v,focus=null){
  const fx=-Math.sin(v.hd),fz=-Math.cos(v.hd),
        x=v.x+fx*6,y=v.o.position.y+1.2,z=v.z+fz*6,
        base=Math.hypot(1,.015);
  return {x,y,z,direction:autoAimWeaponShot(x,y,z,
    fx/base,.015/base,fz/base,105,.82,'heavy',focus,68*HEAVY_SHOT_SPEED_FACTOR,.8)};
}
function combatHeliMissileAim(v,focus=null){
  const fx=-Math.sin(v.hd),fz=-Math.cos(v.hd),horizontal=Math.cos(HELI_MISSILE_ANGLE),
        x=v.x+fx*5,y=v.o.position.y+1,z=v.z+fz*5;
  return {x,y,z,direction:autoAimWeaponShot(x,y,z,fx*horizontal,-Math.sin(HELI_MISSILE_ANGLE),
    fz*horizontal,HELI_MISSILE_RANGE,.70,'heavy',focus,72*HEAVY_SHOT_SPEED_FACTOR,.97)};
}
// Retícula del bazooka: empra EXACTAMENT les coordenades i el con de
// selecció d'autoapuntat del tret real. Blanca si apunta lliurement,
// verda quan hi ha una diana enemiga seleccionada.
const bazookaReticleElement=document.getElementById('bazookaReticle');
const bazookaReticleWorld=new THREE.Vector3(),bazookaReticleScreen=new THREE.Vector3();
let bazookaReticleTimer=0,bazookaReticleHasHit=false,bazookaReticleMode=null;
// Primera superfície real a la trajectòria; cap objectiu => cap retícula
// damunt de mar buit o horitzó. No altera en absolut la balística.
function bazookaFirstSolidHit(x,y,z,dx,dy,dz,range=BAZOOKA_AIM_RANGE,sourceVehicle=null){
  const tx=x+dx*range,ty=y+dy*range,tz=z+dz*range,
        mx=(x+tx)/2,mz=(z+tz)/2,reach=Math.hypot(tx-x,tz-z)/2;
  let best=Infinity;
  const consider=t=>{if(t!=null&&t>=0&&t<=1&&t<best)best=t};
  for(const w of wallCandidates(mx,mz,reach+2)){
    if(w.open)continue;
    consider(segmentAabbT(x,y,z,tx,ty,tz,w.x0,w.x1,w.y0,w.y1,w.z0,w.z1));
  }
  for(const b of buildingCandidates(mx,mz,reach+2)){
    if(b.rhp<=0)continue;
    consider(b.hangar?hangarRoofSegmentT(x,y,z,tx,ty,tz,b)
      :segmentAabbT(x,y,z,tx,ty,tz,b.x-b.w/2-.6,b.x+b.w/2+.6,
        b.fy+b.h-.4,b.fy+b.h+1.4,b.z-b.d/2-.6,b.z+b.d/2+.6));
  }
  for(const e of enemyCandidatesAt(mx,mz,reach+16)){
    if(e.destroyed||e.hp<=0)continue;
    const marine=e.t==='patrulla_marina';
    consider(marine?marineHullSegmentT(x,y,z,tx,ty,tz,e):
      segmentSphereT(x,y,z,tx,ty,tz,e.x,
        enemyAimCenterY(e),e.z,enemyAimHitRadius(e)));
  }
  for(const v of vehicleCandidatesAt(mx,mz,reach+12,true)){
    // El propi vehicle mai no intercepta l'origen del seu dispar.
    if(v.destroyed||v===sourceVehicle)continue;
    consider(segmentSphereT(x,y,z,tx,ty,tz,v.x,
      (v.o?.position.y??Math.max(0,hAt(v.x,v.z)))+1,v.z,vehicleRadius(v.t)*.62));
  }
  const steps=Math.ceil(range/3);
  for(let k=1;k<=steps;k++){
    const t=k/steps;if(t>=best)break;
    const px=x+(tx-x)*t,pz=z+(tz-z)*t,py=y+(ty-y)*t;
    if(py<Math.max(hAt(px,pz),0)+.2){consider(t);break}
  }
  if(!Number.isFinite(best))return null;
  return {x:x+(tx-x)*best,y:y+(ty-y)*best,z:z+(tz-z)*best};
}
function updateBazookaReticle(dt){
  if(!bazookaReticleElement)return;
  // Una sola retícula per bazuca, tanc, llanxa llançacoets i
  // míssils de l'helicòpter (no per la metralladora).
  const mode=!started||paused||over||playerFall?null:
    cv?.t==='tanc'?'tank':
    cv?.t==='llanxa_coets'?'boat':
    cv?.t==='heli_combat'&&(cv.rockets||0)>0?'missile':
    !cv&&!swimming&&bazookaEquipped&&(inv.bazooka||0)>0?'bazooka':null;
  if(!mode){
    bazookaReticleElement.style.display='none';
    bazookaReticleTimer=0;bazookaReticleHasHit=false;bazookaReticleMode=null;return;
  }
  if(mode!==bazookaReticleMode){
    bazookaReticleMode=mode;bazookaReticleTimer=0;
    bazookaReticleHasHit=false;
  }
  bazookaReticleTimer-=dt;
  if(bazookaReticleTimer<=0){
    bazookaReticleTimer=.08;
    let hit=null,locked=false;
    if(mode==='tank'){
      // El projectil surt del canó visible, no del centre del tanc.
      // El punt blanc és l'impacte REAL de la direcció de la torreta.
      const gun=window.HUNTER_VEHICLES.turretShot(THREE,cv.o);
      if(gun){
        const o=gun.origin,d=gun.direction,focus={};
        hit=bazookaFirstSolidHit(o.x,o.y,o.z,d.x,d.y,d.z,220,cv);
        // Sense obstacle, el punt d'apuntat és la projecció a distància.
        const aimPoint=hit||{x:o.x+d.x*160,y:o.y+d.y*160,z:o.z+d.z*160};
        bazookaReticleWorld.set(aimPoint.x,aimPoint.y,aimPoint.z);
        // La retícula usa la mateixa cerca i prioritat que la torreta,
        // però només es torna verda quan el tret REAL ja coincideix
        // amb la diana. Evitam prometre un impacte abans d'alinear-la.
        const faceX=-Math.sin(cv.hd),faceZ=-Math.cos(cv.hd);
        autoAimArmoredShot(o.x,o.y,o.z,faceX,faceZ,220,
          'heavy',85*HEAVY_SHOT_SPEED_FACTOR,focus);
        const target=focus.point,enemy=focus.target;
        if(hit&&target&&enemy){
          if(focus.kind==='building')
            locked=Math.abs(hit.x-enemy.x)<=enemy.w/2+1.2&&
              Math.abs(hit.z-enemy.z)<=enemy.d/2+1.2;
          else locked=Math.hypot(hit.x-target.x,hit.y-target.y,hit.z-target.z)<
            (focus.kind==='fence'?3.4:focus.kind==='vehicle'?
              vehicleRadius(enemy.t)*.7+1.5:enemyAimHitRadius(enemy)+1.5);
        }
      }
    }else if(mode==='boat'){
      const focus={},shot=combatBoatRocketAim(cv,focus),d=shot.direction;
      hit=focus.point||bazookaFirstSolidHit(shot.x,shot.y,shot.z,
        d[0],d[1],d[2],105,cv);
      // A mar obert continua visible, igual que la mira del tanc.
      const aimPoint=hit||{x:shot.x+d[0]*105,
        y:shot.y+d[1]*105,z:shot.z+d[2]*105};
      bazookaReticleWorld.set(aimPoint.x,aimPoint.y,aimPoint.z);
      locked=!!focus.target;
    }else if(mode==='missile'){
      // La retícula segueix el míssil de G (25° cap avall), no el
      // canó lleuger de F, i desapareix quan no hi ha míssils.
      const focus={},shot=combatHeliMissileAim(cv,focus),d=shot.direction;
      hit=focus.point||bazookaFirstSolidHit(shot.x,shot.y,shot.z,
        d[0],d[1],d[2],HELI_MISSILE_RANGE,cv);
      const aimPoint=hit||{x:shot.x+d[0]*HELI_MISSILE_RANGE,y:shot.y+d[1]*HELI_MISSILE_RANGE,
        z:shot.z+d[2]*HELI_MISSILE_RANGE};
      bazookaReticleWorld.set(aimPoint.x,aimPoint.y,aimPoint.z);
      locked=!!focus.target;
    }else{
      const fx=-Math.sin(P.hd),fz=-Math.cos(P.hd),
            ox=P.x+fx*1.35,oy=P.y+1.9-(playerCrouched?.48:0),oz=P.z+fz*1.35,
            base=Math.hypot(1,.01),focus={},
            direction=window.HUNTER_SHARED_AIMING.limitBazookaHorizontalAim(
              autoAimWeaponShot(ox,oy,oz,fx/base,.01/base,fz/base,
                BAZOOKA_AIM_RANGE,BAZOOKA_AIM_CONE,'heavy',focus,
                72*HEAVY_SHOT_SPEED_FACTOR,BAZOOKA_AIM_VERTICAL),
              fx,fz,focus);
      hit=focus.point||bazookaFirstSolidHit(ox,oy,oz,
        direction[0],direction[1],direction[2]);
      locked=!!focus.target;
    }
    bazookaReticleHasHit=!!hit||mode==='tank'||mode==='missile'||mode==='boat';
    if(hit)bazookaReticleWorld.set(hit.x,hit.y,hit.z);
    bazookaReticleElement.classList.toggle('locked',locked);
  }
  if(!bazookaReticleHasHit){bazookaReticleElement.style.display='none';return}
  cam.updateMatrixWorld();
  bazookaReticleScreen.copy(bazookaReticleWorld).project(cam);
  const p=bazookaReticleScreen;
  const vehicleAim=bazookaReticleMode==='tank'||bazookaReticleMode==='missile'||bazookaReticleMode==='boat',
        behind=!Number.isFinite(p.z)||p.z<-1||p.z>1,
        outside=behind||Math.abs(p.x)>1||Math.abs(p.y)>1;
  if(outside&&!vehicleAim){
    bazookaReticleElement.style.display='none';return;
  }
  // Si la trajectòria surt del camp visual, mantenim la retícula al
  // marge amb menys intensitat en comptes de fer-la desaparèixer.
  const sx=behind?.5:Math.max(.06,Math.min(.94,(p.x+1)/2)),
        sy=behind?.5:Math.max(.06,Math.min(.94,(1-p.y)/2));
  bazookaReticleElement.style.display='block';
  bazookaReticleElement.style.opacity=outside&&vehicleAim?'0.55':'1';
  bazookaReticleElement.style.left=(sx*100)+'%';
  bazookaReticleElement.style.top=(sy*100)+'%';
}
// Conservem el punt de sortida horitzontal del tanc i la tanqueta (0 graus).
function autoAimArmoredShot(x,y,z,fx,fz,range,shotClass='heavy',projectileSpeed=0,focus=null){
  const profile=window.HUNTER_SHARED_AIMING.ARMORED_AIM[shotClass==='heavy'?'heavy':'light'];
  return autoAimWeaponShot(x,y,z,fx,0,fz,range,profile.cone,shotClass,focus,projectileSpeed,profile.vertical);
}
// Rifle: sortida REAL des de l'extrem del canó. En mode mira el model
// invisible s'orienta com l'òptica; P.hd i el moviment no canvien.
function sniperMuzzleWorld(heading,pitch=0){
  const rifle=pl.userData.sniper,muzzle=pl.userData.sniperMuzzle;
  if(!rifle||!muzzle)throw new Error('Falta el pivot del canó del franctirador');
  rifle.rotation.set(pitch,heading-P.hd,0,'YXZ');
  pl.position.set(P.x,P.y,P.z);
  pl.rotation.y=P.hd;
  pl.updateMatrixWorld(true);
  return muzzle.getWorldPosition(new THREE.Vector3());
}
// Primer obstacle sota el centre del reticle (mateixes col·lisions que les
// bales). Apuntar a un talús no ha de generar una bala desviada cap al terra.
function sniperReticlePoint(focus,range=1000){
  const ox=P.x+Math.sin(scopeYaw)*.12,oy=P.y+1.76,
        oz=P.z+Math.cos(scopeYaw)*.12,
        tx=ox+focus.dx*range,ty=oy+focus.dy*range,tz=oz+focus.dz*range,
        mx=(ox+tx)/2,mz=(oz+tz)/2,reach=Math.hypot(tx-ox,tz-oz)/2+8;
  let bestT=1;
  const consider=t=>{if(t!=null&&t>0&&t<bestT)bestT=t};
  for(const w of wallCandidates(mx,mz,reach)){
    if(!w.open&&!w.barbed)consider(window.HUNTER_BUILDING_SHELL.wallShotHit({x:ox,y:oy,z:oz},{x:tx,y:ty,z:tz},w));
  }
  for(const b of buildingCandidates(mx,mz,reach)){
    if(b.rhp<=0)continue;
    const hit=b.hangar?hangarRoofSegmentT(ox,oy,oz,tx,ty,tz,b):
      segmentAabbT(ox,oy,oz,tx,ty,tz,
        b.x-b.w/2-.6,b.x+b.w/2+.6,b.fy+b.h-.4,b.fy+b.h+1.4,
        b.z-b.d/2-.6,b.z+b.d/2+.6);
    consider(hit);
  }
  for(const e of enemyCandidatesAt(mx,mz,reach+4)){
    if(e.hp<=0||e.destroyed)continue;
    consider(segmentSphereT(ox,oy,oz,tx,ty,tz,
      e.x,enemyAimCenterY(e),e.z,enemyAimHitRadius(e)));
  }
  for(const v of vehicleCandidatesAt(mx,mz,reach+12,true)){
    if(v.destroyed)continue;
    const baseY=v.o?.position?.y??Math.max(0,hAt(v.x,v.z));
    consider(segmentSphereT(ox,oy,oz,tx,ty,tz,
      v.x,baseY+1,v.z,vehicleRadius(v.t)*.62));
  }
  // Mostreig del terreny de 3 m, amb refinament binari del punt d'impacte.
  const samples=Math.ceil(range/3),surfaceDifference=t=>{
    const x=ox+(tx-ox)*t,y=oy+(ty-oy)*t,z=oz+(tz-oz)*t;
    return y-(bunkerProjectileSurface(x,z,y)+.04);
  };
  let prev=0;
  for(let k=1;k<=samples;k++){
    const t=k/samples;
    if(t>=bestT)break;
    if(surfaceDifference(t)<0){
      let lo=prev,hi=t;
      for(let j=0;j<9;j++){
        const mid=(lo+hi)*.5;
        if(surfaceDifference(mid)<0)hi=mid;else lo=mid;
      }
      bestT=Math.min(bestT,hi);break;
    }
    prev=t;
  }
  return new THREE.Vector3(ox+(tx-ox)*bestT,oy+(ty-oy)*bestT,oz+(tz-oz)*bestT);
}
function sniperShotVector(muzzle,target,focus){
  const d=target.clone().sub(muzzle),
        heading=new THREE.Vector3(focus.dx,focus.dy,focus.dz);
  // Per a obstacles que estan darrere de la boca, mai disparar enrere.
  if(d.lengthSq()<16||d.dot(heading)<0)return heading;
  return d.normalize();
}
// Cisalla: treu només el tram proper i encaradís, sense cap alerta ni so.
function cutBarbedWire(){
 if(!cisallaEquipped||!inv.cisalla||cv||swimming||playerFall||playerEject||over||fcd>0)
   return false;
 const target=window.HUNTER_SHARED_WEAPONS.nearestWire(P,wallCandidates(P.x,P.z,3.75));
 if(!target){
   fcd=.28;msg='Acosta’t a una filferrada i mira-la per tallar-la.';msgT=1.6;
   return false;
 }
 target.hp=0;target.cut=true;
 for(const piece of target.parts?.length?target.parts:[target.m]){
   piece.visible=false;piece.parent?.remove(piece);
 }
 const index=Wl.indexOf(target);if(index>=0){Wl.splice(index,1);wallGridCount=-1}
 const doorIndex=Dr.indexOf(target);if(doorIndex>=0)Dr.splice(doorIndex,1);
 pl.userData.cisallaCut=.46;fcd=.52;
 msg='Filferrada tallada silenciosament.';msgT=1.4;
 return true;
}
// Origen de cada bala: boca REAL del canó, transformada des del rig
// articulat (inclou escala, animació, agachament i gir del jugador).
// No forçam P.y: la posició visual ja incorpora les cames i el sòl.
function assaultMuzzleWorld(){
  const u=pl.userData,muzzle=u.assaultMuzzle;
  if(!u.assault||!muzzle)throw new Error('Falta el pivot del canó del fusell d\'assalt');
  u.assault.rotation.x=-u.upperBody.rotation.x;
  u.assault.rotation.y=-u.upperBody.rotation.y;
  pl.position.x=P.x;pl.position.z=P.z;pl.rotation.y=P.hd;
  pl.updateMatrixWorld(true);
  return muzzle.getWorldPosition(new THREE.Vector3());
}
// Ràfega de tres bales, separades 75 ms. Cap temporitzador real:
// els tres trets avancen amb el temps de simulació, sense saltar-se pauses.
const assaultBurst={remaining:0,delay:0};
function cancelAssaultBurst(){window.HUNTER_SHARED_COMBAT.cancelBurst(assaultBurst)}
function fireAssaultBurstBullet(index){
  if(!assaultRifleEquipped||!inv.fusell_assalt||cv||swimming||over||paused||
     playerFall||playerEject||hp<=0||ammo<=0)return false;
  ammo--;
  pl.userData.firePose=.26;
  const muzzle=assaultMuzzleWorld(),hd=P.hd,fx=-Math.sin(hd),fz=-Math.cos(hd),
        x=muzzle.x,y=muzzle.y,z=muzzle.z,
        // Con 3D ampliat: torres per damunt i soldats a sota de l'horitzó.
        // La classe 'assault' només defineix la punteria: el projectil
        // disparat continua essent lleuger i no causa dany a les torres.
        [ax,ay,az]=autoAimWeaponShot(x,y,z,fx,0,fz,SMALL_ARMS_RANGE.assault,
          SMALL_ARMS_AIM_CONE,'assault',null,130,SMALL_ARMS_AIM_VERTICAL),
        spread=[-.012,0,.012][index],dx=ax-az*spread,dz=az+ax*spread,
        len=Math.hypot(dx,ay,dz)||1;
  // La diana es recalcula a cada bala i cada ràfega. Si l'enemic cau
  // mentrestant, la següent bala pot adquirir un altre blanc.
  shoot(x,y,z,dx/len,ay/len,dz/len,130,COMBAT_BALANCE.weapons.pistol,0,'p',mW,SMALL_ARMS_SCALE);
  return true;
}
function beginAssaultBurst(){
 if(assaultBurst.remaining)return false;
 if(ammo<3){msg='Fusell d’assalt: calen 3 cartutxos per ràfega.';msgT=1.5;return false}
 if(!window.HUNTER_SHARED_COMBAT.beginBurst(assaultBurst,ammo,fireAssaultBurstBullet))return false;
 fcd=.34;return true;
}
function updateAssaultBurst(dt){
 const allowed=assaultRifleEquipped&&inv.fusell_assalt&&!cv&&!swimming&&!over&&!paused&&!playerFall&&!playerEject&&hp>0;
 window.HUNTER_SHARED_COMBAT.stepBurst(assaultBurst,dt,allowed,fireAssaultBurstBullet);
}
// La pistola personal és utilitzable només des dels vehicles oberts.
const OPEN_RIDER_PISTOL=new Set(window.HUNTER_SHARED_WEAPONS.openRiderTypes);
function executePlayerFire(){if(playerEject||playerFall)return false;if(cisallaEquipped&&!cv)return cutBarbedWire();if(knifeEquipped&&!cv)return melee();if(over||swimming||fcd>0)return;const c=cv&&cv.t,hd=cv?cv.hd:P.hd,fx_=-Math.sin(hd),fz=-Math.cos(hd);
if(c=='tanc'||c=='tanqueta'){
  // El projectil segueix el canó real mentre la torreta gira: no
  // s'alinea artificialment amb l'objectiu en prémer Dispar.
  const gun=window.HUNTER_VEHICLES.turretShot(THREE,cv.o);
  if(!gun)return;
  const {origin:p,direction:d}=gun;
  if(c=='tanc'){
    fcd=.9;shoot(p.x,p.y,p.z,d.x,d.y,d.z,85,COMBAT_BALANCE.weapons.tank,8,'p',mS,2.2);
    Pj[Pj.length-1].life=4.4;
  }else{
    fcd=TANKETTE_FIRE_INTERVAL;shoot(p.x,p.y,p.z,d.x,d.y,d.z,135,COMBAT_BALANCE.weapons.tankette,0,'p',mW,SMALL_ARMS_SCALE);
  }
}
else if(c==='heli'){throwHelicopterGrenade();return}
else if(c=='heli_combat'){const a30=Math.PI/6,ch=Math.cos(a30),sv=Math.sin(a30),x=cv.x+fx_*4.1*VS.heli_combat,y=cv.o.position.y+.15,z=cv.z+fz*4.1*VS.heli_combat;const [ax,ay,az]=autoAimWeaponShot(x,y,z,fx_*ch,-sv,fz*ch,130,.73,'attackCannon',null,145,.97);fcd=.12;shoot(x,y,z,ax,ay,az,145,COMBAT_BALANCE.weapons.attackCannon,0,'p',mB,.85)}

else if(c=='llanxa_coets'){secondaryWeapon();return}
else if(c&&OPEN_RIDER_PISTOL.has(c)){
  // Un tret amb la pistola, des de la mà dreta del pilot, mantenint
  // el mateix consum, dany, cadència i autoapuntat que quan va a peu.
  if(ammo<=0)return;
  const shot=riderSystem.firePistol(cv,(origin,direction)=>
    autoAimWeaponShot(origin.x,origin.y,origin.z,
      direction.x,direction.y,direction.z,SMALL_ARMS_RANGE.pistol,
      SMALL_ARMS_AIM_CONE,'pistol',null,130,SMALL_ARMS_AIM_VERTICAL));
  if(!shot)return;
  ammo--;fcd=.22;
  const p=shot.origin,d=shot.direction;
  shoot(p.x,p.y,p.z,d.x,d.y,d.z,130,COMBAT_BALANCE.weapons.pistol,0,'p',mW,SMALL_ARMS_SCALE);
}
else if(!cv&&assaultRifleEquipped&&inv.fusell_assalt){
  // F mantinguda torna a iniciar la següent ràfega quan expira el cooldown.
  if(!beginAssaultBurst())return;
}
else if(!cv&&sniperEquipped&&inv.franctirador){
  if(sniperAmmo<=0){msg='El rifle no té munició.';msgT=2;return}
  sniperAmmo--;fcd=1.05;pl.userData.firePose=.42;
  // Origen físic del projectil: punta del rifle, no tors ni ull.
  // Amb zoom, la trajectòria convergeix al primer punt sota el reticle.
  const heading=scopeActive?scopeYaw:hd,
        muzzle=sniperMuzzleWorld(heading,scopeActive?scopePitch:0),
        fx=-Math.sin(heading),fz=-Math.cos(heading),
        focus=scopeActive?window.HUNTER_SCOPE_FOCUS.create(P.x,P.y+1.76,P.z,scopeYaw,scopePitch):null,
        direction=focus
          ?sniperShotVector(muzzle,sniperReticlePoint(focus),focus)
          :new THREE.Vector3(...autoAimWeaponShot(muzzle.x,muzzle.y,muzzle.z,fx,0,fz,180,.984,'light',null,470));
  shoot(muzzle.x,muzzle.y,muzzle.z,direction.x,direction.y,direction.z,470,COMBAT_BALANCE.weapons.sniper,0,'p',mW,SMALL_ARMS_SCALE);
  msg='Rifle: '+sniperAmmo+' cartutxos.';msgT=1.5;
}
else if(!cv&&grenadeEquipped&&inv.granada){throwGrenade();return}
else if(!cv&&bazookaEquipped&&inv.bazooka){if(--inv.bazooka<=0){delete inv.bazooka;bazookaEquipped=false}fcd=1.05;pl.userData.firePose=.42;const x=P.x+fx_*1.35,y=P.y+1.9-(playerCrouched?.48:0),z=P.z+fz*1.35,base=Math.hypot(1,.01),[ax,ay,az]=window.HUNTER_SHARED_AIMING.limitBazookaHorizontalAim(autoAimWeaponShot(x,y,z,fx_/base,.01/base,fz/base,BAZOOKA_AIM_RANGE,BAZOOKA_AIM_CONE,'heavy',null,72*HEAVY_SHOT_SPEED_FACTOR,BAZOOKA_AIM_VERTICAL),fx_,fz);shoot(x,y,z,ax,ay,az,72,COMBAT_BALANCE.weapons.bazooka,18,'pb',mS,3);Pj[Pj.length-1].life=3.8;Pj[Pj.length-1].weapon='bazooka';msg='Bazooka: '+(inv.bazooka||0)+' coets restants.';msgT=2;setDis(false)}
else if(!cv&&ammo>0){ammo--;fcd=.22;pl.userData.firePose=.32;pl.userData.pistolAimTime=.32;pl.userData.pistolShotAge=0;const x=P.x+fx_*.7,y=P.y+1.5-(playerCrouched?.48:0),z=P.z+fz*.7,[ax,ay,az]=autoAimWeaponShot(x,y,z,fx_,0,fz,SMALL_ARMS_RANGE.pistol,SMALL_ARMS_AIM_CONE,'pistol',null,130,SMALL_ARMS_AIM_VERTICAL);shoot(x,y,z,ax,ay,az,130,COMBAT_BALANCE.weapons.pistol,0,'p',mW,SMALL_ARMS_SCALE)}
else if(!cv&&ammo<=0){melee();return}else return;setDis(false)}
function segmentAabbT(...args){return window.HUNTER_SHARED_COMBAT.segmentAabbT(...args)}
function segmentSphereT(...args){return window.HUNTER_SHARED_COMBAT.segmentSphereT(...args)}
// La patrullera no és una esfera de deu metres: només comptam el buc
// allargat i la cabina, alineats amb el seu rumb. Això evita que una
// bala que passa clarament per damunt provoqui dany fictici.
function marineHullSegmentT(x0,y0,z0,x1,y1,z1,boat){
  const scale=VS.llanxa,baseY=boat.o.position.y,
        sine=Math.sin(boat.hd||0),cosine=Math.cos(boat.hd||0);
  const local=(x,z)=>[(x-boat.x)*cosine-(z-boat.z)*sine,
                     (x-boat.x)*sine+(z-boat.z)*cosine];
  const [ax,az]=local(x0,z0),[bx,bz]=local(x1,z1);
  const hull=segmentAabbT(ax,y0,az,bx,y1,bz,
    -1.85*scale,1.85*scale,baseY-.22*scale,baseY+1.08*scale,
    -4.5*scale,4.5*scale);
  const cabin=segmentAabbT(ax,y0,az,bx,y1,bz,
    -1.5*scale,1.5*scale,baseY+1.02*scale,baseY+2.12*scale,
    -1.0*scale,2.85*scale);
  return hull==null?cabin:cabin==null?hull:Math.min(hull,cabin);
}
function hangarRoofSegmentT(x0,y0,z0,x1,y1,z1,b){
  const segs=b.roof?.userData?.hitSegments;if(!segs?.length)return null;
  let best=null;
  for(const s of segs){
    const rz=s.a-Math.PI/2,c=Math.cos(rz),sn=Math.sin(rz),
          ax=x0-b.x-s.x,ay=y0-b.fy-s.y,az=z0-b.z,
          bx=x1-b.x-s.x,by=y1-b.fy-s.y,bz=z1-b.z,
          lx0=ax*c+ay*sn,ly0=-ax*sn+ay*c,
          lx1=bx*c+by*sn,ly1=-bx*sn+by*c,
          t=segmentAabbT(lx0,ly0,az,lx1,ly1,bz,-s.chord/2,s.chord/2,-.16,.16,-s.depth/2,s.depth/2);
    if(t!=null&&(best==null||t<best))best=t
  }
  return best
}
function updPj(dt){
  for(let i=Pj.length-1;i>=0;i--){
    const p=Pj[i],flight=window.HUNTER_SHARED_PROJECTILES.projectileStep(p,dt),{from,to,delta,consider}=flight,
          x0=from.x,y0=from.y,z0=from.z,x1=to.x,y1=to.y,z1=to.z,sx=delta.x,sy=delta.y,sz=delta.z,horiz=Math.hypot(sx,sz),
          mx=(x0+x1)/2,mz=(z0+z1)/2,reach=horiz/2;
    p.life=flight.life;

    // A window is a real ballistic aperture even while its glass is intact.
    const windowHits=[];
    for(const w of wallCandidates(mx,mz,reach+1)){
      // Bales de pistola, rifle, soldats, cotxes i tanquetes: passen.
      // Míssils, coets i canons explosius continuen colpejant el filferro.
      if(w.open||(w.barbed&&p.shotClass==='light'))continue;
      const crossing=window.HUNTER_BUILDING_SHELL.windowCrossing(from,to,w);
      if(crossing){windowHits.push({wall:w,...crossing});continue}
      consider(window.HUNTER_BUILDING_SHELL.wallShotHit(from,to,w),'wall',w)
    }
    for(const b of buildingCandidates(mx,mz,reach+1)){
      if(b.rhp<=0)continue;
      const bt=b.hangar
        ?hangarRoofSegmentT(x0,y0,z0,x1,y1,z1,b)
        :segmentAabbT(x0,y0,z0,x1,y1,z1,b.x-b.w/2-.6,b.x+b.w/2+.6,b.fy+b.h-.4,b.fy+b.h+1.4,b.z-b.d/2-.6,b.z+b.d/2+.6);
      consider(bt,'building',b)
    }

    // Personatges i vehicles: intersecció contínua amb volum esfèric aproximat.
    // Neutrals share the nearest-hit comparison with cover and other bodies.
    // They are deliberately absent from all auto-aim candidate sets.
    for(const civilian of prisonerSystem.entities){
      if(civilian.hp<=0||civilian.destroyed)continue;
      const radius=civilian.radius||.55;
      consider(segmentAabbT(x0,y0,z0,x1,y1,z1,
        civilian.x-radius,civilian.x+radius,civilian.y,civilian.y+(civilian.height||1.85),
        civilian.z-radius,civilian.z+radius),'civilian',civilian);
    }
    if(p.own==='p'||p.own==='pb'){
      // També cercam els centres de llanxes situats a cel·les veïnes
      // quan només la proa o la popa intercepten el segment del coet.
      for(const u of enemyCandidatesAt(mx,mz,reach+vehicleRadius('llanxa')*.62+4)){
        if(u.enemyVehicleClaim&&['riding','waiting'].includes(u.enemyVehicleClaim.phase))continue;
        const marine=u.t==='patrulla_marina',
              cy=enemyAimCenterY(u),
              radius=enemyAimHitRadius(u);
        consider(marine?marineHullSegmentT(x0,y0,z0,x1,y1,z1,u):
          segmentSphereT(x0,y0,z0,x1,y1,z1,u.x,cy,u.z,radius),'enemy',u)
      }
    }
    for(const v of vehicleCandidatesAt(mx,mz,reach+12,true)){
      // La bala surt de l'arma del passatger, no pot impactar el seu propi vehicle.
      if(v===p.sourceVehicle||(p.own==='p'||p.own==='pb')&&v===cv)continue;
      const vy=v.o?.position?.y??Math.max(0,hAt(v.x,v.z)),rr=vehicleRadius(v.t)*.62,
        people=p.own==='e'&&v===cv?[P,null]:
          p.own==='e'?[null,null]:(v.enemyCrew||[]).map(u=>u?.enemyVehicleClaim&&['riding','waiting'].includes(u.enemyVehicleClaim.phase)?u:null),
        seatHit=!p.spl?window.HUNTER_VEHICLE_OCCUPANT_DAMAGE.vehicleSeatProjectileContact(
          from,to,v,people,{baseY:vy}):null;
      // Un impacte a la cabina és al vidre / ocupant abans que al casc.
      if(seatHit)consider(seatHit.t,seatHit.kind,{vehicle:v,...seatHit});
      else consider(window.HUNTER_SHARED_COMBAT.vehicleHullSegmentT(
        from,to,v,vy,rr),'vehicle',v);
    }
    if(p.own==='e'&&!cv)consider(segmentSphereT(x0,y0,z0,x1,y1,z1,P.x,P.y+(playerCrouched?1.25:1.5),P.z,playerCrouched?1.05:1.2),'player',P);

    // Terreny i arbres continuen mostrejats a una densitat equivalent a l'antic substep.
    const sampleN=Math.max(1,Math.ceil(Math.hypot(sx,sy,sz)/1.15));
    for(let k=1;k<=sampleN;k++){
      const t=k/sampleN;if(t>=flight.fraction)break;
      const x=x0+sx*t,y=y0+sy*t,z=z0+sz*t,ground=bunkerProjectileSurface(x,z,y)+.04;
      if(y<ground){consider(t,'terrain',null);break}
      // Les palmeres exteriors no bloquegen bales que viatgen sota
      // el forjat del búnquer, encara que la seva ombra vertical hi coincideixi.
      const p=activeBunker?.basement?buildingLocalPoint(activeBunker,x,z):null;
      const underground=!!p&&y<activeBunker.fy-1&&
        Math.abs(p.x)<19&&Math.abs(p.z)<16;
      const tree=underground?null:treeAt(x,z,.5);
      if(tree&&y<Math.max(hAt(x,z),0)+(tree.p?6.5:1.5)){consider(t,'tree',tree);break}
    }

    const {hit,kind,target,point}=flight.finish();
    for(const pane of windowHits)if(pane.t<=flight.fraction+1e-6)shatterWindow(pane.wall,pane.index,pane.point,p);
    p.x=point.x;p.y=point.y;p.z=point.z;p.o.position.set(p.x,p.y,p.z);
    if(!hit)continue;

    const ineffective=projectileImpactImmune(kind,target,p);
    if(p.spl&&ineffective)spawnBulletImpact('ricochet',p.x,p.y,p.z,p);
    if(!p.spl){
      // La mateixa detecció de col·lisions dona feedback en ambdós sentits.
      // Soldats/general/jugador: sang discreta; altres dianes: espurnes.
      const solid=kind==='wall'||kind==='building'||kind==='vehicle'||kind==='enemy';
      if(ineffective)spawnBulletImpact('ricochet',p.x,p.y,p.z,p);
      else if(solid&&!(kind==='enemy'&&(target.t==='soldat'||target.t==='general')))spawnBulletImpact('spark',p.x,p.y,p.z,p);
      if(kind==='wall'){if(!isMilitaryWall(target)||target.woodenDoor)dmgW(target,p.dmg,p.shotClass||'light')}
      else if(kind==='building'){if(!isMilitaryBuilding(target)){target.rhp-=p.dmg;if(target.rhp<=0)roofBreak(target)}}
      else if(kind==='tree'&&target?.p)dmgP(target,p.dmg);
      else if(kind==='enemy'){
        if(target.t==='torre'){
          // Impactes lleugers del jugador a la CASETA: foc de supressió
          // durant 2 s. Cada bala renova el termini; no resta PV a la torre.
          if(p.own==='p'&&p.shotClass==='light')
            target.suppressedUntil=elapsed+2;
        }else if(!(p.shotClass==='light'&&isArmoredVehicleType(target.t))){
          hurtE(target,p.dmg,p);
        }
      }
      else if(kind==='vehicle-glass'){
        const v=target.vehicle;
        shatterVehicleWindow(v,target.seat,{x:p.x,y:p.y,z:p.z},p);
      }
      else if(kind==='vehicle-occupant'){
        const victim=target.target;
        if(victim===P){
          const before=hp;hurtP(p.dmg,true,{type:'bullet',x:p.sx,y:p.sy,z:p.sz});
          if(hp<before)spawnBulletImpact('blood',p.x,p.y,p.z,p);
        }else if(victim?.hp>0)hurtE(victim,p.dmg,p);
      }
      else if(kind==='vehicle')damageVehicle(target,p.dmg,1,'light',p);
      else if(kind==='civilian'){
        if(prisonerSystem.hurt(target,p.dmg,p))spawnBulletImpact('blood',p.x,p.y,p.z,p);
      }
      else if(kind==='player'){
        const before=hp;hurtP(p.dmg,p.own==='e',{type:'bullet',x:p.sx,y:p.sy,z:p.sz});
        if(hp<before)spawnBulletImpact('blood',p.x,p.y,p.z,p);
      }
    }
    // Un impacte directe de bazuca enderroca tota una cabana de fusta,
    // incloses les parets, les barres laterals i la coberta.
    if(p.weapon==='bazooka'){
      const b=kind==='building'?target:kind==='wall'?target?.owner:null;
      if(b?.civilianHut)demolishCivilianHut(b);
    }
    if(p.spl)boom(p.x,p.y,p.z,p.spl,p.dmg,p.own,p);
    world.remove(p.o);Pj.splice(i,1)
  }
}
function updFx(dt){
const pending=pl.userData.grenadePending;if(pending){pending.t-=dt;if(pending.t<=0){launchGrenade(pending);pl.userData.grenadeReleased=true;pl.userData.grenadePending=null}}
for(let i=grenades.length-1;i>=0;i--){const g=grenades[i],next=window.HUNTER_SHARED_COMBAT.ballisticStep(g,dt),x0=g.x,y0=g.y,z0=g.z;g.t-=dt;g.vy=next.vy;const x1=next.x,y1=next.y,z1=next.z,mx=(x0+x1)/2,mz=(z0+z1)/2,reach=Math.hypot(x1-x0,z1-z0)/2+.5;let hitT=null;
  for(const w of wallCandidates(mx,mz,reach))if(!w.open){const q=segmentAabbT(x0,y0,z0,x1,y1,z1,w.x0,w.x1,w.y0,w.y1,w.z0,w.z1);if(q!=null&&(hitT==null||q<hitT))hitT=q}
  for(const b of buildingCandidates(mx,mz,reach)){const q=b.hangar?hangarRoofSegmentT(x0,y0,z0,x1,y1,z1,b):segmentAabbT(x0,y0,z0,x1,y1,z1,b.x-b.w/2,b.x+b.w/2,b.fy+b.h-.35,b.fy+b.h+.8,b.z-b.d/2,b.z+b.d/2);if(q!=null&&(hitT==null||q<hitT))hitT=q}
  const q=hitT==null?1:hitT;g.x=x0+(x1-x0)*q;g.y=y0+(y1-y0)*q;g.z=z0+(z1-z0)*q;g.o.position.set(g.x,g.y,g.z);g.o.rotation.x+=dt*8;g.o.rotation.z+=dt*5;
  const surface=bunkerProjectileSurface(g.x,g.z,g.y,true);
  if(hitT!=null||g.t<=0||g.y<=surface){g.y=Math.max(g.y,surface);boom(g.x,g.y,g.z,16,COMBAT_BALANCE.weapons.grenade,'b',{weapon:'grenade',own:'b',spl:16,x:g.x,y:g.y,z:g.z,sx:g.sx,sy:g.sy,sz:g.sz,o:g.o});world.remove(g.o);grenades.splice(i,1)}
}
for(let i=bombs.length-1;i>=0;i--){
 const b=bombs[i];
 // Temporitzador independent del contacte: la bomba explota tant si
 // ha aterrat com si continua caient. Cap impuls horitzontal fictici.
 if(b.falling&&!b.landed){
   const oldY=b.y;
   b.vy=Math.max(-65,(b.vy||0)-24*dt);
   const nextY=oldY+b.vy*dt;
   let support=Math.max(groundAt(b.x,b.z,oldY),wy(b.x,b.z,elapsed))+.24;
   // Un sostre sòlid intercepta el trajecte vertical abans del terreny.
   // Això permet posar càrregues sobre edificis sense travessar la teulada.
   for(const building of buildingCandidates(b.x,b.z,1)){
     if(building.rb||building.rhp<=0)continue;
     const roof=solidRoofAt(building,b.x,b.z);
     if(roof&&oldY>=roof.top&&nextY<=roof.top+.24)
       support=Math.max(support,roof.top+.24);
   }
   if(nextY<=support){
     b.y=support;b.vy=0;b.landed=true;
     b.falling=false;
   }else b.y=nextY;
   b.o.position.y=b.y;
 }
 b.t=Math.max(0,b.t-dt);
 if(b.t>0)window.HUNTER_EXPLOSIVE_VISUALS.update(b.o,b.t);
 if(b.t<=0){
   // S'usa la posició actual, mai la de sortida de l'helicòpter.
   boom(b.x,b.y,b.z,48,COMBAT_BALANCE.weapons.c4,'b',null,'c4');
   world.remove(b.o);bombs.splice(i,1);
 }
}
window.HUNTER_ARCADE_BLAST_FX?.update(dt);
updateBulletImpacts(dt);
}



