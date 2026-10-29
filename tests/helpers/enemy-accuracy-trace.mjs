import {createHash} from 'node:crypto';
export function accuracyTrace(accuracy){
 let value=37;const random=(a,b)=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return a+(b-a)*value/4294967296;},rows=[];
 for(const difficulty of [.6,1,1.5])for(const profile of Object.keys(accuracy.profiles))for(const distance of [0,8,40,80,160,240]){
  const dx=distance*.6,dy=distance*.1,dz=-distance*.8,direction=accuracy.direction?accuracy.direction(difficulty,profile,dx,dy,dz,random):(()=>{const offset=accuracy.sample(difficulty,profile,dx,dy,dz,random),x=dx+offset.x,y=dy+offset.y,z=dz+offset.z,length=Math.max(.001,Math.hypot(x,y,z));return [x/length,y/length,z/length];})();
  rows.push([difficulty,profile,distance,accuracy.spread(difficulty,profile,distance),direction,accuracy.estimateHitChance(difficulty,profile,distance)]);
 }
 return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}
