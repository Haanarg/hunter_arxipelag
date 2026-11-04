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
// Una moto requisada no ha d'envestir un vehicle ocupat. Anticipam la
// frenada segons la velocitat de tancament REAL (també en sentits oposats).
// El conductor continua disparant amb el seu fusell, sense cap arma fictícia.
export function motorcycleAttackInput(v,target,input,{occupied=false}={}){
 if(!occupied||v?.t!=='moto'||!target||!input)return input;
 const dx=target.x-v.x,dz=target.z-v.z,dist=Math.hypot(dx,dz);
 if(!Number.isFinite(dist)||dist<1e-5)
   return {...input,forward:-1,turn:0,avoidingOccupiedVehicle:true};
 const h=v.hd||0,th=target.hd||0,rv=v.v||0,tv=target.v||0,
   closing=Math.max(0,((-Math.sin(h)*rv+Math.sin(th)*tv)*dx+
     (-Math.cos(h)*rv+Math.cos(th)*tv)*dz)/dist),
   radius=t=>(vehicleSpecs.radii[t]||3)*(vehicleSpecs.scales[t]||1),
   margin=radius('moto')+radius(target.t)+8,
   brake=Math.max(12,vehicleDynamics.types.moto.a*.75),
   stopAt=margin+closing*.35+closing*closing/(2*brake);
 if(dist>stopAt)return input;
 return {...input,forward:rv>.8?-1:0,turn:0,avoidingOccupiedVehicle:true};
}
// Ruta explícita per travessar una obertura de filferrada abans
// d'anar a un vehicle. No demanam al navegant que travessi un mur
// o que vagi directament al seient si hi ha una tanca al mig.
const wireCross=(a,b,c,d)=>{
 const vx=b.x-a.x,vz=b.z-a.z,wx=d.x-c.x,wz=d.z-c.z,
   den=vx*wz-vz*wx;
 if(Math.abs(den)<1e-7)return null;
 const qx=c.x-a.x,qz=c.z-a.z,t=(qx*wz-qz*wx)/den,
   u=(qx*vz-qz*vx)/den;
 return t>.0001&&t<.9999&&u>-.0001&&u<1.0001?t:null;
};
const wireEnds=w=>w&&Number.isFinite(w.ax)&&Number.isFinite(w.az)&&
 Number.isFinite(w.bx)&&Number.isFinite(w.bz)?
 [{x:w.ax,z:w.az},{x:w.bx,z:w.bz}]:null;
export function requisitionFenceDetour(from,to,walls=[]){
 if(!from||!to)return null;
 const midX=(from.x+to.x)/2,midZ=(from.z+to.z)/2,
   // Només els recintes propers poden interferir en aquesta requisa.
   // Evita explorar portes de tota l'illa a cada soldat.
   reach=Math.max(120,Math.min(195,Math.hypot(from.x-to.x,from.z-to.z)+105)),
   wire=walls.filter(w=>w?.barbed&&!w.open&&w.hp!==0)
     .map(w=>wireEnds(w)).filter(pair=>pair&&
       Math.hypot((pair[0].x+pair[1].x)/2-midX,
         (pair[0].z+pair[1].z)/2-midZ)<reach);
 if(!wire.some(pair=>wireCross(from,to,pair[0],pair[1])!==null))
  return null; // El trajecte directe no talla cap filferrada.
 const groups=new Map();
 // Una obertura pot ser en una altra cara del recinte, no només a
 // la paret que el soldat té al davant: agrupam tots els trams col·lineals.
 for(const pair of wire){
  const [a,b]=pair,dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  if(len<.2)continue;
  let ux=dx/len,uz=dz/len;
  if(ux<-.000001||Math.abs(ux)<.000001&&uz<0){ux=-ux;uz=-uz;}
  const nx=-uz,nz=ux,offset=a.x*nx+a.z*nz,
    key=[Math.round(ux*100),Math.round(uz*100),Math.round(offset*2)].join(':');
  let g=groups.get(key);
  if(!g){g={ux,uz,nx,nz,origin:a,intervals:[]};groups.set(key,g);}
  const along=p=>(p.x-g.origin.x)*g.ux+(p.z-g.origin.z)*g.uz;
  g.intervals.push([Math.min(along(a),along(b)),
    Math.max(along(a),along(b))]);
 }
 const clear=(p,q)=>!wire.some(pair=>
   wireCross(p,q,pair[0],pair[1])!==null);
 let best=null,bestCost=Infinity;
 for(const g of groups.values()){
  const intervals=g.intervals.sort((a,b)=>a[0]-b[0]),merged=[];
  for(const iv of intervals){
   const previous=merged[merged.length-1];
   if(previous&&iv[0]-previous[1]<1.2)
    previous[1]=Math.max(previous[1],iv[1]);
   else merged.push(iv.slice());
  }
  const candidates=[];
  for(let i=0;i<merged.length-1;i++){
   const gap=merged[i+1][0]-merged[i][1];
   if(gap>=4.5&&gap<=35)
    candidates.push((merged[i][1]+merged[i+1][0])/2);
  }
  // Una tanca aïllada es pot vorejar pels extrems.
  // En un recinte tancat, clear(exit,to) rebutja els falsos passos.
  for(const edge of [merged[0]?.[0]-4,merged.at(-1)?.[1]+4])
   if(Number.isFinite(edge))candidates.push(edge);
  for(const t of candidates){
   const center={x:g.origin.x+g.ux*t,z:g.origin.z+g.uz*t},
     side=Math.sign((to.x-center.x)*g.nx+
       (to.z-center.z)*g.nz)||1,
     entry={x:center.x-g.nx*side*3.4,
       z:center.z-g.nz*side*3.4},
     exit={x:center.x+g.nx*side*3.4,
       z:center.z+g.nz*side*3.4};
   if(!clear(entry,exit)||!clear(exit,to))continue;
   // Si cal vorejar una cantonada per arribar a l'entrada, l'A*
   // trobarà el camí exterior. No descartam aquesta porta.
   const indirect=!clear(from,entry),
     cost=Math.hypot(from.x-entry.x,from.z-entry.z)+
       Math.hypot(entry.x-exit.x,entry.z-exit.z)+
       Math.hypot(exit.x-to.x,exit.z-to.z)+(indirect?28:0);
   if(cost<bestCost){bestCost=cost;best=[entry,exit];}
  }
 }
 return best;
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

// Origen autoritatiu dels canons portats pels dos comandos de la llanxa.
// Els mateixos seients i transformacions de attachEnemyBoatCrew, sense Three.js.
export function boatCrewMuzzle(v,seat=0,baseY=v.y??0){
 if(!v||!requisitionBoat(v.t)&&v.t!=='patrulla_marina')return null;
 const h=v.hd??v.heading??0,scale=vehicleSpecs.scales.llanxa||1.95,
   lx=(seat===0?-.58:.58)*scale,
   lz=(seat===0?.42:.38)*scale;
 return {x:v.x+Math.cos(h)*lx+Math.sin(h)*lz,
   y:baseY+2.10*scale,
   z:v.z-Math.sin(h)*lx+Math.cos(h)*lz};
}
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
