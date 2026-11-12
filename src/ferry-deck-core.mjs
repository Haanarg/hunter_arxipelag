// La geometria del ferri original, compartida entre la simulació i el COOP.
import {vehicleSpecs} from './vehicle-specs.mjs';
const D=vehicleSpecs.decks.ferry,sc=vehicleSpecs.scales.ferry||1;
export function ferryLocal(f,x,z){
 const dx=x-f.x,dz=z-f.z,s=Math.sin(f.hd),c=Math.cos(f.hd);
 return {x:dx*c-dz*s,z:dx*s+dz*c};
}
export function ferryWorld(f,x,z){
 const s=Math.sin(f.hd),c=Math.cos(f.hd);
 return {x:f.x+x*c+z*s,z:f.z-x*s+z*c};
}
export function ferrySurfaceY(f,lz){
 const base=f.o?.position?.y??f.y??0,edge=D.halfL*sc,ramp=D.ramp*sc,top=D.y*sc;
 if(Math.abs(lz)<=edge)return base+top;
 const t=Math.max(0,Math.min(1,(Math.abs(lz)-edge)/Math.max(.01,ramp)));
 const speed=Math.abs(f.v||0),raised=Math.max(0,Math.min(1,(speed-.4)/1.6)),
   tip=(D.rampY*sc)*(1-raised)+(top+Math.sin(.88)*ramp)*raised;
 return base+top+(tip-top)*t;
}
export function ferryCabinContains(x,z,margin=0){
 const c=D.cabin;
 return Math.abs(x-c.x*sc)<c.halfW*sc+margin &&
   Math.abs(z-c.z*sc)<c.halfL*sc+margin;
}
export function ferryWalkable(x,z,margin=0){
 const ax=Math.abs(x)+margin,az=Math.abs(z)+margin;
 return az<=(D.halfL+D.ramp)*sc &&
   ax<=(az<=D.halfL*sc?D.halfW:D.rampHalfW)*sc;
}
export function ferryPedestrianAt(f,x,z,previousY,margin=.62){
 if(!f||f.destroyed||f.t!=='ferry'||!Number.isFinite(previousY))return null;
 const q=ferryLocal(f,x,z),y=ferrySurfaceY(f,q.z);
 // Ningú no pot pujar des de sota del casc per un canvi de snapshot.
 if(!ferryWalkable(q.x,q.z,margin)||ferryCabinContains(q.x,q.z,margin)||
     Math.abs(previousY-y)>2.1)return null;
 return {f,q,y};
}
export function ferryForVehicle(v,fleet,x=v.x,z=v.z,includeRamp=true){
 if(v.t==='ferry')return null;
 const size=vehicleSpecs.hitboxes[v.t],vs=vehicleSpecs.scales[v.t]||1;
 if(!size)return null;
 for(const f of fleet){
  if(f===v||f.destroyed||f.t!=='ferry')continue;
  const q=ferryLocal(f,x,z),fw=D.halfW*sc,fl=D.halfL*sc,r=includeRamp?D.ramp*sc:0,
    rel=Math.atan2(Math.sin(v.hd-f.hd),Math.cos(v.hd-f.hd)),
    ca=Math.abs(Math.cos(rel)),sa=Math.abs(Math.sin(rel)),
    ex=(ca*size[0]+sa*size[1])*vs/2,ez=(sa*size[0]+ca*size[1])*vs/2,
    ax=Math.abs(q.x),az=Math.abs(q.z);
  if(ax+ex>fw-.18)continue;
  if(az+ez<=fl)return f;
  if(includeRamp&&Math.abs(f.v||0)<.8&&az-ez<=fl+r+.65&&az<=fl+r+ez+.65&&
      ax+ex<=D.rampHalfW*sc+.45)return f;
 }
 return null;
}
export function ferryCabinBox(f){
 const c=D.cabin,p=ferryWorld(f,c.x*sc,c.z*sc);
 return {...p,hd:f.hd,w:c.halfW*2*sc,d:c.halfL*2*sc};
}
export function ferryCarriedPose(v,f){
 const p=ferryWorld(f,v.carrierLX||0,v.carrierLZ||0);
 const h=f.hd+(v.carrierHD||0);
 return {...p,hd:Math.atan2(Math.sin(h),Math.cos(h)),
   y:ferrySurfaceY(f,v.carrierLZ||0)+.06};
}
