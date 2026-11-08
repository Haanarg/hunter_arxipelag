import {palmCrushRadius,rockVerticalBand} from './vehicle-environment-core.mjs';
import {fenceVehicleContact,obbOverlap,relativeVehicleImpactSpeed,impactDamage} from './combat-rules.mjs';
import {vehicleSpecs} from './vehicle-specs.mjs';
import {vehicleDynamics} from './vehicle-dynamics-core.mjs';
import {ferryPedestrianAt,ferryForVehicle,ferryCabinBox,ferrySurfaceY,ferryLocal} from './ferry-deck-core.mjs';
export function contactBox(v,proving=true){const size=vehicleSpecs.hitboxes[v.t],scale=vehicleSpecs.scales[v.t];return {x:v.x,z:v.z,hd:v.hd,w:proving?size[0]*scale:1.8,d:proving?size[1]*scale:3.2};}
function top(v,proving){return v.y+(proving?(vehicleDynamics.types[v.t].m==='a'?7:['tanc','camio'].includes(v.t)?5.6:4.2)*(vehicleSpecs.scales[v.t]||1):3);}
// Sweep translation and rotation, so fast vehicles cannot jump a thin wall.
export function firstVehicleContact(v,from,others,geometry,proving=true,world=null){
 const box=contactBox(v,proving),angle=Math.atan2(Math.sin(v.hd-from.hd),Math.cos(v.hd-from.hd)),travel=Math.hypot(v.x-from.x,v.z-from.z)+Math.abs(angle)*Math.hypot(box.w,box.d)/2;
 const steps=Math.max(1,Math.ceil(travel/.2));let safe={x:from.x,y:from.y,z:from.z,hd:from.hd};
 for(let i=1;i<=steps;i++){
  const t=i/steps,p={...v,x:from.x+(v.x-from.x)*t,y:from.y+(v.y-from.y)*t,z:from.z+(v.z-from.z)*t,hd:from.hd+angle*t},footprint=contactBox(p,proving);
  // Els tancs poden travessar les runes baixes del pou després de
  // destruir-lo; les altres classes de vehicles les continuen esquivant.
  for(const wall of geometry.walls)if(!(v.t==='tanc'&&wall.civicRubble)&&!wall.open&&wall.playerBlock!==false&&wall.y1>p.y-.5&&wall.y0<top(p,proving)&&(wall.barbed&&Number.isFinite(wall.ax)&&Number.isFinite(wall.bx)?fenceVehicleContact(wall,{...footprint,v:p}):obbOverlap(footprint,{x:(wall.x0+wall.x1)/2,z:(wall.z0+wall.z1)/2,hd:0,w:Math.max(.05,wall.x1-wall.x0),d:Math.max(.05,wall.z1-wall.z0)})))return {kind:'wall',target:wall,safe};
  const ferry=ferryForVehicle(p,others,p.x,p.z,true);
  if(ferry&&Math.abs(p.y-ferrySurfaceY(ferry,ferryLocal(ferry,p.x,p.z).z))<5&&
     obbOverlap(footprint,ferryCabinBox(ferry)))
    return {kind:'wall',target:{rammable:false},safe};
  for(const other of others)if(other.id!==v.id&&!other.destroyed&&
    !(other.t==='ferry'&&ferry?.id===other.id)&&
    !(v.t==='ferry'&&other.carrierId===v.id)&&
    Math.abs(p.y-other.y)<Math.max(2.2,Math.min(vehicleSpecs.radii[v.t],vehicleSpecs.radii[other.t]))*.55&&
    obbOverlap(footprint,contactBox(other,proving)))
      return {kind:'vehicle',target:other,safe};
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

// Col·lisió de les persones a peu amb els mateixos volums dels vehicles
// que empra la simulació de conducció. No s'aplica a ocupants.
export function resolveCoopPlayerVehicleContact(previous,candidate,vehicles,actorId,radius=.65){
 let x=candidate.x,z=candidate.z;
 for(const v of vehicles||[]){
  if(v.destroyed||v.seats?.includes(actorId))continue;
  if(v.t==='ferry'&&ferryPedestrianAt(v,x,z,previous.y??candidate.y))continue;
  const scale=vehicleSpecs.scales[v.t]||1,box=vehicleSpecs.hitboxes[v.t];
  if(!box||Math.abs((previous.y??0)-v.y)>Math.max(2.8,scale*2.2))continue;
  const hw=box[0]*scale/2,hd=box[1]*scale/2;
  if(Math.abs(x-v.x)>hw+hd+radius||Math.abs(z-v.z)>hw+hd+radius)continue;
  const c=Math.cos(v.hd),sn=Math.sin(v.hd),dx=x-v.x,dz=z-v.z;
  let lx=dx*c-dz*sn,lz=dx*sn+dz*c;
  const px=Math.max(-hw,Math.min(hw,lx)),pz=Math.max(-hd,Math.min(hd,lz));
  let ex=lx-px,ez=lz-pz,dist=Math.hypot(ex,ez);
  if(dist>=radius)continue;
  if(dist<1e-7){
   const edgeX=hw-Math.abs(lx),edgeZ=hd-Math.abs(lz);
   if(edgeX<edgeZ)lx=(lx<0?-1:1)*(hw+radius);
   else lz=(lz<0?-1:1)*(hd+radius);
  }else{
   lx+=(ex/dist)*(radius-dist);
   lz+=(ez/dist)*(radius-dist);
  }
  x=v.x+lx*c+lz*sn;z=v.z-lx*sn+lz*c;
 }
 return {...candidate,x,z};
}
