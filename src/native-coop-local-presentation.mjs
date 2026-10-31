// Reconciliació visual del jugador/pilot LOCAL. El servidor i la predicció
// continuen fent servir sempre la pose física sense suavitzar.
// Només absorbeix la discontinuïtat visual introduïda per receive().
// El desplaçament nou dels controls s'afegeix immediatament a la càmera.
const HALF_LIFE=.16,MAX_WALK_ERROR=3,MAX_DRIVE_ERROR=12;
const finite=Number.isFinite;
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const poseDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function createNativeLocalPresentation(){
 let last=null,lastRaw=null,justCorrected=false,offset={x:0,y:0,z:0,hd:0},enabled=false;
 const stats={corrections:0,smoothedCorrections:0,hardSnaps:0,
  maxCorrectionM:0,maxCorrectionDegrees:0,visualErrorM:0,smoothedFrames:0};
 function reset(){
  last=null;lastRaw=null;enabled=false;justCorrected=false;
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
  lastRaw={x:after.x,y:after.y,z:after.z,hd:after.hd};
  justCorrected=true;
  if(dist>.001||Math.abs(hd)>.001)stats.smoothedCorrections++;
 }
 function present(raw,dt,active=true){
  if(!raw)return null;
  if(!active){
   reset();last={x:raw.x,y:raw.y,z:raw.z,hd:raw.hd};
   lastRaw={...last};
   return raw;
  }
  if(!last){
   last={x:raw.x,y:raw.y,z:raw.z,hd:raw.hd};
   lastRaw={...last};enabled=true;return raw;
  }
  // Fracció independent d'FPS: 60, 144 o 240 FPS donen el mateix
  // temps de recuperació. Els inputs nous no passen per aquest filtre.
  let factor=justCorrected?1:
    Math.exp(-Math.LN2*Math.min(.1,Math.max(0,dt))/HALF_LIFE);
  justCorrected=false;
  // Quan el jugador avança, una correcció enrere no pot fer-li fer
  // passes visualment en sentit contrari. Aprofitam els passos reals
  // per amortir-la; aturat, l'error encara decau completament.
  const dx=raw.x-lastRaw.x,dy=raw.y-lastRaw.y,dz=raw.z-lastRaw.z,
    movement=Math.hypot(dx,dy,dz);
  if(movement>.000001&&factor<1){
   const opposed=((offset.x*dx+offset.y*dy+offset.z*dz)/movement)*(1-factor);
   const maxAgainst=movement*.4;
   if(opposed>maxAgainst)
     factor=1-maxAgainst/Math.max(1e-9,(offset.x*dx+offset.y*dy+offset.z*dz)/movement);
  }
  offset.x*=factor;offset.y*=factor;offset.z*=factor;
  offset.hd*=factor;
  const result={...raw,x:raw.x+offset.x,y:raw.y+offset.y,
   z:raw.z+offset.z,hd:raw.hd+offset.hd};
  last.x=result.x;last.y=result.y;last.z=result.z;last.hd=result.hd;
  lastRaw.x=raw.x;lastRaw.y=raw.y;lastRaw.z=raw.z;lastRaw.hd=raw.hd;
  enabled=true;
  stats.visualErrorM=Math.hypot(offset.x,offset.y,offset.z);
  if(stats.visualErrorM>.001||Math.abs(offset.hd)>.001)stats.smoothedFrames++;
  return result;
 }
 return {present,reconcile,reset,stats};
}
