// Shared physical geometry, independent from rendering and the local player.
const clamp01=v=>Math.max(0,Math.min(1,v)),smooth01=t=>t*t*(3-2*t);
export function hashAt(x,y,seed){const h=Math.sin(x*127.1+y*311.7+seed*.001)*43758.5453;return h-Math.floor(h);}
export function noiseAt(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
return hashAt(ix,iy,seed)*(1-u)*(1-v)+hashAt(ix+1,iy,seed)*u*(1-v)+hashAt(ix,iy+1,seed)*(1-u)*v+hashAt(ix+1,iy+1,seed)*u*v;}
export const fbmAt=(x,y,seed)=>noiseAt(x,y,seed)*.5+noiseAt(x*2,y*2,seed)*.25+noiseAt(x*4,y*4,seed)*.125+noiseAt(x*8,y*8,seed)*.0625;
export function reliefAt(x,z,list,seed){
  let m=-1,dom=null;
  for(const i of list){const q=1-Math.hypot(x-i.x,z-i.z)/i.r;if(q>m){m=q;dom=i}}
  let h=(m-.25+.6*(fbmAt(x/520,z/520,seed)-.47))*45;
  if(dom&&h>0){
    // La costa es manté gairebé intacta; el relleu addicional entra progressivament cap a l'interior.
    const interior=smooth01(clamp01((m-.30)/.48));
    if(interior>0){
      const mid=(fbmAt(x/155+13,z/155-9,seed)-.46875)*12*interior;
      const pd=Math.hypot(x-dom.peakX,z-dom.peakZ)/(dom.r*.72),
            peak=smooth01(clamp01(1-pd)),
            sizeGain=Math.max(.72,Math.min(1.22,dom.r/620));
      h=h*(1+.24*interior)+mid+peak*9*sizeGain*interior
    }
  }
  return h
}
export function rawTerrainAt(x,z,list,seed,halfSize){let h=reliefAt(x,z,list,seed);const e=Math.max(Math.abs(x),Math.abs(z));
if(e>halfSize-120)h=Math.min(h,-4-(e-(halfSize-120))*.05);
if(h>=-1.5)return h;
const depth=-h-1.5;return -1.5-Math.min(72,depth*depth*2.8+depth*.8)}
export function levelHeight(h,x,z,candidates){
  for(const m of candidates){
    const dx=x-m.x,dz=z-m.z,lx=dx*m.c+dz*m.s,lz=-dx*m.s+dz*m.c,
          ox=Math.max(0,Math.abs(lx)-m.hw),oz=Math.max(0,Math.abs(lz)-m.hd),
          out=Math.hypot(ox,oz);
    if(out<m.blend){const k=out<=0?1:1-smooth01(out/m.blend);h=h+(m.y-h)*k}
  }
  return h;
}
export function pushPalm(point,t,r0=.5){
  const height=6.2*t.s,reach=t.r+r0+1.65*t.s;
  if(point.y>t.y+height+.6||point.y+4.2<t.y)return;
  if(Math.abs(point.x-t.x)>reach||Math.abs(point.z-t.z)>reach)return;
  const yawCos=Math.cos(t.yaw),yawSin=Math.sin(t.yaw);
  let overlap=0,nx=0,nz=0;
  // El model a peu fa prop de quatre metres: comprovam tot el cos,
  // incloent espatlles i cap, sense crear malles de col·lisió addicionals.
  for(const offset of [.3,1,1.7,2.4,3.1,3.8]){
    const y=point.y+offset;
    if(y<t.y||y>t.y+height)continue;
    const q=(y-t.y)/height;
    const bend=height*.25*Math.sin(Math.PI*q);
    const trunkX=t.x+bend*yawCos,trunkZ=t.z-bend*yawSin;
    const dx=point.x-trunkX,dz=point.z-trunkZ,d=Math.hypot(dx,dz);
    const bodyRadius=offset>3.1 ? r0*.75 : r0;
    const radius=bodyRadius+t.r*(1-.43*q)+.04*t.s;
    if(d<radius&&radius-d>overlap){
      overlap=radius-d;
      if(d>.0001){nx=dx/d;nz=dz/d}
      else {nx=Math.cos(point.hd);nz=-Math.sin(point.hd)}
    }
  }
  if(overlap>0){point.x+=nx*overlap;point.z+=nz*overlap}
}

export function pushWalls(point,walls,r=.6){for(const w of walls){if(w.playerBlock===false||w.y0>point.y+3.1||w.y1<point.y+.15)continue;if(w.towerLegOwner&&(point.y+1.5<w.y0||point.y>w.y1))continue;if(!w.open&&point.x>w.x0-r&&point.x<w.x1+r&&point.z>w.z0-r&&point.z<w.z1+r){const a=[point.x-(w.x0-r),w.x1+r-point.x,point.z-(w.z0-r),w.z1+r-point.z],i=a.indexOf(Math.min(...a));
if(i==0)point.x=w.x0-r;else if(i==1)point.x=w.x1+r;else if(i==2)point.z=w.z0-r;else point.z=w.z1+r}}}

export function pushTree(point,t,palmsDisabled=false,r0=.5){
      if(t.p){if(!palmsDisabled)pushPalm(point,t,r0);return}
      if(t.rock&&(point.y>t.topY+.6||point.y+1.5<t.bottomY))return;
      const dx=point.x-t.x,dz=point.z-t.z,d=Math.hypot(dx,dz),m=t.r+r0;
      if(d<m&&d>.001){point.x=t.x+dx/d*m;point.z=t.z+dz/d*m}
}

// Càlcul canònic de la plataforma: sense render ni mutacions del món.
// L'ordre d'inserció a la graella continua sota el control del motor.
export function planLevelArea(x,z,w,d,y,rot=0,blend=12){
 const level={x,z,hw:w/2,hd:d/2,y,rot,c:Math.cos(rot),s:Math.sin(rot),blend};
 const reach=Math.hypot(level.hw,level.hd)+blend;
 return {level,bounds:{minX:x-reach,maxX:x+reach,minZ:z-reach,maxZ:z+reach}};
}
