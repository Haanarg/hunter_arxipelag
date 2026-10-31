import {stepRangeVehicle} from './coop-vehicle-motion-core.mjs';
import {firstVehicleContact} from './coop-vehicle-contacts-core.mjs';
import {vehicleSpecs} from './vehicle-specs.mjs';
import {createPlayerSimulation} from './player-simulation.mjs';
import {createStaticWorldAdapter} from './world-adapter.mjs';
import {createCanonicalWater} from './canonical-water.mjs';
import {createNativeVehicleCandidateIndex} from './native-coop-vehicle-candidates.mjs';
// Only local locomotion is predicted. Damage, pickups, combat and world mutations
// remain authoritative. Reconciliation replays unacknowledged shared-rule steps.
export function createNativePrediction(geometry){
 let world=null,physical=null,water=null,lastPalmHealth=null,vehicleCandidates=null,vehicle=null,vehicleTick=0,modeKey=null,worldKey=null,sim=null,state=null,self=null,sequence=0,history=[],accumulator=0,enabled=false;
 function rebuild(next){
  const key=JSON.stringify([next.doorRevision,next.removedWalls,next.removedRoofs]);if(world&&key===worldKey){
   // Els deltes conserven la referència dels camps no modificats.
   if(lastPalmHealth!==next.palmHealth){world.setPalmHealth(next.palmHealth||[]);lastPalmHealth=next.palmHealth;}
   return;
  }
  physical=structuredClone(geometry);const walls=new Map(physical.walls.map(w=>[w.id,w]));
  for(const index of next.removedWalls||[])if(physical.walls[index])physical.walls[index].open=true;
  for(const door of next.doors||[]){const wall=walls.get(door.id);if(wall)wall.open=!!door.open||!!door.destroyed;}
  for(const index of next.removedRoofs||[])if(physical.buildings[index])Object.assign(physical.buildings[index],{rb:true,rhp:0});
  world=createStaticWorldAdapter(physical);
  water=createCanonicalWater(world.heightAt);
  world.setPalmHealth(next.palmHealth||[]);lastPalmHealth=next.palmHealth;
  worldKey=key;
 }
 function resetSimulation(next){sim=createPlayerSimulation({epoch:next.missionId,limit:world.limit,world,vertical:{surfaceAt:water.surfaceAt},checkpoint:{protocol:1,epoch:next.missionId,tick:next.tick,players:next.players}});}
 function step(input){
  if(vehicle){
   const from={...vehicle},size=vehicleSpecs.hitboxes[vehicle.t],radius=Math.hypot(...size)*vehicleSpecs.scales[vehicle.t]/2;
   stepRangeVehicle(vehicle,input,1/30,++vehicleTick,world,water,{x0:-world.limit,x1:world.limit,z0:-world.limit,z1:world.limit});
   const reach=radius+Math.hypot(vehicle.x-from.x,vehicle.z-from.z)+2,cx=(from.x+vehicle.x)/2,cz=(from.z+vehicle.z)/2,
    walls=physical.walls.filter(w=>w.x0<=cx+reach&&w.x1>=cx-reach&&w.z0<=cz+reach&&w.z1>=cz-reach),
    others=vehicleCandidates.nearby(cx,cz,reach),
    hit=firstVehicleContact(vehicle,from,others,{walls},true,world);
   if(hit){Object.assign(vehicle,hit.safe);vehicle.v=vehicle.sideV=vehicle.strafeV=0;}
   return;
  }
  const snapshot=sim.snapshot(),actor=snapshot.players.find(p=>p.id===self);sim.accept(self,{protocol:1,epoch:state.missionId,sequence:actor.acknowledged+1,input});sim.step();}
 function receive(next,id){
  const actor=next.players.find(p=>p.id===id);if(!actor)return;
  const same=state?.missionId===next.missionId;self=id;state=next;rebuild(next);
  // Un índex per snapshot autoritatiu substitueix 30 recorreguts/s
  // de la flota completa durant predicció i replay del pilot local.
  vehicleCandidates=createNativeVehicleCandidateIndex(next.vehicles);
  const seat=next.vehicles.find(v=>v.seats.includes(id)),driver=seat?.seats[0]===id,nextMode=seat?(driver?seat.id:'passenger:'+seat.id):'foot';vehicle=driver?structuredClone(seat):null;vehicleTick=next.tick;
  enabled=next.status==='running'&&['relay','extract'].includes(next.phase)&&actor.hp>0&&(!seat||driver);
  history=same&&enabled&&modeKey===nextMode?history.filter(frame=>frame.sequence>actor.acknowledged):[];sequence=same?Math.max(sequence,actor.acknowledged):actor.acknowledged;accumulator=0;modeKey=nextMode;resetSimulation(next);
  for(const frame of history)step(frame.input);
 }
 return {receive,sent(value){sequence=value;},advance(dt,input,active=true){
  if(!state||!sim)return null;
  if(enabled&&active){accumulator+=Math.min(.1,Math.max(0,dt));while(accumulator>=1/30&&history.length<12){const {interact,...movement}=input;step(movement);history.push({sequence,input:movement});accumulator-=1/30;}}
  else accumulator=0;
  const actor=sim.snapshot().players.find(p=>p.id===self);return vehicle?{...actor,x:vehicle.x,y:vehicle.y,z:vehicle.z,hd:vehicle.hd,fall:null,swimming:false}:actor;
 },vehicle:()=>vehicle,pending:()=>history.length};
}
