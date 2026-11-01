import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {palmImpact,rockImpact} from '../src/vehicle-environment-core.mjs';
import {firstVehicleContact,vehicleContactDamage} from './coop-vehicle-contacts.mjs';
import {stepRangeVehicle} from './coop-vehicle-motion.mjs';
import {vehicleDamage,combatBalance,tankCanCrush,barrierRam,vehicleHullDistance,vehicleHullSegmentT} from '../src/combat-rules.mjs';
import {vehicleDynamics,advanceVehicle} from '../src/vehicle-dynamics-core.mjs';
import {ferryLocal,ferryWorld,ferrySurfaceY,ferryPedestrianAt,
  ferryForVehicle,ferryCarriedPose} from '../src/ferry-deck-core.mjs';
// Trusted two-seat transport on the relay pad. No client coordinates or seat claims.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(id);
export function vehicleClear(position,world,bounds,previous=position){
  if(position.x<bounds.x0+1.8||position.x>bounds.x1-1.8||position.z<bounds.z0+1.8||position.z>bounds.z1-1.8)return false;
  for(const [dx,dz] of [[0,0],[.9,.9],[.9,-.9],[-.9,.9],[-.9,-.9]]){
    const q={...position,x:position.x+dx,z:position.z+dz},p={...previous,x:previous.x+dx,z:previous.z+dz},resolved=world.resolveBody(p,q),support=world.locomotionAt(q.x,q.z,q.y);
    if(distance(q,resolved)>1e-5||support.interior||support.drop||Math.abs(support.floor-position.y)>.25)return false;
  }return true;
}
export function createRelayVehicles({meta,record={},world,water,players,active,onBoard=()=>{},geometry=()=>({walls:[]}),onImpact=()=>{},onTravel=()=>{},onBarrier=()=>false,onPalm=()=>false,hasParachute=()=>false}){
 const vehicles=structuredClone(record.vehicles||meta.vehicles||[]),results=structuredClone(record.results||[]),inputs=new Map();
 for(const v of vehicles)v.life??=combatBalance.vehicles[v.t]??1;
 const mounted=id=>vehicles.find(v=>!v.destroyed&&v.seats.includes(id));
 const ferryFor=v=>ferryForVehicle(v,vehicles);
 const clearCarrier=v=>{delete v.carrierId;delete v.carrierLX;
  delete v.carrierLZ;delete v.carrierHD;};
 function attachCarrier(v,f){
  const q=ferryLocal(f,v.x,v.z);
  v.carrierId=f.id;v.carrierLX=q.x;v.carrierLZ=q.z;
  v.carrierHD=Math.atan2(Math.sin(v.hd-f.hd),Math.cos(v.hd-f.hd));
 }
 function onFerry(v,f){
  return !!f&&Math.abs(v.y-ferrySurfaceY(f,ferryLocal(f,v.x,v.z).z))<3.1;
 }
 function vehicleWorld(v){
  const base=world();
  return {...base,groundAt(x,z,previous){
   const ground=base.groundAt?.(x,z,previous)??base.heightAt(x,z);
   if(vehicleDynamics.types[v.t]?.m!=='l')return ground;
   const f=ferryForVehicle(v,vehicles,x,z,true);
   return f?Math.max(ground,ferrySurfaceY(f,ferryLocal(f,x,z).z)):ground;
  }};
 }
 function position(actor){const v=mounted(actor.id);return v?{x:v.x,y:v.y,z:v.z,hd:v.hd,hp:actor.hp,fall:null,swimming:false}:null;}
 function walkClear(from,to){let previous=from;const steps=Math.max(1,Math.ceil(distance(from,to)/.2));for(let i=1;i<=steps;i++){const q={...to,x:from.x+(to.x-from.x)*i/steps,z:from.z+(to.z-from.z)*i/steps},resolved=world().resolveBody(previous,q);if(distance(q,resolved)>1e-5)return false;previous=q;}return true;}
 function exitPoint(v,actor){
   if(meta.mode==='native'&&v.t==='ferry'){
     // Desembarcar sobre la coberta; no fer caure el jugador a la mar.
     for(const [lx,lz] of [[-4,-5],[4,-5],[-4,6],[4,6]]){
       const at=ferryWorld(v,lx,lz),y=ferrySurfaceY(v,lz)+.12;
       if(at.x<meta.bounds.x0+1||at.x>meta.bounds.x1-1||
          at.z<meta.bounds.z0+1||at.z>meta.bounds.z1-1||
          players().some(p=>p.id!==actor.id&&!mounted(p.id)&&
            distance(p,at)<1.7))continue;
       return {...at,y,hd:v.hd};
     }
     return null;
   }
   if(meta.mode==='native'&&v.carrierId){
     // En abandonar un vehicle carregat, sortir damunt del ferri en lloc
     // de consultar el fons de la mar com si fos un moll estàtic.
     const f=vehicles.find(a=>a.id===v.carrierId&&!a.destroyed),
       scale=vehicleSpecs.scales[v.t]||1,
       half=(vehicleSpecs.hitboxes[v.t]?.[0]||2)*scale/2;
     if(f)for(const side of [1,-1])for(const back of [0,-2,2]){
       const lateral=half+1.35,
         x=v.x+Math.cos(v.hd)*side*lateral-Math.sin(v.hd)*back,
         z=v.z-Math.sin(v.hd)*side*lateral-Math.cos(v.hd)*back,
         deck=ferryPedestrianAt(f,x,z,ferrySurfaceY(f,ferryLocal(f,x,z).z));
       if(!deck||x<meta.bounds.x0+1||x>meta.bounds.x1-1||
         z<meta.bounds.z0+1||z>meta.bounds.z1-1||
         players().some(p=>p.id!==actor.id&&!mounted(p.id)&&
           Math.hypot(p.x-x,p.z-z)<1.6))continue;
       return {x,y:deck.y+.12,z,hd:v.hd};
     }
     return null;
   }
   // Com al mode individual: sortir d'un helicòpter alt inicia caiguda,
   // conservant la velocitat i desplegant el paracaigudes de l'inventari.
   const aircraft=vehicleDynamics.types[v.t]?.m==='a',
     ground=Math.max(0,world().heightAt(v.x,v.z));
   if(meta.mode==='native'&&aircraft&&v.y-ground>4){
     const side=actor.id===v.seats[0]?-1:1,
       x=v.x+Math.cos(v.hd)*side*1.8,
       z=v.z-Math.sin(v.hd)*side*1.8,hd=v.hd,
       fx=-Math.sin(hd),fz=-Math.cos(hd);
     if(x<meta.bounds.x0+1||x>meta.bounds.x1-1||
        z<meta.bounds.z0+1||z>meta.bounds.z1-1)return null;
     return {x,y:v.y,z,hd,fall:{kind:'air',y:v.y,vy:0,
       vx:fx*(v.v||0)*.82+Math.cos(hd)*side*2.5,
       vz:fz*(v.v||0)*.82-Math.sin(hd)*side*2.5,
       startHeight:v.y-ground,t:0,leanF:0,leanS:0,
       parachute:!!hasParachute(actor.id)}};
   }
   // Sortida segura: comprovar el lloc exterior al casc, no un recorregut
   // artificial des del CENTRE del vehicle, que travessa el seu propi volum.
   const scale=vehicleSpecs.scales[v.t]||1,box=vehicleSpecs.hitboxes[v.t]||[2,4],
     halfWidth=box[0]*scale/2,halfLength=box[1]*scale/2,
     native=meta.mode==='native',waterType=['w','wl'].includes(vehicleDynamics.types[v.t].m);
   for(const side of [1,-1])for(const back of [0,-1.7,1.7,-3.4,3.4]){
     const offset=(native?halfWidth+1.65:Math.max(2.6,halfWidth+1)),
       q={...actor,
         x:v.x+Math.cos(v.hd)*side*offset-Math.sin(v.hd)*back,
         z:v.z-Math.sin(v.hd)*side*offset-Math.cos(v.hd)*back,
         y:v.y};
     if(q.x<meta.bounds.x0+1||q.x>meta.bounds.x1-1||
        q.z<meta.bounds.z0+1||q.z>meta.bounds.z1-1||
        players().some(p=>p.id!==actor.id&&!mounted(p.id)&&distance(p,q)<1.6))continue;
     if(['proving','world','native'].includes(meta.mode)&&
       vehicleDynamics.types[v.t].m==='a'&&v.y>Math.max(0,world().heightAt(v.x,v.z))+1.5)continue;
     const support=world().locomotionAt(q.x,q.z,q.y),ground=world().heightAt(q.x,q.z);
     if(ground<-.5&&!support.interior&&support.floor<-.5){
       if(waterType||native)return {...q,y:water.surfaceAt(q.x,q.z,0)+.1};
       continue;
     }
     if(support.drop||support.interior||Math.abs(support.floor-q.y)>Math.max(2.5,halfWidth))continue;
     const target={...q,y:support.floor+.06},
       resolved=world().resolveBody(target,target);
     if(distance(resolved,target)>1e-5)continue;
     // La zona al costat del vehicle és lliure; mai fer walkClear(v,q),
     // perquè travessaria una paret quan el cotxe és aparcat arran d'ella.
     if(vehicles.some(other=>other!==v&&!other.destroyed&&
         Math.abs(other.y-target.y)<3&&
         distance(other,target)<Math.max(1.6,(vehicleSpecs.hitboxes[other.t]?.[0]||2)*(vehicleSpecs.scales[other.t]||1)/2+.75)))continue;
     return target;
   }
   return null;
 }
 function command(actorId,msg){
  const cached=results.find(r=>r.actorId===actorId&&r.commandId===msg.commandId);if(cached)return {...cached,duplicate:true};
  const p=players().find(p=>p.id===actorId),v=vehicles.find(v=>v.id===msg.vehicleId);let code='INVALID',ok=false,exit=null;
  if(p&&msg.epoch===meta.id&&validId(msg.commandId)&&['enter','exit'].includes(msg.operation)){
   if(!active()||p.hp<=0||p.fall||p.swimming&&!(['proving','world','native'].includes(meta.mode)&&['w','wl'].includes(vehicleDynamics.types[v?.t]?.m)))code='NOT_ACTIVE';
   else if(!v)code='UNKNOWN_VEHICLE';
   else if(v.destroyed)code='DESTROYED';
   else if(msg.operation==='exit'){
    if(!v.seats.includes(actorId))code='NOT_SEATED';else if(meta.mode!=='native'&&Math.abs(v.v)>.2)code='MOVING';else if(!(exit=exitPoint(v,p)))code='EXIT_BLOCKED';
    else{const driver=v.seats[0]===actorId;v.seats[v.seats.indexOf(actorId)]=null;inputs.delete(actorId);
      if(exit.fall&&driver)v.crashing=true;
      ok=true;code='EXITED';}
   }else if(mounted(actorId))code='ALREADY_SEATED';
   else if(distance(p,v)>(meta.mode==='native'?(vehicleSpecs.radii[v.t]||0)*(vehicleSpecs.scales[v.t]||1)+5:3.5)||Math.abs(p.y-v.y)>(['proving','world','native'].includes(meta.mode)?5:1.2))code='TOO_FAR';
   else if(!walkClear(p,v))code='BLOCKED';
   else if(Math.abs(v.v)>.2)code='MOVING';else if(v.seats.every(Boolean))code='FULL';
   else{v.seats[v.seats.indexOf(null)]=actorId;inputs.delete(actorId);onBoard(actorId);ok=true;code='ENTERED';}
   const result={kind:'vehicle',actorId,commandId:msg.commandId,ok,code};results.push(result);if(results.length>64)results.shift();return {...result,...(exit?{exit}:{} )};
  }return {kind:'vehicle',actorId,commandId:msg.commandId,ok,code};
 }
 function step(tick){if(!active())return;
  if(meta.mode==='native')for(const v of vehicles){
   if(v.destroyed||vehicleDynamics.types[v.t]?.m!=='l')continue;
   const f=v.carrierId?vehicles.find(a=>a.id===v.carrierId&&!a.destroyed):ferryFor(v);
   if(!f){clearCarrier(v);continue;}
   if(!v.carrierId&&onFerry(v,f))attachCarrier(v,f);
  }
  for(const v of vehicles){
   if(v.destroyed)continue;
   const carrier=v.carrierId&&vehicles.find(a=>a.id===v.carrierId&&!a.destroyed),
     driverEntry=inputs.get(v.seats[0]),driving=!!(v.seats[0]&&
       driverEntry&&tick-driverEntry.tick<=8);
   if(v.carrierId&&!carrier)clearCarrier(v);
   if(carrier&&!driving){v.v=0;v.sideV=0;v.strafeV=0;continue;}
   if(carrier&&driving)Object.assign(v,ferryCarriedPose(v,carrier));
   // L'helicòpter sense pilot perd sustentació, com al joc individual.
   // No introduïm cap simulador alternatiu: només gravetat autoritativa.
   if(v.crashing&&!v.seats[0]&&['heli','heli_combat'].includes(v.t)){
     const floor=Math.max(0,world().heightAt(v.x,v.z));
     v.crashVy=(v.crashVy||0)-24/30;
     v.y=Math.max(floor+.85,v.y+v.crashVy/30);v.alt=v.y;
     if(v.y<=floor+.85){
       v.crashing=false;v.v=0;
       // El mateix flux de destrucció i explosió que la resta de vehicles:
       // notificació visual, dany als ocupants i retirada de seients.
       onImpact(v.id,Math.max(1,v.life),tick);
     }
     continue;
   }
   // A downed occupant is released at the already validated vehicle centre.
   for(let seat=0;seat<v.seats.length;seat++)if(v.seats[seat]&&players().find(p=>p.id===v.seats[seat])?.hp<=0){inputs.delete(v.seats[seat]);v.seats[seat]=null;v.v=0;}
   const driver=v.seats[0],entry=inputs.get(driver),input=driver&&entry&&tick-entry.tick<=8?entry.input:{forward:0,turn:0,strafe:0,climb:0};
   // Sense conductor, la inèrcia es dissipa amb la física compartida; no frenam en sec.
   if((!driver||!entry||tick-entry.tick>8)&&(meta.mode!=='native'||Math.abs(v.v)<.2&&Math.abs(v.sideV||0)<.2&&Math.abs(v.strafeV||0)<.2)){v.v=0;v.driveInput=0;v.steerInput=0;v.yawRate=0;v.sideV=0;v.strafeV=0;v.verticalV=0;continue;}
   const from={x:v.x,y:v.y,z:v.z,hd:v.hd,v:v.v};let attempted=null;
   if(['proving','world','native'].includes(meta.mode))stepRangeVehicle(v,input,1/30,tick,meta.mode==='native'?vehicleWorld(v):world(),water,meta.bounds);
   else{
   const control=vehicleDynamics.inputs(v,input.forward,input.turn,1/30),side=advanceVehicle(v,control.forward,control.turn,1/30),hd=v.hd;
   const next={...v,hd,x:v.x+(-Math.sin(hd)*v.v+Math.cos(hd)*side)/30,z:v.z+(-Math.cos(hd)*v.v-Math.sin(hd)*side)/30};
   attempted=next;
   if(vehicleClear(next,world(),meta.bounds,v)){v.x=next.x;v.z=next.z;v.hd=hd;}else{v.v=0;}
   }
   from.travelSpeed=Math.abs(v.v);
   const desired={...(attempted||v)},probe={...desired,v:v.v||from.v};
   let hit=firstVehicleContact(probe,from,vehicles,geometry(),['proving','world','native'].includes(meta.mode),world());
   // Each successful iteration removes a confirmed obstacle. No network input can select one.
   while(hit&&(hit.kind==='palm'||hit.kind==='wall'&&vehicleDynamics.types[v.t].m==='l')){
     if(hit.kind==='palm'){
       const response=hit.crush?{destroy:true,damage:0,speedFactor:1,bump:.06,cooldown:.08}:palmImpact(v.t,Math.abs(probe.v),vehicleDynamics.types[v.t].mass||1);
       if(!response.destroy||tick<(v.environmentUntilTick||0)&&!hit.crush)break;
       if(!onPalm(hit.target))break;
       v.environmentUntilTick=tick+Math.ceil(response.cooldown*30);v.v=probe.v*response.speedFactor;probe.v=v.v;v.bump=response.bump;
       Object.assign(v,{x:hit.point.x,y:hit.point.y,z:hit.point.z,hd:hit.point.hd});
       if(response.damage)onImpact(v.id,response.damage,tick);
       if(v.destroyed)break;
       hit=firstVehicleContact(probe,from,vehicles,geometry(),['proving','world','native'].includes(meta.mode),world());continue;
     }
     const ram=barrierRam(probe,hit.target,Math.max(0,((v.barrierUntilTick||0)-tick)/30));
     if(!ram||!onBarrier(hit.target))break;
     v.barrierUntilTick=tick+Math.ceil(ram.cooldown*30);v.v=probe.v*ram.speedFactor;probe.v=v.v;v.bump=ram.bump;
     Object.assign(v,hit.safe);
     if(ram.damage)onImpact(v.id,ram.damage,tick);
     if(v.destroyed)break;
     hit=firstVehicleContact(probe,from,vehicles,geometry(),['proving','world','native'].includes(meta.mode),world());
   }
   if(v.destroyed)continue;
   if(!hit&&(!attempted||vehicleClear(desired,world(),meta.bounds,from)))Object.assign(v,{x:desired.x,y:desired.y,z:desired.z,hd:desired.hd});
   if(hit){
     const incoming=Math.max(Math.abs(from.v),Math.abs(v.v));Object.assign(v,hit.safe);
     if(hit.kind==='rock'||hit.kind==='palm'){
       const response=hit.kind==='rock'?rockImpact(incoming,vehicleDynamics.types[v.t].mass||1):palmImpact(v.t,Math.min(incoming,10),vehicleDynamics.types[v.t].mass||1);
       v.v*=response.speedFactor;v.sideV=0;v.strafeV=0;v.bump=response.bump;
       if(tick>=(v.environmentUntilTick||0)){v.environmentUntilTick=tick+Math.ceil(response.cooldown*30);if(response.damage)onImpact(v.id,response.damage,tick);}
     }else if(hit.kind==='vehicle'){
       const other=hit.target,d=vehicleContactDamage({...v,v:from.v||v.v},other);
       if(tankCanCrush(v,other,vehicleDynamics.types[v.t].mass||1,vehicleDynamics.types[other.t].mass||1)){
         onImpact(other.id,other.life,tick);v.v*=.99;
       }else{v.v*=.3;v.sideV=0;v.strafeV=0;
       if(tick>=(v.contactUntilTick||0)&&tick>=(other.contactUntilTick||0)&&d.relative>10){v.contactUntilTick=other.contactUntilTick=tick+6;onImpact(v.id,d.own,tick);onImpact(other.id,d.other,tick);}
       }
     }else{v.v=0;v.sideV=0;v.strafeV=0;if(incoming>10&&tick>=(v.contactUntilTick||0)){v.contactUntilTick=tick+6;if(v.t!=='tanc')onImpact(v.id,Math.min(5,Math.max(1,Math.ceil((incoming-10)/6))),tick);}}
   }
   if(!v.destroyed){
     if(meta.mode==='native'&&vehicleDynamics.types[v.t]?.m==='l'){
       const f=ferryFor(v);
       if(f&&onFerry(v,f))attachCarrier(v,f);
       else if(v.carrierId)clearCarrier(v);
     }
     onTravel(v,from,tick);
   }
  }
  // Un vehicle aparcat segueix la transformació del ferri, no el client.
  if(meta.mode==='native')for(const v of vehicles){
   if(v.destroyed||!v.carrierId)continue;
   const f=vehicles.find(a=>a.id===v.carrierId&&!a.destroyed);
   if(!f){clearCarrier(v);continue;}
   const entry=inputs.get(v.seats[0]);
   if(v.seats[0]&&entry&&tick-entry.tick<=8)continue;
   Object.assign(v,ferryCarriedPose(v,f));
  }
 }
 function damage(id,amount,shotClass='light'){
  const v=vehicles.find(v=>v.id===id);if(!v)return null;
  const result=vehicleDamage(v,amount,1,shotClass,combatBalance.vehicles[v.t]??1);
  if(!result.damaged)return null;v.life=result.life;
  if(!result.destroyed)return {id:v.id,destroyed:false};
  const occupants=v.seats.filter(Boolean);v.destroyed=true;clearCarrier(v);v.v=0;v.driveInput=0;v.steerInput=0;v.yawRate=0;v.sideV=0;v.strafeV=0;
  for(const id of occupants)inputs.delete(id);v.seats.fill(null);
  return {id:v.id,destroyed:true,explosive:v.t!=='bici',occupants,at:{x:v.x,y:v.y+1,z:v.z}};
 }
 const live=()=>vehicles.filter(v=>!v.destroyed);
 // Existing individual sphere contact/hull falloff, adapted to the 3.2 m relay model.
 const hullRadius=v=>v.hullRadius??Math.max(1.6,(vehicleSpecs.radii[v.t]||1.6)*(vehicleSpecs.scales[v.t]||1)*.7);
 return {mounted,position,command,step,damage,live,contact:(from,to,v)=>vehicleHullSegmentT(from,to,v,v.y,hullRadius(v)),blastDistance:(v,at)=>vehicleHullDistance(v,v.y,hullRadius(v),at.x,at.y,at.z),accept(id,input,tick){if(mounted(id))inputs.set(id,{input:{...input},tick});},pause(){inputs.clear();for(const v of vehicles){v.v=0;v.driveInput=0;v.steerInput=0;v.yawRate=0;v.sideV=0;v.strafeV=0;}},ferryDeckAt(x,z,previousY){
   for(const f of vehicles)if(!f.destroyed&&f.t==='ferry'){
     const result=ferryPedestrianAt(f,x,z,previousY);
     if(result)return result;
   }
   return null;
  },snapshot(){return structuredClone(vehicles);},checkpoint(){return structuredClone({vehicles,results});}};
}
