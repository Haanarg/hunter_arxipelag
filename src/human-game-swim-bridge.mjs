// Un únic motor de natació per al model que es DIBUIXA.
// Les posicions i angles s'actualitzen des de animatePlayer(), no en
// updateMatrixWorld(), càmera, ombres ni render. L'estat es calcula per
// avatar: el cooperatiu no comparteix rellotge ni quaternions mutables.
import {poseHumanSwimming,restoreHumanSwimming,HUMAN_SWIM_PROPOSALS} from './human-swim-proposals.mjs?rev=game-swim-v18-native-20261120-1';

export const GAME_SWIM_MODES=Object.freeze({
 idle:'swim-idle',breast:'swim-breast-3',crawl:'swim-crawl-4'
});
export const GAME_SWIM_PERIODS=Object.freeze({
 idle:3,breast:HUMAN_SWIM_PROPOSALS.breast[2].period,
 crawl:HUMAN_SWIM_PROPOSALS.crawl[3].period
});
const JOINTS=['pelvis','spine','neck','head','hipL','hipR','kneeL','kneeR',
 'ankleL','ankleR','shoulderL','shoulderR','elbowL','elbowR','wristL','wristR'];
const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const VALID=new Set(['idle','breast','crawl']);
// Desplaçament FINAL de la postura horitzontal del V18 en unitats del joc.
// Ja és la mida nativa aprovada: no deriva del rig antic, no reescala la pell.
export const GAME_V18_SWIM_ROOT_MOTION=Object.freeze({lift:.35,centerZ:.61});

export function createGameSwimBridge(T,visual,j){
 for(const id of JOINTS)if(!j[id])throw Error('Falta el pivot canònic de natació '+id);
 const initialRootPosition=new T.Vector3(),initialRootQuaternion=new T.Quaternion(),
  initialPelvis=new T.Vector3(),swimPosition=new T.Vector3();
 const original=JOINTS.map(()=>new T.Quaternion());
 const source=JOINTS.map(()=>new T.Quaternion()),target=JOINTS.map(()=>new T.Quaternion());
 const firstRoot=new T.Quaternion(),lastRoot=new T.Quaternion(),mixedRoot=new T.Quaternion();
 const firstPos=new T.Vector3(),lastPos=new T.Vector3();
 const firstPelvis=new T.Vector3(),lastPelvis=new T.Vector3();
 const mixed=new T.Quaternion(),mixedPelvis=new T.Vector3();

 function capture(){
  for(let k=0;k<JOINTS.length;k++)original[k].copy(j[JOINTS[k]].quaternion);
 }
 function reset(){
  restoreHumanSwimming(visual);
  visual.position.copy(initialRootPosition);
  visual.quaternion.copy(initialRootQuaternion);
  j.pelvis.position.copy(initialPelvis);
  for(let k=0;k<JOINTS.length;k++)j[JOINTS[k]].quaternion.copy(original[k]);
 }
 // L'animació anterior de manteniment/lateral es conserva EXACTAMENT com
 // a estil, però s'aplica als pivots canònics en lloc de moure la pell vella.
 function tread(time){
  const ph=time*2.1,stroke=Math.sin(ph),arc=Math.cos(ph),
   recover=(1-arc)*.5,flutter=Math.sin(ph*2);
  const set=(id,x=0,y=0,z=0)=>j[id]?.rotation.set(x,y,z);
  set('pelvis');set('spine',-.10);set('neck');set('head',.10);
  set('shoulderL',1.15+.18*stroke,0,-.42-.38*stroke);
  set('shoulderR',1.15-.18*stroke,0,.42+.38*stroke);
  set('elbowL',.72+.45*recover);
  set('elbowR',.72+.45*(1-recover));
  set('wristL');set('wristR');
  set('hipL',.18+.22*flutter);set('hipR',.18-.22*flutter);
  set('kneeL',-(.48-.18*.22*flutter));
  set('kneeR',-(.48+.18*.22*flutter));
  set('ankleL');set('ankleR');
  visual.position.y+=.016*Math.sin(ph*2); // Oscil·lació V18 final, sense divisor antic.
 }
 function sample(mode,time,out,root,pos,pelvis){
  reset();
  if(mode==='idle')tread(time);
  else poseHumanSwimming(visual,j,null,time,GAME_SWIM_MODES[mode],
   {rootMotion:GAME_V18_SWIM_ROOT_MOTION});
  for(let k=0;k<JOINTS.length;k++)out[k].copy(j[JOINTS[k]].quaternion);
  root.copy(visual.quaternion);pos.copy(visual.position);
  pelvis.copy(j.pelvis.position);
 }
 function pose({mode='idle',previousMode=mode,transition=1,blend=1,time=0}={}){
  // No hi ha cap listener de render: exactament una execució per tick.
  restoreHumanSwimming(visual);
  const amount=clamp(blend);
  if(amount<.00001)return false;
  const current=VALID.has(mode)?mode:'idle',
        previous=VALID.has(previousMode)?previousMode:current,
        mix=clamp(transition),seconds=Math.max(0,Number(time)||0);
  initialRootPosition.copy(visual.position);
  initialRootQuaternion.copy(visual.quaternion);
  initialPelvis.copy(j.pelvis.position);capture();
  if(mix<.9999&&previous!==current)
   sample(previous,seconds,source,firstRoot,firstPos,firstPelvis);
  sample(current,seconds,target,lastRoot,lastPos,lastPelvis);
  reset();
  if(mix<.9999&&previous!==current){
   mixedRoot.copy(firstRoot).slerp(lastRoot,mix);
   swimPosition.copy(firstPos).lerp(lastPos,mix);
   mixedPelvis.copy(firstPelvis).lerp(lastPelvis,mix);
  }else{
   mixedRoot.copy(lastRoot);swimPosition.copy(lastPos);
   mixedPelvis.copy(lastPelvis);
  }
  visual.quaternion.copy(initialRootQuaternion).slerp(mixedRoot,amount);
  // Mesclam directament les dues poses natives en l'espai del mateix V18.
  // Cap factor de l'esquelet ocult governa la posició del nedador.
  visual.position.copy(initialRootPosition).lerp(swimPosition,amount);
  j.pelvis.position.copy(initialPelvis).lerp(mixedPelvis,amount);
  for(let k=0;k<JOINTS.length;k++){
   if(mix<.9999&&previous!==current)
    mixed.copy(source[k]).slerp(target[k],mix);
   else mixed.copy(target[k]);
   j[JOINTS[k]].quaternion.copy(original[k]).slerp(mixed,amount);
  }
  return true;
 }
 return Object.freeze({pose});
}
