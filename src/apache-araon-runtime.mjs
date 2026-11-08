// Apache AH-64 original d'Araon · CC BY 4.0.
// Prioritat al GLB DEFINITIU de 2.193 triangles, recuperat íntegrament de
// l'historial Git (4.123.680 bytes, pintat sàlvia/negre, rodes 75%,
// quatre textures). Només si no es pot carregar, recorrem a la malla
// compacta d'Araon 50% (2.173 triangles, textures reduïdes a color de vèrtex).
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export const APACHE_MODEL_URL=new URL('../assets/vehicle-models/apache-araon-salvia-black.glb',import.meta.url).href;
export const APACHE_PACKED_URL=new URL('../assets/vehicle-models/apache-araon-50mesh.zlib',import.meta.url).href;
export const APACHE_MODEL_SOURCE='https://sketchfab.com/3d-models/ah-64-apache-df0993ee21e74a759cd0519f6fc51cf8';
export const APACHE_TRIANGLES=2193;
export const APACHE_PACKED_TRIANGLES=2173;
export const APACHE_MODEL_ID='araon-50-wheels75-salvia-black';
const TARGET_LENGTH=7.15;
const WHEEL_CONTACT=.405;
const PARTS=['hull','cockpit','glass','main_rotor','tail_rotor'];
const VERTICES=[1518,178,53,164,144];
const FACES=[1481,153,45,264,230];
const RAW_BYTES=27481;
const COMPRESSED_BYTES=18862;

function triangles(root){
 let result=0;
 root.traverse(node=>{
  if(node.isMesh&&node.geometry?.getAttribute('position'))
   result+=Math.floor((node.geometry.getIndex()?.count??node.geometry.getAttribute('position').count)/3);
 });
 return result;
}

async function loadAraonCompact(THREE){
 if(typeof DecompressionStream!=='function')
  throw Error('Aquest navegador no admet descompressió deflate de l’Apache');
 const response=await fetch(APACHE_PACKED_URL);
 if(!response.ok)throw Error('Apache compactat absent (HTTP '+response.status+')');
 const compressed=await response.arrayBuffer();
 if(compressed.byteLength!==COMPRESSED_BYTES)
  throw Error('Mida del paquet Apache incorrecta: '+compressed.byteLength);
 const expanded=await new Response(
  new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate'))
 ).arrayBuffer();
 if(expanded.byteLength!==RAW_BYTES)
  throw Error('Geometria Apache incompleta: '+expanded.byteLength);
 const dv=new DataView(expanded);
 if(String.fromCharCode(...new Uint8Array(expanded,0,4))!=='APG2')
  throw Error('Format de geometria Apache desconegut');
 const root=new THREE.Group();root.name='Apache_Araon_50_compact';
 let offset=4;
 for(let part=0;part<PARTS.length;part++){
  const nVerts=dv.getUint32(offset,true),nFaces=dv.getUint32(offset+4,true);
  offset+=8;
  if(nVerts!==VERTICES[part]||nFaces!==FACES[part])
   throw Error('Malla Apache '+PARTS[part]+' incompleta');
  const coords=new Float32Array(nVerts*3);
  for(let i=0;i<coords.length;i++,offset+=2)coords[i]=dv.getInt16(offset,true)/1000;
  const indices=new Uint16Array(nFaces*3);
  for(let i=0;i<indices.length;i++,offset+=2)indices[i]=dv.getUint16(offset,true);
  const shade=new Uint8Array(expanded,offset,nVerts);offset+=nVerts;
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
  geo.setIndex(new THREE.BufferAttribute(indices,1));
  geo.computeVertexNormals();
  geo.computeBoundingBox();geo.computeBoundingSphere();
  const rotor=part===3||part===4,glass=part===2;
  let material;
  if(rotor){
   material=new THREE.MeshStandardMaterial({
    color:0x171c1b,roughness:.92,metalness:.06,side:THREE.DoubleSide
   });
  }else if(glass){
   material=new THREE.MeshStandardMaterial({
    color:0x6f949d,transparent:true,opacity:.37,depthWrite:false,
    roughness:.29,metalness:.04,side:THREE.DoubleSide
   });
  }else{
   const base=new THREE.Color(part===1?0x66725f:0x9ca98b);
   const colors=new Float32Array(nVerts*3);
   const detail=new THREE.Color(0x242c27);
   for(let i=0;i<nVerts;i++){
    // Les zones més fosques de l'atles original continuen dibuixant
    // respiradors, joints, marcs de les finestres i pneumàtics.
    const v=shade[i];
    const col=(v<5?detail:base).clone();
    if(v>=5)col.multiplyScalar(.60+.98*Math.pow(v/255,.72));
    colors[i*3]=col.r;colors[i*3+1]=col.g;colors[i*3+2]=col.b;
   }
   geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
   material=new THREE.MeshStandardMaterial({
    color:0xffffff,vertexColors:true,roughness:.90,metalness:.035,
    side:THREE.DoubleSide
   });
  }
  const mesh=new THREE.Mesh(geo,material);
  mesh.name=PARTS[part];
  root.add(mesh);
 }
 if(offset!==RAW_BYTES)throw Error('Dades sobrants al model Apache');
 if(triangles(root)!==APACHE_PACKED_TRIANGLES)throw Error('Triangles Apache compactat inesperats');
 return root;
}

