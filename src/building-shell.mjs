// Local physical shell and render instructions. No meshes, globals or actor.
import {segmentAabbT} from './combat-rules.mjs';
// Normal building doors are taller than wide. Bunker/hangar openings have
// their own explicit geometry and must not inherit these dimensions.
export const STANDARD_BUILDING_DOOR=Object.freeze({width:2.8,height:5.2});
// A single calculation for both jambs; matches the door collider and visual
// aperture exactly, including doors on the shorter side of a building.
export function doorFlankLayout(span,openingWidth){
  if(!Number.isFinite(span)||!Number.isFinite(openingWidth)||
     openingWidth<=0||span<=openingWidth)throw new RangeError('Invalid door opening');
  const panelWidth=(span-openingWidth)/2;
  return {panelWidth,panelOffset:openingWidth/2+panelWidth/2};
}
// The same deterministic aperture dimensions are used by the renderer, the
// individual ballistics and the cooperative server (no texture raycasts).
export function windowLayout(sx,sz,height){
 const alongX=sx>=sz,L=alongX?sx:sz,count=L>=14?2:1;
 return {alongX,width:Math.min(2.7,L/(count*2.65)),
  bottom:Math.min(1.35,Math.max(1.1,height*.185)),
  height:Math.min(2.15,Math.max(1.75,height*.31)),
  centers:count===2?[-L*.255,L*.255]:[0]};
}
export function windowCrossing(from,to,wall){
 if(wall.open||!wall.windowPanes?.length)return null;
 let best=null;
 for(let index=0;index<wall.windowPanes.length;index++){
  const pane=wall.windowPanes[index],axis=pane.axis,denom=to[axis]-from[axis];
  if(Math.abs(denom)<1e-8)continue;
  const t=(pane[axis]-from[axis])/denom;
  if(t<0||t>1)continue;
  const y=from.y+(to.y-from.y)*t,other=axis==='x'?'z':'x',along=from[other]+(to[other]-from[other])*t;
  if(y<pane.y0||y>pane.y1||Math.abs(along-pane[other])>pane.width/2)continue;
  if(!best||t<best.t)best={index,t,point:{x:from.x+(to.x-from.x)*t,y,z:from.z+(to.z-from.z)*t}};
 }
 return best;
}
export function wallShotHit(from,to,wall){
 if(wall.open)return null;
 const hit=segmentAabbT(from.x,from.y,from.z,to.x,to.y,to.z,wall.x0,wall.x1,wall.y0,wall.y1,wall.z0,wall.z1);
 if(hit===null)return null;
 // The aperture spans the wall thickness, so intact glass permits sight;
 // projectiles shatter glass but keep travelling on that same tick.
 return windowCrossing(from,to,wall)?null:hit;
}
export function planBuildingShell(w,d,h,opt={},random){
  if(![w,d,h].every(v=>Number.isFinite(v)&&v>0)||typeof random!=='function')throw new RangeError('Invalid building shell');
  const t=.8,dw=opt.doorWidth||2.5,ds=opt.doorSide==null?Math.floor(random()*4):opt.doorSide,
    wallH=opt.floors===2?h/2:h,wallHp=opt.civilianHut?4:12,roofHp=opt.civilianHut?8:opt.hangar?12:16,segments=[],assemblies=[];
  if(!Number.isFinite(dw)||dw<=0||!Number.isInteger(ds)||ds<0||ds>3)throw new RangeError('Invalid building doorway');
  const seg=(lx,lz,sx,sz,door=false,windows=false,supportSide=null,supportWeight=0,level=0)=>{
    const index=segments.length;segments.push({lx,lz,sx,sz,door:!!door,windows,supportSide,supportWeight,level});return index;
  };
  if(opt.workshop){seg(0,-d/2+t/2,w,t,false,false,0,1);seg(w/2-t/2,0,t,d,false,false,1,1);seg(-w/2+t/2,0,t,d,false,false,2,1);}
  else if(opt.hangar){
    const frontZ=ds===0?d/2-t/2:-d/2+t/2,sl=Math.max(.5,(w-dw)/2),off=dw/2+sl/2;
    for(const lx of [-off,off]){const i=seg(lx,frontZ,sl,t);segments[i].hangarPost=true;}
  }else{
    [[0,d/2-t/2,w,t,0],[0,-d/2+t/2,w,t,0],[w/2-t/2,0,t,d-2*t,1],[-w/2+t/2,0,t,d-2*t,1]].forEach(([cx,cz,sx,sz,ax],k)=>{
      if(k!==ds){seg(cx,cz,sx,sz,false,!opt.bunker&&!opt.solidWalls,k,1);return;}
      const L=ax?sz:sx,{panelWidth:sl,panelOffset:off}=doorFlankLayout(L,dw),assembly=[];
      for(const q of [-1,1])assembly.push(ax?seg(cx,cz+q*off,sx,sl,false,false,k,.5):seg(cx+q*off,cz,sl,sz,false,false,k,.5));
      assembly.push(ax?seg(cx,cz,sx,dw,true):seg(cx,cz,dw,sz,true));assemblies.push(assembly);
    });
    if(!opt.noPartitions&&!opt.bunker&&w*d>=140&&random()<.5){
      const rr=(a,b)=>a+random()*(b-a),al=w>=d,L=al?d:w,gp=rr(-L/4,L/4),px=(random()<.5?-1:1)*rr((al?w:d)*.12,(al?w:d)*.2),a0=-L/2+t,a1=L/2-t;
      for(const [a,b] of [[a0,gp-1.6],[gp+1.6,a1]])if(b-a>=.5){const cc=(a+b)/2,l=b-a;if(al)seg(px,cc,t,l);else seg(cc,px,l,t);}
    }
  }
  if(opt.floors===2)for(const [cx,cz,sx,sz] of [[0,d/2-t/2,w,t],[0,-d/2+t/2,w,t],[w/2-t/2,0,t,d-2*t],[-w/2+t/2,0,t,d-2*t]])seg(cx,cz,sx,sz,false,!opt.solidWalls,null,0,wallH);
  return {dw,ds,wallH,wallHp,roofHp,segments,assemblies};
}
export function shellColliders(x,z,fy,w,d,h,opt={},random){
  if(![x,z,fy].every(Number.isFinite))throw new RangeError('Invalid building position');
  const plan=planBuildingShell(w,d,h,opt,random),walls=[],segmentWalls=[];
  for(const s of plan.segments){
    const start=walls.length;
    const box={x0:x+s.lx-s.sx/2,x1:x+s.lx+s.sx/2,z0:z+s.lz-s.sz/2,z1:z+s.lz+s.sz/2,cx:x+s.lx,cz:z+s.lz,rammable:true};
    if(s.door){
      const dh=Math.min(opt.doorHeight||4.4,Math.max(3.8,plan.wallH-.65)),normal=[[0,1],[0,-1],[1,0],[-1,0]][plan.ds];
      walls.push({...box,y0:fy-1,y1:fy+dh,hp:10,woodenDoor:!opt.bunker&&!opt.hangar&&!opt.workshop,door:true,open:!!opt.openDoor,alwaysOpen:!!opt.openDoor,locked:!!opt.lockedDoor,nx:normal[0],nz:normal[1],doorWidth:plan.dw,doorHeight:dh});
      if(plan.wallH-dh>.05)walls.push({...box,y0:fy+dh,y1:fy+plan.wallH,hp:plan.wallHp,door:false,open:false,playerBlock:false,rammable:false});
    }else{
      const layout=s.windows?windowLayout(s.sx,s.sz,plan.wallH):null;
      walls.push({...box,y0:fy+s.level-(s.level?0:1),y1:fy+s.level+(s.hangarPost?Math.max(3.1,h*.3):plan.wallH),hp:s.hangarPost?16:plan.wallHp,door:false,open:false,windows:!!s.windows,...(layout?{windowPanes:layout.centers.map(c=>({axis:layout.alongX?'z':'x',x:x+s.lx+(layout.alongX?c:0),z:z+s.lz+(layout.alongX?0:c),y0:fy+s.level+layout.bottom+.09,y1:fy+s.level+layout.bottom+layout.height-.09,width:layout.width-.18}))}:{}),...(s.hangarPost?{}:{supportSide:s.supportSide,supportWeight:s.supportWeight})});
    }
    segmentWalls.push(Array.from({length:walls.length-start},(_,i)=>start+i));
  }
  for(const assembly of plan.assemblies){const indices=assembly.flatMap(i=>segmentWalls[i]);for(const i of indices)walls[i].assemblyIndices=indices;}
  return {plan,walls};
}
export function exteriorStair(b,side,heightAt){
  const [nx,nz]=[[0,1],[0,-1],[1,0],[-1,0]][side],edge=(nx?b.w:b.d)/2+.15,x=b.x+nx*edge,z=b.z+nz*edge,top=b.fy+.3;
  if(top-heightAt(x,z)<.12)return null;
  const tread=.75;let steps=1;for(;steps<80;steps++){const end=steps*tread;if(top-heightAt(x+nx*end,z+nz*end)<=steps*.32)break;}
  const length=steps*tread,bottom=heightAt(x+nx*length,z+nz*length),rise=Math.max(0,(top-bottom)/steps);
  return {x,z,nx,nz,top,steps,tread,length,rise,width:4.2};
}
export function upperStair(b){
  const width=2.8,run=Math.min(b.d-3,b.storey*1.05);
  return {width,run,x:b.x+b.w/2-width/2-.7,z:b.z-b.d/2+2.4};
}
