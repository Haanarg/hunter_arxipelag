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

// Seat-sized glass zones are cheap analytic volumes (no mesh raycasts).
// Only the window on the actually intersected seat is shattered.
const COVERED=new Set(['cotxe','cotxe_civil','camio','heli','heli_combat']);
export function vehicleSeatWorld(v,seat=0,baseY=v.y??0){
 const scale=({camio:1.8125,cotxe:1.3,cotxe_civil:1.2,heli:1.75,heli_combat:1.82})[v.t]||1;
 const lx=v.t==='moto'?0:(seat===0?-1:1)*(v.t==='camio'?.62:.72)*scale;
 const lz=(v.t==='moto'?.4:v.t==='camio'?-.62:-.43)*scale;
 const ly=(v.t==='moto'?1.75:v.t==='camio'?1.7:1.48)*scale;
 const heading=v.hd??v.heading??0;
 return {x:v.x+Math.cos(heading)*lx+Math.sin(heading)*lz,
         y:baseY+ly,z:v.z-Math.sin(heading)*lx+Math.cos(heading)*lz};
}
export function segmentSeatSphere(from,to,center,radius){
 const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
 const ox=from.x-center.x,oy=from.y-center.y,oz=from.z-center.z;
 const a=dx*dx+dy*dy+dz*dz;
 if(a<=1e-12)return null;
 const b=ox*dx+oy*dy+oz*dz,c=ox*ox+oy*oy+oz*oz-radius*radius;
 const disc=b*b-a*c;if(disc<0)return null;
 const root=Math.sqrt(disc),t0=(-b-root)/a,t1=(-b+root)/a;
 return t0>=0&&t0<=1?t0:t1>=0&&t1<=1?t1:null;
}
// The hull is only hit if no seat volume lies on the trajectory. This
// prevents an intentionally oversized hull proxy from shielding occupants.
// Return a candidate; the caller must compare against world/terrain hits.
export function vehicleSeatProjectileContact(from,to,v,crew=[],{baseY=v.y??0}={}){
 if(!v||v.destroyed||v.sunk)return null;
 // Tripulacions protegides dins dels blindats: cap bala lleugera travessa el casc.
 if(v.t==='tanc'||v.t==='tanqueta')return null;
 const windowed=COVERED.has(v.t);
 const glass=new Set(v.brokenVehicleWindows||[]);
 let closest=null;
 for(let seat=0;seat<Math.max(crew.length,windowed?2:0);seat++){
   const member=crew[seat];
   const target=member&&member.hp!==0&&member.hp!==null&&member.alive!==false?member:null;
   if(!target&&!windowed)continue;
   const point=vehicleSeatWorld(v,seat,baseY);
   const tOccupant=target?segmentSeatSphere(from,to,point,v.t==='camio'?1.0:.82):null;
   const tGlass=windowed&&!glass.has(seat)?
     segmentSeatSphere(from,to,point,v.t==='camio'?1.27:1.08):null;
   // Never let an occupant behind intact glass absorb the same bullet.
   const candidate=tGlass!=null&&
       (tOccupant==null||tGlass<=tOccupant+1e-6)?
     {kind:'vehicle-glass',seat,target:null,t:tGlass,point}:
     tOccupant!=null?{kind:'vehicle-occupant',seat,target,t:tOccupant,point}:null;
   if(candidate&&(!closest||candidate.t<closest.t))closest=candidate;
 }
 return closest;
}
export function breakVehicleSeatWindow(v,seat){
 if(!Number.isInteger(seat)||seat<0||seat>1||!COVERED.has(v?.t))return false;
 v.brokenVehicleWindows??=[];
 if(v.brokenVehicleWindows.includes(seat))return false;
 v.brokenVehicleWindows.push(seat);return true;
}
export const vehicleGlassHasCover=type=>COVERED.has(type);
