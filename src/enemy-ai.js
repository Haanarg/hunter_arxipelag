const ENEMY_SENSE_DT=.1;
const SOLDIER_MEMORY=9,SOLDIER_RETREAT=9,SOLDIER_IDEAL=17,SOLDIER_FIRE_RANGE=125;
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
        dy=targetY+1.5-eyeY+(vertical>0?roll(-vertical,vertical):0),
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
    if(w.open)continue;
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
  if(u.entryPhase===0&&distance<.065)u.entryPhase=1;
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

function updEn(dt){enemyPathBudget=2;enemyNodeBudget=160;rebuildVehicleGrid();E.forEach(u=>{
  const oldX=u.x,oldZ=u.z;
  u.alert=Math.max(0,u.alert-dt);u.cd-=dt;u.playerHitCd=Math.max(0,(u.playerHitCd||0)-dt);
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
    const seen=!over&&d<det&&sight(u.x,u.z,q.x,q.z,eyeY);
    if(u.t==='soldat'){
      const acquired=seen&&!u.canSee;
      u.canSee=seen;
      u.canShoot=seen&&soldierClearShot(u,u.x,u.z,eyeY,q,py);
      if(seen||hidingInside&&d<65){
        u.lastSeenX=q.x;u.lastSeenZ=q.z;u.lastSeenY=py;
        u.pursuitT=SOLDIER_MEMORY;
        if(acquired)u.cd=0; // primer tret sense retard en detectar el jugador
      }
      u.defenseTarget=null;
    }else{
      u.canSee=seen;
      u.defenseTarget=seen&&u.sp>0&&d>u.rng*.55?chooseDefense(u,q):null;
    }
  }

  if(u.t==='soldat'&&(u.canSee||u.pursuitT>0)){
    u.pursuitT=Math.max(0,(u.pursuitT||0)-dt);
    u.tacticT=Math.max(0,(u.tacticT||0)-dt);
    const target=u.canSee?q:{x:u.lastSeenX,z:u.lastSeenZ},
          targetY=u.canSee?py:(u.lastSeenY??py),
          td=Math.hypot(target.x-u.x,target.z-u.z);
    const entering=hidingInside&&soldierEnterBuilding(u,ib,target,dt);
    if(!entering)soldierEngage(u,target,targetY,dt,td,!!u.canSee);
    if(!entering&&u.canSee&&u.canShoot&&d<=SOLDIER_FIRE_RANGE&&u.cd<=0){
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
    if(d<u.rng&&u.cd<=0){
      u.cd=u.rate;const y0=eyeY,[ax,ay,az]=enemyShotDirection(u,q,py,y0);
      const smallBullet=u.t==='tanqueta'||u.t==='general';
      shoot(u.x,y0,u.z,ax,ay,az,u.spl?60:70,u.dmg,u.spl,'e',smallBullet?mW:mE,smallBullet?SMALL_ARMS_SCALE:(u.spl?2:1))
    }
  }else if(u.sp>0){
    const waypointDistance=Math.hypot(u.tx-u.x,u.tz-u.z),
          hqTankette=u.t==='tanqueta'&&!!u.hqPatrolZone;
    // Una tanqueta tarda bastant més de 2,5 s a travessar un tram
    // de 68 m. No li avancem el waypoint abans d'arribar-hi:
    // això la feia tallar pel búnquer i acabar encallada a les cantonades.
    // Al cap de 32 s sense avançar, saltem al següent per desatrancar-la.
    if((hqTankette?(u.pi<0||waypointDistance<5||u.wt< -30):
        (u.wt<=0||waypointDistance<2))){
      if(u.patrol&&u.patrol.length){
        u.pi=((u.pi==null?-1:u.pi)+1)%u.patrol.length;u.tx=u.patrol[u.pi].x;u.tz=u.patrol[u.pi].z;u.wt=u.guard?2.5:8
      }else{
        const roam=u.guard?8:25;u.tx=u.home.x+rr(-roam,roam);u.tz=u.home.z+rr(-roam,roam);u.wt=u.guard?3:6
      }
    }
    u.wt-=dt;u.hd=Math.atan2(u.x-u.tx,u.z-u.tz);mvE(u,u.sp*(u.guard?.35:.5)*dt)
  }

  u.o.position.set(u.x,(u.gy!=null?u.gy:enemyGroundAt(u,u.x,u.z))+(u.t=='jeep'||u.t=='tanc'?.05:0),u.z);
  if(enemyIsVehicle(u)){u.hd=u.navHd??u.hd}
  // Enemics que comparteixen model de cotxe/tanqueta: el tren davanter
  // segueix la direcció real del moviment, sense canviar la seva IA.
  const lastVisualHeading=u.o.rotation.y;
  if(u.t!='torre')u.o.rotation.y=u.hd;
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
    if(a.knees)window.HUNTER_CHARACTERS.animateSoldier(u.o,{phase:u.phase,moving,aim:!!u.canSee,dt});
    else{
    a.legs[0].rotation.x=swing;a.legs[1].rotation.x=-swing;
    const aim=!!u.canSee;
    a.arms.forEach((arm,i)=>arm.rotation.x+=((aim?1.45:(i?swing:-swing)*.5)-arm.rotation.x)*(1-Math.exp(-12*dt)))
    }
  }
})}
function updDead(dt){for(let i=DEAD.length-1;i>=0;i--){const u=DEAD[i];u.deadT+=dt;const k=Math.min(1,u.deadT/.55),e=1-Math.pow(1-k,3),base=u.gy!=null?u.gy:enemyGroundAt(u,u.x,u.z);u.o.position.set(u.x,base+.05+(1-e)*.12,u.z);u.o.rotation.y=u.hd;u.o.rotation.z=u.deadSide*e*Math.PI*.48;if(u.o.userData.arms)u.o.userData.arms.forEach((a,j)=>{a.rotation.x=(-.35+j*.7)*e;a.rotation.z=(j?-.25:.25)*e});if(u.o.userData.legs)u.o.userData.legs.forEach((l,j)=>l.rotation.x=(j?-.18:.18)*e);if(u.o.userData.knees)window.HUNTER_CHARACTERS.animateSoldier(u.o,{dt,death:e});if(u.deadT>18){world.remove(u.o);DEAD.splice(i,1)}}}
function mkEn(t,x,z,gy){const c=EC[t];let g;
if(t=='soldat'||t=='general'){g=window.HUNTER_CHARACTERS.createSoldier(THREE,{box:bx,material:M,general:t==='general'})}
else if(t=='jeep'){g=mkV('cotxe');bx(g,.2,2,.2,0xff2020,0,3.4,0)}
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
bx(g,.32,.32,2.1,roof,0,9.25,-2.25,'metal');
bx(g,.42,.8,.42,0xe4d36f,0,10.78,0,'paint')}
else{g=new THREE.Group();bx(g,1,1,.6,0x222222,0,.5,0);bx(g,1.3,1.6,.7,0xd4af37,0,1.8,0);bx(g,.8,.8,.8,0xf0c9a0,0,3,0);bx(g,.9,.5,.9,0xaa0000,0,3.6,0);g.scale.setScalar(1.2)}
world.add(g);const sensePhase=(E.length%10)*.01,u={t,x,z,gy,hd:rr(0,6.28),o:g,home:{x,z},cd:rr(0,1),alert:0,wt:0,tx:x,tz:z,senseT:sensePhase,canSee:false,defenseTarget:null,...c};E.push(u);
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


