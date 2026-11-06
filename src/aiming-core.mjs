// Target selection extracted from the individual game. Geometry is supplied by its adapter.
export const SMALL_ARMS_AIM_CONE=.82,SMALL_ARMS_AIM_VERTICAL=Math.PI/2;
// Fusell d'assalt i franctirador: 80° horitzontals totals, ±40°.
// No s'amplia el con quan el blanc és per damunt o per sota del jugador.
export const RIFLE_AIM_HALF_ANGLE=40*Math.PI/180;
export const RIFLE_AIM_CONE=Math.cos(RIFLE_AIM_HALF_ANGLE);
export const SMALL_ARMS_RANGE=Object.freeze({pistol:100,assault:150});

// Bazuca: obertura TOTAL de 90° (45° a cada costat).
// El selector i la direcció FINAL comparteixen el mateix límit.
export const BAZOOKA_MAX_HORIZONTAL_YAW=Math.PI/4;
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
  if(enemy.t==='torre')return 3; // només els coets poden fixar l'estructura
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

export function createAimSelector({origin,direction,range,cone=.97,shotClass='light',focus=null,verticalCone=Math.PI/2,isClear=()=>true,isOnScreen=()=>true}){
 const {x,y,z}=origin,[fx,fy,fz]=direction;
  if(focus){focus.target=null;focus.point=null;focus.kind=null}
  const heavy=shotClass==='heavy',forward=Math.hypot(fx,fz),
        basePitch=Math.atan2(fy,forward);
  // L'angle respecte del centre de la mirada domina SEMPRE el tipus i
 // la distància. La distància només resol empats angulars gairebé exactes.
 let bestPriority=Infinity,bestScore=Infinity,bestDistance=Infinity,chosen=null;
 const axisLength=Math.max(1e-9,Math.hypot(fx,fy,fz));
 const consider=(obj,kind,priority,tx,ty,tz,ignoreWall=null,ignoreBuilding=null)=>{
   // Les torres no són dianes per a pistola, fusell, franctirador ni canó lleuger.
   // Els dos soldats de dalt segueixen essent objectius independents.
   if(kind==='enemy'&&obj?.t==='torre'&&!heavy)return;
   if(!Number.isFinite(ty))return;
   const dx=tx-x,dy=ty-y,dz=tz-z,
         horizontal=Math.hypot(dx,dz),distance=Math.hypot(dx,dy,dz);
   if(distance<.15||distance>range||forward<.001)return;
   const pitchError=Math.abs(Math.atan2(dy,horizontal)-basePitch);
   if(pitchError>verticalCone)return;
   const alignment=horizontal>=.001?
     (dx*fx+dz*fz)/(horizontal*forward):1,
         wideSmallArms=shotClass==='pistol',
         allowedCone=wideSmallArms?
           smallArmsAimHorizontalCone(cone,pitchError):cone,
         overhead=wideSmallArms&&horizontal<=1.6&&Math.abs(dy)>=horizontal*3;
   if(!overhead&&alignment<allowedCone)return;
   // Per al bazuca del jugador, descarta dianes que la càmera no mostra.
   // La resta d'armes i el servidor no depenen de la càmera local.
   if(!isOnScreen(tx,ty,tz))return;
   if(!isClear(x,y,z,tx,ty,tz,ignoreWall,ignoreBuilding,heavy))return;
   const dot=Math.max(-1,Math.min(1,(dx*fx+dy*fy+dz*fz)/(distance*axisLength)));
   const angularError=Math.acos(dot);
   // Evita prioritzar sistemàticament el soldat lateral sobre el cotxe
   // que ocupa el centre, i evita el salt d'un enemic a 5 m sobre un altre centrat.
   // Els coets, bazuca, míssils i canons pesants preserven EXACTAMENT
   // les seves prioritats i el balanç anterior; només armes lleugeres
   // canvien dinàmicament al blanc més centrat.
   const score=heavy?
     Math.acos(Math.max(-1,Math.min(1,alignment)))*45+pitchError*23+distance*.08:
     angularError;
   if(heavy){
     if(priority>bestPriority||priority===bestPriority&&score>=bestScore)return;
   }else if(score>bestScore+1e-7||
     (Math.abs(score-bestScore)<1e-7&&distance>=bestDistance))return;
   bestPriority=priority;bestScore=score;bestDistance=distance;
   chosen=[dx/distance,dy/distance,dz/distance];
   if(focus){focus.target=obj;focus.point={x:tx,y:ty,z:tz};focus.kind=kind}
 };

 return Object.freeze({consider,get priority(){return bestPriority;},get hasTarget(){return !!chosen;},direction(){return chosen||[fx,fy,fz];}});
}


// Existing armored auto-aim envelopes, shared by individual and cooperative adapters.
export const ARMORED_AIM=Object.freeze({heavy:Object.freeze({cone:.73,vertical:.68}),light:Object.freeze({cone:.97,vertical:Math.PI/2})});
