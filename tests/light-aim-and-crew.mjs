import assert from 'node:assert/strict';
import {createAimSelector} from '../src/aiming-core.mjs';
import {vehicleSeatWorld,vehicleSeatProjectileContact,breakVehicleSeatWindow,
  selectReplacementDriver,createVehicleOccupantDamageState} from '../src/vehicle-occupant-damage-core.mjs';

function aim(shotClass='pistol'){
 const focus={},selector=createAimSelector({
   origin:{x:0,y:2,z:0},direction:[0,0,-1],range:100,cone:.82,
   shotClass,focus,isClear:()=>true
 });
 return {selector,focus};
}
let {selector,focus}=aim();
const soldier={t:'soldat'},jeep={t:'cotxe'};
selector.consider(soldier,'enemy',0,5,2,-18);
selector.consider(jeep,'vehicle',1,0,2,-25);
assert.equal(focus.target,jeep,'Light weapons select the closest target to view center, not category');
({selector,focus}=aim());
selector.consider(jeep,'vehicle',1,4,2,-20);
selector.consider(soldier,'enemy',0,0,2,-16);
assert.equal(focus.target,soldier,'Red crosshair must follow centered soldier');
({selector,focus}=aim('heavy'));
selector.consider(soldier,'enemy',0,5,2,-18);
selector.consider(jeep,'vehicle',1,0,2,-25);
assert.equal(focus.target,soldier,'Bazooka retains higher-priority hostile infantry');

const car={t:'cotxe',x:0,y:0,z:-12,hd:0,brokenVehicleWindows:[]};
const driver={hp:4},passenger={hp:4};
const center=vehicleSeatWorld(car,0,0),
  from={x:center.x,y:center.y,z:0},
  to={x:center.x,y:center.y,z:-24};
let hit=vehicleSeatProjectileContact(from,to,car,[driver,passenger]);
assert.equal(hit.kind,'vehicle-glass');
assert.equal(hit.seat,0);
assert.equal(driver.hp,4);
assert.equal(breakVehicleSeatWindow(car,0),true);
assert.equal(breakVehicleSeatWindow(car,0),false,'Breaking is idempotent');
hit=vehicleSeatProjectileContact(from,to,car,[driver,passenger]);
assert.equal(hit.kind,'vehicle-occupant');
assert.equal(hit.target,driver);
assert.equal(driver.hp,4,'Collision selection does not mutate the health until authoritative damage');
const other=vehicleSeatWorld(car,1,0);
hit=vehicleSeatProjectileContact({x:other.x,y:other.y,z:0},{x:other.x,y:other.y,z:-24},car,[driver,passenger]);
assert.equal(hit.kind,'vehicle-glass','Each seat glass state stays independent');
const state=createVehicleOccupantDamageState('cotxe',['driver','passenger']);
state.occupants.driver.alive=false;
assert.equal(selectReplacementDriver(state,'driver',['passenger']),'passenger');
const boat={t:'llanxa',x:0,y:0,z:-12,hd:0};
const openCenter=vehicleSeatWorld(boat,0,0);
hit=vehicleSeatProjectileContact({x:openCenter.x,y:openCenter.y,z:0},
  {x:openCenter.x,y:openCenter.y,z:-24},boat,[driver]);
assert.equal(hit.kind,'vehicle-occupant','Open boats expose occupants without breakable cabin panes');
console.log('Center aim, bazooka priority, glass first hit and separate occupant HP: OK');
