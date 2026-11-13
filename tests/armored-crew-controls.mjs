// Contracte: tripulació de blindats, apuntat i inputs autoritatius COOP.
import assert from 'node:assert/strict';
import {isArmoredTurretVehicle,turretControllerId,armoredSeatRole,stepManualTurret,turretSpecs} from '../src/vehicle-turret-core.mjs';
import {validatePlayerInput} from '../src/player-simulation.mjs';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const type of ['tanc','tanqueta']){
 assert(isArmoredTurretVehicle(type));
 const v={t:type,seats:['first',null],turretYaw:0,turretPitch:0};
 assert.equal(turretControllerId(v),'first');
 assert.equal(armoredSeatRole(v,'first'),'driver');
 stepManualTurret(v,type,1,1,.1);
 assert(v.turretYaw>0&&v.turretPitch>0);
 const yaw=v.turretYaw;
 stepManualTurret(v,type,0,0,.1);
 assert.equal(v.turretYaw,yaw);
 stepManualTurret(v,type,0,1,20);
 assert(v.turretPitch<=turretSpecs[type].turretMaxPitch);
 v.seats[1]='second';
 assert.equal(turretControllerId(v),'second');
 assert.equal(armoredSeatRole(v,'second'),'gunner');
 assert.equal(armoredSeatRole(v,'first'),'driver');
 assert.equal(armoredSeatRole(v,'other'),null);
 v.seats[0]=null;
 assert.equal(turretControllerId(v),'second');
}
assert(!isArmoredTurretVehicle('cotxe'));
assert.equal(turretControllerId({t:'cotxe',seats:['one','two']}),null);
const valid={forward:0,turn:0,strafe:0,run:false,crouch:false,fire:true,
 manualTurret:true,turretTurn:-1,turretLift:1};
assert(validatePlayerInput(valid));
for(const bad of [{...valid,turretLift:1.1},{...valid,manualTurret:1},{...valid,turretTurn:Infinity},{...valid,turretRole:'driver'}])
 assert(!validatePlayerInput(bad));
const combat=read('server/coop-combat.mjs'),vehicle=read('server/coop-vehicles.mjs'),
      client=read('src/coop-world-runtime.js'),game=read('src/game-core.js'),
      lab=read('src/vehicles-externs-proves.mjs'),html=read('vehicles-externs-proves.html');
assert(combat.includes("if(roleLocked)code='ROLE_LOCKED'"));
assert(combat.includes("turretControllerId(vehicle)!==actorId"));
assert(combat.includes("vehicles.turretInput(controllerId,tick)"));
assert(combat.includes("stepManualTurret(vehicle,vehicle.t"));
assert(vehicle.includes("v.seats[v.seats.indexOf(null)]=actorId"));
assert(vehicle.includes("turretControllerId(v)!==actorId"));
assert(client.includes("manualTurret:turretManual"));
assert(client.includes("armoredCanFire()"));
assert(game.includes("armoredTurretButton.id='armoredTurretButton'"));
assert(game.includes("manualTurret(cv.o,cv.t,tr,f,dt)"));
assert(!lab.includes("const adjustment={j:"));
for(const id of ['t90Throttle','t90Steer','t90Yaw','t90Elevation'])assert(!html.includes('id="'+id+'"'));
assert(html.includes('id="t90LabTurret"'));
console.log('PASS armored crew controls: seat priority, automatic/manual, role locking, UI and protocol');
