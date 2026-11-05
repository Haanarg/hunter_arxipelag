// Etapa visual de lots estàtics: molls, heliports, decoració i plataformes.
// La generació física del món i les llavors continuen al motor. Cap RNG aquí.
// Manté els punts de pausa, transformacions, materials i disposicions originals.
window.HUNTER_STATIC_DECOR_BATCH=Object.freeze({
  *buildSteps({world,staticDecorRoots,THREE}){let checkpointUnits=0;
  const CHUNK=160,groups=new Map(),materialMap=new Map();
  world.updateWorldMatrix(true,false);
  let originals=0,batches=0,vertices=0;
  for(const root of staticDecorRoots){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    if(!root.parent)continue;
    root.updateMatrixWorld(true);
    yield {stage:'Agrupant decoració',completed:originals,total:null,unit:'malles'};
    const materialSignatures=new WeakMap();
    root.traverse(mesh=>{
      if(!mesh.isMesh||mesh.isInstancedMesh||!mesh.geometry?.attributes.position)return;
      const mat=mesh.material;
      if(!mat?.color||Array.isArray(mat))return;
      // root.updateMatrixWorld(true) has already updated every descendant.
      // Read its translation directly; avoid another matrix-tree traversal
      // and a fresh Vector3 for every fixed piece.
      const elements=mesh.matrixWorld.elements,
            cx=Math.floor(elements[12]/CHUNK),cz=Math.floor(elements[14]/CHUNK);
      // A material can be changed between cooperative build checkpoints.
      // Cache only during this synchronous root traversal, not across roots.
      let signature=materialSignatures.get(mat);
      if(signature===undefined){
        signature=[mat.type,mat.roughness??0,mat.metalness??0,mat.opacity??1,
          mat.transparent?1:0,mat.side,mat.flatShading?1:0,mat.polygonOffset?1:0,mat.polygonOffsetFactor,mat.polygonOffsetUnits].join(':');
        materialSignatures.set(mat,signature);
      }
      const key=cx+','+cz+'|'+signature;
      let group=groups.get(key);
      if(!group){group={cx,cz,mat,signature,meshes:[]};groups.set(key,group)}
      group.meshes.push(mesh);originals++;
    });
  }
  const transform=new THREE.Matrix4();
  for(const group of groups.values()){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const x=(group.cx+.5)*CHUNK,z=(group.cz+.5)*CHUNK,
          sizes=[];let total=0,colorOffset=0;
    // Vertex counts are already available on each source geometry.
    // Allocate one color buffer per output batch, not one per source mesh.
    // BufferGeometry.toNonIndexed() produces index.count vertices.
    const capacity=group.meshes.reduce((sum,mesh)=>
      sum+(mesh.geometry.index?mesh.geometry.index.count:
        mesh.geometry.attributes.position.count),0);
    const colorData=new Float32Array(capacity*3),
      mergedAttributes={
        position:new Float32Array(capacity*3),
        normal:new Float32Array(capacity*3),
        uv:new Float32Array(capacity*2)
      };
    try{
    for(const mesh of group.meshes){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      yield {stage:'Agrupant decoració',completed:batches,total:groups.size,unit:'grups'};
      transform.makeTranslation(-x,0,-z).multiply(mesh.matrixWorld);
      const copy=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      // Every scratch geometry has at most one owner; even cancellation of
      // a cooperative generator releases the current copy immediately.
      try{
        copy.applyMatrix4(transform);
        const n=copy.attributes.position.count;
        sizes.push(n);total+=n;
        for(let k=0;k<n;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
          if(k%256===0)yield {stage:'Colors de decoració',completed:k,total:n,unit:'vèrtexs'};
          // Preserve edits to the material made between cooperative yields.
          const offset=(colorOffset+k)*3;
          colorData[offset]=mesh.material.color.r;
          colorData[offset+1]=mesh.material.color.g;
          colorData[offset+2]=mesh.material.color.b;
        }
        // The transformed copy is private to this batch, so moving these
        // copies earlier does not change the resulting vertex arrays.
        for(const [attribute,width] of [['position',3],['normal',3],['uv',2]]){
          const src=copy.getAttribute(attribute);
          if(src)mergedAttributes[attribute].set(src.array,(total-n)*width);
        }
        colorOffset+=n;
      }finally{copy.dispose()}
    }
    const geom=new THREE.BufferGeometry();
    for(const [attribute,width] of [['position',3],['normal',3],['uv',2],['color',3]]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      // Colors were already written directly to their final contiguous
      // buffer, so they need no intermediate attribute or second copy.
      const data=attribute==='color'?colorData:mergedAttributes[attribute];
      // Preserve the original incremental-build checkpoints even though
      // the attribute data is already in its final buffer.
      for(let k=0;k<sizes.length;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null}}
      geom.setAttribute(attribute,new THREE.BufferAttribute(data,width));
    }
    geom.computeBoundingSphere();
    // El mateix material per perfil en tots els sectors. Mateixes cares,
    // colors i abast visual, però menys canvis d'estat de Three.js.
    let mat=materialMap.get(group.signature);
    if(!mat){
      mat=group.mat.clone();mat.color.setHex(0xffffff);
      mat.vertexColors=true;mat.needsUpdate=true;
      materialMap.set(group.signature,mat);
    }
    const mesh=new THREE.Mesh(geom,mat);
    mesh.name='hunter-static-decor-batch';
    mesh.position.set(x,0,z);mesh.castShadow=false;
    world.add(mesh);
    batches++;vertices+=total;
    }finally{for(let k=0;k<sizes.length;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null}}}
  }
  const disposed=new Set(),materials=new Set();
  for(const root of staticDecorRoots){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    yield {stage:'Netejant decoració original',completed:null,total:null};
    root.traverse(o=>{
      if(o.geometry&&!disposed.has(o.geometry)){disposed.add(o.geometry);o.geometry.dispose()}
      if(o.material){
        for(const mat of Array.isArray(o.material)?o.material:[o.material])materials.add(mat);
      }
    });
    root.parent?.remove(root);
  }
  for(const mat of materials){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};mat.dispose();}
  staticDecorRoots.length=0;
  const result={originalMeshes:originals,batchedMeshes:batches,
    drawCallsSaved:originals-batches,sharedMaterials:materialMap.size,vertices};
  window.HUNTER_STATIC_BATCH_STATS=result;
  return result;
}
});
