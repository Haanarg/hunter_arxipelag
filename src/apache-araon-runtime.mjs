// Apache AH-64 d'Araon · CC BY 4.0.
// Variant aprovada: sàlvia mat, aspes i detalls negres, cos 50%, rodes 75%.
// Els recursos glTF es carreguen una sola vegada, abans de la fàbrica síncrona.
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const APACHE_MODEL_URL=new URL('../assets/vehicle-models/apache-araon-salvia-black.glb',import.meta.url).href;
export const APACHE_MODEL_SOURCE='https://sketchfab.com/3d-models/ah-64-apache-df0993ee21e74a759cd0519f6fc51cf8';
export const APACHE_TRIANGLES=2193;
export const APACHE_MODEL_ID='araon-50-wheels75-salvia-black';
const MODEL_SCALE=.00405;
const WHEEL_CONTACT=.405;

function triangles(root){
 let result=0;
 root.traverse(node=>{
  if(node.isMesh&&node.geometry?.getAttribute('position'))
   result+=Math.floor((node.geometry.getIndex()?.count??node.geometry.getAttribute('position').count)/3);
 });
 return result;
}
function placePivot(THREE,scene,name,pivotName){
 const node=scene.getObjectByName(name);
 if(!node?.parent||!node.getObjectByProperty('isMesh',true))
  throw Error('Falta la malla '+name+' de l’Apache');
 scene.updateMatrixWorld(true);
 const parent=node.parent;
 const center=new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
 const pivot=new THREE.Group();
 pivot.name=pivotName;
 pivot.position.copy(parent.worldToLocal(center));
 parent.add(pivot);
 pivot.attach(node); // Preserve l’aspecte inicial; girarà al centre de les aspes.
 return pivot;
}
function pivots(root){
 const main=root.getObjectByName('Apache_Main_Rotor_Pivot');
 const tail=root.getObjectByName('Apache_Tail_Rotor_Pivot');
 if(!main||!tail||!main.children.length||!tail.children.length)
  throw Error('L’Apache no conserva els dos rotors independents');
 return {main,tail};
}
export async function prepareApacheAraonRuntime(THREE){
 const gltf=await new GLTFLoader().loadAsync(APACHE_MODEL_URL);
 if(!gltf?.scene)throw Error('El GLB Apache no té escenari');
 const template=gltf.scene;
 const count=triangles(template);
 if(count!==APACHE_TRIANGLES)throw Error('Triangles Apache: '+count+' (prevists '+APACHE_TRIANGLES+')');
 placePivot(THREE,template,'main_rotor','Apache_Main_Rotor_Pivot');
 placePivot(THREE,template,'tail_rotor','Apache_Tail_Rotor_Pivot');
 const shell=template.clone(true);
 shell.rotation.y=Math.PI; // Sketchfab apunta cap a +Z; el joc cap a -Z.
 shell.scale.setScalar(MODEL_SCALE);
 const aircraft=new THREE.Group();
 aircraft.add(shell);
 aircraft.updateMatrixWorld(true);
 const bounds0=new THREE.Box3().setFromObject(aircraft);
 shell.position.y+=WHEEL_CONTACT-bounds0.min.y;
 aircraft.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(aircraft);
 const dims=bounds.getSize(new THREE.Vector3());
 if(!(dims.z>6&&dims.z<9&&dims.x>4&&dims.x<5.5))
  throw Error('Dimensions Apache no compatibles amb la flota');
 const axis=pivots(shell).main.getWorldPosition(new THREE.Vector3());
 const rotorContactHeight=aircraft.worldToLocal(axis).y;
 if(!(rotorContactHeight>1&&rotorContactHeight<4))
  throw Error('Altura del rotor Apache incorrecta');
 let instances=0;
 return Object.freeze({
  name:'AH-64 Apache · Araon · sàlvia mat/negres',
  source:APACHE_MODEL_SOURCE,license:'CC BY 4.0',triangles:count,
  dimensions:Object.freeze({width:dims.x,height:dims.y,length:dims.z}),
  skidContactHeight:WHEEL_CONTACT,rotorContactHeight,
  create(){
   const root=new THREE.Group(),visual=shell.clone(true);
   root.add(visual);
   const p=pivots(visual);
   root.userData.rotor=p.main;
   root.userData.tailRotor=p.tail;
   root.userData.apacheModel=APACHE_MODEL_ID;
   root.name='Apache_Araon_'+(++instances);
   return root;
  }
 });
}
