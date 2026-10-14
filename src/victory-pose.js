// Postura compartida entre el final jugable i la previsualització.
// Roda el general al voltant del maluc (no dels peus) i eleva els braços
// cap a fora abans de la caiguda per evitar que quedin dins la gavardina.
window.HUNTER_VICTORY_POSE=Object.freeze((()=>{
  const clamp=t=>Math.max(0,Math.min(1,t));
  const ease=t=>{const x=clamp(t);return x*x*(3-2*x)};
  const joints=items=>(items||[]).filter(Boolean).map(node=>({
    node,rotation:node.rotation.clone()
  }));
  function capture(THREE,model,direction,pelvisHeight=1.35){
    const rig=model.userData||{};
    const fallDir=new THREE.Vector3(direction?.x||0,0,direction?.z||-1);
    if(fallDir.lengthSq()<.00001)fallDir.set(0,0,-1);
    fallDir.normalize();
    const axis=new THREE.Vector3(0,1,0).cross(fallDir).normalize();
    return {
      THREE,model,axis,pelvisHeight,
      position:model.position.clone(),quaternion:model.quaternion.clone(),
      hips:joints(rig.legs||[rig.ll,rig.lr]),
      knees:joints(rig.knees||[rig.lkl,rig.lkr]),
      arms:joints(rig.arms||[rig.al,rig.ar]),
      elbows:joints(rig.elbows||[rig.ael,rig.aer]),
      head:joints([rig.head])
    };
  }
  function apply(pose,progress){
    const {THREE,model}=pose,p=clamp(progress);
    const lift=ease((p-.01)/.35),fall=ease((p-.16)/.81);
    const recoil=Math.sin(Math.PI*clamp(p/.29))*.13;
    const angle=recoil+1.48*fall;
    // Angle al món: el cos cau allunyant-se de la trajectòria entrant.
    model.quaternion.setFromAxisAngle(pose.axis,angle).multiply(pose.quaternion);
    // Rotació al voltant del maluc, després el cos s'assenta al terra.
    const pelvis=new THREE.Vector3(0,pose.pelvisHeight,0);
    const before=pelvis.clone().applyQuaternion(pose.quaternion);
    const after=pelvis.clone().applyQuaternion(model.quaternion);
    model.position.copy(pose.position).add(before).sub(after);
    model.position.y-=.83*fall;

    pose.arms.forEach(({node,rotation},i)=>{
      const side=i===0?-1:1;
      // > 90 graus de separació: mans per sobre de la línia d'espatlles,
      // sense travessar la gavardina ni amagar-les en el tronc.
      node.rotation.set(rotation.x+(i===0?-.27:.22)*lift,
        rotation.y+side*.32*lift,
        rotation.z+side*2.03*lift);
    });
    pose.elbows.forEach(({node,rotation},i)=>{
      node.rotation.copy(rotation);
      node.rotation.x+=(i===0?.27:.34)*lift;
      node.rotation.z+=(i===0?-.10:.10)*lift;
    });
    pose.hips.forEach(({node,rotation},i)=>{
      node.rotation.copy(rotation);node.rotation.x+=(i===0?-.23:.29)*fall;
    });
    pose.knees.forEach(({node,rotation},i)=>{
      node.rotation.copy(rotation);node.rotation.x-=(i===0?.39:.63)*fall;
    });
    pose.head.forEach(({node,rotation})=>{
      node.rotation.copy(rotation);
      node.rotation.x-=.30*ease((p-.08)/.46);
    });
  }
  return {capture,apply};
})());
