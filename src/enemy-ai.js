const ENEMY_SENSE_DT=window.HUNTER_ENEMY_PERCEPTION.SOLDIER.senseSeconds;
const {memorySeconds:SOLDIER_MEMORY,retreat:SOLDIER_RETREAT,ideal:SOLDIER_IDEAL,fireRange:SOLDIER_FIRE_RANGE}=window.HUNTER_ENEMY_PERCEPTION.SOLDIER;
const STEALTH=window.HUNTER_STEALTH;
const soldierReservations=new Map(),soldierReservationGrid=new Map(),soldierDoorQueues=new Map();
let soldierCoordinationTime=0;
const soldierReservationKey=(x,z)=>Math.floor(x/12)+','+Math.floor(z/12);
function releaseSoldierReservation(u){
  const old=soldierReservations.get(u);if(!old)return;
  const bucket=soldierReservationGrid.get(old.key);bucket?.delete(u);
  if(!bucket?.size)soldierReservationGrid.delete(old.key);
  soldierReservations.delete(u);
}
function reserveSoldierGoal(u,goal){
  releaseSoldierReservation(u);
  const key=soldierReservationKey(goal.x,goal.z),entry={x:goal.x,z:goal.z,key,until:soldierCoordinationTime+1.4};
  soldierReservations.set(u,entry);
  let bucket=soldierReservationGrid.get(key);if(!bucket)soldierReservationGrid.set(key,bucket=new Set());
  bucket.add(u);return goal;
}
function soldierPositionPenalty(u,x,z){
  let cost=0,checked=0,groundY;
  const cx=Math.floor(x/VEHICLE_CELL),cz=Math.floor(z/VEHICLE_CELL);
  outer:for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    for(const other of enemyGrid.get(vehicleCellKey(cx+dx,cz+dz))||[]){
      if(++checked>24)break outer;
      if(other===u||other.t!=='soldat'||other.hp<=0)continue;
      const dx=x-other.x,dz=z-other.z,d2=dx*dx+dz*dz;
      if(d2>=49)continue;
      if(groundY===undefined)groundY=enemyGroundAt(u,x,z);
      if(Math.abs(enemyGroundAt(other,other.x,other.z)-groundY)>4)continue;
      cost+=(7-Math.sqrt(d2))*4;
    }
  }
  checked=0;const rx=Math.floor(x/12),rz=Math.floor(z/12);
  outer:for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    for(const other of soldierReservationGrid.get((rx+dx)+','+(rz+dz))||[]){
      if(++checked>24)break outer;
      const goal=soldierReservations.get(other);
      if(other===u||!goal||goal.until<soldierCoordinationTime||other.hp<=0)continue;
      const dx=x-goal.x,dz=z-goal.z,d2=dx*dx+dz*dz;
      if(d2<64)cost+=(8-Math.sqrt(d2))*10;
    }
  }
  return cost;
}
function releaseSoldierEntry(u){
  const door=u.entryDoor,queue=soldierDoorQueues.get(door);
  if(queue){queue.queue=queue.queue.filter(entry=>entry.unit!==u);if(!queue.queue.length)soldierDoorQueues.delete(door)}
  u.entryDoor=null;u.entryBuilding=null;u.entryPhase=0;u.entryWaiting=null;
}
function resetSoldierCoordination(){
  const units=new Set(E);
  for(const u of soldierReservations.keys())units.add(u);
  for(const queue of soldierDoorQueues.values())for(const entry of queue.queue)units.add(entry.unit);
  for(const u of units)if(u.t==='soldat'){
    u.tacticGoal=null;u.tacticT=0;u.tacticMode=null;u.entryDoor=null;u.entryBuilding=null;
    u.entryPhase=0;u.entryWaiting=null;u.doorRetryUntil=0;
  }
  soldierReservations.clear();soldierReservationGrid.clear();soldierDoorQueues.clear();soldierCoordinationTime=0;
}
function soldierCoordinationTick(dt){
  soldierCoordinationTime+=Math.max(0,dt);
  for(const [u,goal] of soldierReservations)if(u.hp<=0||u.destroyed||goal.until<soldierCoordinationTime||!u.canSee&&u.aiMode!=='combat')releaseSoldierReservation(u);
  for(const [door,queue] of soldierDoorQueues){
    for(const entry of [...queue.queue]){
      const u=entry.unit;
      if(u.hp<=0||u.destroyed||u.aiMode==='patrol'||door.locked||
        soldierCoordinationTime-entry.touched>.35)releaseSoldierEntry(u);
    }
    const holder=queue.queue[0];
    if(holder?.owner&&(soldierCoordinationTime-holder.progress>2.2||soldierCoordinationTime-holder.granted>8)){
      holder.unit.doorRetryUntil=soldierCoordinationTime+1.2;releaseSoldierEntry(holder.unit);
    }
    if(!queue.queue.length)soldierDoorQueues.delete(door);
  }
}
function soldierKnownBuilding(target,targetY){
  return buildingCandidates(target.x,target.z).find(b=>!b.rb&&Math.abs(target.x-b.x)<b.w/2&&
    Math.abs(target.z-b.z)<b.d/2&&targetY>b.fy-2&&targetY<b.fy+b.h+.5)||null;
}
// Visió i escolta comparteixen la posició tridimensional, però no l'estat:
// sentir un tret només dóna una darrera posició aproximada a investigar.
function soldierVisualContact(u,target,targetY,d){
  const eyeY=u.o.position.y+2.2,
        crouched=!!playerCrouched&&!cv,
        targetEye=targetY+(crouched?1.25:1.5),
        // No podem fer servir hAt() sota terra: retornaria l'altura
        // de la muntanya i faria invisibles els objectius a 30 metres.
        sameBasement=!!u.basement&&targetY<u.basement.fy-3.9&&
          eyeY<u.basement.fy-3.9;
  if(over||!window.HUNTER_ENEMY_PERCEPTION.soldierView({x:u.x,y:u.o.position.y,z:u.z,heading:u.hd,elite:u.elite},
    {x:target.x,y:targetY,z:target.z},{crouched,disguised:disg&&!cv,sameBasement}))return false;
  if(soldierVisibleShotHeight(u,u.x,u.z,eyeY,target,targetY-(crouched?.25:0))===null)return false;
  // A diferència de sight(), el pendent també tapa un enemic al darrere
  // d'una cresta (sense fer raycasts de geometria per cada soldat).
  if(!sameBasement){
    const steps=Math.min(32,Math.ceil(d/3));
    for(let i=1;i<steps;i++){
      const q=i/steps,x=u.x+(target.x-u.x)*q,z=u.z+(target.z-u.z)*q;
      if(hAt(x,z)>eyeY+(targetEye-eyeY)*q-.1)return false;
    }
  }
  return true;
}
function soldierInvestigate(u,target,dt,speed=1){
  const dist=Math.hypot(target.x-u.x,target.z-u.z);
  if(dist>3){
    mvE(u,u.sp*speed*dt,target.x,target.z);
    u.hd=Math.atan2(u.x-target.x,u.z-target.z);
    return false;
  }
  u.hd+=dt*.8;
  return true;
}
function soldierWarnNeighbors(witness,target,targetY){
  // El crit és un esdeveniment sonor: els aliats dins del cercle l'investiguen.
  // Evitem repetir-lo constantment mentre el mateix soldat manté contacte.
  const event=STEALTH.emit('alert',witness.x,witness.o.position.y+2,witness.z);
  if(event)witness.heardId=event.id;
  snd('alert',.65,{x:witness.x,y:witness.o.position.y+2,z:witness.z},witness);
  // Radio supplements a real witnessed contact; the local shout always remains.
  radioRelay.warn(witness,target,targetY,{enemies:E,active:!!started&&!paused&&!over});
}
// La mateixa escala de punteria per a soldats, vehicles i patrulleres.
function enemyAimSpread(){return window.HUNTER_ENEMY_ACCURACY.difficultyScale(DIF)}
function enemyShotDirection(u,target,targetY,eyeY,roll=rn,weapon=null){
  const aimX=target.x-u.x,
        aimHeight=(!cv&&playerCrouched)?1.25:(soldierVisibleShotHeight(u,u.x,u.z,eyeY,target,targetY)??1.5),
        aimY=targetY+aimHeight-eyeY,
        aimZ=target.z-u.z,
        profile=weapon||(u.t==='soldat'?window.HUNTER_ENEMY_PERCEPTION.soldierAccuracyProfile(u):
          u.t==='general'?'pistol':u.t==='torre'?'tower':
          u.spl?'tank':'rifle'),
        direction=window.HUNTER_ENEMY_ACCURACY.direction(DIF,profile,aimX,aimY,aimZ,roll);
  return direction;
}

