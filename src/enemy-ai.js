const ENEMY_SENSE_DT=.1;
const SOLDIER_MEMORY=9,SOLDIER_RETREAT=9,SOLDIER_IDEAL=17,SOLDIER_FIRE_RANGE=125;
const STEALTH=window.HUNTER_STEALTH;
// Visió i escolta comparteixen la posició tridimensional, però no l'estat:
// sentir un tret només dóna una darrera posició aproximada a investigar.
function soldierVisualContact(u,target,targetY,d){
  const eyeY=u.o.position.y+2.2,
        crouched=!!playerCrouched&&!cv,
        range=STEALTH.CONFIG.sightRange*(u.elite?1.30:1)*
          (crouched?STEALTH.CONFIG.crouchVisibility:1)*
          ((disg&&!cv)?0.35:1),
        targetEye=targetY+(crouched?1.25:1.5),
        // No podem fer servir hAt() sota terra: retornaria l'altura
        // de la muntanya i faria invisibles els objectius a 30 metres.
        sameBasement=!!u.basement&&targetY<u.basement.fy-3.9&&
          eyeY<u.basement.fy-3.9;
  const dx=target.x-u.x,dz=target.z-u.z,
        facing=(-Math.sin(u.hd)*dx-Math.cos(u.hd)*dz)/Math.max(.01,d),
        // L'elit té un camp visual més ample als passadissos il·luminats,
        // però les parets continuen tallant completament la visió.
        eliteAwareness=u.elite&&sameBasement&&
          (d<7||facing>Math.cos(80*Math.PI/180))&&
          Math.abs(targetEye-eyeY)<8;
  if(over||d>range||!(eliteAwareness||
    STEALTH.inView(u.hd,dx,targetEye-eyeY,dz,range)))return false;
  if(!soldierClearShot(u,u.x,u.z,eyeY,target,targetY-(crouched?.25:0)))return false;
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
  STEALTH.emit('alert',witness.x,witness.o.position.y+2,witness.z);
}
// Punteria per dificultat. DIF=1.5 conserva exactament la dispersió antiga.
// Normal (1) falla més i Fàcil (.6) encara més, sense alterar el dany ni la IA.
function enemyAimSpread(){
  const difficulty=Math.max(.6,Math.min(1.5,DIF));
  return difficulty>=1 ? 1+(1.5-difficulty)*2.4 : 2.2+(1-difficulty)*5.5;
}
function enemyShotDirection(u,target,targetY,eyeY,roll=rn){
  const spread=enemyAimSpread();
  // Els canons explosius han de poder errar també fora del radi d'explosió.
  const explosiveBoost=u.spl?1+Math.min(1,u.spl/8)*(spread-1)*.5:1;
  const horizontal=1.5*spread*explosiveBoost,
        vertical=.85*(spread-1),
        dx=target.x-u.x+roll(-horizontal,horizontal),
         dy=targetY+(!cv&&playerCrouched?1.25:1.5)-eyeY+(vertical>0?roll(-vertical,vertical):0),
        dz=target.z-u.z+roll(-horizontal,horizontal),
        length=Math.hypot(dx,dy,dz);
  return [dx/length,dy/length,dz/length];
}