function placePivot(THREE,scene,name,pivotName){
 let node=scene.getObjectByName(name)||scene.getObjectByName(name+'_lambert2_0');
 if(!node){
  scene.traverse(candidate=>{
   if(!node&&candidate.isMesh&&candidate.name.toLowerCase().includes(name.toLowerCase()))node=candidate;
  });
 }
 if(!node?.parent||!node.getObjectByProperty('isMesh',true))
  throw Error('Falta la malla '+name);
 scene.updateMatrixWorld(true);
 const parent=node.parent;
 const center=new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
 const pivot=new THREE.Group();pivot.name=pivotName;
 pivot.position.copy(parent.worldToLocal(center.clone()));
 parent.add(pivot);
 pivot.attach(node);
 return pivot;
}
function pivots(root){
 const main=root.getObjectByName('Apache_Main_Rotor_Pivot');
 const tail=root.getObjectByName('Apache_Tail_Rotor_Pivot');
 if(!main?.children.length||!tail?.children.length)
  throw Error('L’Apache no conserva els dos rotors independents');
 return {main,tail};
}

export async function prepareApacheAraonRuntime(THREE){
 let template,usingCompact=false;
 try{
  const gltf=await new GLTFLoader().loadAsync(APACHE_MODEL_URL);
  if(!gltf?.scene)throw Error('El GLB Apache no conté cap escena');
  template=gltf.scene;
  if(triangles(template)!==APACHE_TRIANGLES)
   throw Error('El GLB Apache no té els 2.193 triangles aprovats');
 }catch(error){
  console.warn('Apache definitiu GLB no disponible; càrrega de la reserva compacta real',error);
  template=await loadAraonCompact(THREE);
  usingCompact=true;
 }
 const count=triangles(template);
 if(count!==(usingCompact?APACHE_PACKED_TRIANGLES:APACHE_TRIANGLES))
  throw Error('Triangles Apache inesperats: '+count);
 placePivot(THREE,template,'main_rotor','Apache_Main_Rotor_Pivot');
 placePivot(THREE,template,'tail_rotor','Apache_Tail_Rotor_Pivot');
 const shell=template.clone(true);
 shell.rotation.y=Math.PI; // Fitxer apunta cap a +Z; Hunter cap a -Z.
 const rootBounds=new THREE.Box3().setFromObject(shell);
 const originalLength=rootBounds.getSize(new THREE.Vector3()).z;
 if(!(originalLength>8&&originalLength<20))
  throw Error('Dimensions originals Apache invàlides: '+originalLength);
 shell.scale.setScalar(TARGET_LENGTH/originalLength);
 const aircraft=new THREE.Group();
 aircraft.add(shell);
 aircraft.updateMatrixWorld(true);
 const bounds0=new THREE.Box3().setFromObject(aircraft);
 shell.position.y+=WHEEL_CONTACT-bounds0.min.y;
 aircraft.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(aircraft);
 const dims=bounds.getSize(new THREE.Vector3());
 if(!(dims.z>6&&dims.z<9&&dims.x>4&&dims.x<5.5))
  throw Error('Dimensions Apache incompatibles amb la flota: '+JSON.stringify(dims.toArray()));
 const axis=pivots(shell).main.getWorldPosition(new THREE.Vector3());
 const rotorContactHeight=aircraft.worldToLocal(axis).y;
 if(!(rotorContactHeight>1&&rotorContactHeight<4))
  throw Error('Altura del rotor Apache incorrecta: '+rotorContactHeight);
 let instances=0;
 return Object.freeze({
  name:'AH-64 Apache · Araon · sàlvia mat / detalls negres',
  visualVariant:usingCompact?'50% compacte':'50% + rodes 75% (GLB definitiu)',
  source:APACHE_MODEL_SOURCE,license:'CC BY 4.0',triangles:count,
  dimensions:Object.freeze({width:dims.x,height:dims.y,length:dims.z}),
  skidContactHeight:WHEEL_CONTACT,rotorContactHeight,
  create(){
   const root=new THREE.Group(),visual=shell.clone(true);
   root.add(visual);
   const p=pivots(visual);
   root.userData.rotor=p.main;
   root.userData.tailRotor=p.tail;
   root.userData.apacheModel=usingCompact?'araon-50-compact-salvia-black':APACHE_MODEL_ID;
   root.name='Apache_Araon_'+(++instances);
   return root;
  }
 });
}
