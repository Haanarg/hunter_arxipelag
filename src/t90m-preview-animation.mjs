// Animació del T-90M de proves: mateix principi de les erugues i pivots del joc.
// Les malles són editables i el controlador es reconstitueix també després
// d'exportar/importar JSON o d'aplicar desfer/refés al laboratori.
import {advanceTurret,turretSpecs} from './vehicle-turret-core.mjs';

const rigs=new WeakMap();
export function getT90Rig(root){
 if(!root)return null;
 let rig=rigs.get(root);
 if(rig&&rig.turret?.parent&&rig.barrel?.parent&&rig.tracks.every(t=>t.group?.parent))return rig;
 const turret=root.getObjectByName('Torreta giratòria T-90M');
 const barrel=root.getObjectByName('Canó principal 125 mm');
 if(!turret||!barrel)return null;
 const tracks=[],wheels=[];
 root.traverse(o=>{
  if(o.userData?.t90Belt){
   const spec=o.userData.t90Belt;
   const links=o.children.filter(c=>Number.isFinite(c.userData?.trackOffset));
   if(links.length)tracks.push({...spec,links,group:o,phase:0});
  }
  if(o.userData?.t90RoadWheel)wheels.push(o);
 });
 rig={root,turret,barrel,tracks,wheels,steering:{turretYawSpeed:0,turretPitchSpeed:0}};
 rigs.set(root,rig);return rig;
}
export function stepT90Tracks(root,{throttle=0,steer=0}={},dt=0){
 const rig=getT90Rig(root);
 if(!rig)return false;
 const seconds=Math.max(0,Math.min(.08,Number.isFinite(dt)?dt:0));
 for(const track of rig.tracks){
  // Com al joc: la diferència entre les velocitats dreta/esquerra
  // inverteix les erugues mentre pivota al mateix lloc.
  const beltSpeed=3.5*Math.max(-1,Math.min(1,throttle))
   +track.side*2.1*Math.max(-1,Math.min(1,steer));
  if(!beltSpeed&&track.renderedPhase===track.phase)continue;
  track.phase=((track.phase+beltSpeed*seconds)%track.perimeter+track.perimeter)%track.perimeter;
  for(const link of track.links){
   let q=(link.userData.trackOffset+track.phase)%track.perimeter,y,z,rx;
   if(q<track.straight){
    y=track.cy+track.r;z=track.front+q;rx=0;
   }else if((q-=track.straight)<Math.PI*track.r){
    const a=q/track.r;y=track.cy+track.r*Math.cos(a);z=track.rear+track.r*Math.sin(a);rx=a;
   }else if((q-=Math.PI*track.r)<track.straight){
    y=track.cy-track.r;z=track.rear-q;rx=Math.PI;
   }else{
    q-=track.straight;const a=q/track.r;
    y=track.cy-track.r*Math.cos(a);z=track.front-track.r*Math.sin(a);rx=Math.PI+a;
   }
   link.position.set(track.x,y,z);
   link.rotation.set(rx,0,0);
  }
  track.renderedPhase=track.phase;
  for(const wheel of rig.wheels){
   if(wheel.userData.t90RoadWheel.side!==track.side)continue;
   wheel.rotation.x-=beltSpeed*seconds/wheel.userData.t90RoadWheel.radius;
  }
 }
 return true;
}
export function stepT90Turret(root,{turretYaw=0,elevation=0}={},dt=0){
 const rig=getT90Rig(root);if(!rig)return false;
 const yaw=Math.max(-180,Math.min(180,turretYaw))*Math.PI/180;
 const pitch=Math.max(-35,Math.min(35,elevation))*Math.PI/180;
 const forward={x:-Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),
  z:-Math.cos(yaw)*Math.cos(pitch)};
 const state=advanceTurret(rig.steering,rig.turret.rotation.y,rig.barrel.rotation.x,
  forward,dt,turretSpecs.tanc);
 rig.turret.rotation.y=state.yaw;rig.barrel.rotation.x=state.pitch;
 return state.aligned;
}
export function stepT90MPreview(root,controls,dt){
 stepT90Tracks(root,controls,dt);
 stepT90Turret(root,controls,dt);
}
