import * as THREE from '../vendor/three-r186.module.mjs';

// Clip in model coordinates, then reflect the retained half. Interpolate every
// vertex attribute and preserve material groups; never average opposite vertices.
export function symmetricGeometry(mesh, root, axis='x', side=1, plane=0) {
 if(!['x','y','z'].includes(axis)||![1,-1].includes(side)||!Number.isFinite(plane))throw Error('Pla de simetria invàlid');
 if(mesh.isSkinnedMesh||mesh.isInstancedMesh||Object.keys(mesh.geometry.morphAttributes).length)throw Error('La simetria requereix una malla estàtica');
 root.updateMatrixWorld(true);
 const transform=new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld);
 if(Math.abs(transform.determinant())<1e-12)throw Error('La peça té una escala nul·la');
 const inverse=transform.clone().invert(),src=mesh.geometry;
 const attrs=Object.entries(src.attributes).filter(([name])=>!['normal','tangent'].includes(name));
 const output=Object.fromEntries(attrs.map(([name])=>[name,[]]));
 const result=new THREE.BufferGeometry(),count=src.index?.count??src.attributes.position.count;
 const point=new THREE.Vector3();
 const vertex=i=>{
  const index=src.index?src.index.getX(i):i,values={};
  for(const [name,a] of attrs)values[name]=Array.from({length:a.itemSize},(_,j)=>a.getComponent(index,j));
  values.position=point.fromArray(values.position).applyMatrix4(transform).toArray();return values;
 };
 const component={x:0,y:1,z:2}[axis],distance=v=>side*(v.position[component]-plane);
 const interpolate=(a,b,t)=>Object.fromEntries(attrs.map(([name])=>[name,a[name].map((v,j)=>v+(b[name][j]-v)*t)]));
 function emit(vertices,mirrored,material){
  const start=output.position.length/3;
  for(const v of mirrored?[vertices[0],vertices[2],vertices[1]]:vertices){
   for(const [name] of attrs){
    let values=v[name];
    if(name==='position'){
     values=[...values];if(mirrored)values[component]=2*plane-values[component];
     values=point.fromArray(values).applyMatrix4(inverse).toArray();
    }
    output[name].push(...values);
   }
  }
  const last=result.groups.at(-1);
  if(last&&last.materialIndex===material&&last.start+last.count===start)last.count+=3;
  else result.addGroup(start,3,material);
 }
 for(let i=0;i<count;i+=3){
  let polygon=[vertex(i),vertex(i+1),vertex(i+2)],clipped=[];
  for(let j=0;j<3;j++){
   const a=polygon[j],b=polygon[(j+1)%3],da=distance(a),db=distance(b);
   if(da>=-1e-7)clipped.push(a);
   if((da>1e-7&&db< -1e-7)||(da< -1e-7&&db>1e-7))clipped.push(interpolate(a,b,da/(da-db)));
  }
  const material=src.groups.find(g=>i>=g.start&&i<g.start+g.count)?.materialIndex??0;
  for(let j=1;j<clipped.length-1;j++){
   const triangle=[clipped[0],clipped[j],clipped[j+1]];
   const a=new THREE.Vector3().fromArray(triangle[0].position),b=new THREE.Vector3().fromArray(triangle[1].position),c=new THREE.Vector3().fromArray(triangle[2].position);
   if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-16)continue;
   emit(triangle,false,material);
   if(!triangle.every(v=>Math.abs(distance(v))<1e-7))emit(triangle,true,material);
  }
 }
 for(const [name,a] of attrs)result.setAttribute(name,new THREE.Float32BufferAttribute(output[name],a.itemSize));
 result.computeVertexNormals();result.computeBoundingBox();result.computeBoundingSphere();
 return result;
}

export function symmetrizeModel(root,axis='x',side=1,plane=0){
 const pending=[];
 try{root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.vehicleAnnotationOverlay)pending.push([mesh,symmetricGeometry(mesh,root,axis,side,plane)])})}
 catch(error){for(const [,geometry] of pending)geometry.dispose();throw error}
 for(const [mesh,geometry] of pending)mesh.geometry=geometry;
 return pending.length;
}
