import {wholeDamage,PLAYER_MAX_HEALTH} from './player-simulation.mjs?v=0.6.42';
// Escala única de resistència i armes per a tots els bàndols.
export const combatBalance=Object.freeze({
 player:PLAYER_MAX_HEALTH,medkit:8,
 people:Object.freeze({soldier:4,elite:8,general:8}),
 weapons:Object.freeze({knife:2,pistol:2,rifle:2,eliteRifle:2,sniper:5,tankette:2,attackCannon:2,bazooka:10,grenade:10,c4:20,tank:10,heliMissile:10,boatRocket:10,towerLight:2,towerHeavy:10}),
 vehicles:Object.freeze({bici:2,moto:4,cotxe:10,cotxe_civil:8,camio:20,tanqueta:20,tanc:40,windsurf:2,barca_rems:4,moto_aquatica:6,llanxa:10,llanxa_coets:20,ferry:30,hover:12,heli:20,heli_combat:30})
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
// A blast underneath a watchtower reaches its load-bearing legs before
// reaching the cabin. Never require a clear ray through the tower's own
// supports to its elevated gun box. Range remains a spherical 3-D distance.
export function towerExplosionAim(tower,origin,baseY=tower.y??0){
 const horizontal=Math.hypot(tower.x-origin.x,tower.z-origin.z);
 return {x:tower.x,y:horizontal<=5&&origin.y<baseY+8?
     baseY+2.2:baseY+9.4,z:tower.z};
}

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
export const isArmoredVehicleType=t=>t==='tanqueta'||t==='tanc'||t==='ferry';
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

// A friendly crew occupies the actual rotated vehicle footprint, not a small
// sphere: the latter let bullets pass through long or broad requisitioned cars.
// The extra margin prevents the normal weapon dispersion from clipping allies.
export function friendlyVehicleBlocksLine(from,to,v,{width,depth,baseY,height,margin=.7}){
 if(v.destroyed||!(width>0&&depth>0))return false;
 const yaw=v.hd||0,c=Math.cos(yaw),s=Math.sin(yaw),
   point=p=>({x:(p.x-v.x)*c-(p.z-v.z)*s,
              z:(p.x-v.x)*s+(p.z-v.z)*c});
 const a=point(from),b=point(to),hw=width/2+margin,hd=depth/2+margin;
 return segmentAabbT(a.x,from.y,a.z,b.x,to.y,b.z,
   -hw,hw,baseY-.35,baseY+height+margin,-hd,hd)!==null;
}

// Shared original single-player fence segment proximity.
export function closestFenceBlastPoint(w,x,y,z){
  const ax=w.ax??w.x0,az=w.az??w.z0,
        bx=w.bx??w.x1,bz=w.bz??w.z1,
        dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz,
        t=len2>1e-8?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/len2)):0,
        nx=ax+dx*t,nz=az+dz*t,
        ny=Math.min(w.y1,Math.max(w.y0,y));
  return{x:nx,y:ny,z:nz,distance:Math.hypot(nx-x,ny-y,nz-z)};
}

