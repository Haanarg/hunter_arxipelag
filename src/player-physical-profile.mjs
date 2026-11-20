// Perfil físic numèric, invariant entre el render V18, SOLO i el Worker COOP.
// El servidor mai no fa raycasts contra malles o articulacions Three.js.
import {HUMAN_PLAYER_GAME_NATIVE_HEIGHT} from './human-model-catalog.mjs';

export const PLAYER_STANDING_HEIGHT=HUMAN_PLAYER_GAME_NATIVE_HEIGHT;
// El V18 aprovat baixa la zona superior uns 0.2-0.35 m en ajupir-se.
// Conservam el marge superior: no es pot travessar una llinda massa baixa.
export const PLAYER_CROUCHED_HEIGHT=PLAYER_STANDING_HEIGHT-.30;
// El punt P és un suport físic sota la superfície, no el cap visible.
// 67.5 % de la talla V18 conserva pràcticament la línia d'aigua original
// en la braça B3, el crol C4 i l'estat quiet, sense factor 2/3.
export const PLAYER_SWIM_DRAFT=PLAYER_STANDING_HEIGHT*.675;
export const PLAYER_SWIMMING_HEIGHT=PLAYER_SWIM_DRAFT+.48;

export function playerBodyHeight({crouched=false,swimming=false}={}){
 return swimming?PLAYER_SWIMMING_HEIGHT:crouched?PLAYER_CROUCHED_HEIGHT:PLAYER_STANDING_HEIGHT;
}
// Fraccions i radis calculats sobre la talla final. Tres volums continus:
// peus/pelvis, tors i crani. Ajupir-se baixa el crani de debò: l'antic
// centre fix de 1.5 i radi 1.2 ignorava la postura de COOP.
const STANDING_ZONES=Object.freeze([
 Object.freeze({fraction:.24,radius:.61}),
 Object.freeze({fraction:.60,radius:.65}),
 Object.freeze({fraction:1,radius:.36,topAligned:true})
]);
const CROUCHED_ZONES=Object.freeze([
 Object.freeze({fraction:.25,radius:.62}),
 Object.freeze({fraction:.60,radius:.65}),
 Object.freeze({fraction:1,radius:.36,topAligned:true})
]);
const SWIMMING_ZONES=Object.freeze([
 Object.freeze({fraction:0,radius:.56,waterRelative:-.32}),
 Object.freeze({fraction:0,radius:.36,waterRelative:.10})
]);
export function playerHitSpheres(actor,{crouched=!!actor?.crouched,swimming=!!actor?.swimming}={}){
 if(!actor||![actor.x,actor.y,actor.z].every(Number.isFinite))
  throw new RangeError('Jugador sense posicio física valida');
 if(swimming)return SWIMMING_ZONES.map(zone=>({
  x:actor.x,y:actor.y+PLAYER_SWIM_DRAFT+zone.waterRelative,z:actor.z,radius:zone.radius
 }));
 const h=playerBodyHeight({crouched});
 return (crouched?CROUCHED_ZONES:STANDING_ZONES).map(zone=>({
  x:actor.x,y:actor.y+(zone.topAligned?h-zone.radius:zone.fraction*h),
  z:actor.z,radius:zone.radius
 }));
}
export function playerProjectileContactT(from,to,actor,segmentSphereT,pose={}){
 if(!from||!to||typeof segmentSphereT!=='function')throw new TypeError('Tret físic invàlid');
 let closest=null;
 for(const sphere of playerHitSpheres(actor,pose)){
  const t=segmentSphereT(from.x,from.y,from.z,to.x,to.y,to.z,
   sphere.x,sphere.y,sphere.z,sphere.radius);
  if(t!==null&&t!==undefined&&(closest===null||t<closest))closest=t;
 }
 return closest;
}
