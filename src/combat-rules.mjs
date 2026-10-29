import {wholeDamage} from './player-simulation.mjs';
// Escala única de resistència i armes per a tots els bàndols.
export const combatBalance=Object.freeze({
 player:20,medkit:8,
 people:Object.freeze({soldier:4,elite:8,general:8}),
 weapons:Object.freeze({knife:2,pistol:2,rifle:2,eliteRifle:2,sniper:10,tankette:2,attackCannon:2,bazooka:8,grenade:10,c4:20,tank:12,heliMissile:12,boatRocket:12,towerLight:2,towerHeavy:12}),
 vehicles:Object.freeze({bici:1,moto:2,cotxe:5,cotxe_civil:4,camio:10,tanqueta:12,tanc:20,windsurf:1,barca_rems:2,moto_aquatica:3,llanxa:5,llanxa_coets:10,ferry:15,hover:6,heli:10,heli_combat:15})
});

// Pure rules extracted unchanged from individual combat. No DOM, renderer or network.
export function impactDamage(relativeSpeed,receiverMass=1,strikerMass=1){
 // Els cops entre vehicles fins a 10 són maniobres, no impactes destructius.
 if(!(relativeSpeed>10))return 0;
 const ratio=Math.sqrt(Math.max(.2,strikerMass)/Math.max(.2,receiverMass));
 return Math.max(1,Math.min(5,Math.ceil((relativeSpeed-10)*ratio/6)));
}

export function runoverDamage(speed,mass=1){
 if(!(speed>RUNOVER_MIN_SPEED))return 0;
 return Math.min(RUNOVER_MAX_DAMAGE,Math.max(1,Math.ceil(
  (speed-RUNOVER_MIN_SPEED)*Math.max(.2,mass)*RUNOVER_MAX_DAMAGE/(23*2.2)
 )));
}

export function segmentAabbT(x0,y0,z0,x1,y1,z1,minX,maxX,minY,maxY,minZ,maxZ){
  let lo=0,hi=1;
  const clip=(p,d,mn,mx)=>{
    if(Math.abs(d)<1e-9)return p>=mn&&p<=mx;
    let a=(mn-p)/d,b=(mx-p)/d;if(a>b){const q=a;a=b;b=q}
    lo=Math.max(lo,a);hi=Math.min(hi,b);return lo<=hi
  };
  return clip(x0,x1-x0,minX,maxX)&&clip(y0,y1-y0,minY,maxY)&&clip(z0,z1-z0,minZ,maxZ)&&hi>=0&&lo<=1?Math.max(0,lo):null
}

export function explosionDamage(dmg,distance,r){return distance>=r?0:Math.max(1,Math.ceil(dmg*(1-distance/r)))}
const RUNOVER_MIN_SPEED=6,RUNOVER_MAX_DAMAGE=10;

export const ASSAULT_BURST_SPACING=.075;
export function cancelBurst(state){state.remaining=0;state.delay=0;}
export function beginBurst(state,ammo,fire){if(state.remaining||ammo<3||!fire(0))return false;state.remaining=2;state.delay=ASSAULT_BURST_SPACING;return true;}
export function stepBurst(state,dt,allowed,fire){
 if(!state.remaining)return;
 if(!allowed){cancelBurst(state);return;}
 state.delay-=dt;if(state.delay>0)return;
 if(!fire(3-state.remaining)){cancelBurst(state);return;}
 state.remaining--;if(state.remaining)state.delay+=ASSAULT_BURST_SPACING;else state.delay=0;
}

// Existing relay training tuning; only data differs, never the damage formulas.
export const relayCombatBalance=Object.freeze({...combatBalance,weapons:Object.freeze({...combatBalance.weapons,pistol:4,grenade:16})});

export function segmentSphereT(x0,y0,z0,x1,y1,z1,cx,cy,cz,r){
  const dx=x1-x0,dy=y1-y0,dz=z1-z0,mx=x0-cx,my=y0-cy,mz=z0-cz,
        a=dx*dx+dy*dy+dz*dz,c=mx*mx+my*my+mz*mz-r*r;
  if(c<=0)return 0;if(a<1e-12)return null;
  const b=2*(mx*dx+my*dy+mz*dz),disc=b*b-4*a*c;if(disc<0)return null;
  const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null
}

export function inView(heading,dx,dy,dz,range,CONFIG){
    const horizontal=Math.hypot(dx,dz),dist=Math.hypot(horizontal,dy);
    if(dist>range||horizontal<.001)return false;
    // El model avança cap a -Z, amb hd com a rotació mundial de Y.
    const forward=(-Math.sin(heading)*dx-Math.cos(heading)*dz)/horizontal;
    return forward>=Math.cos(CONFIG.sightHalfAngle)&&
      Math.abs(Math.atan2(dy,horizontal))<=CONFIG.sightVerticalAngle;
  }

// Semi-implicit Euler step used by the individual grenade and its trajectory preview.
// The caller owns contacts, effects and fuse policy.
export function ballisticStep(body,dt,gravity=24){
 const vy=body.vy-gravity*dt;
 return {x:body.x+body.vx*dt,y:body.y+vy*dt,z:body.z+body.vz*dt,vy};
}

// Vehicle health and hull rules extracted from individual combat. Geometry adapters
// supply the existing collision radius (the relay's Humvee uses its reduced scale).
export const VEHICLE_DESTRUCTION=Object.freeze({damage:10,radius:8,occupantMin:4,occupantMax:6});
export const isArmoredVehicleType=t=>t==='tanqueta'||t==='tanc';
export function vehicleDamage(vehicle,damage,impacts=1,shotClass='collision',fallbackLife=1){
 const before=vehicle.life??fallbackLife;
 if(vehicle.destroyed||shotClass==='light'&&isArmoredVehicleType(vehicle.t))return {life:before,damaged:false,destroyed:false};
 const amount=shotClass==='collision'?Math.max(1,wholeDamage(impacts)):wholeDamage(damage);
 if(!amount)return {life:before,damaged:false,destroyed:false};
 const life=Math.max(0,Math.ceil(before)-amount);
 return {life,damaged:life<before,destroyed:life<=0};
}
export function vehicleHullDistance(vehicle,baseY,radius,x,y,z){
 return Math.max(0,Math.hypot(vehicle.x-x,baseY+1-y,vehicle.z-z)-radius);
}
export function vehicleHullSegmentT(from,to,vehicle,baseY,radius){
 return segmentSphereT(from.x,from.y,from.z,to.x,to.y,to.z,vehicle.x,baseY+1,vehicle.z,radius);
}
