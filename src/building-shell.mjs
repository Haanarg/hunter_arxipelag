// Local physical shell and render instructions. No meshes, globals or actor.
import {segmentAabbT} from './combat-rules.mjs';
// Normal building doors are taller than wide. Bunker/hangar openings have
// their own explicit geometry and must not inherit these dimensions.
export const STANDARD_BUILDING_DOOR=Object.freeze({width:2.4,height:3.8});
export const WOODEN_DOOR_HP=4;
export const BUNKER_DOOR_HP=20;
export const BUNKER_STRUCTURE_HP=30;
export const REINFORCED_STRUCTURE_HP=10;
export const WOODEN_STRUCTURE_HP=4;
export const WOODEN_DOOR_THICKNESS=.16; // centrat dins la llinda
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
  bottom:Math.min(2.15,Math.max(1.65,height*.25)),
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
// Atac de ganivet: un segment curt davant del cos a l'alçada de les
// finestres de la planta baixa. El primer mur sòlid impedeix trencar
// vidres a través de parets; no modifica la detecció de projectils.
export function knifeWindowHit(origin,walls,reach=2.8,isIntact=()=>true){
 const heading=origin.hd||0,fx=-Math.sin(heading),fz=-Math.cos(heading);
 const from={x:origin.x,y:origin.y+2.35,z:origin.z},
       to={x:from.x+fx*reach,y:from.y,z:from.z+fz*reach};
 let best=null,block=1;
 for(let wallIndex=0;wallIndex<walls.length;wallIndex++){
   const wall=walls[wallIndex];
   if(!wall||wall.open)continue;
   if(wall.x0>Math.max(from.x,to.x)||wall.x1<Math.min(from.x,to.x)||
      wall.z0>Math.max(from.z,to.z)||wall.z1<Math.min(from.z,to.z))continue;
   const t=wallShotHit(from,to,wall);
   if(t!==null&&t<block)block=t;
   const pane=windowCrossing(from,to,wall);
   if(pane&&isIntact(wallIndex,pane.index,wall)&&
      (!best||pane.t<best.t))best={wall,wallIndex,paneIndex:pane.index,point:pane.point,t:pane.t};
 }
 return best&&best.t<=block+1e-6?best:null;
}
// Convert a rendered pane's position back to its authoritative pane index.
// Rotated façades (notably 180°) can reverse the mesh order.
export function windowPaneIndexAt(wall,alongCoordinate){
 const panes=wall?.windowPanes||[];if(!panes.length)return -1;
 const axis=panes[0].axis==='z'?'x':'z';
 let best=-1,error=Infinity;
 for(let i=0;i<panes.length;i++){
  const distance=Math.abs(panes[i][axis]-alongCoordinate);
  if(distance<error){best=i;error=distance;}
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
  const t=.8,dw=opt.doorWidth||STANDARD_BUILDING_DOOR.width,ds=opt.doorSide==null?Math.floor(random()*4):opt.doorSide,
    wallH=opt.floors===2?h/2:h,wallHp=opt.bunker?BUNKER_STRUCTURE_HP:opt.civilianHut||opt.weakWalls?WOODEN_STRUCTURE_HP:REINFORCED_STRUCTURE_HP,
    // Parets i sostres de fusta: 4 PV i vulnerables a armes lleugeres.
    // Altres parets, teulades i pilars: 10 PV, només armes pesades/vehicles.
    roofHp=opt.bunker?BUNKER_STRUCTURE_HP:opt.civilianHut||opt.weakWalls?WOODEN_STRUCTURE_HP:REINFORCED_STRUCTURE_HP,segments=[],assemblies=[];
  if(!Number.isFinite(dw)||dw<=0||!Number.isInteger(ds)||ds<0||ds>3)throw new RangeError('Invalid building doorway');
  const seg=(lx,lz,sx,sz,door=false,windows=false,supportSide=null,supportWeight=0,level=0)=>{
    const index=segments.length;segments.push({lx,lz,sx,sz,door:!!door,windows,supportSide,supportWeight,level});return index;
  };
  if(opt.workshop){seg(0,-d/2+t/2,w,t,false,false,0,1);seg(w/2-t/2,0,t,d,false,false,1,1);seg(-w/2+t/2,0,t,d,false,false,2,1);}
  else if(opt.hangar){
    const frontZ=ds===0?d/2-t/2:-d/2+t/2,sl=Math.max(.5,(w-dw)/2),off=dw/2+sl/2;
    for(const lx of [-off,off]){const i=seg(lx,frontZ,sl,t);segments[i].hangarPost=true;}
    // La paret del fons ha de ser un únic segment destructible de 10 PV,
    // tant al joc individual com als col·lisionadors del servidor COOP.
    const backZ=ds===0?-d/2+t/2:d/2-t/2;
    const rear=seg(0,backZ,w,t);
    segments[rear].hangarRearWall=true;
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
      const dh=Math.min(opt.doorHeight||STANDARD_BUILDING_DOOR.height,Math.max(2.8,plan.wallH-.65)),normal=[[0,1],[0,-1],[1,0],[-1,0]][plan.ds];
      const wooden=!opt.bunker&&!opt.hangar&&!opt.workshop,
        slab=wooden?(plan.ds<2?
          {...box,z0:z+s.lz-WOODEN_DOOR_THICKNESS/2,z1:z+s.lz+WOODEN_DOOR_THICKNESS/2}:
          {...box,x0:x+s.lx-WOODEN_DOOR_THICKNESS/2,x1:x+s.lx+WOODEN_DOOR_THICKNESS/2}):box;
      walls.push({...slab,y0:fy-1,y1:fy+dh,hp:opt.bunker?BUNKER_DOOR_HP:WOODEN_DOOR_HP,bunkerGate:!!opt.bunker,woodenDoor:wooden,door:true,open:!!opt.openDoor,alwaysOpen:!!opt.openDoor,locked:!!opt.lockedDoor,nx:normal[0],nz:normal[1],doorWidth:plan.dw,doorHeight:dh});
      if(plan.wallH-dh>.05)walls.push({...box,y0:fy+dh,y1:fy+plan.wallH,hp:plan.wallHp,weakWood:!!(opt.weakWalls||opt.civilianHut),door:false,open:false,playerBlock:false,rammable:false});
    }else{
      const layout=s.windows?windowLayout(s.sx,s.sz,plan.wallH):null;
      walls.push({...box,y0:fy+s.level-(s.level?0:1),y1:fy+s.level+(s.hangarRearWall?.12+s.sx/2:s.hangarPost?Math.max(3.1,h*.3):plan.wallH),hp:plan.wallHp,hangarRearWall:!!s.hangarRearWall,weakWood:!!(opt.weakWalls||opt.civilianHut),door:false,open:false,windows:!!s.windows,upperFloorWindow:!!s.windows&&s.level>0,...(layout?{windowPanes:layout.centers.map(c=>({axis:layout.alongX?'z':'x',x:x+s.lx+(layout.alongX?c:0),z:z+s.lz+(layout.alongX?0:c),y0:fy+s.level+layout.bottom+.09,y1:fy+s.level+layout.bottom+layout.height-.09,width:layout.width-.18}))}:{}),...(s.hangarPost?{}:{supportSide:s.supportSide,supportWeight:s.supportWeight})});
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
