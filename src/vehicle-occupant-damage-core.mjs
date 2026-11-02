// Shared, deterministic protection and occupant hit resolution for both game modes.
// Pure rules: the host runtime owns physics, visual glass shards and state replication.
const OPEN_TYPES=new Set(['bici','moto','windsurf','barca_rems','moto_aquatica','llanxa','llanxa_coets','hover']);
export function isOpenVehicle(type){return OPEN_TYPES.has(type);}
export function createVehicleOccupantDamageState(type,seatIds=[]){
 return {glassBroken:isOpenVehicle(type),occupants:Object.fromEntries(seatIds.map(id=>[id,{alive:true}]))};
}
// Hit geometry is resolved by the caller using the nearest segment intersection.
// A pane is only eligible if it is ahead of the occupant along the actual bullet ray.
// First bullet stops at intact glass; later bullets can strike passengers.
export function resolveVehicleShot({type,state,glassHit=null,occupantHit=null,bodyHit=null,damage=0}){
 const hits=[glassHit&&{...glassHit,kind:'glass'},occupantHit&&{...occupantHit,kind:'occupant'},bodyHit&&{...bodyHit,kind:'vehicle'}]
   .filter(h=>h&&Number.isFinite(h.t)&&h.t>=0&&h.t<=1)
   .sort((a,b)=>a.t-b.t);
 for(const hit of hits){
   if(hit.kind==='glass'){
     if(!state.glassBroken){state.glassBroken=true;return {kind:'glass',damage:0,glassBroken:true};}
     continue;
   }
   if(hit.kind==='occupant'){
     const occupant=state.occupants[hit.seatId];
     if(!occupant?.alive)continue;
     return {kind:'occupant',seatId:hit.seatId,damage:Math.max(0,damage),glassBroken:state.glassBroken};
   }
   return {kind:'vehicle',damage:Math.max(0,damage),glassBroken:state.glassBroken};
 }
 return {kind:'miss',damage:0,glassBroken:state.glassBroken};
}
export function markOccupantDead(state,seatId){
 if(!state.occupants[seatId])return false;
 state.occupants[seatId].alive=false;
 return true;
}
export function selectReplacementDriver(state,driverSeatId='driver',otherSeatIds=[]){
 if(state.occupants[driverSeatId]?.alive)return null;
 return otherSeatIds.find(id=>state.occupants[id]?.alive)??null;
}
