import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {palmImpact,rockImpact} from '../src/vehicle-environment-core.mjs';
import {firstVehicleContact,vehicleContactDamage} from './coop-vehicle-contacts.mjs';
import {stepRangeVehicle} from './coop-vehicle-motion.mjs';
import {vehicleDamage,combatBalance,tankCanCrush,barrierRam,vehicleHullDistance,vehicleHullSegmentT} from '../src/combat-rules.mjs';
import {vehicleDynamics,advanceVehicle} from '../src/vehicle-dynamics-core.mjs';
// Trusted two-seat transport on the relay pad. No client coordinates or seat claims.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(id);
export function vehicleClear(position,world,bounds,previous=position){
  if(position.x<bounds.x0+1.8||position.x>bounds.x1-1.8||position.z<bounds.z0+1.8||position.z>bounds.z1-1.8)return false;
  for(const [dx,dz] of [[0,0],[.9,.9],[.9,-.9],[-.9,.9],[-.9,-.9]]){
    const q={...position,x:position.x+dx,z:position.z+dz},p={...previous,x:previous.x+dx,z:previous.z+dz},resolved=world.resolveBody(p,q),support=world.locomotionAt(q.x,q.z,q.y);
    if(distance(q,resolved)>1e-5||support.interior||support.drop||Math.abs(support.floor-position.y)>.25)return false;
  }return true;
}
export function createRelayVehicles({meta,record={},world,water,players,active,onBoard=()=>{},geometry=()=>({walls:[]}),onImpact=()=>{},onTravel=()=>{},onBarrier=()=>false,onPalm=()=>false}){
 const vehicles=structuredClone(record.vehicles||meta.vehicles||[]),results=structuredClone(record.results||[]),inputs=new Map();
 for(const v of vehicles)v.life??=combatBalance.vehicles[v.t]??1;
 const mounted=id=>vehicles.find(v=>!v.destroyed&&v.seats.includes(id));
 function position(actor){const v=mounted(actor.id);return v?{x:v.x,y:v.y,z:v.z,hd:v.hd,hp:actor.hp,fall:null,swimming:false}:null;}
 function walkClear(from,to){let previous=from;const steps=Math.max(1,Math.ceil(distance(from,to)/.2));for(let i=1;i<=steps;i++){const q={...to,x:from.x+(to.x-from.x)*i/steps,z:from.z+(to.z-from.z)*i/steps},resolved=world().resolveBody(previous,q);if(distance(q,resolved)>1e-5)return false;previous=q;}return true;}
 function exitPoint(v,actor){for(const side of [1,-1])for(const back of [0,2.8,-2.8]){
   const offset=['proving','world','native'].includes(meta.mode)?Math.max(2.6,(vehicleSpecs.hitboxes[v.t]?.[0]||2)*vehicleSpecs.scales[v.t]/2+1.8):2.6;
   const q={...actor,x:v.x+Math.cos(v.hd)*side*offset-Math.sin(v.hd)*back,z:v.z-Math.sin(v.hd)*side*offset-Math.cos(v.hd)*back,y:v.y};
   if(q.x<meta.bounds.x0||q.x>meta.bounds.x1||q.z<meta.bounds.z0||q.z>meta.bounds.z1||players().some(p=>p.id!==actor.id&&!mounted(p.id)&&distance(p,q)<1.6))continue;
   if(['proving','world','native'].includes(meta.mode)&&vehicleDynamics.types[v.t].m==='a'&&v.y>Math.max(0,world().heightAt(v.x,v.z))+1.5)continue;
   if(['proving','world','native'].includes(meta.mode)&&world().heightAt(q.x,q.z)<-.5){return {...q,y:water.surfaceAt(q.x,q.z,0)+.1};}
   const r=world().resolveBody(q,q),s=world().locomotionAt(q.x,q.z,q.y);if(distance(q,r)<1e-5&&walkClear(v,q)&&!s.interior&&!s.drop&&Math.abs(s.floor-q.y)<.25)return {...q,y:s.floor+.06};
 }return null;}
 function command(actorId,msg){
  const cached=results.find(r=>r.actorId===actorId&&r.commandId===msg.commandId);if(cached)return {...cached,duplicate:true};
  const p=players().find(p=>p.id===actorId),v=vehicles.find(v=>v.id===msg.vehicleId);let code='INVALID',ok=false,exit=null;
  if(p&&msg.epoch===meta.id&&validId(msg.commandId)&&['enter','exit'].includes(msg.operation)){
   if(!active()||p.hp<=0||p.fall||p.swimming&&!(['proving','world','native'].includes(meta.mode)&&['w','wl'].includes(vehicleDynamics.types[v?.t]?.m)))code='NOT_ACTIVE';
   else if(!v)code='UNKNOWN_VEHICLE';
   else if(v.destroyed)code='DESTROYED';
   else if(msg.operation==='exit'){
    if(!v.seats.includes(actorId))code='NOT_SEATED';else if(meta.mode!=='native'&&Math.abs(v.v)>.2)code='MOVING';else if(!(exit=exitPoint(v,p)))code='EXIT_BLOCKED';
    else{v.seats[v.seats.indexOf(actorId)]=null;inputs.delete(actorId);ok=true;code='EXITED';}
   }else if(mounted(actorId))code='ALREADY_SEATED';
   else if(distance(p,v)>(meta.mode==='native'?(vehicleSpecs.radii[v.t]||0)*(vehicleSpecs.scales[v.t]||1)+5:3.5)||Math.abs(p.y-v.y)>(['proving','world','native'].includes(meta.mode)?5:1.2))code='TOO_FAR';
   else if(!walkClear(p,v))code='BLOCKED';
   else if(Math.abs(v.v)>.2)code='MOVING';else if(v.seats.every(Boolean))code='FULL';
   else{v.seats[v.seats.indexOf(null)]=actorId;inputs.delete(actorId);onBoard(actorId);ok=true;code='ENTERED';}
   const result={kind:'vehicle',actorId,commandId:msg.commandId,ok,code};results.push(result);if(results.length>64)results.shift();return {...result,...(exit?{exit}:{} )};
  }return {kind:'vehicle',actorId,commandId:msg.commandId,ok,code};
 }
 function step(tick){if(!active())return;
  for(const v of vehicles){
   if(v.destroyed)continue;
   // A downed occupant is released at the already validated vehicle centre.
   for(let seat=0;seat<v.seats.length;seat++)if(v.seats[seat]&&players().find(p=>p.id===v.seats[seat])?.hp<=0){inputs.delete(v.seats[seat]);v.seats[seat]=null;v.v=0;}
   const driver=v.seats[0],entry=inputs.get(driver),input=driver&&entry&&tick-entry.tick<=8?entry.input:{forward:0,turn:0,strafe:0,climb:0};
   // Sense conductor, la inèrcia es dissipa amb la física compartida; no frenam en sec.
   if((!driver||!entry||tick-entry.tick>8)&&(meta.mode!=='native'||Math.abs(v.v)<.2&&Math.abs(v.sideV||0)<.2&&Math.abs(v.strafeV||0)<.2)){v.v=0;v.driveInput=0;v.steerInput=0;v.yawRate=0;v.sideV=0;v.strafeV=0;v.verticalV=0;continue;}
   const from={x:v.x,y:v.y,z:v.z,hd:v.hd,v:v.v};let attempted=null;
   if(['proving','world','native'].includes(meta.mode))stepRangeVehicle(v,input,1/30,tick,world(),water,meta.bounds);
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
   if(!v.destroyed)onTravel(v,from,tick);
  }
 }
 function damage(id,amount,shotClass='light'){
  const v=vehicles.find(v=>v.id===id);if(!v)return null;
  const result=vehicleDamage(v,amount,1,shotClass,combatBalance.vehicles[v.t]??1);
  if(!result.damaged)return null;v.life=result.life;
  if(!result.destroyed)return {id:v.id,destroyed:false};
  const occupants=v.seats.filter(Boolean);v.destroyed=true;v.v=0;v.driveInput=0;v.steerInput=0;v.yawRate=0;v.sideV=0;v.strafeV=0;
  for(const id of occupants)inputs.delete(id);v.seats.fill(null);
  return {id:v.id,destroyed:true,explosive:v.t!=='bici',occupants,at:{x:v.x,y:v.y+1,z:v.z}};
 }
 const live=()=>vehicles.filter(v=>!v.destroyed);
 // Existing individual sphere contact/hull falloff, adapted to the 3.2 m relay model.
 const hullRadius=v=>v.hullRadius??Math.max(1.6,(vehicleSpecs.radii[v.t]||1.6)*(vehicleSpecs.scales[v.t]||1)*.7);
 return {mounted,position,command,step,damage,live,contact:(from,to,v)=>vehicleHullSegmentT(from,to,v,v.y,hullRadius(v)),blastDistance:(v,at)=>vehicleHullDistance(v,v.y,hullRadius(v),at.x,at.y,at.z),accept(id,input,tick){if(mounted(id))inputs.set(id,{input:{...input},tick});},pause(){inputs.clear();for(const v of vehicles){v.v=0;v.driveInput=0;v.steerInput=0;v.yawRate=0;v.sideV=0;v.strafeV=0;}},snapshot(){return structuredClone(vehicles);},checkpoint(){return structuredClone({vehicles,results});}};
}
