// Consolidació de l'escala fixa dels models Three.js en coordenades de malla.
// No altera les animacions, la càmera ni els valors físics de la simulació.
// Només descompon transformacions estàtiques; conserva els pivots articulats.
export function bakeFixedModelScales(root,{includeRoot=true,geometryCache=null}={}){
 if(!root?.isObject3D)throw Error('Cal un Object3D per normalitzar les escales');
 const report={bakedUniform:0,bakedMeshAxes:0,remainingNonUniform:0};
 // Una memòria compartida opcional conserva la geometria fusionada dels
 // soldats: no duplicam a cada patrulla els mateixos V18 i LOD.
 const transformed=geometryCache||new WeakMap();
 const geometryWithScale=(geometry,x,y,z)=>{
  let perScale=transformed.get(geometry);
  if(!perScale){perScale=new Map();transformed.set(geometry,perScale)}
  const key=[x,y,z].join(',');
  if(!perScale.has(key)){
   const next=geometry.clone();next.scale(x,y,z);
   next.userData={...geometry.userData,modelScaleBaked:true};
   perScale.set(key,next);
  }
  return perScale.get(key);
 };
 const walk=node=>{
  const x=node.scale.x,y=node.scale.y,z=node.scale.z;
  if(!(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z)&&x>0&&y>0&&z>0))
   throw Error('Escala invàlida per a '+(node.name||node.type));
  const uniform=Math.abs(x-y)<1e-10&&Math.abs(y-z)<1e-10;
  const changed=Math.abs(x-1)>1e-10||Math.abs(y-1)>1e-10||Math.abs(z-1)>1e-10;
  if(changed&&uniform){
   // Amb una escala uniforme, l'orientació de les articulacions
   // descendents es conserva: només es consoliden posicions i geometria.
   if(node.isMesh&&node.geometry)
    node.geometry=geometryWithScale(node.geometry,x,y,z);
   for(const child of node.children){
    child.position.multiplyScalar(x);
    child.scale.multiplyScalar(x);
   }
   node.scale.set(1,1,1);
   report.bakedUniform++;
  }else if(changed&&node.isMesh&&node.children.length===0&&node.geometry){
   // Escales no uniformes de primitives (esferes, cilindres, etc.):
   // no són una correcció del rig, només dimensions de la malla.
   node.geometry=geometryWithScale(node.geometry,x,y,z);
   node.scale.set(1,1,1);
   report.bakedMeshAxes++;
  }else if(changed){
   // Un node no uniforme amb fills girats pot incorporar shear.
   // No podem aplanar-lo sense alterar les transformacions exactes.
   report.remainingNonUniform++;
  }
  for(const child of node.children)walk(child);
 };
 if(includeRoot)walk(root);else for(const child of root.children)walk(child);
 root.updateMatrixWorld(true);
 return report;
}
