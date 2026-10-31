// Navmeshes compactes del COOP. Reutilitza els punts, radis, rumbs,
// velocitats, intervals i ventall de navegació de l'IA individual
// (src/enemy-ai.js i src/marine-patrol.js). Sense Three.js ni RNG extern.
export const MARINE_COURSE_OFFSETS=Object.freeze([0,.27,-.27,.55,-.55,.9,-.9,1.35,-1.35,Math.PI]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const patrolAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function marineSeaClear(x,z,limit,heightAt,r=10){
 if(Math.abs(x)>=limit-28||Math.abs(z)>=limit-28)return false;
 return heightAt(x,z)<-3.3&&heightAt(x+r*.65,z)<-2.7&&
   heightAt(x-r*.65,z)<-2.7&&heightAt(x,z+r*.65)<-2.7&&
   heightAt(x,z-r*.65)<-2.7;
}
export function pickMarineWaypoint(t,{heightAt,limit,random}){
 t.marineCourse=null;
 const home=t.home||{x:t.x,z:t.z};
 for(let i=0;i<28;i++){
  const a=random()*Math.PI*2,d=130+random()*390;
  const x=home.x+Math.cos(a)*d,z=home.z+Math.sin(a)*d;
  if(marineSeaClear(x,z,limit,heightAt,12)){
   t.tx=x;t.tz=z;t.wt=12+random()*12;return;
  }
 }
 t.tx=home.x;t.tz=home.z;t.wt=8;
}
export function stepMarinePatrol(t,{
 dt,heightAt,waterAt,limit,random,trafficClear=()=>true,target=null
}){
 if(!(dt>0))return;
 t.wt=(t.wt??0)-dt;
 const distance=target?Math.hypot(t.x-target.x,t.z-target.z):Infinity;
 if(!Number.isFinite(t.tx)||!Number.isFinite(t.tz)||t.wt<=0||
    Math.hypot(t.tx-t.x,t.tz-t.z)<35)
  pickMarineWaypoint(t,{heightAt,limit,random});
 let goalX=t.tx,goalZ=t.tz;
 const hostile=!!target&&distance<470;
 t.orbitSign??=1;
 if(hostile){
  if(distance>165){goalX=target.x;goalZ=target.z;}
  else{
   const rx=(t.x-target.x)/Math.max(1,distance),rz=(t.z-target.z)/Math.max(1,distance);
   goalX=target.x+rx*135-rz*t.orbitSign*150;
   goalZ=target.z+rz*135+rx*t.orbitSign*150;
  }
 }
 const wanted=Math.atan2(t.x-goalX,t.z-goalZ);
 let best=wanted,open=false;
 const previous=t.marineCourse;
 t.marineCourseT=(t.marineCourseT??0)-dt;
 const recalc=distance<=700||!previous||!previous.open||t.marineCourseT<=0||
  Math.hypot(previous.x-t.x,previous.z-t.z)>18||
  Math.hypot(previous.goalX-goalX,previous.goalZ-goalZ)>8||
  Math.abs(patrolAngle(previous.hd-t.heading))>.28;
 if(!recalc){best=previous.best;open=previous.open;}
 else{
  let bestScore=Infinity;
  for(const offset of MARINE_COURSE_OFFSETS){
   const hd=patrolAngle(wanted+offset),fx=-Math.sin(hd),fz=-Math.cos(hd);
   if(!marineSeaClear(t.x+fx*36,t.z+fz*36,limit,heightAt,11)||
      !marineSeaClear(t.x+fx*69,t.z+fz*69,limit,heightAt,11)||
      !trafficClear(t.x+fx*34,t.z+fz*34,17))continue;
   const score=Math.abs(patrolAngle(hd-wanted))*.8+
      Math.abs(patrolAngle(hd-(t.heading||0)))*.55;
   if(score<bestScore){bestScore=score;best=hd;open=true;}
  }
  if(!open){best=patrolAngle((t.heading||0)+t.orbitSign*1.25);t.wt=Math.min(t.wt,2);}
  t.marineCourse={best,open,x:t.x,z:t.z,hd:t.heading||0,goalX,goalZ};
  t.marineCourseT=distance>700?.36:0;
 }
 const steer=patrolAngle(best-(t.heading||0)),
   maxYaw=(t.speed??17)>12?.27:.39,
   desired=clamp(steer*1.1,-maxYaw,maxYaw);
 t.yawRate=(t.yawRate||0)+(desired-(t.yawRate||0))*(1-Math.exp(-2.3*dt));
 t.heading=patrolAngle((t.heading||0)+t.yawRate*dt);
 const bowX=-Math.sin(t.heading),bowZ=-Math.cos(t.heading),
   speed=open?(Math.abs(steer)>.75?9:hostile?20:17):2.5;
 t.speed=(t.speed??17)+(speed-(t.speed??17))*(1-Math.exp(-1.15*dt));
 const nx=t.x+bowX*t.speed*dt,nz=t.z+bowZ*t.speed*dt;
 if(marineSeaClear(nx,nz,limit,heightAt,10)&&trafficClear(nx,nz,16)){
  t.x=nx;t.z=nz;
 }else{
  t.speed=Math.max(0,t.speed-13*dt);t.wt=Math.min(t.wt,.5);t.marineCourse=null;
 }
 t.y=waterAt(t.x,t.z)+.2;
}
export function stepLandPatrol(t,{dt,world,random}){
 if(!(dt>0))return;
 const path=t.patrol||[];
 let goal=path.length?path[t.patrolIndex??0]:
   (Number.isFinite(t.tx)&&Number.isFinite(t.tz)&&t.wt>0?
     {x:t.tx,z:t.tz}:null);
 if(!goal||Math.hypot(goal.x-t.x,goal.z-t.z)<4.5||t.wt<=-30){
  if(path.length){
   t.patrolIndex=((t.patrolIndex??-1)+1)%path.length;
   goal=path[t.patrolIndex];
  }else{
   const home=t.home||{x:t.x,z:t.z},a=random()*Math.PI*2,d=8+random()*20;
   goal={x:home.x+Math.cos(a)*d,z:home.z+Math.sin(a)*d};
  }
  t.tx=goal.x;t.tz=goal.z;
  t.wt=Math.max(2.5,Math.hypot(goal.x-t.x,goal.z-t.z)/Math.max(1,(t.sp||22)*.35));
 }
 t.wt=(t.wt??0)-dt;
 const dx=t.tx-t.x,dz=t.tz-t.z,d=Math.hypot(dx,dz);
 if(d<.25)return;
 t.heading=Math.atan2(-dx,-dz);
 const step=Math.min(d,(t.sp||22)*.35*dt),
   candidate={...t,x:t.x+dx/d*step,z:t.z+dz/d*step,y:t.y};
 const resolved=world.resolveBody(t,candidate),
   support=world.locomotionAt(candidate.x,candidate.z,t.y);
 if(Math.hypot(resolved.x-candidate.x,resolved.z-candidate.z)<.005&&
    Math.abs(support.floor-t.y)<1.3&&support.terrain>-.5&&
    !support.interior&&!support.drop){
  t.x=candidate.x;t.z=candidate.z;t.y=support.floor+.06;
 }else{t.wt=Math.min(t.wt,0);t.patrolIndex=((t.patrolIndex??0)+1)%Math.max(1,path.length);}
}
