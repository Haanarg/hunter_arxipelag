#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const combat=fs.readFileSync(path.join(root,'src/combat.js'),'utf8');
const game=fs.readFileSync(path.join(root,'src/game-core.js'),'utf8');
const enemy=fs.readFileSync(path.join(root,'src/enemy-ai.js'),'utf8');
const rules=fs.readFileSync(path.join(root,'src/vehicle-occupant-damage-core.mjs'),'utf8');
const start=combat.indexOf('function captureEmptyEnemyPatrol('),
  end=combat.indexOf('function killEnemy(',start);
assert(start>=0&&end>start,'capture implementation present');
const captureCode=combat.slice(start,end);
function makeScene(type,crewHp){
 const E=[],V=[],calls={grid:0,enemyLod:0,vehicleLod:0,sync:0},
   boat=type==='patrulla_marina';
 const o={position:{x:50,y:boat?0.2:1.3,z:80},userData:{
   enemyFlag:{visible:true},enemyCarCrew:{
     driver:{visible:true},gunner:{visible:true},mount:{visible:true},
     boatWeapons:[{rider:{visible:true}},{rider:{visible:true}}]
   }}};
 const u={t:type,x:50,z:80,hd:.7,hp:8,o,
   ...(boat?{marineCrewHp:[...crewHp]}:{patrolCrewHp:[...crewHp],
     brokenVehicleWindows:[0]})};
 E.push(u);
 const env={E,V,VT:{llanxa:{life:10},cotxe:{life:10}},
   window:{HUNTER_ENEMY_LOD:{setLevel(root,level){
     assert.strictEqual(root,o);assert.equal(level,'full');calls.enemyLod++;
   }},HUNTER_VEHICLES:{setDistantVehicleLOD(root,far){
     assert.strictEqual(root,o);assert.equal(far,false);calls.vehicleLod++;
   }}},
   syncMarinePatrolCrew(){calls.sync++},
   rebuildVehicleGrid(){calls.grid++}
 };
 const capture=new Function('env','with(env){'+captureCode+'return captureEmptyEnemyPatrol;}')(env);
 return{u,E,V,o,calls,capture};
}
for(const type of ['patrulla_marina','jeep']){
 const s=makeScene(type,[0,4]);
 assert.equal(s.capture(s.u),null,'vehicle with surviving passenger cannot be boarded');
 assert.equal(s.E.length,1);assert.equal(s.V.length,0);
 const crew=type==='jeep'?s.u.patrolCrewHp:s.u.marineCrewHp;
 crew[1]=0;
 const v=s.capture(s.u);
 assert(v,'abandoned patrol must become available');
 assert.equal(s.E.length,0,'enemy unit removed after crew dies');
 assert.equal(s.V.length,1,'captured vehicle added to pilotable fleet');
 assert.equal(v.t,type==='jeep'?'cotxe':'llanxa');
 assert.strictEqual(v.o,s.o,'same mesh, no duplicate world geometry');
 assert.equal(v.enemyCrew,null);
 assert(v.life>0&&v.life<=v.maxLife,'hull survives without restoring lost HP');
 assert.equal(s.calls.grid,1,'collision spatial index rebuilt immediately');
 assert.equal(s.calls.enemyLod,1);
 assert.equal(s.calls.vehicleLod,1);
 assert.equal(s.o.userData.enemyFlag.visible,false,'enemy flag removed');
 assert.equal(s.o.userData.enemyCarCrew.driver.visible,false);
 assert.equal(s.o.userData.enemyCarCrew.gunner.visible,false);
 assert.equal(s.o.userData.enemyCarCrew.mount.visible,false);
 assert.equal(s.capture(s.u),null,'no duplicate capture');
 assert.equal(s.V.length,1);
 if(type==='jeep')assert.deepEqual(Array.from(v.brokenVehicleWindows),[0],
   'broken windshield persists when patrol car is captured');
}
{
 const s=makeScene('patrulla_marina',[0,0]);s.u.hp=0;
 assert.equal(s.capture(s.u),null,'destroyed hull cannot be captured');
 assert.equal(s.E.length,1);assert.equal(s.V.length,0);
}
{
 const raw=rules.replace(/^export /gm,'');
 const core=new Function(raw+'return {vehicleSeatProjectileContact,vehicleOccupantHeadWorld,breakVehicleSeatWindow};')();
 const car={t:'jeep',x:0,z:0,hd:0,patrolCrewHp:[4,4],
   brokenVehicleWindows:[]};
 const head=core.vehicleOccupantHeadWorld(car,0,0);
 const from={x:head.x,y:head.y,z:head.z-8},
   to={x:head.x,y:head.y,z:head.z+2};
 const contacts=()=>core.vehicleSeatProjectileContact(from,to,car,
   car.patrolCrewHp.map(hp=>({hp})),{baseY:0});
 assert.equal(contacts()?.kind,'vehicle-glass','first shot breaks patrol glass');
 assert(core.breakVehicleSeatWindow(car,0));
 assert.equal(contacts()?.kind,'vehicle-occupant','next bullet strikes seated soldier');
 car.patrolCrewHp[0]=0;
 assert.notEqual(contacts()?.seat,0,'dead driver is no longer hittable');
}
assert(game.includes("'jeep','tanqueta','tanc','patrulla_marina'"),
  'both enemy patrol types have physical collision while occupied');
assert(game.includes('vehicleCandidatesAt(P.x,P.z,24,true)'),
  'captured vehicles reuse the normal near-vehicle interaction');
assert(combat.includes('captureEmptyEnemyPatrol(boat)'),
  'last marine crew shot calls capture');
assert(combat.includes('captureEmptyEnemyPatrol(car)'),
  'last car crew shot calls capture');
assert(enemy.includes('if(t===\'jeep\')u.patrolCrewHp=['),
  'road patrol crew starts with independent life');
assert(enemy.includes("u.t==='jeep'&&u.patrolCrewHp?.[1]<=0"),
  'killed gunner cannot keep firing');
console.log('PASS marine and jeep boarding after both crew dead, solid hull, preserved mesh, glass and life');
