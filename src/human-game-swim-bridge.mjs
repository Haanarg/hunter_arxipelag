// Canonical game swimming bridge. Renders the exact approved B3 and C4
// laboratory poses on the live player, including remote COOP players.
// The legacy game controller remains authoritative for input, collision,
// physics, weapons and seated characters.
import {poseHumanSwimming,restoreHumanSwimming,HUMAN_SWIM_PROPOSALS} from './human-swim-proposals.mjs?rev=game-swim-b3-c4-20261119-2';

export const GAME_SWIM_MODES=Object.freeze({breast:'swim-breast-3',crawl:'swim-crawl-4'});
export const GAME_SWIM_PERIODS=Object.freeze({
 breast:HUMAN_SWIM_PROPOSALS.breast[2].period,
 crawl:HUMAN_SWIM_PROPOSALS.crawl[3].period
});

const JOINTS=['pelvis','spine','neck','head','hipL','hipR','kneeL','kneeR',
 'ankleL','ankleR','shoulderL','shoulderR','elbowL','elbowR','wristL','wristR'];
const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));

/** Per-avatar pose sampler; never writes to gameplay joints. */
export function createGameSwimBridge(T,visual,j){
 for(const id of JOINTS)if(!j[id])throw Error('Falta el pivot canònic de natació '+id);
 const initialRootPosition=new T.Vector3(),initialRootQuaternion=new T.Quaternion(),
  initialPelvis=new T.Vector3();
 const original=JOINTS.map(()=>new T.Quaternion());
 const breast=JOINTS.map(()=>new T.Quaternion()),crawl=JOINTS.map(()=>new T.Quaternion());
 const breastRoot=new T.Quaternion(),crawlRoot=new T.Quaternion();
 const breastPosition=new T.Vector3(),crawlPosition=new T.Vector3();
 const breastPelvis=new T.Vector3(),crawlPelvis=new T.Vector3();
 const mixed=new T.Quaternion(),swimRoot=new T.Quaternion(),swimPosition=new T.Vector3();

 function capture(){for(let k=0;k<JOINTS.length;k++)original[k].copy(j[JOINTS[k]].quaternion)}
 function reset(){
  restoreHumanSwimming(visual);
  visual.position.copy(initialRootPosition);
  visual.quaternion.copy(initialRootQuaternion);
  for(let k=0;k<JOINTS.length;k++)j[JOINTS[k]].quaternion.copy(original[k]);
  j.pelvis.position.copy(initialPelvis);
 }
 function sample(mode,time,target,root,position,pelvis){
  reset();
  poseHumanSwimming(visual,j,null,time,mode);
  for(let k=0;k<JOINTS.length;k++)target[k].copy(j[JOINTS[k]].quaternion);
  root.copy(visual.quaternion);position.copy(visual.position);
  pelvis.copy(j.pelvis.position);
 }

 function pose({active=false,blend=0,crawlBlend=0,time=0}={}){
  // Sync the rest pose first. Calls from Box3/camera/shadows can happen
  // between animation ticks; never advance the phase from a render callback.
  restoreHumanSwimming(visual);
  const amount=clamp(blend);
  if(!active&&amount<.0001)return false;
  initialRootPosition.copy(visual.position);
  initialRootQuaternion.copy(visual.quaternion);
  initialPelvis.copy(j.pelvis.position);
  capture();
  const crawlRatio=clamp(crawlBlend),safeTime=Math.max(0,Number(time)||0);
  if(crawlRatio<.9999)sample(GAME_SWIM_MODES.breast,safeTime,breast,breastRoot,breastPosition,breastPelvis);
  if(crawlRatio>.0001)sample(GAME_SWIM_MODES.crawl,safeTime,crawl,crawlRoot,crawlPosition,crawlPelvis);
  reset();
  if(crawlRatio<=.0001){
   swimRoot.copy(breastRoot);swimPosition.copy(breastPosition);
  }else if(crawlRatio>=.9999){
   swimRoot.copy(crawlRoot);swimPosition.copy(crawlPosition);
  }else{
   swimRoot.copy(breastRoot).slerp(crawlRoot,crawlRatio);
   swimPosition.copy(breastPosition).lerp(crawlPosition,crawlRatio);
  }
  visual.quaternion.copy(initialRootQuaternion).slerp(swimRoot,amount);
  visual.position.copy(initialRootPosition).lerp(swimPosition,amount);
  const pelvisTarget=crawlRatio<=.0001?breastPelvis:crawlRatio>=.9999?
   crawlPelvis:breastPelvis.clone().lerp(crawlPelvis,crawlRatio);
  j.pelvis.position.copy(initialPelvis).lerp(pelvisTarget,amount);
  for(let k=0;k<JOINTS.length;k++){
   if(crawlRatio<=.0001)mixed.copy(breast[k]);
   else if(crawlRatio>=.9999)mixed.copy(crawl[k]);
   else mixed.copy(breast[k]).slerp(crawl[k],crawlRatio);
   j[JOINTS[k]].quaternion.copy(original[k]).slerp(mixed,amount);
  }
  return true;
 }
 return {pose};
}
