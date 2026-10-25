'use strict';
// Independent integration review: use the real runtime controller, combat and input.
const assert=require('node:assert/strict');

(async()=>{
  const game=await require('./harness.cjs')();
  const run=game.run;
  run(`
    function phase11ReviewFresh(){
      resetOptionalSystems();
      if(world)scene.remove(world);
      world=new THREE.Group();scene.add(world);
      seedSearchMode=false;R=()=>.5;started=1;paused=false;over=0;simulationFocused=true;
      document.hidden=false;hp=20;cv=null;ib=null;activeBunker=null;
      rawHAt=()=>3;hAt=()=>3;groundAt=()=>3;treeAt=()=>null;treeHit=()=>false;
      Wl=[];Dr=[];B=[];V=[];E=[];Pj=[];stairs=[];piers=[];items=[];TG.clear();PL.length=0;
      clearBulletImpacts();STEALTH.clear();cheats.invisible=false;cheats.immune=false;
      playerFall=null;playerEject=null;P.x=0;P.y=3;P.z=8;P.hd=0;
      const layout=window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.type==='prison-camp');
      if(!layout)throw Error('Missing prison compound in runtime layouts');
      P.x=layout.rescuePoint.x;P.z=layout.rescuePoint.z;
      const camp={id:'prison-camp',layoutId:'prison-camp',x:0,z:0,angle:0,layout,
        buildings:[],soldiers:[],vehicles:[],loot:[],r:115};
      world.userData={compounds:[camp],prisonCamp:camp};
      P.base={x:0,z:200};
      configureOptionalWorld();rebuildVehicleGrid();
      updateOptionalSystems(.05,true);
      return camp;
    }
    function phase11ReviewRepairSetup(){
      phase11ReviewFresh();act('KeyE');
      for(let i=0;i<400;i++)updateOptionalSystems(.1,true);
      const u=prisonerSystem.entities.find(p=>p.role==='mechanic');
      if(u.state!=='ready')throw Error('Mechanic did not reach the workshop');
      P.x=u.x;P.y=u.y;P.z=u.z+1;
      const vehicle={t:'cotxe',x:u.x+7,z:u.z,hd:0,v:0,strafeV:0,life:2,maxLife:8,
        o:new THREE.Group()};vehicle.o.position.set(vehicle.x,3,vehicle.z);world.add(vehicle.o);
      V=[vehicle];rebuildVehicleGrid();updateOptionalSystems(.05,true);
      return vehicle;
    }
  `);

  const rescue=run(`(()=>{
    phase11ReviewFresh();
    const before=prisonerSystem.snapshot();
    const action=getOptionalAction();updateActionButton(nearV());
    const title=document.getElementById('mainActionButton').title;
    act('KeyE');
    const after=prisonerSystem.snapshot();
    for(let i=0;i<400;i++)updateOptionalSystems(.1,true);
    return {count:before.entities.length,mechanics:before.entities.filter(u=>u.role==='mechanic').length,
      action:action?.kind,title,released:after.released,
      farmers:prisonerSystem.snapshot().entities.filter(u=>u.role==='farmer').map(u=>u.state),
      mechanic:prisonerSystem.snapshot().entities.find(u=>u.role==='mechanic').state,
      noEnemy:prisonerSystem.entities.every(u=>!E.includes(u)),over};
  })()`);
  assert.equal(rescue.count,5);assert.equal(rescue.mechanics,1);
  assert.equal(rescue.action,'rescue');assert.match(rescue.title,/Alliberar presoners/);
  assert.equal(rescue.released,true);assert.equal(rescue.mechanic,'ready');
  assert.deepEqual(Array.from(rescue.farmers),['rescued','rescued','rescued','rescued']);
  assert.equal(rescue.noEnemy,true);assert.equal(rescue.over,0,'rescue never ends or replaces the principal mission');

  const swimming=run(`(()=>{
    phase11ReviewFresh();act('KeyE');swimming=true;
    const beforeRadioTime=radioRelay.snapshot().time;
    for(let i=0;i<400;i++)updateOptionalSystems(.1,true);
    const result={farmers:prisonerSystem.snapshot().entities.filter(u=>u.role==='farmer').map(u=>u.state),
      canInteract:getOptionalAction()!==null,radioAdvances:radioRelay.snapshot().time>beforeRadioTime};
    swimming=false;return result;
  })()`);
  assert.deepEqual(Array.from(swimming.farmers),['rescued','rescued','rescued','rescued'],
    'rescuers continue evacuating while the player swims');
  assert.equal(swimming.canInteract,false);assert.equal(swimming.radioAdvances,true,
    'swimming does not suspend the independent world/radio clock');

  const shots=run(`(()=>{
    const trial=(covered,owner='p')=>{
      phase11ReviewFresh();P.x=500;P.z=500;
      const u=prisonerSystem.entities[0],before=u.hp;
      if(covered)Wl.push({x0:-15,x1:-14,y0:3,y1:6,z0:-7,z1:-5,
        hp:1000,open:false,m:new THREE.Group()});
      rebuildVehicleGrid();
      shoot(-20,4.1,-6,1,0,0,100,1,0,owner,mW,.7);updPj(.2);
      return {hp:u.hp,before,shots:Pj.length,blood:bulletImpacts.some(f=>f.type==='blood'),
        otherHP:prisonerSystem.entities[1].hp};
    };
    return {open:trial(false),covered:trial(true),enemy:trial(false,'e')};
  })()`);
  assert.equal(shots.open.hp,shots.open.before-1,'the first civilian intercepts a real projectile');
  assert.equal(shots.open.otherHP,4,'the same shot cannot continue through the first person');
  assert.equal(shots.open.blood,true,'damage to a person uses blood feedback');
  assert.equal(shots.covered.hp,shots.covered.before,'a nearer solid wall intercepts the projectile');
  assert.equal(shots.enemy.hp,shots.enemy.before-1,'stray enemy bullets can hit civilians too');

  const blasts=run(`(()=>{
    const trial=covered=>{
      phase11ReviewFresh();P.x=500;P.z=500;
      const u=prisonerSystem.entities[0],before=u.hp;
      if(covered)Wl.push({x0:-9.5,x1:-9,y0:3,y1:7,z0:-9,z1:-3,
        hp:1000,open:false,m:new THREE.Group()});
      rebuildVehicleGrid();boom(-12,4.1,-6,12,2,'p');
      return {hp:u.hp,before,over};
    };
    return {open:trial(false),covered:trial(true)};
  })()`);
  assert.ok(blasts.open.hp<blasts.open.before,'real explosions damage exposed civilians');
  assert.equal(blasts.covered.hp,blasts.covered.before,'blast cover is evaluated before structures break');
  assert.equal(blasts.open.over,0);

  const repair=run(`(()=>{
    const v=phase11ReviewRepairSetup(),initial=v.life;
    const action=getOptionalAction();updateActionButton(nearV());
    const title=document.getElementById('mainActionButton').title;
    act('KeyE');const began=!!prisonerSystem.snapshot().repair,entered=!!cv;
    for(let i=0;i<20;i++)updateOptionalSystems(.1,true);
    const partial=v.life;
    panel('pause');const cancelledOnPause=!prisonerSystem.snapshot().repair;
    for(let i=0;i<100;i++)updateOptionalSystems(.1,false);
    const afterPause=v.life;
    resume();act('KeyE');
    for(let i=0;i<65;i++)updateOptionalSystems(.1,true);
    const complete=v.life;
    updateActionButton(nearV());const boardingTitle=document.getElementById('mainActionButton').title;
    act('KeyE');const canBoard=cv===v;
    return{initial,action:action?.kind,title,began,entered,partial,cancelledOnPause,
      afterPause,complete,max:v.maxLife,boardingTitle,canBoard,ammo:ammo};
  })()`);
  assert.equal(repair.action,'repair');assert.match(repair.title,/Reparar/);
  assert.equal(repair.began,true);assert.equal(repair.entered,false,'repair action takes priority over boarding on foot');
  assert.equal(repair.partial,repair.initial,'repair does not give an immediate or partial heal');
  assert.equal(repair.cancelledOnPause,true,'the actual pause controller cancels a running repair immediately');
  assert.equal(repair.afterPause,repair.initial);assert.equal(repair.complete,repair.max);
  assert.equal(repair.canBoard,true,'follow commands do not trap the player beside a repaired vehicle');
  assert.match(repair.boardingTitle,/Pujar/,'the action label resolves to the same boarding action as E');

  const lifecycle=run(`(()=>{
    let v=phase11ReviewRepairSetup();act('KeyE');
    damageVehicle(v,1,1,'light');updateOptionalSystems(.1,true);
    const interrupted=prisonerSystem.snapshot().repair===null,afterHit=v.life;
    for(let i=0;i<100;i++)updateOptionalSystems(.1,true);
    const noLateHeal=v.life===afterHit;
    act('KeyE');
    const mechanic=prisonerSystem.entities.find(u=>u.role==='mechanic');
    prisonerSystem.hurt(mechanic,1);
    const woundedCancels=prisonerSystem.snapshot().repair===null;
    act('KeyE');prisonerSystem.hurt(mechanic,100);
    for(let i=0;i<100;i++)updateOptionalSystems(.1,true);
    const deadNoHeal=v.life===afterHit,stillPlayable=over===0;
    const stale=getOptionalAction();resetOptionalSystems();
    const cleared=prisonerSystem.entities.length===0&&prisonerSystem.markers().length===0;
    return{interrupted,noLateHeal,woundedCancels,deadNoHeal,stillPlayable,cleared};
  })()`);
  assert.ok(Object.values(lifecycle).every(Boolean),'damage, mechanic loss and reset release repair ownership: '+JSON.stringify(lifecycle));

  const runover=run(`(()=>{
    const trial=(speed,y=3)=>{
      phase11ReviewFresh();P.x=500;P.z=500;
      const u=prisonerSystem.entities[0],before=u.hp,
        truck={t:'camio',x:-4,z:-6,hd:-Math.PI/2,v:speed,life:10,maxLife:10,o:new THREE.Group()};
      truck.o.position.set(truck.x,y,truck.z);V=[truck];rebuildVehicleGrid();
      handleVehicleImpacts(truck,.05,-20,-6);const first=u.hp;
      handleVehicleImpacts(truck,.05,-20,-6);
      return{before,first,second:u.hp,vehicleLife:truck.life};
    };
    return{fast:trial(20),slow:trial(3),above:trial(20,20)};
  })()`);
  assert.ok(runover.fast.first<runover.fast.before,'a real vehicle sweep can hit a civilian between frames');
  assert.equal(runover.fast.second,runover.fast.first,'one contact cannot repeat during the cooldown');
  assert.equal(runover.fast.vehicleLife,10,'running over a person does not damage the vehicle');
  assert.equal(runover.slow.first,runover.slow.before,'parking-speed movement does not injure a civilian');
  assert.equal(runover.above.first,runover.above.before,'a sweep on another vertical level does not injure a civilian');

  const radio=run(`(()=>{
    phase11ReviewFresh();
    const witness=mkEn('soldat',0,0,3),a=mkEn('soldat',1000,100,3),b=mkEn('soldat',1010,100,3);
    Object.assign(witness,{canSee:true,aiMode:'combat'});
    Object.assign(a,{canSee:false,canShoot:false,aiMode:'patrol'});
    Object.assign(b,{canSee:false,canShoot:false,aiMode:'patrol'});
    const source={id:'comunicacions',layoutId:'comunicacions-v1',x:0,z:0,r:100,angle:0,
      layout:window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.type==='comunicacions'&&l.variant===1),
      antennaFooting:{hp:24},soldiers:[witness]},
      hq={id:'hq',x:1000,z:0,r:130,angle:0,layout:{friendly:false},
        entrances:[[1000,125]],soldiers:[a,b]};
    world.userData.compounds.push(source,hq);configureOptionalWorld();rebuildVehicleGrid();
    const originalCount=E.length;
    P.x=40;P.y=3;P.z=-20;STEALTH.clear();soldierWarnNeighbors(witness,P,3);
    const sent=radioRelay.snapshot(),goal={x:a.lastSeenX,y:a.lastSeenY,z:a.lastSeenZ},
      noSight=!a.canSee&&!a.canShoot&&!b.canSee&&!b.canShoot,
      localWarning=STEALTH.events().some(e=>e.kind==='alert');
    P.x=-400;P.z=400;updateOptionalSystems(.1,true);
    const remembered=goal.x===a.lastSeenX&&goal.y===a.lastSeenY&&goal.z===a.lastSeenZ,
      reportCopied=radioRelay.snapshot().relays[0].lastReport.x===40;
    const panel=radioRelay.snapshot().relays[0];P.x=panel.x;P.y=panel.y;P.z=panel.z+1.5;
    const action=getOptionalAction();act('KeyE');
    const disabled=!radioRelay.snapshot().relays[0].operational;
    STEALTH.clear();soldierWarnNeighbors(witness,P,3);
    const localAfterSabotage=STEALTH.events().some(e=>e.kind==='alert');
    updateOptionalSystems(40,true);
    soldierWarnNeighbors(witness,P,3);
    return{relays:sent.relays.length,dispatches:sent.relays[0].dispatches,active:sent.activeDefenders,
      noSight,localWarning,remembered,reportCopied,action:action?.kind,disabled,localAfterSabotage,
      count:E.length,originalCount,finalDispatches:radioRelay.snapshot().relays[0].dispatches};
  })()`);
  assert.equal(radio.relays,1);assert.equal(radio.dispatches,2);assert.equal(radio.active,2);
  assert.equal(radio.noSight,true,'the actual radio callback grants remembered positions without line of sight or fire');
  assert.equal(radio.localWarning,true);assert.equal(radio.remembered,true);assert.equal(radio.reportCopied,true);
  assert.equal(radio.action,'sabotage');assert.equal(radio.disabled,true);
  assert.equal(radio.localAfterSabotage,true,'the real warning hook preserves local hearing after sabotage');
  assert.equal(radio.count,radio.originalCount,'radio never spawns a replacement force');
  assert.equal(radio.finalDispatches,radio.dispatches,'disabled relay cannot dispatch after its cooldown expires');

  console.log('OK independent phase 11: real E/HUD, rescue while swimming, civilian projectile/blast/runover cover, repair pause/damage/death/reset/boarding, finite remembered HQ radio defense');
})().catch(error=>{console.error(error);process.exitCode=1});
