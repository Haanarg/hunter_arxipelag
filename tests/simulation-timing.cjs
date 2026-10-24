#!/usr/bin/env node
'use strict';
// Runtime complet, fixtures petites, rellotge explícit i controls reals.
const assert=require('node:assert/strict'),createGame=require('./harness.cjs');
const close=(a,b,tolerance,why)=>assert(Math.abs(a-b)<=tolerance,`${why}: ${a} / ${b} (±${tolerance})`);
const profiles=[10,20,30,60,120].map(fps=>({name:String(fps),deltas:[1000/fps]}));
profiles.push({name:'jitter',deltas:[8,34,17,23,11,48,9,20]});
profiles.push({name:'stalls',deltas:[1000/60,1000/60,100,1000/60,250,1000/60,33]});
(async()=>{
  const game=await createGame(),run=game.run;
  run(`
    globalThis.timingHeight=hAt;
    seedSearchMode=true;seed=67;R=mul(seed);
    globalThis.timingShots=[];globalThis.timingBooms=[];
    globalThis.timingShoot=shoot;
    shoot=function(...args){const result=timingShoot(...args);timingShots.push({t:elapsed,dmg:args[7],speed:args[6]});return result};
    globalThis.timingProjectile=null;globalThis.timingExpireAt=null;
    globalThis.timingUpdPj=updPj;
    updPj=function(dt){const watched=timingProjectile&&Pj.includes(timingProjectile);timingUpdPj(dt);if(watched&&!Pj.includes(timingProjectile))timingExpireAt=elapsed};
    globalThis.timingLaunches=[];globalThis.timingLaunch=launchGrenade;
    launchGrenade=function(pending){timingLaunches.push(elapsed);return timingLaunch(pending)};
    globalThis.timingBoom=boom;
    boom=function(...args){timingBooms.push({t:elapsed,x:args[0],y:args[1],z:args[2]});return timingBoom(...args)};
    globalThis.timingFixture=(type=null)=>{
      clearDeathCinematic();clearVictoryCinematic();clearKeys();cancelGrenadeCharge();clearBulletImpacts();
      if(world)scene.remove(world);world=new THREE.Group();world.userData={compounds:[],airObstacles:[]};scene.add(world);
      started=1;paused=false;simulationFocused=true;over=0;hp=20;elapsed=0;fcd=0;
      document.hidden=false;document.body.classList.add('game-started');
      cheats.items=false;cheats.invisible=false;cheats.immune=false;cheats.fly=false;
      playerFall=null;playerEject=null;playerCrouched=false;activeBunker=null;ib=null;cameraBasement=null;
      bazookaEquipped=false;grenadeEquipped=false;cisallaEquipped=false;sniperEquipped=false;knifeEquipped=false;
      scopeActive=false;swimming=false;inv={};ammo=1000;sniperAmmo=1000;
      B=[];Wl=[];Dr=[];stairs=[];piers=[];E=[];V=[];items=[];fa=[];Pj=[];bombs=[];grenades=[];fx=[];DEAD=[];
      DB.length=0;WA.length=0;HR.length=0;FA.length=0;PL.length=0;TG.clear();
      terrainLevels=[];terrainLevelGrid.clear();terrainStream=null;movementFx.reset();riderSystem.reset();
      worldVisualTick=1000;palmVisualTick=1000;uiTick=-1000;stealthStepTimer=0;
      hAt=()=>type&&['w','wl'].includes(VT[type].m)?-20:10;
      P.x=0;P.z=0;P.y=10.06;P.hd=0;cv=null;
      pl.rotation.set(0,0,0);pl.position.set(0,10.06,0);
      pl.userData.grenadePending=null;pl.userData.grenadeThrow=0;pl.userData.grenadeReleased=false;
      if(type){const o=mkV(type);cv={t:type,x:0,z:0,hd:0,v:0,sideV:0,strafeV:0,verticalV:0,
        steerInput:0,driveInput:0,yawRate:0,alt:VT[type].m==='a'?50:10,o,
        life:VT[type].life,maxLife:VT[type].life,rockets:1000};V=[cv];world.add(o);place(cv,0,0,0)}
      rebuildVehicleGrid();resetCameraState();resetSimulationClock();
      window.HUNTER_STEALTH.clear();timingShots.length=0;timingBooms.length=0;timingLaunches.length=0;
      timingProjectile=null;timingExpireAt=null;
    };
  `);
  const key=(code,down)=>game.dispatch('window',down?'keydown':'keyup',{code});
  function advance(profile,seconds){
    const total=seconds*1000;let passed=0,i=0;
    while(passed<total-1e-8){const delta=Math.min(profile.deltas[i++%profile.deltas.length],total-passed);game.frame(delta);passed+=delta}
  }
  const fixture=type=>run(`timingFixture(${type?JSON.stringify(type):''})`),results=[];
  for(const profile of profiles){
    fixture();key('KeyW',true);advance(profile,3);key('KeyW',false);
    close(run('P.z'),-36,1e-7,profile.name+' player travels 36m in three real seconds');
    close(run('elapsed'),3,1e-8,profile.name+' elapsed follows wall time');
    for(const type of ['cotxe','llanxa','heli']){
      fixture(type);key('KeyW',true);if(type==='heli')key('KeyH',true);
      advance(profile,2);key('KeyA',true);advance(profile,2);key('KeyA',false);key('KeyW',false);key('KeyH',false);
      results.push({fps:profile.name,type,...run('({x:cv.x,z:cv.z,alt:cv.alt,hd:cv.hd,v:cv.v})')});
    }
    fixture();key('KeyF',true);advance(profile,10);key('KeyF',false);
    const shots=Array.from(run('timingShots')).map(shot=>shot.t),intervals=shots.slice(1).map((t,i)=>t-shots[i]);
    assert.equal(shots.length,46,profile.name+' pistol follows the authored .22s interval');
    for(let i=1;i<shots.length;i++)close(shots[i],shots[0]+i*.22,1/60+1e-7,profile.name+' no accumulated cooldown phase drift');
    assert(run('timingShots.every(shot=>shot.dmg===COMBAT_BALANCE.weapons.pistol)'),profile.name+' pistol damage unchanged');
    results.push({fps:profile.name,type:'pistol',shots:shots.length,mean:intervals.reduce((a,b)=>a+b,0)/intervals.length});

    // Un projectil alt evita el terreny: comprovam desplaçament i caducitat real.
    fixture();run("shoot(0,100,0,0,0,-1,130,1,0,'p',mW,SMALL_ARMS_SCALE);timingProjectile=Pj[0]");
    advance(profile,1);close(run('Pj[0].z'),-130,1e-6,profile.name+' projectile travels at authored speed');
    close(run('Pj[0].life'),1.2,1e-7,profile.name+' projectile lifetime follows wall time');
    advance(profile,1.25);assert.equal(run('Pj.length'),0);
    close(run('timingExpireAt'),2.2,1/60+1e-7,profile.name+' projectile expiry within one substep');

    fixture();run('inv.expl=1;plant(3);P.x=100');advance(profile,2.9);
    assert.equal(run('bombs.length'),1);close(run('bombs[0].t'),.1,1e-7,profile.name+' C4 countdown');
    advance(profile,.13);assert.equal(run('bombs.length'),0);
    close(run('timingBooms[0].t'),3,1/60+1e-7,profile.name+' C4 detonates after three real seconds');

    fixture();run('grenadeEquipped=true;inv.granada=2');key('KeyF',true);advance(profile,.7);
    close(run('grenadeCharge.elapsed'),.7,1e-7,profile.name+' grenade charge follows wall time');
    key('KeyF',false);assert.equal(run('inv.granada'),1);advance(profile,.2);
    assert.equal(run('timingLaunches.length'),0,profile.name+' grenade retains authored throw delay');
    advance(profile,.05);assert.equal(run('timingLaunches.length'),1);
    close(run('timingLaunches[0]'),.93,1/60+1e-7,profile.name+' grenade launch delay');
    fixture();run('launchGrenade({flight:{x:80,y:200,z:0,vx:1,vy:0,vz:0,t:1.25}})');
    advance(profile,1);close(run('grenades[0].t'),.25,1e-7,profile.name+' airborne grenade fuse');
    advance(profile,.28);assert.equal(run('grenades.length'),0);
    close(run('timingBooms[0].t'),1.25,1/60+1e-7,profile.name+' grenade fuse expires within one substep');

    fixture();run(`globalThis.timingGate={bunkerGate:true,cx:0,cz:-3,nx:0,nz:1,doorWidth:4,
      y0:10,doorHeight:4.4,openProgress:0,openDuration:10,closedLocalY:2.2,m:new THREE.Object3D()};Dr=[timingGate]`);
    advance(profile,5);close(run('timingGate.openProgress'),.5,1e-7,profile.name+' gate opens halfway in five seconds');
    advance(profile,5);assert(run('timingGate.open'),profile.name+' gate opens fully in ten seconds');

    fixture();run(`globalThis.timingWall={x0:-20,x1:20,z0:-5,z1:-4.95,y0:9,y1:15,
      cx:0,cz:-4.975,hp:Infinity,rammable:false,m:new THREE.Object3D()};Wl=[timingWall]`);
    key('KeyW',true);key('ShiftLeft',true);advance(profile,1);key('KeyW',false);key('ShiftLeft',false);
    close(run('P.z'),-4.35,1e-7,profile.name+' running player cannot cross a thin wall');
    run("shoot(0,12,0,0,0,-1,470,1,0,'p',mW,SMALL_ARMS_SCALE)");
    advance(profile,.1);assert.equal(run('Pj.length'),0,profile.name+' fast projectile hits the thin wall');

    fixture();run("shoot(0,11.56,1,0,0,-1,130,999,0,'e',mW,SMALL_ARMS_SCALE)");
    game.frame(250);
    assert(run('over&&deathCinematic?.active'),'Actual lethal hit starts death');
    assert.equal(run('deathCinematic.t'),0,profile.name+' new death does not consume gameplay backlog');
    assert(run('simulationClock.stats.last.steps<=2&&elapsed<=2/60+1e-7'),profile.name+' gameplay stops promptly on death');
    advance(profile,2);close(run('deathCinematic.t'),2,1e-7,profile.name+' death visual clock follows real time');

    fixture();run(`seedSearchMode=false;globalThis.timingGeneral=mkEn('general',0,-8,10);seedSearchMode=true;
      timingGeneral.o.position.set(0,10,-8);timingGeneral.hp=1;timingGeneral.sp=0;timingGeneral.cd=1000;timingGeneral.senseT=1000;
      shoot(0,11.6,-4,0,0,-1,130,999,0,'p',mW,SMALL_ARMS_SCALE)`);
    game.frame(250);
    assert(run('over&&victoryCinematic?.active'),'Actual killing shot starts victory');
    assert.equal(run('victoryCinematic.t'),0,profile.name+' new victory does not consume gameplay backlog');
    assert(run('simulationClock.stats.last.steps<=4&&elapsed<=4/60+1e-7'),profile.name+' gameplay stops promptly on victory');
    advance(profile,2);close(run('victoryCinematic.t'),2,1e-7,profile.name+' victory visual clock follows real time');
  }
  const deltas=[];
  for(const type of ['cotxe','llanxa','heli']){
    const reference=results.find(row=>row.fps==='60'&&row.type===type);
    for(const row of results.filter(row=>row.type===type)){
      const positionError=Math.hypot(row.x-reference.x,row.z-reference.z);
      assert(positionError<=1,type+' '+row.fps+' trajectory differs by at most 1m after four seconds');
      close(row.hd,reference.hd,.04,type+' heading tolerance');close(row.v,reference.v,.1,type+' speed tolerance');
      close(row.alt,reference.alt,.15,type+' altitude tolerance');
      deltas.push({fps:row.fps,type,positionError,headingError:Math.abs(row.hd-reference.hd)});
    }
  }

  // No es poden guardar trets durant pauses o una estona sense prémer Dispar.
  fixture();advance(profiles[3],3);key('KeyF',true);game.frame(1000/120);key('KeyF',false);
  assert.equal(run('timingShots.length'),1);advance(profiles[3],3);
  key('KeyF',true);game.frame(1000/120);key('KeyF',false);
  assert.equal(run('timingShots.length'),2);close(run('fcd'),.22,1e-9,'First shot after idle gets the full authored cooldown');
  key('KeyF',true);advance(profiles[4],.2);assert.equal(run('timingShots.length'),2,'No banked follow-up burst after idle');
  advance(profiles[4],.03);key('KeyF',false);assert.equal(run('timingShots.length'),3);

  fixture();key('KeyW',true);game.frame(100);key('KeyW',false);
  const beforePause=run('P.z');game.dispatch('window','keydown',{code:'Escape'});game.advanceTime(30000);
  run('resume()');key('KeyW',true);game.frame(16);key('KeyW',false);
  close(run('P.z'),beforePause-.192,1e-8,'Resume excludes thirty seconds spent paused without RAF');
  for(const mode of ['blur','hidden']){
    fixture();key('KeyW',true);game.frame(16);
    if(mode==='blur')game.dispatch('window','blur');
    else{game.context.document.hidden=true;game.dispatch('document','visibilitychange')}
    const stopped=run('P.z');game.advanceTime(30000);
    if(mode==='blur')game.dispatch('window','focus');
    else{game.context.document.hidden=false;game.dispatch('document','visibilitychange')}
    run('resume()');key('KeyW',true);game.frame(16);key('KeyW',false);
    close(run('P.z'),stopped-.192,1e-8,mode+' discards the missing frame interval');
  }
  fixture();run("hurtP(999,true,{type:'bullet'})");game.frame(100);const deathTime=run('deathCinematic.t');
  game.dispatch('window','blur');game.frame(20000);
  close(run('deathCinematic.t'),deathTime,1e-9,'Blur suspends an existing cinematic');
  game.dispatch('window','focus');game.frame(16);
  close(run('deathCinematic.t'),deathTime+.016,1e-9,'Focus resumes cinematic without stale time');

  // El cap de 250 ms té comptabilitat real i no multiplica els pressupostos de dibuix.
  fixture();run(`
    globalThis.timingRenderCount=0;globalThis.timingTerrainCount=0;globalThis.timingTextureCount=0;
    globalThis.timingWaterCount=0;globalThis.timingRawDt=0;
    globalThis.timingRender=ren.render;ren.render=function(...args){timingRenderCount++;return timingRender.apply(this,args)};
    terrainStream={visibleHeightAt:()=>-Infinity,surfaceVersionAt:()=>-1,update(){timingTerrainCount++}};
    globalThis.timingTexture=advanceTerrainTexture;advanceTerrainTexture=function(...args){timingTextureCount++;return timingTexture(...args)};
    globalThis.timingWater=water.stepResolutionUpgrade;water.stepResolutionUpgrade=function(...args){timingWaterCount++;return timingWater.apply(this,args)};
    globalThis.timingSample=adaptivePerformance.sample;adaptivePerformance.sample=function(sample){timingRawDt=sample.dt;return timingSample(sample)};
  `);
  key('KeyW',true);game.frame(5000);key('KeyW',false);
  close(run('P.z'),-3,1e-9,'Five-second gap simulates only the accepted quarter-second');
  close(run('simulationClock.stats.last.droppedDt'),4.75,1e-9,'Dropped long-gap time is observable');
  assert.equal(run('simulationClock.stats.last.steps'),15);
  close(run('timingRawDt'),5,1e-9,'Performance diagnostics receive the raw five-second frame');
  for(const counter of ['timingRenderCount','timingTerrainCount','timingTextureCount','timingWaterCount'])
    assert.equal(run(counter),1,counter+' runs once per rendered frame');
  game.frame(16);close(run('elapsed'),.266,1e-9,'Next frame has no hidden backlog');

  // Reinici real del panell; una única generació lògica de llavor 67.
  const restart=game.el('timingRestart');restart.dataset.diff='1';
  game.el('panelBody').querySelectorAll=selector=>selector==='[data-diff]'?[restart]:[];
  game.context.timingAdvanceHostTime=ms=>game.advanceTime(ms);
  run(`timingFixture();requestedSeed=67;seedSearchMode=true;globalThis.timingAdvancedBuild=false;
    hAt=(...args)=>{if(!timingAdvancedBuild){timingAdvancedBuild=true;timingAdvanceHostTime(30000)}return timingHeight(...args)};
    elapsed=100;panel('restart')`);
  restart.onclick();
  assert(run('!paused&&elapsed===0&&timingAdvancedBuild'),'Restart builds and resumes the real operation');
  run('hAt=timingHeight;E=[];items=[];fa=[];V=[];cv=null');game.frame(16);
  close(run('elapsed'),.016,1e-9,'World generation time never reaches restarted simulation');
  const maxPosition=Math.max(...deltas.map(row=>row.positionError)),maxHeading=Math.max(...deltas.map(row=>row.headingError));
  console.log(`OK simulació 10/20/30/60/120 FPS, jitter i 100–250ms: 36m/3s, 46 trets/10s, vehicles Δ≤${maxPosition.toFixed(3)}m/${maxHeading.toFixed(4)}rad, projectils, C4/granades/porta, col·lisions, pausa/reinici i cinemàtiques`);
})().catch(error=>{console.error(error);process.exitCode=1});
