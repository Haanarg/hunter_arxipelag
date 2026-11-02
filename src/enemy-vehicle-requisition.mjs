// IA de requisa de vehicles neutrals: regles compartides SOLO / COOP.
import {vehicleDynamics} from './vehicle-dynamics-core.mjs';
import {vehicleSeatCount} from './vehicle-specs.mjs';
const ELIGIBLE=new Set(['cotxe','cotxe_civil','camio','tanc','tanqueta','moto']);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const REQUISITION=Object.freeze({
  searchRadius:35, fleeingSearchRadius:70,
  noticeRadius:110, fleeingNoticeRadius:190,
  boardingDistance:3.1, passengerWaitSeconds:6,
  chaseMemorySeconds:12, maxChaseDistance:180, fleeingChaseDistance:260,
  fleeingSpeed:6, fleeingRadialSpeed:4, fleeingMemorySeconds:2.5,
  retrySeconds:3
});
export function requisitionChance(difficulty=1,fleeing=false){
  const level=Number(difficulty);
  const base=level<.8?.25:level<1.25?.50:.75;
  return fleeing?Math.min(.95,base+.20):base;
}
// Detectam fugida real: el jugador es mou de pressa i s'allunya del soldat.
// La memòria curta impedeix canvis constants per frenades o girs.
export function observeFleeing(unit,target,time,tracking){
  if(!unit||!target||!tracking||!Number.isFinite(time))return false;
  const id=target.id??target.saveId??'player',prev=tracking.last;
  if(prev&&prev.id===id){
    const dt=time-prev.time;
    if(dt>=.025&&dt<=1.25){
      const mx=target.x-prev.x,mz=target.z-prev.z,
            dx=target.x-unit.x,dz=target.z-unit.z,
            radial=(mx*dx+mz*dz)/Math.max(1,Math.hypot(dx,dz))/dt;
      if(Math.hypot(mx,mz)/dt>=REQUISITION.fleeingSpeed&&
         radial>=REQUISITION.fleeingRadialSpeed)
        tracking.until=time+REQUISITION.fleeingMemorySeconds;
    }
  }
  tracking.last={id,x:target.x,z:target.z,time};
  return (tracking.until||0)>time;
}
export function requisitionRoll(id,seed=0){
  const str=String(id??''),n=Number.isFinite(+seed)?+seed:0;
  let h=(2166136261^(n>>>0))>>>0;
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
  h^=h>>>16;h=Math.imul(h,2246822507);h^=h>>>13;
  return(h>>>0)/4294967296;
}
export function vehicleSeatPosition(v,seat=0){
  const side=seat?1:-1,h=v.hd||0;
  const lateral=({cotxe:3.45,cotxe_civil:2.75,camio:3.75,tanc:5.2,tanqueta:4.5,moto:1.8})[v.t]||3.3;
  return{x:v.x+Math.cos(h)*lateral*side+Math.sin(h)*.4,
         z:v.z-Math.sin(h)*lateral*side+Math.cos(h)*.4};
}
export function candidateVehicles(unit,vehicles,{range=REQUISITION.searchRadius}={}){
  const list=[];
  for(const v of vehicles){
    if(!v||!ELIGIBLE.has(v.t)||v.destroyed||v.sunk||v.carrier||v.carrierId||v.waterIngress?.dead||
       Math.abs(v.v||0)>1.5||v.seats?.some(Boolean))continue;
    const crew=v.enemyCrew||[null,null];
    const seat=crew[0]?(crew[1]? -1:1):0;
    if(seat<0||seat>=vehicleSeatCount(v.t))continue;
    const d=Math.hypot(v.x-unit.x,v.z-unit.z);
    if(d>range)continue;
    // Els pesants guanyen entre opcions comparables, sense ignorar un
    // cotxe molt proper per anar a buscar un camió molt llunyà.
    const mass=vehicleDynamics.types[v.t]?.mass||1;
    const score=mass*10-d*.6+(seat===1?7:0);
    list.push({vehicle:v,seat,distance:d,mass,score});
  }
  list.sort((a,b)=>b.score-a.score||a.distance-b.distance);
  return list;
}
export function pursuitInput(v,target,{passenger=false,distance=Infinity}={}){
  if(!target)return{forward:0,turn:0};
  const dx=target.x-v.x,dz=target.z-v.z;
  const targetHeading=Math.atan2(-dx,-dz),error=angle(targetHeading-(v.hd||0));
  const d=Math.hypot(dx,dz);
  // Driver sol: intenta atropellar el jugador. Amb artiller, manté
  // separació de foc. La direcció aplica les mateixes entrades del jugador.
  const brakeAt=passenger?18:1.5;
  const forward=d<brakeAt&&passenger?-.20:
    d<3&&passenger?0:Math.abs(error)>2.4?.38:Math.abs(error)>1.3?.58:1;
  return{forward,turn:clamp(error*1.25,-1,1),distance:d};
}
// Els blindats tancats tenen tripulació a l'interior; la moto, a la sella.
export const seatVisual=(type,seat)=>['tanc','tanqueta'].includes(type)
  ?{x:(seat?1:-1)*.55,y:1,z:-.4,scale:.43,hidden:true}:
  type==='moto'?{x:0,y:1.65,z:.4,scale:.52}:
  type==='camio'?{x:(seat?1:-1)*.62,y:1.7,z:-.62,scale:.46}:
  {x:(seat?1:-1)*.72,y:1.02,z:-.43,scale:.43};
