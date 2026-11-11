import {vehicleSpecs} from './vehicle-specs.mjs';
// Tank/tankette rig coordinates and controller, shared by visual model and server.
export const turretSpecs=Object.freeze({
 // Pivots del BTR-82 3B visual (mateixos en navegador i servidor COOP).
 tanqueta:Object.freeze({pivot:[0,2.8531875,-.30225],pitch:[0,.2145,.22425],muzzle:[0,0,-3.07125],turretYawRate:2.05,turretMinPitch:-.42,turretMaxPitch:.43}),
 tanc:Object.freeze({pivot:[0,2.54,.1],pitch:[0,.08,-1.1],muzzle:[0,0,-4.35],turretYawRate:1.40,turretMinPitch:-.62,turretMaxPitch:.72})
});
export function advanceTurret(state,currentYaw,currentPitch,local,dt,config=state){
 const yaw=Math.hypot(local.x,local.z)<1e-4?currentYaw:Math.atan2(-local.x,-local.z),
  elev=Math.max(config.turretMinPitch??-.42,Math.min(config.turretMaxPitch??.43,Math.atan2(local.y,Math.hypot(local.x,local.z)))),
  step=Math.min(.08,Math.max(0,Number.isFinite(dt)?dt:0));
 const approach=(angle,target,key,maxSpeed,wrap)=>{
  const delta=wrap?Math.atan2(Math.sin(target-angle),Math.cos(target-angle)):target-angle;
  const desired=Math.max(-maxSpeed,Math.min(maxSpeed,delta*3.8));
  let velocity=state[key]||0;velocity+=(desired-velocity)*(1-Math.exp(-8*step));
  const move=velocity*step;if(Math.abs(move)>=Math.abs(delta)){state[key]=0;return angle+delta;}
  state[key]=velocity;return angle+move;
 };
 const nextYaw=approach(currentYaw,yaw,'turretYawSpeed',config.turretYawRate||1.55,true),
  nextPitch=approach(currentPitch,elev,'turretPitchSpeed',.85,false),
  yawError=Math.atan2(Math.sin(yaw-nextYaw),Math.cos(yaw-nextYaw));
 return {yaw:nextYaw,pitch:nextPitch,aligned:Math.abs(yawError)<.085&&Math.abs(elev-nextPitch)<.085};
}
export function stepVehicleTurret(v,direction,dt){
 const config=turretSpecs[v.t];if(!config)return false;
 const [dx,dy,dz]=direction,c=Math.cos(v.hd),s=Math.sin(v.hd),local={x:c*dx-s*dz,y:dy,z:s*dx+c*dz};
 const result=advanceTurret(v,v.turretYaw||0,v.turretPitch||0,local,dt,config);
 v.turretYaw=result.yaw;v.turretPitch=result.pitch;return result.aligned;
}
// Same Y(chassis) * Y(turret) * X(barrel) hierarchy as the original Three rig.
export function vehicleGunPose(v){
 const spec=turretSpecs[v.t];if(!spec)return null;
 const yaw=v.turretYaw||0,pitch=v.turretPitch||0,sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch),
  [px,py,pz]=spec.pivot,[ex,ey,ez]=spec.pitch,[mx,my,mz]=spec.muzzle,
  bx=ex+mx,by=ey+cp*my-sp*mz,bz=ez+sp*my+cp*mz,
  x=px+cy*bx+sy*bz,y=py+by,z=pz-sy*bx+cy*bz,
  c=Math.cos(v.hd),s=Math.sin(v.hd),scale=vehicleSpecs.scales[v.t],heading=v.hd+yaw;
 return {origin:{x:v.x+scale*(c*x+s*z),y:v.y+scale*y,z:v.z+scale*(-s*x+c*z)},direction:[-Math.sin(heading)*cp,sp,-Math.cos(heading)*cp]};
}
