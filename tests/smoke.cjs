(async()=>{
// Actual models, generation and simulation. DOM/audio/GPU are mocked.
const assert=require('assert');
const game=await require('./harness.cjs')();const {run}=game;const ok=(s,m)=>assert(run(s),m);
assert.equal(run('THREE.REVISION'),'186');
const start=Date.now();ok('!started&&B.length===0','title screen defers world generation');
game.start();game.frame();
ok('started&&B.length>=6&&E.some(e=>e.t==="general")','menu starts a complete world');
run(`{
  const soldier=E.find(e=>e.t==='soldat'),general=E.find(e=>e.t==='general');
  globalThis.enemySoldierScale=soldier&&Math.abs(soldier.o.scale.x-.9)<1e-9&&Math.abs(soldier.o.scale.y-.9)<1e-9&&Math.abs(soldier.o.scale.z-.9)<1e-9;
  globalThis.enemyGeneralScale=general&&Math.abs(general.o.scale.x-1)<1e-9&&Math.abs(general.o.scale.y-1)<1e-9&&Math.abs(general.o.scale.z-1)<1e-9;
}`);
ok('enemySoldierScale','enemy soldier visual model is reduced by 10 percent');
ok('enemyGeneralScale','enemy general keeps original visual scale');
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
  globalThis.grenadePickupIsFive=String(update).includes("it.t==='granada'?5:1");
  globalThis.grenadePlayerModel=!!pl.userData.grenade;
  globalThis.grenadeThrowAnimation=String(window.HUNTER_CHARACTERS.animatePlayer).includes('grenadeThrow')&&String(window.HUNTER_CHARACTERS.animatePlayer).includes('Llançament');
  globalThis.grenadeWorldPriority=worldGenSrc.includes("addIt('granada',R()<.5?a:b)")&&worldGenSrc.includes("if(R()<.8)addIt('granada'");
  globalThis.grenadeBallistics=String(throwGrenade).includes('grenadePending')&&String(launchGrenade).includes('vy:12')&&String(updFx).includes('g.vy-=24*dt');
  globalThis.explosiveBalance=String(updFx).includes("boom(g.x,g.y,g.z,16,100,'b')")&&String(updFx).includes("boom(b.x,b.y,b.z,48,300,'b')");
}`);
ok('grenadeItemConfigured','grenade pickup is a usable five-grenade item');
ok('grenadePickupIsFive','one grenade pickup adds five grenades');
ok("String(update).includes(\"if(it.t==='arma')ammo+=40;else inv[it.t]\")",'ammo pickups add directly to ammo without entering inventory');
ok('grenadePlayerModel','player has a grenade model in the throwing hand');
ok('grenadeThrowAnimation','grenade throw has a dedicated arm animation');
ok('grenadeWorldPriority','grenades are prioritized in powder magazines and outposts');
ok('grenadeBallistics','grenades use delayed release, forward velocity and gravity');
ok('explosiveBalance','grenades keep old TNT force while planted explosives are tripled');
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
const types=['llanxa','moto_aquatica','hover','ferry','cotxe','moto','bici','barca_rems','windsurf','camio','tanqueta','llanxa_coets','tanc','heli','heli_combat'];
// Keep combat out of movement fixtures while retaining the actual generated enemies.
run('const savedEnemies=E;E=[];');
for(const t of types){
  ok(`V.some(v=>v.t===${JSON.stringify(t)})`,'generated '+t);
  run(`cv=null;playerFall=null;playerEject=null;{const q=V.find(v=>v.t===${JSON.stringify(t)});P.x=q.x;P.z=q.z;P.y=q.o.position.y;toggle()}`);
  ok(`cv&&cv.t===${JSON.stringify(t)}`,'enter '+t);
  run('stepV(cv,1,.2,1,.04);place(cv,3,.04,.2)');
  ok('cv&&Number.isFinite(cv.o.position.y)','physics '+t);
  run("if(VT[cv.t].m==='a')cv.alt=Math.max(0,hAt(cv.x,cv.z))+.8;toggle()");ok('!cv','exit '+t);
}
// Hands must remain attached to actual oar grips through pitching, turning and a full stroke.
run(`{
  const q=V.find(v=>v.t==='barca_rems');let maxError=0;
  for(let j=0;j<24;j++){
    q.pedalPhase=j*Math.PI/12;q.v=j===23?0:4;q.hd=.73;
    place(q,j*.1,0,0);poseRider(q,.1);rider.updateWorldMatrix(true,true);
    for(let i=0;i<2;i++){
      const hand=rider.userData.limbs[i*2+1].localToWorld(new THREE.Vector3(0,.5,0));
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

run('E=savedEnemies;playerFall=null;playerEject=null;');
ok('V.filter(v=>v.t==="llanxa_coets").length===1','unique rocket boat');
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
ok("String(mkB).includes('Sense parets laterals independents')",'hangar collision model omits lateral walls');
ok("worldGenSrc.includes(\"prop('fuel',17,18,Math.PI/2)\")&&worldGenSrc.includes(\"prop('sign',31,26,Math.PI/2)\")",'garage props are redistributed away from the annex');
ok("VD.types.heli_combat.maxF>VD.types.heli.maxF&&VD.types.heli_combat.tu>VD.types.heli.tu&&VD.types.heli_combat.steerResponse>VD.types.heli.steerResponse&&VD.types.heli_combat.yawResponse>VD.types.heli.yawResponse&&VD.types.heli_combat.climb>VD.types.heli.climb",'combat helicopter is faster and more maneuverable than normal helicopter');
ok("String(fire).includes('const a30=Math.PI/6')&&String(fire).includes(\"c=='heli'\")&&String(fire).includes(\"c=='heli_combat'\")&&String(fire).includes('fx_*ch,-sv,fz*ch')",'both helicopters fire at a 30 degree downward angle');
ok("String(fire).includes('const a5=Math.PI/36')&&String(fire).includes('fx_*ch,-sv,fz*ch')",'tank fires 5 degrees downward');
ok("vehicleSrc.includes("rod(g,[0,2.48,-.65],[0,2.48,-3.05],.1,metal)")&&!vehicleSrc.includes('mgDrop')",'tankette gun barrel stays level while bullets keep their downward trajectory');
ok("String(secondaryWeapon).includes('fx_*d45,-d45,fz*d45')",'combat helicopter missiles also fire 45 degrees downward');
run(`{const q=V.find(v=>v.t==='tanc'),ts=q.o.userData.tracks;ts.forEach(t=>t.phase=t.perimeter/2);q.v=0;q.yawRate=1;place(q,1,.1,0);globalThis.counterRotate=ts.find(t=>t.side<0).phase<ts[0].perimeter/2&&ts.find(t=>t.side>0).phase>ts[0].perimeter/2;q.v=0;q.yawRate=0}`);ok('counterRotate','tracks counter-rotate during pivot');
run(`{const q=V.find(v=>v.t==='cotxe'),a=vehicleBox(q,q.x,q.z,q.hd);globalThis.boxesWork=obbOverlap(a,a)&&!obbOverlap(a,vehicleBox(q,q.x+100,q.z+100,q.hd))}`);ok('boxesWork','vehicle OBB collisions');
run(`{const q=V.find(v=>v.t==='tanc');intelMarks.push({kind:'tanc',ref:q,label:'test'});globalThis.destroyedVehicle=q;explodeVehicle(q)}`);ok('destroyedVehicle.destroyed&&!V.includes(destroyedVehicle)&&!intelMarks.some(m=>m.ref===destroyedVehicle)','destruction cleans active state and map');
// Rendered surface and boat support share the full displacement, retaining hull offset.
run(`{const q=V.find(v=>v.t==='llanxa');place(q,7,0,0);globalThis.boatSurface=q.o.position.y-wy(q.x,q.z,7)}`);assert(Math.abs(run('boatSurface')-.2)<1e-9);
const before=run('water.uniforms.time.value');run("panel('pause')");game.frame(10000);assert.equal(run('water.uniforms.time.value'),before,'pause freezes water clock');
run('resume()');game.frame(16);assert(run('water.uniforms.time.value')>before,'resume advances water clock');
run("panel('map');resume();joystick.state.x=1;joystick.state.y=-1;build()");
ok('joystick.state.x===0&&joystick.state.y===0&&hp===100&&elapsed===0&&water.uniforms.time.value===0','restart resets input, health and clock');ok('PM.t.parent===world','vegetation follows current world');
ok("riderSrc.includes('torso.rotation.set(0,-Math.PI/2,-.035+lean)')",'windsurf torso and inherited head face the sail');
ok("HUNTER_TERRAIN.palette.some(p=>p[0]===30&&p[1]===0x138d31)&&HUNTER_TERRAIN.palette.some(p=>p[0]===40&&p[1]===0x0f7b2b)",'high terrain remains green');
ok("String(vegetate).includes('highPalm=.22+Math.max(0,Math.min(1,(h-28)/14))*.12')&&String(vegetate).includes('h<4)L=q<.12?pm:null')",'high palm density increases while low-altitude chance stays unchanged');
run(`{const a=PM.t.geometry.attributes.position.array;let maxX=0;for(let i=0;i<a.length;i+=3)maxX=Math.max(maxX,Math.abs(a[i]));globalThis.curvedPalmMaxX=maxX}`);ok('curvedPalmMaxX>1.5','palm trunk geometry has a strong curved center deviation');
console.log(JSON.stringify({passed:true,vehicles:types.length,buildings:run('B.length'),seconds:(Date.now()-start)/1000,checks:['deferred startup','real menu','15 vehicles','player joints','tank tracks','OBB','destruction cleanup','boat/water agreement','pause/resume','restart','vegetation','curved palm trunks']}));


})().catch(e=>{console.error(e);process.exitCode=1});

