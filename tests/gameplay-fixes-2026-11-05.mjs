// Regressions dels ajustos de navegació i vidres (solo i COOP).
import assert from 'node:assert/strict';
import {advanceVehicle,vehicleDynamics} from '../src/vehicle-dynamics-core.mjs';
import {vehicleOccupantHeadWorld,vehicleSeatProjectileContact,breakVehicleSeatWindow} from '../src/vehicle-occupant-damage-core.mjs';
import {stepMarinePatrol} from '../src/patrol-motion-core.mjs';

for(const type of ['llanxa','llanxa_coets','ferry','moto_aquatica','barca_rems','windsurf']){
 const v={t:type,hd:0,v:0,driveInput:0,steerInput:0,yawRate:0,sideV:0,strafeV:0};
 advanceVehicle(v,0,1,.5);
 assert.equal(v.hd,0,type+' no pot girar sense desplaçament');
 assert.equal(v.yawRate,0,type+' ha de frenar el gir en aturar-se');
 assert.equal(vehicleDynamics.types[type].m,'w');
}

const truck={t:'camio',x:0,z:0,hd:0,y:0,brokenVehicleWindows:[]};
const head=vehicleOccupantHeadWorld(truck,0,0),
 from={x:head.x-10,y:head.y,z:head.z},
 to={x:head.x+2,y:head.y,z:head.z};
let hit=vehicleSeatProjectileContact(from,to,truck,[{hp:10},null],{baseY:0});
assert.equal(hit?.kind,'vehicle-glass','el primer tir lateral ha de trencar el vidre del conductor');
assert.equal(hit.seat,0);
breakVehicleSeatWindow(truck,0);
hit=vehicleSeatProjectileContact(from,to,truck,[{hp:10},null],{baseY:0});
assert.equal(hit?.kind,'vehicle-occupant','el següent tir lateral pot ferir el conductor');

const boat={t:'patrulla_marina',x:0,z:0,y:0,heading:0,hd:0,
 speed:0,yawRate:0,tx:0,tz:-200,wt:10,home:{x:0,z:0}};
stepMarinePatrol(boat,{
 dt:.1,heightAt:()=>-12,waterAt:()=>0,limit:2500,
 random:()=>.5,trafficClear:()=>true,target:{x:0,z:-40,swimming:true}
});
assert.equal(boat.marineCourse.goalX,0);
assert.equal(boat.marineCourse.goalZ,-40,'una patrullera ha de perseguir directament un nedador');
assert.ok(boat.z<0,'una patrullera ha de començar a acostar-se al nedador');
console.log('OK: embarcacions, persecució de nedadors i vidres de camió');
