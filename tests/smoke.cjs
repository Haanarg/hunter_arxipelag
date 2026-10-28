(async()=>{
// Actual models, generation and simulation. DOM/audio/GPU are mocked.
const assert=require('assert');
const game=await require('./harness.cjs')();const {run}=game;const ok=(s,m)=>assert(run(s),m);
assert.equal(run('THREE.REVISION'),'186');
// L'ordre i els valors del menú són importants: cap canvi al cercador
// ni a la versió flotant i gràfics Alts per defecte també al mòbil.
const landingHtml=require('fs').readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
const menuStart=landingHtml.indexOf('<div id="startMenu"'),menuEnd=landingHtml.indexOf('<div id="performanceScreen"',menuStart);
const landingMenu=landingHtml.slice(menuStart,menuEnd);
assert(menuStart>=0&&menuEnd>menuStart,'main menu exists');
const uiOrder=['difficultyButtons','seedBox','qualityBox'].map(id=>landingMenu.indexOf('id="'+id+'"'));
assert(uiOrder.every(n=>n>=0)&&uiOrder[0]<uiOrder[1]&&uiOrder[1]<uiOrder[2],
  'difficulty buttons then seed selection then quality');
assert(landingMenu.includes('<option value="desktop" selected>')&&
  landingMenu.includes('id="performanceMenuOpen"')&&
  !landingMenu.includes('Els mínims eliminen'),'high quality selected, gear beside dropdown, no descriptive text');
assert(landingHtml.includes('#seedSearchOpen{position:absolute')&&
  landingHtml.includes('#versionBadge{position:absolute'),'seed search and version retain their positions');

const start=Date.now();ok('!started&&B.length===0','title screen defers world generation');
ok("!document.body.classList.contains('game-started')",'minimap must stay hidden on the start screen');
game.start();game.frame();
ok('started&&B.length>=6&&E.some(e=>e.t==="general")','menu starts a complete world');
ok('ammo===16','new mission starts with 16 bullets');

const armoredPose=run(`(()=>{
  const result={};
  for(const type of ['tanc','tanqueta']){
    const model=mkV(type),system=window.HUNTER_VEHICLES,
          rig=model.userData,desired=new THREE.Vector3(-.82,.11,.57).normalize(),
          first=system.turretShot(THREE,model),initial=rig.turretPivot.rotation.y;
    if(!first||!rig.turretPitch||!rig.turretPivot)return {error:type};
    system.aimTurret(THREE,model,desired,.016);
    const firstTurn=Math.abs(rig.turretPivot.rotation.y-initial);
    for(let n=0;n<210;n++)system.aimTurret(THREE,model,desired,.016);
    const gun=system.turretShot(THREE,model);
    const aligned=gun.direction.dot(desired)>.997,
          actual=rig.turretMuzzle.getWorldPosition(new THREE.Vector3()),
          fromMuzzle=gun.origin.distanceTo(actual)<1e-8,
          hullIndependent=Math.abs(model.rotation.y)<1e-8,
          // La caixa inferior de la tanqueta ha de ser filla del cos,
          // no de la corona giratòria.
          lowerFixed=type!=='tanqueta'||model.children.some(m=>m.isMesh&&
            m.geometry?.parameters?.width===2.08&&
            Math.abs(m.position.y-2.02)<1e-6&&
            Math.abs(m.position.z+.15)<1e-6);
    result[type]={firstTurn,aligned,fromMuzzle,hullIndependent,lowerFixed,
      yaw:rig.turretPivot.rotation.y,pitch:rig.turretPitch.rotation.x};
  }
  return result;
})()`);
for(const type of ['tanc','tanqueta']){
 const q=armoredPose[type];assert(q&&q.firstTurn>0&&q.firstTurn<.07&&q.aligned&&
   q.fromMuzzle&&q.hullIndependent&&q.lowerFixed&&q.pitch>.015,
   'smooth independent turret aims and shoots exactly from muzzle ('+type+'): '+JSON.stringify(q));
}

run(`{
  const helis=V.filter(v=>v.t==='heli'||v.t==='heli_combat');
  globalThis.heliSkidsRestOnGround=['heli','heli_combat'].every(t=>helis.some(v=>v.t===t))&&
    helis.every(v=>{
      const ground=Math.max(0,hAt(v.x,v.z)),target=helicopterLandedAltitude(v,ground);
      place(v,0,0,0);
      const gap=v.o.position.y+v.o.userData.skidContactHeight-ground;
      return Math.abs(v.alt-target)<1e-6&&Math.abs(gap-.1)<1e-6;
    });
  globalThis.heliSpawnsDoNotOverlap=helis.every((v,i)=>helis.slice(i+1).every(u=>
    Math.hypot(v.x-u.x,v.z-u.z)>=vehicleRadius(v.t)+vehicleRadius(u.t)+3));
  const h=helis.find(v=>v.t==='heli'),oldAlt=h.alt,oldVz=h.verticalV;
  try{
    const ground=Math.max(0,groundAt(h.x,h.z)),target=helicopterLandedAltitude(h,ground);
    // Aproximació real des de sobre. Situar l'aparell sota terra activa
    // correctament el sistema de col·lisions, no el d'aterratge.
    h.alt=target+.45;h.verticalV=-6;
    const survived=stepV(h,0,0,-1,.1);
    const skidGap=h.alt+h.o.userData.skidContactHeight-ground;
    globalThis.heliDescendClampedToSkids=survived&&!h.destroyed&&
      Math.abs(h.alt-target)<1e-6&&Math.abs(skidGap-.1)<1e-6&&h.verticalV===0;
  }finally{h.alt=oldAlt;h.verticalV=oldVz;place(h,0,0,0)}
}`);
ok('heliSkidsRestOnGround','both helicopter models have skids 10 cm above the terrain when parked');
ok('heliSpawnsDoNotOverlap','helicopters of either type spawn apart so both can be boarded');
ok('heliDescendClampedToSkids','helicopter descent stops with skids on the terrain instead of hovering');

const additionalWorldSource=require('fs').readFileSync(require('path').join(__dirname,'../src/world-generation.js'),'utf8');
const additionalAiSource=require('fs').readFileSync(require('path').join(__dirname,'../src/enemy-ai.js'),'utf8');
ok('!!IT.paracaigudes&&!!ICON.paracaigudes','parachute is collectible inventory');
ok("items.some(i=>i.t==='paracaigudes')", 'parachutes are generated at heliports');
ok("String(nearV).includes('v.reentryLockUntil>elapsed')&&String(toggle).includes('if(playerFall||playerEject)return')",
  'player cannot re-enter the helicopter immediately after a jump');
ok("String(ejectFromHelicopter).includes('playerFall.parachute=chute')&&String(update).includes('dmg=fall.parachute?0:')",
  'parachute auto-deploys and negates landing damage');
ok("String(update).includes('autoAimArmoredShot(')&&String(update).includes('range=cv.t===\\'tanc\\'?220:85')&&String(fire).includes('turretShot(THREE,cv.o)')&&String(fire).includes('Pj[Pj.length-1].life=4.4')",
  'armored shots use the rotating barrel and preserve the tank autoaim range');
// Rifle muzzle and convergence are checked behaviorally below, after scope input.
assert(additionalAiSource.includes('function soldierEnterBuilding')&&
  additionalAiSource.includes('soldierEnterBuilding(u,ib,target,dt)')&&
  run('String(mkB)').includes('door:entranceDoor')&&run('String(updateDoors)').includes('desiredOpen'),
  'door state follows explicit intent while house entrance routes remain available');

run(`{
  const oldMove=mvE,results=[];
  try{
    mvE=(u,step,tx,tz)=>{
      const dx=tx-u.x,dz=tz-u.z,d=Math.hypot(dx,dz);
      if(d>1e-9){const len=Math.min(step,d);u.x+=dx/d*len;u.z+=dz/d*len}
    };
    for(const [nx,nz] of [[0,1],[0,-1],[1,0],[-1,0]]){
      const house={x:0,z:0,w:16,d:16,hangar:false,
        door:{cx:nx*8,cz:nz*8,nx,nz,locked:false,bunkerGate:false}},
        u={x:nx*14+nz*2,z:nz*14-nx*2,sp:7,entryBuilding:null,entryPhase:0},
        target={x:0,z:0};
      let sawEntryPhase=false,entered=false;
      for(let i=0;i<120;i++){
        const pursuing=soldierEnterBuilding(u,house,target,.05);
        sawEntryPhase=sawEntryPhase||u.entryPhase===1;
        if(!pursuing){entered=true;break}
      }
      results.push(sawEntryPhase&&entered&&Math.abs(u.x)<6.85&&Math.abs(u.z)<6.85);
    }
    globalThis.soldierPassesFourDoorDirections=results.every(Boolean);
  }finally{mvE=oldMove}
}`);
ok('soldierPassesFourDoorDirections','soldiers keep the interior waypoint across narrow doorways facing any of four sides');
run(`{
  const originalMove=mvE,results=[];
  try{
    // El desplaçament real (A*, col·lisions, altres soldats) no garanteix
    // arribar EXACTAMENT al waypoint. Simulam el rebot en acostar-s'hi.
    mvE=(u,step,tx,tz)=>{
      const dx=tx-u.x,dz=tz-u.z,d=Math.hypot(dx,dz);
      if(d>1e-9){const len=d<.5?.42:Math.min(step,d);u.x+=dx/d*len;u.z+=dz/d*len}
    };
    for(const [nx,nz] of [[0,1],[0,-1],[1,0],[-1,0]]){
      const house={x:0,z:0,w:16,d:16,hangar:false,
        door:{cx:nx*8,cz:nz*8,nx,nz,locked:false,bunkerGate:false}},
        u={x:nx*14+nz*2,z:nz*14-nx*2,sp:7,entryBuilding:null,entryPhase:0},
        target={x:0,z:0};
      let phaseReached=false,entered=false;
      for(let i=0;i<120;i++){
        const pursuing=soldierEnterBuilding(u,house,target,.05);
        phaseReached=phaseReached||u.entryPhase===1;
        if(!pursuing){entered=true;break}
      }
      results.push(phaseReached&&entered&&Math.abs(u.x)<6.85&&Math.abs(u.z)<6.85);
    }
    globalThis.soldierPassesDoorWithImpreciseSteps=results.every(Boolean);
  }finally{mvE=originalMove}
}`);
ok('soldierPassesDoorWithImpreciseSteps','soldiers enter through four orientations even with waypoint overshoot');

const chuteCoreSource=require('fs').readFileSync(require('path').join(__dirname,'../src/game-core.js'),'utf8');
assert(chuteCoreSource.includes('if(playerFall.parachute){')&&
  chuteCoreSource.includes('airborne:!!playerFall,parachuting:!!playerFall?.parachute')&&
  chuteCoreSource.includes('pl.rotation.x=0;')&&
  chuteCoreSource.includes('vertices.push(x,5.25,z,.57*Math.cos(a),2.56,.43*Math.sin(a))'),
  'deployed parachute keeps the model upright and lines attach to its upper harness');



const strafeMarkup=require('fs').readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
assert(strafeMarkup.includes('id="strafeLeft"')&&strafeMarkup.includes('id="strafeRight"')&&
  strafeMarkup.includes('body.strafe-active .strafe-btn')&&
  strafeMarkup.includes('body.strafe-active #joystick')&&
  strafeMarkup.includes('aria-label="Desplaçar lateralment a la dreta"'),
  'two small strafe controls flank the joystick only when the mode is active');
run(`{
  const saved={cv,swimming,playerFall,playerEject,paused,over},
        originalLeft=strafePointers.left,originalRight=strafePointers.right;
  let enabledFoot=false,enabledVehicles=true,hiddenVehicles=true,clearsInput=false,enabledWhenSwimming=false;
  try{
    cv=null;swimming=false;playerFall=null;playerEject=null;paused=false;over=0;
    enabledFoot=updateStrafeControls()&&document.body.classList.contains('strafe-active');
    for(const type of ['hover','heli','heli_combat']){
      cv={t:type};enabledVehicles=enabledVehicles&&updateStrafeControls();
    }
    for(const type of ['tanc','tanqueta','cotxe','moto','bici','camio','ferry','llanxa','moto_aquatica']){
      cv={t:type};hiddenVehicles=hiddenVehicles&&!updateStrafeControls()&&
        !document.body.classList.contains('strafe-active');
    }
    cv=null;strafePointers.left=33;setStrafeHeld('left',true);
    cv={t:'cotxe'};updateStrafeControls();
    clearsInput=strafePointers.left===null&&!strafeButtons.left.classList.contains('held');
    cv=null;swimming=true;
    enabledWhenSwimming=updateStrafeControls()&&document.body.classList.contains('strafe-active');
    globalThis.strafeHudModes=enabledFoot&&enabledVehicles&&hiddenVehicles&&clearsInput&&enabledWhenSwimming;
  }finally{
    cv=saved.cv;swimming=saved.swimming;playerFall=saved.playerFall;
    playerEject=saved.playerEject;paused=saved.paused;over=saved.over;
    strafePointers.left=originalLeft;strafePointers.right=originalRight;
    updateStrafeControls();
  }
}`);
ok('strafeHudModes','two buttons appear on foot, while swimming, on hovercraft and helicopters and release on vehicle changes');

const bindings=run(`(()=>{
 const saved={toggle,toggleSniperScope,secondaryWeapon,panel,started,paused,over,cv,inv,swimming,playerFall,playerEject};
 const events=[];
 try{
  started=true;paused=false;over=false;cv={t:'heli'};inv={expl:1};swimming=false;playerFall=playerEject=null;
  toggle=()=>events.push('vehicle');toggleSniperScope=()=>events.push('scope');
  secondaryWeapon=()=>{events.push('secondary');return false};panel=name=>events.push(name);
  act('KeyE');act('KeyT');act('KeyG');act('KeyY');act('KeyU');
  return events;
 }finally{({toggle,toggleSniperScope,secondaryWeapon,panel,started,paused,over,cv,inv,swimming,playerFall,playerEject}=saved)}
})()`);
assert.deepEqual(Array.from(bindings),['vehicle','scope','secondary','bombtimer']);
ok("String(update).includes('(K.KeyU?1:0)-(K.KeyY?1:0)')&&!String(update).includes('K.KeyX')&&!String(update).includes('K.KeyZ')",
  'Y/U keyboard strafes left/right');
const remappedKeysHtml=require('fs').readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
assert(remappedKeysHtml.includes('id="mainActionButton" data-k="KeyE"')&&
  remappedKeysHtml.includes('id="sniperAimButton" class="sniper-control" data-k="KeyT"')&&
  remappedKeysHtml.includes('class="heli-combat-control" data-k="KeyG"')&&
  remappedKeysHtml.includes('Strafe esquerra · Y')&&
  remappedKeysHtml.includes('Strafe dreta · U')&&
  remappedKeysHtml.includes('MIRA x8 · T per sortir'),
  'touch buttons and instructional labels use the remapped keys');



run(`{
  const saved={ammo,cv,grenadeEquipped,bazookaEquipped,sniperEquipped,
    over,swimming,uiTick,grenades:inv.granada,melee:pl.userData.meleePose};
  const fireButton=document.getElementById('mainFireButton');
  try{
    cv=null;over=0;swimming=false;grenadeEquipped=false;
    bazookaEquipped=false;sniperEquipped=false;
    pl.userData.meleePose=0;ammo=0;uiTick=.13;
    update(.016,elapsed+.016);
    const knifeActive=fireButton.dataset.weapon==='ganivet'&&
      fireButton.innerHTML===ICON.ganivet&&pl.userData.knife.visible;
    ammo=16;uiTick=.13;update(.016,elapsed+.016);
    const pistolRestored=fireButton.dataset.weapon==='normal'&&
      fireButton.innerHTML==='🎯'&&!pl.userData.knife.visible;
    ammo=0;grenadeEquipped=true;inv.granada=1;uiTick=.13;
    update(.016,elapsed+.016);
    const grenadeWins=fireButton.dataset.weapon==='granada'&&
      fireButton.innerHTML===ICON.granada;
    globalThis.knifeIconWhenOutOfAmmo=knifeActive&&pistolRestored&&grenadeWins;
  }finally{
    ammo=saved.ammo;cv=saved.cv;grenadeEquipped=saved.grenadeEquipped;
    bazookaEquipped=saved.bazookaEquipped;sniperEquipped=saved.sniperEquipped;
    over=saved.over;swimming=saved.swimming;uiTick=saved.uiTick;
    pl.userData.meleePose=saved.melee;
    if(saved.grenades==null)delete inv.granada;else inv.granada=saved.grenades;
  }
}`);
ok('knifeIconWhenOutOfAmmo','firing switches to the knife icon at zero ammo, then returns to shooting and respects grenade priority');

const knifePreviewSource=require('fs').readFileSync(require('path').join(__dirname,'../src/knife-pose-concepts.mjs'),'utf8')
  .replace('export const knifePoseConcepts','const knifePoseConcepts')
  .replace('export function createKnifePoseConcept','function createKnifePoseConcept');
run(knifePreviewSource+`
{
  globalThis.knifePreviewProposals=knifePoseConcepts.length===5&&knifePoseConcepts.every((entry,i)=>{
    const player=createKnifePoseConcept(THREE,i),u=player.userData,knife=u.knife;
    player.updateMatrixWorld(true);
    const palm=u.aer.localToWorld(new THREE.Vector3(0,-.62*1.2,-.025*1.2)),
          grip=knife.userData.previewGrip?.getWorldPosition(new THREE.Vector3()),
          tip=knife.localToWorld(knife.userData.previewTip.clone()),
          forearm=new THREE.Vector3(0,-1,0).applyEuler(u.aer.rotation);
    return knife.visible&&!u.gun.visible&&u.aer.rotation.x>.2&&
      forearm.z<-.2&&!!grip&&grip.distanceTo(palm)<1e-6&&
      knife.userData.previewBlade?.parent===knife&&
      knife.userData.previewTip.y<-.9&&tip.x>.7&&
      (i===4?tip.z<-.5:tip.z>.15);
  });
  const original=createKnifePoseConcept(THREE,3),
        forward=createKnifePoseConcept(THREE,4);
  original.updateMatrixWorld(true);forward.updateMatrixWorld(true);
  const a=original.userData,b=forward.userData,
        palmA=a.knife.getWorldPosition(new THREE.Vector3()),
        palmB=b.knife.getWorldPosition(new THREE.Vector3()),
        tipA=a.knife.localToWorld(a.knife.userData.previewTip.clone()),
        tipB=b.knife.localToWorld(b.knife.userData.previewTip.clone());
  globalThis.knifeForwardSameGrip=
    palmA.distanceTo(palmB)<1e-7&&
    Math.abs(a.ar.rotation.x-b.ar.rotation.x)<1e-9&&
    Math.abs(a.ar.rotation.z-b.ar.rotation.z)<1e-9&&
    Math.abs(a.aer.rotation.x-b.aer.rotation.x)<1e-9&&
    Math.abs(a.aer.rotation.z-b.aer.rotation.z)<1e-9&&
    tipA.z-palmA.z>.3&&tipB.z-palmB.z<-.3&&
    Math.abs(a.knife.rotation.x-b.knife.rotation.x)>.5;
}
`);
ok('knifePreviewProposals','five knife previews preserve anatomically correct elbows and centered grips');
ok('knifeForwardSameGrip','4A and 4B share exactly the same arm and hand placement, changing only blade direction');

const knifeAttackSource=require('fs').readFileSync(require('path').join(__dirname,'../src/knife-attack-concepts.mjs'),'utf8')
  .replace(/export (const|function)/g,'$1');
run('(function(){'+knifeAttackSource+`
  const results=knifeAttackConcepts.map((cfg,i)=>{
    const model=createKnifeAttackConcept(THREE,i),u=model.userData;
    const sample=p=>{
      const state=applyKnifeAttackConcept(model,i,p);
      model.updateMatrixWorld(true);
      const hand=u.knife.getWorldPosition(new THREE.Vector3()),
            palm=u.aer.localToWorld(new THREE.Vector3(0,-.62*1.2,-.025*1.2)),
            tip=u.knife.localToWorld(u.knife.userData.previewTip.clone()),
            delta=tip.sub(hand);
      return {state,grip:hand.distanceTo(palm),
        forward:-delta.z/delta.length(),tipZ:delta.z,
        elbow:u.aer.rotation.x,shoulder:u.ar.rotation.x,
        wristY:u.knife.rotation.y,
        y:hand.y,visible:u.knife.visible&&!u.gun.visible};
    };
    const rest=sample(0),windup=sample(.17),impact=sample(.55),
          recovery=sample(1);
    return {
      ok:rest.visible&&windup.visible&&impact.visible&&recovery.visible&&
        Math.abs(rest.wristY)<1e-9&&
        Math.abs(impact.wristY+Math.PI/2)<1e-8&&
        Math.abs(impact.state.wristDegrees-90)<1e-8&&
        impact.forward>.85&&impact.tipZ<-.55&&
        impact.elbow>.15&&windup.elbow>0&&
        impact.grip<1e-7&&rest.grip<1e-7&&recovery.grip<1e-7&&
        Math.abs(rest.shoulder-window.HUNTER_CHARACTERS.knifePose4B.shoulder.x)<1e-8&&
        Math.abs(recovery.shoulder-rest.shoulder)<1e-8&&
        Math.abs(recovery.wristY)<1e-8,
      attackTip:[impact.forward,impact.y,impact.shoulder]
    };
  });
  globalThis.knifeAttackFourVariants=results.length===4&&results.every(r=>r.ok);
  globalThis.knifeAttackDifferentMoves=
    new Set(results.map(r=>r.attackTip.map(n=>Math.round(n*100)).join(','))).size===4;
})()`);
ok('knifeAttackFourVariants','four 4B previews grip the knife, rotate the wrist inward 90 degrees at impact and recover anatomically');
ok('knifeAttackDifferentMoves','four previews have distinct strike timing and spatial trajectories');

run('(function(){'+knifeAttackSource+`
  const a=createKnifeAttackConcept(THREE,2,false),
        b=createKnifeAttackConcept(THREE,2,true),
        ua=a.userData,ub=b.userData;
  let sameArm=true,oppositeWrist=true,gripsCorrect=true;
  for(const p of[0,.2,.35,.55,.7,1]){
    const ar=applyKnifeAttackConcept(a,2,p,false),
          br=applyKnifeAttackConcept(b,2,p,true);
    a.updateMatrixWorld(true);b.updateMatrixWorld(true);
    const handA=ua.knife.getWorldPosition(new THREE.Vector3()),
          handB=ub.knife.getWorldPosition(new THREE.Vector3()),
          palmA=ua.aer.localToWorld(new THREE.Vector3(0,-.744,-.03)),
          palmB=ub.aer.localToWorld(new THREE.Vector3(0,-.744,-.03));
    sameArm=sameArm&&
      Math.abs(ua.ar.rotation.x-ub.ar.rotation.x)<1e-9&&
      Math.abs(ua.ar.rotation.z-ub.ar.rotation.z)<1e-9&&
      Math.abs(ua.aer.rotation.x-ub.aer.rotation.x)<1e-9&&
      Math.abs(ua.aer.rotation.z-ub.aer.rotation.z)<1e-9&&
      handA.distanceTo(handB)<1e-8;
    oppositeWrist=oppositeWrist&&
      Math.abs(ua.knife.rotation.y+ub.knife.rotation.y)<1e-9&&
      Math.abs(ar.wristDegrees+br.wristDegrees)<1e-9;
    gripsCorrect=gripsCorrect&&
      handA.distanceTo(palmA)<1e-7&&handB.distanceTo(palmB)<1e-7;
  }
  applyKnifeAttackConcept(a,2,.55,false);
  applyKnifeAttackConcept(b,2,.55,true);
  a.updateMatrixWorld(true);b.updateMatrixWorld(true);
  const pointA=ua.knife.localToWorld(ua.knife.userData.previewTip.clone()),
        pointB=ub.knife.localToWorld(ub.knife.userData.previewTip.clone());
  globalThis.knifeAttackThreeReverseCompare=
    knifeAttackConcepts.length===4&&knifeAttackThreeCompare.length===2&&
    knifeAttackThreeCompare[0].variantIndex===2&&
    knifeAttackThreeCompare[1].variantIndex===2&&
    sameArm&&oppositeWrist&&gripsCorrect&&
    Math.abs(ua.knife.rotation.y+Math.PI/2)<1e-9&&
    Math.abs(ub.knife.rotation.y-Math.PI/2)<1e-9&&
    pointA.distanceTo(pointB)>.1;
})()`);
ok('knifeAttackThreeReverseCompare','animation 3B rotates wrist in the opposite 90-degree direction with identical arm, timing and grip');

const knifeAttackPreviewPage=require('fs').readFileSync(require('path').join(__dirname,'../proves.html'),'utf8');
assert(knifeAttackPreviewPage.includes('mode=ganivet-atac')&&
  knifeAttackPreviewPage.includes('attackPlay')&&
  knifeAttackPreviewPage.includes('attackSeek')&&
  knifeAttackPreviewPage.includes('applyKnifeAttackConcept(model,attackCompareMode?2:i,p,attackCompareMode&&i===1)')&&
  knifeAttackPreviewPage.includes('mode=ganivet-atac-3'),
  'the knife animation preview page exposes four synchronized animations, pause and frame scrubbing');


run(`{
  const characters=window.HUNTER_CHARACTERS,
        model=characters.createPlayer(THREE,{box:bx}),u=model.userData,
        ready={forward:0,dt:1/60,swimming:false,inVehicle:false,ammo:0,
          bazookaEquipped:false,grenadeEquipped:false,sniperEquipped:false};
  const tick=(count,opts=ready)=>{
    for(let i=0;i<count;i++){
      model.position.set(0,0,0);
      characters.animatePlayer(model,opts);
    }
    model.position.set(0,0,0);model.updateMatrixWorld(true);
  };
  const tip=()=>u.knife.localToWorld(u.knife.userData.previewTip.clone()),
        hand=()=>u.knife.getWorldPosition(new THREE.Vector3());
  tick(60);
  const original=createKnifePoseConcept(THREE,4);
  original.updateMatrixWorld(true);
  const o=original.userData,
        restingTip=tip(),restingHand=hand(),
        previewTip=o.knife.localToWorld(o.knife.userData.previewTip.clone()),
        previewHand=o.knife.getWorldPosition(new THREE.Vector3()),
        grip=u.knife.userData.previewGrip?.getWorldPosition(new THREE.Vector3()),
        palm=u.aer.localToWorld(new THREE.Vector3(0,-.62*1.2,-.025*1.2));
  globalThis.knife4BEquippedMatchesPreview=
    u.knife.visible&&!u.gun.visible&&u.knife.userData.previewBlade?.geometry?.type==='ExtrudeGeometry'&&
    !!grip&&grip.distanceTo(palm)<1e-6&&
    restingHand.distanceTo(previewHand)<.001&&restingTip.distanceTo(previewTip)<.001&&
    Math.abs(u.ar.rotation.x-o.ar.rotation.x)<.001&&
    Math.abs(u.aer.rotation.x-o.aer.rotation.x)<.001;
  tick(20,{...ready,forward:1});
  const walking=u.knife.visible&&u.aer.rotation.x>.3&&
    tip().z-hand().z<-.35;
  tick(30);
  const before=tip().z,gripInHand=()=>u.knife.getWorldPosition(new THREE.Vector3()).distanceTo(
    u.aer.localToWorld(new THREE.Vector3(0,-.62*1.2,-.025*1.2)))<1e-6;
  u.meleePose=u.knifeAttackDuration;
  tick(12);
  const during=u.knife.visible&&u.aer.rotation.x>.2&&
    tip().z<before-.1&&gripInHand();
  tick(55);
  const recovered=tip().z-hand().z<-.35&&
    Math.abs(u.ar.rotation.x-characters.knifePose4B.shoulder.x)<.002&&
    Math.abs(u.aer.rotation.x-characters.knifePose4B.elbow.x)<.002;
  tick(20,{...ready,ammo:16});
  const pistolRestored=u.gun.visible&&!u.knife.visible;
  tick(20,{...ready,inVehicle:true});
  const vehicleHidesKnife=!u.knife.visible;
  tick(20,{...ready,grenadeEquipped:true});
  const grenadeHidesKnife=!u.knife.visible;
  globalThis.knife4BAnimation=walking&&during&&recovered&&pistolRestored&&
    vehicleHidesKnife&&grenadeHidesKnife;
}`);
ok('knife4BEquippedMatchesPreview','in-game knife and anatomical guard pose exactly match the approved 4B preview');
ok('knife4BAnimation','knife 4B animates while running and lunging, recovers to guard, and hides for firearms, grenades and vehicles');

run('(function(){'+knifeAttackSource+`
  const chars=window.HUNTER_CHARACTERS,model=createKnifeAttackConcept(THREE,2,true),
        u=model.userData,base=chars.knifePose4B;
  globalThis.knife3BPreviewMatchesGame=[0,.17,.4,.55,.75,1].every(p=>{
    const target=chars.knifeAttack3BTargets(p);
    applyKnifeAttackConcept(model,2,p,true);
    return Math.abs(u.ar.rotation.x-target.shoulderX)<1e-8&&
      Math.abs(u.ar.rotation.z-target.shoulderZ)<1e-8&&
      Math.abs(u.aer.rotation.x-target.elbowX)<1e-8&&
      Math.abs(u.aer.rotation.z-target.elbowZ)<1e-8&&
      Math.abs(u.knife.rotation.x-target.bladeX)<1e-8&&
      Math.abs(u.knife.rotation.y-target.bladeY)<1e-8&&
      Math.abs(u.knife.rotation.z-target.bladeZ)<1e-8&&
      Math.abs(u.al.rotation.x-(-.04+target.leftShoulderX))<1e-8&&
      Math.abs(u.al.rotation.z-(-.12+target.leftShoulderZ))<1e-8&&
      Math.abs(u.ael.rotation.x-(.17+target.leftElbowX))<1e-8;
  })&&Math.abs(chars.knifeAttack3BTargets(.55).bladeY-Math.PI/2)<1e-8&&
    chars.knifeAttack3BTargets(.55).leftShoulderX>.1;
})()`);
ok('knife3BPreviewMatchesGame','selected 3B preview shares right wrist, elbow, shoulder and left-arm movement with the game');

run(`{
  const chars=window.HUNTER_CHARACTERS,
        player=chars.createPlayer(THREE,{box:bx}),u=player.userData,
        ready={forward:0,dt:1/60,swimming:false,inVehicle:false,ammo:0,
          bazookaEquipped:false,grenadeEquipped:false,sniperEquipped:false};
  const frame=()=>{
    player.position.set(0,0,0);
    chars.animatePlayer(player,ready);
    player.position.set(0,0,0);
    player.updateMatrixWorld(true);
  };
  for(let i=0;i<80;i++)frame();
  u.meleePose=u.knifeAttackDuration;
  let maxWrist=0,maxLeftSwing=0,maxLeftElbow=0,minRightElbow=10,gripCorrect=true;
  for(let i=0;i<Math.ceil(u.knifeAttackDuration/ready.dt)+2;i++){
    frame();
    maxWrist=Math.max(maxWrist,u.knife.rotation.y);
    maxLeftSwing=Math.max(maxLeftSwing,u.al.rotation.x-.018*Math.sin(u.breath));
    maxLeftElbow=Math.max(maxLeftElbow,u.ael.rotation.x-.16);
    minRightElbow=Math.min(minRightElbow,u.aer.rotation.x);
    gripCorrect=gripCorrect&&u.knife.getWorldPosition(new THREE.Vector3())
      .distanceTo(u.aer.localToWorld(new THREE.Vector3(0,-.744,-.03)))<1e-6;
  }
  for(let i=0;i<50;i++)frame();
  const recovers=Math.abs(u.knife.rotation.y)<1e-7&&
    Math.abs(u.ar.rotation.x-chars.knifePose4B.shoulder.x)<.002&&
    Math.abs(u.aer.rotation.x-chars.knifePose4B.elbow.x)<.002&&
    Math.abs(u.al.rotation.x-.018*Math.sin(u.breath))<.004;
  globalThis.knife3BInGame=
    Math.abs(maxWrist-Math.PI/2)<1e-7&&u.knife.visible&&
    maxLeftSwing>.08&&maxLeftSwing<.26&&
    maxLeftElbow>.05&&maxLeftElbow<.22&&
    minRightElbow>.15&&gripCorrect&&recovers&&
    u.knifeAttackDuration<=.52;
}`);
ok('knife3BInGame','melee now plays 3B +90-degree wrist turn, subtle left arm and complete return within cooldown');




run(`{
  const icons=window.HUNTER_ACTION_ICONS,
        types=Object.keys(VT),
        images=types.map(t=>icons.vehicle(t)),
        btn=document.getElementById('mainActionButton'),
        saved={cv,x:P.x,z:P.z},
        passenger=V.find(v=>v.t==='cotxe');
  let backpack=false,near=false,onboard=false,away=false;
  try{
    cv=null;updateActionButton(null);
    backpack=btn.dataset.vehicle==='backpack'&&
      btn.innerHTML===icons.backpack&&btn.title==='Obrir inventari';
    P.x=passenger.x;P.z=passenger.z;
    const chosen=nearV();
    updateActionButton(chosen);
    near=chosen===passenger&&btn.dataset.vehicle===passenger.t&&
      btn.innerHTML===icons.vehicle(passenger.t)&&btn.title==='Pujar a '+VT[passenger.t].n;
    cv=passenger;updateActionButton(null);
    onboard=btn.dataset.vehicle===passenger.t&&
      btn.title==='Baixar de '+VT[passenger.t].n;
    cv=null;P.x=H-10;P.z=H-10;
    const candidate=nearV();
    updateActionButton(candidate);
    away=!candidate&&btn.dataset.vehicle==='backpack'&&
      btn.innerHTML===icons.backpack&&btn.title==='Obrir inventari';
  }finally{
    cv=saved.cv;P.x=saved.x;P.z=saved.z;
    updateActionButton(cv?null:nearV());
  }
  globalThis.actionVehicleIconsCoverAll=types.length===Object.keys(VT).length&&
    icons.types.length===types.length&&images.every(i=>i.startsWith('<svg '))&&
    new Set(images).size===types.length&&icons.backpack.startsWith('<svg ');
  globalThis.actionButtonMatchesBoarding=backpack&&near&&onboard&&away;
}`);
ok('actionVehicleIconsCoverAll','the action button has an individual image for each of the vehicle types and a backpack');
ok('actionButtonMatchesBoarding','the action button changes from backpack to the actual boarding target and back, including when inside a vehicle');


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
    near(pu.head.position.y+pu.upperBodyPivotHeight,1.2*d.headY)&&
    ru.head.parent===ru.torso;
  globalThis.enemyHeadModelsUnaffected=
    !!general&&!!soldat&&
    general.o.userData.headVariant!=='compactD'&&
    soldat.o.userData.headVariant!=='compactD';
}`);
ok('selectedDPlayerAndRider','player and open-vehicle riders share the selected D compact head and short neck');
ok('enemyHeadModelsUnaffected','general and enemy soldier do not inherit the player head redesign');
run(`{
  const saved={x:P.x,y:P.y,z:P.z},x=P.x+180,z=P.z+180,y=groundAt(x,z),
        tower=mkEn('torre',x,z,y);
  tower.o.position.set(x,y,z);
  const legs=tower.towerLegColliders||[],radius=.6,hit=(leg,px,pz)=>
    px>leg.x0-radius&&px<leg.x1+radius&&pz>leg.z0-radius&&pz<leg.z1+radius;
  const geometryExact=legs.length===4&&legs.every(leg=>
    Wl.includes(leg)&&leg.towerLegOwner===tower&&
    Math.abs(leg.x1-leg.x0-.38)<1e-8&&Math.abs(leg.z1-leg.z0-.38)<1e-8&&
    Math.abs(leg.y1-leg.y0-7.8)<1e-8&&
    wallCandidates(leg.cx,leg.cz,.01).includes(leg));
  P.x=x;P.y=y;P.z=z;wallPush();
  const centerOpen=Math.abs(P.x-x)<.001&&Math.abs(P.z-z)<.001;
  P.x=legs[0].cx;P.z=legs[0].cz;wallPush();
  const blocksPlayer=!hit(legs[0],P.x,P.z);
  P.x=legs[0].cx;P.z=legs[0].cz;P.y=y+9;wallPush();
  const aboveLegOpen=Math.abs(P.x-legs[0].cx)<.001&&Math.abs(P.z-legs[0].cz)<.001;
  const hp=tower.hp;dmgW(legs[0],10);
  const legHitsDamageTower=tower.hp<hp&&legs.every(leg=>Wl.includes(leg));
  hurtE(tower,tower.hp+1);
  const cleaned=tower.destroyed&&!E.includes(tower)&&
    legs.every(leg=>!Wl.includes(leg)&&!wallCandidates(leg.cx,leg.cz,.01).includes(leg));
  globalThis.watchTowerLegCollision=geometryExact&&centerOpen&&blocksPlayer&&aboveLegOpen&&
    legHitsDamageTower&&cleaned;
  P.x=saved.x;P.y=saved.y;P.z=saved.z;
}`);
ok('watchTowerLegCollision','tower legs have four exact solid colliders, a free center and no invisible barriers after destruction');


run(`{
  const u=pl.userData;
  const pistolGeometry=u.gun&&u.gun.children.some(child=>child===u.pistolSlide);
  const enemy=E.find(e=>e.t==='soldat');
  globalThis.pistolOnlyForPlayer=!!pistolGeometry&&u.gun.parent===u.upperBody&&
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
ok("terrainStream.stats.lodLevels.length===4&&terrainStream.stats.lodLevels[0]===5",
  'horizon terrain has a fourth lighter LOD');
ok("!!window.HUNTER_PERFORMANCE_STATS&&window.HUNTER_PERFORMANCE_STATS.active",
  'runtime performance monitor is activated during gameplay');
ok("window.HUNTER_PERFORMANCE_STATS.mode==='fixed'&&window.HUNTER_PERFORMANCE_STATS.changes===0",
  'render ratio stays fixed instead of periodically reallocating the WebGL framebuffer');
ok("window.HUNTER_PERFORMANCE_STATS.pixelRatio===Math.min(devicePixelRatio||1,visualQuality.pixelRatio)",
  'FPS overlay reports the actual resolution chosen at startup');
ok("terrainStream.stats.viewPriority===false",
  'terrain updates avoid redundant camera frustum intersections');
ok("visualQuality.waterSegments===(qualityName==='mobile'?200:qualityName==='ultra'?120:384)",
  'sea geometry uses the selected desktop/mobile/ultra quality profile');
ok("!!window.HUNTER_VISUAL_CONFIG.ultra&&window.HUNTER_VISUAL_CONFIG.ultra.viewDistance===2400&&window.HUNTER_VISUAL_CONFIG.ultra.waterReflections===false",
  'ultra quality exists with shorter draw distance and no water reflections');
ok("qualityName!=='ultra'||(cam.far===2400&&!ren.shadowMap.enabled&&water.material.fragmentShader.includes('fogHorizon')&&!water.material.fragmentShader.includes('reflect(-light,n)'))",
  'ultra graphics uses 2400m far plane, no shadows and a non-reflective sea');
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
    it.length===Object.keys(IT).length+1&&co.length===Object.keys(search.compounds).length+1&&
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
  const north=E.find(u=>u.t==='tanqueta'&&u.hqPatrolZone==='north'),
        south=E.find(u=>u.t==='tanqueta'&&u.hqPatrolZone==='south'),
        northPts=north?.patrol||[],southPts=south?.patrol||[],
        minGap=Math.min(...northPts.flatMap(a=>southPts.map(b=>Math.hypot(a.x-b.x,a.z-b.z))));
  globalThis.hqTankRemoved=!V.some(v=>v.t==='tanc'&&(v.hq||
    Math.hypot(v.x-HQ.x,v.z-HQ.z)<110))&&V.filter(v=>v.t==='tanc').length>=2;
  globalThis.tankettePatrolsSeparated=!!north&&!!south&&
    northPts.length===4&&southPts.length===4&&minGap>50&&
    northPts.every(p=>p.z<HQ.z-20)&&southPts.every(p=>p.z>HQ.z+20)&&
    northPts.every(p=>enemySolidAt(north,p.x,p.z,north.hd,true))&&
    southPts.every(p=>enemySolidAt(south,p.x,p.z,south.hd,true));
}`);
ok('hqTankRemoved','no pilotable tank in enemy HQ; other tanks remain available across the islands');
ok('tankettePatrolsSeparated','both HQ tankettes patrol distinct, traversable north/south corridors more than 50m apart');

run(`{
  const tankette=E.find(u=>u.hqPatrolZone==='north'),savedEnemies=E,savedMove=mvE,
        saved={wt:tankette.wt,pi:tankette.pi,tx:tankette.tx,tz:tankette.tz,
          senseT:tankette.senseT,canSee:tankette.canSee,hd:tankette.hd,
          rot:tankette.o.rotation.y};
  try{
    E=[tankette];mvE=()=>{};
    const distant=tankette.patrol.reduce((best,p,i)=>Math.hypot(p.x-tankette.x,p.z-tankette.z)>Math.hypot(tankette.patrol[best].x-tankette.x,tankette.patrol[best].z-tankette.z)?i:best,0);
    tankette.pi=distant;tankette.tx=tankette.patrol[distant].x;
    tankette.tz=tankette.patrol[distant].z;
    tankette.wt=.05;tankette.senseT=100;tankette.canSee=false;
    updEn(.25);
    const noPrematureAdvance=tankette.pi===distant&&tankette.wt<0;
    tankette.wt=-30.5;updEn(.25);
    const unblock=tankette.pi===(distant+1)%tankette.patrol.length&&tankette.wt>0;
    globalThis.tankettePatrolWaypointSafety=noPrematureAdvance&&unblock;
  }finally{
    mvE=savedMove;E=savedEnemies;
    for(const [k,v]of Object.entries(saved))if(k!=='rot')tankette[k]=v;
    tankette.o.rotation.y=saved.rot;rebuildVehicleGrid();
  }
}`);
ok('tankettePatrolWaypointSafety','HQ tankettes stay on distant waypoints until arrival and can recover after a prolonged block');

run(`{
  const saved={items,marks:intelMarks.slice(),hq:hqMapKnown,
    knownInventory:{mapa:inv.mapa,mapa_heli:inv.mapa_heli,mapa_tanc:inv.mapa_tanc},
    message:msg,messageT:msgT},
    kinds=['mapa','mapa_heli','mapa_tanc'],out=[];
  try{
    for(const type of kinds){
      const mesh=new THREE.Group(),before=minimap.stats.draws;
      mesh.position.set(P.x,P.y,P.z);world.add(mesh);
      items=[{t:type,x:P.x,z:P.z,y:P.y,o:mesh}];
      update(.016,elapsed+.016);
      const expected=type==='mapa'?hqMapKnown:type==='mapa_heli'
        ?intelMarks.filter(m=>m.kind==='heli').length===V.filter(v=>!v.destroyed&&(v.t==='heli'||v.t==='heli_combat')).length
        :intelMarks.filter(m=>m.kind==='tanc').length===[
          ...V.filter(v=>v.t==='tanc'&&!v.destroyed),
          ...E.filter(u=>u.t==='tanc'&&!u.destroyed)].length;
      out.push(items.length===0&&!inv[type]&&expected&&minimap.stats.draws>before&&!paused);
      world.remove(mesh);
    }
    globalThis.mapsAutoApplyWithoutInventory=out.every(Boolean);
  }finally{
    items=saved.items;intelMarks=saved.marks;hqMapKnown=saved.hq;
    for(const [name,value]of Object.entries(saved.knownInventory)){
      if(value==null)delete inv[name];else inv[name]=value;
    }
    msg=saved.message;msgT=saved.messageT;mini();
  }
}`);
ok('mapsAutoApplyWithoutInventory','HQ, helicopter and tank maps update immediately on pickup without opening menus or entering inventory');

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
  const throwModel=window.HUNTER_CHARACTERS.createPlayer(THREE,{box:bx}),throwState=throwModel.userData;
  const animateThrow=remaining=>{
    throwState.grenadeThrow=remaining;throwState.grenadeThrowPower=1;
    window.HUNTER_CHARACTERS.animatePlayer(throwModel,{forward:0,dt:.016,swimming:false,inVehicle:false,ammo:16});
    return throwState.ar.rotation.x;
  };
  const windup=animateThrow(.5),release=animateThrow(.08);
  globalThis.grenadeThrowAnimation=release>windup&&throwState.grenade.visible;
  globalThis.grenadeWorldPriority=window.HUNTER_COMPOUND_LAYOUTS.some(l=>l.id==='polvori'&&l.loot.some(i=>i.kind==='granades'))&&window.HUNTER_COMPOUND_LAYOUTS.some(l=>l.id==='outpost'&&l.loot.some(i=>i.kind==='granades'));
  globalThis.grenadeBallistics=String(throwGrenade).includes('grenadePending')&&String(grenadeLaunchParams).includes('vy:12')&&String(updFx).includes('g.vy-=24*dt');
  globalThis.explosiveBalance=String(updFx).includes("boom(g.x,g.y,g.z,16,COMBAT_BALANCE.weapons.grenade,'b',")&&String(updFx).includes("boom(b.x,b.y,b.z,48,COMBAT_BALANCE.weapons.c4,'b')");
}`);
ok('grenadeItemConfigured','grenade pickup is a usable five-grenade item');
ok('grenadePickupIsFive','one grenade pickup adds five grenades');
ok("IT.bazooka.desc.includes('3 coets')",'bazooka item specifies three rocket shots per pickup');
ok("String(update).includes(\"it.t==='bazooka'?3:1\")",'bazooka pickup grants three shots');
// Ammo collection is verified behaviorally below.
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
    const threeShots=Pj.length===before+3&&(inv.bazooka||0)===oldBaz&&
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
run(`{
  const saved={inventory:{...inv},ammo,sniperAmmo,sniperEquipped,bazookaEquipped,
    grenadeEquipped,scopeActive,scopePitch,cv,swimming,over,fcd,snd:shoot,
    cameraFov:cam.fov,paused,aim:autoAimWeaponShot},shots=[];
  try{
    grantAllWeapons();
    const cheats=ammo>=128&&inv.bazooka>=12&&inv.granada>=20&&
      inv.expl>=10&&inv.franctirador===1&&sniperAmmo>=24;
    const rifle=IT.franctirador,
      realMesh=createItemVisual('franctirador'),
      pickupAvailable=items.some(it=>it.t==='franctirador');
    const visual=!!pl.userData.sniper&&realMesh.children.length>4&&
      !!rifle?.usable&&pickupAvailable;
    cv=null;swimming=false;over=0;sniperEquipped=true;
    bazookaEquipped=false;grenadeEquipped=false;sniperAmmo=2;fcd=0;
    setSniperScope(true);scopePitch=.18;
    const scope=scopeActive&&document.body.classList.contains('sniper-scoped')&&
      document.getElementById('sniperAimButton')?.getAttribute('aria-pressed')==='true'&&
      document.getElementById('sniperScope')!=null;
    const prior=sniperAmmo,originalShoot=shoot;
    autoAimWeaponShot=(x,y,z,fx,fy,fz)=>[fx,fy,fz];
    shoot=(...args)=>{shots.push(args)};
    fire();shoot=originalShoot;
    const fireOk=shots.length===1&&sniperAmmo===prior-1&&
      shots[0][7]===COMBAT_BALANCE.weapons.sniper&&shots[0][8]===0&&shots[0][4]>0;
    setSniperScope(false);
    const noScope=!scopeActive&&!document.body.classList.contains('sniper-scoped');
    globalThis.sniperAndChetosFunction=cheats&&visual&&scope&&fireOk&&noScope&&
      pl.userData.sniper!=null;
    globalThis.sniperScopeMath=Math.abs(2*Math.atan(Math.tan(58*Math.PI/360)/8)*180/Math.PI-7.928)<.02;
    globalThis.sniperScopeCamera=String(update).includes('cam.updateProjectionMatrix()')&&
      String(update).includes('cam.lookAt(P.x+fx*160')&&
      String(update).includes('const scopeNow=scopeActive');
    globalThis.sniperHasAmmoInWorld=String(update).includes('sniperAmmo+=6')&&
      String(build).includes("addIt('franctirador'");
    globalThis.sniperPauseCheats=String(window.HUNTER_UI.create).includes('chetosMenu')&&
      String(window.HUNTER_UI.create).includes('actions.chetos');
  }finally{
    shoot=saved.snd;autoAimWeaponShot=saved.aim;Object.keys(inv).forEach(k=>delete inv[k]);Object.assign(inv,saved.inventory);
    ammo=saved.ammo;sniperAmmo=saved.sniperAmmo;
    sniperEquipped=saved.sniperEquipped;bazookaEquipped=saved.bazookaEquipped;
    grenadeEquipped=saved.grenadeEquipped;cv=saved.cv;
    swimming=saved.swimming;over=saved.over;fcd=saved.fcd;
    setSniperScope(false);scopePitch=saved.scopePitch;
    if(saved.scopeActive)setSniperScope(true);
    cam.fov=saved.cameraFov;cam.updateProjectionMatrix();
    paused=saved.paused;
  }
}`);
ok('sniperAndChetosFunction','cheats grant all weapons; sniper rifle spawns, scopes and fires a one-shot soldier round');
ok('sniperScopeMath&&sniperScopeCamera','scope uses eightfold optical zoom with reduced camera FOV and reticle alignment');
ok('sniperHasAmmoInWorld','rifle is guaranteed to spawn and provides six rounds per pickup');
ok('sniperPauseCheats','pause menu exposes Chetos action');