// Tripulacions pròpies: soldats embarcats en vehicles requisats o patrulles
// regulars. Una reserva pendent no compta com a vehicle tripulat.
function enemyVehicleCrewAboard(v){
 if(['jeep','tanqueta','tanc','patrulla_marina'].includes(v.t))return true;
 return !!v.enemyCrew?.some(u=>u?.hp>0&&
   ['waiting','riding'].includes(u.enemyVehicleClaim?.phase));
}
function enemyFriendlyVehicleOnLine(from,to,v){
 const b=vehicleBox(v),t=vehicleHitType(v.t),height=
   t==='ferry'?8:t==='heli'||t==='heli_combat'?5.5:
   t==='camio'?4.8:t==='tanc'?4.7:t==='tanqueta'?4:
   t==='llanxa'||t==='llanxa_coets'?3.8:3.3;
 return window.HUNTER_SHARED_COMBAT.friendlyVehicleBlocksLine(from,to,v,{
   width:b.w,depth:b.d,baseY:vehicleY(v),height});
}
function enemyFriendlyVehicleInFireLane(from,to,sourceVehicle=null){
 const reach=Math.hypot(to.x-from.x,to.z-from.z)/2+60,
   mx=(from.x+to.x)/2,mz=(from.z+to.z)/2;
 for(const v of vehicleCandidatesAt(mx,mz,reach)){
   if(v===sourceVehicle||v.destroyed||!enemyVehicleCrewAboard(v))continue;
   if(enemyFriendlyVehicleOnLine(from,to,v))return true;
 }
 return false;
}
// El contacte visual i la possibilitat de disparar no són el mateix.
// Les parets i els vehicles aparcats obliguen el soldat a canviar d'angle.
function soldierClearShot(u,x,z,y,target,targetY,aimHeight=1.5){
  const tx=target.x,tz=target.z,ty=targetY+aimHeight,
        reach=Math.hypot(tx-x,tz-z)/2+3,mx=(x+tx)/2,mz=(z+tz)/2;
  for(const w of wallCandidates(mx,mz,reach)){
    if(w.open||w.barbed)continue;
    const t=window.HUNTER_BUILDING_SHELL.wallShotHit({x,y,z},{x:tx,y:ty,z:tz},w);
    if(t!=null&&t<.97)return false;
  }
  for(const b of buildingCandidates(mx,mz,reach)){
    if(b.rhp<=0)continue;
    const t=b.hangar
      ?hangarRoofSegmentT(x,y,z,tx,ty,tz,b)
      :segmentAabbT(x,y,z,tx,ty,tz,b.x-b.w/2-.6,b.x+b.w/2+.6,
        b.fy+b.h-.4,b.fy+b.h+1.4,b.z-b.d/2-.6,b.z+b.d/2+.6);
    if(t!=null&&t<.97)return false;
  }
  for(const v of vehicleCandidatesAt(mx,mz,reach+18)){
    if(v===cv||v.destroyed)continue; // el vehicle del jugador és l'objectiu
    if(enemyVehicleCrewAboard(v)){
      if(enemyFriendlyVehicleOnLine({x,y,z},{x:tx,y:ty,z:tz},v))return false;
      continue;
    }
    const radius=vehicleRadius(v.t)*.55,vy=vehicleY(v)+Math.min(1.7,radius*.6);
    const t=segmentSphereT(x,y,z,tx,ty,tz,v.x,vy,v.z,radius);
    if(t!=null&&t<.97)return false;
  }
  return true;
}
// A raised sill can cover the chest but leave the upper body visible.
// Never see or shoot through opaque wall parts: both rays use wallShotHit.
function soldierVisibleShotHeight(u,x,z,y,target,targetY){
  if(soldierClearShot(u,x,z,y,target,targetY))return 1.5;
  if(!playerCrouched&&!cv&&soldierClearShot(u,x,z,y,target,targetY,2.35))return 2.35;
  return null;
}
function soldierFlankPosition(u,target,targetY){
  const dx=target.x-u.x,dz=target.z-u.z,d=Math.max(1,Math.hypot(dx,dz)),
        fx=dx/d,fz=dz/d,sideX=-fz,sideZ=fx,
        prefer=u.avoidSide||1;
  let best=null,bestScore=Infinity;
  for(const side of [prefer,-prefer])for(const lateral of [7,13,22]){
    for(const forward of [4,11]){
      const x=u.x+side*sideX*lateral+fx*forward,z=u.z+side*sideZ*lateral+fz*forward;
      if(!enemySolidAt(u,x,z,u.hd,true))continue;
      if(!soldierClearShot(u,x,z,enemyGroundAt(u,x,z)+2.2,target,targetY))continue;
      const score=lateral+forward*.5+(side===prefer?0:4)+soldierPositionPenalty(u,x,z);
      if(score<bestScore){bestScore=score;best={x,z}}
    }
  }
  // Si encara no hi ha una línia de tir clara, avancem lateralment fins a
  // passar la vora de l'obstacle; mvE/A* decideix com rodejar-lo.
  return reserveSoldierGoal(u,best||{
    x:u.x+sideX*prefer*13+fx*9,
    z:u.z+sideZ*prefer*13+fz*9
  });
}
// Quan el jugador es refugia a dins, el soldat ha de trobar el portal
// d'entrada, creuar-lo i només llavors buscar una posició de tir.
function soldierEnterBuilding(u,b,target,dt,targetY=u.lastSeenY??u.o.position.y){
  const door=b?.door;
  if(!door||door.locked||door.bunkerGate||b.hangar){
    releaseSoldierEntry(u);return false;
  }
  const inside=Math.abs(u.x-b.x)<b.w/2-1.15&&
               Math.abs(u.z-b.z)<b.d/2-1.15;
  if(inside){
    releaseSoldierEntry(u);
    if(soldierChangeFloor(u,b,dt,targetY))return true;
    return false;
  }
  // Dos trams amb memòria: aproximació per fora i pas cap a dins.
  // Sense retenir la fase, en allunyar-se 1 m del punt exterior el soldat
  // tornava enrere i quedava oscil·lant just davant del llindar.
  if(u.entryBuilding!==b){releaseSoldierEntry(u);u.entryBuilding=b;u.entryPhase=0}
  let queue=soldierDoorQueues.get(door);
  if(!queue){if(soldierDoorQueues.size>=64)return false;soldierDoorQueues.set(door,queue={queue:[]})}
  let entry=queue.queue.find(item=>item.unit===u);
  if(!entry&&soldierCoordinationTime>=(u.doorRetryUntil||0)&&queue.queue.length<8){
    entry={unit:u,touched:soldierCoordinationTime,progress:soldierCoordinationTime,
      granted:soldierCoordinationTime,x:u.x,z:u.z};queue.queue.push(entry);u.entryDoor=door;
  }
  if(entry)entry.touched=soldierCoordinationTime;
  const index=entry?queue.queue.indexOf(entry):8;
  if(index!==0){
    const rank=Math.max(1,index),side=rank%2?1:-1,
      waiting={x:door.cx+door.nx*(5.5+Math.floor((rank-1)/2)*3.2)+door.nz*side*3.3,
        z:door.cz+door.nz*(5.5+Math.floor((rank-1)/2)*3.2)-door.nx*side*3.3};
    u.entryWaiting=waiting;u.entryPhase=0;
    if(Math.hypot(u.x-waiting.x,u.z-waiting.z)>.4)mvE(u,u.sp*.75*dt,waiting.x,waiting.z);
    return true;
  }
  if(!entry.owner){entry.owner=true;entry.granted=entry.progress=soldierCoordinationTime;entry.x=u.x;entry.z=u.z}
  if(Math.hypot(u.x-entry.x,u.z-entry.z)>.35){entry.x=u.x;entry.z=u.z;entry.progress=soldierCoordinationTime}
  u.entryWaiting=null;
  const exterior={x:door.cx+door.nx*2.1,z:door.cz+door.nz*2.1},
        interior={x:door.cx-door.nx*2.5,z:door.cz-door.nz*2.5},
        distance=Math.hypot(u.x-exterior.x,u.z-exterior.z);
  // Primer arribam al centre exacte del portal: les portes de 2,5 m
  // tenen poc marge amb el radi conservador de l'A*. Des d'aquest punt
  // el trajecte cap a dins és perpendicular a la paret, sense enganxar-se.
  // El pas no exigeix encertar un punt de 6,5 cm: amb A*, separació entre
  // soldats i passos discrets es poden fer oscil·lacions a l'exterior.
  // Un radi lligat al pas del fotograma permet superar el llindar sense
  // canviar de fase prematurament des de les cantonades de la paret.
  const entryTolerance=Math.max(.35,Math.min(.95,u.sp*dt*1.25));
  const lateral=Math.abs((u.x-door.cx)*door.nz-(u.z-door.cz)*door.nx);
  if(u.entryPhase===0&&distance<=entryTolerance&&lateral<=.55){
    u.entryPhase=1;u.navDirectT=0;u.navGoal=null;u.navPath=[];u.navSearch=null;
  }
  const goal=u.entryPhase?interior:exterior;
  u.tacticGoal=null;u.tacticT=0;
  releaseSoldierReservation(u);
  mvE(u,u.sp*dt,goal.x,goal.z);
  u.hd=Math.atan2(u.x-target.x,u.z-target.z);
  return true;
}
function soldierFirePosition(u,target,targetY,d){
  const base=Math.atan2(u.x-target.x,u.z-target.z),prefer=u.avoidSide||1,
    radius=d<SOLDIER_RETREAT?15:d>17?16:13;
  let best=null,score=Infinity;
  for(const offset of [0,.3*prefer,-.3*prefer,.6*prefer,-.6*prefer,.95*prefer,-.95*prefer]){
    const a=base+offset,x=target.x+Math.sin(a)*radius,z=target.z+Math.cos(a)*radius;
    if(!enemySolidAt(u,x,z,u.hd,true)||!soldierClearShot(u,x,z,enemyGroundAt(u,x,z)+2.2,target,targetY))continue;
    const value=Math.hypot(x-u.x,z-u.z)*.3+Math.abs(offset)*2+soldierPositionPenalty(u,x,z);
    if(value<score){score=value;best={x,z}}
  }
  return reserveSoldierGoal(u,best||{x:u.x,z:u.z});
}
function soldierEngage(u,target,targetY,dt,d,visible){
  const eyeY=u.o.position.y+2.2,clear=visible&&u.canShoot;
  let goal=null,speed=u.sp;
  const tacticMode=clear?'fire':'flank';
  if(u.tacticMode!==tacticMode){u.tacticGoal=null;u.tacticT=0;u.tacticMode=tacticMode}
  if(!clear){
    if(!u.tacticGoal||(u.tacticT||0)<=0||
       Math.hypot(target.x-(u.tacticTargetX??target.x),target.z-(u.tacticTargetZ??target.z))>7||
       Math.hypot(u.tacticGoal.x-u.x,u.tacticGoal.z-u.z)<2){
      u.tacticGoal=soldierFlankPosition(u,target,targetY);
      u.tacticTargetX=target.x;u.tacticTargetZ=target.z;u.tacticT=.85;
    }
    goal=u.tacticGoal;speed=u.sp*.95;
  }else{
    if(!u.tacticGoal||(u.tacticT||0)<=0||Math.hypot(target.x-(u.tacticTargetX??target.x),target.z-(u.tacticTargetZ??target.z))>7){
      u.tacticGoal=soldierFirePosition(u,target,targetY,d);u.tacticT=1.1;
      u.tacticTargetX=target.x;u.tacticTargetZ=target.z;
    }
    goal=u.tacticGoal;speed=u.sp*(d<SOLDIER_RETREAT?.87:d>SOLDIER_IDEAL?1:.55);
  }
  if(goal)mvE(u,speed*dt,goal.x,goal.z);
  const toward=target;
  u.hd=Math.atan2(u.x-toward.x,u.z-toward.z); // la cara sempre al jugador
}

