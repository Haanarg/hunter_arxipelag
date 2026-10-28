// Frozen reference from main 482b631eab560ee7046d4662a35bb3d940d771fa; do not replace with calls to the extracted module.
module.exports=function(data){
const seed=data.seed,H=2400*data.mapScale,LEVEL_CELL=256,levelCellKey=(x,z)=>x+','+z;
const islandCandidates=()=>data.islands,terrainLevelGrid={get:()=>data.levels};
let P,TG,palmsDisabled=false,wallList=[];const wallCandidates=()=>wallList;
const hash=(x,y)=>{const h=Math.sin(x*127.1+y*311.7+seed*.001)*43758.5453;return h-Math.floor(h)};
function vn(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
return hash(ix,iy)*(1-u)*(1-v)+hash(ix+1,iy)*u*(1-v)+hash(ix,iy+1)*(1-u)*v+hash(ix+1,iy+1)*u*v}
const fbm=(x,y)=>vn(x,y)*.5+vn(x*2,y*2)*.25+vn(x*4,y*4)*.125+vn(x*8,y*8)*.0625;
const clamp01=v=>Math.max(0,Math.min(1,v)),smooth01=t=>t*t*(3-2*t);
function islandReliefAt(x,z,list){
  let m=-1,dom=null;
  for(const i of list){const q=1-Math.hypot(x-i.x,z-i.z)/i.r;if(q>m){m=q;dom=i}}
  let h=(m-.25+.6*(fbm(x/520,z/520)-.47))*45;
  if(dom&&h>0){
    // La costa es manté gairebé intacta; el relleu addicional entra progressivament cap a l'interior.
    const interior=smooth01(clamp01((m-.30)/.48));
    if(interior>0){
      const mid=(fbm(x/155+13,z/155-9)-.46875)*12*interior;
      const pd=Math.hypot(x-dom.peakX,z-dom.peakZ)/(dom.r*.72),
            peak=smooth01(clamp01(1-pd)),
            sizeGain=Math.max(.72,Math.min(1.22,dom.r/620));
      h=h*(1+.24*interior)+mid+peak*9*sizeGain*interior
    }
  }
  return h
}
function rawHAt(x,z){let h=islandReliefAt(x,z,islandCandidates(x,z));const e=Math.max(Math.abs(x),Math.abs(z));
if(e>H-120)h=Math.min(h,-4-(e-(H-120))*.05);
if(h>=-1.5)return h;
const depth=-h-1.5;return -1.5-Math.min(72,depth*depth*2.8+depth*.8)}
function hAt(x,z){
  let h=rawHAt(x,z);
  const candidates=terrainLevelGrid.get(levelCellKey(
    Math.floor(x/LEVEL_CELL),Math.floor(z/LEVEL_CELL)));
  if(!candidates)return h;
  for(const m of candidates){
    const dx=x-m.x,dz=z-m.z,lx=dx*m.c+dz*m.s,lz=-dx*m.s+dz*m.c,
          ox=Math.max(0,Math.abs(lx)-m.hw),oz=Math.max(0,Math.abs(lz)-m.hd),
          out=Math.hypot(ox,oz);
    if(out<m.blend){const k=out<=0?1:1-smooth01(out/m.blend);h=h+(m.y-h)*k}
  }
  return h;
}
function palmPush(t,r0){
  const height=6.2*t.s,reach=t.r+r0+1.65*t.s;
  if(P.y>t.y+height+.6||P.y+4.2<t.y)return;
  if(Math.abs(P.x-t.x)>reach||Math.abs(P.z-t.z)>reach)return;
  const yawCos=Math.cos(t.yaw),yawSin=Math.sin(t.yaw);
  let overlap=0,nx=0,nz=0;
  // El model a peu fa prop de quatre metres: comprovam tot el cos,
  // incloent espatlles i cap, sense crear malles de col·lisió addicionals.
  for(const offset of [.3,1,1.7,2.4,3.1,3.8]){
    const y=P.y+offset;
    if(y<t.y||y>t.y+height)continue;
    const q=(y-t.y)/height;
    const bend=height*.25*Math.sin(Math.PI*q);
    const trunkX=t.x+bend*yawCos,trunkZ=t.z-bend*yawSin;
    const dx=P.x-trunkX,dz=P.z-trunkZ,d=Math.hypot(dx,dz);
    const bodyRadius=offset>3.1 ? r0*.75 : r0;
    const radius=bodyRadius+t.r*(1-.43*q)+.04*t.s;
    if(d<radius&&radius-d>overlap){
      overlap=radius-d;
      if(d>.0001){nx=dx/d;nz=dz/d}
      else {nx=Math.cos(P.hd);nz=-Math.sin(P.hd)}
    }
  }
  if(overlap>0){P.x+=nx*overlap;P.z+=nz*overlap}
}
function treePush(){
  const r0=.5,cx=Math.floor(P.x/16),cz=Math.floor(P.z/16);
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
    const L=TG.get((cx+a)+','+(cz+b));if(!L)continue;
    for(const t of L){
      if(t.p){if(!palmsDisabled)palmPush(t,r0);continue}
      if(t.rock&&(P.y>t.topY+.6||P.y+1.5<t.bottomY))continue;
      const dx=P.x-t.x,dz=P.z-t.z,d=Math.hypot(dx,dz),m=t.r+r0;
      if(d<m&&d>.001){P.x=t.x+dx/d*m;P.z=t.z+dz/d*m}
    }
  }
}
function wallPush(){const r=.6;for(const w of wallCandidates(P.x,P.z,r)){if(w.playerBlock===false||w.y0>P.y+3.1||w.y1<P.y+.15)continue;if(w.towerLegOwner&&(P.y+1.5<w.y0||P.y>w.y1))continue;if(!w.open&&P.x>w.x0-r&&P.x<w.x1+r&&P.z>w.z0-r&&P.z<w.z1+r){const a=[P.x-(w.x0-r),w.x1+r-P.x,P.z-(w.z0-r),w.z1+r-P.z],i=a.indexOf(Math.min(...a));
if(i==0)P.x=w.x0-r;else if(i==1)P.x=w.x1+r;else if(i==2)P.z=w.z0-r;else P.z=w.z1+r}}}

return {heightAt:hAt,walls(p,walls){P=p;wallList=walls;wallPush();return p;},palm(p,t){P=p;palmPush(t,.5);return p;},trees(p,grid,disabled=false){P=p;TG=grid;palmsDisabled=disabled;treePush();return p;}};
};

