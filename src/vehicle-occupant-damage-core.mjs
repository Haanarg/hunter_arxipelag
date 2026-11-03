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
// Punt visual del cap dels occupants asseguts. La retícula segueix
// la posició del rider reutilitzat i no el centre baix del seient.
export function vehicleOccupantHeadWorld(v,seat=0,baseY=v.y??0){
 const scale=({camio:1.8125,cotxe:1.3,cotxe_civil:1.2,moto:1.2})[v.t]||1;
 const truck=v.t==='camio',motorbike=v.t==='moto',civil=v.t==='cotxe_civil';
 const fit=truck?.82:1;
 const lx=motorbike?0:(seat===0?-1:1)*(truck?.77*fit:civil?.613:.73);
 const lz=truck?-1.93*fit:civil?-.60:motorbike?.28:-.43;
 const ly=truck?2.04*fit+2.65*.31:motorbike?1.82+.85*.4:.94+2.65*.43;
 const h=v.hd??v.heading??0;
 return {x:v.x+Math.cos(h)*lx*scale+Math.sin(h)*lz*scale,
         y:baseY+ly*scale,
         z:v.z-Math.sin(h)*lx*scale+Math.cos(h)*lz*scale};
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
   const head=vehicleOccupantHeadWorld(v,seat,baseY);
   const tBody=target?segmentSeatSphere(from,to,point,v.t==='camio'?1.0:.82):null;
   const tHead=target?segmentSeatSphere(from,to,head,v.t==='camio'?.72:.58):null;
   const tOccupant=tBody===null?tHead:tHead===null?tBody:Math.min(tBody,tHead);
   // El primer impacte continua trencant el vidre, també quan
   // la bala apunta a la nova diana del cap.
   const tGlassBody=windowed&&!glass.has(seat)?
     segmentSeatSphere(from,to,point,v.t==='camio'?1.27:1.08):null;
   const tGlassHead=windowed&&!glass.has(seat)?
     segmentSeatSphere(from,to,head,v.t==='camio'?.93:.78):null;
   const tGlass=tGlassBody===null?tGlassHead:
     tGlassHead===null?tGlassBody:Math.min(tGlassBody,tGlassHead);
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

 // Patrulleres: els dos soldats són dianes independents del casc. Les
 // tres peces del parabrisa es poden trencar separadament. Mateixes dades
 // geomètriques al client i al Worker, sense raycast de malles Three.js.
export const MARINE_CREW_HP=10;
const MARINE_SCALE=1.95;
const MARINE_GLASS_X=[-.72*(2.75*.43),0,.72*(2.75*.43)];
const MARINE_GLASS_W=[2.75*.25,2.75*.34,2.75*.25];
export function marineCrewHeadWorld(boat,seat=0,baseY=boat.y??0){
  const h=boat.hd??boat.heading??0,s=MARINE_SCALE,
    x=(seat? .58:-.58)*s,z=(seat?1.14:.88)*s,
    y=(.89+2.65*.43)*s;
  return {x:boat.x+Math.cos(h)*x+Math.sin(h)*z,
    y:baseY+y,z:boat.z-Math.sin(h)*x+Math.cos(h)*z};
}
export function marineCrewProjectileContact(from,to,boat,{baseY=boat.y??0}={}){
  if(!boat||boat.destroyed||boat.hp===0)return null;
  const h=boat.hd??boat.heading??0,s=MARINE_SCALE,
    c=Math.cos(h),sn=Math.sin(h),hp=boat.marineCrewHp??[MARINE_CREW_HP,MARINE_CREW_HP],
    broken=boat.marineBrokenWindshield??[],
    local=p=>({x:((p.x-boat.x)*c-(p.z-boat.z)*sn)/s,
      y:(p.y-baseY)/s,z:((p.x-boat.x)*sn+(p.z-boat.z)*c)/s});
  let closest=null;
  const choose=hit=>{if(hit&&(!closest||hit.t<closest.t))closest=hit};
  const a=local(from),b=local(to);
  // El tret des de la proa travessa primer el panell real del parabrisa.
  const dz=b.z-a.z;
  if(Math.abs(dz)>1e-8&&((a.z<=-.65&&b.z>=-.65)||(a.z>=-.65&&b.z<=-.65))){
    const t=(-.65-a.z)/dz,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    if(y>=1.34&&y<=2.15)for(let pane=0;pane<3;pane++){
      if(broken.includes(pane)||Math.abs(x-MARINE_GLASS_X[pane])>MARINE_GLASS_W[pane]*.5)continue;
      choose({kind:'marine-glass',pane,t});
    }
  }
  for(let seat=0;seat<2;seat++){
    if(!(hp[seat]>0))continue;
    const head=marineCrewHeadWorld(boat,seat,baseY),
      body={x:head.x,y:baseY+(.89+1.25*.43)*s,z:head.z};
    const tHead=segmentSeatSphere(from,to,head,.63*s),
      tBody=segmentSeatSphere(from,to,body,.51*s);
    const t=tHead===null?tBody:tBody===null?tHead:Math.min(tHead,tBody);
    if(t!==null)choose({kind:'marine-crew',seat,t});
  }
  return closest;
}
export function breakMarineWindshield(boat,pane){
  if(!boat||!Number.isInteger(pane)||pane<0||pane>2)return false;
  boat.marineBrokenWindshield??=[];
  if(boat.marineBrokenWindshield.includes(pane))return false;
  boat.marineBrokenWindshield.push(pane);return true;
}
export function damageMarineCrew(boat,seat,damage){
  if(!boat||!Number.isInteger(seat)||seat<0||seat>1)return false;
  boat.marineCrewHp??=[MARINE_CREW_HP,MARINE_CREW_HP];
  const before=boat.marineCrewHp[seat];
  if(!(before>0)||!(damage>0))return false;
  boat.marineCrewHp[seat]=Math.max(0,before-Math.ceil(damage));
  return boat.marineCrewHp[seat]<before;
}
