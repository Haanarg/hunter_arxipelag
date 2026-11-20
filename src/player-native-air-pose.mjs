// Postures aèries directes per a l'esquelet V18 del joc/editor.
// No es llegeixen les articulacions ni l'escala del rig V17 ocult.
// La trajectòria i el paracaigudes continuen governats per la simulació.
export const V18_AIR_POSES=Object.freeze({
 parachute:Object.freeze({
  shoulderL:[2.35,0,-.19],shoulderR:[2.35,0,.19],
  elbowL:[.22,0,-.06],elbowR:[.22,0,.06],
  hipL:[.10,0,0],hipR:[-.10,0,0],
  kneeL:[-.18,0,0],kneeR:[-.18,0,0]
 }),
 fall:Object.freeze({
  shoulderL:[.60,0,.30],shoulderR:[.60,0,-.30],
  elbowL:[.18,0,0],elbowR:[.18,0,0],
  hipL:[.17,0,0],hipR:[-.17,0,0],
  kneeL:[-.12,0,0],kneeR:[-.12,0,0]
 })
});
export function applyNativeV18AirPose(joints,mode,blend=1){
 const weight=Math.max(0,Math.min(1,Number(blend)));
 if(!Number.isFinite(weight))throw new RangeError('Pes aeri V18 invàlid');
 if(weight===0||!mode)return false;
 const pose=V18_AIR_POSES[mode];
 if(!pose)throw new RangeError('Mode aeri V18 invàlid: '+mode);
 for(const [name,angles]of Object.entries(pose)){
  const joint=joints?.[name];
  if(!joint?.rotation)throw Error('Falta articulació aèria V18: '+name);
  for(let i=0;i<3;i++){
   const axis=['x','y','z'][i];
   joint.rotation[axis]+=(angles[i]-joint.rotation[axis])*weight;
  }
 }
 return true;
}
