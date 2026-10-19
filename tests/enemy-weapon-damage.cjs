#!/usr/bin/env node
// Una escala de dany única. La dificultat modifica la dispersió, no els PV.
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 const result=game.run(`(()=>{
  world=new THREE.Group();scene.add(world);
  cv=null;playerFall=null;playerEject=null;
  P.x=0;P.y=1.5;P.z=0;
  E=[];PL.length=0;enemyCandidatesAt=()=>[];vehicleCandidatesAt=()=>[];
  wallCandidates=()=>[];buildingCandidates=()=>[];treeAt=()=>null;hAt=()=>0;
  const values=[];
  for(const level of [.6,1,1.5]){
   DIF=level;over=0;hp=COMBAT_BALANCE.player;
   hurtP(COMBAT_BALANCE.weapons.rifle,true);
   const rifle=COMBAT_BALANCE.player-hp;
   hp=COMBAT_BALANCE.player;over=0;
   shoot(-5,3,0,1,0,0,100,COMBAT_BALANCE.weapons.rifle,0,'e',mW,.7);
   updPj(.1);
   const bullet=COMBAT_BALANCE.player-hp;
   for(const p of Pj)world.remove(p.o);Pj.length=0;
   hp=COMBAT_BALANCE.player;over=0;playerEject=null;
   boom(0,1.5,0,8,COMBAT_BALANCE.weapons.bazooka,'e');
   const rocket=COMBAT_BALANCE.player-hp;
   const car={t:'cotxe',x:100,z:100,hd:0,o:new THREE.Group(),life:5,maxLife:5,destroyed:false};
   cv=car;hp=COMBAT_BALANCE.player;over=0;
   damageVehicle(car,2,1,'light');
   const carRemaining=car.life,driverHealth=hp;
   cv=null;values.push({level,rifle,bullet,rocket,carRemaining,driverHealth,spread:enemyAimSpread()});
  }
  return {values,player:COMBAT_BALANCE.player,general:EC.general.hp,soldier:EC.soldat.hp,elite:COMBAT_BALANCE.people.elite,enemyCar:EC.jeep.hp,car:VT.cotxe.life,missile:COMBAT_BALANCE.weapons.heliMissile};
 })()`);
 assert.equal(result.player,20);assert.equal(result.general,8);assert.equal(result.soldier,4);
 assert.equal(result.elite,8);assert.equal(result.enemyCar,result.car);assert.equal(result.car,5);
 assert.equal(result.missile,12);
 for(const v of result.values){assert.equal(v.rifle,2);assert.equal(v.bullet,2);assert.equal(v.rocket,8);assert.equal(v.carRemaining,3);assert.equal(v.driverHealth,20)}
 assert.ok(result.values[0].spread>result.values[1].spread&&result.values[1].spread>result.values[2].spread);
 console.log('OK: mal fix per dificultat, dispersió i resistència unificada');
})().catch(e=>{console.error(e);process.exitCode=1});
