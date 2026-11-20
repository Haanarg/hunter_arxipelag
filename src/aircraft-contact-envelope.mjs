// Volum de contacte dels helicòpters, mesurat sobre vèrtexs del model natiu.
// Es calcula una sola vegada a la fàbrica, mai durant el tick.
export function deriveAircraftContactEnvelope(THREE,model){
  const main=model.userData?.rotor;
  if(!main)throw Error('Helicòpter sense rotor principal de contacte');
  model.updateMatrixWorld(true);
  const fromWorld=model.matrixWorld.clone().invert();
  const point=new THREE.Vector3(),transform=new THREE.Matrix4();
  let rotorRadius=0,bodyRadius=0,bodyTop=-Infinity,staticVertices=0,rotorVertices=0;
  const visit=(node,callback)=>{
    if(!node.isMesh||!node.geometry?.attributes?.position)return;
    transform.multiplyMatrices(fromWorld,node.matrixWorld);
    const positions=node.geometry.attributes.position;
    for(let i=0;i<positions.count;i++){
      point.fromBufferAttribute(positions,i).applyMatrix4(transform);
      callback(point);
    }
  };
  main.traverse(node=>visit(node,p=>{
    rotorRadius=Math.max(rotorRadius,Math.hypot(p.x-main.position.x,p.z-main.position.z));
    rotorVertices++;
  }));
  if(!(rotorRadius>1&&rotorVertices>0))throw Error('Rotor principal sense disc de contacte');
  // Només el tram central del fuselatge: la cua no és una esfera enorme.
  // Les pales tenen la seva pròpia prova independent de contacte.
  const centralLength=Math.max(3,rotorRadius*.48);
  model.traverse(node=>{
    for(let parent=node;parent&&parent!==model;parent=parent.parent)
      if(parent.userData?.kamovRotor)return;
    visit(node,p=>{
      if(Math.abs(p.z-main.position.z)>centralLength)return;
      bodyRadius=Math.max(bodyRadius,Math.abs(p.x-main.position.x));
      bodyTop=Math.max(bodyTop,p.y);
      staticVertices++;
    });
  });
  if(!(bodyRadius>0&&Number.isFinite(bodyTop)&&staticVertices>0))
    throw Error('Fuselatge sense envolupant de contacte');
  return Object.freeze({
    bodyRadius,bodyTop,rotorRadius,
    rotorHeight:main.position.y,
    skidHeight:model.userData.skidContactHeight??0,
    source:'native-aircraft-geometry'
  });
}
export function aircraftContactInWorld(envelope,scale){
  if(!envelope||!(Number.isFinite(scale)&&scale>0))throw Error('Conversió de contacte invàlida');
  return Object.freeze({
    bodyRadius:envelope.bodyRadius*scale,
    bodyTop:envelope.bodyTop*scale,
    rotorRadius:envelope.rotorRadius*scale,
    rotorHeight:envelope.rotorHeight*scale,
    skidHeight:envelope.skidHeight*scale,
    source:envelope.source
  });
}
