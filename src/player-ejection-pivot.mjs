// Render-only V18 ejection turn. World-frame pivot comes from the canonical
// pelvis on the approved model, never from an old 2/3-scaled waist constant.
// Do not use this method for authoritative motion or hit testing.
export function rotateModelAroundNativePelvis(model,angle){
 if(!model||!Number.isFinite(angle))throw new RangeError('Gir de jugador invàlid');
 const pelvis=model.userData?.humanGameCanonicalJoints?.pelvis;
 if(!pelvis?.getWorldPosition)throw Error('Expulsió: manca pelvis V18 canònica');
 // The animation controller can have left a prior frame's X/Z rotation.
 // Establish the new frame's natural upright pivot before rotating.
 model.rotation.x=0;model.rotation.z=0;
 model.updateWorldMatrix(true,true);
 const upright=pelvis.getWorldPosition(model.position.clone());
 model.rotation.x=angle;
 model.updateWorldMatrix(true,true);
 const rotated=pelvis.getWorldPosition(model.position.clone());
 // Position is parent-local, so transform both world points through
 // the parent before subtracting. Handles COOP reparenting & scales.
 if(model.parent){
  model.parent.worldToLocal(upright);
  model.parent.worldToLocal(rotated);
 }
 model.position.add(upright.sub(rotated));
 model.updateWorldMatrix(true,true);
 return pelvis.getWorldPosition(model.position.clone());
}
