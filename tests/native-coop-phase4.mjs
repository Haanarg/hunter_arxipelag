import assert from 'node:assert/strict';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {ferryLocal,ferryWorld,ferrySurfaceY,ferryPedestrianAt,
  ferryForVehicle,ferryCarriedPose} from '../src/ferry-deck-core.mjs';
import {createRelayVehicles} from '../server/coop-vehicles.mjs';
import {resolveCoopPlayerVehicleContact} from '../src/coop-vehicle-contacts-core.mjs';

const ferry={id:'f-1',t:'ferry',x:0,y:0,z:0,hd:.4,v:0,
 seats:['host',null],life:22};
const p=ferryWorld(ferry,0,-5),q=ferryLocal(ferry,p.x,p.z);
assert(Math.abs(q.x)<1e-9&&Math.abs(q.z+5)<1e-9);
assert.equal(ferrySurfaceY(ferry,0),vehicleSpecs.decks.ferry.y);
assert(ferryPedestrianAt(ferry,p.x,p.z,2.2));
assert.equal(ferryPedestrianAt(ferry,p.x,p.z,-4),null,
  'Una persona sota la quilla no pot pujar a la coberta');

const car={id:'car',t:'cotxe_civil',x:p.x,y:2.26,z:p.z,hd:ferry.hd,
 v:0,seats:[null,null],life:4};
assert.equal(ferryForVehicle(car,[ferry]),ferry);
assert.equal(ferryForVehicle({...car,x:100},[ferry]),null);
const cargo={...car,carrierId:ferry.id,carrierLX:q.x,carrierLZ:q.z,carrierHD:0};
const moved={...ferry,x:12,z:8,hd:.65},pose=ferryCarriedPose(cargo,moved),
 local=ferryLocal(moved,pose.x,pose.z);
assert(Math.abs(local.x-q.x)<1e-8&&Math.abs(local.z-q.z)<1e-8);
const contact=resolveCoopPlayerVehicleContact({x:p.x,y:2.2,z:p.z},
 {x:p.x,y:2.2,z:p.z,hd:0},[ferry],'guest');
assert(Math.hypot(contact.x-p.x,contact.z-p.z)<1e-8,
  'Un vianant sobre coberta no ha de ser expulsat pel casc');

const world={heightAt:()=>-12,groundAt:()=>-12,
 resolveBody:(_a,b)=>b,
 locomotionAt:()=>({floor:-12,terrain:-12,interior:false,basement:false,drop:false})};
const fleet=createRelayVehicles({meta:{id:'session',mode:'native',
 bounds:{x0:-200,x1:200,z0:-200,z1:200},vehicles:[ferry,car]},
 world:()=>world,water:{surfaceAt:()=>0},
 players:()=>[{id:'host',x:0,y:0,z:0,hp:25}],active:()=>true});
fleet.accept('host',{forward:1,turn:0,strafe:0,climb:0},0);
for(let tick=1;tick<=8;tick++)fleet.step(tick);
const [vessel,vehicle]=fleet.snapshot();
assert(Math.hypot(vessel.x,vessel.z)>.01,"El ferri ha d'avançar");
assert.equal(vehicle.carrierId,ferry.id);
const relative=ferryLocal(vessel,vehicle.x,vehicle.z);
assert(Math.abs(relative.x-q.x)<.01&&Math.abs(relative.z-q.z)<.01,
 'El vehicle aparcat no ha de quedar flotant al punt inicial');
assert.equal(vehicle.y,ferrySurfaceY(vessel,q.z)+.06);
console.log('Fase 4 COOP: ferri, coberta i transport autoritatiu OK');