// El fusell de l'artiller gira des de la finestra dreta del cotxe.
// El marcador és fill de la boca del canó visible: l'origen del tret
// segueix sempre el model real i no el centre del vehicle.
function enemyCarRifleShot(u,target,targetY){
  const crew=u.o.userData.enemyCarCrew;
  if(!crew)return null;
  u.o.position.set(u.x,(u.gy??enemyGroundAt(u,u.x,u.z))+.05,u.z);
  u.o.rotation.y=u.navHd??u.hd;
  u.o.updateMatrixWorld(true);
  const aimY=targetY+(!cv&&playerCrouched?1.25:1.5),
        offset=window.HUNTER_ENEMY_ACCURACY.sample(DIF,'jeep',
          target.x-u.x,aimY-(u.o.position.y+1.5),target.z-u.z,rn),
        aim=new THREE.Vector3(target.x+offset.x,aimY+offset.y,target.z+offset.z);
  u.o.worldToLocal(aim);
  const dx=aim.x-crew.mount.position.x,dy=aim.y-crew.mount.position.y,
        dz=aim.z-crew.mount.position.z;
  crew.mount.rotation.y=Math.atan2(-dx,-dz);
  crew.pitch.rotation.x=Math.max(-.7,Math.min(.75,Math.atan2(dy,Math.hypot(dx,dz))));
  u.o.updateMatrixWorld(true);
  return {origin:crew.muzzle.getWorldPosition(new THREE.Vector3()),
    direction:new THREE.Vector3(0,0,-1).applyQuaternion(
      crew.muzzle.getWorldQuaternion(new THREE.Quaternion())).normalize()};
}
// El conductor d'una moto requisada dispara des de la boca REAL del seu
// fusell. El soldat de combat continua ocult, com en la resta de vehicles.
function enemyMotorcycleRifleShot(v,target,targetY){
  const muzzle=v.o?.userData?.enemyCarCrew?.motorcycleMuzzle;
  if(!muzzle)return null;
  v.o.rotation.y=v.hd;
  v.o.updateMatrixWorld(true);
  const origin=muzzle.getWorldPosition(new THREE.Vector3()),
        dx=target.x-origin.x,dy=targetY+1.5-origin.y,dz=target.z-origin.z,
        error=window.HUNTER_ENEMY_ACCURACY.sample(DIF,'jeep',dx,dy,dz,rn),
        direction=new THREE.Vector3(dx+error.x,dy+error.y,dz+error.z).normalize();
  return {origin,direction};
}
// Les ones explosives no poden impulsar una unitat a través de parets.
// Especialment, el general no pot sortir del seu despatx subterrani.
function moveBlastedEnemy(u,dt){
  const imp=u.blastImpulse,dx=imp.vx*dt,dz=imp.vz*dt,
        room=u.t==='general'?u.basement?.basement?.generalRoom:null;
  const clear=(x,z)=>{
    if(room){
      const p=buildingLocalPoint(u.basement,x,z),margin=.35;
      if(p.x<room.xMin+margin||p.x>room.xMax-margin||
         p.z<room.zMin+margin||p.z>room.zMax-margin)return false;
    }
    return enemySolidAt(u,x,z,u.hd);
  };
  const ox=u.x,oz=u.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.45));
  for(let i=0;i<steps;i++){
    const sx=dx/steps,sz=dz/steps;
    if(clear(u.x+sx,u.z+sz)){u.x+=sx;u.z+=sz;continue}
    if(clear(u.x+sx,u.z)){u.x+=sx;imp.vz=0;continue}
    if(clear(u.x,u.z+sz)){u.z+=sz;imp.vx=0;continue}
    imp.vx=imp.vz=0;break;
  }
  if(u.x!==ox||u.z!==oz)enemyReindex(u,ox,oz);
}
// Requises de vehicles neutrals. La reserva es manté al vehicle real de V,
// que conserva totes les col·lisions, física, aparences i destrucció originals.
const enemyRequisition=window.HUNTER_ENEMY_REQUISITION;
function enemyVehicleRelease(u,leave=true){
  const claim=u.enemyVehicleClaim;if(!claim)return;
  const v=claim.vehicle;
  if(v?.enemyCrew?.[claim.seat]===u)v.enemyCrew[claim.seat]=null;
  delete u.enemyVehicleClaim;
  if(u.o?.parent!==world)world.add(u.o);
  const exit=enemyRequisition.vehicleSeatPosition(v||u,claim.seat);
  if(leave&&v&&!v.destroyed){
    u.x=exit.x;u.z=exit.z;u.gy=hAt(u.x,u.z);
    u.lastSeenX??=u.x;u.lastSeenZ??=u.z;
  }
  u.o.scale.setScalar(1);u.o.visible=true;
  u.o.position.set(u.x,u.gy??hAt(u.x,u.z),u.z);
  window.HUNTER_ENEMY_CREW_VISUAL?.show(v,claim.seat,false);
  u.hd=v?.hd??u.hd;u.aiMode='search';u.searchT=Math.max(u.searchT||0,5);
  if(v?.enemyCrew&&!v.enemyCrew.some(Boolean)){
    v.enemyCrew=null;v.v*=.4;
  }
}
function enemyVehicleReserve(u,{fleeing=false}={}){
  if(u.enemyVehicleClaim||u.elite||u.rocketSoldier||u.basement)return false;
  const id=u.saveId??('soldat:'+Math.round(u.home?.x??u.x)+':'+Math.round(u.home?.z??u.z));
  // Cada intent (cada 3 s) té una tirada nova i reproduïble.
   // Fer-la només per ID deixava alguns soldats permanentment incapaços
   // de requisar un vehicle neutral, fins i tot després de molts intents.
   const attempt=Math.floor(elapsed/enemyRequisition.REQUISITION.retrySeconds);
   if(enemyRequisition.requisitionRoll(id+':'+attempt,seed)>=enemyRequisition.requisitionChance(DIF,fleeing))return false;
  const range=fleeing?enemyRequisition.REQUISITION.fleeingSearchRadius:enemyRequisition.REQUISITION.searchRadius;
  const choices=enemyRequisition.candidateVehicles(
    u,vehicleCandidatesAt(u.x,u.z,range+7,true).filter(v=>v!==cv),{range,piers,stairs});
  const pick=choices[0];if(!pick)return false;
  const v=pick.vehicle;
  v.enemyCrew??=[null,null];
  if(v.enemyCrew[pick.seat])return false;
  v.enemyCrew[pick.seat]=u;
  const dockGoal=pick.dockRoute?.[0],
    goal=dockGoal||enemyRequisition.vehicleSeatPosition(v,pick.seat),
    half=Math.hypot(goal.x-u.x,goal.z-u.z)*.5,
    barrier=wallCandidates((goal.x+u.x)*.5,(goal.z+u.z)*.5,half+100),
    fenceRoute=enemyRequisition.requisitionFenceDetour(u,goal,barrier);
  u.enemyVehicleClaim={vehicle:v,seat:pick.seat,phase:'approach',
    timeout:elapsed+40,waitUntil:elapsed+1.7,lastContact:elapsed,
    dockRoute:pick.dockRoute,dockIndex:0,fenceRoute,fenceIndex:0};
  u.tacticGoal=null;releaseSoldierEntry(u);releaseSoldierReservation(u);
  return true;
}
// El foc de les llanxes requisades usa exactament les mateixes armes
// visibles que el de les patrulleres: pilot/fusell, passatger/llançacoets.
function enemyBoardedBoatShot(u,v,seat,target,targetY,dt){
  const rocket=v.o?.userData?.enemyCarCrew?.boatWeapons?.[seat]?.rocket??
    (seat===1||v.t==='llanxa_coets'),range=rocket?245:170;
  if(Math.hypot(target.x-v.x,target.z-v.z)>range)return false;
  const goal=new THREE.Vector3(target.x,targetY+1.5,target.z);
  if(!aimEnemyBoatCrew(v.o,seat,goal,dt))return false;
  const p=enemyBoatCrewMuzzle(v.o,seat);
  if(!p||!weaponAimClear(p.x,p.y,p.z,goal.x,goal.y,goal.z))return false;
  const offset=window.HUNTER_ENEMY_ACCURACY.sample(DIF,rocket?'marineRocket':'marineMG',
    goal.x-p.x,goal.y-p.y,goal.z-p.z,rn),
    dx=goal.x+offset.x-p.x,dy=goal.y+offset.y-p.y,dz=goal.z+offset.z-p.z,
    norm=Math.max(.001,Math.hypot(dx,dy,dz)),speed=rocket?75:125;
  const shotsBefore=Pj.length;
  shoot(p.x,p.y,p.z,dx/norm,dy/norm,dz/norm,speed,
    rocket?COMBAT_BALANCE.weapons.boatRocket:COMBAT_BALANCE.weapons.rifle,
    rocket?8:0,'e',rocket?mS:mW,rocket?2:SMALL_ARMS_SCALE,u,seat===0);
  if(Pj.length===shotsBefore)return false;
  if(rocket)Pj[Pj.length-1].life=Math.max(2.2,norm/(speed*HEAVY_SHOT_SPEED_FACTOR)+.75);
  return true;
}
function enemyVehicleBoardingTick(u,dt){
  const c=u.enemyVehicleClaim;if(!c)return false;
  const v=c.vehicle;
  if(!v||v.destroyed||v.sunk||v.enemyCrew?.[c.seat]!==u||cv===v||
     elapsed>c.timeout&&!['riding','waiting'].includes(c.phase)){
    enemyVehicleRelease(u);return false;
  }
  if(c.phase==='approach'){
    const boat=enemyRequisition.requisitionBoat(v.t);
    const route=c.dockRoute;
    // Primer pujam la rampa i recorrem el moll; mai travessam l'aigua
    // en línia recta en direcció a la llanxa.
    if(boat&&(!route?.length||u.y<0)){enemyVehicleRelease(u);return false;}
    if(boat){
      while(c.dockIndex<route.length-1&&
        Math.hypot(u.x-route[c.dockIndex].x,u.z-route[c.dockIndex].z)<2.2)
        c.dockIndex++;
    }
    // Si una filferrada talla el camí al seient (o a la rampa),
    // primer travessam l'obertura identificada.
    while(c.fenceIndex<(c.fenceRoute?.length||0)&&
      Math.hypot(u.x-c.fenceRoute[c.fenceIndex].x,
        u.z-c.fenceRoute[c.fenceIndex].z)<2.45)c.fenceIndex++;
    const fenceGoal=c.fenceRoute?.[c.fenceIndex],
      q=fenceGoal||(
        boat?route[Math.min(c.dockIndex,route.length-1)]:
          enemyRequisition.vehicleSeatPosition(v,c.seat)),
      d=Math.hypot(q.x-u.x,q.z-u.z);
    if(fenceGoal||(boat?!enemyRequisition.boatBoardingReady(u,v,route):
      d>enemyRequisition.REQUISITION.boardingDistance)){
      mvE(u,u.sp*.95*dt,q.x,q.z);
      u.walkY=groundAt(u.x,u.z,u.walkY??u.gy??u.o.position.y);
      u.gy=u.walkY;
      u.hd=Math.atan2(u.x-q.x,u.z-q.z);
      u.o.position.set(u.x,u.gy??enemyGroundAt(u,u.x,u.z),u.z);
      animateEnemyInfantry(u,true,dt);
      return true;
    }
    // La moto només té un seient: el pilot no espera un passatger inexistent.
    c.phase=c.seat===0&&v.t!=='moto'?'waiting':'riding';
    c.waitUntil=elapsed+enemyRequisition.REQUISITION.passengerWaitSeconds;
    // El soldat real és l'actor de combat, però visualment s'amaga.
    // El pilot visible és el mateix rider assegut del Humvee de patrulla.
    if(u.o.parent!==world)world.add(u.o);
    u.o.visible=false;
    window.HUNTER_ENEMY_CREW_VISUAL?.show(v,c.seat,true);
  }
  // No tornar a mostrar la figura dreta mentre és dins del vehicle.
  u.o.visible=false;
  window.HUNTER_ENEMY_CREW_VISUAL?.show(v,c.seat,true);
  const target=cv||P,py=cv?cv.o.position.y:P.y;
  const fleeing=enemyRequisition.observeFleeing(
    v,target,elapsed,u.enemyFleeTracking??={});
  const spotted=!cheats.invisible&&!over&&
    Math.hypot(target.x-v.x,target.z-v.z)<
      (fleeing?enemyRequisition.REQUISITION.fleeingChaseDistance:
        enemyRequisition.REQUISITION.maxChaseDistance);
  if(spotted){u.lastSeenX=target.x;u.lastSeenZ=target.z;u.lastSeenY=py;c.lastContact=elapsed;}
  u.x=v.x;u.z=v.z;u.gy=v.o?.position?.y??hAt(v.x,v.z);
  if(c.seat!==0){
    if(enemyRequisition.requisitionBoat(v.t)){
      if(spotted&&u.cd<=0&&enemyBoardedBoatShot(u,v,1,target,py,dt))u.cd=5;
      else if(spotted)aimEnemyBoatCrew(v.o,1,
        new THREE.Vector3(target.x,py+1.5,target.z),dt);
      return true;
    }
    if(enemyRequisition.passengerMuzzle(v)&&
       v.enemyCrew[0]?.enemyVehicleClaim?.phase==='riding'&&spotted&&
       Math.hypot(target.x-v.x,target.z-v.z)<SOLDIER_FIRE_RANGE+20&&u.cd<=0){
      // L'artiller apunta amb el fusell i la boca real del model de
      // patrulla terrestre; la bala mai no surt del centre del vehicle.
      const shot=enemyCarRifleShot({
        o:v.o,x:v.x,z:v.z,gy:(v.o?.position?.y??hAt(v.x,v.z))-.05,hd:v.hd
      },target,py);
      if(shot&&sight(shot.origin.x,shot.origin.z,target.x,target.z,
        shot.origin.y,true,py+1.5)){
        shoot(shot.origin.x,shot.origin.y,shot.origin.z,
          shot.direction.x,shot.direction.y,shot.direction.z,
          70,u.dmg,0,'e',mW,SMALL_ARMS_SCALE,u);
        u.cd=u.rate*1.5;
      }
    }
    return true;
  }
  if(c.phase==='waiting'){
    const partner=v.enemyCrew[1],partnerBoarded=partner?.enemyVehicleClaim?.phase==='riding';
    if(partnerBoarded||elapsed>=c.waitUntil)c.phase='riding';
    else return true;
  }
  if(enemyRequisition.requisitionBoat(v.t)&&spotted){
    if(u.cd<=0&&enemyBoardedBoatShot(u,v,0,target,py,dt))
      u.cd=v.o?.userData?.enemyCarCrew?.boatWeapons?.[0]?.rocket?5:u.rate;
    else aimEnemyBoatCrew(v.o,0,
      new THREE.Vector3(target.x,py+1.5,target.z),dt);
  }
  // El pilot de la moto pot fer foc, tot i que no hi ha passatger.
  // La trajectòria respecta el relleu i les parets, com qualsevol soldat.
  if(v.t==='moto'&&spotted&&c.phase==='riding'&&u.cd<=0&&
     Math.hypot(target.x-v.x,target.z-v.z)<SOLDIER_FIRE_RANGE+20){
    const shot=enemyMotorcycleRifleShot(v,target,py);
    if(shot&&weaponAimClear(shot.origin.x,shot.origin.y,shot.origin.z,
      target.x,py+1.5,target.z)){
      const before=Pj.length;
      shoot(shot.origin.x,shot.origin.y,shot.origin.z,
        shot.direction.x,shot.direction.y,shot.direction.z,
        70,u.dmg,0,'e',mW,SMALL_ARMS_SCALE,u);
      if(Pj.length>before)u.cd=u.rate*1.5;
    }
  }
  // Blindats requisats: el conductor controla el canó de la torreta,
  // no el fusell d'infanteria. Orientació contínua independent del xassís.
  if(['tanc','tanqueta'].includes(v.t)&&v.o?.userData?.turretPivot){
    const gun=window.HUNTER_VEHICLES.turretShot(THREE,v.o);
    if(gun){
      const distance=Math.hypot(target.x-v.x,target.z-v.z),
        range=v.t==='tanc'?220:85,
        goal=new THREE.Vector3(target.x-gun.origin.x,
          py+1.5-gun.origin.y,target.z-gun.origin.z);
      const aligned=window.HUNTER_VEHICLES.aimTurret(THREE,v.o,goal,dt);
      if(spotted&&c.phase==='riding'&&distance<=range&&aligned&&u.cd<=0){
        const barrel=window.HUNTER_VEHICLES.turretShot(THREE,v.o);
        if(barrel&&weaponAimClear(barrel.origin.x,barrel.origin.y,barrel.origin.z,
          target.x,py+1.5,target.z)){
          const heavy=v.t==='tanc',direction=barrel.direction,origin=barrel.origin;
          shoot(origin.x,origin.y,origin.z,direction.x,direction.y,direction.z,
            heavy?85:135,heavy?COMBAT_BALANCE.weapons.tank:COMBAT_BALANCE.weapons.tankette,
            heavy?8:0,'e',heavy?mE:mW,heavy?2:SMALL_ARMS_SCALE,u,true);
          // Mateixa cadència de cinc segons dels canons pesants enemics.
          u.cd=heavy?5:TANKETTE_FIRE_INTERVAL;
        }
      }
    }
  }
  if(elapsed-c.lastContact>enemyRequisition.REQUISITION.chaseMemorySeconds){
    // El conductor deixa d'empaitar el fantasma de la darrera posició.
    if(v.enemyCrew[1])enemyVehicleRelease(v.enemyCrew[1]);
    enemyVehicleRelease(u);return false;
  }
  const goal=spotted?target:{x:u.lastSeenX,z:u.lastSeenZ};
  const planned=enemyRequisition.pursuitInput(v,goal,{
    passenger:v.enemyCrew[1]?.enemyVehicleClaim?.phase==='riding'
  });
  const approach=enemyRequisition.avoidVehicleBarbedWire(v,planned,
    wallCandidates(v.x,v.z,42),c.fenceAvoid??={});
  const input=enemyRequisition.motorcycleAttackInput(v,cv||target,approach,{
    occupied:!!cv&&spotted&&c.phase==='riding'
  });
  // Ús del mateix stepV que el jugador, sense moure la malla a mà.
  if(input.distance>3||!v.enemyCrew[1])stepV(v,input.forward,input.turn,0,Math.min(dt,.1));
  const oldX=u.x,oldZ=u.z;
  u.x=v.x;u.z=v.z;u.gy=v.o?.position?.y??hAt(v.x,v.z);
  if(oldX!==u.x||oldZ!==u.z)enemyReindex(u,oldX,oldZ);
  return true;
}
// Defensors reals de les torres: dos soldats amb salut pròpia, sense
// torreta automàtica ni supressió. Miren només cap al davant i, si no
// tenen contacte, giren junts gradualment per explorar tot l'horitzó.
function towerGuardTick(u,dt){
 const tower=u.towerHost;
 if(!tower||tower.destroyed||tower.hp<=0){
   hurtE(u,Math.max(1,u.hp+1));return;
 }
 const rules=window.HUNTER_TOWER_MODEL,q=cv||P,
   targetY=cv?cv.o.position.y:P.y,
   dx=q.x-u.x,dz=q.z-u.z,d=Math.hypot(dx,dz),
   // El cap i la boca del canó queden per damunt del parapet lateral.
   eyeY=u.gy+2.78,rocket=!!u.rocketSoldier,
   visualTarget={x:q.x,y:targetY+(!cv&&playerCrouched?1.25:1.5),z:q.z},
   facing=rules.towerGuardInView(u.hd,dx,dz,u.rng);
 u.cd=Math.max(0,(u.cd||0)-dt);
 u.senseT=(u.senseT??0)-dt;
 if(u.senseT<=0){
   u.senseT=.10;
   // Només un dels dos soldats necessita veure l'enemic inicialment:
   // l'altre rep l'avís i el segueix si té línia de tir real.
   const allowed=!cheats.invisible&&!over&&
     (!disg||!!cv||u.alert>0||d<20),
     sharedWarning=(tower.towerAlertUntil||0)>elapsed,
     clear=allowed&&weaponAimClear(u.x,eyeY,u.z,
       visualTarget.x,visualTarget.y,visualTarget.z);
   u.canSee=clear&&(facing||sharedWarning);
   if(clear&&facing)tower.towerAlertUntil=elapsed+1.2;
 }
 if(u.canSee){
   const targetHeading=Math.atan2(-dx,-dz);
   u.hd=rules.towerTurnHeading(u.hd,targetHeading,dt);
   const aiming=rules.towerGuardInView(u.hd,dx,dz,u.rng),
     aligned=Math.abs(Math.atan2(Math.sin(targetHeading-u.hd),
       Math.cos(targetHeading-u.hd)))<.13;
   if(aiming&&aligned&&u.cd<=0&&(!rocket||d>12)){
     const fx=-Math.sin(u.hd),fz=-Math.cos(u.hd),
       origin={x:u.x+fx*1.18,y:eyeY-(rocket?.04:.08),z:u.z+fz*1.18};
     if(weaponAimClear(origin.x,origin.y,origin.z,
       visualTarget.x,visualTarget.y,visualTarget.z)&&
       !enemyFriendlyVehicleInFireLane(origin,visualTarget)){
       const [vx,vy,vz]=window.HUNTER_ENEMY_ACCURACY.direction(
         DIF,rocket?'towerHeavy':'rifle',
         visualTarget.x-origin.x,visualTarget.y-origin.y,visualTarget.z-origin.z,rn);
       shoot(origin.x,origin.y,origin.z,vx,vy,vz,
         rocket?76:70,u.dmg,rocket?8:0,'e',rocket?mS:mW,
         rocket?1.9:SMALL_ARMS_SCALE,u);
       u.cd=u.rate;
       u.alert=12;
     }
   }
 }else{
   const angle=u.hd+rules.TOWER_GUARD_SCAN_SPEED*dt;
   u.hd=Math.atan2(Math.sin(angle),Math.cos(angle));
 }
 u.o.position.set(u.x,u.gy,u.z);
 u.o.rotation.y=u.hd;
 animateEnemyInfantry(u,false,dt);
}
// La IA llunyana sense contacte necessita menys decisions de navegació,
// però conserva tot el temps transcorregut: mai no alentim la patrulla.
// Un enemic que detecta, cerca o combat reprèn immediatament els passos normals.
function enemyRemoteInterval(u,q,focus=null){
  if(u.towerGuard){
    // No mostregis línies de visió deu vegades per segon en torres a 2 km.
    // El temps acumulat conserva exactament la rotació de la vigilància.
    const dx=q.x-u.x,dz=q.z-u.z;
    return u.canSee||dx*dx+dz*dz<300*300?0:.18;
  }
  if(u.t==='general'||u.t==='patrulla_marina'||u.basement||
     u.blastT>0||u.canSee||u.alert>0||u.entryDoor||
     (u.pursuitT||0)>0||(u.aiMode&&u.aiMode!=='patrol'))return 0;
  // El franctirador pot observar enemics a molta distància: un objectiu
  // dins la mira conserva animació i moviment a la freqüència completa.
  if(focus?.contains(u.x,u.o?.position?.y??0,u.z,3))return 0;
  const dx=q.x-u.x,dz=q.z-u.z,d2=dx*dx+dz*dz;
  return d2>1400*1400?.3:d2>620*620?.18:0;
}
// Each enemy gets its own simulation interval. Carrying over a distant
// patrol's accumulated time into the next enemy caused runaway movement
// sweeps and major frame-time spikes under the semi-fixed clock.
function updEn(frameDt,preserveFrameBudget=false){if(!preserveFrameBudget)resetEnemyPathFrameBudget();refreshVehicleGridIfCellsChanged();soldierCoordinationTick(frameDt);const enemyScopeFocus=scopeActive?currentSniperFocus():null;E.forEach(u=>{
  let dt=frameDt;
  if(u.t==='patrulla_marina'){
    if(performanceStatsVisible){
      const stamp=performance.now();updateMarinePatrol(u,dt);
      perfHotspots.aiMarineMs+=performance.now()-stamp;
    }else updateMarinePatrol(u,dt);
    return;
  }
  const remoteInterval=enemyRemoteInterval(u,cv||P,enemyScopeFocus);
  if(remoteInterval){
    u.remoteAiAcc=(u.remoteAiAcc||0)+dt;
    // Repartim la primera decisió entre diferents fotogrames. Sense
    // aquest desfasament, centenars de patrullers desperten alhora
    // i provoquen pics molt alts de navegació en mòbils.
    const interval=u.remoteAiWarmed?remoteInterval:
      remoteInterval*(.25+.75*(u.remoteAiPhase??.5));
    if(u.remoteAiAcc+1e-9<interval){
      if(performanceStatsVisible)perfHotspots.aiSkipped++;
      return;
    }
    dt=u.remoteAiAcc;u.remoteAiAcc=0;u.remoteAiWarmed=true;
  }else{
    if(u.remoteAiAcc){dt+=u.remoteAiAcc;u.remoteAiAcc=0}
    u.remoteAiWarmed=false;
  }
  if(performanceStatsVisible)perfHotspots.aiUpdated++;
  if(u.blastT>0){
    const imp=u.blastImpulse;u.blastT=Math.max(0,u.blastT-dt);
    if(imp){
      moveBlastedEnemy(u,dt);
      imp.vy-=19*dt;
      u.blastHeight=Math.max(0,(u.blastHeight||0)+imp.vy*dt);
      // El forjat del soterrani és un límit físic, també durant el ragdoll.
      if(u.basement?.basement&&u.blastHeight>5.4){u.blastHeight=5.4;imp.vy=Math.min(0,imp.vy)}
      if(u.blastHeight===0)imp.vy=0;
      // En vol es manté l'empenta; a terra es frena ràpid.
      const landed=u.blastHeight===0;
      imp.vx*=Math.exp(-(landed?7:1.7)*dt);
      imp.vz*=Math.exp(-(landed?7:1.7)*dt);
      u.o.position.set(u.x,enemyGroundAt(u,u.x,u.z)+u.blastHeight,u.z);
      const elapsed=(u.blastTotal||2.5)-u.blastT;
      u.o.rotation.z=Math.sin(elapsed*5)*.75*Math.min(1,u.blastHeight+.2);
      if(landed&&u.blastT<.25)u.blastT=0;
      if(u.blastRagdoll)window.HUNTER_RAGDOLL.update(u.blastRagdoll,dt,{
        airborne:!landed,grounded:landed});
    }
    return;
  }
  if(u.blastImpulse){
    if(u.blastRagdoll)window.HUNTER_RAGDOLL.reset(u.blastRagdoll);
    u.blastRagdoll=null;u.blastImpulse=null;u.blastHeight=0;u.o.rotation.z=0
  }
  const oldX=u.x,oldZ=u.z;
  if(u.t==='torre')return; // La torre ja és una estructura inerta.
  if(u.towerGuard&&!nativeCoopSession){towerGuardTick(u,dt);return;}
  if(u.t==='soldat'&&u.enemyVehicleClaim&&u.enemyVehicleClaim.phase!=='approach'&&!nativeCoopSession){
    u.cd=Math.max(0,(u.cd||0)-dt); // el passatger pot fer diversos trets
    enemyVehicleBoardingTick(u,dt);return;
  }
  u.alert=Math.max(0,u.alert-dt);u.cd-=dt;u.playerHitCd=Math.max(0,(u.playerHitCd||0)-dt);
   const q=cv||P,py=cv?cv.o.position.y:P.y,dx=q.x-u.x,dz=q.z-u.z,d=Math.hypot(dx,dz),
         det=disg&&!cv?20:u.alert>0?300:u.t=='general'?60:120,
        eyeY=u.o.position.y+(u.t=='torre'?9.4:2.2);

  // Dins una casa es pot sentir el jugador encara que una paret talli
  // la línia visual. Això inicia la persecució, mai el tret a cegues.
  // Percepció desacoblada del moviment: ~10 Hz i desfasada entre enemics.
  u.senseT=(u.senseT??0)-dt;
  const senseStamp=performanceStatsVisible&&u.senseT<=0?performance.now():0;
  if(u.senseT<=0){
    u.senseT+=ENEMY_SENSE_DT;
    const bunker=activeBunker,
      localBunker=bunker?.basement?buildingLocalPoint(bunker,q.x,q.z):null,
      withinBunker=!!localBunker&&
        Math.abs(localBunker.x)<bunker.basement.halfX&&
        Math.abs(localBunker.z)<bunker.basement.halfZ,
      acrossFloor=!!(u.basement||withinBunker&&py<bunker.fy-3.9)&&
        Math.abs((u.gy??u.o.position.y)-py)>4.4,
       sameBasement=!!u.basement&&py<bunker.fy-3.9&&eyeY<bunker.fy-3.9,
       // El general pot detectar intrusos dins del mateix nivell sense
       // quedar falsament ocult per la muntanya, però respecta els murs.
       seen=!cheats.invisible&&!over&&!acrossFloor&&d<det&&
         (sameBasement&&u.t==='general'
           ?soldierClearShot(u,u.x,u.z,eyeY,q,py)
           :(sight(u.x,u.z,q.x,q.z,eyeY,true,py+1.5)||
           (!cv&&!playerCrouched&&sight(u.x,u.z,q.x,q.z,eyeY,true,py+2.35))));
    if(u.t==='soldat'){
       // Requisició per distància: no requereix con visual ni línia de tir.
       if(!nativeCoopSession&&!cheats.invisible&&!over&&!u.enemyVehicleClaim){
         const fleeing=enemyRequisition.observeFleeing(
           u,q,elapsed,u.enemyFleeTracking??={});
         const justFled=fleeing&&!u.enemyRequisitionWasFleeing;
         u.enemyRequisitionWasFleeing=fleeing;
         const notice=fleeing?enemyRequisition.REQUISITION.fleeingNoticeRadius:
           enemyRequisition.REQUISITION.noticeRadius;
         if(d<=notice&&(justFled||elapsed>=(u.enemyRequisitionNextTry||0))){
           u.enemyRequisitionNextTry=elapsed+enemyRequisition.REQUISITION.retrySeconds;
           enemyVehicleReserve(u,{fleeing});
         }
       }
       const raw=!cheats.invisible&&!!(cv? !over&&d<115&&
         STEALTH.inView(u.hd,dx,py+1.5-eyeY,dz,115)&&
         soldierClearShot(u,u.x,u.z,eyeY,q,py):
         !acrossFloor&&soldierVisualContact(u,q,py,d));
       // La silueta ajupida tarda més a ser reconeguda i només és
       // detectable de prop. Veure-la breument genera sospita, no foc.
       u.recognition=window.HUNTER_ENEMY_PERCEPTION.recognizeSoldier(u.recognition,raw,d,playerCrouched&&!cv,ENEMY_SENSE_DT);
       const confirmed=raw&&u.recognition>=.45;
       const acquired=confirmed&&!u.canSee;
       u.canSee=confirmed;
       u.canShoot=confirmed&&soldierVisibleShotHeight(u,u.x,u.z,eyeY,q,
         py-(!cv&&playerCrouched?.25:0))!==null;
       if(confirmed){
         u.lastSeenX=q.x;u.lastSeenZ=q.z;u.lastSeenY=py;
         u.pursuitT=SOLDIER_MEMORY;u.aiMode='combat';
         u.searchT=SOLDIER_MEMORY+d/Math.max(1,u.sp);
         if(acquired){u.cd=0;soldierWarnNeighbors(u,q,py)}
       }else{
         if(u.aiMode==='combat')u.aiMode='search';
         if(raw&&u.aiMode!=='search'){
           u.aiMode='suspicious';u.lastSeenX=q.x;u.lastSeenZ=q.z;u.lastSeenY=py;
           u.searchT=STEALTH.CONFIG.investigateSeconds+d/Math.max(1,u.sp*.65);
         }else if(!raw&&u.aiMode==='suspicious')u.aiMode='investigate';
         const noise=cheats.invisible?null:STEALTH.heardAt(u.x,eyeY,u.z,u.heardId||0);
         if(noise){
           u.heardId=noise.id;
           if(u.aiMode!=='search'&&u.aiMode!=='combat'){
             u.aiMode='investigate';u.searchT=STEALTH.CONFIG.investigateSeconds+
               Math.hypot(noise.x-u.x,noise.z-u.z)/Math.max(1,u.sp*.65);
           }
           // El soroll no revela la posició ACTUAL del jugador; només
           // deixa un rastre de posició que pot tenir una petita imprecisió.
           const heard=window.HUNTER_ENEMY_PERCEPTION.heardPosition(u,noise);
           u.lastSeenX=heard.x;u.lastSeenZ=heard.z;u.lastSeenY=heard.y;
         }
       }
      u.defenseTarget=null;
    }else{
      u.canSee=seen;
      u.defenseTarget=seen&&u.sp>0&&d>u.rng*.55?chooseDefense(u,q):null;
    }
  }
  if(senseStamp)perfHotspots.aiSenseMs+=performance.now()-senseStamp;

   if(u.t==='soldat'&&u.enemyVehicleClaim&&!nativeCoopSession){
     if(enemyVehicleBoardingTick(u,dt))return;
   }
   if(u.t==='soldat'&&(u.canSee||u.aiMode&&u.aiMode!=='patrol')){
    u.tacticT=Math.max(0,(u.tacticT||0)-dt);
     const target=u.canSee?q:{x:u.lastSeenX??u.x,z:u.lastSeenZ??u.z},
          targetY=u.canSee?py:(u.lastSeenY??u.o.position.y),
          td=Math.hypot(target.x-u.x,target.z-u.z);
     if(!u.canSee){
       u.searchT=Math.max(0,(u.searchT||0)-dt);
       if(u.searchT<=0){u.aiMode='patrol';u.recognition=0;u.tacticGoal=null}
     }
     if(u.aiMode!=='patrol'){
       const knownBuilding=soldierKnownBuilding(target,targetY),
         entering=!!knownBuilding&&soldierEnterBuilding(u,knownBuilding,target,dt,targetY);
       if(!knownBuilding&&u.entryDoor)releaseSoldierEntry(u);
       if(!entering){
         if(u.canSee)soldierEngage(u,target,targetY,dt,td,true);
         else soldierInvestigate(u,target,dt,u.aiMode==='search'?1:.65);
       }
     }
     if(u.aiMode!=='patrol'&&u.canSee&&u.canShoot&&d<=SOLDIER_FIRE_RANGE&&u.cd<=0){
      u.cd=u.rate;
      const [ax,ay,az]=enemyShotDirection(u,q,py,eyeY);
      if(u.rocketSoldier){
        const fx=-Math.sin(u.hd),fz=-Math.cos(u.hd),
              rightX=Math.cos(u.hd),rightZ=-Math.sin(u.hd);
        shoot(u.x+fx*1.65+rightX*.44,eyeY+.65,
          u.z+fz*1.65+rightZ*.44,ax,ay,az,76,COMBAT_BALANCE.weapons.bazooka,8,'e',mS,1.9,u);
      }else shoot(u.x,eyeY,u.z,ax,ay,az,70,u.dmg,0,'e',mW,SMALL_ARMS_SCALE,u);
    }
  }else if(u.t==='general'&&u.canSee){
    // Fugida lenta mentre dispara. El general continua sempre dins del
    // seu despatx subterrani i no atravessa envans ni mobiliari.
    if(u.basement?.basement?.generalRoom&&d<36&&d>.01){
      const b=u.basement,room=b.basement.generalRoom;
      const nx=dx/d,nz=dz/d;
      const local=buildingLocalPoint(b,u.x-nx*7,u.z-nz*7);
      const destination=buildingWorldPoint(b,
        Math.max(room.xMin,Math.min(room.xMax,local.x)),
        Math.max(room.zMin,Math.min(room.zMax,local.z)));
      if(Math.hypot(destination.x-u.x,destination.z-u.z)>.7)
        mvE(u,u.sp*dt,destination.x,destination.z);
    }
    // Independentment de la direcció de la fugida, mira el jugador.
    u.hd=Math.atan2(u.x-q.x,u.z-q.z);
    if(d<u.rng&&u.cd<=0&&soldierVisibleShotHeight(u,u.x,u.z,eyeY,q,py)!==null){
      u.cd=u.rate;
      const [ax,ay,az]=enemyShotDirection(u,q,py,eyeY);
      shoot(u.x,eyeY,u.z,ax,ay,az,70,u.dmg,0,'e',mW,SMALL_ARMS_SCALE,u);
    }
  }else if(u.canSee){
    u.hd=Math.atan2(-dx,-dz);
    if(u.sp>0&&d>u.rng*.55){
      const dp=u.defenseTarget;
      if(dp&&Math.hypot(dp.x-u.x,dp.z-u.z)>1.8){
        u.hd=Math.atan2(u.x-dp.x,u.z-dp.z);mvE(u,u.sp*.75*dt,dp.x,dp.z)
      }else if(d>u.rng*.72)mvE(u,u.sp*dt,q.x,q.z)
    }
    if(u.t!=='tanc'&&u.t!=='tanqueta'&&d<u.rng&&u.cd<=0){
      if(u.t==='jeep'){
        const rifle=enemyCarRifleShot(u,q,py);
        if(rifle){u.cd=u.rate;const p=rifle.origin,v=rifle.direction;
          shoot(p.x,p.y,p.z,v.x,v.y,v.z,70,u.dmg,0,'e',mW,SMALL_ARMS_SCALE,u)}
      }else{
        u.cd=u.rate;const [ax,ay,az]=enemyShotDirection(u,q,py,eyeY);
        const smallBullet=u.t==='general';
        shoot(u.x,eyeY,u.z,ax,ay,az,u.spl?60:70,u.dmg,u.spl,
          'e',smallBullet?mW:mE,smallBullet?SMALL_ARMS_SCALE:(u.spl?2:1),u);
      }
    }
  }else if(u.sp>0&&u.t!=='general'){
    const waypointDistance=Math.hypot(u.tx-u.x,u.tz-u.z),
          hqPatrolVehicle=u.t==='tanqueta'&&!!u.hqPatrolZone||enemyIsVehicle(u)&&u.compound==='hq'||!!u.interCompoundPatrol;
    // Una tanqueta tarda bastant més de 2,5 s a travessar un tram
    // de 68 m. No li avancem el waypoint abans d'arribar-hi:
    // això la feia tallar pel búnquer i acabar encallada a les cantonades.
    // Marge de 30 s sobre el temps previst del tram per recuperar bloquejos.
    if((hqPatrolVehicle?(u.pi<0||waypointDistance<(u.t==='jeep'?9.5:5)||u.wt< -30):
        (u.wt<=0||waypointDistance<2))){
      if(u.patrol&&u.patrol.length){
        u.pi=((u.pi==null?-1:u.pi)+1)%u.patrol.length;u.tx=u.patrol[u.pi].x;u.tz=u.patrol[u.pi].z;u.wt=hqPatrolVehicle?Math.max(2.5,Math.hypot(u.tx-u.x,u.tz-u.z)/Math.max(1,u.sp*.35)):u.guard?2.5:8
      }else{
        const roam=u.guard?8:25;u.tx=u.home.x+rr(-roam,roam);u.tz=u.home.z+rr(-roam,roam);u.wt=u.guard?3:6
      }
    }
    u.wt-=dt;u.hd=Math.atan2(u.x-u.tx,u.z-u.tz);mvE(u,u.sp*(u.guard?.35:.5)*dt)
  }

  u.o.position.set(u.x,(u.gy!=null?u.gy:enemyGroundAt(u,u.x,u.z))+(u.t=='jeep'||u.t=='tanc'?.05:0),u.z);
  if(u.t==='soldat'||u.t==='general')enemyStepSound(u,Math.hypot(u.x-oldX,u.z-oldZ));
  if(enemyIsVehicle(u)){
    // Velocitat real del desplaçament, no la velocitat nominal de patrulla.
    // La col·lisió amb un jugador a peu la consultarà al fotograma següent.
    u.impactFromX=oldX;u.impactFromZ=oldZ;
    u.impactSpeed=dt>.0001?Math.hypot(u.x-oldX,u.z-oldZ)/dt:0;
    u.hd=u.navHd??u.hd;
  }
  // Enemics que comparteixen model de cotxe/tanqueta: el tren davanter
  // segueix la direcció real del moviment, sense canviar la seva IA.
  const lastVisualHeading=u.o.rotation.y;
  u.o.rotation.y=u.hd;
  // Blindats enemics: la torreta segueix el jugador independentment del
  // rumb de patrulla. Cada ràfega té una dispersió estable mentre apunten,
  // i el tret neix al canó quan aquest ha acabat d'orientar-se.
  if((u.t==='tanc'||u.t==='tanqueta')&&u.o.userData.turretPivot){
    let desired=new THREE.Vector3(-Math.sin(u.hd),0,-Math.cos(u.hd));
    if(u.canSee){
      const gun=window.HUNTER_VEHICLES.turretShot(THREE,u.o);
      if(gun){
        const aimX=q.x-gun.origin.x,
              aimY=py+(!cv&&playerCrouched?1.25:1.5)-gun.origin.y,
              aimZ=q.z-gun.origin.z;
        // Mantenim l'error estable mentre la torreta s'orienta.
        if(!u.armoredAimSpread)
          u.armoredAimSpread=window.HUNTER_ENEMY_ACCURACY.sample(
            DIF,u.t==='tanc'?'tank':'tankette',aimX,aimY,aimZ,rn);
        const offset=u.armoredAimSpread;
        desired.set(aimX+offset.x,aimY+offset.y,aimZ+offset.z);
      }
    }else u.armoredAimSpread=null;
    const aligned=window.HUNTER_VEHICLES.aimTurret(THREE,u.o,desired,dt);
    if(u.canSee&&d<u.rng&&u.cd<=0&&aligned){
      const gun=window.HUNTER_VEHICLES.turretShot(THREE,u.o);
      if(gun){
        u.cd=u.rate;u.armoredAimSpread=null;
        const p=gun.origin,v=gun.direction,small=u.t==='tanqueta';
        shoot(p.x,p.y,p.z,v.x,v.y,v.z,u.spl?60:70,u.dmg,u.spl,
          'e',small?mW:mE,small?SMALL_ARMS_SCALE:(u.spl?2:1),u);
      }
    }
  }
  if((u.t==='jeep'||u.t==='tanqueta')&&u.o.userData.steeringPivots){
    const dxMoved=u.x-oldX,dzMoved=u.z-oldZ,
          distance=Math.hypot(dxMoved,dzMoved),
          delta=Math.atan2(Math.sin(u.hd-lastVisualHeading),Math.cos(u.hd-lastVisualHeading)),
          visualTurn=distance>.003&&dt>0?Math.max(-1,Math.min(1,delta/(1.6*dt))):0;
    window.HUNTER_VEHICLES.animateSteering(u.o,u.t==='jeep'?'cotxe':u.t,visualTurn,dt);
    if(distance>.003){
      const signedDistance=dxMoved*(-Math.sin(u.hd))+dzMoved*(-Math.cos(u.hd));
      for(const wheel of u.o.userData.wheels||[])wheel.rotation.x-=signedDistance/(wheel.userData.radius||.65);
    }
  }
  animateEnemyInfantry(u,Math.hypot(u.x-oldX,u.z-oldZ)>.001,dt);
})}
function animateEnemyInfantry(u,moving,dt){
  if(!u.o.userData.legs)return;
    const a=u.o.userData;u.phase=(u.phase||0)+dt*u.sp;
    const swing=moving?Math.sin(u.phase)*.45:0;
    if(a.knees&&a.enemyLOD==='full')window.HUNTER_CHARACTERS.animateSoldier(u.o,{phase:u.phase,moving,aim:!!u.canSee,dt});
    else if(a.knees&&a.enemyLOD==='mid'){
      u.visualAnimT=(u.visualAnimT||0)+dt;
      if(u.visualAnimT>=.16){a.enemyMidMesh.rotation.z=moving?Math.sin(u.phase)*.035:0;u.visualAnimT=0}
    }
    else{
    a.legs[0].rotation.x=swing;a.legs[1].rotation.x=-swing;
    const aim=!!u.canSee;
    a.arms.forEach((arm,i)=>arm.rotation.x+=((aim?(u.rocketSoldier?(i?1.2:1.04):1.45):(i?swing:-swing)*.5)-arm.rotation.x)*(1-Math.exp(-12*dt)))
    }
}
function updDead(dt){
  for(let i=DEAD.length-1;i>=0;i--){
    const u=DEAD[i],pose=u.deadPose||(u.deadPose={yaw:0,roll:u.deadSide*1.4,
      pitch:0,armL:-.5,armR:.5,legL:-.2,legR:.2,vx:0,vz:0,vy:0,height:0});
    u.deadT+=dt;
    const k=Math.min(1,u.deadT/.65),e=1-Math.pow(1-k,3);
    pose.vy-=18*dt;
    pose.height=Math.max(0,pose.height+pose.vy*dt);
    if(pose.height===0){pose.vy=0;pose.vx*=Math.exp(-9*dt);pose.vz*=Math.exp(-9*dt)}
    else{pose.vx*=Math.exp(-1.1*dt);pose.vz*=Math.exp(-1.1*dt)}
    u.x+=pose.vx*dt;u.z+=pose.vz*dt;
    const base=u.basement?u.basement.basement.floorY:Math.max(0,hAt(u.x,u.z));
    u.o.position.set(u.x,base+pose.height+.05+(1-e)*.12,u.z);
    u.o.rotation.set(pose.pitch*e,u.hd+pose.yaw*e,pose.roll*e,'YXZ');
    if(u.ragdoll){
      // El ragdoll queda en repòs després de 3,2 s. Els cadàvers
      // continuen visibles fins als 18 s, però ja no consumeixen
      // integracions d'articulacions durant els últims fotogrames.
      if(u.deadT<3.2||pose.height>.09)
        window.HUNTER_RAGDOLL.update(u.ragdoll,dt,{
          airborne:pose.height>.09,grounded:pose.height<=.09});
    }else{
      // Animació específica del general, controlada per la victòria.
      if(u.o.userData.arms)u.o.userData.arms.forEach((arm,j)=>{
        arm.rotation.x=(j?pose.armR:pose.armL)*e;
        arm.rotation.z=(j?-.3:.3)*e;
      });
      if(u.o.userData.legs)u.o.userData.legs.forEach((leg,j)=>
        leg.rotation.x=(j?pose.legR:pose.legL)*e);
    }
    if(u.deadT>18){
      if(u.ragdoll){window.HUNTER_RAGDOLL.reset(u.ragdoll);u.ragdoll=null}
      world.remove(u.o);DEAD.splice(i,1)
    }
  }
}

