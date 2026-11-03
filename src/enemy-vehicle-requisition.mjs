// IA de requisa de vehicles neutrals: regles compartides SOLO / COOP.
import {vehicleDynamics} from './vehicle-dynamics-core.mjs';
import {vehicleSeatCount,vehicleSpecs} from './vehicle-specs.mjs';
const BOATS=new Set(['llanxa','llanxa_coets']);
const ELIGIBLE=new Set(['cotxe','cotxe_civil','camio','tanc','tanqueta','moto',...BOATS]);
export const requisitionBoat=type=>BOATS.has(type);
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
// Un soldat només pot requisar una llanxa si hi arriba per un moll amb
// rampa de terra. Els trams de pantalà proporcionen la ruta navegable.
export function boatBoardingRoute(v,piers=[],stairs=[]){
 if(!v||!requisitionBoat(v.t))return null;
 let best=null,score=Infinity;
 const hull=(vehicleSpecs.radii[v.t]||8)*(vehicleSpecs.scales[v.t]||1);
 for(const pier of piers){
  if(!pier||!pier.length||!pier.width)continue;
  const dx=v.x-pier.x,dz=v.z-pier.z,
    along=clamp(dx*pier.ux+dz*pier.uz,-pier.length/2,pier.length/2),
    target={x:pier.x+along*pier.ux,z:pier.z+along*pier.uz},
    boatDistance=Math.hypot(v.x-target.x,v.z-target.z);
  if(boatDistance>hull+2.5)continue;
  for(const ramp of stairs){
   if(!ramp?.pierAccess||!ramp.ramp)continue;
   const top={x:ramp.x,z:ramp.z},
     rampDistance=Math.hypot(top.x-target.x,top.z-target.z);
   if(rampDistance>65)continue;
   const d=rampDistance+boatDistance*2;
   if(d>=score)continue;
   const bottom={x:ramp.x+ramp.nx*ramp.length,
                 z:ramp.z+ramp.nz*ramp.length};
   // Seguir el moll longitudinal pel centre: cap diagonal sobre l'aigua.
   const line=piers.filter(p=>Math.abs((p.x-top.x)*pier.px+(p.z-top.z)*pier.pz)<Math.max(3,pier.width))
     .filter(p=>Math.hypot(p.x-top.x,p.z-top.z)<rampDistance+10)
     .sort((a,b)=>Math.hypot(a.x-top.x,a.z-top.z)-Math.hypot(b.x-top.x,b.z-top.z))
     .map(p=>({x:p.x,z:p.z}));
   best=[bottom,top,...line,target];score=d;
  }
 }
 if(!best)return null;
 return best.filter((p,i)=>i===0||Math.hypot(p.x-best[i-1].x,p.z-best[i-1].z)>.5);
}
export function boatBoardingReady(unit,v,route){
 if(!route?.length)return false;
 const end=route[route.length-1];
 const hull=(vehicleSpecs.radii[v.t]||8)*(vehicleSpecs.scales[v.t]||1);
 return Math.hypot(unit.x-end.x,unit.z-end.z)<2.8&&
   Math.hypot(unit.x-v.x,unit.z-v.z)<hull+2.5;
}
export function vehicleSeatPosition(v,seat=0){
  const side=seat?1:-1,h=v.hd||0;
  const lateral=({cotxe:3.45,cotxe_civil:2.75,camio:3.75,tanc:5.2,tanqueta:4.5,moto:1.8})[v.t]||3.3;
  return{x:v.x+Math.cos(h)*lateral*side+Math.sin(h)*.4,
         z:v.z-Math.sin(h)*lateral*side+Math.cos(h)*.4};
}
export function candidateVehicles(unit,vehicles,{range=REQUISITION.searchRadius,piers=[],stairs=[]}={}){
  const list=[];
  for(const v of vehicles){
    if(!v||!ELIGIBLE.has(v.t)||v.destroyed||v.sunk||v.carrier||v.carrierId||v.waterIngress?.dead||
       Math.abs(v.v||0)>1.5||v.seats?.some(Boolean))continue;
    const crew=v.enemyCrew||[null,null];
    const seat=crew[0]?(crew[1]? -1:1):0;
    if(seat<0||seat>=vehicleSeatCount(v.t))continue;
    const d=Math.hypot(v.x-unit.x,v.z-unit.z);
    if(d>range)continue;
    const dockRoute=requisitionBoat(v.t)?boatBoardingRoute(v,piers,stairs):null;
    if(requisitionBoat(v.t)&&!dockRoute)continue;
    // Els pesants guanyen entre opcions comparables, sense ignorar un
    // cotxe molt proper per anar a buscar un camió molt llunyà.
    const mass=vehicleDynamics.types[v.t]?.mass||1;
    const score=mass*10-d*.6+(seat===1?7:0);
    list.push({vehicle:v,seat,distance:d,mass,score,dockRoute});
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
// Frenada anticipada i gir tangencial davant d'una filferrada.
// Es consulta abans de la física del jugador, tant al client com al Worker.
// Mai desactivam les col·lisions ni fem girar el cotxe sobre el lloc.
export function avoidVehicleBarbedWire(v,input,walls=[],memory={}){
 if(!v||!input||requisitionBoat(v.t))return input;
 const speed=Math.abs(v.v||0),look=Math.max(13,Math.min(30,12+speed*.65)),
   fx=-Math.sin(v.hd||0),fz=-Math.cos(v.hd||0),
   ex=v.x+fx*look,ez=v.z+fz*look,
   cross=(ax,az,bx,bz)=>ax*bz-az*bx;
 let closest=null,best=Infinity;
 for(const w of walls){
  if(!w?.barbed||w.open)continue;
  const ax=w.ax??w.x0,az=w.az??w.z0,
    bx=w.bx??w.x1,bz=w.bz??w.z1;
  const sx=bx-ax,sz=bz-az,dx=ex-v.x,dz=ez-v.z,
    den=cross(dx,dz,sx,sz);
  let d=Infinity;
  if(Math.abs(den)>1e-6){
   const t=cross(ax-v.x,az-v.z,sx,sz)/den,
     u=cross(ax-v.x,az-v.z,dx,dz)/den;
   if(t>=0&&t<=1&&u>=0&&u<=1)d=t*look;
  }
  // Mostram el perímetre de la tanca, no només el fil central.
  const cx=(ax+bx)/2,cz=(az+bz)/2;
  if(d===Infinity&&Math.hypot(cx-v.x,cz-v.z)<look+6){
   for(const [px,pz] of [[ax,az],[bx,bz]]){
    const along=(px-v.x)*fx+(pz-v.z)*fz,
      aside=Math.abs((px-v.x)*fz-(pz-v.z)*fx);
    if(along>0&&along<look&&aside<5)d=Math.min(d,along);
   }
  }
  if(d<best){best=d;closest={sx,sz,d};}
 }
 if(!closest)return input;
 const length=Math.hypot(closest.sx,closest.sz);
 if(length<.2)return {...input,forward:-.2,turn:1};
 const tx=closest.sx/length,tz=closest.sz/length,
   choose=memory.side&&memory.until>0?memory.side:
     (fx*tx+fz*tz>=0?1:-1);
 memory.side=choose;memory.until=12;
 const desired=Math.atan2(-tx*choose,-tz*choose),
   error=angle(desired-(v.hd||0));
 // Abans del contacte frena per fer el gir amb el radi real del vehicle.
 const braking=best<Math.max(6,speed*.9);
 return {...input,forward:braking?(best<3?-.65:0):Math.min(input.forward,.58),
   turn:clamp(error*1.8,-1,1),avoidingFence:true};
}
// La malla d'infanteria fa ~4 m d'alçada sense reduir: el Humvee
// necessita una escala i una base més baixes que el soldat dret.
export const seatVisual=(type,seat)=>['tanc','tanqueta'].includes(type)
  ?{x:(seat?1:-1)*.55,y:1,z:-.4,scale:.43,hidden:true}:
  type==='moto'?{x:0,y:1.65,z:.4,scale:.52}:
  type==='camio'?{x:(seat?1:-1)*.62,y:1.7,z:-.62,scale:.46}:
  type==='cotxe'?{x:(seat?1:-1)*.84,y:.70,z:-.26,scale:.31}:
  {x:(seat?1:-1)*.613,y:.70,z:-.60,scale:.31};

// Boca del canó del passatger, per fora del lateral de la carrosseria:
// calcula el marge amb la caixa de col·lisió real, no amb el centre del cotxe.
export function passengerMuzzle(v,baseY=v.y??0){
  if(!v)return null;
  if(v.t==='tanc'||v.t==='tanqueta')return null;
  const halfWidth=(vehicleSpecs.hitboxes[v.t]?.[0]??3)/2;
  const lateral=halfWidth+.75,h=v.hd??0,fore=-.65;
  return {x:v.x+Math.cos(h)*lateral+Math.sin(h)*fore,
          y:baseY+(v.t==='moto'?2.15:2.25),
          z:v.z-Math.sin(h)*lateral+Math.cos(h)*fore};
}