// Armor de les estructures, compartit per SOLO i Worker COOP.
// Només les portes i la fusta feble reben dany d'armes lleugeres.
// Les parets/sostres reforçats (10 PV) només cedeixen a explosions
// pesades i embestides. Les excepcions dels vidres es resolen a part.
export function canLightDamageWall(w){
 if(!w||w.hp===Infinity||w.indestructible)return false;
 return !!(w.door||w.woodenDoor||w.weakWood||
   w.owner?.weakWood||w.owner?.civilianHut||
   w.civicFurniture==='bench');
}
export function canLightDamageRoof(b){
 return !!b&&b.rhp!==Infinity&&!b.indestructible&&
   !!(b.weakWood||b.wood||b.civilianHut);
}
// Structural blast rules from the individual game, shared with the server.
export function wallBlastDamage(w,x,y,z,r,dmg){
 if(w.indestructible||w.open||w.hp<=0||!Number.isFinite(w.hp)||y>=w.y1+3)return 0;
 // Un mur de fusta de 68 m no rep la granada només al seu centre:
 // mesuram la distància al punt més proper del tram real. La resta
 // dels murs conserven intacta la seva regla de dany.
 const wx=w.weakWood?Math.max(w.x0,Math.min(x,w.x1)):(w.x0+w.x1)/2,
       wz=w.weakWood?Math.max(w.z0,Math.min(z,w.z1)):(w.z0+w.z1)/2;
 return explosionDamage(dmg,Math.hypot(wx-x,wz-z),r);
}
export function roofBlastDamage(b,x,z,r,dmg){
 if(b.rhp<=0||b.rb||b.indestructible)return 0;
 if(b.weakWood){
  // Projecció al rectangle del sostre, fins i tot si el barracó està
  // girat 90°. Una granada a qualsevol extrem pot destruir-ne els 8 PV.
  const angle=b.angle||0,c=Math.cos(angle),s=Math.sin(angle),dx=x-b.x,dz=z-b.z,
        lx=dx*c+dz*s,lz=-dx*s+dz*c,
        halfW=(b.localW||b.w)/2,halfD=(b.localD||b.d)/2,
        outsideX=Math.max(0,Math.abs(lx)-halfW),outsideZ=Math.max(0,Math.abs(lz)-halfD);
  return explosionDamage(dmg,Math.hypot(outsideX,outsideZ),r);
 }
 return explosionDamage(dmg,Math.hypot(b.x-x,b.z-z),r+b.w/2);
}
export function countDestroyedSupport(b,w){
 if(!b||b.rb||b.hangar||b.kind==='enemy_bunker'||!w?.supportWeight)return false;
 if(!w.supportCounted){w.supportCounted=true;b.destroyedWallSupport=(b.destroyedWallSupport||0)+w.supportWeight;}
 return b.destroyedWallSupport>=3;
}

// Original SAT and swept runover/relative-velocity rules, shared by both modes.
export function obbOverlap(a,b){
  const as=Math.sin(a.hd),ac=Math.cos(a.hd),
        bs=Math.sin(b.hd),bc=Math.cos(b.hd),
        dx=b.x-a.x,dz=b.z-a.z,aw=a.w/2,ad=a.d/2,bw=b.w/2,bd=b.d/2;
  for(let i=0;i<4;i++){
    const x=i===0?ac:i===1?as:i===2?bc:bs,
          z=i===0?-as:i===1?ac:i===2?-bs:bc,
          dist=Math.abs(dx*x+dz*z),
          ra=Math.abs(ac*x-as*z)*aw+Math.abs(as*x+ac*z)*ad,
          rb=Math.abs(bc*x-bs*z)*bw+Math.abs(bs*x+bc*z)*bd;
    if(dist>ra+rb)return false;
  }
  return true;
}
export function relativeVehicleImpactSpeed(a,b){
 const ah=a.hd||0,bh=b.navHd??b.hd??0,
  av=a.v??a.impactSpeed??0,bv=b.v??b.impactSpeed??0;
 return Math.hypot(-Math.sin(ah)*av+Math.sin(bh)*bv,
  -Math.cos(ah)*av+Math.cos(bh)*bv);
}
export function runoverSweepHit(x0,z0,x1,z1,tx,tz,radius){
 const dx=x1-x0,dz=z1-z0,lengthSq=dx*dx+dz*dz;
 const t=lengthSq>1e-8?Math.max(0,Math.min(1,
  ((tx-x0)*dx+(tz-z0)*dz)/lengthSq)):0;
 const px=x0+dx*t,pz=z0+dz*t;
 return (tx-px)**2+(tz-pz)**2<radius*radius;
}


export function tankCanCrush(v,other,ownMass,otherMass){
  if(v.t==='ferry'){
    // A ferry is a heavy vessel: it can ram smaller marine craft without
    // taking collision damage. Other ferries and land vehicles are excluded.
    const marine=new Set(['llanxa','llanxa_coets','moto_aquatica','barca_rems','windsurf','hover','patrulla_marina']);
    return marine.has(other.t)&&Math.abs(v.v)>1&&ownMass>otherMass;
  }
  return v.t==='tanc'&&Math.abs(v.v)>1&&ownMass>otherMass&&other.t!=='ferry';
}

