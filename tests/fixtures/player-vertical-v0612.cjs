// Frozen equations from main 46d019e52b4c42f9790c45938c3266cedfd9499e (v0.6.12).
// Independent reference: deliberately does not import the extracted rules.
module.exports={
 air(P,fall,f,strafe,dt,lim){  fall.t+=dt;fall.vy-=fall.parachute?10*dt:24*dt;
  if(fall.parachute){
    fall.vy=Math.max(-4.8,fall.vy);
    // Inclinació suau amb el joystick/tecles, conservant una mica d'inèrcia.
    const desiredX=-Math.sin(P.hd)*f*2.8+Math.cos(P.hd)*strafe*2.2,
          desiredZ=-Math.cos(P.hd)*f*2.8-Math.sin(P.hd)*strafe*2.2,
          blend=1-Math.exp(-2.2*dt);
    fall.vx+=(desiredX-fall.vx)*blend;fall.vz+=(desiredZ-fall.vz)*blend;
    fall.leanF+=(f-fall.leanF)*blend;
    fall.leanS+=(strafe-fall.leanS)*blend;
  }else{fall.vx*=Math.exp(-.18*dt);fall.vz*=Math.exp(-.18*dt)}
  P.x=Math.max(-lim,Math.min(lim,P.x+fall.vx*dt));
  P.z=Math.max(-lim,Math.min(lim,P.z+fall.vz*dt));
  fall.y+=fall.vy*dt;
 return {x:P.x,z:P.z,fall};},
 damage(fall,waterLanding,maxHealth){const fallH=fall.startHeight,impact=Math.max(0,-fall.vy),COMBAT_BALANCE={player:maxHealth},wholeDamage=Math.ceil;return fall.parachute?0:wholeDamage(Math.min(COMBAT_BALANCE.player,Math.max(0,((fallH-4)*(waterLanding?.42:.9)+Math.max(0,impact-12)*(waterLanding?.45:.8))*.2)));},
 roof(from,to,world){const {buildingCandidates,solidRoofAt}=world;
function parachuteRoofLanding(x0,z0,y0,x1,z1,y1){
  if(y1>=y0)return null;
  const steps=Math.max(1,Math.ceil(Math.hypot(x1-x0,z1-z0)/.65)),
        fall=y0-y1;
  let hit=null;
  for(let i=0;i<=steps;i++){
    const q=i/steps,x=x0+(x1-x0)*q,z=z0+(z1-z0)*q,
          candidateY=y0-fall*q;
    for(const b of buildingCandidates(x,z)){
      const roof=solidRoofAt(b,x,z);
      if(!roof||y0<roof.top-.15||y1>roof.top+.05)continue;
      // No aterrar abans que els peus arribin a la coberta.
      if(candidateY>=roof.top-.08&&(!hit||roof.top>hit))hit=roof.top;
    }
  }
  return hit;
}

 return parachuteRoofLanding(from.x,from.z,from.y,to.x,to.z,to.y);},
 water({floor,surface,interior:ib=false,basement:insideBasement=false,flight=false,vehicle:cv=false,falling:playerFall=false}){const cheats={fly:flight};return {swimming:!cheats.fly&&!cv&&!ib&&!insideBasement&&!playerFall&&floor<surface-2.1,y:insideBasement?floor+.06:ib?floor:Math.max(floor+.06,surface-2.1)};}
};
