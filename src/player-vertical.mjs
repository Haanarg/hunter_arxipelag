// Pure locomotion rules. Heights and landing candidates must come from the
// trusted world; these functions never accept a client's claimed landing.
const finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function stepAirborne(position,fall,input,dt,limit){
  if(![position.x,position.z,position.hd,fall.y,fall.vy,fall.vx,fall.vz,fall.t,fall.leanF,fall.leanS,input.forward,input.strafe,dt,limit].every(finite)||dt<0||dt>1||limit<=0||Math.abs(input.forward)>1||Math.abs(input.strafe)>1)throw new RangeError('Invalid airborne step');
  const next={...fall,t:fall.t+dt,vy:fall.vy-(fall.parachute?10:24)*dt};
  if(fall.parachute){
    next.vy=Math.max(-4.8,next.vy);
    const desiredX=-Math.sin(position.hd)*input.forward*2.8+Math.cos(position.hd)*input.strafe*2.2,
      desiredZ=-Math.cos(position.hd)*input.forward*2.8-Math.sin(position.hd)*input.strafe*2.2,blend=1-Math.exp(-2.2*dt);
    next.vx+=(desiredX-next.vx)*blend;next.vz+=(desiredZ-next.vz)*blend;
    next.leanF+=(input.forward-next.leanF)*blend;next.leanS+=(input.strafe-next.leanS)*blend;
  }else{next.vx*=Math.exp(-.18*dt);next.vz*=Math.exp(-.18*dt);}
  next.y+=next.vy*dt;
  if(![next.y,next.vy,next.vx,next.vz,next.t,next.leanF,next.leanS].every(finite))throw new RangeError('Invalid airborne result');
  return {x:clamp(position.x+next.vx*dt,-limit,limit),z:clamp(position.z+next.vz*dt,-limit,limit),fall:next};
}
export function fallLandingDamage(fall,{water=false,maxHealth}={}){
  if(![fall.startHeight,fall.vy,maxHealth].every(finite)||fall.startHeight<0||maxHealth<0)throw new RangeError('Invalid fall damage');
  const impact=Math.max(0,-fall.vy);
  return fall.parachute?0:Math.ceil(Math.min(maxHealth,Math.max(0,((fall.startHeight-4)*(water?.42:.9)+Math.max(0,impact-12)*(water?.45:.8))*.2)));
}
export function waterSupport({floor,surface,interior=false,basement=false,flight=false,vehicle=false,falling=false}){
  if(![floor,surface].every(finite))throw new RangeError('Invalid water support');
  return {swimming:!flight&&!vehicle&&!interior&&!basement&&!falling&&floor<surface-2.1,
    y:basement?floor+.06:interior?floor:Math.max(floor+.06,surface-2.1)};
}
export function sweptRoofLanding(from,to,{buildingCandidates,solidRoofAt}){
  if(![from.x,from.z,from.y,to.x,to.z,to.y].every(finite))throw new RangeError('Invalid roof sweep');
  if(to.y>=from.y)return null;
  const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.65)),fall=from.y-to.y;
  // A trusted tick should never need an unbounded scan, even on bad state.
  if(steps>16384)throw new RangeError('Roof sweep exceeds limit');
  let hit=null;
  for(let i=0;i<=steps;i++){
    const q=i/steps,x=from.x+(to.x-from.x)*q,z=from.z+(to.z-from.z)*q,candidateY=from.y-fall*q;
    for(const b of buildingCandidates(x,z)){
      const roof=solidRoofAt(b,x,z);
      if(!roof||from.y<roof.top-.15||to.y>roof.top+.05)continue;
      if(candidateY>=roof.top-.08&&(!hit||roof.top>hit))hit=roof.top;
    }
  }
  return hit;
}
