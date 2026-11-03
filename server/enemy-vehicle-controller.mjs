import {candidateVehicles,requisitionChance,requisitionRoll,vehicleSeatPosition,
  pursuitInput,observeFleeing,boatBoardingReady,requisitionBoat,avoidVehicleBarbedWire,REQUISITION} from '../src/enemy-vehicle-requisition.mjs';

// L'estat viu al soldat i a enemyCrew del vehicle; ambdós es desaran
// als checkpoints autoritatius del Worker. Sense clients alternatius.
export function createEnemyVehicleController({meta,vehicles,targets,players,
  navigate=()=>{},firePassenger=()=>{},world=()=>null,geometry=()=>({piers:[],stairs:[]})}){
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
 function acquire(unit,actor,tick,{fleeing=false}={}){
  if(!enabled||!unit||unit.hp<=0||unit.t!=='soldat'||unit.enemyRequisition||
     unit.elite||unit.rocketSoldier||unit.basement||!actor||
     distance(unit,actor)>(fleeing?REQUISITION.fleeingNoticeRadius:REQUISITION.noticeRadius))return false;
  if(requisitionRoll(unit.id,meta.seed)>=requisitionChance(meta.difficulty,fleeing))return false;
  const dock=geometry();
  const choices=candidateVehicles(unit,vehicles.live(),{
   range:fleeing?REQUISITION.fleeingSearchRadius:REQUISITION.searchRadius,
   piers:dock.piers||[],stairs:dock.stairs||[]
  });
  for(const c of choices){
   if(!vehicles.enemyReserve(c.vehicle.id,unit.id,c.seat))continue;
   unit.enemyRequisition={vehicleId:c.vehicle.id,seat:c.seat,
     phase:'approach',until:tick+(c.dockRoute?960:480),waitUntil:0,
     lastContact:tick,fleeUntil:fleeing?tick+Math.ceil(REQUISITION.fleeingMemorySeconds*30):0,
     goal:{x:actor.x,y:actor.y,z:actor.z},
     dockRoute:c.dockRoute,dockIndex:0};
   unit.state='search';unit.focus=null;unit.canSee=false;
   unit.lastKnown=vehicleSeatPosition(c.vehicle,c.seat);
   unit.navRoute=null;unit.navDestination=null;
   return true;
  }
  return false;
 }
 function tryAcquire(unit,tick){
  if(!enabled||!unit||unit.hp<=0||unit.t!=='soldat'||unit.enemyRequisition||
     unit.elite||unit.rocketSoldier||unit.basement)return false;
  // Mateixa cadència de 10 Hz que la IA de navegació: evita un cost per frame.
  if(tick%3!==((unit.navPhase??=[...unit.id].reduce((n,c)=>n+c.charCodeAt(0),0)%3)))return false;
  const nearby=players().filter(p=>p.hp>0&&!p.fall&&!p.swimming)
    .map(p=>({p,d:distance(unit,p)}))
    .sort((a,b)=>a.d-b.d);
  const actor=nearby[0]?.p;if(!actor)return false;
  const tracking=unit.enemyFleeTracking??={};
  const fleeing=observeFleeing(unit,actor,tick/30,tracking);
  const justFled=fleeing&&!unit.enemyRequisitionWasFleeing;
  unit.enemyRequisitionWasFleeing=fleeing;
  if(nearby[0].d>(fleeing?REQUISITION.fleeingNoticeRadius:REQUISITION.noticeRadius)||
     tick<(unit.enemyRequisitionNextTry||0)&&!justFled)return false;
  unit.enemyRequisitionNextTry=tick+Math.ceil(REQUISITION.retrySeconds*30);
  return acquire(unit,actor,tick,{fleeing});
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
   const boat=requisitionBoat(v.t),route=s.dockRoute;
   if(boat&&!route?.length){release(unit,tick);return false;}
   if(boat)while(s.dockIndex<route.length-1&&
      distance(unit,route[s.dockIndex])<2.2)s.dockIndex++;
   const door=boat?route[Math.min(s.dockIndex,route.length-1)]:
      vehicleSeatPosition(v,s.seat);
   if(boat?!boatBoardingReady(unit,v,route):
      distance(unit,door)>REQUISITION.boardingDistance){
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
   const d=distance(v,p);
   const tracking=(s.fleeTracking??={})[p.id]??={};
   s.fleeTracking[p.id]=tracking;
   const fleeing=observeFleeing(v,p,tick/30,tracking);
   if(fleeing)s.fleeUntil=tick+Math.ceil(REQUISITION.fleeingMemorySeconds*30);
   if(d>(tick<(s.fleeUntil||0)?REQUISITION.fleeingChaseDistance:REQUISITION.maxChaseDistance))continue;
   if(d<best){actor=p;best=d;}
  }
  if(actor){
   s.goal={x:actor.x,y:actor.y,z:actor.z};s.lastContact=tick;
  }
  if(tick-s.lastContact>REQUISITION.chaseMemorySeconds*30){
   release(unit,tick);return false;
  }
  const planned=pursuitInput(v,s.goal,{passenger:ready,distance:best});
  const input=avoidVehicleBarbedWire(v,planned,geometry().walls||[],
    s.fenceAvoid??={});
  vehicles.enemyAccept(v.id,unit.id,input,tick);
  return true;
 }
 return{acquire,tryAcquire,step,release};
}
