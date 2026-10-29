import {palmCrushRadius,rockVerticalBand} from '../src/vehicle-environment-core.mjs';
import {fenceVehicleContact,obbOverlap,relativeVehicleImpactSpeed,impactDamage} from '../src/combat-rules.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {vehicleDynamics} from '../src/vehicle-dynamics-core.mjs';
export function contactBox(v,proving=true){const size=vehicleSpecs.hitboxes[v.t],scale=vehicleSpecs.scales[v.t];return {x:v.x,z:v.z,hd:v.hd,w:proving?size[0]*scale:1.8,d:proving?size[1]*scale:3.2};}
function top(v,proving){return v.y+(proving?(vehicleDynamics.types[v.t].m==='a'?7:['tanc','camio'].includes(v.t)?5.6:4.2)*(vehicleSpecs.scales[v.t]||1):3);}
// Sweep translation and rotation, so fast vehicles cannot jump a thin wall.
export function firstVehicleContact(v,from,others,geometry,proving=true,world=null){
 const box=contactBox(v,proving),angle=Math.atan2(Math.sin(v.hd-from.hd),Math.cos(v.hd-from.hd)),travel=Math.hypot(v.x-from.x,v.z-from.z)+Math.abs(angle)*Math.hypot(box.w,box.d)/2;
 const steps=Math.max(1,Math.ceil(travel/.2));let safe={x:from.x,y:from.y,z:from.z,hd:from.hd};
 for(let i=1;i<=steps;i++){
  const t=i/steps,p={...v,x:from.x+(v.x-from.x)*t,y:from.y+(v.y-from.y)*t,z:from.z+(v.z-from.z)*t,hd:from.hd+angle*t},footprint=contactBox(p,proving);
  for(const wall of geometry.walls)if(!wall.open&&wall.playerBlock!==false&&wall.y1>p.y-.5&&wall.y0<top(p,proving)&&(wall.barbed&&Number.isFinite(wall.ax)&&Number.isFinite(wall.bx)?fenceVehicleContact(wall,{...footprint,v:p}):obbOverlap(footprint,{x:(wall.x0+wall.x1)/2,z:(wall.z0+wall.z1)/2,hd:0,w:Math.max(.05,wall.x1-wall.x0),d:Math.max(.05,wall.z1-wall.z0)})))return {kind:'wall',target:wall,safe};
  for(const other of others)if(other.id!==v.id&&!other.destroyed&&Math.abs(p.y-other.y)<Math.max(2.2,Math.min(vehicleSpecs.radii[v.t],vehicleSpecs.radii[other.t]))*.55&&obbOverlap(footprint,contactBox(other,proving)))return {kind:'vehicle',target:other,safe};
  if(world?.vegetationNear){
    const mode=vehicleDynamics.types[v.t].m,scale=vehicleSpecs.scales[v.t]||1,radius=vehicleSpecs.radii[v.t]*.48,crush=mode==='l'?palmCrushRadius(v.t,scale):0,
      band=rockVerticalBand(mode,world.heightAt(p.x,p.z),p.y,scale),near=world.vegetationNear(p.x,p.z,Math.max(radius,crush));
    const rock=near.filter(t=>t.rock&&t.topY>=band.baseY-.5&&t.bottomY<=band.topY+.5&&Math.hypot(t.x-p.x,t.z-p.z)<t.r+radius).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
    if(rock)return {kind:'rock',target:rock,safe,point:p};
    if(mode!=='a'&&mode!=='w')for(const tree of near)if(tree.p){
      const distance=Math.hypot(tree.x-p.x,tree.z-p.z);
      if(distance<tree.r+Math.max(radius,crush))return {kind:'palm',target:tree,safe,point:p,crush:crush>0&&distance<tree.r+crush};
    }
  }
  safe={x:p.x,y:p.y,z:p.z,hd:p.hd};
 }return null;
}
export function vehicleContactDamage(v,other){const rel=relativeVehicleImpactSpeed(v,other),a=vehicleDynamics.types[v.t].mass||1,b=vehicleDynamics.types[other.t].mass||1;return {relative:rel,own:v.t==='tanc'?0:impactDamage(rel,a,b),other:other.t==='tanc'?0:impactDamage(rel,b,a)};}
