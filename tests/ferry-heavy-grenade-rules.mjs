import assert from 'node:assert/strict';
import {canThrowGrenadeFromVehicle,vehicleGrenadeLaunch} from '../src/weapon-catalog.mjs';
import {isArmoredVehicleType,vehicleDamage,tankCanCrush} from '../src/combat-rules.mjs';
import {vehicleDynamics} from '../src/vehicle-dynamics-core.mjs';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

for(const t of ['tanc','tanqueta','ferry','heli_combat']){
 assert.equal(canThrowGrenadeFromVehicle({t}),false,t+' cannot throw grenades');
 assert.equal(vehicleGrenadeLaunch({t,x:0,z:0,hd:0,y:0}),null,t+' has no grenade origin');
}
for(const t of ['heli','llanxa','llanxa_coets','cotxe','moto']){
 assert.equal(canThrowGrenadeFromVehicle({t}),true,t+' retains grenade availability');
 assert.ok(vehicleGrenadeLaunch({t,x:0,z:0,hd:0,y:0}),'allowed vehicle has muzzle');
}
assert.equal(canThrowGrenadeFromVehicle(null),false);
assert.equal(isArmoredVehicleType('ferry'),true);
for(const t of ['tanc','tanqueta','ferry']){
 const v={t,life:15};
 assert.equal(vehicleDamage(v,20,1,'light',15).damaged,false,
   t+' resists small arms');
 assert.equal(vehicleDamage(v,5,1,'heavy',15).damaged,true,
   t+' remains vulnerable to explosive weapons');
}
for(const type of ['llanxa','llanxa_coets','moto_aquatica','barca_rems','windsurf','hover','patrulla_marina']){
 assert.equal(tankCanCrush({t:'ferry',v:10},{t:type},vehicleDynamics.types.ferry.mass,1),true,
  'ferry rams '+type+' without taking collision damage');
 assert.equal(tankCanCrush({t:'ferry',v:0},{t:type},10,1),false,
  'stationary ferry does not crush '+type);
}
assert.equal(tankCanCrush({t:'ferry',v:12},{t:'ferry'},10,10),false);
assert.equal(tankCanCrush({t:'ferry',v:12},{t:'cotxe'},10,1),false);
assert.equal(tankCanCrush({t:'llanxa',v:12},{t:'ferry'},1,10),false);
assert.ok(vehicleDynamics.types.ferry.mass>vehicleDynamics.types.tanc.mass,
 'ferry is physically heavier than tank');
assert.match(source('src/combat.js'),/canThrowGrenadeFromVehicle\(cv\)/);
assert.match(source('server/coop-combat.mjs'),/message.weapon==='grenade'&&!canThrowGrenadeFromVehicle\(vehicle\)/);
assert.match(source('src/game-core.js'),/tankCanCrush\(v,hit,ownMass,otherMass\)/);
assert.match(source('server/coop-vehicles.mjs'),/tankCanCrush\(v,other,vehicleDynamics.types\[v.t\].mass/);
console.log('OK: grenades blocked on armored/ferry, ferry armoring and damage-free marine ramming in solo/COOP');
