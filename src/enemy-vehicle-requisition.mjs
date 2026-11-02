// IA de requisa de vehicles neutrals: regles compartides SOLO / COOP.
import {vehicleDynamics} from './vehicle-dynamics-core.mjs';
import {vehicleSeatCount} from './vehicle-specs.mjs';
const ELIGIBLE=new Set(['cotxe','cotxe_civil','camio']);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const REQUISITION=Object.freeze({
  searchRadius:35, boardingDistance:3.1, passengerWaitSeconds:6,
  chaseMemorySeconds:12, maxChaseDistance:180
});
export function requisitionChance(difficulty=1){
  return clamp(.26+(Number(difficulty)-1)*.28,.08,.65);
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
  const lateral=({cotxe:3.45,cotxe_civil:2.75,camio:3.75})[v.t]||3.3;
  return{x:v.x+Math.cos(h)*lateral*side+Math.sin(h)*.4,
         z:v.z-Math.sin(h)*lateral*side+Math.cos(h)*.4};
}
export function candidateVehicles(unit,vehicles,{visible=()=>true,range=REQUISITION.searchRadius}={}){
  const list=[];
  for(const v of vehicles){
    if(!v||!ELIGIBLE.has(v.t)||v.destroyed||v.sunk||v.carrier||v.carrierId||v.waterIngress?.dead||
       Math.abs(v.v||0)>1.5||v.seats?.some(Boolean))continue;
    const crew=v.enemyCrew||[null,null];
    const seat=crew[0]?(crew[1]? -1:1):0;
    if(seat<0||seat>=vehicleSeatCount(v.t))continue;
    const d=Math.hypot(v.x-unit.x,v.z-unit.z);
    if(d>range||!visible(unit,v))continue;
    // Els pesants guanyen entre opcions comparables, sense ignorar un
    // cotxe molt proper per anar a buscar un camió molt llunyà.
    const mass=vehicleDynamics.types[v.t]?.mass||1;
    const score=mass*12-d*.42+(seat===1?7:0);
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
export const seatVisual=(type,seat)=>type==='camio'
  ?{x:(seat?1:-1)*.62,y:1.7,z:-.62,scale:.46}:
   {x:(seat?1:-1)*.72,y:1.02,z:-.43,scale:.43};
