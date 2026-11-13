// GAZ Tigr-M aprovat: geometria nativa del candidat 3, sense GLB.
import {createReferenceVehicle} from './vehicle-reference-candidates.mjs';
import {vehicleSpecs} from './vehicle-specs.mjs';

export const GAZ_TIGR_RUNTIME_VERSION='gaz-tigr-m-candidate-3-native-20261113';

// El laboratori conserva les peces editables. El runtime agrupa només les
// malles opaques estàtiques i manté les rodes i els vidres separats.
function batchStaticMeshes(THREE,root){
 const parents=[];root.traverse(o=>{if(o.children.length)parents.push(o)});
 let batches=0;
 for(const parent of parents){
  const groups=new Map();
  for(const mesh of parent.children){
   if(!mesh.isMesh||mesh.children.length||mesh.material?.transparent||
      mesh.renderOrder||!mesh.geometry?.getAttribute('position'))continue;
   if(!groups.has(mesh.material))groups.set(mesh.material,[]);
   groups.get(mesh.material).push(mesh);
  }
  for(const [material,meshes] of groups){
   if(meshes.length<2)continue;
   const positions=[],normals=[];
   for(const m of meshes){
    m.updateMatrix();
    const transformed=m.geometry.clone();
    transformed.applyMatrix4(m.matrix);
    if(!transformed.getAttribute('normal'))transformed.computeVertexNormals();
    const flat=transformed.index?transformed.toNonIndexed():transformed;
    const p=flat.getAttribute('position'),n=flat.getAttribute('normal');
    for(let i=0;i<p.count;i++){
     positions.push(p.getX(i),p.getY(i),p.getZ(i));
     normals.push(n.getX(i),n.getY(i),n.getZ(i));
    }
    parent.remove(m);
    m.geometry.dispose();transformed.dispose();
    if(flat!==transformed)flat.dispose();
   }
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
   geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
   geo.computeBoundingSphere();
   const merged=new THREE.Mesh(geo,material);
   merged.name='gaz-tigr-static-batch-'+batches++;
   merged.castShadow=merged.receiveShadow=true;
   parent.add(merged);
  }
 }
 return batches;
}

export function prepareGazTigrRuntime(THREE,{vehicleScale=vehicleSpecs.scales.cotxe}={}){
 if(!Number.isFinite(vehicleScale)||vehicleScale<=0)
  throw new Error('Escala invàlida del GAZ Tigr-M');
 const template=createReferenceVehicle(THREE,'tigr-v1');
 const wheelGroups=[];
 template.traverse(node=>{if(node.name.startsWith('Conjunt roda '))wheelGroups.push(node)});
 if(wheelGroups.length!==4||wheelGroups.filter(w=>w.position.z<0).length!==2)
  throw new Error('El GAZ Tigr-M ha de tenir quatre rodes, dues davanteres');
 const dimensions=new THREE.Box3().setFromObject(template).getSize(new THREE.Vector3());
 if(dimensions.x<2.4||dimensions.x>2.8||dimensions.z<5.6||dimensions.z>5.9)
  throw new Error('Dimensions inesperades del GAZ Tigr-M');
 const staticBatches=batchStaticMeshes(THREE,template);
 let instances=0;
 return Object.freeze({
  name:'GAZ Tigr-M · candidat 3 aprovat',
  renderer:GAZ_TIGR_RUNTIME_VERSION,
  scale:vehicleScale,
  dimensions:Object.freeze({width:dimensions.x*vehicleScale,height:dimensions.y*vehicleScale,length:dimensions.z*vehicleScale}),
  staticBatches,
  create(){
   // Geometries compartides, però rodes i direcció independents per vehicle.
   const car=template.clone(true),wheels=[],steeringPivots=[],groups=[];
   car.traverse(node=>{if(node.name.startsWith('Conjunt roda '))groups.push(node)});
   for(const wheel of groups){
    const parent=wheel.parent,front=wheel.position.z<0;
    const pivot=new THREE.Group();
    pivot.name='gaz-tigr-steering-'+(front?'front':'rear')+'-'+(wheel.position.x<0?'left':'right');
    pivot.position.copy(wheel.position);
    parent.add(pivot);
    parent.remove(wheel);
    wheel.position.set(0,0,0);
    pivot.add(wheel);
    wheel.userData.radius=.55*vehicleScale;
    wheels.push(wheel);
    if(front)steeringPivots.push(pivot);
   }
   if(wheels.length!==4||steeringPivots.length!==2)
    throw new Error('No s’ha pogut construir el tren de rodatge del GAZ Tigr-M');
   car.userData.wheels=wheels;
   car.userData.steeringPivots=steeringPivots;
   car.userData.militaryCarModel='GAZ Tigr-M';
   car.userData.nativeStaticBatches=staticBatches;
   car.name='GAZ_Tigr_M_'+(++instances);
   return car;
  }
 });
}
