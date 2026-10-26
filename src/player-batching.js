// Fusiona només malles rígides germanes; els pivots del rig no es modifiquen.
window.HUNTER_PLAYER_BATCH=Object.freeze({
  optimize(THREE,root,{batchName='hunter-player-rigid-batch'}={}){
    const protectedObjects=new Set(),visited=new Set();
    const protect=(value)=>{
      if(!value||typeof value!=='object'||visited.has(value))return;
      visited.add(value);
      if(value.isObject3D){protectedObjects.add(value);return}
      if(Array.isArray(value)){for(const item of value)protect(item);return}
      // Admetem també objectes plans de mòduls/realms diferents.
      // No entram en materials, geometries, vectors o classes Three.js.
      if(value.isMaterial||value.isBufferGeometry||value.isTexture)return;
      const proto=Object.getPrototypeOf(value);
      if(proto===null||(proto&&Object.getPrototypeOf(proto)===null))
        for(const item of Object.values(value))protect(item);
    };
    root.traverse(node=>{protect(node.userData)});
    const stats={before:0,after:0,mergedMeshes:0,batches:0,vertices:0,groups:0};
    root.traverse(node=>{if(node.isMesh)stats.before++});
    const parents=[];
    root.traverse(node=>{if(node.children?.length)parents.push(node)});
    for(const parent of parents){
      // Material i opacitat idèntics, sense malles animades ni propietats
      // especials: guanyam draw calls conservant normals, UV i silueta.
      const buckets=new Map();
      for(const m of parent.children){
        if(!m.isMesh||m.isSkinnedMesh||m.isInstancedMesh||m.children.length||
          !m.visible||m.name||protectedObjects.has(m)||
          Object.keys(m.userData).length||Array.isArray(m.material)||
          !m.geometry?.getAttribute?.('position')||
          !m.geometry.getAttribute('normal')||m.geometry.morphAttributes?.position?.length||
          m.material?.transparent||m.material?.map||m.material?.alphaMap||
          m.material?.vertexColors||m.renderOrder!==0)continue;
        // Només l'atribució simple: evitem materials amb atributs de vertex extra.
        const attrs=Object.keys(m.geometry.attributes);
        if(attrs.some(key=>!['position','normal','uv'].includes(key)))continue;
        let list=buckets.get(m.material);
        if(!list){list=[];buckets.set(m.material,list)}
        list.push(m);
      }
      for(const [material,meshes] of buckets){
        if(meshes.length<2)continue;
        // Separar grups amb flags diferents evita canviar com projecten ombres.
        const partitions=new Map();
        for(const m of meshes){
          const key=[m.castShadow,m.receiveShadow,m.frustumCulled,m.layers.mask].join(':');
          if(!partitions.has(key))partitions.set(key,[]);
          partitions.get(key).push(m);
        }
        for(const group of partitions.values()){
          if(group.length<2)continue;
          const transformed=[],counts=[];
          let vertices=0;
          for(const m of group){
            m.updateMatrix();
            const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
            if(!geo.getAttribute('normal'))geo.computeVertexNormals();
            geo.applyMatrix4(m.matrix);
            const count=geo.getAttribute('position').count;
            transformed.push(geo);counts.push(count);vertices+=count;
          }
          const positions=new Float32Array(vertices*3),normals=new Float32Array(vertices*3);
          let offset=0;
          for(let i=0;i<transformed.length;i++){
            const geo=transformed[i],count=counts[i];
            const pa=geo.getAttribute('position'),na=geo.getAttribute('normal');
            for(let j=0;j<count;j++){
              const at=3*(offset+j);
              positions[at]=pa.getX(j);positions[at+1]=pa.getY(j);positions[at+2]=pa.getZ(j);
              normals[at]=na.getX(j);normals[at+1]=na.getY(j);normals[at+2]=na.getZ(j);
            }
            offset+=count;
            geo.dispose();
          }
          const geometry=new THREE.BufferGeometry();
          geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
          geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
          geometry.computeBoundingSphere();
          const first=group[0],batch=new THREE.Mesh(geometry,material);
          batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
          batch.frustumCulled=first.frustumCulled;batch.layers.mask=first.layers.mask;
          batch.name=batchName;
          for(const m of group)parent.remove(m);
          parent.add(batch);
          stats.mergedMeshes+=group.length;stats.batches++;stats.vertices+=vertices;
        }
      }
    }
    root.traverse(node=>{if(node.isMesh)stats.after++});
    stats.groups=stats.before-stats.after;
    return stats;
  }
});
