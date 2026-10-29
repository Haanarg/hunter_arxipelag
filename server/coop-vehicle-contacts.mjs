import {obbOverlap,relativeVehicleImpactSpeed,impactDamage} from '../src/combat-rules.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {vehicleDynamics} from '../src/vehicle-dynamics-core.mjs';
export function contactBox(v,proving=true){const size=vehicleSpecs.hitboxes[v.t],scale=vehicleSpecs.scales[v.t];return {x:v.x,z:v.z,hd:v.hd,w:proving?size[0]*scale:1.8,d:proving?size[1]*scale:3.2};}
function top(v,proving){return v.y+(proving?(vehicleDynamics.types[v.t].m==='a'?7:['tanc','camio'].includes(v.t)?5.6:4.2)*(vehicleSpecs.scales[v.t]||1):3);}
// Sweep translation and rotation, so fast vehicles cannot jump a thin wall.
export function firstVehicleContact(v,from,others,geometry,proving=true){
 const box=contactBox(v,proving),angle=Math.atan2(Math.sin(v.hd-from.hd),Math.cos(v.hd-from.hd)),travel=Math.hypot(v.x-from.x,v.z-from.z)+Math.abs(angle)*Math.hypot(box.w,box.d)/2;
 const steps=Math.max(1,Math.ceil(travel/.2));let safe={x:from.x,y:from.y,z:from.z,hd:from.hd};
 for(let i=1;i<=steps;i++){
  const t=i/steps,p={...v,x:from.x+(v.x-from.x)*t,y:from.y+(v.y-from.y)*t,z:from.z+(v.z-from.z)*t,hd:from.hd+angle*t},footprint=contactBox(p,proving);
  for(const wall of geometry.walls)if(!wall.open&&wall.playerBlock!==false&&wall.y1>p.y-.5&&wall.y0<top(p,proving)&&obbOverlap(footprint,{x:(wall.x0+wall.x1)/2,z:(wall.z0+wall.z1)/2,hd:0,w:Math.max(.05,wall.x1-wall.x0),d:Math.max(.05,wall.z1-wall.z0)}))return {kind:'wall',target:wall,safe};
  for(const other of others)if(other.id!==v.id&&!other.destroyed&&Math.abs(p.y-other.y)<Math.max(2.2,Math.min(vehicleSpecs.radii[v.t],vehicleSpecs.radii[other.t]))*.55&&obbOverlap(footprint,contactBox(other,proving)))return {kind:'vehicle',target:other,safe};
  safe={x:p.x,y:p.y,z:p.z,hd:p.hd};
 }return null;
}
export function vehicleContactDamage(v,other){const rel=relativeVehicleImpactSpeed(v,other),a=vehicleDynamics.types[v.t].mass||1,b=vehicleDynamics.types[other.t].mass||1;return {relative:rel,own:v.t==='tanc'?0:impactDamage(rel,a,b),other:other.t==='tanc'?0:impactDamage(rel,b,a)};}