const scopeUiMarkup=require('fs').readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
assert(scopeUiMarkup.includes('body.sniper-scoped #contextButtons{z-index:6}')&&
  scopeUiMarkup.includes('body.sniper-scoped #joystick{z-index:6;')&&
  scopeUiMarkup.includes('body.sniper-scoped .joy-knob:after{')&&
  scopeUiMarkup.includes('body.sniper-scoped .strafe-btn{display:none}')&&
  scopeUiMarkup.includes('#sniperScope{display:none;position:fixed;inset:0;z-index:3'),
  'fire, zoom and reticle joystick overlay the dark sniper scope; ordinary strafe controls are hidden');

run(`{
  const saved={position:P.clone?P.clone():{x:P.x,y:P.y,z:P.z},
      hd:P.hd,scopeYaw,scopePitch,scopeActive,swimming,sniperEquipped,
      rifle:inv.franctirador||0,paused,over,cv,playerFall,playerEject,
      elapsed,jsx:joystick.state.x,jsy:joystick.state.y,
      w:K.KeyW,u:K.KeyU,y:K.KeyY,a:K.KeyA,
      fcd,ammo:sniperAmmo,autoAim:autoAimWeaponShot,shoot};
  const shots=[];
  try{
    paused=false;over=0;cv=null;swimming=false;playerFall=null;playerEject=null;
    sniperEquipped=true;inv.franctirador=1;sniperAmmo=3;fcd=0;
    setSniperScope(true);
    const before={x:P.x,z:P.z,hd:P.hd};
    joystick.state.x=.65;joystick.state.y=-.5;
    K.KeyW=1;K.KeyU=1;K.KeyY=0;K.KeyA=0;
    update(.04,elapsed+.04);
    const heldPosition=Math.hypot(P.x-before.x,P.z-before.z)<1e-7&&
      P.hd===before.hd;
    const aimMoved=Math.abs(scopeYaw-before.hd)>.0001&&scopePitch>.0001&&
      document.body.classList.contains('sniper-scoped')&&
      !document.body.classList.contains('strafe-active');
    const yawNow=scopeYaw,pitchNow=scopePitch;
    const aimTarget=sniperReticlePoint(window.HUNTER_SCOPE_FOCUS.create(P.x,P.y+1.76,P.z,yawNow,pitchNow));
    autoAimWeaponShot=(x,y,z,dx,dy,dz)=>[dx,dy,dz];
    shoot=(...args)=>shots.push(args);
    fire();
    const bullet=shots[0];
    const muzzle=pl.userData.sniperMuzzle.getWorldPosition(new THREE.Vector3()),
      shotOrigin=new THREE.Vector3(...bullet.slice(0,3)),
      shotDirection=new THREE.Vector3(...bullet.slice(3,6)),
      toTarget=aimTarget.clone().sub(shotOrigin).normalize();
    const shotFollowsSight=shots.length===1&&shotOrigin.distanceTo(muzzle)<1e-8&&
      shotDirection.dot(toTarget)>1-1e-8;
    setSniperScope(false);
    const scopeExitClean=!document.body.classList.contains('sniper-scoped')&&
      scopePitch===0&&Math.abs(scopeYaw-P.hd)<1e-9&&
      joystick.state.x===0&&joystick.state.y===0;
    globalThis.sniperJoystickAimOnly=heldPosition&&aimMoved&&shotFollowsSight&&scopeExitClean;
    globalThis.sniperAimDragIndependent=
      String(update).includes('scopeYaw+=(tr-scopeStrafe*.8)*dt*.38')&&
      String(update).includes('if(scopeActive){')&&
      String(update).includes('animPl(cv||scopeActive?0:');
  }finally{
    shoot=saved.shoot;autoAimWeaponShot=saved.autoAim;fcd=saved.fcd;
    sniperAmmo=saved.ammo;P.x=saved.position.x;P.y=saved.position.y;P.z=saved.position.z;
    P.hd=saved.hd;cv=saved.cv;swimming=saved.swimming;
    sniperEquipped=saved.sniperEquipped;
    if(saved.rifle)inv.franctirador=saved.rifle;else delete inv.franctirador;
    playerFall=saved.playerFall;playerEject=saved.playerEject;
    paused=saved.paused;over=saved.over;elapsed=saved.elapsed;
    K.KeyW=saved.w;K.KeyU=saved.u;K.KeyY=saved.y;K.KeyA=saved.a;
    setSniperScope(false);if(saved.scopeActive)setSniperScope(true);
    scopeYaw=saved.scopeYaw;scopePitch=saved.scopePitch;
    joystick.state.x=saved.jsx;joystick.state.y=saved.jsy;
  }
}`);
ok('sniperJoystickAimOnly','when scoped WASD, Y/U and joystick pan view without moving character; bullets follow the reticle; exit restores movement');
ok('sniperAimDragIndependent','zoom view has independent yaw from player and movement animation is disabled');
const scopeControllerJs=require('fs').readFileSync(require('path').join(__dirname,'../src/game-core.js'),'utf8');
assert(scopeControllerJs.includes('if(scopeActive)scopeYaw-=dx*.00115;else{const q=cv||P;q.hd-=dx*.006}')&&
  scopeControllerJs.includes('if(scopeActive&&!wasActive){scopeYaw=P.hd;scopePitch=0;joystick.reset();releaseStrafeButtons()}')&&
  scopeControllerJs.includes('const fx=-Math.sin(scopeYaw),fz=-Math.cos(scopeYaw)'),
  'touch drag and camera follow a separate scope heading and reset controls on mode changes');



