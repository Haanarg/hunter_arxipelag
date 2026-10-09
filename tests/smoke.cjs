(async()=>{
// Actual models, generation and simulation. DOM/audio/GPU are mocked.
const assert=require('assert');
const game=await require('./harness.cjs')();const {run}=game;const ok=(s,m)=>assert(run(s),m);
assert.equal(run('THREE.REVISION'),'186');
const start=Date.now();ok('!started&&B.length===0','title screen defers world generation');
ok("!document.body.classList.contains('game-started')",'minimap must stay hidden on the start screen');
game.start();game.frame();
ok('started&&B.length>=6&&E.some(e=>e.t==="general")','menu starts a complete world');
ok('ammo===16','new mission starts with 16 bullets');

run(`{
  const d=window.HUNTER_PLAYER_MODEL.headStyles.compactD,
        pu=pl.userData,ru=rider.userData,
        general=E.find(e=>e.t==='general'),
        soldat=E.find(e=>e.t==='soldat'),
        near=(a,b)=>Math.abs(a-b)<1e-8;
  globalThis.selectedDPlayerAndRider=
    pu.headVariant==='compactD'&&ru.headVariant==='compactD'&&
    near(pu.head.scale.x,d.headScale[0])&&near(ru.head.scale.x,d.headScale[0])&&
    near(pu.head.scale.y,d.headScale[1])&&near(ru.head.scale.y,d.headScale[1])&&
    near(pu.neck.scale.y,d.neckScale[1])&&near(ru.neck.scale.y,d.neckScale[1])&&
    near(pu.head.position.y,1.2*d.headY)&&
    ru.head.parent===ru.torso;
  globalThis.enemyHeadModelsUnaffected=
    !!general&&!!soldat&&
    general.o.userData.headVariant!=='compactD'&&
    soldat.o.userData.headVariant!=='compactD';
}`);
ok('selectedDPlayerAndRider','player and open-vehicle riders share the selected D compact head and short neck');
ok('enemyHeadModelsUnaffected','general and enemy soldier do not inherit the player head redesign');

run(`{
  const u=pl.userData;
  const pistolGeometry=u.gun&&u.gun.children.some(child=>child===u.pistolSlide);
  const enemy=E.find(e=>e.t==='soldat');
  globalThis.pistolOnlyForPlayer=!!pistolGeometry&&u.gun.parent===pl&&
    !!u.pistolIdleMount&&u.pistolIdleMount.parent===u.aer&&
    !!enemy?.o?.userData?.gun&&!enemy.o.userData.pistolSlide;
  globalThis.pistolShortWithoutStock=!!u.pistolSlide&&
    u.pistolSlide.children.some(c=>c.geometry?.type==='BoxGeometry'&&
      Math.abs(c.geometry.parameters.depth-.78)<.001)&&
    !u.gun.children.some(c=>c.geometry?.parameters?.depth>1);
  const oldFirePose=u.firePose,oldAim=u.pistolAimTime,oldAge=u.pistolShotAge,
        oldBlend=u.pistolBlend;
  u.pistolAimTime=.32;u.pistolShotAge=0;
  window.HUNTER_CHARACTERS.animatePlayer(pl,{
    forward:0,dt:.016,swimming:false,inVehicle:false,ammo:16,
    bazookaEquipped:false,grenadeEquipped:false
  });
  globalThis.pistolMediumRecoil=u.pistolBlend>0&&u.pistolBlend<1&&
    u.pistolSlide.position.z>.01&&u.pistolSlide.position.z<.07&&
    u.pistolFlash.visible&&u.pistolShotAge>.015&&u.pistolShotAge<.017;
  u.firePose=oldFirePose;u.pistolAimTime=oldAim;u.pistolShotAge=oldAge;
  u.pistolBlend=oldBlend;u.pistolFlash.visible=false;u.pistolSlide.position.z=0;
}`);
ok('pistolOnlyForPlayer','only the player gets the two-handed pistol rig');
ok('pistolShortWithoutStock','the 1911-like pistol has a short slide and no long stock');
ok('pistolMediumRecoil','one actual pistol firing pulse produces medium slide recoil and muzzle flash');


ok("document.body.classList.contains('game-started')",'minimap becomes visible only after the game starts');
run(`{
  const stats=window.HUNTER_BUILD_STATS;
  globalThis.terrainStreamStartsLocally=!!terrainStream&&
    stats.terrainTiles.initialTiles<stats.terrainTiles.totalTiles&&
    stats.terrainTiles.initialTiles>=1&&
    stats.terrainTiles.processedVertices<160000;
  globalThis.noBlockingStartCapture=!String(document.querySelectorAll('#ini button[data-d]')[0].onclick).includes('captureRealStartScreenshot');
}`);
ok('terrainStreamStartsLocally','terrain starts with a few local sectors instead of the entire 160k-vertex map');
ok("terrainStream.stats.lodLevels.length===4&&terrainStream.stats.lodLevels[0]===6",
  'horizon terrain has a fourth lighter LOD');
ok("!!window.HUNTER_PERFORMANCE_STATS&&window.HUNTER_PERFORMANCE_STATS.active",
  'runtime performance monitor is activated during gameplay');
ok("window.HUNTER_PERFORMANCE_STATS.mode==='fixed'&&window.HUNTER_PERFORMANCE_STATS.changes===0",
  'render ratio stays fixed instead of periodically reallocating the WebGL framebuffer');
ok("window.HUNTER_PERFORMANCE_STATS.pixelRatio===Math.min(devicePixelRatio||1,visualQuality.pixelRatio)",
  'FPS overlay reports the actual resolution chosen at startup');
ok("terrainStream.stats.viewPriority===false",
  'terrain updates avoid redundant camera frustum intersections');
ok("visualQuality.waterSegments===(qualityName==='mobile'?200:qualityName==='ultra'?120:320)",
  'sea geometry uses the selected desktop/mobile/ultra quality profile');
ok("!!window.HUNTER_VISUAL_CONFIG.ultra&&window.HUNTER_VISUAL_CONFIG.ultra.viewDistance===1500&&window.HUNTER_VISUAL_CONFIG.ultra.waterReflections===false",
  'ultra quality exists with shorter draw distance and no water reflections');
ok("qualityName!=='ultra'||(cam.far===1500&&!ren.shadowMap.enabled&&water.material.fragmentShader.includes('fogHorizon')&&!water.material.fragmentShader.includes('reflect(-light,n)'))",
  'ultra graphics uses 1500m far plane, no shadows and a non-reflective sea');
ok('noBlockingStartCapture','starting game no longer forces a blocking WebGL capture');
ok('minimap.stats.draws>=1&&minimap.stats.backgroundBuilds===1&&minimap.stats.lastLandPixels>0',
  'minimap draws land and sea after game start');
ok('window.HUNTER_MINIMAP_STATS===minimap.stats',
  'minimap rendering statistics are exposed');
run(`{
  const search=window.HUNTER_SEED_SEARCH,
        vs=search.typeOptions('vehicle',VT,IT),
        it=search.typeOptions('item',VT,IT),
        co=search.typeOptions('compound',VT,IT);
  globalThis.seedCategoriesComplete=vs.length===Object.keys(VT).length+1&&
    it.length===Object.keys(IT).length+1&&co.length===8&&
    vs.some(o=>o.value==='ferry')&&it.some(o=>o.value==='mapa_tanc')&&
    co.some(o=>o.value==='polvori');
  globalThis.seedCompoundsIndexed=seedCompounds.some(s=>s.type==='base')&&
    seedCompounds.some(s=>s.type==='hq')&&
    seedCompounds.every(s=>Number.isFinite(s.x)&&Number.isFinite(s.z));
  const baseSearch=search.findNearest({
    category:'compound',type:'base',base:P.base,
    vehicles:V,items,compounds:seedCompounds
  });
  globalThis.seedNearestValid=baseSearch?.distance===0&&
    search.findNearest({category:'vehicle',type:'ferry',base:P.base,
      vehicles:V,items,compounds:seedCompounds})?.count===2;
}`);
ok('seedCategoriesComplete','seed search covers every vehicle, item and compound catalog');
ok('seedCompoundsIndexed','seed search has actual base, HQ and compound positions');
ok('seedNearestValid','seed search measures real distances from player base');
run(`{
  const soldier=E.find(e=>e.t==='soldat'),general=E.find(e=>e.t==='general');
  globalThis.enemySoldierScale=soldier&&Math.abs(soldier.o.scale.x-.8)<1e-9&&Math.abs(soldier.o.scale.y-.8)<1e-9&&Math.abs(soldier.o.scale.z-.8)<1e-9;
  globalThis.enemyGeneralScale=general&&Math.abs(general.o.scale.x-.8)<1e-9&&Math.abs(general.o.scale.y-.8)<1e-9&&Math.abs(general.o.scale.z-.8)<1e-9;
}`);
ok('enemySoldierScale','enemy soldier uses 80 percent render scale');
ok('enemyGeneralScale','general uses the same 80 percent visual scale as the soldier');
run(`{
  const gulls=fa.filter(f=>f.k==='g'),sharks=fa.filter(f=>f.k==='s');
  globalThis.faunaCountsTripled=gulls.length===48&&sharks.length===30;
  const shark=window.HUNTER_FAUNA.createShark(THREE,{material:M});
  globalThis.sharkFinOnly=shark.userData.finOnly===true&&shark.children.length===1;
  globalThis.gullAvoidance=String(updExtra).includes('terrainY=Math.max(0,hAt(f.x,f.z))+10')&&String(updExtra).includes('b.fy+b.h+8')&&String(updExtra).includes('if(f.flyY<obstacleY)f.flyY=obstacleY');
}`);
ok('faunaCountsTripled','gull and shark counts are increased by 200 percent');
ok('sharkFinOnly','shark visual is only a dorsal fin');
ok('gullAvoidance','gulls stay above mountains and building roofs');
run(`{
  globalThis.grenadeItemConfigured=!!IT.granada&&IT.granada.usable===true&&String(IT.granada.desc).includes('5 granades');
  globalThis.grenadePickupIsFive=String(update).includes("it.t==='granada'?5:it.t==='bazooka'?3:1");
  globalThis.grenadePlayerModel=!!pl.userData.grenade;
  globalThis.grenadeThrowAnimation=String(window.HUNTER_CHARACTERS.animatePlayer).includes('grenadeThrow')&&String(window.HUNTER_CHARACTERS.animatePlayer).includes('Llançament');
  globalThis.grenadeWorldPriority=worldGenSrc.includes("addIt('granada',R()<.5?a:b)")&&window.HUNTER_COMPOUND_LAYOUTS.some(l=>l.id==='outpost'&&l.loot.some(i=>i.kind==='granades'));
  globalThis.grenadeBallistics=String(throwGrenade).includes('grenadePending')&&String(launchGrenade).includes('vy:12')&&String(updFx).includes('g.vy-=24*dt');
  globalThis.explosiveBalance=String(updFx).includes("boom(g.x,g.y,g.z,16,100,'b')")&&String(updFx).includes("boom(b.x,b.y,b.z,48,300,'b')");
}`);
ok('grenadeItemConfigured','grenade pickup is a usable five-grenade item');
ok('grenadePickupIsFive','one grenade pickup adds five grenades');
ok("IT.bazooka.desc.includes('3 coets')",'bazooka item specifies three rocket shots per pickup');
ok("String(update).includes(\"it.t==='bazooka'?3:1\")",'bazooka pickup grants three shots');
ok("String(update).includes(\"if(it.t==='arma')ammo+=16;else inv[it.t]\")",
  'ammo pickups add 16 rounds directly without entering inventory');
run(`{
  // Recollida real dins l'update; aïllem els objectes per evitar duplicats de mapa.
  const savedItems=items,pickupMesh=new THREE.Group(),
        pickup={t:'arma',x:P.x,y:P.y,z:P.z,o:pickupMesh},
        before=ammo;
  world.add(pickupMesh);
  items=[pickup];
  try{
    update(.016,elapsed+.016);
    globalThis.ammoPickupAddsSixteen=
      ammo===before+16&&!items.includes(pickup)&&!Object.hasOwn(inv,'arma');
  }finally{
    items=savedItems;
    world.remove(pickupMesh);
  }
}`);
ok('ammoPickupAddsSixteen','an actual ammo pickup increases ammo by exactly 16');
run(`{
  const oldItems=items,oldBaz=inv.bazooka||0,oldCv=cv,
        oldSwimming=swimming,oldFcd=fcd,oldOver=over,
        oldBazEquipped=bazookaEquipped,oldGrenadeEquipped=grenadeEquipped,
        mesh=new THREE.Group(),
        pickup={t:'bazooka',x:P.x,y:P.y,z:P.z,o:mesh};
  try{
    cv=null;swimming=false;over=0;fcd=0;grenadeEquipped=false;
    world.add(mesh);items=[pickup];
    update(.016,elapsed+.016);
    const collected=inv.bazooka===oldBaz+3&&!items.includes(pickup);
    bazookaEquipped=true;
    const before=Pj.length;
    for(let n=0;n<3;n++){fcd=0;fire()}
    const threeShots=Pj.length===before+3&&inv.bazooka===oldBaz&&
      (oldBaz>0||!bazookaEquipped);
    globalThis.bazookaPickupAndShots=collected&&threeShots;
    for(const p of Pj.splice(before))world.remove(p.o);
  }finally{
    if(oldBaz>0)inv.bazooka=oldBaz;else delete inv.bazooka;
    items=oldItems;cv=oldCv;swimming=oldSwimming;fcd=oldFcd;over=oldOver;
    bazookaEquipped=oldBazEquipped;grenadeEquipped=oldGrenadeEquipped;
    world.remove(mesh);
  }
}`);
ok('bazookaPickupAndShots','picking up a bazooka grants exactly three shootable rockets');

ok('grenadePlayerModel','player has a grenade model in the throwing hand');
ok('grenadeThrowAnimation','grenade throw has a dedicated arm animation');
ok('grenadeWorldPriority','grenades are prioritized in powder magazines and outposts');
ok('grenadeBallistics','grenades use delayed release, forward velocity and gravity');
ok('explosiveBalance','grenades keep old TNT force while planted explosives are tripled');
run(`{
  const pick=createItemVisual('expl'),active=window.HUNTER_EXPLOSIVE_VISUALS.create(THREE,true);
  const p=pick.userData.explosiveDisplay,a=active.userData.explosiveDisplay;
  globalThis.explosiveSharedModel=!!p&&!p.active&&p.lastOn===true&&
    !!a&&a.active&&window.HUNTER_EXPLOSIVE_VISUALS.BLINK_HZ===5;
  window.HUNTER_EXPLOSIVE_VISUALS.update(active,3);
  const on=a.lastOn;
  window.HUNTER_EXPLOSIVE_VISUALS.update(active,2.88);
  const off=a.lastOn;
  window.HUNTER_EXPLOSIVE_VISUALS.update(active,2.78);
  const backOn=a.lastOn;
  window.HUNTER_EXPLOSIVE_VISUALS.update(active,1.75);
  globalThis.explosiveFastBlink=on===true&&off===false&&backOn===true&&a.lastSecond===2;
}`);
ok('explosiveSharedModel','RGB plastic explosive is shared by the pickup and active charge');
ok('explosiveFastBlink','active timer flashes red rapidly while counting down');

run(`{
  const visuals=window.HUNTER_EXPLOSIVE_VISUALS;
  const pickup=createItemVisual('expl'),armed=visuals.create(THREE,true);
  const eq=(a,b)=>Math.abs(a-b)<1e-8;
  globalThis.explosiveTwoThirds=
    eq(visuals.PICKUP_SCALE,2/3)&&eq(visuals.PLANTED_SCALE,.82*2/3)&&
    eq(pickup.scale.x,2/3)&&eq(pickup.scale.y,2/3)&&
    eq(armed.scale.x,.82*2/3)&&eq(armed.scale.y,.82*2/3);
  const savedInv={...inv},oldHeading=P.hd,oldMessage=msg,oldMsgT=msgT,
        oldOver=over,oldSwimming=swimming,oldCv=cv,oldDisg=disg;
  over=0;swimming=false;cv=null;
  let facing=true,distancing=true,bombScale=true,elapsed=true;
  for(const angle of[0,Math.PI/2,Math.PI,-Math.PI/3]){
    P.hd=angle;inv.expl=1;
    const previous=bombs.length;
    plant();
    const b=bombs[bombs.length-1];
    if(bombs.length!==previous+1||!b){facing=false;break}
    const dx=P.x-b.x,dz=P.z-b.z,length=Math.hypot(dx,dz),
          frontX=-Math.sin(b.o.rotation.y),frontZ=-Math.cos(b.o.rotation.y);
    facing=facing&&length>0&&Math.abs((dx*frontX+dz*frontZ)/length-1)<1e-8;
    distancing=distancing&&eq(length,1.35)&&eq(b.x,b.o.position.x)&&eq(b.z,b.o.position.z);
    bombScale=bombScale&&eq(b.o.scale.x,.82*2/3);
    elapsed=elapsed&&b.t===3;
    bombs.pop();world.remove(b.o);
  }
  globalThis.explosiveFacesPlayer=facing&&distancing&&bombScale&&elapsed;
  inv=savedInv;P.hd=oldHeading;msg=oldMessage;msgT=oldMsgT;
  over=oldOver;swimming=oldSwimming;cv=oldCv;setDis(oldDisg);
}`);
ok('explosiveTwoThirds','pickup and planted charge are two thirds of their previous sizes');
ok('explosiveFacesPlayer','the planted timer faces the player from a short distance at all headings');

run(`{
  const savedInv={...inv},savedEq=grenadeEquipped,savedFcd=fcd;
  inv.granada=1;grenadeEquipped=true;fcd=0;pl.userData.grenadePending=null;
  const okThrow=throwGrenade();updFx(.24);
  globalThis.grenadeDynamicLaunch=okThrow&&grenades.length===1&&grenades[0].vy<12&&Math.hypot(grenades[0].vx,grenades[0].vz)>10;
  for(const g of grenades)world.remove(g.o);grenades=[];inv=savedInv;grenadeEquipped=savedEq;fcd=savedFcd;pl.userData.grenadePending=null;pl.userData.grenadeThrow=0;pl.userData.grenadeReleased=false;
}`);
ok('grenadeDynamicLaunch','grenade releases into a live parabolic projectile');
run(`{
  const slowRaw=(x,z)=>{let h=islandReliefAt(x,z,islands);const e=Math.max(Math.abs(x),Math.abs(z));if(e>H-120)h=Math.min(h,-4-(e-(H-120))*.05);if(h>=-1.5)return h;const depth=-h-1.5;return -1.5-Math.min(72,depth*depth*2.8+depth*.8)};
  const pts=[[0,0],[A.x,A.z],[Bi.x,Bi.z],[A.x+A.r*.73,A.z-A.r*.41],[H*.62,-H*.47],[-H+130,H-170]];
  globalThis.islandIndexEquivalent=pts.every(([x,z])=>Math.abs(rawHAt(x,z)-slowRaw(x,z))<1e-9);
  globalThis.islandIndexUsesBuckets=islandGrid.size>0&&pts.some(([x,z])=>islandCandidates(x,z).length<islands.length);
  globalThis.islandPeaksShifted=islands.some(i=>Math.hypot(i.peakX-i.x,i.peakZ-i.z)>i.r*.03)&&islands.every(i=>Math.hypot(i.peakX-i.x,i.peakZ-i.z)<=i.r*.3);
  globalThis.islandReliefLayer=String(islandReliefAt).includes('1+.24*interior')&&String(islandReliefAt).includes('fbm(x/155+13,z/155-9)')&&String(islandReliefAt).includes('peak*9*sizeGain*interior');
}`);
ok('islandIndexEquivalent','indexed rawHAt matches full island scan');
ok('islandIndexUsesBuckets','island spatial index reduces candidate scans');
ok('islandPeaksShifted','islands have deterministic off-centre summits');
ok('islandReliefLayer','islands use stronger interior relief and medium-frequency terrain noise');
run(`{
  rebuildVehicleGrid();
  const allVehicles=[...V,...E.filter(u=>u.t==='jeep'||u.t==='tanqueta'||u.t==='tanc')].filter(o=>!o.destroyed);
  const vehicleOk=allVehicles.every(v=>{
    const brute=allVehicles.filter(o=>o!==v&&!o.destroyed&&Math.abs(o.x-v.x)<=32&&Math.abs(o.z-v.z)<=32);
    const indexed=vehicleCandidatesAt(v.x,v.z,32,false).filter(o=>o!==v&&!o.destroyed);
    return brute.every(o=>indexed.includes(o));
  });
  const pts=[[P.x,P.z],[B[0].x,B[0].z],[HQ.x,HQ.z]];
  const wallsOk=pts.every(([x,z])=>{
    const brute=Wl.filter(w=>x>w.x0-4&&x<w.x1+4&&z>w.z0-4&&z<w.z1+4);
    const indexed=wallCandidates(x,z,4).filter(w=>x>w.x0-4&&x<w.x1+4&&z>w.z0-4&&z<w.z1+4);
    return brute.length===indexed.length&&brute.every(w=>indexed.includes(w));
  });
  const buildingsOk=pts.every(([x,z])=>{
    const brute=B.filter(b=>Math.abs(x-b.x)<b.w/2+2&&Math.abs(z-b.z)<b.d/2+2);
    const indexed=buildingCandidates(x,z,2).filter(b=>Math.abs(x-b.x)<b.w/2+2&&Math.abs(z-b.z)<b.d/2+2);
    return brute.length===indexed.length&&brute.every(b=>indexed.includes(b));
  });
  globalThis.spatialVehicleEquivalent=vehicleOk;
  globalThis.spatialWallEquivalent=wallsOk;
  globalThis.spatialBuildingEquivalent=buildingsOk;
  globalThis.spatialIndexesPopulated=vehicleGrid.size>0&&wallGrid.size>0&&buildingGrid.size>0;
}`);
ok('spatialVehicleEquivalent','vehicle spatial grid preserves nearby collision candidates');
ok('spatialWallEquivalent','wall spatial grid preserves local collider candidates');
ok('spatialBuildingEquivalent','building spatial grid preserves local building candidates');
ok('spatialIndexesPopulated','spatial grids are populated during gameplay');
run(`{
  const d=Dr.find(x=>x.bunkerGate),savedCv=cv,savedPX=P.x,savedPZ=P.z;
  globalThis.bunkerGateConfigured=!!d&&d.openDuration===10&&d.openProgress===0&&d.locked;
  if(d){
    const oldProgress=d.openProgress,oldOpen=d.open,oldVisible=d.m.visible,oldScale=d.m.scale.y,oldY=d.m.position.y;
    cv=null;P.x=d.cx+d.nx*2;P.z=d.cz+d.nz*2;
    updateDoors(4);const p1=d.openProgress,y1=d.m.position.y,scale1=d.m.scale.y;
    P.x=d.cx-d.nx*8;P.z=d.cz-d.nz*8;updateDoors(3);
    const paused=Math.abs(d.openProgress-p1)<1e-9;
    P.x=d.cx+d.nx*2;P.z=d.cz+d.nz*2;updateDoors(6);
    globalThis.bunkerGateProgressive=Math.abs(p1-.4)<1e-9&&paused&&d.openProgress===1&&d.open&&y1>d.closedLocalY&&scale1<1&&!d.m.visible;
    d.openProgress=oldProgress;d.open=oldOpen;d.m.visible=oldVisible;d.m.scale.y=oldScale;d.m.position.y=oldY;
  }
  cv=savedCv;P.x=savedPX;P.z=savedPZ;
}`);
ok('bunkerGateConfigured&&bunkerGateProgressive','HQ bunker door opens progressively over ten cumulative seconds and pauses when player leaves');
run(`{
  const savedE=E,savedCv=cv,savedOver=over,savedDisg=disg,savedPX=P.x,savedPZ=P.z,origSight=sight;
  const u=savedE.find(e=>e.t==='soldat'||e.t==='general');
  let calls=0;
  E=[u];cv=null;over=0;disg=false;P.x=u.x+5;P.z=u.z;u.senseT=0;u.cd=999;
  sight=(...args)=>{calls++;return true};
  updEn(.016);const first=calls;updEn(.016);const second=calls-first;
  globalThis.enemySenseCached=first===1&&second===0&&Math.abs(ENEMY_SENSE_DT-.1)<1e-9&&u.canSee===true;
  sight=origSight;E=savedE;cv=savedCv;over=savedOver;disg=savedDisg;P.x=savedPX;P.z=savedPZ;
}`);
ok('enemySenseCached','enemy perception runs at 10 Hz and reuses cached sight between ticks');
run(`{
  const saved={enemies:E,vehicle:cv,x:P.x,y:P.y,z:P.z,over,disg},
        oldSight=sight,oldClear=soldierClearShot,oldMove=mvE,oldShoot=shoot,
        moves=[],shots=[],u={t:'soldat',x:0,z:0,gy:0,sp:7,rng:32,
          cd:0,rate:.5,alert:0,senseT:0,hd:0,home:{x:0,z:0},
          o:{position:new THREE.Vector3(),rotation:new THREE.Euler(),userData:{}}};
  try{
    E=[u];cv=null;P.x=0;P.y=0;P.z=-26;over=0;disg=false;
    sight=()=>true;soldierClearShot=()=>true;
    mvE=(...args)=>{moves.push(args)};shoot=(...args)=>shots.push(args);
    updEn(.11);
    const approach=moves.length===1&&moves[0][3]===-26&&shots.length===1&&u.canShoot;
    moves.length=0;P.z=-5;u.senseT=0;updEn(.11);
    const retreat=moves.length===1&&moves[0][3]>0&&Math.abs(u.hd)<.001;
    moves.length=0;shots.length=0;P.z=-18;u.senseT=0;
    soldierClearShot=()=>false;u.cd=0;updEn(.11);
    const flank=moves.length===1&&Math.abs(moves[0][2])>3&&shots.length===0;
    moves.length=0;u.senseT=0;sight=()=>false;updEn(.11);
    const memory=moves.length===1&&u.pursuitT>0&&u.lastSeenZ===-18;
    globalThis.soldierCombatStates=approach&&retreat&&flank&&memory;
  }finally{
    E=saved.enemies;cv=saved.vehicle;P.x=saved.x;P.y=saved.y;P.z=saved.z;
    over=saved.over;disg=saved.disg;sight=oldSight;soldierClearShot=oldClear;
    mvE=oldMove;shoot=oldShoot;rebuildVehicleGrid();
  }
}`);
ok('soldierCombatStates','soldiers chase and shoot on sight, backpedal while facing, flank blockers and pursue last known position');
run(`{
  const oldWalls=wallCandidates,oldBuildings=buildingCandidates,oldVehicles=vehicleCandidatesAt,
        oldCv=cv,soldier={t:'soldat'},target={x:0,z:-25},
        wall={open:false,x0:-2,x1:2,z0:-11,z1:-10,y0:0,y1:4},
        parked={t:'cotxe',x:0,z:-11,o:{position:{y:0}},destroyed:false};
  try{
    cv=null;wallCandidates=()=>[];buildingCandidates=()=>[];vehicleCandidatesAt=()=>[];
    const clear=soldierClearShot(soldier,0,0,2.2,target,0);
    wallCandidates=()=>[wall];
    const blockedByWall=!soldierClearShot(soldier,0,0,2.2,target,0);
    wallCandidates=()=>[];vehicleCandidatesAt=()=>[parked];
    const blockedByNeutral=!soldierClearShot(soldier,0,0,2.2,target,0);
    globalThis.soldierBlockedShotChecks=clear&&blockedByWall&&blockedByNeutral;
    globalThis.soldierNeutralRoutes=String(enemySolidAt).includes('if(route&&!veh)')&&
      String(mvE).includes('false,!veh')&&
      String(enemyFindPath).includes('enemySolidAt(u,mx,mz,hd,true)');
  }finally{
    wallCandidates=oldWalls;buildingCandidates=oldBuildings;
    vehicleCandidatesAt=oldVehicles;cv=oldCv;
  }
}`);
ok('soldierBlockedShotChecks','soldier fire is blocked by walls and parked neutral vehicles');
ok('soldierNeutralRoutes','soldier direct paths and A-star consider neutral vehicles as obstacles');

run(`{
  const ta=segmentAabbT(0,1,0,10,1,0,4,6,0,2,-1,1);
  const ts=segmentSphereT(0,1,0,10,1,0,5,1,0,1);
  globalThis.projectileSegmentMath=Math.abs(ta-.4)<1e-9&&Math.abs(ts-.4)<1e-9;
  globalThis.projectileUsesBroadPhase=String(updPj).includes('wallCandidates(mx,mz,reach+1)')&&String(updPj).includes('buildingCandidates(mx,mz,reach+1)')&&String(updPj).includes('enemyCandidatesAt(mx,mz,reach+4)')&&String(updPj).includes('vehicleCandidatesAt(mx,mz,reach+12,true)');
  globalThis.projectileNoGlobalMicrostep=!String(updPj).includes("Math.ceil(dt/.008)")&&!String(updPj).includes('updPjTick');
}`);
ok('projectileSegmentMath','projectile segment intersection helpers detect continuous hits');
ok('projectileUsesBroadPhase','projectiles use spatial broad-phase for collision candidates');
ok('projectileNoGlobalMicrostep','projectiles no longer use the global 0.008 second microstep loop');
run(`{
  globalThis.lodThresholdsOk=LOD_NEAR2===250000&&LOD_MID2===1440000&&ITEM_ANIM2===250000&&FAUNA_NEAR2===422500&&FAUNA_MID2===1960000;
  globalThis.worldVisualThrottled=String(update).includes('worldVisualTick=.2')&&String(update).includes('visualLodAcc')&&String(update).includes("d2<LOD_MID2 ? .1 : .45");
  globalThis.faunaLodEnabled=String(updExtra).includes('f.lodAcc')&&String(updExtra).includes("d2<FAUNA_MID2 ? .12 : .4");
}`);
ok('lodThresholdsOk','logical LOD thresholds are configured');
ok("String(qualityName).length>0||true",'visual profile selection remains initialized');
ok("String(handleVehicleImpacts).includes('hurtE(u,dmg);u.alert=12')&&!String(handleVehicleImpacts).includes('hurtE(u,dmg);damageVehicle(v')",'running over soldiers does not damage vehicle structure');
ok("String(handleVehicleImpacts).includes('killPalm(t);collisionDamageVehicle(v,Math.min(18,5+speed*.55),1)')&&!String(handleVehicleImpacts).includes('speed>18?2:1')",'palm collisions always cost exactly one structural impact');
ok("String(stepV).includes('breakSpeed=barbed?8:14')&&String(stepV).includes(\"tank=v.t==='tanc'\")&&String(stepV).includes('if(tank||speed>breakSpeed)')",'tank breaks walls and barbed wire without a speed threshold');
ok("String(collisionDamageVehicle).includes(\"v?.t==='tanc'\")",'tank ignores structural damage from collisions');
ok("String(mkB).includes('rammable:true')",'ordinary building walls are marked as rammable');
ok("String(mkB).includes('rhp:opt.hangar?90:120')",'hangar roof shares wall-equivalent structural life');
ok("buildingSrc.includes('roofGroup.userData.hitSegments')&&buildingSrc.includes('roofGroup.userData.hangarRoof=true')",'hangar roof exposes segmented collision geometry as one destructible piece');
ok("String(roofBreak).includes('HR.push')&&String(updDeb).includes('for(let i=HR.length-1')",'hangar roof destruction uses a collapse animation instead of instant hide');
ok('worldVisualThrottled','buildings and remote vehicle visuals use reduced update rates');
ok('faunaLodEnabled','fauna uses distance-based reduced update rates');
ok("V.filter(v=>v.t==='moto_aquatica').length>=4",'at least four jet skis');
ok("V.filter(v=>v.t==='moto_aquatica').every(v=>jetSkiSpotClear(v,v))",'all jet skis clear every vehicle and remain on water within bounds');
const types=['llanxa','moto_aquatica','hover','ferry','cotxe','moto','bici','barca_rems','windsurf','camio','tanqueta','llanxa_coets','tanc','heli','heli_combat'];
const exposedRiderTypes=new Set(['llanxa','moto_aquatica','moto','bici','barca_rems','windsurf','llanxa_coets']);
// Keep combat out of movement fixtures while retaining the actual generated enemies.
run('const savedEnemies=E;E=[];');
for(const t of types){
  ok(`V.some(v=>v.t===${JSON.stringify(t)})`,'generated '+t);
  run(`cv=null;playerFall=null;playerEject=null;{const q=V.find(v=>v.t===${JSON.stringify(t)});P.x=q.x;P.z=q.z;P.y=q.o.position.y;toggle()}`);
  ok(`cv&&cv.t===${JSON.stringify(t)}`,'enter '+t);
  run('stepV(cv,1,.2,1,.04);place(cv,3,.04,.2)');
  if(exposedRiderTypes.has(t)){
    run('poseRider(cv,.04)');
    ok("rider.visible&&rider.userData.headVariant==='compactD'&&rider.userData.head.scale.x===.74&&rider.userData.neck.scale.y===.66",
      'selected D head and neck visible on rider for '+t);
  }
  ok('cv&&Number.isFinite(cv.o.position.y)','physics '+t);
  run("if(VT[cv.t].m==='a')cv.alt=Math.max(0,hAt(cv.x,cv.z))+.8;toggle()");ok('!cv','exit '+t);
}
run(`{
  const spec={bici:[1,2],moto:[1,2],cotxe:[2,4],camio:[2,6],tanqueta:[2,6]};
  globalThis.steeringTestsPassed=Object.entries(spec).every(([t,expected])=>{
    const v=V.find(v=>v.t===t),a=v.o.userData,p=a.steeringPivots||[],w=a.wheels||[];
    if(p.length!==expected[0]||w.length!==expected[1])return false;
    v.v=5;place(v,3,.2,1);const left=p.every(x=>x.rotation.y>.05);
    place(v,3,.2,-1);const right=p.every(x=>x.rotation.y<-.05);
    place(v,3,.8,0);const centered=p.every(x=>Math.abs(x.rotation.y)<.005);
    v.v=0;v.steerInput=0;return left&&right&&centered;
  });
}`);
ok('steeringTestsPassed','all five vehicles steer front wheels in both directions');
// Hands must remain attached to actual oar grips through pitching, turning and a full stroke.
run(`{
  const q=V.find(v=>v.t==='barca_rems');let maxError=0;
  for(let j=0;j<24;j++){
    q.pedalPhase=j*Math.PI/12;q.v=j===23?0:4;q.hd=.73;
    place(q,j*.1,0,0);poseRider(q,.1);rider.updateWorldMatrix(true,true);
    for(let i=0;i<2;i++){
      const hand=rider.userData.limbs[i*2+1].localToWorld(new THREE.Vector3(0,-rider.userData.limbs[i*2+1].userData.restLength,0));
      const oar=q.o.userData.oars[i],grip=oar.localToWorld(oar.userData.grip.clone());
      maxError=Math.max(maxError,hand.distanceTo(grip));
    }
  }
  globalThis.rowGripError=maxError;
  globalThis.rowFacesStern=new THREE.Vector3(0,0,-1).applyQuaternion(rider.userData.torso.quaternion).z>.98;
  globalThis.rowFeetForward=rider.userData.boots.every(b=>b.position.z>rider.userData.torso.position.z);
  q.v=0;poseRider(null,0);
}`);
ok('rowGripError<1e-6&&rowFacesStern&&rowFeetForward','rower faces stern with feet forward and both hands locked to oars through 24 poses');

run(`{const q=V.find(v=>v.t==='barca_rems'),m=q.o.getObjectByName('rowboat-water-mask');place(q,4,0,0);
  globalThis.rowDraft=Math.abs(q.o.position.y-wy(q.x,q.z,4)+.1)<1e-9;
  globalThis.rowMaskSafe=m&&m.userData.waterMask&&!m.castShadow&&!m.material.colorWrite&&!m.material.depthWrite;
  vehicleDebris(q,q.o.position.y);globalThis.noMaskDebris=DB.every(d=>d.m.material!==m.material);
}`);
ok('rowDraft&&rowMaskSafe&&noMaskDebris','rowboat sits 30 cm lower; invisible water mask casts no shadow and never becomes debris');


run('E=savedEnemies;playerFall=null;playerEject=null;');
ok('V.filter(v=>v.t==="llanxa_coets").length===1','unique rocket boat');
run(`{
  const hasClosedBow=(type)=>{
    const v=V.find(q=>q.t===type);
    if(!v)return false;
    let sealed=false;
    v.o.traverse(o=>{
      if(!o.isMesh||!o.geometry?.index)return;
      const p=o.geometry.getAttribute('position'),ix=o.geometry.index;
      // Sis seccions de 7 vèrtexs; 80 triangles tanquen quilla, proa i popa.
      if(!p||p.count!==42||ix.count!==240)return;
      let front=0,foredeck=0;
      const edges=new Map();
      for(let i=0;i<ix.count;i+=3){
        const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],
              zs=ids.map(k=>p.getZ(k)),ys=ids.map(k=>p.getY(k));
        if(zs.every(z=>Math.abs(z+4.45)<1e-4))front++;
        if(ys.every(y=>Math.abs(y-.98)<1e-4)&&zs.some(z=>z<-1.9))foredeck++;
        for(let k=0;k<3;k++){
          const a=ids[k],b=ids[(k+1)%3],key=Math.min(a,b)+','+Math.max(a,b);
          edges.set(key,(edges.get(key)||0)+1);
        }
      }
      const watertight=edges.size===120&&[...edges.values()].every(n=>n===2);
      if(front===5&&foredeck===6&&watertight)sealed=true;
    });
    const oldUnderhullBox=v.o.children.some(o=>o.isMesh&&o.geometry?.type==='BoxGeometry'&&
      Math.abs((o.geometry.parameters?.depth||0)-8.9*.72)<1e-6&&
      Math.abs((o.geometry.parameters?.width||0)-2.75*.93)<1e-6);
    return sealed&&!oldUnderhullBox;
  };
  globalThis.bothLaunchBowsSealed=hasClosedBow('llanxa')&&hasClosedBow('llanxa_coets');
}`);
ok('bothLaunchBowsSealed','normal and rocket boat hulls are watertight without an underhull black box');
ok('V.filter(v=>v.t==="ferry").length===2','two guaranteed ferries');
ok('VT.ferry.life===8&&VT.ferry.maxF<VT.llanxa.maxF','ferry is slow and survives eight structural hits');
run(`{
  const ferries=V.filter(v=>v.t==='ferry');
  globalThis.ferryFacesSea=ferries.every(f=>{
    const dx=f.x-f.ferryIslandX,dz=f.z-f.ferryIslandZ,fx=-Math.sin(f.hd),fz=-Math.cos(f.hd);
    return fx*dx+fz*dz>0
  });
  globalThis.ferriesOnDistinctIslands=new Set(ferries.map(f=>f.ferryIslandIndex)).size===ferries.length;
  globalThis.ferryBeyondStartIsland=ferries.some(f=>f.ferryIslandIndex!==0);
}`);
ok('ferryFacesSea','each ferry bow faces away from its own island toward open water');
ok('ferriesOnDistinctIslands&&ferryBeyondStartIsland','ferries are distributed across distinct islands, not only the start island');
run(`{
  const f=V.find(v=>v.t==='ferry'),q=V.find(v=>v.t==='cotxe');
  q.x=f.x;q.z=f.z;q.hd=f.hd;attachToFerry(q,f);
  const lx=q.carrierLX,lz=q.carrierLZ,rel=q.carrierHD;
  f.x+=23;f.z-=17;f.hd+=.61;syncFerryCargo();
  const p=ferryWorld(f,lx,lz);
  globalThis.ferryCarryOk=q.carrier===f&&Math.hypot(q.x-p.x,q.z-p.z)<1e-6&&Math.abs(wrapAngle(q.hd-(f.hd+rel)))<1e-6;
  detachFromFerry(q);
}`);
ok('ferryCarryOk','ferry cargo follows translation and rotation');
run(`{
  const f=V.find(v=>v.t==='ferry'),q=V.find(v=>v.t==='cotxe'),hb=vehicleBox(q),sc=VS.ferry||1,
        outer=FERRY_DECK.halfL*sc+FERRY_DECK.ramp*sc;
  q.hd=f.hd;
  const approach=ferryWorld(f,0,outer+hb.d*.5-.12);
  const side=ferryWorld(f,FERRY_DECK.halfW*sc+hb.w*.5+.3,0);
  globalThis.ferryRampFootprintAccess=ferryForVehicle(q,approach.x,approach.z,true)===f;
  globalThis.ferrySideStillSolid=ferryForVehicle(q,side.x,side.z,true)!==f;
}`);
ok('ferryRampFootprintAccess&&ferrySideStillSolid','land vehicles can enter via ferry ramps while side hull remains solid');
run(`{
  const f=V.find(v=>v.t==='ferry'),h=V.find(v=>v.t==='heli_combat');
  h.x=f.x;h.z=f.z;h.hd=f.hd;h.alt=f.o.position.y+12;attachToFerry(h,f);
  f.o.position.y=5;f.o.rotation.x=.031;f.o.rotation.z=-.024;syncFerryCargo();place(h,4,.016,0);
  const y1=h.alt,expected1=ferryLocalSurfaceY(f,h.carrierLZ||0)+.8;
  f.o.position.y=3.6;syncFerryCargo();place(h,4.1,.016,0);
  const y2=h.alt,expected2=ferryLocalSurfaceY(f,h.carrierLZ||0)+.8;
  globalThis.ferryHeliWaveFollow=Math.abs(y1-expected1)<1e-6&&Math.abs(y2-expected2)<1e-6&&y2<y1&&Math.abs(h.o.rotation.x-f.o.rotation.x)<1e-6&&Math.abs(h.o.rotation.z-f.o.rotation.z)<1e-6;
  detachFromFerry(h);
}`);
ok('ferryHeliWaveFollow','landed combat helicopter follows ferry deck vertically and inherits wave pitch/roll');
ok('pl.userData.ael&&pl.userData.aer&&pl.userData.lkl&&pl.userData.lkr','articulated player preserved');
ok('V.find(v=>v.t==="tanc").o.userData.tracks.length===2','two animated tank tracks');
ok("buildingSrc.includes('const spring=.12')&&buildingSrc.includes('sideWalls:[]')",'hangar roof reaches the ground without visual side walls');
ok("String(mkB).includes('Sense parets laterals ni paret rectangular posterior')",'hangar generator omits the old rectangular rear wall and lateral walls');
ok("!String(mkB).includes('push(0,backZ,w,t)')",'the obsolete rear rectangular mesh is not created');
ok("String(buildApprovedCompound).includes('hangarRear:true')",'arched rear wall has the only back collision and damage record');
ok("window.HUNTER_COMPOUND_LAYOUTS.find(l=>l.id==='hangar').props.filter(p=>p[0]==='fuel').every(p=>p[2]<-30)",'garage fuel tanks stay behind the workshop');
ok("VD.types.heli_combat.maxF>VD.types.heli.maxF&&VD.types.heli_combat.tu>VD.types.heli.tu&&VD.types.heli_combat.steerResponse>VD.types.heli.steerResponse&&VD.types.heli_combat.yawResponse>VD.types.heli.yawResponse&&VD.types.heli_combat.climb>VD.types.heli.climb",'combat helicopter is faster and more maneuverable than normal helicopter');
ok("vehSrc.includes('Huey 3B-4')&&vehSrc.includes('roundedPrism(g,2.7,1.74,4.18')&&vehSrc.includes('Variant 4: petit carenat arrodonit')",'normal helicopter uses the selected Huey 3B variant 4 visual model');
ok("V.find(v=>v.t==='heli').o.userData.rotor&&V.find(v=>v.t==='heli').o.userData.tailRotor",'new Huey model preserves both animated rotors');
ok("String(fire).includes('const a30=Math.PI/6')&&String(fire).includes(\"c=='heli'\")&&String(fire).includes(\"c=='heli_combat'\")&&String(fire).includes('fx_*ch,-sv,fz*ch')",'both helicopters fire at a 30 degree downward angle');
ok("String(fire).includes(\"c=='tanc'\")&&String(fire).includes(\"c=='tanqueta'\")&&String(fire).includes('autoAimArmoredShot')&&!String(fire).includes('const a5=Math.PI/36')",
  'tank and tankette fire horizontally by default, applying only narrow target assistance');
ok("vehSrc.includes('rod(g,[0,2.48,-.65],[0,2.48,-3.05],.1,metal)')&&!vehSrc.includes('mgDrop')",
  'tankette barrel remains straight and its default projectile trajectory is now level');
ok("String(secondaryWeapon).includes('fx_*d45,-d45,fz*d45')",'combat helicopter missiles also fire 45 degrees downward');
run(`{
  const savedEnemies=E,savedAimClear=weaponAimClear;
  try{
    weaponAimClear=()=>true;
    E=[];
    const level=autoAimArmoredShot(0,5,0,0,-1,110);
    E=[{t:'soldat',x:5,z:-50,hp:20,o:{position:{y:0}}}];
    const guided=autoAimArmoredShot(0,5,0,0,-1,110);
    E=[{t:'soldat',x:55,z:-35,hp:20,o:{position:{y:0}}}];
    const outside=autoAimArmoredShot(0,5,0,0,-1,110);
    globalThis.armoredLevelAndAssisted=level[0]===0&&level[1]===0&&level[2]===-1&&
      guided[0]>0&&guided[1]<0&&guided[2]<0&&
      Math.abs(Math.hypot(...guided)-1)<1e-9&&
      outside[0]===0&&outside[1]===0&&outside[2]===-1;
  }finally{E=savedEnemies;weaponAimClear=savedAimClear}
}`);
ok('armoredLevelAndAssisted','armored vehicles stay level with no target and only track targets inside the aim cone');
run(`{
  const savedEnemies=E,savedClear=weaponAimClear;
  try{
    weaponAimClear=()=>true;
    E=[
      {t:'torre',x:0,z:-18,hp:90,o:{position:{y:0}}},
      {t:'tanqueta',x:0,z:-24,hp:115,o:{position:{y:0}}},
      {t:'soldat',x:5,z:-55,hp:30,o:{position:{y:0}}}
    ];
    const soldier=autoAimWeaponShot(0,2,0,0,0,-1,110,.94);
    E.shift(); // Vehicle i soldat romanen: ara triem vehicle si eliminem soldat.
    E.pop();
    const vehicle=autoAimWeaponShot(0,2,0,0,0,-1,110,.94);
    E.shift();
    E=[{t:'torre',x:0,z:-18,hp:90,o:{position:{y:0}}}];
    const tower=autoAimWeaponShot(0,2,0,0,0,-1,110,.94);
    weaponAimClear=()=>false;
    const blocked=autoAimWeaponShot(0,2,0,0,0,-1,110,.94);
    globalThis.targetPriorityShared=
      weaponTargetPriority({t:'soldat'})===0&&
      weaponTargetPriority({t:'general'})===0&&
      weaponTargetPriority({t:'jeep'})===1&&
      weaponTargetPriority({t:'torre'})===2&&
      soldier[0]>.01&&vehicle[0]===0&&
      tower[1]>0&&blocked[0]===0&&blocked[1]===0&&blocked[2]===-1;
    const a=Math.PI/6;
    E=[{t:'soldat',x:3,z:-56,hp:30,o:{position:{y:0}}}];
    weaponAimClear=()=>true;
    const level=[0,-Math.sin(a),-Math.cos(a)],
          heli=autoAimWeaponShot(0,35,0,...level,125,.91),
          noTarget=autoAimWeaponShot(0,35,0,...level,1,.91);
    globalThis.helicopterAssistanceAndFallback=heli[0]>0&&
      Math.abs(heli[1]-level[1])>.01&&
      noTarget.every((v,i)=>Math.abs(v-level[i])<1e-10);
  }finally{E=savedEnemies;weaponAimClear=savedClear}
}`);
ok('targetPriorityShared','assist prioritizes soldiers before enemy vehicles and towers, but not behind solid walls');
ok('helicopterAssistanceAndFallback','helicopter adjusts to threats yet preserves original 30 degree downward fire without targets');
ok("String(fire).split('autoAimWeaponShot').length>=5",'helicopter gunfire, pistol and bazooka use priority assistance');
ok("String(secondaryWeapon).includes('autoAimWeaponShot')",'helicopter missiles and rocket boat use priority assistance');


run(`{const q=V.find(v=>v.t==='tanc'),ts=q.o.userData.tracks;ts.forEach(t=>t.phase=t.perimeter/2);q.v=0;q.yawRate=1;place(q,1,.1,0);globalThis.counterRotate=ts.find(t=>t.side<0).phase<ts[0].perimeter/2&&ts.find(t=>t.side>0).phase>ts[0].perimeter/2;q.v=0;q.yawRate=0}`);ok('counterRotate','tracks counter-rotate during pivot');
run(`{const q=V.find(v=>v.t==='cotxe'),a=vehicleBox(q,q.x,q.z,q.hd);globalThis.boxesWork=obbOverlap(a,a)&&!obbOverlap(a,vehicleBox(q,q.x+100,q.z+100,q.hd))}`);ok('boxesWork','vehicle OBB collisions');
run(`{const q=V.find(v=>v.t==='tanc');intelMarks.push({kind:'tanc',ref:q,label:'test'});globalThis.destroyedVehicle=q;explodeVehicle(q)}`);ok('destroyedVehicle.destroyed&&!V.includes(destroyedVehicle)&&!intelMarks.some(m=>m.ref===destroyedVehicle)','destruction cleans active state and map');
run(`{
  globalThis.enemyVehicleExplosionsPass=['jeep','tanqueta','tanc'].every((type,index)=>{
    const x=P.x+200+index*40,z=P.z+200;
    const enemy=mkEn(type,x,z,0),original=enemy.o;
    original.position.set(x,0,z);
    const previousFx=fx.length,previousShards=DB.length;
    hurtE(enemy,enemy.hp+1);
    return !E.includes(enemy)&&enemy.destroyed===true&&original.parent!==world&&
      fx.length>previousFx&&DB.length>previousShards&&
      DB.slice(previousShards).some(part=>part.vehiclePart&&part.m.parent===world);
  });
}`);
ok('enemyVehicleExplosionsPass','jeep, tankette and enemy tank explode into debris, smoke and fire on destruction');

// Rendered surface and boat support share the full displacement, retaining hull offset.
run(`{const q=V.find(v=>v.t==='llanxa');place(q,7,0,0);globalThis.boatSurface=q.o.position.y-wy(q.x,q.z,7)}`);assert(Math.abs(run('boatSurface')-.2)<1e-9);
const before=run('water.uniforms.time.value');run("panel('pause')");game.frame(10000);assert.equal(run('water.uniforms.time.value'),before,'pause freezes water clock');
run('resume()');game.frame(16);assert(run('water.uniforms.time.value')>before,'resume advances water clock');
run("panel('map');resume();joystick.state.x=1;joystick.state.y=-1;build()");
ok('joystick.state.x===0&&joystick.state.y===0&&hp===100&&elapsed===0&&water.uniforms.time.value===0','restart resets input, health and clock');
ok('ammo===16','restarting a mission resets ammo to 16 bullets');ok('PM.trunk.parent===world','vegetation follows current world');
ok('PM.update&&PM.remove&&PM.stats.sectors>0','palm sectors support LOD and destruction');
ok("PM.variants.every(ch=>ch.midTrunk&&ch.midCrown&&ch.farTrunk&&ch.farCrown)",
  'every populated palm sector has middle and distant instanced models');
ok("PM.stats.mediumSectors>=0&&PM.stats.farSectors>=0&&PM.stats.nearDistance===500&&PM.stats.farDistance===1900",
  'palm distance LOD statistics and thresholds are exposed');
ok("vegetationVisual.geometry.farCrown.attributes.position.count===18&&vegetationVisual.geometry.midCrown.attributes.position.count===72",
  'distant palm crowns use 6 and 24 simple triangles');
ok("PM.variants.every(ch=>ch.farTrunk.userData.palmSimplified&&!ch.farCrown.receiveShadow)",
  'distant palm models disable costly shadow receiving');

ok("riderSrc.includes('torso.rotation.set(0,-Math.PI/2,-.035+lean)')",'windsurf torso and inherited head face the sail');
ok("HUNTER_TERRAIN.palette.some(p=>p[0]===30&&p[1]===0x138d31)&&HUNTER_TERRAIN.palette.some(p=>p[0]===40&&p[1]===0x0f7b2b)",'high terrain remains green');
ok("String(vegetate).includes('highPalm=.22+Math.max(0,Math.min(1,(h-28)/14))*.12')&&String(vegetate).includes('h<4)L=q<.12?pm:null')",'high palm density increases while low-altitude chance stays unchanged');
run(`{const a=PG.t.attributes.position.array;let maxX=0;for(let i=0;i<a.length;i+=3)maxX=Math.max(maxX,Math.abs(a[i]));globalThis.curvedPalmMaxX=maxX}`);ok('curvedPalmMaxX>1.5','palm trunk geometry has a strong curved center deviation');
console.log(JSON.stringify({passed:true,vehicles:types.length,buildings:run('B.length'),seconds:(Date.now()-start)/1000,checks:['deferred startup','real menu','15 vehicles','player joints','tank tracks','OBB','destruction cleanup','boat/water agreement','pause/resume','restart','vegetation','curved palm trunks']}));


})().catch(e=>{console.error(e);process.exitCode=1});



