'use strict';
const assert=require('node:assert/strict');
(async()=>{
  const game=await require('./harness.cjs')();
  const report=game.run(`(()=>{
    world=new THREE.Group();scene.add(world);seedSearchMode=true;R=()=>.5;
    hAt=()=>3;groundAt=()=>3;treeHit=()=>false;TG.clear();Wl=[];B=[];V=[];E=[];
    started=1;over=0;paused=false;cv=null;ib=null;activeBunker=null;
    cheats.invisible=false;cheats.immune=false;playerCrouched=false;disg=false;
    const fresh=()=>{
      resetSoldierCoordination();STEALTH.clear();Wl=[];B=[];V=[];E=[];
      for(const p of Pj)world.remove(p.o);Pj.length=0;
      P.x=0;P.y=3;P.z=-30;
    };
    const unit=(x=0,z=0)=>{
      const u=mkEn('soldat',x,z,3);u.o.position.set(x,3,z);
      Object.assign(u,{hd:0,navHd:0,aiMode:'patrol',senseT:0,cd:99,sp:4,avoidSide:1});
      return u;
    };
    const wall=(x0,x1,z0,z1)=>Wl.push({x0,x1,z0,z1,y0:3,y1:10,hp:12,open:false});
    const result={};
    fresh();const witness=unit();rebuildVehicleGrid();
    updEn(.1);result.suspicion={mode:witness.aiMode,confirmed:witness.canSee,shots:Pj.length};
    updEn(.1);updEn(.1);
    result.contact={mode:witness.aiMode,confirmed:witness.canSee,recognition:witness.recognition};
    // El crit propi no ha d'esborrar la darrera posició visual del jugador.
    wall(-50,50,-15.3,-14.7);
    const seenX=witness.lastSeenX,seenZ=witness.lastSeenZ;
    P.x=40;P.z=-60;updEn(.1);
    result.search={mode:witness.aiMode,confirmed:witness.canSee,
      remembered:Math.hypot(witness.lastSeenX-seenX,witness.lastSeenZ-seenZ)<.001};
    fresh();const listener=unit();P.x=400;P.z=400;
    STEALTH.emit('run',10,4.5,0);updEn(.1);
    const heardX=listener.lastSeenX,heardZ=listener.lastSeenZ;
    result.noise={mode:listener.aiMode,confirmed:listener.canSee,
      error:Math.hypot(heardX-10,heardZ),playerError:Math.hypot(heardX-P.x,heardZ-P.z)};
    P.x=-400;P.z=-400;STEALTH.tick(1);updEn(.1);
    result.noise.retainsTrace=listener.lastSeenX===heardX&&listener.lastSeenZ===heardZ;
    for(let n=0;n<220&&listener.aiMode!=='patrol';n++){STEALTH.tick(.1);updEn(.1)}
    result.noise.expires=listener.aiMode==='patrol';
    const doorTrial=order=>{
      fresh();
      const b={x:0,z:-8,w:14,d:16,fy:3,h:7,
        door:{cx:0,cz:0,nx:0,nz:1,locked:false,open:true}};
      wall(-7,-1.25,-.3,.3);wall(1.25,7,-.3,.3);
      wall(-7.3,-6.7,-16,0);wall(6.7,7.3,-16,0);wall(-7,7,-16.3,-15.7);
      const soldiers=[-4,0,4].map(x=>{const u=unit(x,8);u.aiMode='investigate';return u});
      let minSeparation=Infinity,invalid=0;
      for(let n=0;n<600;n++){
        soldierCoordinationTick(.05);enemyPathBudget=2;enemyNodeBudget=160;rebuildVehicleGrid();
        for(const i of order){
          const u=soldiers[i],target={x:(i-1)*4,z:-12};
          if(!soldierEnterBuilding(u,b,target,.05,3))mvE(u,u.sp*.05,target.x,target.z);
          u.o.position.set(u.x,3,u.z);
          if(!enemySolidAt(u,u.x,u.z,u.hd))invalid++;
        }
        for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)
          minSeparation=Math.min(minSeparation,Math.hypot(soldiers[i].x-soldiers[j].x,soldiers[i].z-soldiers[j].z));
      }
      return {inside:soldiers.filter(u=>Math.abs(u.x)<5.85&&u.z< -1.15&&u.z> -14.85).length,
        minSeparation,invalid,positions:soldiers.map(u=>({x:u.x,z:u.z}))};
    };
    result.door=doorTrial([0,1,2]);result.rotatedDoor=doorTrial([2,1,0]);
    fresh();
    const team=[-2.5,0,2.5].map(x=>{const u=unit(x,0);u.aiMode='combat';u.canSee=true;return u});
    rebuildVehicleGrid();
    const goals=team.map(u=>soldierFlankPosition(u,{x:0,z:-40},3));
    result.reservations={count:soldierReservations.size,minDistance:Infinity};
    for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)
      result.reservations.minDistance=Math.min(result.reservations.minDistance,Math.hypot(goals[i].x-goals[j].x,goals[i].z-goals[j].z));
    team[0].hp=0;soldierCoordinationTick(.05);
    result.reservations.deathReleased=!soldierReservations.has(team[0]);
    soldierCoordinationTick(2);result.reservations.expired=soldierReservations.size===0;
    fresh();soldierCoordinationTick(1000);
    const doorway={x:0,z:-8,w:14,d:16,fy:3,h:7,
      door:{cx:0,cz:0,nx:0,nz:1,locked:false,open:true}},target={x:0,z:-12};
    const first=unit(0,8),second=unit(4,8);first.aiMode=second.aiMode='investigate';
    soldierEnterBuilding(first,doorway,target,0,3);soldierEnterBuilding(second,doorway,target,0,3);
    first.hp=0;soldierCoordinationTick(.05);soldierEnterBuilding(second,doorway,target,0,3);
    result.queueDeath=first.entryDoor===null&&soldierDoorQueues.get(doorway.door)?.queue[0]?.unit===second;
    // Manté la sol·licitud activa, però el propietari no avança físicament.
    for(let n=0;n<23;n++){soldierCoordinationTick(.1);soldierEnterBuilding(second,doorway,target,0,3)}
    result.blockedReleased=second.entryDoor===null&&!!second.entryWaiting;
    resetSoldierCoordination();soldierEnterBuilding(second,doorway,target,0,3);
    result.resetRetryImmediate=soldierDoorQueues.get(doorway.door)?.queue[0]?.unit===second&&
      !second.entryWaiting;
    soldierCoordinationTick(.4);
    result.abandonedReleased=soldierDoorQueues.size===0&&second.entryDoor===null;
    fresh();stealthFeedback.reset();
    const visibleSoldier=unit(0,-10);visibleSoldier.aiMode='suspicious';world.add(visibleSoldier.o);
    P.x=0;P.y=3;P.z=10;cam.position.set(0,5,15);cam.lookAt(0,4.6,-10);
    const draw=()=>{renderStealthFeedback();return stealthFeedback.stats.visible};
    const markerState=()=>{
      const entry=stealthFeedback.entries.find(x=>x.unit===visibleSoldier);
      return entry?{mode:entry.mode,color:entry.mesh.material.color.getHex(),geometry:entry.mesh.geometry,
        depthTest:entry.mesh.material.depthTest,depthWrite:entry.mesh.material.depthWrite}:null;
    };
    result.markers={clear:draw()};const suspicionMarker=markerState();
    visibleSoldier.aiMode='combat';visibleSoldier.canSee=true;draw();const contactMarker=markerState();
    visibleSoldier.aiMode='search';visibleSoldier.canSee=false;draw();const searchMarker=markerState();
    result.markers.states=[suspicionMarker.mode,contactMarker.mode,searchMarker.mode];
    result.markers.distinctColors=new Set([suspicionMarker.color,contactMarker.color,searchMarker.color]).size;
    result.markers.distinctShapes=new Set([suspicionMarker.geometry,contactMarker.geometry,searchMarker.geometry]).size;
    result.markers.depthSafe=searchMarker.depthTest&&!searchMarker.depthWrite;
    wall(-20,20,-.3,.3);result.markers.wall=draw();
    Wl[0].open=true;result.markers.openDoor=draw();
    Wl[0].open=false;Wl[0].barbed=true;result.markers.wire=draw();Wl=[];
    cam.position.set(0,10,10);cam.lookAt(0,4.6,-10);
    B=[{x:0,z:0,w:8,d:8,fy:3,h:3,rhp:30}];result.markers.roof=draw();
    B[0].rhp=0;result.markers.destroyedRoof=draw();B=[];
    cam.position.set(0,5,15);cam.lookAt(0,4.6,-10);
    hAt=(x,z)=>Math.abs(z)<2?12:3;result.markers.ridge=draw();hAt=()=>3;
    const truck={t:'camio',x:0,z:0,o:new THREE.Group()};
    const hull=new THREE.Mesh(new THREE.BoxGeometry(4,5,10),new THREE.MeshBasicMaterial());
    hull.position.y=2.5;truck.o.add(hull);truck.o.position.set(0,3,0);world.add(truck.o);V=[truck];
    result.markers.truck=draw();truck.x=30;truck.o.position.x=30;rebuildVehicleGrid();
    result.markers.movedTruck=draw();world.remove(truck.o);V=[];
    visibleSoldier.x=0;visibleSoldier.z=30;visibleSoldier.o.position.z=30;
    result.markers.behind=draw();visibleSoldier.z=-150;visibleSoldier.o.position.z=-150;
    result.markers.distant=draw();visibleSoldier.z=-10;visibleSoldier.o.position.z=-10;
    visibleSoldier.o.visible=false;result.markers.hiddenModel=draw();visibleSoldier.o.visible=true;
    visibleSoldier.hp=0;result.markers.dead=draw();visibleSoldier.hp=4;
    visibleSoldier.aiMode='patrol';result.markers.patrol=draw();visibleSoldier.aiMode='search';
    result.markers.reappeared=draw();panel('pause');
    result.markers.pauseCleared=stealthFeedback.entries.every(e=>!e.mesh.visible&&!e.mesh.parent&&!e.unit);
    resume();fresh();stealthFeedback.reset();
    const bunker={x:0,z:0,w:32,d:28,fy:5,h:4,rhp:30,kind:'enemy_bunker',
      basement:{floorY:-6,halfX:19,halfZ:16,stair:{x:14,width:3,zTop:8,zBottom:-3}}};
    activeBunker=bunker;B=[bunker];hAt=()=>20;
    const guard=unit(0,-10);guard.gy=-6;guard.o.position.y=-6;guard.basement=bunker;guard.aiMode='search';world.add(guard.o);
    P.x=0;P.y=-6;P.z=10;cam.position.set(0,-2,10);cam.lookAt(0,-3,-10);
    result.basement={sameFloor:draw()};
    Wl=[{x0:-18,x1:18,z0:-.2,z1:.2,y0:-6,y1:5,hp:30}];result.basement.partition=draw();
    Wl=[{x0:-18,x1:18,z0:-16,z1:16,y0:4.9,y1:5.2,hp:Infinity}];
    hAt=()=>3;cam.position.set(0,12,10);cam.lookAt(0,-4,-10);result.basement.floor=draw();
    activeBunker=null;Wl=[];B=[];hAt=()=>3;
    const bounded=window.HUNTER_STEALTH_FEEDBACK.create(THREE,{limit:4,maxChecks:6,maxDistance:100}),
      candidates=Array.from({length:50},(_,i)=>{
        const u=unit((i%5-2)*3,-10-Math.floor(i/5)*3);u.aiMode='search';world.add(u.o);return u;
      });
    cam.position.set(0,8,15);cam.lookAt(0,4,-25);
    let mostChecks=0,mostAllocated=0;
    for(let n=0;n<30;n++){
      let calls=0;bounded.update({world,camera:cam,enemies:candidates,active:true,visible:()=>{calls++;return n%2===0}});
      mostChecks=Math.max(mostChecks,calls);mostAllocated=Math.max(mostAllocated,bounded.entries.length);
    }
    bounded.reset();result.markerPool={mostChecks,mostAllocated,
      detached:bounded.entries.every(e=>!e.unit&&!e.mesh.visible&&!e.mesh.parent)};
    return result;
  })()`);
  assert.equal(report.suspicion.mode,'suspicious');
  assert.equal(report.suspicion.confirmed,false);assert.equal(report.suspicion.shots,0,'suspicion does not fire');
  assert.equal(report.contact.mode,'combat');assert.equal(report.contact.confirmed,true);
  assert.equal(report.search.mode,'search');assert.equal(report.search.confirmed,false);
  assert.equal(report.search.remembered,true,'cover does not update memory to hidden player');
  assert.equal(report.noise.mode,'investigate');assert.equal(report.noise.confirmed,false);
  assert.ok(report.noise.error<=2.2,'sound investigation uses approximate emitted position');
  assert.ok(report.noise.playerError>100,'sound does not reveal current player');
  assert.equal(report.noise.retainsTrace,true);assert.equal(report.noise.expires,true);
  for(const key of ['door','rotatedDoor']){
    assert.equal(report[key].inside,3,key+': three soldiers enter and leave threshold free '+JSON.stringify(report[key]));
    assert.ok(report[key].minSeparation>=2.39,key+': bodies never overlap');
    assert.equal(report[key].invalid,0,key+': no crossing of solid walls');
  }
  assert.equal(report.reservations.count,3);
  assert.ok(report.reservations.minDistance>=2.4,'reserved flank goals do not converge on one body footprint');
  assert.equal(report.reservations.deathReleased,true);assert.equal(report.reservations.expired,true);
  assert.equal(report.queueDeath,true,'death releases the door to a waiting soldier');
  assert.equal(report.blockedReleased,true,'stalled owner releases a live request');
  assert.equal(report.resetRetryImmediate,true,'restart of coordination permits immediate entry after an old timeout');
  assert.equal(report.abandonedReleased,true,'abandoned entry releases queue and unit');
  assert.equal(report.markers.clear,1);assert.equal(report.markers.states.join(','),'suspicion,contact,search');
  assert.equal(report.markers.distinctColors,3);assert.equal(report.markers.distinctShapes,3);
  assert.equal(report.markers.depthSafe,true,'world marker uses depth test without hiding geometry');
  for(const key of ['wall','roof','ridge','truck','behind','distant','hiddenModel','dead','patrol'])
    assert.equal(report.markers[key],0,'no marker through '+key);
  for(const key of ['openDoor','wire','destroyedRoof','movedTruck','reappeared'])
    assert.equal(report.markers[key],1,key+' immediately revalidates marker visibility');
  assert.equal(report.markers.pauseCleared,true,'pause detaches all live markers');
  assert.equal(report.basement.sameFloor,1,'excavated basement is not covered by mountain terrain');
  assert.equal(report.basement.partition,0,'basement walls hide markers');
  assert.equal(report.basement.floor,0,'upper floor hides underground marker');
  assert.ok(report.markerPool.mostAllocated>0&&report.markerPool.mostAllocated<=4,'marker pool is bounded');
  assert.equal(report.markerPool.mostChecks,6,'all-hidden crowd exhausts the LOS budget without scanning every candidate');
  assert.equal(report.markerPool.detached,true,'reset detaches reusable marker resources');
  console.log('OK: independent stealth/coordination review',JSON.stringify(report));
})().catch(error=>{console.error(error);process.exitCode=1});