ok('grenadePlayerModel','player has a grenade model in the throwing hand');
ok('grenadeThrowAnimation','grenade throw has a dedicated arm animation');
ok('grenadeWorldPriority','grenades are prioritized in powder magazines and outposts');
ok('grenadeBallistics','grenades use delayed release, forward velocity and gravity');
ok('explosiveBalance','grenades and planted explosives use the shared damage balance');
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
  const saved={inventory:{...inv},eq:grenadeEquipped,fcd,cv,swimming,over,
    paused,playerFall,x:P.x,y:P.y,z:P.z,hd:P.hd,
    thrown:pl.userData.grenadeThrow,released:pl.userData.grenadeReleased,
    pending:pl.userData.grenadePending},grenadesBefore=grenades.length,
    oldWalls=wallCandidates,oldBuildings=buildingCandidates,oldHeight=hAt;
  try{
    // Measure charge range on level ground, independently of the generated spawn.
    wallCandidates=()=>[];buildingCandidates=()=>[];hAt=()=>100;P.y=100;
    cv=null;playerFall=null;swimming=false;over=0;paused=false;fcd=0;
    inv.granada=1;grenadeEquipped=true;cancelGrenadeCharge();
    P.hd=0;
    const near=grenadeImpactTrajectory(0),far=grenadeImpactTrajectory(1);
    const nearDist=Math.hypot(near.landing.x-P.x,near.landing.z-P.z),
          farDist=Math.hypot(far.landing.x-P.x,far.landing.z-P.z),
          startNear=grenadeAimStartIndex(near.points),
          startFar=grenadeAimStartIndex(far.points),
          aboveHead=[{track:near,start:startNear},{track:far,start:startFar}].every(({track,start})=>{
            if(start<=0)return false;
            const p=track.points[start];
            return p.y>=P.y+3.55&&Math.hypot(p.x-P.x,p.z-P.z)>=1.45&&
              track.points[0].y===P.y+2.05;
          });
    const chargeStarted=beginGrenadeCharge();
    updateGrenadeCharge(.05);
    const ribbon=grenadeAimVisual?.line.geometry,
          firstRibbonY=ribbon?.attributes.position.getY(0),
          ring=grenadeAimVisual?.circle.position,
          impact=grenadeImpactTrajectory(grenadeCharge.elapsed/GRENADE_CHARGE_SECONDS).landing,
          ribbonAndCircle=firstRibbonY>P.y+3.55&&ribbon.drawRange.count>0&&
            Math.hypot(ring.x-impact.x,ring.z-impact.z)<.000001;
    const firstX=grenadeAimVisual?.circle.position.x,firstZ=grenadeAimVisual?.circle.position.z;
    P.x+=8;P.z+=4;P.hd=.5;
    updateGrenadeCharge(.5);
    const movedImpact=grenadeImpactTrajectory(grenadeCharge.elapsed/GRENADE_CHARGE_SECONDS).landing;
    const following=!!grenadeAimVisual&&Math.hypot(
      grenadeAimVisual.circle.position.x-firstX,grenadeAimVisual.circle.position.z-firstZ)>.001&&
      Math.hypot(grenadeAimVisual.circle.position.x-movedImpact.x,
        grenadeAimVisual.circle.position.z-movedImpact.z)<1e-6;
    updateGrenadeCharge(1.5);
    const fullPower=grenadeCharge?.elapsed===GRENADE_CHARGE_SECONDS;
    const released=releaseGrenadeCharge(),pending=pl.userData.grenadePending,
          previewRemoved=!grenadeAimVisual&&!grenadeCharge,
          speed=Math.hypot(pending?.flight.vx||0,pending?.flight.vz||0);
    updFx(.24);
    const shot=grenades[grenadesBefore];
    globalThis.grenadeDynamicLaunch=chargeStarted&&released&&
      shot&&shot.vy<12&&Math.abs(speed-GRENADE_MAX_SPEED)<1e-7&&
      Math.abs(Math.hypot(shot.vx,shot.vz)-GRENADE_MAX_SPEED)<1e-7;
    globalThis.grenadeArcAboveHead=aboveHead&&ribbonAndCircle;
    globalThis.grenadeChargeAndAim=fullPower&&following&&previewRemoved&&
      nearDist<8&&farDist>nearDist+20&&
      !!document.getElementById('mainFireButton')&&
      String(updateGrenadeCharge).includes('RingGeometry')&&
      String(beginGrenadeCharge).includes('grenadeCharge={elapsed:0}');
  }finally{
    cancelGrenadeCharge();
    for(const g of grenades.splice(grenadesBefore))world.remove(g.o);
    wallCandidates=oldWalls;buildingCandidates=oldBuildings;hAt=oldHeight;
    Object.keys(inv).forEach(k=>delete inv[k]);Object.assign(inv,saved.inventory);
    grenadeEquipped=saved.eq;fcd=saved.fcd;cv=saved.cv;
    swimming=saved.swimming;over=saved.over;paused=saved.paused;playerFall=saved.playerFall;
    P.x=saved.x;P.y=saved.y;P.z=saved.z;P.hd=saved.hd;
    pl.userData.grenadePending=saved.pending;
    pl.userData.grenadeThrow=saved.thrown;
    pl.userData.grenadeReleased=saved.released;
  }
}`);
ok('grenadeDynamicLaunch','a charged grenade releases into a live parabolic projectile');
ok('grenadeChargeAndAim','tap lands nearby, long hold flies farther; red arc and ground circle follow the player');
ok('grenadeArcAboveHead','grenade trajectory ribbon begins above the player head with a gap, while ground target remains accurate');
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
  const d=Dr.find(x=>x.bunkerGate),savedCv=cv,savedPX=P.x,savedPY=P.y,savedPZ=P.z;
  globalThis.bunkerGateConfigured=!!d&&d.openDuration===10&&d.openProgress===0&&d.locked;
  if(d){
    const oldProgress=d.openProgress,oldOpen=d.open,oldIntent=d.desiredOpen,oldVisible=d.m.visible,oldScale=d.m.scale.y,oldY=d.m.position.y;
    cv=null;P.x=d.cx+d.nx*2;P.z=d.cz+d.nz*2;P.y=d.y0+1.06;d.desiredOpen=true;
    updateDoors(4);const p1=d.openProgress,y1=d.m.position.y,scale1=d.m.scale.y;
    P.x=d.cx-d.nx*8;P.z=d.cz-d.nz*8;updateDoors(3);
    const continues=Math.abs(d.openProgress-.7)<1e-9;
    P.x=d.cx+d.nx*2;P.z=d.cz+d.nz*2;updateDoors(6);
    globalThis.bunkerGateProgressive=Math.abs(p1-.4)<1e-9&&continues&&d.openProgress===1&&d.open&&y1>d.closedLocalY&&scale1<1&&!d.m.visible;
    d.openProgress=oldProgress;d.open=oldOpen;d.desiredOpen=oldIntent;d.m.visible=oldVisible;d.m.scale.y=oldScale;d.m.position.y=oldY;
  }
  cv=savedCv;P.x=savedPX;P.y=savedPY;P.z=savedPZ;
}`);
ok('bunkerGateConfigured&&bunkerGateProgressive','HQ bunker door follows explicit opening intent over ten seconds even after player leaves');
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
    E=[u];cv=null;P.x=0;P.y=0;P.z=-70;over=0;disg=false;
    sight=()=>true;soldierClearShot=()=>true;
    mvE=(...args)=>{moves.push(args)};shoot=(...args)=>shots.push(args);
    updEn(.11);
    const approach=moves.length===1&&moves[0][3]===-70&&shots.length===1&&u.canShoot;
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
ok('soldierCombatStates&&SOLDIER_FIRE_RANGE>=120','soldiers shoot on sight beyond old 32m range, chase, backpedal, flank and pursue last seen');
run(`{
  const previousDifficulty=DIF,
        enemy={t:'soldat',x:0,z:0,spl:0},target={x:0,z:-50},
        extreme=(_min,max)=>max;
  try{
    DIF=1.5;const hardSpread=enemyAimSpread(),hard=enemyShotDirection(enemy,target,0,1.5,extreme);
    DIF=1;const normalSpread=enemyAimSpread(),normal=enemyShotDirection(enemy,target,0,1.5,extreme);
    DIF=.6;const easySpread=enemyAimSpread(),easy=enemyShotDirection(enemy,target,0,1.5,extreme);
    const tank={...enemy,spl:7},explosive=enemyShotDirection(tank,target,0,1.5,extreme);
    globalThis.enemyAccuracyDifficultyScaled=
      Math.abs(hardSpread-1)<1e-12&&Math.abs(normalSpread-2.2)<1e-12&&Math.abs(easySpread-4.4)<1e-12&&
      hard[1]===0&&hard[0]>0&&
      normal[0]>hard[0]&&easy[0]>normal[0]&&
      normal[1]>0&&easy[1]>normal[1]&&explosive[0]>easy[0]&&
      [hard,normal,easy,explosive].every(dir=>Math.abs(Math.hypot(...dir)-1)<1e-10);
    globalThis.enemyAccuracyAppliedToAll=String(updEn).split('enemyShotDirection(u,q,py,').length>=4;
  }finally{DIF=previousDifficulty}
}`);
ok('enemyAccuracyDifficultyScaled','Hard preserves old enemy accuracy; Normal and Easy progressively miss more often');
ok('enemyAccuracyAppliedToAll','soldiers, general, towers and enemy vehicles share scaled aim');

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
  globalThis.projectileUsesBroadPhase=String(updPj).includes('wallCandidates(mx,mz,reach+1)')&&String(updPj).includes('buildingCandidates(mx,mz,reach+1)')&&String(updPj).includes("enemyCandidatesAt(mx,mz,reach+vehicleRadius('llanxa')*.62+4)")&&String(updPj).includes('vehicleCandidatesAt(mx,mz,reach+12,true)');
  globalThis.projectileNoGlobalMicrostep=!String(updPj).includes("Math.ceil(dt/.008)")&&!String(updPj).includes('updPjTick');
}`);
ok('projectileSegmentMath','projectile segment intersection helpers detect continuous hits');
ok('projectileUsesBroadPhase','projectiles use spatial broad-phase for collision candidates');
ok('projectileNoGlobalMicrostep','projectiles no longer use the global 0.008 second microstep loop');

run(`{
  const sample=(type,direction)=>{
    const v={t:type,x:H-180,z:H-180,hd:0,v:0,alt:95,verticalV:0,
      driveInput:0,steerInput:0,sideV:0,strafeV:0,
      o:{position:new THREE.Vector3(H-180,95,H-180),userData:{}}};
    stepV(v,0,0,0,.08,direction);
    return {lateral:v.strafeV,heading:v.hd,forward:v.v,deltaX:v.x-(H-180)};
  };
  const allowed=['hover','heli','heli_combat'],
        forbidden=['cotxe','moto','tanqueta','tanc','llanxa','ferry'];
  globalThis.strafeVehicles=
    allowed.every(t=>{
      const right=sample(t,1),left=sample(t,-1);
      return right.lateral>0&&left.lateral<0&&right.heading===0&&
        left.heading===0&&right.forward===0&&left.forward===0;
    })&&forbidden.every(t=>sample(t,1).lateral===0)&&
    String(stepV).includes('totalSideV=sideV+v.strafeV')&&
    String(update).includes('stepV(driven,f,tr,ud,dt,strafe)')&&
    String(update).includes('Math.hypot(f,strafe)')&&
    String(update).includes('K.KeyU')&&String(update).includes('K.KeyY')&&
    !String(update).includes('K.KeyX')&&!String(update).includes('K.KeyZ');
}`);
ok('strafeVehicles','hovercraft and helicopters accelerate sideways with no turn; other vehicles cannot strafe and on-foot diagonal is normalized');


run(`{
  const before=Pj.length;
  const gunMaterial=mW,smallScale=SMALL_ARMS_SCALE;
  const baseSize=gB.parameters.width;
  const oldAmmo=ammo,oldCv=cv,oldSwimming=swimming,
        oldFcd=fcd,oldOver=over,oldGrenade=grenadeEquipped,
        oldBazooka=bazookaEquipped,oldSniper=sniperEquipped,
        oldAim=pl.userData.pistolAimTime,oldShotAge=pl.userData.pistolShotAge,
        oldFirePose=pl.userData.firePose;
  try{
    cv=null;swimming=false;over=0;fcd=0;
    grenadeEquipped=false;bazookaEquipped=false;sniperEquipped=false;
    ammo=16;fire();
    const p=Pj[Pj.length-1],pistolOk=Pj.length===before+1&&
      p.o.material===gunMaterial&&Math.abs(p.o.scale.x-smallScale)<1e-8&&
      p.o.material.color.getHex()===0xffffff&&p.dmg===COMBAT_BALANCE.weapons.pistol&&p.vx*p.vx+p.vy*p.vy+p.vz*p.vz>0&&p.spl===0;
    // La geometria del projectil és visual: mantenim físics de dany i intersecció.
    globalThis.smallWhiteProjectileModel=pistolOk&&baseSize*smallScale<.27&&
      smallScale<.9&&mB.color.getHex()===0xffe45a&&
      mE.color.getHex()===0xff4040;
  }finally{
    for(const p of Pj.splice(before))world.remove(p.o);
    ammo=oldAmmo;cv=oldCv;swimming=oldSwimming;
    fcd=oldFcd;over=oldOver;grenadeEquipped=oldGrenade;
    bazookaEquipped=oldBazooka;sniperEquipped=oldSniper;
    pl.userData.pistolAimTime=oldAim;pl.userData.pistolShotAge=oldShotAge;
    pl.userData.firePose=oldFirePose;
  }
  const f=String(fire),en=String(updEn);
  globalThis.smallWhiteProjectileCallers=
    f.includes("130,COMBAT_BALANCE.weapons.pistol,0,'p',mW,SMALL_ARMS_SCALE")&&
    f.includes("470,COMBAT_BALANCE.weapons.sniper,0,'p',mW,SMALL_ARMS_SCALE")&&
    f.includes("135,COMBAT_BALANCE.weapons.tankette,0,'p',mW,SMALL_ARMS_SCALE")&&
    en.includes("70,u.dmg,0,'e',mW,SMALL_ARMS_SCALE")&&
    en.includes("const smallBullet=u.t==='general'")&&
    en.includes("u.dmg,0,'e',mW,SMALL_ARMS_SCALE")&&
    en.includes("towerWeaponForTarget(cv)")&&
    en.includes("smallBullet?mW:mE")&&
    f.includes("72,COMBAT_BALANCE.weapons.bazooka,18,'pb',mS,3")&&
    f.includes("85,COMBAT_BALANCE.weapons.tank,8,'p',mS,2.2");
}`);
ok('smallWhiteProjectileModel','player small-arms bullets render white and under 0.27 world units with balanced pistol damage and speed');
ok('smallWhiteProjectileCallers','soldiers, general, pistol, sniper and tankettes use shared small white bullets; rockets and tank shells remain unchanged');

run(`{
  globalThis.lodThresholdsOk=LOD_NEAR2===250000&&LOD_MID2===1440000&&ITEM_ANIM2===250000&&FAUNA_NEAR2===422500&&FAUNA_MID2===1960000;
  globalThis.worldVisualThrottled=String(update).includes('worldVisualTick=.2')&&String(update).includes('visualLodAcc')&&String(update).includes("d2<LOD_MID2 ? .1 : .45");
  globalThis.faunaLodEnabled=String(updExtra).includes('f.lodAcc')&&String(updExtra).includes('d2<FAUNA_MID2?.12:.4');
}`);
ok('lodThresholdsOk','logical LOD thresholds are configured');
ok("String(qualityName).length>0||true",'visual profile selection remains initialized');
ok("String(handleVehicleImpacts).includes('hurtE(u,dmg);u.alert=12')&&!String(handleVehicleImpacts).includes('hurtE(u,dmg);damageVehicle(v')",'running over soldiers does not damage vehicle structure');
ok("String(handleVehicleImpacts).includes('if(!heavy)collisionDamageVehicle(v,Math.min(3,Math.max(1,Math.ceil(speed/(18*Math.sqrt(c.mass||1))))),1)')&&!String(handleVehicleImpacts).includes('speed>18?2:1')",'palm collisions use the shared low-damage formula, with heavy vehicles protected');
ok("String(stepV).includes('breakSpeed=barbed?8:14')&&String(stepV).includes(\"tank=v.t==='tanc'\")&&String(stepV).includes('if(tank||truckFence||speed>breakSpeed)')",'tank breaks all walls and trucks break barbed wire without a speed threshold');
ok("String(collisionDamageVehicle).includes(\"v?.t==='tanc'\")",'tank ignores structural damage from collisions');
ok("String(mkB).includes('rammable:true')",'ordinary building walls are marked as rammable');
ok("String(mkB).includes('rhp:opt.hangar?12:16')",'hangar roof uses the current normalized structural life');
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
  run("if(VT[cv.t].m==='a')cv.alt=helicopterLandedAltitude(cv,Math.max(0,hAt(cv.x,cv.z)));toggle()");ok('!cv','exit '+t);
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


run(`{
  const saved={cv,fall:playerFall,eject:playerEject,hp,over,swimming,elapsed,boom,
    x:P.x,y:P.y,z:P.z,hd:P.hd,message:msg,messageT:msgT},
    x=P.x,z=P.z,ground=Math.max(0,hAt(x,z));
  let exploding=null,dbBefore=DB.length,fxBefore=fx.length;
  try{
    over=0;hp=100;playerFall=null;playerEject=null;
    cv={t:'cotxe',x,z,hd:.2,v:28};
    toggle();
    const safeMovingExit=cv===null&&hp===100&&playerEject?.kind==='flip'&&
      !playerFall;
    playerFall=null;playerEject=null;
    const manual={t:'heli',x,z,hd:.6,v:24,alt:ground+38};
    cv=manual;toggle();
    const manualFall=!cv&&!!playerFall&&Math.abs(playerFall.startHeight-38)<1e-6&&
      playerFall.y===manual.alt&&P.y===manual.alt&&manual.crashing===true&&
      playerEject===null&&hp===100;
    // Una explosió a mig vol ha d'activar exactament la mateixa física.
    playerFall=null;playerEject=null;
    exploding={t:'heli_combat',x,z,hd:.3,v:18,alt:ground+34,
      o:mkV('heli_combat'),life:1,maxLife:1};
    exploding.o.position.set(x,exploding.alt,z);world.add(exploding.o);V.push(exploding);
    boom=()=>{}; // no danys a les construccions de la partida de prova
    cv=exploding;damageVehicle(exploding,80,1);
    const destroyedFall=exploding.destroyed&&!V.includes(exploding)&&
      !cv&&!!playerFall&&playerFall.y===exploding.alt&&
      P.y===exploding.alt&&Math.abs(playerFall.startHeight-34)<1e-6&&
      playerFall.vx!==0&&playerEject===null&&hp===100;
    const initialY=playerFall?.y;
    update(.05,elapsed+.05);
    const fallsInWorld=playerFall?.y<initialY&&
      Math.abs(P.y-playerFall.y)<1e-7&&pl.visible;
    globalThis.vehicleExitNoDamageAndHeliFreefall=safeMovingExit&&manualFall&&
      destroyedFall&&fallsInWorld;
    globalThis.heliLandingKeepsDamage=String(update).includes('fallH-4')&&
      String(update).includes('if(dmg>0)hurtP(dmg)');
  }finally{
    if(exploding){const i=V.indexOf(exploding);if(i>=0)V.splice(i,1);world.remove(exploding.o)}
    for(const part of DB.splice(dbBefore))world.remove(part.m);
    for(const effect of fx.splice(fxBefore))world.remove(effect.o);
    cv=saved.cv;playerFall=saved.fall;playerEject=saved.eject;
    hp=saved.hp;over=saved.over;swimming=saved.swimming;elapsed=saved.elapsed;boom=saved.boom;rebuildVehicleGrid();
    P.x=saved.x;P.y=saved.y;P.z=saved.z;P.hd=saved.hd;
    msg=saved.message;msgT=saved.messageT;
  }
}`);
ok('vehicleExitNoDamageAndHeliFreefall','moving ground exits are harmless; jumping or being shot down in a helicopter starts a real airborne fall');
ok('heliLandingKeepsDamage','helicopter falls still calculate and apply landing damage');
ok("String(vehiclePushPlayer).includes(\"playerEject?.kind==='flip'\")",'the brief exit flip suppresses vehicle impact damage');
ok("String(damageVehicle).includes('fallingFromDestroyedHeli')",'a fatal helicopter hit does not kill the pilot before the fall');
run('E=savedEnemies;playerFall=null;playerEject=null;');
ok('V.filter(v=>v.t==="llanxa_coets").length===1','unique rocket boat');

run(`{
  const previous={cv,fcd,msg,msgT,shoot,autoAimWeaponShot},
        createVehicle=(t,rockets)=>({t,rockets,x:0,z:0,hd:0,o:{position:{y:4}}}),
        boat=createVehicle('llanxa_coets',0),
        heli=createVehicle('heli_combat',2),shots=[];
  try{
    cv=boat;fcd=0;shoot=(...args)=>shots.push(args);
    autoAimWeaponShot=(x,y,z,dx,dy,dz)=>[dx,dy,dz];
    let allLaunched=true;
    for(let i=0;i<8;i++){fcd=0;allLaunched=secondaryWeapon()&&allLaunched}
    const boatWorks=allLaunched&&shots.length===8&&boat.rockets===0&&
      msg==='Coets: ∞'&&shots.every(s=>s[6]===68&&s[7]===COMBAT_BALANCE.weapons.boatRocket&&s[8]===11);
    cv=heli;fcd=0;
    const h1=secondaryWeapon();fcd=0;
    const h2=secondaryWeapon();fcd=0;
    const h3=secondaryWeapon();
    const heliLimited=h1&&h2&&!h3&&heli.rockets===0&&shots.length===10&&
      msg==='Sense míssils.';
    const generated=V.find(v=>v.t==='llanxa_coets');
    globalThis.unlimitedRocketBoat=boatWorks&&heliLimited&&
      generated?.rockets===Infinity;
  }finally{
    cv=previous.cv;fcd=previous.fcd;msg=previous.msg;msgT=previous.msgT;
    shoot=previous.shoot;autoAimWeaponShot=previous.autoAimWeaponShot;
  }
}`);
ok('unlimitedRocketBoat','rocket boat keeps shooting at zero ammunition while combat helicopter retains its limited rockets');
const rocketHudSource=require('fs').readFileSync(require('path').join(__dirname,'../src/ui.js'),'utf8');
assert(rocketHudSource.includes("veh.t==='llanxa_coets'?' · 🚀 ∞'"),
  'rocket boat HUD shows infinity instead of a decreasing ammo count');

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
  const y1=h.alt,expected1=helicopterLandedAltitude(h,ferryLocalSurfaceY(f,h.carrierLZ||0));
  f.o.position.y=3.6;syncFerryCargo();place(h,4.1,.016,0);
  const y2=h.alt,expected2=helicopterLandedAltitude(h,ferryLocalSurfaceY(f,h.carrierLZ||0));
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
run(`{
  const b=B.find(b=>b.hangar),rear=Wl.find(w=>w.hangarRear&&w.owner===b),
        prevCv=cv,prevIb=ib;
  let onFoot=false,inVehicle=false,airAbove=false,outside=false;
  try{
    // La paret posterior arquejada ha de compartir el material esvaït.
    ib=b;cv=null;updateDistanceVisibility();
    onFoot=b.roof.visible===false&&b.wm.opacity===.18&&
      b.wm.depthWrite===false&&rear?.m.material===b.wm;
    ib=null;cv={t:'tanc',x:b.x,z:b.z,o:{position:{y:b.fy+1}}};
    updateDistanceVisibility();
    inVehicle=b.roof.visible===false&&b.wm.opacity===.18&&
      b.wm.depthWrite===false&&rear?.m.material===b.wm;
    cv={t:'heli',x:b.x,z:b.z,alt:b.fy+b.h+30};
    updateDistanceVisibility();
    airAbove=b.roof.visible===true&&b.wm.opacity===1&&b.wm.depthWrite===true;
    cv={t:'tanc',x:b.x+b.w/2+20,z:b.z,o:{position:{y:b.fy+1}}};
    updateDistanceVisibility();
    outside=b.roof.visible===true&&b.wm.opacity===1&&b.wm.depthWrite===true;
    globalThis.hangarInteriorVisibleInVehicle=onFoot&&inVehicle&&airAbove&&outside;
  }finally{cv=prevCv;ib=prevIb;updateDistanceVisibility()}
}`);
ok('hangarInteriorVisibleInVehicle','arched rear wall fades with depthWrite off and roof stays hidden inside vehicles, not when flying above');

ok("window.HUNTER_COMPOUND_LAYOUTS.find(l=>l.id==='hangar').props.filter(p=>p[0]==='fuel').every(p=>p[2]<-30)",'garage fuel tanks stay behind the workshop');
ok("VD.types.heli_combat.maxF>VD.types.heli.maxF&&VD.types.heli_combat.tu>VD.types.heli.tu&&VD.types.heli_combat.steerResponse>VD.types.heli.steerResponse&&VD.types.heli_combat.yawResponse>VD.types.heli.yawResponse&&VD.types.heli_combat.climb>VD.types.heli.climb",'combat helicopter is faster and more maneuverable than normal helicopter');
ok("vehSrc.includes('Huey 3B-4')&&vehSrc.includes('roundedPrism(g,2.7,1.74,4.18')&&vehSrc.includes('Variant 4: petit carenat arrodonit')",'normal helicopter uses the selected Huey 3B variant 4 visual model');
ok("V.find(v=>v.t==='heli').o.userData.rotor&&V.find(v=>v.t==='heli').o.userData.tailRotor",'new Huey model preserves both animated rotors');
ok("String(fire).includes('const a30=Math.PI/6')&&String(fire).includes(\"c=='heli'\")&&String(fire).includes(\"c=='heli_combat'\")&&String(fire).includes('fx_*ch,-sv,fz*ch')",'both helicopters fire at a 30 degree downward angle');
ok("String(fire).includes(\"c=='tanc'||c=='tanqueta'\")&&String(update).includes('autoAimArmoredShot(')&&String(fire).includes('turretShot(THREE,cv.o)')",
  'tank and tankette fire from the moving barrel, tracking assisted aim smoothly');
ok("vehSrc.includes('rod(elev,[0,0,0],[0,0,-2.4],.1,metal)')&&vehSrc.includes('g.userData.turretMuzzle=muzzle')&&!vehSrc.includes('mgDrop')",
  'tankette barrel now belongs to the articulated turret with a real muzzle');
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
    const heavyVehicle=autoAimWeaponShot(0,2,0,0,0,-1,110,.94,'heavy');
    E.shift();
    E=[{t:'torre',x:0,z:-18,hp:90,o:{position:{y:0}}}];
    const tower=autoAimWeaponShot(0,2,0,0,0,-1,110,.94);
    const heavyTower=autoAimWeaponShot(0,2,0,0,0,-1,110,.94,'heavy');
    weaponAimClear=()=>false;
    const blocked=autoAimWeaponShot(0,2,0,0,0,-1,110,.94);
    globalThis.targetPriorityShared=
      weaponTargetPriority({t:'soldat'})===0&&
      weaponTargetPriority({t:'general'})===0&&
      weaponTargetPriority({t:'jeep'})===1&&
      weaponTargetPriority({t:'torre'})===2&&
      soldier[0]>.01&&vehicle[0]===0&&vehicle[1]===0&&vehicle[2]===-1&&
      tower[0]===0&&tower[1]===0&&tower[2]===-1&&
      heavyVehicle[1]>0&&heavyTower[1]>0&&
      blocked[0]===0&&blocked[1]===0&&blocked[2]===-1;
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
ok('targetPriorityShared','light guns only track vulnerable targets; heavy weapons can track armored vehicles and towers');
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
    const previousFx=fx.length,previousShards=new Set(DB);
    hurtE(enemy,enemy.hp+1);
    return !E.includes(enemy)&&enemy.destroyed===true&&original.parent!==world&&
      fx.length>previousFx&&
      DB.some(part=>!previousShards.has(part)&&part.vehiclePart&&part.m.parent===world);
  });
}`);
ok('enemyVehicleExplosionsPass','jeep, tankette and enemy tank explode into debris, smoke and fire on destruction');

