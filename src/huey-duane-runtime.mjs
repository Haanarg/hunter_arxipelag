// Huey UH-1 de Duane's Mind (CC BY 4.0), portes obertes.
// Reconstruït enterament amb THREE.BufferGeometry, UV i textura PNG.
// No carrega cap GLB ni cap GLTFLoader; la fàbrica també és compartida per COOP.
import {createNativeHuey,NATIVE_HUEY_META} from './huey-duane-native-geometry.mjs';

export const HUEY_MODEL_SOURCE='https://sketchfab.com/3d-models/bell-huey-helicopter-755d8518a06e41b19752c1b54c0da588';
export const HUEY_MODEL_ID='duane-100-open-engine-native-110';
export const HUEY_SCALE_FACTOR=1.10;
const ORIGINAL_TRIANGLES=1767;
function countTriangles(root){
 let count=0;
 root.traverse(node=>{
  if(node.isMesh&&node.geometry?.attributes?.position)
   count+=Math.floor((node.geometry.index?.count??node.geometry.attributes.position.count)/3);
 });
 return count;
}
export async function prepareHueyDuaneRuntime(THREE){
 const check=createNativeHuey(THREE);
 const measured=countTriangles(check);
 if(measured!==2119||NATIVE_HUEY_META.triangles!==ORIGINAL_TRIANGLES)
  throw Error('Geometria Huey o seients incomplets: '+measured+' triangles');
 const bounds=new THREE.Box3().setFromObject(check);
 const dimensions=bounds.getSize(new THREE.Vector3());
 if(!(dimensions.y>3&&dimensions.y<6&&dimensions.z>14&&dimensions.z<19))
  throw Error('Dimensions del Huey 110% incompatibles: '+dimensions.toArray());
 const skidContactHeight=check.userData.skidContactHeight;
 const rotorContactHeight=check.userData.rotorContactHeight;
 if(!(rotorContactHeight>3.7&&rotorContactHeight<5.3))
  throw Error('Altura del rotor Huey fora de rang: '+rotorContactHeight);
 return Object.freeze({
  name:"Bell UH-1 Huey · Duane's Mind · portes obertes · +10%",
  model:HUEY_MODEL_ID,
  source:HUEY_MODEL_SOURCE,license:'CC BY 4.0',
  triangles:measured,
  dimensions:Object.freeze({width:dimensions.x,height:dimensions.y,length:dimensions.z}),
  skidContactHeight,rotorContactHeight,
  create(){return createNativeHuey(THREE);}
 });
}
