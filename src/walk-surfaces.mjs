// Shared walking surfaces. Visual meshes are not required.
export function buildingLocalPoint(b,x,z){const c=Math.cos(b.angle||0),s=Math.sin(b.angle||0),dx=x-b.x,dz=z-b.z;return{x:dx*c+dz*s,z:-dx*s+dz*c}}
export function buildingWorldPoint(b,x,z){const c=Math.cos(b.angle||0),s=Math.sin(b.angle||0);return{x:b.x+x*c-z*s,z:b.z+x*s+z*c}}
export function upperFloorHeight(b,x,z,previous=-Infinity){
 if(!b.upperFloor||b.rb)return null;
 const p=buildingLocalPoint(b,x,z),a=b.interiorStair,level=b.fy+b.storey+.15;
 if(Math.abs(p.x)>b.localW/2-.35||Math.abs(p.z)>b.localD/2-.35)return null;
 if(stairContains(a,x,z))return null;
 return previous>=level-.75?level:null;
}
export function stairLocal(s,x,z){const dx=x-s.x,dz=z-s.z;return{along:dx*s.nx+dz*s.nz,side:dx*s.nz-dz*s.nx}}
export function stairContains(s,x,z,margin=0){const q=stairLocal(s,x,z);return q.along>=-margin&&q.along<=s.length+margin&&Math.abs(q.side)<=s.width/2+margin}
// Local progress along the bunker stair, regardless of its direction or
// rotation in the world. Legacy longitudinal stair records still load.
export function bunkerStairProgress(st,p,margin=0){
 if(!st||!p)return null;
 const transverse=st.axis==='x',along=transverse?p.x:p.z,cross=transverse?p.z:p.x,
       start=transverse?st.xTop:st.zTop,end=transverse?st.xBottom:st.zBottom,
       center=transverse?st.z:st.x;
 if(![along,cross,start,end,center,st.width].every(Number.isFinite)||start===end||
    Math.abs(cross-center)>st.width/2+margin+1e-6||
    along<Math.min(start,end)-margin-1e-6||along>Math.max(start,end)+margin+1e-6)return null;
 return Math.max(0,Math.min(1,(along-start)/(end-start)));
}
export function bunkerStairBounds(st){
 return st.axis==='x'?{left:Math.min(st.xTop,st.xBottom),right:Math.max(st.xTop,st.xBottom),near:st.z-st.width/2,far:st.z+st.width/2}:
  {left:st.x-st.width/2,right:st.x+st.width/2,near:Math.min(st.zTop,st.zBottom),far:Math.max(st.zTop,st.zBottom)};
}
export function bunkerFloorAt(b,x,z,previous=-Infinity){if(!b?.basement)return null;
  const p=buildingLocalPoint(b,x,z);
  if(Math.abs(p.x)>b.basement.halfX-.4||Math.abs(p.z)>b.basement.halfZ-.4)return null;
  const t=bunkerStairProgress(b.basement.stair,p);
  if(t!==null)return b.fy+.22-t*(b.fy+.22-b.basement.floorY);
  if(previous<b.fy-3.9)return b.basement.floorY;
  // El forjat superior només existeix sota l'edifici visible, no sobre
  // tot el soterrani ampliat: a fora deixam actuar el terreny natural.
  return Math.abs(p.x)<=19&&Math.abs(p.z)<=16?b.fy+.22:null;
}
export function solidRoofAt(b,x,z){
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

export function stairHeight(s,x,z){
  if(s.internal&&s.owner?.rb||!stairContains(s,x,z))return null;
  const q=stairLocal(s,x,z);
  if(s.ramp){const t=Math.max(0,Math.min(1,q.along/s.length));return s.top+(s.bottom-s.top)*t;}
  const i=Math.min(s.steps-1,Math.max(0,Math.floor(q.along/s.tread)));return s.top-i*s.rise;
}
export function pierHeight(p,x,z,previous=-Infinity){
  const dx=x-p.x,dz=z-p.z,along=dx*p.ux+dz*p.uz,side=dx*p.px+dz*p.pz;
  return Math.abs(along)<=p.length/2+.35&&Math.abs(side)<=p.width/2+.2&&(!Number.isFinite(previous)||previous>=p.y-.55)?p.y:null;
}
export function terminalRampSurfaceHeight(s,x,z){
  const dx=x-s.x,dz=z-s.z,t=(dx*s.ux+dz*s.uz)/s.length,side=dx*s.uz-dz*s.ux;
  return t>=0&&t<=1&&Math.abs(side)<=5?s.startY+(s.endY-s.startY)*t:null;
}
export function walkingHeightAt({physical,visible=null,stairs=[],piers=[],buildings=[],bunker=null,terminalRamps=[]},x,z,previous=-Infinity){
  const below=bunkerFloorAt(bunker,x,z,previous);if(below!==null)return below;
  let y=visible===null||visible===undefined?physical:Math.max(physical,visible);
  for(const s of stairs){const h=stairHeight(s,x,z);if(h!==null)y=Math.max(y,h);}
  for(const p of piers){const h=pierHeight(p,x,z,previous);if(h!==null)y=Math.max(y,h);}
  for(const b of buildings){const h=upperFloorHeight(b,x,z,previous);if(h!==null)y=Math.max(y,h);}
  if(Number.isFinite(previous))for(const b of buildings){const roof=solidRoofAt(b,x,z);if(roof&&previous>=roof.top-.22)y=Math.max(y,roof.top+.05);}
  for(const r of terminalRamps){const h=terminalRampSurfaceHeight(r,x,z);if(h!==null){y=Math.max(y,h);break;}}
  return y;
}
