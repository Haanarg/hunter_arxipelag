// Trusted two-seat transport on the relay pad. No client coordinates or seat claims.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(id);
export function vehicleClear(position,world,bounds,previous=position){
  if(position.x<bounds.x0+1.8||position.x>bounds.x1-1.8||position.z<bounds.z0+1.8||position.z>bounds.z1-1.8)return false;
  for(const [dx,dz] of [[0,0],[.9,.9],[.9,-.9],[-.9,.9],[-.9,-.9]]){
    const q={...position,x:position.x+dx,z:position.z+dz},p={...previous,x:previous.x+dx,z:previous.z+dz},resolved=world.resolveBody(p,q),support=world.locomotionAt(q.x,q.z,q.y);
    if(distance(q,resolved)>1e-5||support.interior||support.drop||Math.abs(support.floor-position.y)>.25)return false;
  }return true;
}
export function createRelayVehicles({meta,record={},world,players,active,onBoard=()=>{}}){
 const vehicles=structuredClone(record.vehicles||meta.vehicles||[]),results=structuredClone(record.results||[]),inputs=new Map();
 const mounted=id=>vehicles.find(v=>v.seats.includes(id));
 function position(actor){const v=mounted(actor.id);return v?{x:v.x,y:v.y,z:v.z,hd:v.hd,hp:actor.hp,fall:null,swimming:false}:null;}
 function walkClear(from,to){let previous=from;const steps=Math.max(1,Math.ceil(distance(from,to)/.2));for(let i=1;i<=steps;i++){const q={...to,x:from.x+(to.x-from.x)*i/steps,z:from.z+(to.z-from.z)*i/steps},resolved=world().resolveBody(previous,q);if(distance(q,resolved)>1e-5)return false;previous=q;}return true;}
 function exitPoint(v,actor){for(const side of [1,-1])for(const back of [0,2.8,-2.8]){
   const q={...actor,x:v.x+Math.cos(v.hd)*side*2.6-Math.sin(v.hd)*back,z:v.z-Math.sin(v.hd)*side*2.6-Math.cos(v.hd)*back,y:v.y};
   if(q.x<meta.bounds.x0||q.x>meta.bounds.x1||q.z<meta.bounds.z0||q.z>meta.bounds.z1||players().some(p=>p.id!==actor.id&&!mounted(p.id)&&distance(p,q)<1.6))continue;
   const r=world().resolveBody(q,q),s=world().locomotionAt(q.x,q.z,q.y);if(distance(q,r)<1e-5&&walkClear(v,q)&&!s.interior&&!s.drop&&Math.abs(s.floor-q.y)<.25)return {...q,y:s.floor+.06};
 }return null;}
 function command(actorId,msg){
  const cached=results.find(r=>r.actorId===actorId&&r.commandId===msg.commandId);if(cached)return {...cached,duplicate:true};
  const p=players().find(p=>p.id===actorId),v=vehicles.find(v=>v.id===msg.vehicleId);let code='INVALID',ok=false,exit=null;
  if(p&&msg.epoch===meta.id&&validId(msg.commandId)&&['enter','exit'].includes(msg.operation)){
   if(!active()||p.hp<=0||p.fall||p.swimming)code='NOT_ACTIVE';
   else if(!v)code='UNKNOWN_VEHICLE';
   else if(msg.operation==='exit'){
    if(!v.seats.includes(actorId))code='NOT_SEATED';else if(Math.abs(v.speed)>.2)code='MOVING';else if(!(exit=exitPoint(v,p)))code='EXIT_BLOCKED';
    else{v.seats[v.seats.indexOf(actorId)]=null;v.speed=0;inputs.delete(actorId);ok=true;code='EXITED';}
   }else if(mounted(actorId))code='ALREADY_SEATED';
   else if(distance(p,v)>3.5||Math.abs(p.y-v.y)>1.2)code='TOO_FAR';
   else if(!walkClear(p,v))code='BLOCKED';
   else if(Math.abs(v.speed)>.2)code='MOVING';else if(v.seats.every(Boolean))code='FULL';
   else{v.seats[v.seats.indexOf(null)]=actorId;inputs.delete(actorId);onBoard(actorId);ok=true;code='ENTERED';}
   const result={kind:'vehicle',actorId,commandId:msg.commandId,ok,code};results.push(result);if(results.length>64)results.shift();return {...result,...(exit?{exit}:{} )};
  }return {kind:'vehicle',actorId,commandId:msg.commandId,ok,code};
 }
 function step(tick){if(!active())return;
  for(const v of vehicles){
   // A downed occupant is released at the already validated vehicle centre.
   for(let seat=0;seat<2;seat++)if(v.seats[seat]&&players().find(p=>p.id===v.seats[seat])?.hp<=0){inputs.delete(v.seats[seat]);v.seats[seat]=null;v.speed=0;}
   const driver=v.seats[0],entry=inputs.get(driver),input=driver&&entry&&tick-entry.tick<=8?entry.input:{forward:0,turn:0};
   const target=input.forward*(input.forward<0?6:14),delta=Math.max(-8/30,Math.min(8/30,target-v.speed));v.speed+=delta;
   if(!driver||!entry||tick-entry.tick>8){v.speed=0;continue;}
   const hd=v.hd+input.turn*1.25/30*Math.min(1,Math.abs(v.speed)/3)*(v.speed<0?-1:1),next={...v,hd,x:v.x-Math.sin(hd)*v.speed/30,z:v.z-Math.cos(hd)*v.speed/30};
   if(vehicleClear(next,world(),meta.bounds,v)){v.x=next.x;v.z=next.z;v.hd=hd;}else v.speed=0;
  }
 }
 return {mounted,position,command,step,accept(id,input,tick){if(mounted(id))inputs.set(id,{input:{...input},tick});},pause(){inputs.clear();for(const v of vehicles)v.speed=0;},snapshot(){return structuredClone(vehicles);},checkpoint(){return structuredClone({vehicles,results});}};
}
