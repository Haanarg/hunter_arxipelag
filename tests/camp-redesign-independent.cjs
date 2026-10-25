'use strict';
// Independent physical and gameplay checks of the camp requested by the user.
// Uses real Three.js meshes/colliders and runtime AI; the renderer is simulated.
const assert=require('node:assert/strict');
const createGame=require('./harness.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));
(async()=>{
 const game=await createGame();
 let random=0x8426cafe;
 game.context.Math.random=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296};
 game.start('67',1);
 const shape=plain(game.run(`(()=>{
  const c=world.userData.prisonCamp,l=c.layout,issues=[];
  const check=(ok,text)=>{if(!ok&&issues.length<40)issues.push(text)};
  const tr=compoundTransform(c,c.angle),point=p=>{const q=tr(...p);return{x:q[0],z:q[1]}};
  const crossing=(a,b,r=.94)=>{
   a=point(a);b=point(b);a.y=hAt(a.x,a.z);b.y=hAt(b.x,b.z);
   return optionalCivilianCanMove(a,b,r);
  };
  const barrack=c.buildings.find(b=>b.layoutBuilding==='prison-barracks'),
    guardhouse=c.buildings.find(b=>b.layoutBuilding==='guardhouse'),
    workshop=c.buildings.find(b=>b.layoutBuilding==='prison-workshop');
  check(c.buildings.length===3,'barrack, guardhouse and open repair workshop');
  check(!!workshop&&workshop.workshop&&workshop.h===12&&workshop.w===24&&workshop.d===24,
    'double-height 24x24 workshop with open front');
  if(workshop){
    const walls=Wl.filter(w=>w.owner===workshop&&!w.open&&w.hp>0);
    check(walls.length===3,'workshop has exactly three real full-height solid walls');
    check(walls.every(w=>Math.abs(w.y1-workshop.fy-12)<.01),'each wall reaches the 12m roof');
    check(!workshop.door&&!walls.some(w=>Math.abs(w.cx-workshop.x)<1&&w.cz>workshop.z+9),
      'there is no entrance door, frame, sill or invisible fourth wall');
    check(workshop.roof?.children.length>0,'the three walls support a visible roof');
    const at=(x,z)=>point([x,z]),bay=at(33,16),
      truck=vehicleBox({t:'camio',x:bay.x,z:bay.z,hd:0}),
      overlaps=(box,w)=>obbOverlap(box,{x:(w.x0+w.x1)/2,z:(w.z0+w.z1)/2,hd:0,
        w:w.x1-w.x0,d:w.z1-w.z0});
    check(!wallCandidates(bay.x,bay.z,18).some(w=>!w.open&&w.hp>0&&overlaps(truck,w)),
      'full-size truck fits beneath the workshop roof');
    for(const z of[34,30,27,24,20,16]){
      const p=at(33,z),box=vehicleBox({t:'camio',x:p.x,z:p.z,hd:0});
      check(!wallCandidates(p.x,p.z,18).some(w=>!w.open&&w.hp>0&&overlaps(box,w)),
        'truck has a collision-free straight drive through the open frontage at local z'+z);
    }
    check(!optionalCivilianCanMove(
      {...at(19,16),y:hAt(at(19,16).x,at(19,16).z)},
      {...at(23,16),y:hAt(at(23,16).x,at(23,16).z)},.94),
      'west workshop wall stops NPCs');
  }
  check(barrack?.wood&&barrack.w===68&&barrack.d===18,'long wooden barrack has world footprint68x18');
  check(barrack?.roof.userData.branchGable===true,'barrack uses existing fishing-hut gable architecture');
  check(barrack?.localW===18&&barrack.localD===68,'narrow gable continues along the extended length');
  check(guardhouse?.w===14&&guardhouse.d===12,'small guardhouse footprint');
  check(l.entrances.length===1,'single authored outer entrance');
  let outsideChecks=0,gateChecks=0;
  // Sample crossings of every side, using the live expanded wall/vehicle/terrain
  // predicate rather than counting five authored line segments.
  for(let k=-60;k<=60;k++){
   for(const [a,b]of[[[k,-60],[k,-64]],[[-60,k],[-64,k]],[[60,k],[64,k]]]){
    check(!crossing(a,b),'outer perimeter has an unintended opening');outsideChecks++;
   }
   const open=crossing([k,60],[k,64]);
   check(open===(Math.abs(k)<=10),'south entrance agrees with the sole24m gap atx'+k);outsideChecks++;
  }
  for(let x=-18;x<=18;x++){
   check(!crossing([x,-8],[x,-12]),'inner back fence confines prisoners');
   check(!crossing([x,22],[x,26]),'inner south side including gate begins closed');gateChecks+=2;
  }
  for(let z=-8;z<=22;z++){
   check(!crossing([-18,z],[-22,z]),'inner west fence confines prisoners');
   check(!crossing([18,z],[22,z]),'inner east fence confines prisoners');gateChecks+=2;
  }
  const towers=E.filter(u=>u.compound==='prison-camp'&&u.t==='torre');
  check(towers.length===4,'four functional defensive tower enemies');
  const actual=towers.map(u=>[Math.round(u.x-c.x),Math.round(u.z-c.z)]).sort();
  check(JSON.stringify(actual)===JSON.stringify([[-56,-56],[-56,56],[56,-56],[56,56]].sort()),'towers occupy four corners');
  check(towers.every(u=>u.hp>0&&u.o.userData.towerTurret&&u.towerLegColliders.length===4),'towers have weapons and physical legs');
  check(c.soldiers.length===6&&c.soldiers.every(u=>u.t==='soldat'&&u.hp>0),'six real soldier enemies');
  check(c.soldiers.filter(u=>u.campDuty==='patrol').length===4,'four patrol soldiers');
  const sentries=c.soldiers.filter(u=>u.campDuty==='sentry');
  check(sentries.length===2&&sentries.every(u=>u.guard&&u.patrol.length===1),'two fixed sentry posts');
  check(sentries.some(u=>Math.abs(u.x-c.x+8)<.01)&&sentries.some(u=>Math.abs(u.x-c.x-8)<.01)&&
    sentries.every(u=>Math.abs(u.z-c.z-27)<.01),'sentries stand on opposite sides of inner gate');
  check(c.soldiers.every(u=>enemySolidAt(u,u.x,u.z,u.hd)),'soldier spawn positions physically clear');
  const playerBounds=new THREE.Box3().setFromObject(pl),playerHeight=playerBounds.max.y-playerBounds.min.y,
    civilians=prisonerSystem.entities.map(u=>{
     const b=new THREE.Box3().setFromObject(u.o);return{id:u.id,role:u.role,pose:u.pose,
      height:b.max.y-b.min.y,hitHeight:u.height,bottom:b.min.y-u.y,radius:u.radius};
    });
  check(civilians.length===5&&civilians.every(u=>Math.abs(u.bottom)<.002),'all prisoner meshes rest on ground');
  check(civilians.some(u=>u.pose==='seated')&&civilians.some(u=>u.pose==='standing'),'captive poses mix standing and ground sitting');
  for(const u of civilians){
   check(Math.abs(u.hitHeight-u.height)<.003,'civilian hit height matches posed mesh '+u.id);
   if(u.pose==='standing')check(Math.abs(u.height-playerHeight)<.003,'upright civilian matches player height '+u.id);
   else check(u.height>playerHeight*.55&&u.height<playerHeight*.7,'ground sitting uses adult scale '+u.id);
  }
  return{issues,outsideChecks,gateChecks,playerHeight,civilians,towers:towers.length,
   patrols:c.soldiers.filter(u=>u.campDuty==='patrol').length,sentries:sentries.length};
 })()`));
 assert.deepEqual(shape.issues,[],JSON.stringify(shape));
 console.log('PASS independent physical camp perimeter, covered open-front workshop, confinement, guards and adult poses',JSON.stringify(shape));
 const patrol=plain(game.run(`(()=>{
  const c=world.userData.prisonCamp,units=c.soldiers;
  // Retain the real collision world and neutral vehicles, and isolate only the
  // camp's six soldiers to keep this180s idle AI simulation bounded.
  E=units.slice();rebuildVehicleGrid();cheats.invisible=true;STEALTH.clear();
  const before=units.map(u=>({x:u.x,z:u.z})),travel=units.map(()=>0),waypoints=units.map(()=>new Set()),issues=[];
  for(let tick=0;tick<3600;tick++){
   const old=units.map(u=>({x:u.x,z:u.z}));updEn(.05);
   units.forEach((u,i)=>{
    travel[i]+=Math.hypot(u.x-old[i].x,u.z-old[i].z);waypoints[i].add(u.pi);
    if(issues.length<20&&(!enemySolidAt(u,u.x,u.z,u.hd)||Math.abs(u.x-c.x)>61||Math.abs(u.z-c.z)>61))
     issues.push('idle soldier leaves clear camp space');
   });
  }
  return{issues,seconds:180,units:units.map((u,i)=>({duty:u.campDuty,travel:travel[i],
   displacement:Math.hypot(u.x-before[i].x,u.z-before[i].z),visitedWaypoints:waypoints[i].size,
   x:u.x-c.x,z:u.z-c.z}))};
 })()`));
 assert.deepEqual(patrol.issues,[],JSON.stringify(patrol));
 assert(patrol.units.filter(u=>u.duty==='patrol').every(u=>u.travel>200&&u.visitedWaypoints>10),
  'all four soldiers actually patrol the perimeter: '+JSON.stringify(patrol));
 assert(patrol.units.filter(u=>u.duty==='sentry').every(u=>u.displacement<.01&&u.travel<.01),
  'both sentries keep their posts at rest: '+JSON.stringify(patrol));
 console.log('PASS independent180s real idle AI: four moving patrols and two stationary sentries',JSON.stringify(patrol));
 const rescue=plain(game.run(`(()=>{
  const c=world.userData.prisonCamp,g=c.prisonGate;
  P.x=c.x;P.z=c.z+27;P.y=hAt(P.x,P.z);
  cv=null;swimming=false;playerFall=null;playerEject=null;scopeActive=false;
  updateOptionalSystems(0,true);
  const start=prisonerSystem.snapshot();
  // A cut anywhere on the interior perimeter works, not just at the gate.
  const section=c.prisonFenceSegments.find(s=>!s.gate&&Math.abs(s.collider.cx-c.x-20)<.3&&
    Math.abs(s.collider.cz-c.z-7)<5);
  if(!section)throw Error('Missing east-side cuttable fence piece');
  const w=section.collider;w.hp=0;w.cut=true;
  for(const part of w.parts||[w.m]){if(part){part.visible=false;part.parent?.remove(part)}}
  const wi=Wl.indexOf(w);if(wi>=0)Wl.splice(wi,1);wallGridCount=-1;
  updateOptionalSystems(0,true);
  const breachOnly=prisonerSystem.snapshot();
  for(const soldier of c.soldiers)soldier.hp=0;
  updateOptionalSystems(0,true);const noTowersYet=prisonerSystem.snapshot();
  for(const tower of c.towers)tower.hp=0;
  updateOptionalSystems(0,true);const liberated=prisonerSystem.snapshot();
  const gateIntact=!g.opened&&g.colliders.every(w=>w.hp>0&&!w.open);
  const pos={x:w.cx,y:hAt(w.cx,w.cz),z:w.cz};
  const crossed=optionalCivilianCanMove({...pos,x:pos.x-2},{...pos,x:pos.x+2},.94);
  for(let tick=0;tick<300;tick++)updateOptionalSystems(.25,true);
  return{start,breachOnly:breachOnly.released,noTowersYet:noTowersYet.released,
   gateIntact,crossed,liberated:liberated.released,
   entities:prisonerSystem.snapshot().entities.map(u=>({role:u.role,state:u.state,blocked:u.blocked})),
   over};
 })()`));
 assert.equal(rescue.start.rescue.guards,6);
 assert.equal(rescue.start.rescue.towers,4);
 assert.equal(rescue.breachOnly,false,'cutting all or part of the cage is not enough with armed guards');
 assert.equal(rescue.noTowersYet,false,'the four towers must also be neutralised');
 assert.equal(rescue.gateIntact,true,'the automatic objective must not open an undamaged gate');
 assert.equal(rescue.crossed,true,'NPCs can walk through the cut section on the east side');
 assert.equal(rescue.liberated,true,'the new objective automatically releases the prisoners');
 assert(rescue.entities.filter(u=>u.role==='farmer').every(u=>u.state==='rescued'&&u.blocked===0),
  'four farmers escape through the cut section');
 assert.equal(rescue.entities.find(u=>u.role==='mechanic').state,'ready','mechanic reaches workshop');
 assert.equal(rescue.over,0);
 console.log('PASS physical prison liberation via side breach, six soldiers and four towers; mechanics and evacuation',JSON.stringify(rescue));
 game.run('discardGeneratedWorld()');
 console.log('PASS camp redesign independent; logical/physical CPU harness, Android/GPU visual remains pending');
})().catch(error=>{console.error(error);process.exitCode=1});
