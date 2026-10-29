import {vehicleDynamics,advanceVehicle,stepHelicopterLift} from './vehicle-dynamics-core.mjs';
import {vehicleSpecs} from './vehicle-specs.mjs';
// World contacts for the obstacle-free proving range. All drive, shore, flooding
// and lift equations belong to the original shared vehicle dynamics.
export function stepRangeVehicle(v,input,dt,tick,world,water,bounds){
 const c=vehicleDynamics.types[v.t],land=c.m==='l',air=c.m==='a',shore=vehicleDynamics.shore,waterAt=(x,z)=>water.surfaceAt(x,z,tick/30);
 const flooded=land?shore.wetLand(v,shore.depth(v.x,v.z,world.heightAt,waterAt),dt):null;
 if(v.sunk){v.v=0;return;}
 const control=vehicleDynamics.inputs(v,input.forward,input.turn,dt),forward=flooded?.disabled?0:control.forward*(flooded?.engine??1),side=advanceVehicle(v,forward,control.turn,dt,input.strafe||0,{drag:flooded?.drag||0})+v.strafeV;
 const fx=-Math.sin(v.hd),fz=-Math.cos(v.hd),sx=Math.cos(v.hd),sz=-Math.sin(v.hd);
 let nx=v.x+(fx*v.v+sx*side)*dt,nz=v.z+(fz*v.v+sz*side)*dt;
 if(c.m==='w'){
  const size=vehicleSpecs.hitboxes[v.t],scale=vehicleSpecs.scales[v.t],footprint={x:v.x,z:v.z,hd:v.hd,w:size[0]*scale,d:size[1]*scale},current=shore.clearance(v,v.x,v.z,footprint,world.heightAt,waterAt);
  let next=shore.clearance(v,nx,nz,footprint,world.heightAt,waterAt),contact=shore.boatContact(v,current,next,dt);
  if(contact.shallow>0){v.v*=Math.exp(-contact.drag*dt);nx=v.x+(fx*v.v+sx*side)*dt;nz=v.z+(fz*v.v+sz*side)*dt;next=shore.clearance(v,nx,nz,footprint,world.heightAt,waterAt);contact=shore.boatContact(v,current,next,dt);}
  if(contact.blocked){const dx=nx-v.x,dz=nz-v.z;let lo=0,hi=1;for(let i=0;i<9;i++){const m=(lo+hi)/2,clear=shore.clearance(v,v.x+dx*m,v.z+dz*m,footprint,world.heightAt,waterAt);if(clear>=contact.limit)lo=m;else hi=m;}nx=v.x+dx*lo;nz=v.z+dz*lo;v.v*=-.055;}
 }
 if(nx>bounds.x0+2&&nx<bounds.x1-2&&nz>bounds.z0+2&&nz<bounds.z1-2){v.x=nx;v.z=nz;}else{v.v=0;v.sideV=0;v.strafeV=0;}
 const ground=world.heightAt(v.x,v.z),surface=waterAt(v.x,v.z);
 if(air){v.alt??=v.y;stepHelicopterLift(v,input.climb||0,dt,Math.max(0,ground)+.06);if(v.verticalV<0&&v.alt<=Math.max(0,ground)+.061)v.verticalV=0;v.y=v.alt;}
 else if(c.m==='w')v.y=surface;
 else if(c.m==='wl')v.y=Math.max(ground,surface)+.6;
 else{v.y=ground+.06;if(v.waterIngress?.dead)v.y=Math.max(ground-.4,surface-v.waterIngress.sink);}
}
