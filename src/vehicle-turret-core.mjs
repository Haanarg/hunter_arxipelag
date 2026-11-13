import {vehicleSpecs} from './vehicle-specs.mjs';
// Tank/tankette rig coordinates and controller, shared by visual model and server.
export const turretSpecs=Object.freeze({
 // Pivots del BTR-82 3B visual (mateixos en navegador i servidor COOP).
 tanqueta:Object.freeze({pivot:[0,2.748375,-.936],pitch:[0,.160875,.22425],muzzle:[0,0,-3.07125],turretYawRate:2.05,manualYawRate:.70,manualPitchRate:.30,turretMinPitch:-.17,turretMaxPitch:.43}),
 // T-90M del laboratori x1,5: torreta 1,62·1,5, elevació .36·1,5 i boca -4,848·1,5.
 tanc:Object.freeze({pivot:[0,2.43,-.36],pitch:[0,.54,-1.83],muzzle:[0,0,-7.272],turretYawRate:1.40,manualYawRate:.55,manualPitchRate:.26,turretMinPitch:-.16,turretMaxPitch:.72})
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
 // A l'autoapuntat no s'hereta la inèrcia d'una sessió manual anterior.
 v.manualTurretYawSpeed=0;v.manualTurretPitchSpeed=0;
 const [dx,dy,dz]=direction,c=Math.cos(v.hd),s=Math.sin(v.hd),local={x:c*dx-s*dz,y:dy,z:s*dx+c*dz};
 const result=advanceTurret(v,v.turretYaw||0,v.turretPitch||0,local,dt,config);
 v.turretYaw=result.yaw;v.turretPitch=result.pitch;return result.aligned;
}
// Turret roles are seat-bound while the vehicle has two human occupants.
// A solo driver may temporarily assume turret control via SHIFT / TORRETA.
export const isArmoredTurretVehicle=type=>type==='tanc'||type==='tanqueta';
export function turretControllerId(vehicle){
 if(!vehicle||!isArmoredTurretVehicle(vehicle.t))return null;
 return vehicle.seats?.[1]||vehicle.seats?.[0]||null;
}
export function armoredSeatRole(vehicle,actorId){
 if(!vehicle||!actorId||!isArmoredTurretVehicle(vehicle.t))return null;
 return vehicle.seats?.[0]===actorId?'driver':vehicle.seats?.[1]===actorId?'gunner':null;
}
// Use exactly the same angular limits and rates in solo and authoritative COOP.
export function stepManualTurret(state,type,turn,lift,dt){
 const config=turretSpecs[type];if(!config)return null;
 const seconds=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
 const clamp=v=>Math.max(-1,Math.min(1,Number.isFinite(v)?v:0));
 // Velocitats manuals més lentes que l'autoapuntat, amb arrencada i
 // frenada suaus. El mateix estat persisteix al client i al Worker COOP.
 const blend=1-Math.exp(-7*seconds);
 const ease=(previous,target)=>{
  const next=(previous||0)+(target-(previous||0))*blend;
  return Math.abs(next)<.0007&&Math.abs(target)<1e-9?0:next;
 };
 const yawSpeed=ease(state.manualTurretYawSpeed,clamp(turn)*config.manualYawRate);
 const pitchSpeed=ease(state.manualTurretPitchSpeed,clamp(lift)*config.manualPitchRate);
 const yaw=(state.turretYaw||0)+yawSpeed*seconds;
 const currentPitch=Math.max(config.turretMinPitch,
  Math.min(config.turretMaxPitch,state.turretPitch||0));
 const pitch=Math.max(config.turretMinPitch,Math.min(config.turretMaxPitch,
  currentPitch+pitchSpeed*seconds));
 state.turretYaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));
 state.turretPitch=pitch;
 state.manualTurretYawSpeed=yawSpeed;
 // Sense empenyer contínuament un límit mecànic amb velocitat residual.
 state.manualTurretPitchSpeed=pitch===currentPitch&&
  (pitch===config.turretMinPitch&&pitchSpeed<0||
   pitch===config.turretMaxPitch&&pitchSpeed>0)?0:pitchSpeed;
 state.turretYawSpeed=0;state.turretPitchSpeed=0;
 return {yaw:state.turretYaw,pitch};
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
