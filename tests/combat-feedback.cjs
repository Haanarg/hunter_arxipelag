#!/usr/bin/env node
'use strict';
// Impactes reals del runtime, sense substituir geometria, cobertura ni danys.
const assert=require('node:assert/strict'),createGame=require('./harness.cjs');
const close=(a,b,why,tolerance=1e-7)=>assert(Math.abs(a-b)<=tolerance,`${why}: ${a} / ${b}`);
(async()=>{
  const game=await createGame(),run=game.run;
  run(`
    globalThis.feedbackFixture=()=>{
      clearDeathCinematic();clearVictoryCinematic();clearKeys();clearBulletImpacts();
      if(world)scene.remove(world);world=new THREE.Group();world.userData={compounds:[],airObstacles:[]};scene.add(world);
      seed=67;R=mul(seed);seedSearchMode=true;hAt=()=>10;
      started=1;paused=false;simulationFocused=true;document.hidden=false;over=0;elapsed=0;
      document.body.classList.add('game-started');hp=20;ammo=100;fcd=0;
      cheats.items=false;cheats.immune=false;cheats.fly=false;cheats.invisible=false;
      P.x=0;P.y=10.06;P.z=0;P.hd=0;pl.position.set(0,10.06,0);
      cv=null;ib=null;activeBunker=null;playerFall=null;playerEject=null;scopeActive=false;swimming=false;
      B=[];Wl=[];Dr=[];stairs=[];piers=[];E=[];V=[];items=[];fa=[];Pj=[];bombs=[];grenades=[];fx=[];DEAD=[];
      DB.length=0;WA.length=0;HR.length=0;FA.length=0;PL.length=0;TG.clear();
      terrainLevels=[];terrainLevelGrid.clear();terrainStream=null;movementFx.reset();riderSystem.reset();
      worldVisualTick=1000;palmVisualTick=1000;uiTick=-1000;
      grenadeEquipped=false;knifeEquipped=false;bazookaEquipped=false;sniperEquipped=false;cisallaEquipped=false;
      cam.position.set(0,16,20);cam.lookAt(0,11.5,0);
      rebuildVehicleGrid();resetCameraState();resetSimulationClock();
    };
    globalThis.feedbackEnemy=(type='soldat')=>{
      seedSearchMode=false;const u=mkEn(type,0,-10,10);seedSearchMode=true;
      u.o.position.set(0,10,-10);u.sp=0;u.cd=1000;u.senseT=1000;rebuildVehicleGrid();return u;
    };
    globalThis.feedbackVehicle=(type='cotxe')=>{
      const o=mkV(type),v={t:type,x:0,z:-10,hd:0,v:0,alt:10,o,life:VT[type].life,maxLife:VT[type].life};
      o.position.set(0,10,-10);world.add(o);V=[v];rebuildVehicleGrid();return v;
    };
    globalThis.feedbackWall=(extra={})=>{
      const w={x0:-8,x1:8,z0:-5,z1:-4.8,y0:10,y1:15,cx:0,cz:-4.9,
        hp:100,open:false,rammable:false,m:new THREE.Object3D(),...extra};
      Wl=[w];return w;
    };
    globalThis.feedbackShot=(owner='p',damage=1,y=11.5)=>{
      shoot(0,y,-1,0,0,-1,130,damage,0,owner,mW,SMALL_ARMS_SCALE);updPj(.12);
    };
  `);
  const fixture=()=>run('feedbackFixture()');
  fixture();run('globalThis.feedbackTarget=feedbackEnemy();feedbackShot()');
  assert.equal(run('feedbackTarget.hp'),3,'Pistol retains one point of soldier damage');
  assert.equal(run('bulletImpacts.length'),9,'Surviving wound has a legible finite burst');
  assert(run("bulletImpacts.every(f=>f.type==='wound'&&f.maxLife>=.4&&f.maxLife<=.6&&f.size>=1.6)"));
  assert(run('bulletImpacts.every(f=>Math.hypot(f.m.position.x-feedbackTarget.x,f.m.position.z-feedbackTarget.z)<.8)'),
    'Blood stays around the body despite the wider collision sphere');
  game.frame(16);assert.equal(game.el('hitConfirm').hidden,false,'Damage displays the small hit confirmation');
  game.frame(200);assert.equal(game.el('hitConfirm').hidden,true,'Hit confirmation expires without HUD rebuilds');

  // Immunitats: mateixos PV, ricochet diferent del material ordinari i cap confirmació.
  for(const type of ['tanc','tanqueta','torre']){
    fixture();run(`globalThis.feedbackTarget=feedbackEnemy('${type}');feedbackShot('p',2,${type==='torre'?14.5:11.5})`);
    assert(run("bulletImpacts.some(f=>f.type==='ricochet')"),type+' deflects the light shot');
    assert.equal(run('combatFeedback.state.hitUntil'),0,type+' cannot falsely confirm damage');
    assert.equal(run('feedbackTarget.hp'),run(`EC['${type}'].hp`),type+' immunity remains unchanged');
  }
  for(const type of ['tanc','tanqueta']){
    fixture();run(`globalThis.feedbackTarget=feedbackVehicle('${type}');feedbackShot('p',2)`);
    assert.equal(run('feedbackTarget.life'),run(`VT['${type}'].life`));
    assert(run("bulletImpacts.some(f=>f.type==='ricochet')"),type+' neutral armor deflects');
    assert.equal(run('combatFeedback.state.hitUntil'),0);
  }
  for(const type of ['cotxe','heli_combat']){
    fixture();run(`globalThis.feedbackTarget=feedbackVehicle('${type}');feedbackShot('p',1)`);
    assert.equal(run('feedbackTarget.life'),run(`VT['${type}'].life-1`),type+' remains vulnerable');
    assert(run("bulletImpacts.every(f=>f.type==='spark')"));
    assert(run('combatFeedback.state.hitUntil>performance.now()'));
  }
  for(const wall of ["{owner:{compound:'outpost'}}",'{hp:Infinity}']){
    fixture();run(`globalThis.feedbackBarrier=feedbackWall(${wall});feedbackShot()`);
    assert(run("bulletImpacts.some(f=>f.type==='ricochet')"),'Indestructible/military structure deflects');
    assert.equal(run('combatFeedback.state.hitUntil'),0);
    assert.equal(run('feedbackBarrier.hp'),wall.includes('Infinity')?Infinity:100);
  }
  fixture();run("globalThis.feedbackTower=feedbackEnemy('torre');feedbackWall({towerLegOwner:feedbackTower,hp:Infinity});feedbackShot()");
  assert(run("bulletImpacts.some(f=>f.type==='ricochet')"),'Tower legs show the existing light immunity');
  assert.equal(run('feedbackTower.hp'),24);
  fixture();run('globalThis.feedbackTarget=feedbackEnemy();feedbackWall();feedbackShot()');
  assert.equal(run('feedbackTarget.hp'),4,'Closed wall retains coverage');
  assert.equal(run('Wl[0].hp'),99,'Civil wall retains damage');
  assert(run("bulletImpacts.every(f=>f.type==='spark')"),'Ordinary wall impact stays golden');
  assert.equal(run('combatFeedback.state.hitUntil'),0,'Scenery impact does not announce a combatant hit');
  fixture();run('globalThis.feedbackTarget=feedbackEnemy();feedbackWall({barbed:true});feedbackShot()');
  assert.equal(run('feedbackTarget.hp'),3,'Light shot still passes barbed wire');
  assert.equal(run('Wl[0].hp'),100,'Passing wire does not create damage');
  assert(run("bulletImpacts.every(f=>f.type==='wound')"),'No deflection where the projectile passes');

  // Propietat i dany real: grans explosions i atacs de ganivet comparteixen el mateix criteri.
  for(const owner of ['p','pb','b','e']){
    fixture();run(`globalThis.feedbackTarget=feedbackEnemy();P.x=100;
      boom(0,11.5,-8,8,1,'${owner}')`);
    assert.equal(run('feedbackTarget.hp'),3,'Explosion keeps the same damage for '+owner);
    assert.equal(run('combatFeedback.state.hitUntil>performance.now()'),owner!=='e',owner+' attribution');
  }
  fixture();run('globalThis.feedbackTarget=feedbackEnemy();feedbackTarget.z=-2;feedbackTarget.o.position.z=-2;E=[feedbackTarget];melee()');
  assert(run('feedbackTarget.hp<4'),'Knife uses the actual damage path');
  assert(run('combatFeedback.state.hitUntil>performance.now()'),'Knife confirms successful damage');
  fixture();run('globalThis.feedbackTarget=feedbackEnemy();feedbackShot("p",0)');
  assert.equal(run('feedbackTarget.hp'),4);assert.equal(run('combatFeedback.state.hitUntil'),0);
  assert.equal(run('bulletImpacts.length'),0,'Zero damage creates no wound');
  fixture();run('globalThis.feedbackTarget=feedbackEnemy();feedbackWall();P.x=100;boom(0,11.5,-1,16,4,"b")');
  assert.equal(run('feedbackTarget.hp'),4,'Blast coverage prevents both damage and feedback');
  assert.equal(run('combatFeedback.state.hitUntil'),0);

  // Origen real i orientació actual de càmera, independent del rumb del cos.
  fixture();run("shoot(-8,11.56,0,1,0,0,130,2,0,'e',mW,SMALL_ARMS_SCALE);updPj(.12);renderCombatFeedback()");
  assert.equal(run('hp'),18);assert.equal(run('combatFeedback.state.sourceX'),-8);
  close(run('combatFeedback.state.directionAngle'),-Math.PI/2,'Damage from west appears left');
  assert.equal(game.el('damageDirection').hidden,false);
  run('P.hd=.7;cam.lookAt(20,16,20);renderCombatFeedback()');
  close(Math.abs(run('combatFeedback.state.directionAngle')),Math.PI,'Camera orbit puts west behind');
  close(run('P.hd'),.7,'Feedback leaves player heading intact');
  for(const invalid of ['null',"{type:'fall',x:P.x,y:P.y+8,z:P.z}",'{x:NaN,z:Infinity}']){
    fixture();run(`hurtP(1,false,${invalid});renderCombatFeedback()`);
    assert.equal(run('hp'),19);assert.equal(game.el('damageDirection').hidden,true,'No invented direction for missing/vertical source');
  }
  fixture();run("cheats.immune=true;shoot(-8,11.56,0,1,0,0,130,2,0,'e',mW,SMALL_ARMS_SCALE);updPj(.12);renderCombatFeedback()");
  assert.equal(run('hp'),20);assert.equal(run('combatFeedback.state.damageUntil'),0,'No damage cue while immune');
  assert(run("bulletImpacts.some(f=>f.type==='ricochet')"));

  // Timers absoluts: un esdeveniment nou continua visible després d'un stall.
  fixture();game.advanceTime(250);run('combatFeedback.confirmHit();combatFeedback.damage({x:8,z:0});renderCombatFeedback()');
  assert.equal(game.el('hitConfirm').hidden,false);assert.equal(game.el('damageDirection').hidden,false);
  game.frame(800);assert.equal(game.el('hitConfirm').hidden,true);assert.equal(game.el('damageDirection').hidden,true);
  for(const transition of ["panel('pause')",'resetSimulationClock()',"fin('HAS MORT',{type:'bullet'})"]){
    fixture();run('combatFeedback.confirmHit();combatFeedback.damage({x:8,z:0});renderCombatFeedback()');
    run(transition);
    assert.equal(run('combatFeedback.state.hitUntil'),0,transition+' clears hit timer');
    assert.equal(run('combatFeedback.state.damageUntil'),0,transition+' clears damage timer');
    assert.equal(game.el('combatFeedback').hidden,true,transition+' hides persistent HUD nodes');
  }
  fixture();run('combatFeedback.confirmHit();combatFeedback.damage({x:8,z:0})');game.dispatch('window','blur');
  assert.equal(run('combatFeedback.state.damageUntil'),0,'Blur clears incoming direction');
  game.dispatch('window','focus');run('resume()');

  // Recursos: les quatre variants reutilitzen un únic pool finit sense malles orfes.
  fixture();run(`globalThis.feedbackMeshes=new Set();
    for(let pass=0;pass<20;pass++){
      for(let n=0;n<40;n++)spawnBulletImpact(['blood','wound','spark','ricochet'][n%4],0,12,0,{vx:1,vy:0,vz:0});
      for(const f of bulletImpacts)feedbackMeshes.add(f.m);
      updateBulletImpacts(1);
    }`);
  assert(run('feedbackMeshes.size<=BULLET_IMPACT_LIMIT'),'No unbounded allocations across repeated bursts');
  assert.equal(run('bulletImpacts.length'),0);
  assert.equal(run('world.children.filter(m=>feedbackMeshes.has(m)).length'),0,'Expired meshes detach');
  assert(run('bulletImpactFree.length<=BULLET_IMPACT_LIMIT'),'Free pool stays bounded');
  console.log('OK feedback de combat: immunitats reals, sang al cos, dany atribuït, cobertura, direcció de càmera, expiració/lifecycle i pool112');
})().catch(error=>{console.error(error);process.exitCode=1});