export function ramSpeedFactor(type,barbed){
  if(type==='tanc')return .995;
  if(type==='camio'&&barbed)return 1;
  return barbed?.72:.55;
}
// Llindars d'embestida: una maniobra lenta no pot fer esclatar una moto
// ni destruir un tram de tanca. En marxa enrere cal encara més impuls.
// El tanc conserva l'excepció de força a qualsevol velocitat.
export function vehicleRamThreshold(v,barbed){
  if(v.t==='tanc')return 0;
  const base=v.t==='camio'&&barbed?12:barbed?16:22;
  return base+(v.v<0?5:0);
}
export function vehicleCanBreakBarrier(v,barbed){
  return v.t==='tanc'||Math.abs(v.v)>vehicleRamThreshold(v,barbed);
}
export function mayRamWhileRecovering(type,barbed,cooldown){
  return cooldown<=0||type==='tanc'||(type==='camio'&&barbed);
}
// Original barrier outcomes, without renderer or mutable world references.
// Els bancs i els pous són obstacles estructurals (rammable=false):
// únicament el tanc els pot enderrocar envestint-los. Reutilitzam la
// resposta de barrera sense mutar el collider, per no permetre que un
// cotxe o un camió destrueixin un pou per accident.
export function tankCivicRam(v,wall,cooldown=0){
 if(v?.t!=='tanc'||(wall?.civicFurniture!=='bench'&&wall?.civicFurniture!=='well')||
   wall.civicObject?.broken||!Number.isFinite(v.v)||Math.abs(v.v)<.05)return null;
 return barrierRam(v,{rammable:true,barbed:false,open:wall.open,hp:wall.hp},cooldown);
}
export function barrierRam(v,wall,cooldown=0){
 const barbed=!!wall.barbed;
 if((!wall.rammable&&!barbed)||wall.open||!Number.isFinite(wall.hp)||wall.hp<=0||!mayRamWhileRecovering(v.t,barbed,cooldown)||!vehicleCanBreakBarrier(v,barbed))return null;
 const heavy=v.t==='tanc'||v.t==='camio'&&barbed;
 return {speedFactor:ramSpeedFactor(v.t,barbed),damage:heavy?0:barbed?2:3,bump:heavy?.06:barbed?.14:.2,cooldown:heavy?.08:.28};
}

export function fenceVehicleContact(w,box){
  if(!w.barbed||!Number.isFinite(w.ax)||!Number.isFinite(w.bx))return null;
  const s=Math.sin(box.hd),c=Math.cos(box.hd),
        local=(x,z)=>{const dx=x-box.x,dz=z-box.z;return{x:dx*c-dz*s,z:dx*s+dz*c}},
        a=local(w.ax,w.az),b=local(w.bx,w.bz),
        dx=b.x-a.x,dz=b.z-a.z,hw=box.w/2+.3,hd=box.d/2+.3,
        p=[-dx,dx,-dz,dz],q=[a.x+hw,hw-a.x,a.z+hd,hd-a.z];
  let enter=0,leave=1;
  for(let i=0;i<4;i++){
    if(Math.abs(p[i])<1e-9){if(q[i]<0)return null;continue}
    const t=q[i]/p[i];
    if(p[i]<0)enter=Math.max(enter,t);else leave=Math.min(leave,t);
    if(enter>leave)return null;
  }
  // Els fragments apareixen al punt tocat pel frontal i no al centre del tram.
  const travel=box.v?.v<0?-1:1,nose=local(
    box.x-Math.sin(box.hd)*travel*box.d/2,
    box.z-Math.cos(box.hd)*travel*box.d/2),
    d2=dx*dx+dz*dz,
    t=d2>1e-9?Math.max(enter,Math.min(leave,((nose.x-a.x)*dx+(nose.z-a.z)*dz)/d2)):enter;
  return{x:w.ax+(w.bx-w.ax)*t,z:w.az+(w.bz-w.az)*t};
}
