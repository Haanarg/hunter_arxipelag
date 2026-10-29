// Reuse the existing instance geometry and the solo .9 s fall curve.
export function createPalmDestructionView(T,scene,visual,layout){
 const removed=new Set(),falls=[],zero=new T.Matrix4().makeScale(0,0,0);let initialized=false;
 return {update(entries,dt){
  if(!entries)return;
  for(const [index,hp] of entries||[])if(hp<=0&&!removed.has(index)){
   const row=layout.palms[index],ref=visual.palms.variantMap[index];
   if(initialized&&row&&ref){
    const ch=ref.chunk,meshes=[];
    for(const [source,i] of [[ch.trunk,ref.trunkIndex],[ch.primary[ref.variant],ref.index],[ch.secondary[ref.variant],ref.index]])if(source){
     const matrix=new T.Matrix4();source.getMatrixAt(i,matrix);source.updateWorldMatrix(true,false);matrix.premultiply(source.matrixWorld);
     const material=source.material.clone();if(source.instanceColor&&material.color){const color=new T.Color();source.getColorAt(i,color);material.color.multiply(color);}
     const mesh=new T.Mesh(source.geometry,material);mesh.matrixAutoUpdate=false;mesh.matrix.copy(matrix);scene.add(mesh);meshes.push({mesh,matrix});
    }
    falls.push({row,meshes,time:0});
   }
   visual.palms.remove(index,zero);removed.add(index);
  }
  initialized=true;
  for(let i=falls.length-1;i>=0;i--){
   const fall=falls[i],r=fall.row,k=Math.min(1,(fall.time+=Math.max(0,dt))/.9),pivot=new T.Matrix4().makeTranslation(r.x,r.y,r.z);
   pivot.multiply(new T.Matrix4().makeRotationY(r.yaw)).multiply(new T.Matrix4().makeRotationZ(-k*k*1.5)).multiply(new T.Matrix4().makeRotationY(-r.yaw)).multiply(new T.Matrix4().makeTranslation(-r.x,-r.y,-r.z));
   for(const {mesh,matrix} of fall.meshes)mesh.matrix.multiplyMatrices(pivot,matrix);
   if(k>=1){for(const {mesh} of fall.meshes){scene.remove(mesh);mesh.material.dispose();}falls.splice(i,1);}
  }
 }};
}
