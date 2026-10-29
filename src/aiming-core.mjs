// Target selection extracted from the individual game. Geometry is supplied by its adapter.
export const SMALL_ARMS_AIM_CONE=.82,SMALL_ARMS_AIM_VERTICAL=Math.PI/2;
export const SMALL_ARMS_RANGE=Object.freeze({pistol:75,assault:85});

// El bazuca mai no pot girar un coet més de 60° a esquerra/dreta,
// encara que un futur autoapuntat ampliï el con per seguir blancs alts.
// La comprovació és a la direcció FINAL, no només al filtre de candidats.
export const BAZOOKA_MAX_HORIZONTAL_YAW=Math.PI/3;
export function limitBazookaHorizontalAim(direction,fx,fz,focus=null){
  const [dx,dy,dz]=direction,forwardLength=Math.hypot(fx,fz),
        horizontalLength=Math.hypot(dx,dz);
  if(forwardLength<1e-8||horizontalLength<1e-8)return direction;
  const ux=fx/forwardLength,uz=fz/forwardLength,
        yaw=Math.atan2(ux*dz-uz*dx,ux*dx+uz*dz);
  if(Math.abs(yaw)<=BAZOOKA_MAX_HORIZONTAL_YAW+1e-12)return direction;
  const angle=Math.sign(yaw)*BAZOOKA_MAX_HORIZONTAL_YAW,
        c=Math.cos(angle),s=Math.sin(angle);
  // Un vector retallat ja no garanteix impactar al blanc adquirit:
  // la retícula no s'ha de posar verda si el coet s'ha desviat del blanc.
  if(focus){focus.target=null;focus.point=null;focus.kind=null}
  return [horizontalLength*(ux*c-uz*s),dy,
          horizontalLength*(ux*s+uz*c)];
}


export function weaponTargetPriority(enemy,shotClass='light'){
  if(shotClass==='attackCannon'){
    // La metralladora/canó lleuger de l'heli només segueix enemics
    // vulnerables: els míssils pesants s'encarreguen de torres i blindats.
    if(enemy.t==='patrulla_marina'||enemy.rocketSoldier)return 0;
    if(enemy.t==='soldat'||enemy.t==='general')return 1;
    if(enemy.t==='jeep')return 2;
    return 3;
  }
  if(shotClass==='heavy'){
    if(enemy.t==='torre'||enemy.t==='patrulla_marina'||enemy.rocketSoldier)return 0;
    if(enemy.t==='soldat'||enemy.t==='general')return 1;
    if(enemy.t==='jeep'||enemy.t==='tanqueta'||enemy.t==='tanc')return 2;
    return 3;
  }
  if(enemy.t==='soldat'||enemy.t==='general')return 0;
  if(enemy.t==='jeep'||enemy.t==='tanqueta'||enemy.t==='tanc'||enemy.t==='patrulla_marina')return 1;
  if(enemy.t==='torre')return 2;
  return 3;
}

export function smallArmsAimHorizontalCone(baseCone,pitchError){
  const steep=Math.max(0,Math.min(1,(pitchError-.17)/(.98-.17))),
        blend=steep*steep*(3-2*steep),
        baseYaw=Math.acos(Math.max(-1,Math.min(1,baseCone)));
  return Math.cos(baseYaw+(Math.PI/2-baseYaw)*blend);
}

export function bazookaInterceptPoint(e,originX,originY,originZ,targetY,speed){
  const vx=-Math.sin(e.hd)*(e.speed||0),vz=-Math.cos(e.hd)*(e.speed||0),
        dx=e.x-originX,dy=targetY-originY,dz=e.z-originZ,
        a=vx*vx+vz*vz-speed*speed,b=2*(dx*vx+dz*vz),
        c=dx*dx+dy*dy+dz*dz,disc=b*b-4*a*c;
  if(disc<0||Math.abs(a)<.00001)return {x:e.x,y:targetY,z:e.z};
  const roots=[(-b-Math.sqrt(disc))/(2*a),(-b+Math.sqrt(disc))/(2*a)],
        time=Math.min(...roots.filter(t=>t>0));
  if(!Number.isFinite(time)||time>3.7)return {x:e.x,y:targetY,z:e.z};
  return {x:e.x+vx*time,y:targetY,z:e.z+vz*time};
}

export function createAimSelector({origin,direction,range,cone=.97,shotClass='light',focus=null,verticalCone=Math.PI/2,isClear=()=>true}){
 const {x,y,z}=origin,[fx,fy,fz]=direction;
  if(focus){focus.target=null;focus.point=null;focus.kind=null}
  const heavy=shotClass==='heavy',forward=Math.hypot(fx,fz),
        basePitch=Math.atan2(fy,forward);
  let bestPriority=Infinity,bestScore=Infinity,chosen=null;
  const consider=(obj,kind,priority,tx,ty,tz,ignoreWall=null,ignoreBuilding=null)=>{
    if(priority>bestPriority||!Number.isFinite(ty))return;
    const dx=tx-x,dy=ty-y,dz=tz-z,
          horizontal=Math.hypot(dx,dz),distance=Math.hypot(dx,dy,dz);
    if(distance<.15||distance>range||forward<.001)return;
    const pitchError=Math.abs(Math.atan2(dy,horizontal)-basePitch);
    if(pitchError>verticalCone)return;
    const alignment=horizontal>=.001?
      (dx*fx+dz*fz)/(horizontal*forward):1,
          wideSmallArms=shotClass==='assault'||shotClass==='pistol',
          allowedCone=wideSmallArms?
            smallArmsAimHorizontalCone(cone,pitchError):cone,
          // Quan la torre queda pràcticament a la vertical del canó,
          // el desplaçament d'1,1 m de la boca no ha de descartar-la
          // per aparèixer un pèl al darrere en projecció horitzontal.
          overhead=wideSmallArms&&horizontal<=1.6&&Math.abs(dy)>=horizontal*3;
    if(!overhead&&alignment<allowedCone)return;
    // Les armes pesades no adquireixen dianes tapades pel relleu.
    if(!isClear(x,y,z,tx,ty,tz,ignoreWall,ignoreBuilding,heavy))return;
    // Dins una prioritat, apuntar primer al blanc més centrat i proper.
    const score=heavy?
      Math.acos(Math.max(-1,Math.min(1,alignment)))*45+pitchError*23+distance*.08:
      distance;
    if(priority===bestPriority&&score>=bestScore)return;
    bestPriority=priority;bestScore=score;
    chosen=[dx/distance,dy/distance,dz/distance];
    if(focus){focus.target=obj;focus.point={x:tx,y:ty,z:tz};focus.kind=kind}
  };
 return Object.freeze({consider,get priority(){return bestPriority;},get hasTarget(){return !!chosen;},direction(){return chosen||[fx,fy,fz];}});
}
