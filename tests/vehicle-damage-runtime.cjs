'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 const result=game.run(`(()=>{
  cv=null;cheats.immune=false;combatFeedback=null;let explosions=0;
  explodeVehicle=v=>{v.destroyed=true;explosions++;};
  const car={t:'cotxe',life:5},tank={t:'tanc',life:20};
  damageVehicle(car,1.1,1,'light');const afterBullet=car.life;
  damageVehicle(car,999,1,'heavy');damageVehicle(car,999,1,'heavy');
  damageVehicle(tank,20,1,'light');const armour=tank.life;
  damageVehicle(tank,2.1,1,'heavy');const heavy=tank.life;
  const crash={t:'cotxe',life:5};damageVehicle(crash,99,2,'collision');
  const bad={t:'cotxe',life:5};damageVehicle(bad,NaN,1,'heavy');
  const fallback={t:'cotxe'};damageVehicle(fallback,2,1,'light');
  const immune={t:'cotxe',life:5};cv=immune;cheats.immune=true;damageVehicle(immune,99,1,'heavy');
  const hull={t:'cotxe',x:0,z:0,o:{position:{y:0}}};
  return {afterBullet,dead:car.life,explosions,armour,heavy,crash:crash.life,bad:bad.life,fallback:fallback.life,immune:immune.life,hull:explosionDistanceToVehicleHull(hull,0,1,0)};
 })()`);
 assert.deepEqual({...result},{afterBullet:3,dead:0,explosions:1,armour:20,heavy:17,crash:3,bad:5,fallback:3,immune:5,hull:0});
 console.log('individual vehicle runtime: shared HP/rounding, armour, heavy fire, collision, invalid damage, profile fallback, cheats and one destruction passed');
})().catch(error=>{console.error(error);process.exitCode=1});
