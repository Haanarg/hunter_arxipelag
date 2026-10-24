#!/usr/bin/env node
'use strict';
// Esdeveniments reals del canvas, física intacta i transicions dins un món acotat.
const assert=require('node:assert/strict');
const createGame=require('./harness.cjs');
const close=(a,b,why,tolerance=1e-9)=>assert(Math.abs(a-b)<tolerance,why+`: ${a} / ${b}`);
(async()=>{
  const game=await createGame();
  const run=game.run,frame=(n=1)=>{for(let i=0;i<n;i++)game.frame(50)};
  const pointer=(type,id=1,x=100,y=100)=>game.dispatch('canvas',type,{pointerId:id,clientX:x,clientY:y,button:0});
  game.run(`
    globalThis.cameraTestHeight=hAt;
    hAt=()=>10;seedSearchMode=true;seed=67;R=mul(seed);
    world=new THREE.Group();world.userData={compounds:[],airObstacles:[]};scene.add(world);
    started=1;paused=false;over=0;cheats.immune=true;
    document.body.classList.add('game-started');
    globalThis.cameraFixture=(type,real=true)=>{
      clearDeathCinematic();clearVictoryCinematic();clearKeys();
      started=1;paused=false;over=0;hp=20;scopeActive=false;swimming=false;
      playerFall=null;playerEject=null;activeBunker=null;cameraBasement=null;
      B=[];Wl=[];Dr=[];stairs=[];E=[];items=[];fa=[];Pj=[];TG.clear();
      worldVisualTick=1000;palmVisualTick=1000;uiTick=-1000;
      hAt=()=>['w','wl'].includes(VT[type].m)?-20:10;
      const o=real?mkV(type):seedVehicleStub(type);
      cv={t:type,x:0,z:0,hd:.35,v:0,sideV:0,strafeV:0,verticalV:0,
        steerInput:0,driveInput:0,yawRate:0,alt:VT[type].m==='a'?50:10,
        o,life:VT[type].life,maxLife:VT[type].life,rockets:10};
      V=[cv];world.add(o);place(cv,elapsed,0,0);P.x=0;P.z=0;P.y=10;P.hd=cv.hd;
      resetCameraState();
      cam.position.set(Math.sin(cv.hd)*VT[type].cd,o.position.y+VT[type].ch,
        Math.cos(cv.hd)*VT[type].cd);
    };
  `);
  const types=Array.from(run('Object.keys(VT)'));
  for(const type of types){
    game.context.cameraTestType=type;run('cameraFixture(cameraTestType)');
    const before=run('JSON.stringify([cv.hd,cv.v,cv.sideV,cv.strafeV,cv.steerInput,cv.driveInput,cv.yawRate,P.hd])');
    pointer('pointerdown');pointer('pointermove',1,250);
    assert.equal(run('JSON.stringify([cv.hd,cv.v,cv.sideV,cv.strafeV,cv.steerInput,cv.driveInput,cv.yawRate,P.hd])'),before,type+': mirar no modifica la física');
    const position=run('cam.position.clone()');frame();
    assert(run(`cam.position.distanceTo(new THREE.Vector3(${position.x},${position.y},${position.z}))>.5`),type+': la càmera orbita');
    close(run('cv.hd'),.35,type+': el xassís continua orientat');
    close(run('cv.v'),0,type+': aparcat no avança');
    const held=run('vehicleLook.offset');frame(3);
    close(run('vehicleLook.offset'),held,type+': conserva la mirada mentre arrossegam');
    pointer('pointerup');
    assert(!game.el('canvas').hasPointerCapture(1),type+': allibera la captura');
    // El mateix camí de teclat/joystick continua governant la conducció.
    game.dispatch('window','keydown',{code:'KeyW'});
    game.dispatch('window','keydown',{code:'KeyA'});frame(10);
    assert(run('cv.v>.4&&Math.abs(cv.hd-.35)>.001&&cv.steerInput>0'),type+': controls físics actius');
    game.dispatch('window','keyup',{code:'KeyW'});game.dispatch('window','keyup',{code:'KeyA'});
  }
  run("cameraFixture('cotxe')");
  pointer('pointerdown');pointer('pointermove',1,300);pointer('pointerup');
  const parked=run('vehicleLook.offset');frame(30);
  close(run('vehicleLook.offset'),parked,'Mirar aparcats no es recentra');
  // Una nova mirada en marxa té una pausa de 0,7 s abans de tornar.
  pointer('pointerdown');pointer('pointermove',1,150);pointer('pointerup');
  run('cv.v=15');const released=run('vehicleLook.offset');frame(12);
  close(run('vehicleLook.offset'),released,'Període de gràcia després de soltar');
  let previous=Math.abs(released);
  for(let i=0;i<35;i++){
    frame();const next=Math.abs(run('vehicleLook.offset'));
    assert(next<=previous+1e-9&&previous-next<.21,'Tornada gradual i monòtona');previous=next;
  }
  assert(previous<Math.abs(released)*.03,'Torna darrere del vehicle en marxa');
  // Ni el segon dit ni el seu pointerup no roben el primer arrossegament.
  run("cameraFixture('cotxe')");pointer('pointerdown',1);pointer('pointermove',1,200);
  const owned=run('vehicleLook.offset');pointer('pointerdown',2);pointer('pointermove',2,600);pointer('pointerup',2);
  close(run('vehicleLook.offset'),owned,'Un segon dit no gira la càmera');
  assert.equal(run('drag.id'),1,'Un segon pointerup no cancel·la el primer');
  pointer('pointermove',1,250);assert.notEqual(run('vehicleLook.offset'),owned);
  pointer('pointercancel',1);assert.equal(run('drag'),null);assert(!game.el('canvas').hasPointerCapture(1));
  pointer('pointerdown',3);pointer('pointermove',3,200);
  game.el('canvas').releasePointerCapture(3);assert.equal(run('drag'),null,'Pèrdua nativa de captura');
  // El salt de representació de +π a -π no fa donar la volta llarga.
  run("cameraFixture('cotxe');cv.hd=Math.PI-.02");pointer('pointerdown');pointer('pointermove',1,150);
  const heading=run('vehicleLook.heading(cv,0,true)');run('cv.hd=-Math.PI+.02');
  close(run(`wrapAngle(vehicleLook.heading(cv,0,true)-(${heading}))`),.04,'Continuïtat angular a ±π');
  pointer('pointerup');
  // Joystick tàctil mentre el canvas encara té un altre pointer capturat.
  run("cameraFixture('cotxe')");pointer('pointerdown');pointer('pointermove',1,150);
  game.dispatch('joystick','pointerdown',{pointerId:8,clientX:190,clientY:90});frame(6);
  assert(run('cv.v>0&&cv.steerInput>0'),'El joystick continua accelerant i girant');
  game.dispatch('joystick','pointerup',{pointerId:8});pointer('pointerup');
  run(`
    cameraFixture('ferry');const ferry=cv,q=ferryWorld(ferry,0,-8),o=mkV('cotxe');
    const cargo={t:'cotxe',...q,hd:ferry.hd,v:0,alt:0,o,life:5,maxLife:5};
    V.push(cargo);world.add(o);attachToFerry(cargo,ferry);cv=cargo;resetCameraState();
  `);
  pointer('pointerdown');pointer('pointermove',1,250);frame();
  assert(run('cv.carrier===V[0]&&Math.abs(cv.hd-V[0].hd)<1e-9&&Math.abs(vehicleLook.offset)>.5'),'Càmera del vehicle embarcat sense girar la càrrega ni el ferri');
  pointer('pointerup');
  // A peu continua girant el jugador; la mira continua movent només l'òptica.
  run('cv=null;resetCameraState();P.hd=.8');pointer('pointerdown');pointer('pointermove',1,200);
  close(run('P.hd'),.2,'Gir a peu preservat');pointer('pointerup');
  run('sniperEquipped=true;inv.franctirador=1;sniperAmmo=5;setSniperScope(true)');
  pointer('pointerdown');pointer('pointermove',1,200,150);
  close(run('P.hd'),.2,'La mira no gira el cos');close(run('scopeYaw'),.085,'Sensibilitat horitzontal de la mira');
  close(run('scopePitch'),-.0575,'Sensibilitat vertical de la mira');
  const scopePosition=run('JSON.stringify([P.x,P.z,P.hd])');
  game.dispatch('window','keydown',{code:'KeyW'});frame();game.dispatch('window','keyup',{code:'KeyW'});
  assert.equal(run('JSON.stringify([P.x,P.z,P.hd])'),scopePosition,'Controls de mira sense locomoció');
  assert(run('cam.fov<10&&Math.abs(cam.position.y-P.y-1.76)<1e-9'),'Càmera òptica preservada');
  run('setSniperScope(false)');pointer('pointermove',1,500,500);
  close(run('P.hd'),.2,'Cap drag antic després de sortir de la mira');assert.equal(run('drag'),null);
  // Canvis de pilot, entrada/sortida, pausa, focus i destrucció cancel·len al moment.
  run("cameraFixture('cotxe')");pointer('pointerdown');pointer('pointermove',1,200);run('toggle()');
  assert.equal(run('cv'),null);assert.equal(run('drag'),null);pointer('pointermove',1,600);
  close(run('P.hd'),.35,'Sortida sense drag antic');
  run('V[0].reentryLockUntil=0;P.x=V[0].x;P.z=V[0].z;playerEject=null;toggle()');
  assert(run('cv===V[0]'));close(run('vehicleLook.offset'),0,'Entrada amb càmera centrada');
  pointer('pointerdown');run('cv={...cv,o:seedVehicleStub(cv.t)}');pointer('pointermove',1,500);
  assert.equal(run('drag'),null,'Canvi extern de vehicle cancel·la el drag');
  run("cameraFixture('cotxe')");pointer('pointerdown');pointer('pointermove',1,200);
  game.dispatch('window','blur');assert(run('paused&&drag===null&&vehicleLook.offset===0'),'Focus perdut pausa i neteja');
  assert(!game.el('canvas').hasPointerCapture(1));run('resume()');pointer('pointermove',1,500);
  close(run('vehicleLook.offset'),0,'Represa sense pointer antic');
  pointer('pointerdown');game.context.document.hidden=true;game.dispatch('document','visibilitychange');
  assert(run('paused&&drag===null'),'Pestanya oculta cancel·la el drag');game.context.document.hidden=false;run('resume()');
  pointer('pointerdown');pointer('pointermove',1,200);run('explodeVehicle(cv)');
  assert(run('cv===null&&drag===null&&vehicleLook.offset===0'),'Explosió cancel·la la mirada');
  run("cameraFixture('heli')");pointer('pointerdown');pointer('pointermove',1,200);run('ejectFromHelicopter(cv)');
  assert(run('cv===null&&drag===null&&vehicleLook.offset===0'),'Ejecció aèria cancel·la la mirada');
  run("cameraFixture('cotxe')");pointer('pointerdown');pointer('pointermove',1,200);run("fin('HAS MORT',{type:'impact'})");
  assert(run('over&&drag===null&&vehicleLook.offset===0'),'Mort cancel·la la mirada');
  // Canons, torretes i dany es comproven al runtime complet, sense extreure funcions.
  for(const type of ['tanc','tanqueta','heli_combat','llanxa_coets']){
    game.context.cameraTestType=type;run('cameraFixture(cameraTestType,true);ammo=10;fcd=0;fire()');
    const shot=run('JSON.stringify([Pj.at(-1).vx,Pj.at(-1).vy,Pj.at(-1).vz,Pj.at(-1).dmg])');
    const turret=run('window.HUNTER_VEHICLES.turretShot(THREE,cv.o)?.direction.clone()||null');
    pointer('pointerdown');pointer('pointermove',1,350);run('fcd=0;fire()');
    assert.equal(run('JSON.stringify([Pj.at(-1).vx,Pj.at(-1).vy,Pj.at(-1).vz,Pj.at(-1).dmg])'),shot,type+': tret i dany independents de la càmera');
    if(turret)assert(run(`window.HUNTER_VEHICLES.turretShot(THREE,cv.o).direction.distanceTo(new THREE.Vector3(${turret.x},${turret.y},${turret.z}))<1e-9`),type+': torreta intacta');
    pointer('pointerup');
  }
  // Un únic món visual petit per al sostre, les parets i les escales reals.
  run('hAt=cameraTestHeight;seedSearchMode=false;clearKeys();paused=false;cheats.immune=true');
  game.start('67',1);
  run(`
    globalThis.cameraTestGeneral=E.find(u=>u.t==='general');
    E=[];items=[];fa=[];V=[];cv=null;playerFall=null;playerEject=null;worldVisualTick=0;
    globalThis.cameraTestBunker=activeBunker;
    globalThis.cameraTestAt=(lx,lz,y,heading)=>{
      const b=cameraTestBunker,q=buildingWorldPoint(b,lx,lz);
      P.x=q.x;P.z=q.z;P.y=y;P.hd=heading;
    };
    cameraTestAt(-12,0,cameraTestBunker.basement.floorY,Math.PI/2);
  `);
  frame();
  const basement=run(`(()=>{
    const b=cameraTestBunker,s=b.basement,eye=bunkerEye;
    const walls=Wl.filter(w=>w.owner===b&&w.bunkerBasementWall),hidden=walls.filter(w=>!w.m.visible&&!w.open);
    return {inside:s.cameraInside,hidden:hidden.length,total:walls.length,
      safe:cam.position.y<=b.fy-1.55&&cam.position.y>=s.floorY+5.4,
      slabs:s.upperSlabMeshes.length>0&&s.upperSlabMeshes.every(m=>m.visible&&m.material.opacity===1&&!m.material.transparent),
      collision:hidden.every(w=>Wl.includes(w)&&w.hp>0&&!w.open),
      selective:hidden.every(w=>segmentAabbT(eye.x,eye.y,eye.z,cam.position.x,cam.position.y,cam.position.z,w.x0,w.x1,w.y0,w.y1,w.z0,w.z1)!==null),
      notSwimming:!swimming};
  })()`);
  assert(basement.inside&&basement.hidden>0&&basement.hidden<basement.total,'Ocultació selectiva al soterrani');
  for(const key of ['safe','slabs','collision','selective','notSwimming'])assert(basement[key],key);
  const oldCamera=run('cam.position.clone()');run('P.hd+=.8');frame();
  assert(run(`cam.position.distanceTo(new THREE.Vector3(${oldCamera.x},${oldCamera.y},${oldCamera.z}))>0&&cam.position.distanceTo(cameraOffset)>1`),'El gir interior se suavitza');
  for(let i=0;i<12;i++){
    run('P.hd+=.31');frame();
    assert(run(`(()=>{const b=cameraTestBunker,s=b.basement,q=buildingLocalPoint(b,cam.position.x,cam.position.z);return cam.position.y<=b.fy-1.55&&cam.position.y>=s.floorY+5.4&&Math.abs(q.x)<=s.halfX-1.3+1e-8&&Math.abs(q.z)<=s.halfZ-1.3+1e-8})()`),'Suavitzat confinat sota el sostre');
  }
  run('sniperEquipped=true;inv.franctirador=1;setSniperScope(true)');
  assert.equal(run('cameraOcclusion.count'),0,'La mira restaura envans al moment');
  assert(run('cameraTestBunker.basement.upperSlabMeshes.every(m=>m.visible)'),'Sostre opac en mode mira');
  run('setSniperScope(false)');frame();run("panel('pause')");
  assert.equal(run('cameraOcclusion.count'),0,'La pausa restaura envans sense esperar un fotograma');
  run('resume()');frame();
  // Una porta oberta i una paret destruïda mentre eren ocultes no reapareixen.
  const restoration=run(`(()=>{
    restoreCameraWalls();const s=cameraTestBunker.basement,d=s.doors[0];
    d.open=false;d.openProgress=0;d.m.visible=true;cameraOcclusion.hide(d);
    d.open=true;d.openProgress=1;restoreCameraWalls();const open=!d.m.visible;
    const b=mkB(P.x+200,P.z,20,20,8,0x888888,0x777777,{noPartitions:true});
    const w=b.structuralWalls[0];cameraOcclusion.hide(w);dmgW(w,w.hp);restoreCameraWalls();
    return {open,destroyed:!w.m.visible&&!Wl.includes(w)};
  })()`);
  assert(restoration.open&&restoration.destroyed,'No ressuscita geometria ni portes obertes');
  // Pujar l'escala manté el suport físic i canvia de costat del forjat amb seguretat.
  run(`{const b=cameraTestBunker,s=b.basement.stair;cameraTestAt(s.x,s.zTop,b.fy+.22,0)}`);frame();
  assert(run('!cameraTestBunker.basement.cameraInside&&cam.position.y>=hAt(cam.position.x,cam.position.z)+3'),'Sortida segura sobre el terreny');
  run(`{const b=cameraTestBunker,s=b.basement.stair;cameraTestAt(s.x,s.zTop+(s.zBottom-s.zTop)*.02,b.fy-.04,0)}`);frame();
  assert(run('cameraTestBunker.basement.cameraInside&&cam.position.y<=cameraTestBunker.fy-1.55'),'Primer esglaó ja sota el forjat');
  pointer('pointerdown');pointer('pointermove',1,180);
  assert(run('startVictoryCinematic(cameraTestGeneral)&&over&&drag===null&&cameraOcclusion.count===0'),'Victòria restaura envans i cancel·la el drag');
  assert(!game.el('canvas').hasPointerCapture(1),'Victòria allibera la captura');
  run('clearVictoryCinematic();over=0');
  // L'edifici ordinari conserva parets opaques i només talla les interposades.
  run(`
    restoreCameraWalls();
    // Geometria real sobre una plana coneguda, sense edificis/arbres
    // aleatoris superposats a la casa de prova.
    B=[];Wl=[];Dr=[];stairs=[];TG.clear();activeBunker=null;
    terrainStream.dispose();terrainStream=null;hAt=()=>10;
    globalThis.cameraTestHouse=mkB(0,0,20,20,8,0xaaaaaa,0x777777,{noPartitions:true});
    const house=cameraTestHouse;P.x=house.x;P.z=house.z-7;P.y=house.fy+.3;P.hd=Math.PI;worldVisualTick=0;
  `);frame(8);
  const house=run(`(()=>{const h=cameraTestHouse,w=Wl.filter(w=>w.owner===h),hidden=w.filter(w=>!w.m.visible&&!w.open);return {inside:ib===h,opaque:h.wm.opacity===1&&h.dm.opacity===1,hidden:hidden.length,total:w.length,roof:!h.roof.visible,safe:cam.position.y>=hAt(cam.position.x,cam.position.z)+3}})()`);
  assert(house.inside&&house.opaque&&house.roof&&house.safe,'Interior ordinari amb material opac i coberta oberta: '+JSON.stringify(house));
  assert(house.hidden>0&&house.hidden<house.total,'Només amaga les parets interposades de l’habitació');
  pointer('pointerdown');run('cameraOcclusion.hide(cameraTestHouse.structuralWalls[0])');
  const oldWall=run('cameraTestHouse.structuralWalls[0].m');
  run('hAt=cameraTestHeight;seedSearchMode=true');game.start('67',1);
  assert.equal(run('drag'),null,'Reinici sense drag');assert(oldWall.visible,'Reinici restaura les peces antigues abans de desmuntar el món');
  close(run('vehicleLook.offset'),0,'Reinici sense mirada acumulada');
  console.log(`OK càmera: ${types.length} perfils i càrrega, pointer/joystick/teclat, mira, física i armes, pausa/mort/victòria/reinici i interiors`);
})().catch(error=>{console.error(error);process.exitCode=1});