function attachEnemyCarCrew(car,{initiallyHidden=false,type='cotxe'}={}){
  if(car.userData.enemyCarCrew)return car.userData.enemyCarCrew;
  if(type==='llanxa'||type==='llanxa_coets')
    return attachEnemyBoatCrew(car,{initiallyHidden,type});
  const makeSoldier=()=>window.HUNTER_CHARACTERS.createSoldier(THREE,{box:bx,material:M}),
        driver=makeSoldier(),gunner=type==='moto'?null:makeSoldier(),
        truck=type==='camio',civil=type==='cotxe_civil';
  // Aquests són exactament els ocupants procedimentals del Humvee de patrulla.
  // No reparentam el soldat de combat, que continuaria en postura dreta.
  // El camió A4.3 construeix els seients a z=-1.93, abans del
  // fit visual .82: z=-.62 corresponia a darrere de la cabina.
  // Mateixa escala del grup exterior i els mateixos pivots que el model A4.3.
  const truckFit=car.userData.truckVisualFit||.82,
        x=truck?.77*truckFit:civil?.613:.73,
        z=truck?-1.93*truckFit:civil?-.60:-.43,
        height=truck?2.04*truckFit:.94,
        scale=truck?.31:type==='moto'?.72:.43;
  driver.position.set(type==='moto'?0:-x,type==='moto'?.55:height,type==='moto'?.34:z);
  driver.scale.setScalar(scale);
  driver.userData.ar.rotation.x=1.18;driver.userData.al.rotation.x=1.12;
  driver.userData.gun.visible=type==='moto';
  // Amb una moto cal veure les dues cames: genolls flexionats i peus
  // als reposapeus, sense usar la silueta diminuta dels conductors de cotxe.
  let motorcycleMuzzle=null;
  if(type==='moto'){
    const rig=driver.userData;
    rig.ll.rotation.x=rig.lr.rotation.x=.95;
    rig.lkl.rotation.x=rig.lkr.rotation.x=-1.6;
    rig.ar.rotation.x=1.18;rig.aer.rotation.x=.52;
    motorcycleMuzzle=new THREE.Object3D();
    motorcycleMuzzle.position.set(0,0,-1.08);
    rig.gun.add(motorcycleMuzzle);
  }
  car.add(driver);
  let mount=null,pitch=null,muzzle=null;
  if(gunner){
    gunner.position.set(x,height,z);
    gunner.scale.setScalar(scale);
    gunner.userData.ar.rotation.x=1.25;gunner.userData.aer.rotation.x=.35;
    gunner.rotation.y=.26;
    const rifle=gunner.userData.gun;rifle.parent.remove(rifle);
    mount=new THREE.Group();pitch=new THREE.Group();
    mount.position.set(truck?1.98*truckFit:civil?1.30:1.46,
      truck?3.07*truckFit:2.07,
      truck?-2.03*truckFit:civil?-.6:-.30);
    mount.add(pitch);car.add(mount);
    rifle.position.set(0,-.035,-.14);rifle.rotation.set(0,0,0);rifle.scale.setScalar(.94);
    pitch.add(rifle);
    bx(rifle,.075,.075,.42,0x252d2c,0,0,-.97,'metal');
    muzzle=new THREE.Object3D();muzzle.position.set(0,0,-1.18);rifle.add(muzzle);
    car.add(gunner);
  }
  if(initiallyHidden){driver.visible=false;if(gunner)gunner.visible=false;if(mount)mount.visible=false;}
  return car.userData.enemyCarCrew={driver,gunner,mount,pitch,muzzle,motorcycleMuzzle};
}
// L'única font visual de les tripulacions requisadores, compartida SOLO/COOP.
window.HUNTER_ENEMY_CREW_VISUAL=Object.freeze({
  show(vehicle,seat,visible){
    if(!vehicle?.o)return;
    const type=vehicle.t,armored=type==='tanc'||type==='tanqueta';
    const mesh=vehicle.o;
    if(armored){
      // En blindats els ocupants no es veuen, però la bandera sí.
      const aboard=!!visible||(vehicle.enemyCrew||[]).some(c=>
        c&&(typeof c!=='object'||['riding','waiting'].includes(c.enemyVehicleClaim?.phase)));
      ensureEnemyVehicleFlag(mesh,type,aboard);return;
    }
    const crew=mesh.userData.enemyCarCrew||
      (visible?attachEnemyCarCrew(mesh,{initiallyHidden:true,type}):null);
    if(!crew)return;
    const occupant=seat===0?crew.driver:crew.gunner;
    if(occupant)occupant.visible=!!visible;
    if(seat===1&&crew.mount)crew.mount.visible=!!visible;
    ensureEnemyVehicleFlag(mesh,type,!!crew.driver?.visible||!!crew.gunner?.visible);
  }
});