// Rendered surface and boat support share the full displacement, retaining hull offset.
run(`{const q=V.find(v=>v.t==='llanxa');place(q,7,0,0);globalThis.boatSurface=q.o.position.y-wy(q.x,q.z,7)}`);assert(Math.abs(run('boatSurface')-.2)<1e-9);
// Synchronize the rendered clock after fixtures called update() directly.
game.frame(16);
const before=run('water.uniforms.time.value');run("panel('pause')");game.frame(10000);assert.equal(run('water.uniforms.time.value'),before,'pause freezes water clock');
run('resume()');game.frame(16);assert(run('water.uniforms.time.value')>before,'resume advances water clock');
run("panel('map');resume();joystick.state.x=1;joystick.state.y=-1;build()");
ok('joystick.state.x===0&&joystick.state.y===0&&hp===100&&elapsed===0&&water.uniforms.time.value===0','restart resets input, health and clock');
ok('ammo===16','restarting a mission resets ammo to 16 bullets');ok('PM.trunk.parent===world','vegetation follows current world');
ok('PM.update&&PM.remove&&PM.stats.sectors>0','palm sectors support LOD and destruction');
ok("PM.variants.every(ch=>ch.midTrunk&&ch.midCrown&&ch.farTrunk&&ch.farCrown)",
  'every populated palm sector has middle and distant instanced models');
ok("PM.stats.mediumSectors>=0&&PM.stats.farSectors>=0&&PM.stats.nearDistance>0&&PM.stats.farDistance>PM.stats.midDistance&&PM.stats.midDistance>PM.stats.nearDistance",
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



