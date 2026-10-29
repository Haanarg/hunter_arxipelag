// Flight and nearest-contact arbitration extracted from individual updPj.
// Adapters supply geometry, targets, damage and visual/audio effects.
export const SMALL_ARMS_PROJECTILE_SPEED=130,PROJECTILE_LIFETIME=2.2;
export function launchProjectile(origin,direction,speed,extra={}){
 const {x,y,z}=origin,[dx,dy,dz]=direction;
 return {...extra,x,y,z,sx:x,sy:y,sz:z,vx:dx*speed,vy:dy*speed,vz:dz*speed,life:PROJECTILE_LIFETIME};
}
export function projectileStep(p,dt){
 const from={x:p.x,y:p.y,z:p.z},to={x:p.x+p.vx*dt,y:p.y+p.vy*dt,z:p.z+p.vz*dt},delta={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z},life=p.life-dt;
 let bestT=life<=0?1:Infinity,kind=life<=0?'expire':null,target=null;
 const consider=(t,k,o)=>{if(t!=null&&t>=0&&t<=1&&t<bestT){bestT=t;kind=k;target=o;}};
 return Object.freeze({from,to,delta,life,consider,get fraction(){return bestT;},finish(){const hit=bestT!==Infinity,t=hit?bestT:1;return {hit,t,kind,target,point:{x:from.x+delta.x*t,y:from.y+delta.y*t,z:from.z+delta.z*t}};}});
}
