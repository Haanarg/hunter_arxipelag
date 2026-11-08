// Huey UH-1 definitiu: Duane's Mind (Sketchfab), CC BY 4.0.
// GLB original 100% (1.767 triangles després d'obrir els laterals), carregat
// un únic cop abans de començar una missió. Cada aparell comparteix recursos.
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const HUEY_MODEL_URL=new URL('../assets/vehicle-models/huey-duane-doors-open.glb',import.meta.url).href;
export const HUEY_MODEL_SOURCE='https://sketchfab.com/3d-models/bell-huey-helicopter-755d8518a06e41b19752c1b54c0da588';
const TRIANGLES=1767;
// Sense tocar el contracte de la física: el rotor es troba aproximadament
// a 3.82 unitats, i el punt de contacte inferior a .405 abans de VS.heli.
const MODEL_SCALE=1.35;
const SKID_HEIGHT=.405;

function countTriangles(root){
 let count=0;
 root.traverse(node=>{
  if(node.isMesh&&node.geometry?.attributes?.position)
   count+=Math.floor((node.geometry.index?.count??node.geometry.attributes.position.count)/3);
 });
 return count;
}
function verifyRotor(root){
 const main=root.getObjectByName('Top_Rotor');
 const tail=root.getObjectByName('Back_Rotor');
 if(!main||!tail||!main.children.length||!tail.children.length)
  throw Error('El model Huey no conserva tots dos pivots dels rotors');
 return {main,tail};
}
export async function prepareHueyDuaneRuntime(THREE){
 const loader=new GLTFLoader();
 const gltf=await loader.loadAsync(HUEY_MODEL_URL);
 if(!gltf?.scene)throw Error('El GLB del Huey no té escenari');
 const template=gltf.scene;
 const measured=countTriangles(template);
 if(measured!==TRIANGLES)
  throw Error('Triangles del Huey inesperats: '+measured+' (prevists '+TRIANGLES+')');
 verifyRotor(template);
 const aircraft=new THREE.Group();
 const shell=template.clone(true);
 shell.rotation.y=Math.PI; // L'arxiu apunta el morro a +Z; Hunter avança cap a -Z.
 shell.scale.setScalar(MODEL_SCALE);
 aircraft.add(shell);
 aircraft.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(aircraft);
 shell.position.y+=SKID_HEIGHT-bounds.min.y;
 aircraft.updateMatrixWorld(true);
 const after=new THREE.Box3().setFromObject(aircraft);
 const dimensions=after.getSize(new THREE.Vector3());
 if(!(dimensions.y>2.5&&dimensions.y<5&&dimensions.z>11&&dimensions.z<17))
  throw Error('Dimensions del Huey incompatibles amb la física actual');
 let instances=0;
 return Object.freeze({
  name:"Bell UH-1 Huey · Duane's Mind · portes obertes",
  source:HUEY_MODEL_SOURCE,license:'CC BY 4.0',triangles:TRIANGLES,
  dimensions:Object.freeze({width:dimensions.x,height:dimensions.y,length:dimensions.z}),
  create(){
   const root=new THREE.Group();
   const visual=shell.clone(true);
   root.add(visual);
   const pivots=verifyRotor(visual);
   // El bucle de vehicles existent fa girar aquests dos Object3D.
   root.userData.rotor=pivots.main;
   root.userData.tailRotor=pivots.tail;
   root.userData.hueyModel='duane-100-open';
   root.name='Huey_Duane_open_'+(++instances);
   return root;
  }
 });
}
