import {candidateVehicles,requisitionChance,requisitionRoll,vehicleSeatPosition,
  pursuitInput,REQUISITION} from '../src/enemy-vehicle-requisition.mjs';

// L'estat viu al soldat i a enemyCrew del vehicle; ambdós es desaran
// als checkpoints autoritatius del Worker. Sense clients alternatius.
export function createEnemyVehicleController({meta,vehicles,targets,players,
  visible=(a,b)=>true,navigate=()=>{},firePassenger=()=>{},world=()=>null}){
 const enabled=meta.mode==='native';
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function release(unit,tick){
  const state=unit.enemyRequisition;
  if(!state)return;
  const v=vehicles.live().find(v=>v.id===state.vehicleId);
  if(v&&state.seat===0&&v.enemyCrew?.[1]){
    const partner=targets.find(t=>t.id===v.enemyCrew[1]);
    if(partner&&partner.hp>0&&partner.enemyRequisition?.phase==='riding'&&
       vehicles.enemyPromote(v.id,unit.id,partner.id)){
      partner.enemyRequisition.seat=0;
      partner.enemyRequisition.phase='riding';
      partner.enemyRequisition.goal=state.goal;
      partner.enemyRequisition.lastContact=state.lastContact;
      partner.enemySeat=0;
    }else if(partner&&partner!==unit)release(partner,tick);
  }
  vehicles.enemyRelease(unit.id);
  if(v&&state.phase!=='approach'){
   const p=vehicleSeatPosition(v,state.seat);
   unit.x=p.x;unit.z=p.z;unit.y=world()?.heightAt?.(p.x,p.z)??v.y;
  }
  delete unit.enemyRequisition;delete unit.enemyVehicleId;delete unit.enemySeat;
  if(unit.hp>0){unit.state='search';unit.canSee=false;unit.focus=null;
    unit.lastSeenTick=tick;unit.investigateUntil=tick+240;
    unit.navRoute=null;unit.navDestination=null;}
 }
 function acquire(unit,actor,tick){
  if(!enabled||!unit||unit.hp<=0||unit.t!=='soldat'||unit.enemyRequisition||
     unit.elite||unit.rocketSoldier||unit.basement||!actor)return false;
  if(requisitionRoll(unit.id,meta.seed)>requisitionChance(meta.difficulty))return false;
  const choices=candidateVehicles(unit,vehicles.live(),{
   visible:(soldier,v)=>Math.abs(soldier.y-v.y)<4&&visible(
     {x:soldier.x,y:soldier.y+2,z:soldier.z},
     {x:v.x,y:v.y+1.6,z:v.z})
  });
  for(const c of choices){
   if(!vehicles.enemyReserve(c.vehicle.id,unit.id,c.seat))continue;
   unit.enemyRequisition={vehicleId:c.vehicle.id,seat:c.seat,
     phase:'approach',until:tick+480,waitUntil:0,
     lastContact:tick,goal:{x:actor.x,y:actor.y,z:actor.z}};
   unit.state='search';unit.focus=null;unit.canSee=false;
   unit.lastKnown=vehicleSeatPosition(c.vehicle,c.seat);
   unit.navRoute=null;unit.navDestination=null;
   return true;
  }
  return false;
 }
 function step(unit,tick){
  if(!enabled||!unit.enemyRequisition)return false;
  const s=unit.enemyRequisition,v=vehicles.live().find(v=>v.id===s.vehicleId);
  if(unit.hp<=0||!v||v.destroyed||v.enemyCrew?.[s.seat]!==unit.id){
   release(unit,tick);return false;
  }
  if(tick%3!==((unit.navPhase??=[...unit.id].reduce((n,c)=>n+c.charCodeAt(0),0)%3)))
   return true;
  if(s.phase==='approach'){
   if(tick>s.until){release(unit,tick);return false;}
   const door=vehicleSeatPosition(v,s.seat);
   if(distance(unit,door)>REQUISITION.boardingDistance){
    unit.lastKnown=door;unit.state='search';unit.canSee=false;
    navigate(unit,tick);return true;
   }
   s.phase=s.seat===0?'waiting':'riding';
   s.waitUntil=tick+(s.seat===0?Math.ceil(REQUISITION.passengerWaitSeconds*30):0);
   unit.enemyVehicleId=v.id;unit.enemySeat=s.seat;
   unit.state='vehicle';unit.x=v.x;unit.z=v.z;unit.y=v.y;
  }
  unit.x=v.x;unit.z=v.z;unit.y=v.y;unit.heading=v.hd;
  if(s.seat===1){
   const driver=v.enemyCrew?.[0];
   if(!driver)return true;
   if(s.phase==='riding')firePassenger(unit,v,tick);
   return true;
  }
  const partner=v.enemyCrew?.[1],
    ready=!!partner&&targets.some(t=>t.id===partner&&t.enemyRequisition?.phase==='riding');
  if(s.phase==='waiting'){
   // El conductor espera el company que també ha reservat una plaça.
   // Si no arriba en sis segons, continua la persecució tot sol.
   if(ready||tick>=s.waitUntil)s.phase='riding';
   else{vehicles.enemyAccept(v.id,unit.id,{forward:0,turn:0},tick);return true;}
  }
  let actor=null,best=Infinity;
  for(const p of players())if(p.hp>0&&!p.fall&&!p.swimming){
   const d=distance(v,p);if(d>REQUISITION.maxChaseDistance)continue;
   if(d<best&&visible({x:v.x,y:v.y+2,z:v.z},
       {x:p.x,y:p.y+1.6,z:p.z})){actor=p;best=d;}
  }
  if(actor){
   s.goal={x:actor.x,y:actor.y,z:actor.z};s.lastContact=tick;
  }
  if(tick-s.lastContact>REQUISITION.chaseMemorySeconds*30){
   release(unit,tick);return false;
  }
  const input=pursuitInput(v,s.goal,{passenger:ready,distance:best});
  vehicles.enemyAccept(v.id,unit.id,input,tick);
  return true;
 }
 return{acquire,step,release};
}
