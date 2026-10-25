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
    guardhouse=c.buildings.find(b=>b.layoutBuilding==='guardhouse');
  check(c.buildings.length===2,'one barrack and one guardhouse');
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
 console.log('PASS independent physical camp perimeter, inner confinement, timber barrack, towers, guards and adult poses',JSON.stringify(shape));
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
  const c=world.userData.prisonCamp,l=c.layout,g=c.prisonGate;
  P.x=c.x+l.rescuePoint.x;P.z=c.z+l.rescuePoint.z;P.y=hAt(P.x,P.z);
  cv=null;swimming=false;playerFall=null;playerEject=null;scopeActive=false;
  updateOptionalSystems(0,true);
  const sentry=c.soldiers.find(u=>u.campDuty==='sentry');sentry.canSee=true;
  const action=getOptionalAction();act('KeyE');
  const blocked=!!action&&action.kind==='rescue'&&!prisonerSystem.snapshot().released&&!g.opened;
  // Remove the threat after checking the production danger gate. Rescue remains
  // optional and uses the same liveE/HUD path as the game.
  E=[];rebuildVehicleGrid();updateOptionalSystems(0,true);act('KeyE');
  const opened=g.opened&&g.colliders.every(w=>w.open&&w.hp===0)&&g.meshes.every(m=>!m.visible),
    atRelease=prisonerSystem.entities.map(u=>{
     const b=new THREE.Box3().setFromObject(u.o);return{id:u.id,pose:u.pose,height:b.max.y-b.min.y,
      hitHeight:u.height,bottom:b.min.y-u.y,state:u.state};
    });
  const playerBounds=new THREE.Box3().setFromObject(pl),playerHeight=playerBounds.max.y-playerBounds.min.y;
  let crossed=false;
  const from={x:c.x,y:hAt(c.x,c.z+23),z:c.z+23},to={x:c.x,y:hAt(c.x,c.z+25),z:c.z+25};
  crossed=optionalCivilianCanMove(from,to,Math.max(...prisonerSystem.entities.map(u=>u.radius)));
  for(let tick=0;tick<240;tick++)updateOptionalSystems(.25,true);
  return{blocked,opened,crossed,released:prisonerSystem.snapshot().released,atRelease,playerHeight,
   entities:prisonerSystem.snapshot().entities.map(u=>({id:u.id,role:u.role,state:u.state,blocked:u.blocked})),
   mechanics:prisonerSystem.entities.filter(u=>u.role==='mechanic').length,over};
 })()`));
 assert.equal(rescue.blocked,true,'a live aware sentry prevents rescue and keeps physical gate closed');
 assert.equal(rescue.opened,true,'E rescues civilians and physically opens/hides the inner gate');
 assert.equal(rescue.crossed,true,'adult sized civilians can cross the open gate');
 assert.equal(rescue.released,true);
 assert(rescue.atRelease.every(u=>u.pose==='standing'&&Math.abs(u.height-rescue.playerHeight)<.003&&Math.abs(u.bottom)<.003),
  'seated civilians stand at full player height before evacuation: '+JSON.stringify(rescue));
 assert(rescue.entities.filter(u=>u.role==='farmer').every(u=>u.state==='rescued'),'four farmers escape through real opened gate');
 assert.equal(rescue.entities.find(u=>u.role==='mechanic').state,'ready','mechanic follows the authored path around the inner fence');
 assert.equal(rescue.mechanics,1);assert.equal(rescue.over,0);
 console.log('PASS independent physical rescue: threat blocks closed gate, E opens it, all civilians stand and escape in60s',JSON.stringify(rescue));
 game.run('discardGeneratedWorld()');
 console.log('PASS camp redesign independent; logical/physical CPU harness, Android/GPU visual remains pending');
})().catch(error=>{console.error(error);process.exitCode=1});
