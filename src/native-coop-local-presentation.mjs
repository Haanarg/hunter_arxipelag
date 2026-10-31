// Reconciliació visual del jugador/pilot LOCAL. El servidor i la predicció
// continuen fent servir sempre la pose física sense suavitzar.
// Només absorbeix la discontinuïtat visual introduïda per receive().
// El desplaçament nou dels controls s'afegeix immediatament a la càmera.
const HALF_LIFE=.16,MAX_WALK_ERROR=3,MAX_DRIVE_ERROR=12;
const finite=Number.isFinite;
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const poseDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function createNativeLocalPresentation(){
 let last=null,offset={x:0,y:0,z:0,hd:0},enabled=false;
 const stats={corrections:0,smoothedCorrections:0,hardSnaps:0,
  maxCorrectionM:0,maxCorrectionDegrees:0,visualErrorM:0,smoothedFrames:0};
 function reset(){
  last=null;enabled=false;
  offset.x=offset.y=offset.z=offset.hd=0;
 }
 function reconcile(after,{continuous=false,driving=false}={}){
  if(!after||!last||!continuous||!enabled){
   reset();return;
  }
  if(![after.x,after.y,after.z,after.hd].every(finite)){
   reset();return;
  }
  const dist=poseDistance(last,after),
   hd=angle(last.hd-after.hd);
  stats.corrections++;
  stats.maxCorrectionM=Math.max(stats.maxCorrectionM,dist);
  stats.maxCorrectionDegrees=Math.max(stats.maxCorrectionDegrees,Math.abs(hd)*180/Math.PI);
  // Teleports, reanimació i col·lisions grans no poden quedar amagats
  // darrera una correcció gràfica de diversos metres.
  if(dist>(driving?MAX_DRIVE_ERROR:MAX_WALK_ERROR)||Math.abs(hd)>Math.PI/2){
   stats.hardSnaps++;reset();return;
  }
  offset.x=last.x-after.x;offset.y=last.y-after.y;
  offset.z=last.z-after.z;offset.hd=hd;
  if(dist>.001||Math.abs(hd)>.001)stats.smoothedCorrections++;
 }
 function present(raw,dt,active=true){
  if(!raw)return null;
  if(!active){
   reset();last={x:raw.x,y:raw.y,z:raw.z,hd:raw.hd};
   return raw;
  }
  if(!last){
   last={x:raw.x,y:raw.y,z:raw.z,hd:raw.hd};
   enabled=true;return raw;
  }
  // Fracció independent d'FPS: 60, 144 o 240 FPS donen el mateix
  // temps de recuperació. Els inputs nous no passen per aquest filtre.
  const factor=Math.exp(-Math.LN2*Math.min(.1,Math.max(0,dt))/HALF_LIFE);
  offset.x*=factor;offset.y*=factor;offset.z*=factor;
  offset.hd*=factor;
  const result={...raw,x:raw.x+offset.x,y:raw.y+offset.y,
   z:raw.z+offset.z,hd:raw.hd+offset.hd};
  last.x=result.x;last.y=result.y;last.z=result.z;last.hd=result.hd;
  enabled=true;
  stats.visualErrorM=Math.hypot(offset.x,offset.y,offset.z);
  if(stats.visualErrorM>.001||Math.abs(offset.hd)>.001)stats.smoothedFrames++;
  return result;
 }
 return {present,reconcile,reset,stats};
}
