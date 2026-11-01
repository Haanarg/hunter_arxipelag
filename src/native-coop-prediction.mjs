import {stepRangeVehicle} from './coop-vehicle-motion-core.mjs';
import {firstVehicleContact,resolveCoopPlayerVehicleContact} from './coop-vehicle-contacts-core.mjs';
import {vehicleSpecs} from './vehicle-specs.mjs';
import {createPlayerSimulation} from './player-simulation.mjs';
import {createStaticWorldAdapter} from './world-adapter.mjs';
import {createCanonicalWater} from './canonical-water.mjs';
import {createNativeVehicleCandidateIndex} from './native-coop-vehicle-candidates.mjs';
import {createNativeWallCandidateIndex} from './native-coop-wall-candidates.mjs';
import {createNativeLocalPresentation} from './native-coop-local-presentation.mjs';
import {moveCoopCheatFly} from './coop-cheats.mjs';
import {ferryPedestrianAt,ferryForVehicle,ferryLocal,ferrySurfaceY} from './ferry-deck-core.mjs';
// Only local locomotion is predicted. Damage, pickups, combat and world mutations
// remain authoritative. Reconciliation replays unacknowledged shared-rule steps.
export function createNativePrediction(geometry){
 const presentation=createNativeLocalPresentation();
 presentation.stats.subtickBuilds=0;
 presentation.stats.subtickFrames=0;
 const radiusByType=Object.fromEntries(Object.entries(vehicleSpecs.hitboxes).map(([type,size])=>
  [type,Math.hypot(...size)*vehicleSpecs.scales[type]/2]));
 let world=null,playerWorld=null,physical=null,water=null,vehicleBounds=null,lastPalmHealth=null,vehicleCandidates=null,wallCandidates=null,vehicle=null,vehicleTick=0,modeKey=null,worldKey=null,sim=null,state=null,self=null,sequence=0,history=[],accumulator=0,enabled=false;
 let preview=null,lastInput=null;
 const sameControl=(a,b)=>!!a&&!!b&&
  ['forward','turn','strafe','climb'].every(k=>
    Math.abs((a[k]||0)-(b[k]||0))<.015)&&
  a.run===b.run&&a.crouch===b.crouch;
 const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
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
  playerWorld={...world,locomotionAt(x,z,y){
     const base=world.locomotionAt(x,z,y);
     for(const f of state?.vehicles||[])if(f.t==='ferry'){
       const deck=ferryPedestrianAt(f,x,z,y);
       if(deck)return {...base,floor:Math.max(base.floor,deck.y),
         interior:false,basement:false,drop:false};
     }
     return base;
   },resolveBody:(previous,candidate)=>resolveCoopPlayerVehicleContact(previous,world.resolveBody(previous,candidate),state?.vehicles,previous.id)};
  vehicleBounds={x0:-world.limit,x1:world.limit,z0:-world.limit,z1:world.limit};
  wallCandidates=createNativeWallCandidateIndex(physical.walls);
  water=createCanonicalWater(world.heightAt);
  world.setPalmHealth(next.palmHealth||[]);lastPalmHealth=next.palmHealth;
  worldKey=key;
 }
 function resetSimulation(next){sim=createPlayerSimulation({
   epoch:next.missionId,limit:world.limit,world:playerWorld,
   vertical:{surfaceAt:water.surfaceAt},
   checkpoint:{protocol:1,epoch:next.missionId,tick:next.tick,players:next.players},
   immune:()=>!!next.cheats?.immune,
   movement:(actor,input)=>next.cheats?.fly?
     moveCoopCheatFly(actor,input,{limit:world.limit,heightAt:(x,z)=>world.heightAt(x,z)}):null
  });}
 // Única física de vehicle compartida per al pas real i per al
 // pas visual temporal. La projecció temporal usa una CÒPIA i mai
 // altera el vehicle físic que verifica les col·lisions.
 function vehicleStep(target,input,tick){
  const from={x:target.x,y:target.y,z:target.z,hd:target.hd},
   radius=radiusByType[target.t];
  // La física sobre el ferri usa l'altura de la coberta en tots dos clients.
   const dynamicWorld={...world,groundAt(x,z,previous){
     const ground=world.groundAt?.(x,z,previous)??world.heightAt(x,z);
     const ferry=ferryForVehicle(target,state?.vehicles||[],x,z,true);
     return ferry?Math.max(ground,ferrySurfaceY(ferry,ferryLocal(ferry,x,z).z)):ground;
   }};
   stepRangeVehicle(target,input,1/30,tick,dynamicWorld,water,vehicleBounds);
  const reach=radius+Math.hypot(target.x-from.x,target.z-from.z)+2,
   cx=(from.x+target.x)/2,cz=(from.z+target.z)/2,
   walls=wallCandidates.nearby(cx,cz,reach),
   others=vehicleCandidates.nearby(cx,cz,reach),
   hit=firstVehicleContact(target,from,others,{walls},true,world);
  if(hit){Object.assign(target,hit.safe);target.v=target.sideV=target.strafeV=0;}
 }
 function step(input){
  preview=null;
  if(vehicle){vehicleStep(vehicle,input,++vehicleTick);return;}
  const snapshot=sim.snapshot(),actor=snapshot.players.find(p=>p.id===self);
  sim.accept(self,{protocol:1,epoch:state.missionId,sequence:actor.acknowledged+1,input});
  sim.step();
 }
 function rawPose(){
  const actor=sim.snapshot().players.find(p=>p.id===self);
  return vehicle?{...actor,x:vehicle.x,y:vehicle.y,z:vehicle.z,hd:vehicle.hd,
    fall:null,swimming:false}:actor;
 }
 // El render pot anar a 240 FPS, però la física avança a 30 Hz.
 // Calculam el següent pas una sola vegada per tick/input sobre una
 // còpia de l'estat, i el dibuixam entre dos ticks sense retard addicional.
 // El pas REAL segueix essent únicament el que executa step().
 function visualPose(input){
  const current=rawPose(),alpha=Math.max(0,Math.min(1,accumulator*30));
  if(!enabled||alpha<=0||!input)return current;
  const tick=vehicle?vehicleTick:sim.snapshot().tick;
  if(!preview||preview.tick!==tick||!sameControl(preview.input,input)){
   const {interact,...movement}=input;
   let next;
   if(vehicle){
    const future={...vehicle};
    vehicleStep(future,movement,vehicleTick+1);
    next=future;
   }else{
    const snap=sim.snapshot(),probe=createPlayerSimulation({epoch:state.missionId,
      limit:world.limit,world:playerWorld,vertical:{surfaceAt:water.surfaceAt},
      immune:()=>!!state.cheats?.immune,
      movement:(actor,input)=>state.cheats?.fly?
        moveCoopCheatFly(actor,input,{limit:world.limit,heightAt:(x,z)=>world.heightAt(x,z)}):null,
      checkpoint:{protocol:1,epoch:state.missionId,tick:snap.tick,players:snap.players}});
    const actor=snap.players.find(p=>p.id===self);
    probe.accept(self,{protocol:1,epoch:state.missionId,
      sequence:actor.acknowledged+1,input:movement});
    next=probe.step().players.find(p=>p.id===self);
   }
   preview={tick,input:movement,next};
   presentation.stats.subtickBuilds++;
  }
  const target=preview.next;
  presentation.stats.subtickFrames++;
  return {...current,
   x:current.x+(target.x-current.x)*alpha,
   y:current.y+(target.y-current.y)*alpha,
   z:current.z+(target.z-current.z)*alpha,
   hd:current.hd+angle(target.hd-current.hd)*alpha};
 }
 function receive(next,id){
  const actor=next.players.find(p=>p.id===id);if(!actor)return;
  const same=state?.missionId===next.missionId,
    fleetUnchanged=same&&state.vehicles===next.vehicles;
  self=id;state=next;rebuild(next);
  const seat=next.vehicles.find(v=>v.seats.includes(id)),driver=seat?.seats[0]===id,
    nextMode=(seat?(driver?seat.id:'passenger:'+seat.id):'foot')+(next.cheats?.fly?':fly':'');
  vehicle=driver?structuredClone(seat):null;vehicleTick=next.tick;
  // Només el conductor fa comprovacions de col·lisió predictives.
  // Reutilitzar l'índex si el delta no ha canviat cap vehicle.
  vehicleCandidates=driver?
    (fleetUnchanged&&vehicleCandidates?vehicleCandidates:
     createNativeVehicleCandidateIndex(next.vehicles)):null;
  const nextEnabled=next.status==='running'&&['relay','extract'].includes(next.phase)&&actor.hp>0&&(!seat||driver),
    continuous=same&&enabled&&nextEnabled&&modeKey===nextMode;
  enabled=nextEnabled;
  history=continuous?history.filter(frame=>frame.sequence>actor.acknowledged):[];
  sequence=same?Math.max(sequence,actor.acknowledged):actor.acknowledged;
  // El temps fraccionari local és independent del ritme dels paquets de
  // 10 Hz. Descartar-lo a cada estat canviava la cadència dels passos.
  if(!continuous)accumulator=0;
  modeKey=nextMode;resetSimulation(next);preview=null;
  for(const frame of history)step(frame.input);
  presentation.reconcile(visualPose(lastInput),{continuous,driving:!!vehicle});
 }
 return {receive,sent(value){sequence=value;},advance(dt,input,active=true){
  if(!state||!sim)return null;
  if(enabled&&active){accumulator+=Math.min(.1,Math.max(0,dt));while(accumulator>=1/30&&history.length<12){const {interact,...movement}=input;step(movement);history.push({sequence,input:movement});accumulator-=1/30;}}
  else accumulator=0;
  // Una tecla canviada a mig tick invalida el pas futur.
  // Conservam la càmera fins a la nova trajectòria per no produir un
  // salt quan deixam d'accelerar o canviam de direcció.
  const changedInput=preview&&preview.tick===(vehicle?vehicleTick:sim.snapshot().tick)&&
    !sameControl(preview.input,input);
  lastInput=input;
  const visual=visualPose(input);
  if(changedInput&&enabled&&active)
    presentation.reconcile(visual,{continuous:true,driving:!!vehicle});
  return presentation.present(visual,dt,active&&state.status==='running');
 },vehicle:()=>vehicle,pending:()=>history.length,
 stats:presentation.stats};
}