function mkEn(t,x,z,gy,options={}){const c=EC[t];let g;
if(seedSearchMode){
  g=new THREE.Group();
  // Mateixos registres de col·lisió de les potes, sense construir la torre.
  if(t==='torre'){
    g.userData.towerLegMeshes=[-2.3,2.3].flatMap(lx=>
      [-1.9,1.9].map(lz=>({position:{x:lx,y:3.98,z:lz},
        geometry:{parameters:{width:.44,height:7.95,depth:.44}}})));
    g.userData.towerParapetMeshes=window.HUNTER_TOWER_MODEL.towerSideParapetVolumes()
      .map(w=>({position:{x:w.x,y:w.y,z:w.z},
        geometry:{parameters:{width:w.width,height:w.height,depth:w.depth}}}));
  }
}
else if(t=='soldat'||t=='general'){g=window.HUNTER_CHARACTERS.createSoldier(THREE,{box:bx,material:M,general:t==='general',elite:!!options.elite})}
else if(t==='patrulla_marina'){g=mkV('llanxa');createMarinePatrolVisual(g)}
else if(t=='jeep'){g=mkV('cotxe');attachEnemyCarCrew(g)}
else if(t=='tanqueta'){g=mkV('tanqueta')}
else if(t=='tanc'){g=mkV('tanc');bx(g,.2,2,.2,0xff2020,0,4,0)}
else if(t=='torre'){g=window.HUNTER_TOWER_MODEL.createTowerModel(THREE,{box:bx})}
else{g=new THREE.Group();bx(g,1,1,.6,0x222222,0,.5,0);bx(g,1.3,1.6,.7,0xd4af37,0,1.8,0);bx(g,.8,.8,.8,0xf0c9a0,0,3,0);bx(g,.9,.5,.9,0xaa0000,0,3.6,0);g.scale.setScalar(1.2)}
if(!seedSearchMode&&t!=='soldat'&&t!=='general')window.HUNTER_ENEMY_LOD.optimize(THREE,g,t);
if(!seedSearchMode&&t==='patrulla_marina')ensureEnemyVehicleFlag(g,'patrulla_marina');
if(!seedSearchMode)world.add(g);const sensePhase=(E.length%10)*.01,u={t,x,z,gy,hd:rr(0,6.28),o:g,home:{x,z},cd:rr(0,1),alert:0,wt:0,tx:x,tz:z,senseT:sensePhase,
  remoteAiPhase:((E.length*37)%101)/101,canSee:false,defenseTarget:null,...c};
if(options.elite){u.elite=true;u.hp=COMBAT_BALANCE.people.elite;u.dmg=COMBAT_BALANCE.weapons.eliteRifle;u.rng=85;u.rate=TANKETTE_FIRE_INTERVAL;u.sp=8;u.cd=.4+(E.length%4)*.14}
if(t==='torre'){u.sp=0;u.rate=0;u.rng=0}
E.push(u);
if(t==='torre'){
  const base=gy??enemyGroundAt(u,x,z);
  // Cada pota té el seu propi AABB: el pas entre les quatre continua obert.
  // Compartir Wl fa que jugador, vehicles, IA i projectils el respectin.
  u.towerLegColliders=g.userData.towerLegMeshes.map(m=>{
    const hw=m.geometry.parameters.width/2,hd=m.geometry.parameters.depth/2,
          hh=m.geometry.parameters.height/2,cx=x+m.position.x,cz=z+m.position.z;
    return {towerLegOwner:u,m,x0:cx-hw,x1:cx+hw,z0:cz-hd,z1:cz+hd,
      y0:base+m.position.y-hh,y1:base+m.position.y+hh,
      hp:Infinity,door:false,open:false,rammable:false,cx,cz};
  });
  Wl.push(...u.towerLegColliders);
  // Parapets laterals: mateixos volums que els models visibles.
  // Barrera per als trets entrants, però els soldats de dins poden
  // treure el fusell per damunt i disparar cap enfora.
  u.towerParapetColliders=(g.userData.towerParapetMeshes||[]).map(m=>{
    const hw=m.geometry.parameters.width/2,hd=m.geometry.parameters.depth/2,
      hh=m.geometry.parameters.height/2,cx=x+m.position.x,cz=z+m.position.z;
    return {towerParapet:true,towerParapetOwner:u,
      towerX:x,towerZ:z,towerBaseY:base,m,
      x0:cx-hw,x1:cx+hw,z0:cz-hd,z1:cz+hd,
      y0:base+m.position.y-hh,y1:base+m.position.y+hh,
      hp:Infinity,door:false,open:false,rammable:false,
      playerBlock:false,cx,cz};
  });
  Wl.push(...u.towerParapetColliders);
  // Dos soldats diferenciats, no armes ancorades a la caseta.
  // Continuen sent dianes individuals per les bales i les explosions.
  const rules=window.HUNTER_TOWER_MODEL;
  for(let seat=0;seat<2;seat++){
    const pos=rules.towerGuardPosition({x,z,y:base},seat),
      soldier=mkEn('soldat',pos.x,pos.z,pos.y);
    soldier.towerGuard=true;soldier.towerHost=u;soldier.towerSeat=seat;
    soldier.sp=0;soldier.rng=rules.TOWER_GUARD_RANGE;
    soldier.hd=u.hd;soldier.cd=1+seat*.9;
    soldier.o.position.set(pos.x,pos.y,pos.z);
    soldier.o.rotation.y=soldier.hd;
    soldier.rate=seat===1?5:1.1;
    soldier.senseT=seat*.05;
    if(seat===1){
      soldier.rocketSoldier=true;soldier.dmg=COMBAT_BALANCE.weapons.bazooka;
      soldier.spl=8;
      if(!seedSearchMode)window.HUNTER_CHARACTERS.equipBazooka(THREE,soldier.o,{box:bx});
    }
    (u.towerGuards||(u.towerGuards=[])).push(soldier);
  }
}
return u}

