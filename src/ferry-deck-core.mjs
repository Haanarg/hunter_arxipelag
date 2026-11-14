// Geometria i suport del ferri, compartits entre SOLO i COOP.
import {vehicleSpecs} from './vehicle-specs.mjs';
const D=vehicleSpecs.decks.ferry,sc=vehicleSpecs.scales.ferry||1;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function ferryLocal(f,x,z){
 const dx=x-f.x,dz=z-f.z,s=Math.sin(f.hd),c=Math.cos(f.hd);
 return {x:dx*c-dz*s,z:dx*s+dz*c};
}
export function ferryWorld(f,x,z){
 const s=Math.sin(f.hd),c=Math.cos(f.hd);
 return {x:f.x+x*c+z*s,z:f.z-x*s+z*c};
}
export function ferryStopped(f){return Math.abs(f.v||0)<.8&&Math.abs(f.driveInput||0)<.2;}
const baseY=f=>f.o?.position?.y??f.y??0;
export function ferryRampAngle(f,side,groundAt,waterAt){
 if(!ferryStopped(f))return -.88;
 const length=D.ramp*sc,tip=ferryWorld(f,0,side*(D.halfL+D.ramp)*sc);
 const support=Math.max(groundAt(tip.x,tip.z),waterAt(tip.x,tip.z));
 return clamp(Math.asin(clamp((baseY(f)+D.y*sc-support)/length,-1,1)),-.16,.58);
}
function angleAt(f,side){
 const hinge=f.o?.userData?.ferryRamps?.find(r=>r.side===side)?.hinge;
 return hinge?hinge.rotation.x*side:f.rampAngles?.[side]??(ferryStopped(f)?Math.asin((D.y-D.rampY)/D.ramp):-.88);
}
function rampRun(f,side){return D.ramp*sc*Math.cos(angleAt(f,side));}
export function ferrySurfaceY(f,lz){
 const base=baseY(f),edge=D.halfL*sc,top=D.y*sc,side=Math.sign(lz)||1;
 if(Math.abs(lz)<=edge)return base+top;
 const angle=angleAt(f,side),run=rampRun(f,side),distance=clamp(Math.abs(lz)-edge,0,run);
 return base+top-Math.tan(angle)*distance;
}
export function ferryCabinContains(x,z,margin=0){
 const c=D.cabin;
 return Math.abs(x-c.x*sc)<c.halfW*sc+margin&&Math.abs(z-c.z*sc)<c.halfL*sc+margin;
}
export function ferryWalkable(x,z,margin=0,f=null){
 const ax=Math.abs(x)+margin,az=Math.abs(z),edge=D.halfL*sc,
   run=f?rampRun(f,Math.sign(z)||1):D.ramp*sc;
 return az<=edge+run+margin&&ax<=(az<=edge?D.halfW:D.rampHalfW)*sc;
}
export function ferryPedestrianAt(f,x,z,previousY,margin=.62,allowCabin=false){
 if(!f||f.destroyed||f.t!=='ferry'||!Number.isFinite(previousY))return null;
 const q=ferryLocal(f,x,z),y=ferrySurfaceY(f,q.z),ramp=Math.abs(q.z)>D.halfL*sc;
 if(!ferryWalkable(q.x,q.z,margin,f)||!allowCabin&&ferryCabinContains(q.x,q.z,margin)||
    Math.abs(previousY-y)>(ramp?1.35:2.1))return null;
 return {f,q,y};
}
export function ferryCabinPush(f,x,z,margin=.65){
 const q=ferryLocal(f,x,z),c=D.cabin,dx=q.x-c.x*sc,dz=q.z-c.z*sc;
 if(!ferryCabinContains(q.x,q.z,margin))return {x,z};
 const ex=c.halfW*sc+margin-Math.abs(dx),ez=c.halfL*sc+margin-Math.abs(dz);
 if(ex<ez)q.x=c.x*sc+(dx<0?-1:1)*(c.halfW*sc+margin);
 else q.z=c.z*sc+(dz<0?-1:1)*(c.halfL*sc+margin);
 return ferryWorld(f,q.x,q.z);
}
export function ferryForVehicle(v,fleet,x=v.x,z=v.z,includeRamp=true){
 if(v.t==='ferry'||v.destroyed||v.sunk||v.waterIngress?.dead)return null;
 const size=vehicleSpecs.hitboxes[v.t],vs=vehicleSpecs.scales[v.t]||1;
 if(!size)return null;
 for(const f of fleet){
  if(f===v||f.destroyed||f.t!=='ferry')continue;
  const q=ferryLocal(f,x,z),fw=D.halfW*sc,fl=D.halfL*sc,
    rel=v.hd-f.hd,ca=Math.abs(Math.cos(rel)),sa=Math.abs(Math.sin(rel)),
    ex=(ca*size[0]+sa*size[1])*vs/2,ez=(sa*size[0]+ca*size[1])*vs/2,
    ax=Math.abs(q.x),az=Math.abs(q.z),attached=v.carrier===f||v.carrierId!=null&&v.carrierId===f.id;
  if(ax+ex>fw-.18)continue;
  if(az+ez<=fl+.05)return f;
  if(!includeRamp||(!ferryStopped(f)&&!attached))continue;
  const end=fl+rampRun(f,Math.sign(q.z)||1);
  if(az-ez<=end+.8&&ax+ex<=D.rampHalfW*sc+.45)return f;
 }
 return null;
}
// Support from the wheelbase, not from the deep seabed at the vehicle centre.
export function ferryVehiclePose(v,f,groundAt,x=v.x,z=v.z){
 const size=vehicleSpecs.hitboxes[v.t],scale=vehicleSpecs.scales[v.t]||1,
   half=Math.max(.5,(size?.[1]||3)*scale*.34),s=Math.sin(v.hd),c=Math.cos(v.hd);
 function support(px,pz){
   const p=ferryLocal(f,px,pz),az=Math.abs(p.z),end=D.halfL*sc+rampRun(f,Math.sign(p.z)||1),
     rampY=ferrySurfaceY(f,p.z);
   if(az<=end)return rampY;
   const floor=groundAt(px,pz);
   return Number.isFinite(floor)?Math.max(floor,rampY-.65):rampY;
 }
 const front=support(x-s*half,z-c*half),rear=support(x+s*half,z+c*half);
 return {y:(front+rear)/2+.06,pitch:clamp(Math.atan2(front-rear,half*2),-.45,.45)};
}
export function ferryCabinBox(f){
 const c=D.cabin,p=ferryWorld(f,c.x*sc,c.z*sc);
 return {...p,hd:f.hd,w:c.halfW*2*sc,d:c.halfL*2*sc};
}
export function ferryCarriedPose(v,f,groundAt=()=>-Infinity){
 const p=ferryWorld(f,v.carrierLX||0,v.carrierLZ||0),h=f.hd+(v.carrierHD||0),hd=Math.atan2(Math.sin(h),Math.cos(h));
 return {...p,hd,y:ferryVehiclePose({...v,hd},f,groundAt,p.x,p.z).y};
}
