#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
(async()=>{
  const game=await require('./harness.cjs')(),run=game.run;
  run(`
    world=new THREE.Group();scene.add(world);seedSearchMode=true;seed=67;R=mul(seed);hAt=()=>3;
    globalThis.coordinationFresh=()=>{
      resetSoldierCoordination();STEALTH.clear();E=[];V=[];B=[];Wl=[];Pj=[];stairs=[];piers=[];
      PL.length=0;TG.clear();activeBunker=null;cv=null;ib=null;
      started=1;over=0;paused=false;cheats.invisible=false;cheats.immune=false;disg=false;playerCrouched=false;
      P.x=0;P.y=3;P.z=-35;
    };
    globalThis.coordinationUnit=(x,z)=>{
      const u=mkEn('soldat',x,z,3);u.o.position.set(x,3,z);u.hd=0;u.navHd=0;
      u.aiMode='investigate';u.searchT=20;u.senseT=1000;u.cd=1000;u.avoidSide=1;return u;
    };
    globalThis.coordinationWall=(x0,x1,z0,z1)=>Wl.push({x0,x1,z0,z1,y0:3,y1:12,hp:100,open:false});
    globalThis.coordinationDoor=()=>({x:0,z:-8,w:14,d:16,fy:3,h:7,
      door:{cx:0,cz:0,nx:0,nz:1,locked:false,open:true}});
    coordinationFresh();
  `);
  const slots=run(`(()=>{
    const units=[-3,0,3].map(x=>coordinationUnit(x,0)),target={x:0,z:-35};rebuildVehicleGrid();
    const goals=units.map(u=>{u.canSee=true;u.canShoot=true;u.aiMode='combat';return soldierFirePosition(u,target,3,35)});
    let separation=Infinity;
    for(let i=0;i<goals.length;i++)for(let j=i+1;j<goals.length;j++)separation=Math.min(separation,Math.hypot(goals[i].x-goals[j].x,goals[i].z-goals[j].z));
    const stable=units.map(u=>{soldierEngage(u,target,3,.01,35,true);const previous=u.tacticGoal;soldierEngage(u,target,3,.01,35,true);return previous===u.tacticGoal});
    return {separation,stable};
  })()`);
  assert(slots.separation>=3,'Reserved firing positions spread three allies');assert(slots.stable.every(Boolean),'Goals remain stable until their timer expires');
  const flank=run(`(()=>{
    coordinationFresh();const units=[-2.5,0,2.5].map(x=>coordinationUnit(x,0));rebuildVehicleGrid();
    const goals=units.map(u=>soldierFlankPosition(u,{x:0,z:-40},3));let separation=Infinity;
    for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)separation=Math.min(separation,Math.hypot(goals[i].x-goals[j].x,goals[i].z-goals[j].z));
    return separation;
  })()`);
  assert(flank>=3,'Flanks consider reserved destinations, beyond current body positions');

  const door=run(`(()=>{
    coordinationFresh();const b=coordinationDoor();
    coordinationWall(-7,-1.25,-.3,.3);coordinationWall(1.25,7,-.3,.3);
    coordinationWall(-7.3,-6.7,-16,0);coordinationWall(6.7,7.3,-16,0);
    const units=[-4,0,4].map(x=>coordinationUnit(x,8));let minSeparation=Infinity,invalid=0;
    for(let n=0;n<600;n++){
      soldierCoordinationTick(.05);enemyPathBudget=2;enemyNodeBudget=160;rebuildVehicleGrid();
      for(let i=0;i<3;i++){
        const u=units[i],target={x:(i-1)*4,z:-12};
        if(!soldierEnterBuilding(u,b,target,.05,3))mvE(u,u.sp*.05,target.x,target.z);
        u.o.position.set(u.x,3,u.z);if(!enemySolidAt(u,u.x,u.z,u.hd))invalid++;
      }
      for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)minSeparation=Math.min(minSeparation,Math.hypot(units[i].x-units[j].x,units[i].z-units[j].z));
    }
    return {inside:units.filter(u=>u.z< -1.15).length,minSeparation,invalid};
  })()`);
  assert.equal(door.inside,3,'Three soldiers traverse the actual 2.5m door within thirty seconds');
  assert(door.minSeparation>=2.39,'Queue preserves body separation');assert.equal(door.invalid,0,'No teleport or wall penetration');
  const leases=run(`(()=>{
    coordinationFresh();const b=coordinationDoor(),a=coordinationUnit(-2,8),c=coordinationUnit(2,8),target={x:0,z:-10};
    rebuildVehicleGrid();soldierEnterBuilding(a,b,target,.05,3);soldierEnterBuilding(c,b,target,.05,3);
    a.hp=0;soldierCoordinationTick(.05);const deadReleased=soldierDoorQueues.get(b.door).queue[0].unit===c;
    c.aiMode='patrol';soldierCoordinationTick(.05);const taskReleased=soldierDoorQueues.size===0;
    c.aiMode='investigate';c.sp=0;soldierEnterBuilding(c,b,target,.05,3);
    for(let n=0;n<50;n++){soldierCoordinationTick(.05);soldierEnterBuilding(c,b,target,.05,3)}
    const timedOut=c.doorRetryUntil>soldierCoordinationTime;
    c.doorRetryUntil=1000;c.entryWaiting={x:2,z:2};resetSoldierCoordination();
    const resetClean=c.doorRetryUntil===0&&!c.entryWaiting&&!c.entryDoor;
    soldierCoordinationTick(1);const emptyReleased=soldierDoorQueues.size===0;
    return {deadReleased,taskReleased,timedOut,resetClean,emptyReleased};
  })()`);
  assert(Object.values(leases).every(Boolean),'Death, loss of task, blocking timeout and reset release all ownership: '+JSON.stringify(leases));

  const memory=run(`(()=>{
    coordinationFresh();const u=coordinationUnit(0,0);u.aiMode='patrol';u.senseT=0;u.sp=0;rebuildVehicleGrid();
    updEn(.1);updEn(.1);updEn(.1);const x=u.lastSeenX,z=u.lastSeenZ;
    coordinationWall(-50,50,-15.3,-14.7);P.x=40;P.z=-60;updEn(.1);
    const ownAlertIgnored=u.lastSeenX===x&&u.lastSeenZ===z;
    coordinationFresh();const listener=coordinationUnit(0,0);listener.aiMode='patrol';listener.senseT=0;
    P.x=400;P.z=400;STEALTH.emit('run',10,4.5,0);updEn(.1);
    const heard={x:listener.lastSeenX,z:listener.lastSeenZ};P.x=-400;P.z=-400;STEALTH.tick(1);updEn(.1);
    const soundStable=heard.x===listener.lastSeenX&&heard.z===listener.lastSeenZ&&Math.hypot(heard.x-10,heard.z)<=2;
    coordinationFresh();const searcher=coordinationUnit(0,8);searcher.lastSeenX=20;searcher.lastSeenZ=8;searcher.lastSeenY=3;
    ib=coordinationDoor();B=[ib];P.x=0;P.z=-8;updEn(.1);const hiddenBuildingIgnored=!searcher.entryDoor;
    const b={...coordinationDoor(),upperFloor:true,storey:4,localW:14,localD:16,
      interiorStair:{x:4,z:-12,nx:0,nz:1,length:6,width:3}};
    P.y=50;searcher.walkY=3;searcher.floorRoute=null;const noSecretFloor=!soldierChangeFloor(searcher,b,.05,3);
    P.y=3;soldierChangeFloor(searcher,b,.05,8);const knownFloor=searcher.floorRoute?.up===true;
    return {ownAlertIgnored,soundStable,hiddenBuildingIgnored,noSecretFloor,knownFloor};
  })()`);
  assert(Object.values(memory).every(Boolean),'Perception keeps fair remembered targets: '+JSON.stringify(memory));
  console.log('OK coordinació: slots/flancs reservats, 3/3 porta2.5m, separació, lease/mort/tasca/reset i memòria de soroll/planta');
})().catch(error=>{console.error(error);process.exitCode=1});