// El contacte visual i la possibilitat de disparar no són el mateix.
// Les parets i els vehicles aparcats obliguen el soldat a canviar d'angle.
function soldierClearShot(u,x,z,y,target,targetY){
  const tx=target.x,tz=target.z,ty=targetY+1.5,
        reach=Math.hypot(tx-x,tz-z)/2+3,mx=(x+tx)/2,mz=(z+tz)/2;
  for(const w of wallCandidates(mx,mz,reach)){
    if(w.open||w.barbed)continue;
    const t=segmentAabbT(x,y,z,tx,ty,tz,w.x0,w.x1,w.y0,w.y1,w.z0,w.z1);
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
    if(v===cv||v.destroyed)continue; // no ens bloqueja el vehicle objectiu
    const radius=vehicleRadius(v.t)*.55,vy=vehicleY(v)+Math.min(1.7,radius*.6);
    const t=segmentSphereT(x,y,z,tx,ty,tz,v.x,vy,v.z,radius);
    if(t!=null&&t<.97)return false;
  }
  return true;
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
      const score=lateral+forward*.5+(side===prefer?0:4);
      if(score<bestScore){bestScore=score;best={x,z}}
    }
  }
  // Si encara no hi ha una línia de tir clara, avancem lateralment fins a
  // passar la vora de l'obstacle; mvE/A* decideix com rodejar-lo.
  return best||{
    x:u.x+sideX*prefer*13+fx*9,
    z:u.z+sideZ*prefer*13+fz*9
  };
}
// Quan el jugador es refugia a dins, el soldat ha de trobar el portal
// d'entrada, creuar-lo i només llavors buscar una posició de tir.
function soldierEnterBuilding(u,b,target,dt){
  const door=b?.door;
  if(!door||door.locked||door.bunkerGate||b.hangar){
    u.entryBuilding=null;u.entryPhase=0;return false;
  }
  const inside=Math.abs(u.x-b.x)<b.w/2-1.15&&
               Math.abs(u.z-b.z)<b.d/2-1.15;
  if(inside){
    if(soldierChangeFloor(u,b,dt))return true;
    u.entryBuilding=null;u.entryPhase=0;return false;
  }
  // Dos trams amb memòria: aproximació per fora i pas cap a dins.
  // Sense retenir la fase, en allunyar-se 1 m del punt exterior el soldat
  // tornava enrere i quedava oscil·lant just davant del llindar.
  if(u.entryBuilding!==b){u.entryBuilding=b;u.entryPhase=0}
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
  if(u.entryPhase===0&&distance<=entryTolerance)u.entryPhase=1;
  const goal=u.entryPhase?interior:exterior;
  u.tacticGoal=null;u.tacticT=0;
  mvE(u,u.sp*dt,goal.x,goal.z);
  u.hd=Math.atan2(u.x-target.x,u.z-target.z);
  return true;
}
function soldierEngage(u,target,targetY,dt,d,visible){
  const eyeY=u.o.position.y+2.2,clear=visible&&u.canShoot;
  let goal=null,speed=u.sp;
  if(!clear){
    if(!u.tacticGoal||(u.tacticT||0)<=0||
       Math.hypot(target.x-(u.tacticTargetX??target.x),target.z-(u.tacticTargetZ??target.z))>7||
       Math.hypot(u.tacticGoal.x-u.x,u.tacticGoal.z-u.z)<2){
      u.tacticGoal=soldierFlankPosition(u,target,targetY);
      u.tacticTargetX=target.x;u.tacticTargetZ=target.z;u.tacticT=.85;
    }
    goal=u.tacticGoal;speed=u.sp*.95;
  }else{
    u.tacticGoal=null;u.tacticT=0;
    const fx=(target.x-u.x)/Math.max(d,.001),fz=(target.z-u.z)/Math.max(d,.001);
    if(d<SOLDIER_RETREAT){
      // Retirada mirant sempre el jugador, amb marge per evitar cantonades.
      goal={x:u.x-fx*12,z:u.z-fz*12};speed=u.sp*.87;
    }else if(d>SOLDIER_IDEAL){
      goal=target;speed=u.sp;
    }else if(d>13){
      goal=target;speed=u.sp*.5;
    }else{
      // Moviment lateral curt en lloc de quedar congelat a distància fixa.
      const side=u.avoidSide||1;
      goal={x:u.x-fz*side*6,z:u.z+fx*side*6};speed=u.sp*.55;
    }
  }
  if(goal)mvE(u,speed*dt,goal.x,goal.z);
  const toward=target;
  u.hd=Math.atan2(u.x-toward.x,u.z-toward.z); // la cara sempre al jugador
}

