'use strict';
// Revisió independent: col·lisió real, propietat del tret, cobertura i recursos.
const assert=require('node:assert/strict');
(async()=>{
  const game=await require('./harness.cjs')();
  const report=game.run(`(()=>{
    world=new THREE.Group();scene.add(world);started=1;over=0;paused=false;
    P.x=100;P.y=1;P.z=100;cv=null;E=[];cheats.immune=false;
    let walls=[],buildings=[],enemies=[],vehicles=[];
    wallCandidates=()=>walls;buildingCandidates=()=>buildings;
    enemyCandidatesAt=()=>enemies;vehicleCandidatesAt=()=>vehicles;
    treeAt=()=>null;hAt=()=>0;
    const reset=()=>{
      for(const p of Pj)world.remove(p.o);Pj.length=0;
      clearBulletImpacts();combatFeedback.clear();
      walls=[];buildings=[];enemies=[];vehicles=[];
    };
    const shootAcross=(owner='p',damage=2)=>{
      shoot(-9,2,0,1,0,0,100,damage,0,owner,mW,.7);updPj(.15);
      return {types:[...new Set(bulletImpacts.map(f=>f.type))],
        hit:combatFeedback.state.hitUntil>performance.now(),remaining:Pj.length};
    };
    const enemy=t=>({t,x:0,z:0,r:1,hp:20,alert:0,o:new THREE.Group()});
    const vehicle=t=>({t,x:0,z:0,life:20,o:new THREE.Group()});
    const wall=extra=>({x0:-2,x1:-1,y0:1,y1:3,z0:-1,z1:1,hp:30,...extra});
    const result={};
    for(const t of ['tanc','tanqueta','torre']){
      reset();enemies=[enemy(t)];
      // El centre de col·lisió de la torre és més alt.
      if(t==='torre')enemies[0].o.position.y=-3;
      const f=shootAcross();result['enemy_'+t]={...f,hp:enemies[0].hp};
    }
    for(const t of ['tanc','tanqueta','cotxe','heli_combat']){
      reset();vehicles=[vehicle(t)];
      result['vehicle_'+t]={...shootAcross(),hp:vehicles[0].life};
    }
    reset();walls=[wall({owner:{compound:'outpost'}})];
    result.militaryWall={...shootAcross(),hp:walls[0].hp};
    reset();walls=[wall({hp:Infinity})];
    result.indestructibleWall=shootAcross();
    reset();buildings=[{x:0,z:0,w:4,d:4,fy:0,h:2,rhp:30,compound:'hq'}];
    result.militaryRoof={...shootAcross(),hp:buildings[0].rhp};
    reset();walls=[wall({barbed:true})];
    result.wire=shootAcross();
    reset();enemies=[enemy('soldat')];
    result.wounded={...shootAcross(),hp:enemies[0].hp,
      particles:bulletImpacts.length,maxLife:Math.max(...bulletImpacts.map(f=>f.maxLife))};
    reset();walls=[wall({})];enemies=[enemy('soldat')];
    result.covered={...shootAcross(),hp:enemies[0].hp,wallHP:walls[0].hp};
    reset();enemies=[enemy('soldat')];result.zero=shootAcross('p',0);
    reset();enemies=[enemy('soldat')];
    hurtE(enemies[0],2,{own:'e',spl:12,x:0,y:2,z:0});
    result.friendlyFire={hp:enemies[0].hp,hit:combatFeedback.state.hitUntil>performance.now()};
    reset();enemies=[enemy('soldat')];
    hurtE(enemies[0],2,{own:'b',spl:12,x:0,y:2,z:0});
    result.playerGrenade={hp:enemies[0].hp,hit:combatFeedback.state.hitUntil>performance.now()};
    reset();enemies=[enemy('soldat')];result.playerBazookaOwner=shootAcross('pb');
    reset();P.x=0;P.y=0;P.z=0;hp=20;
    shoot(-9,1.5,0,1,0,0,100,2,0,'e',mW,.7);updPj(.15);
    combatFeedback.update({now:performance.now(),active:true,playerX:0,playerZ:0,forwardX:0,forwardZ:-1});
    result.direction={hp,left:combatFeedback.state.directionAngle,visible:combatFeedback.state.damageVisible,
      sourceX:combatFeedback.state.sourceX};
    // El mateix impacte passa al darrere en mirar cap a l'est.
    combatFeedback.update({now:performance.now(),active:true,playerX:0,playerZ:0,forwardX:1,forwardZ:0});
    result.direction.afterTurn=combatFeedback.state.directionAngle;
    combatFeedback.update({now:performance.now()+1000,active:true,playerX:0,playerZ:0,forwardX:1,forwardZ:0});
    result.direction.expired=!combatFeedback.state.damageVisible&&!combatFeedback.state.hitVisible;
    // Exercitam l'adaptador real amb la càmera, sense canviar la direcció del cos.
    P.hd=.73;cam.position.set(0,4,10);cam.lookAt(0,4,0);
    combatFeedback.damage({x:8,z:0});renderCombatFeedback();
    result.camera={right:combatFeedback.state.directionAngle};
    cam.lookAt(10,4,10);renderCombatFeedback();
    result.camera.front=combatFeedback.state.directionAngle;
    result.camera.bodyHeading=P.hd;
    combatFeedback.clear();hp=20;
    hurtP(2,false,{type:'fall',x:P.x,y:P.y+8,z:P.z});renderCombatFeedback();
    result.vertical={hp,visible:combatFeedback.state.damageVisible};
    reset();hp=20;cv=vehicle('cotxe');vehicles=[cv];
    shoot(-12,1,0,1,0,0,100,2,0,'e',mW,.7);updPj(.15);
    cam.lookAt(0,4,0);renderCombatFeedback();
    result.pilot={life:cv.life,hp,sourceX:combatFeedback.state.sourceX,
      visible:combatFeedback.state.damageVisible,angle:combatFeedback.state.directionAngle,
      hit:combatFeedback.state.hitVisible};
    reset();cv=null;
    combatFeedback.confirmHit();combatFeedback.damage({x:8,z:0});panel('pause');
    result.pauseCleared=!combatFeedback.state.hitVisible&&!combatFeedback.state.damageVisible&&
      combatFeedback.state.hitUntil===0&&combatFeedback.state.damageUntil===0;
    resume();combatFeedback.clear();
    const meshes=new Set();
    for(let pass=0;pass<20;pass++){
      for(let n=0;n<40;n++)spawnBulletImpact('wound',0,2,0,{vx:1,vy:0,vz:0});
      for(const f of bulletImpacts)meshes.add(f.m);
      if(bulletImpacts.length>BULLET_IMPACT_LIMIT)throw Error('pool overflow');
      updateBulletImpacts(2);
    }
    result.pool={allocated:meshes.size,active:bulletImpacts.length,free:bulletImpactFree.length,
      limit:BULLET_IMPACT_LIMIT,orphans:world.children.filter(m=>meshes.has(m)).length};
    return result;
  })()`);
  for(const key of ['enemy_tanc','enemy_tanqueta','enemy_torre','vehicle_tanc','vehicle_tanqueta','militaryWall','militaryRoof']){
    const x=report[key];assert.ok(x.types.includes('ricochet'),key+' must visibly deflect');
    assert.equal(x.hit,false,key+' must not confirm damage');
    assert.equal(x.hp,key.startsWith('military')?30:20,key+' damage rule unchanged');
  }
  assert.ok(report.indestructibleWall.types.includes('ricochet'),'indestructible wall deflects');
  for(const key of ['vehicle_cotxe','vehicle_heli_combat']){
    assert.equal(report[key].hp,18,key+' remains vulnerable');
    assert.ok(!report[key].types.includes('ricochet'),key+' has ordinary impact');
    assert.equal(report[key].hit,true,key+' confirms real damage');
  }
  assert.equal(report.wire.remaining,1,'light shots pass wire');
  assert.equal(report.wire.types.length,0,'wire does not invent impact');
  assert.equal(report.wounded.hp,18,'wound leaves soldier alive');
  assert.ok(report.wounded.types.includes('wound'),'survivor gets clear wound FX');
  assert.ok(report.wounded.particles>5&&report.wounded.maxLife>.38,'wound burst more legible than prior FX');
  assert.equal(report.covered.hp,20,'wall protects soldier');
  assert.equal(report.covered.wallHP,28,'wall takes original damage');
  assert.ok(!report.covered.types.includes('wound'),'no blood through cover');
  assert.equal(report.covered.hit,false,'damage to scenery does not confirm a combatant hit');
  assert.equal(report.zero.hit,false,'zero damage does not confirm');
  assert.equal(report.zero.types.length,0,'zero damage does not create a wound');
  assert.equal(report.friendlyFire.hp,18,'friendly fire damage unchanged');
  assert.equal(report.friendlyFire.hit,false,'enemy friendly fire is not player hit');
  assert.equal(report.playerGrenade.hit,true,'player grenade owner b confirms');
  assert.equal(report.playerBazookaOwner.hit,true,'player owner pb confirms');
  assert.equal(report.direction.hp,18,'enemy shot damage unchanged');
  assert.equal(report.direction.sourceX,-9,'direction retains real source');
  assert.equal(report.direction.visible,true,'incoming enemy shot displays direction');
  assert.ok(Math.abs(report.direction.left+Math.PI/2)<1e-6,'west is screen left looking north');
  assert.ok(Math.abs(Math.abs(report.direction.afterTurn)-Math.PI)<1e-6,'west is behind looking east');
  assert.equal(report.direction.expired,true,'absolute expiry with a long frame');
  assert.ok(Math.abs(report.camera.right-Math.PI/2)<1e-6,'actual camera sees east at right');
  assert.ok(Math.abs(report.camera.front)<1e-6,'actual camera turn puts east ahead');
  assert.equal(report.camera.bodyHeading,.73,'feedback does not turn player body');
  assert.equal(report.vertical.hp,18);assert.equal(report.vertical.visible,false,'fall has no invented horizontal bearing');
  assert.equal(report.pilot.life,18,'vehicle hull takes incoming shot');
  assert.equal(report.pilot.hp,20,'hull still protects pilot');
  assert.equal(report.pilot.sourceX,-12,'piloted vehicle keeps shooter origin');
  assert.equal(report.pilot.visible,true);assert.equal(report.pilot.hit,false,'enemy shot does not confirm player hit');
  assert.ok(Math.abs(report.pilot.angle+Math.PI/2)<1e-6,'pilot direction follows actual camera');
  assert.equal(report.pauseCleared,true,'pause clears stale feedback');
  assert.ok(report.pool.allocated<=report.pool.limit,'FX allocation bounded under repeated bursts');
  assert.equal(report.pool.active,0);assert.equal(report.pool.orphans,0,'expired FX detached');
  console.log('OK: independent combat feedback review',JSON.stringify(report));
})().catch(error=>{console.error(error);process.exitCode=1});
