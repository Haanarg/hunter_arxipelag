// Frozen main 87ef77193b5dd0d91d20b93ebd8c10201e863dfd; independent walking-surface reference.
module.exports=function(data){
const hAt=data.heightAt,stairs=data.stairs||[],piers=data.piers||[],activeBunker=data.bunker||null;
const buildingCandidates=data.buildingCandidates||(()=>data.buildings||[]),terrainStream=data.visibleHeight?{visibleHeightAt:data.visibleHeight}:null;
const world={userData:{compounds:(data.terminalRamps||[]).map(r=>({loadingRamp:r}))}},terminalRampState=r=>r,pedestrianFerry=()=>null;
function buildingLocalPoint(b,x,z){const c=Math.cos(b.angle||0),s=Math.sin(b.angle||0),dx=x-b.x,dz=z-b.z;return{x:dx*c+dz*s,z:-dx*s+dz*c}}
function buildingWorldPoint(b,x,z){const c=Math.cos(b.angle||0),s=Math.sin(b.angle||0);return{x:b.x+x*c-z*s,z:b.z+x*s+z*c}}
function upperFloorHeight(b,x,z,previous=-Infinity){
 if(!b.upperFloor||b.rb)return null;
 const p=buildingLocalPoint(b,x,z),a=b.interiorStair,level=b.fy+b.storey+.15;
 if(Math.abs(p.x)>b.localW/2-.35||Math.abs(p.z)>b.localD/2-.35)return null;
 if(stairContains(a,x,z))return null;
 return previous>=level-.75?level:null;
}
function bunkerSubFloorAt(x,z,previous=-Infinity){
  const b=activeBunker;if(!b?.basement)return null;
  const p=buildingLocalPoint(b,x,z);
  if(Math.abs(p.x)>b.basement.halfX-.4||Math.abs(p.z)>b.basement.halfZ-.4)return null;
  const st=b.basement.stair;
  if(Math.abs(p.x-st.x)<=st.width/2&&
     p.z>=Math.min(st.zTop,st.zBottom)&&
     p.z<=Math.max(st.zTop,st.zBottom)){
    const t=(p.z-st.zTop)/(st.zBottom-st.zTop);
    return b.fy+.22-t*(b.fy+.22-b.basement.floorY);
  }
  if(previous<b.fy-3.9)return b.basement.floorY;
  // El forjat superior només existeix sota l'edifici visible, no sobre
  // tot el soterrani ampliat: a fora deixam actuar el terreny natural.
  return Math.abs(p.x)<=19&&Math.abs(p.z)<=16?b.fy+.22:null;
}
function stairLocal(s,x,z){const dx=x-s.x,dz=z-s.z;return{along:dx*s.nx+dz*s.nz,side:dx*s.nz-dz*s.nx}}
function stairContains(s,x,z,margin=0){const q=stairLocal(s,x,z);return q.along>=-margin&&q.along<=s.length+margin&&Math.abs(q.side)<=s.width/2+margin}
function groundAt(x,z,previous=-Infinity){
  const bunkerFloor=bunkerSubFloorAt(x,z,previous);
  if(bunkerFloor!==null)return bunkerFloor;
  // No enfonsar el model sota els triangles que dibuixa el LOD actual.
  // Preservem l'altura física si és més alta (evita enfonsaments i salts negatius).
  const physical=hAt(x,z),visible=terrainStream?.visibleHeightAt(x,z);
  let y=visible===null||visible===undefined?physical:Math.max(physical,visible);for(const s of stairs){if(s.internal&&s.owner?.rb)continue;if(stairContains(s,x,z)){const q=stairLocal(s,x,z);if(s.ramp){const t=Math.max(0,Math.min(1,q.along/s.length));y=Math.max(y,s.top+(s.bottom-s.top)*t)}else{const i=Math.min(s.steps-1,Math.max(0,Math.floor(q.along/s.tread)));y=Math.max(y,s.top-i*s.rise)}}}
// En entrar des de l'aigua, P.y és massa baix per quedar-se damunt
 // la plataforma. La rampa ascendeix de forma contínua fins a la coberta.
 for(const p of piers){const dx=x-p.x,dz=z-p.z,along=dx*p.ux+dz*p.uz,side=dx*p.px+dz*p.pz;if(Math.abs(along)<=p.length/2+.35&&Math.abs(side)<=p.width/2+.2&&
    (!Number.isFinite(previous)||previous>=p.y-.55))y=Math.max(y,p.y)}
for(const b of buildingCandidates(x,z)){const floor=upperFloorHeight(b,x,z,previous);if(floor!==null)y=Math.max(y,floor)}
// Un personatge que ja és damunt una coberta sòlida hi continua caminant.
// La comprovació d'altura impedeix pujar-hi per art de màgia des del carrer.
if(Number.isFinite(previous))for(const b of buildingCandidates(x,z)){
  const roof=solidRoofAt(b,x,z);
  if(roof&&previous>=roof.top-.22)y=Math.max(y,roof.top+.05);
}
const ramp=terminalRampHeight(x,z);if(ramp!==null)y=Math.max(y,ramp);if(Number.isFinite(previous)){const deck=pedestrianFerry(x,z,previous);if(deck)y=Math.max(y,deck.y)}
return y}
function solidRoofAt(b,x,z){
  if(!b||b.rhp<=0||b.rb)return null;
  const rx=x-b.x,rz=z-b.z;
  if(!b.hangar){
    const sx=b.roof?.scale?.x||1,sz=b.roof?.scale?.z||1;
    if(Math.abs(rx)>(b.w+1.35)*sx/2||Math.abs(rz)>(b.d+1.35)*sz/2)return null;
    // Coberta rectangular: gruix 1.15, centre a h+.62.
    return {bottom:b.fy+b.h+.045,top:b.fy+b.h+1.195,building:b};
  }
  // La volta visual té 10 segments amb juntes mínimes entre plaques.
  // L'envolupant semicircular omple aquestes juntes, sense forats
  // a la hitbox, i manté la mateixa alçada i pendent que les plaques.
  if(Math.abs(rz)>(b.d+1.15)/2)return null;
  const radius=b.w/2;
  if(Math.abs(rx)>radius+.2)return null;
  const curvedY=b.fy+.12+Math.sqrt(Math.max(0,radius*radius-Math.min(radius,Math.abs(rx))**2));
  return {bottom:curvedY-.32,top:curvedY+.32,building:b};
}
function terminalRampHeight(x,z){
 for(const c of world?.userData.compounds||[]){if(!c.loadingRamp)continue;const s=terminalRampState(c.loadingRamp);if(!s)continue;
  const dx=x-s.x,dz=z-s.z,t=(dx*s.ux+dz*s.uz)/s.length,side=dx*s.uz-dz*s.ux;
  if(t>=0&&t<=1&&Math.abs(side)<=5)return s.startY+(s.endY-s.startY)*t;
 }return null;
}

return {groundAt,upperFloorHeight,solidRoofAt,bunkerSubFloorAt,stairContains,terminalRampHeight};
};