// Les defenses utilitzen el canó pesat contra qualsevol vehicle i
// el fusell lleuger contra el jugador a peu, sense nivells de blindatge.
function towerWeaponForTarget(vehicle){
  return vehicle?'heavy':'light';
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
  const spread=enemyAimSpread(),horizontal=1.5*spread,vertical=.85*(spread-1),
         aim=new THREE.Vector3(target.x+rn(-horizontal,horizontal),
           targetY+(!cv&&playerCrouched?1.25:1.5)+(vertical?rn(-vertical,vertical):0),target.z+rn(-horizontal,horizontal));
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
function updEn(dt){enemyPathBudget=2;enemyNodeBudget=160;rebuildVehicleGrid();E.forEach(u=>{
  if(u.t==='patrulla_marina'){updateMarinePatrol(u,dt);return}
  if(u.blastT>0){
    const imp=u.blastImpulse;u.blastT=Math.max(0,u.blastT-dt);
    if(imp){
      u.x+=imp.vx*dt;u.z+=imp.vz*dt;
      imp.vy-=19*dt;
      u.blastHeight=Math.max(0,(u.blastHeight||0)+imp.vy*dt);
      if(u.blastHeight===0)imp.vy=0;
      // En vol es manté l'empenta; a terra es frena ràpid.
      const landed=u.blastHeight===0;
      imp.vx*=Math.exp(-(landed?7:1.7)*dt);
      imp.vz*=Math.exp(-(landed?7:1.7)*dt);
      u.o.position.set(u.x,Math.max(0,hAt(u.x,u.z))+u.blastHeight,u.z);
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
  u.alert=Math.max(0,u.alert-dt);u.cd-=dt;if(u.t==='torre')u.heavyCd-=dt;u.playerHitCd=Math.max(0,(u.playerHitCd||0)-dt);
   const q=cv||P,py=cv?cv.o.position.y:P.y,dx=q.x-u.x,dz=q.z-u.z,d=Math.hypot(dx,dz),
         det=disg&&!cv?20:u.alert>0?300:u.t=='general'?60:120,
        eyeY=u.o.position.y+(u.t=='torre'?9.4:2.2);

  // Dins una casa es pot sentir el jugador encara que una paret talli
  // la línia visual. Això inicia la persecució, mai el tret a cegues.
  const hidingInside=!cv&&ib&&!ib.hangar&&!ib.door?.locked&&!disg;
  // Percepció desacoblada del moviment: ~10 Hz i desfasada entre enemics.
  u.senseT=(u.senseT??0)-dt;
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
           :sight(u.x,u.z,q.x,q.z,eyeY));
    if(u.t==='soldat'){
       const raw=!cheats.invisible&&!!(cv? !over&&d<115&&
         STEALTH.inView(u.hd,dx,py+1.5-eyeY,dz,115)&&
         soldierClearShot(u,u.x,u.z,eyeY,q,py):
         !acrossFloor&&soldierVisualContact(u,q,py,d));
       // La silueta ajupida tarda més a ser reconeguda i només és
       // detectable de prop. Veure-la breument genera sospita, no foc.
       u.recognition=Math.max(0,Math.min(1.5,(u.recognition||0)+
         (raw?ENEMY_SENSE_DT*(d<12?4:((playerCrouched&&!cv)?0.9:2)):-ENEMY_SENSE_DT*3)));
       const confirmed=raw&&u.recognition>=.45;
       const acquired=confirmed&&!u.canSee;
       u.canSee=confirmed;
       u.canShoot=confirmed&&soldierClearShot(u,u.x,u.z,eyeY,q,
         py-(!cv&&playerCrouched?.25:0));
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
           const uncertainty=noise.kind==='alert'?0:noise.radius>=100?4:1.5;
           u.lastSeenX=noise.x+Math.sin(u.x+noise.id)*uncertainty;
           u.lastSeenZ=noise.z+Math.cos(u.z+noise.id)*uncertainty;
           u.lastSeenY=noise.y;
         }
       }
      u.defenseTarget=null;
    }else{
      u.canSee=seen;
      u.defenseTarget=seen&&u.sp>0&&d>u.rng*.55?chooseDefense(u,q):null;
    }
  }

   if(u.t==='soldat'&&(u.canSee||u.aiMode&&u.aiMode!=='patrol')){
    u.tacticT=Math.max(0,(u.tacticT||0)-dt);
     const target=u.canSee?q:{x:u.lastSeenX??u.x,z:u.lastSeenZ??u.z},
          targetY=u.canSee?py:(u.lastSeenY??py),
          td=Math.hypot(target.x-u.x,target.z-u.z);
     if(!u.canSee){
       u.searchT=Math.max(0,(u.searchT||0)-dt);
       if(u.searchT<=0){u.aiMode='patrol';u.recognition=0;u.tacticGoal=null}
     }
     if(u.aiMode!=='patrol'){
       const entering=!!ib&&(u.canSee||hidingInside&&td<17)&&
         soldierEnterBuilding(u,ib,target,dt);
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
          u.z+fz*1.65+rightZ*.44,ax,ay,az,76,COMBAT_BALANCE.weapons.bazooka,8,'e',mS,1.9);
      }else shoot(u.x,eyeY,u.z,ax,ay,az,70,u.dmg,0,'e',mW,SMALL_ARMS_SCALE);
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
    if(d<u.rng&&u.cd<=0&&soldierClearShot(u,u.x,u.z,eyeY,q,py)){
      u.cd=u.rate;
      const [ax,ay,az]=enemyShotDirection(u,q,py,eyeY);
      shoot(u.x,eyeY,u.z,ax,ay,az,70,u.dmg,0,'e',mW,SMALL_ARMS_SCALE);
    }
  }else if(u.canSee){
    u.hd=Math.atan2(-dx,-dz);
    if(u.sp>0&&d>u.rng*.55){
      const dp=u.defenseTarget;
      if(dp&&Math.hypot(dp.x-u.x,dp.z-u.z)>1.8){
        u.hd=Math.atan2(u.x-dp.x,u.z-dp.z);mvE(u,u.sp*.75*dt,dp.x,dp.z)
      }else if(d>u.rng*.72)mvE(u,u.sp*dt,q.x,q.z)
    }
    if(u.t==='torre'){
      const weapon=towerWeaponForTarget(cv);
      // Mai no fem servir projectils pesats contra una persona a peu.
      // El tipus de tir depèn de si el jugador pilota un vehicle.
      if(weapon==='light'&&d<u.rng&&u.cd<=0){
        u.cd=u.rate;
        const [ax,ay,az]=enemyShotDirection(u,q,py,eyeY),
              fx=-Math.sin(u.hd),fz=-Math.cos(u.hd);
        shoot(u.x+fx*2.4-Math.cos(u.hd)*.72,eyeY,
          u.z+fz*2.4+Math.sin(u.hd)*.72,ax,ay,az,70,u.dmg,0,'e',mW,SMALL_ARMS_SCALE);
      }else if(weapon==='heavy'&&d<u.heavyRange&&u.heavyCd<=0){
        u.heavyCd=u.heavyRate;
        const [ax,ay,az]=enemyShotDirection(u,q,py,eyeY-.2),
              fx=-Math.sin(u.hd),fz=-Math.cos(u.hd);
        shoot(u.x+fx*2.4+Math.cos(u.hd)*.72,eyeY-.2,
          u.z+fz*2.4-Math.sin(u.hd)*.72,ax,ay,az,76,COMBAT_BALANCE.weapons.towerHeavy,7,'e',mS,1.8);
      }
    }else if(u.t!=='tanc'&&u.t!=='tanqueta'&&d<u.rng&&u.cd<=0){
      if(u.t==='jeep'){
        const rifle=enemyCarRifleShot(u,q,py);
        if(rifle){u.cd=u.rate;const p=rifle.origin,v=rifle.direction;
          shoot(p.x,p.y,p.z,v.x,v.y,v.z,70,u.dmg,0,'e',mW,SMALL_ARMS_SCALE)}
      }else{
        u.cd=u.rate;const [ax,ay,az]=enemyShotDirection(u,q,py,eyeY);
        const smallBullet=u.t==='general';
        shoot(u.x,eyeY,u.z,ax,ay,az,u.spl?60:70,u.dmg,u.spl,
          'e',smallBullet?mW:mE,smallBullet?SMALL_ARMS_SCALE:(u.spl?2:1));
      }
    }
  }else if(u.sp>0&&u.t!=='general'){
    const waypointDistance=Math.hypot(u.tx-u.x,u.tz-u.z),
          hqPatrolVehicle=u.t==='tanqueta'&&!!u.hqPatrolZone||enemyIsVehicle(u)&&u.compound==='hq'||!!u.interCompoundPatrol;
    // Una tanqueta tarda bastant més de 2,5 s a travessar un tram
    // de 68 m. No li avancem el waypoint abans d'arribar-hi:
    // això la feia tallar pel búnquer i acabar encallada a les cantonades.
    // Marge de 30 s sobre el temps previst del tram per recuperar bloquejos.
    if((hqPatrolVehicle?(u.pi<0||waypointDistance<5||u.wt< -30):
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
  if(u.t!='torre')u.o.rotation.y=u.hd;
  else if(u.o.userData.towerTurret)u.o.userData.towerTurret.rotation.y=u.hd;
  // Blindats enemics: la torreta segueix el jugador independentment del
  // rumb de patrulla. Cada ràfega té una dispersió estable mentre apunten,
  // i el tret neix al canó quan aquest ha acabat d'orientar-se.
  if((u.t==='tanc'||u.t==='tanqueta')&&u.o.userData.turretPivot){
    let desired=new THREE.Vector3(-Math.sin(u.hd),0,-Math.cos(u.hd));
    if(u.canSee){
      if(!u.armoredAimSpread){
        const spread=enemyAimSpread(),
              boost=u.spl?1+Math.min(1,u.spl/8)*(spread-1)*.5:1,
              horizontal=1.5*spread*boost,
              vertical=.85*(spread-1);
        u.armoredAimSpread={x:rn(-horizontal,horizontal),
          y:vertical?rn(-vertical,vertical):0,z:rn(-horizontal,horizontal)};
      }
      const offset=u.armoredAimSpread,
            gun=window.HUNTER_VEHICLES.turretShot(THREE,u.o);
       if(gun)desired.set(q.x+offset.x-gun.origin.x,
         py+(!cv&&playerCrouched?1.25:1.5)+offset.y-gun.origin.y,q.z+offset.z-gun.origin.z);
    }else u.armoredAimSpread=null;
    const aligned=window.HUNTER_VEHICLES.aimTurret(THREE,u.o,desired,dt);
    if(u.canSee&&d<u.rng&&u.cd<=0&&aligned){
      const gun=window.HUNTER_VEHICLES.turretShot(THREE,u.o);
      if(gun){
        u.cd=u.rate;u.armoredAimSpread=null;
        const p=gun.origin,v=gun.direction,small=u.t==='tanqueta';
        shoot(p.x,p.y,p.z,v.x,v.y,v.z,u.spl?60:70,u.dmg,u.spl,
          'e',small?mW:mE,small?SMALL_ARMS_SCALE:(u.spl?2:1));
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
  if(u.o.userData.legs){
    const a=u.o.userData;u.phase=(u.phase||0)+dt*u.sp;
    const moving=Math.hypot(u.x-oldX,u.z-oldZ)>.001,swing=moving?Math.sin(u.phase)*.45:0;
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
})}
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

function attachEnemyCarCrew(car){
  const makeSoldier=()=>window.HUNTER_CHARACTERS.createSoldier(THREE,{box:bx,material:M}),
        driver=makeSoldier(),gunner=makeSoldier();
  driver.position.set(-.73,.94,-.43);gunner.position.set(.72,.94,-.43);
  driver.scale.setScalar(.43);gunner.scale.setScalar(.43);
  driver.userData.ar.rotation.x=1.18;driver.userData.al.rotation.x=1.12;
  gunner.userData.ar.rotation.x=1.25;gunner.userData.aer.rotation.x=.35;
  gunner.rotation.y=.26;
  // Un conductor sense fusell; l'artiller treu el seu per la finestra.
  driver.userData.gun.visible=false;
  const rifle=gunner.userData.gun;
  rifle.parent.remove(rifle);
  const mount=new THREE.Group(),pitch=new THREE.Group();
  mount.position.set(1.46,2.07,-.30);mount.add(pitch);car.add(mount);
  rifle.position.set(0,-.035,-.14);rifle.rotation.set(0,0,0);rifle.scale.setScalar(.94);
  pitch.add(rifle);
  // Tram final visible del canó; el marcador coincideix amb l'extrem.
  bx(rifle,.075,.075,.42,0x252d2c,0,0,-.97,'metal');
  const muzzle=new THREE.Object3D();muzzle.position.set(0,0,-1.18);rifle.add(muzzle);
  car.add(driver,gunner);
  car.userData.enemyCarCrew={driver,gunner,mount,pitch,muzzle};
}
function mkEn(t,x,z,gy,options={}){const c=EC[t];let g;
if(seedSearchMode){
  g=new THREE.Group();
  // Mateixos registres de col·lisió de les potes, sense construir la torre.
  if(t==='torre')g.userData.towerLegMeshes=[-1.45,1.45].flatMap(lx=>
    [-1.45,1.45].map(lz=>({position:{x:lx,y:3.9,z:lz},
      geometry:{parameters:{width:.38,height:7.8,depth:.38}}})));
}
else if(t=='soldat'||t=='general'){g=window.HUNTER_CHARACTERS.createSoldier(THREE,{box:bx,material:M,general:t==='general',elite:!!options.elite})}
else if(t==='patrulla_marina'){g=mkV('llanxa');createMarinePatrolVisual(g)}
else if(t=='jeep'){g=mkV('cotxe');attachEnemyCarCrew(g);bx(g,.2,2,.2,0xff2020,0,3.4,0)}
else if(t=='tanqueta'){g=mkV('tanqueta');bx(g,.18,1.7,.18,0xff2020,0,3.2,.4)}
else if(t=='tanc'){g=mkV('tanc');bx(g,.2,2,.2,0xff2020,0,4,0)}
else if(t=='torre'){g=new THREE.Group();const leg=0x4b5157,deck=0x626b70,cabin=0x7c2f2f,roof=0x343a3e;
g.userData.towerLegMeshes=[];
for(const lx of[-1.45,1.45])for(const lz of[-1.45,1.45])
  g.userData.towerLegMeshes.push(bx(g,.38,7.8,.38,leg,lx,3.9,lz,'metal'));
bx(g,4.4,.45,4.4,deck,0,7.9,0,'metal');
for(const x of[-2.05,2.05])bx(g,.16,1.25,4.15,leg,x,8.65,0,'metal');
for(const z of[-2.05,2.05])bx(g,4.15,1.25,.16,leg,0,8.65,z,'metal');
bx(g,2.75,1.8,2.75,cabin,0,9.15,0,'paint');
bx(g,1.9,.72,.08,0x6b9aa5,0,9.35,-1.39,'glass');
bx(g,3.35,.28,3.35,roof,0,10.25,0,'metal');
// Dues armes orientables: lleugera a l'esquerra i pesada a la dreta.
const turret=new THREE.Group();turret.position.y=9.25;g.add(turret);
bx(turret,.32,.32,2.1,roof,-.72,0,-2.25,'metal');
bx(turret,.58,.58,2.35,0x37433c,.72,-.2,-2.25,'metal');
bx(turret,.68,.65,.22,0x666b62,.72,-.2,-3.43,'metal');
g.userData.towerTurret=turret;
bx(g,.42,.8,.42,0xe4d36f,0,10.78,0,'paint')}
else{g=new THREE.Group();bx(g,1,1,.6,0x222222,0,.5,0);bx(g,1.3,1.6,.7,0xd4af37,0,1.8,0);bx(g,.8,.8,.8,0xf0c9a0,0,3,0);bx(g,.9,.5,.9,0xaa0000,0,3.6,0);g.scale.setScalar(1.2)}
if(!seedSearchMode&&t!=='soldat'&&t!=='general')window.HUNTER_ENEMY_LOD.optimize(THREE,g,t);
if(!seedSearchMode)world.add(g);const sensePhase=(E.length%10)*.01,u={t,x,z,gy,hd:rr(0,6.28),o:g,home:{x,z},cd:rr(0,1),alert:0,wt:0,tx:x,tz:z,senseT:sensePhase,canSee:false,defenseTarget:null,...c};
if(options.elite){u.elite=true;u.hp=COMBAT_BALANCE.people.elite;u.dmg=COMBAT_BALANCE.weapons.eliteRifle;u.rng=85;u.rate=TANKETTE_FIRE_INTERVAL;u.sp=8;u.cd=.4+(E.length%4)*.14}
if(t==='torre'){u.heavyCd=1.6+(E.length%5)*.4;u.heavyRate=4.2;u.heavyRange=95}
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
}
return u}

