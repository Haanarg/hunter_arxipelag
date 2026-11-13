// T-90M aprovat: mateix objecte paramètric que al laboratori (no un GLB).
// Els fills amb pivots romanen vius per al moviment individual, enemic i COOP.
import {createReferenceVehicle} from './vehicle-reference-candidates.mjs?rev=t90m-game-1';
import {getT90Rig,stepT90Tracks} from './t90m-preview-animation.mjs?rev=t90m-game-1';
import {turretSpecs} from './vehicle-turret-core.mjs';

export const T90M_GAME_MODEL_VERSION='t90m-studio-v1-150-game';

export function installT90MModel(THREE,vehicle){
 const model=createReferenceVehicle(THREE,'t90m-v1');
 const rig=getT90Rig(model);
 if(!rig||rig.tracks.length!==2||rig.wheels.length!==12)
  throw new Error('El T-90M del laboratori ha perdut la torreta o les erugues');
 // L'escala x1,5 es troba exclusivament al candidat. El grup exterior
 // utilitza vehicleSpecs.scales.tanc=1 per no tornar a aplicar x2,25.
 if(model.scale.x!==1.5||model.scale.y!==1.5||model.scale.z!==1.5)
  throw new Error('Escala de T-90M no concordant amb el laboratori');
 vehicle.add(model);
 // La boca de tir queda sota el pivot d'elevació: l'autoapuntat i la
 // trajectòria real surten de l'extrem visual del canó i giren junts.
 const muzzle=new THREE.Object3D();
 muzzle.name='Boca de foc T-90M';
 muzzle.position.set(0,0,-4.848);
 rig.barrel.add(muzzle);
 // Inicialitzar també quan el tanc està aturat. Sense aquesta passada,
 // totes les sabates quedarien acumulades davant fins a la primera marxa.
 stepT90Tracks(model,{throttle:0,steer:0},0);
 // L'editor manté els descriptors de totes les peces. Només a la
 // fàbrica del joc es deixen sense nom les malles rígides perquè el
 // batcher existent les fusioni per material. Les sabates animades
 // conserven trackOffset i no s'agrupen en cap cas.
 model.traverse(part=>{
  if(part.isMesh&&!Number.isFinite(part.userData?.trackOffset))
   part.name='';
 });
 const data=vehicle.userData;
 data.tankModel=T90M_GAME_MODEL_VERSION;
 data.tankVisual=model;
 data.turretPivot=rig.turret;
 data.turretPitch=rig.barrel;
 data.turretMuzzle=muzzle;
 data.turretYawRate=turretSpecs.tanc.turretYawRate;
 data.turretMinPitch=turretSpecs.tanc.turretMinPitch;
 data.turretMaxPitch=turretSpecs.tanc.turretMaxPitch;
 // La visualització del joc empra les mateixes sabates i pivots, però
 // és la velocitat física v.v i yawRate qui mou cada costat.
 data.tracks=rig.tracks.map(track=>({
  side:track.side,links:track.links,
  phase:track.phase,renderedPhase:track.phase,
  cy:track.cy,r:track.r,front:track.front,rear:track.rear,
  straight:track.straight,perimeter:track.perimeter,x:track.x
 }));
 data.trackVisualScale=model.scale.x;
 data.trackHalfWidth=1.52; // Semiamplada en coordenades locals del candidat.
 data.wheels=rig.wheels;
 for(const wheel of data.wheels){
  wheel.userData.trackSide=wheel.userData.t90RoadWheel.side;
  wheel.userData.radius=wheel.userData.t90RoadWheel.radius*model.scale.x;
 }
 return model;
}
