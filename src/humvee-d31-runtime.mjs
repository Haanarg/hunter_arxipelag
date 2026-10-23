// Hunter: Arxipèlag — approved Humvee D3.1 runtime, 175%.
// Uses the SAME D3.1/UV/wheels/door-patch factory as the accepted preview.
// The tiny GLB only has one mesh/texture. Read it locally instead of pulling
// a GLTFLoader dependency from a CDN during actual Android/browser gameplay.
import {loadApprovedHumveeD31,createApprovedHumveeD31} from './humvee-d31-scale-preview.mjs';

export const HUNTER_HUMVEE_GAME_SCALE=1.75;
const SOURCE_GLB='assets/humvee/humvee_D.glb';
const FRONT_AXLE_X=-1.78;
const WHEEL_RADIUS=.50;

function check(cond,message){
 if(!cond)throw new Error('Humvee D3.1: '+message);
}

function makeLocalGLBLoader(THREE){
 return class HumveeLocalGLBLoader{
  async loadAsync(path=SOURCE_GLB){
   const response=await fetch(path);
   check(response.ok,'no es pot descarregar '+path+' (HTTP '+response.status+')');
   const bytes=await response.arrayBuffer();
   const data=new DataView(bytes);
   check(data.byteLength>=20 && data.getUint32(0,true)===0x46546c67,
    'arxiu GLB invàlid');
   check(data.getUint32(4,true)===2,'es necessita un GLB v2');
   const jsonLength=data.getUint32(12,true);
   check(data.getUint32(16,true)===0x4e4f534a && jsonLength>0,
    'falta el fragment JSON');
   const gltf=JSON.parse(new TextDecoder('utf-8').decode(
    new Uint8Array(bytes,20,jsonLength)));
   const binaryHeader=20+jsonLength;
   check(binaryHeader+8<=data.byteLength && data.getUint32(binaryHeader+4,true)===0x004e4942,
    'falta el fragment BIN');
   const binOffset=binaryHeader+8;
   const bufferViews=gltf.bufferViews;
   function accessor(id){
    const a=gltf.accessors[id];
    check(a && !a.sparse,'accessor no compatible');
    const view=bufferViews[a.bufferView];
    check(view && (view.byteStride===undefined),
     'atribut entrellaçat no compatible');
    const count=a.type==='SCALAR'?1:a.type==='VEC2'?2:a.type==='VEC3'?3:0;
    const arrayCtor=a.componentType===5126?Float32Array:
      a.componentType===5125?Uint32Array:
      a.componentType===5123?Uint16Array:null;
    check(count && arrayCtor,'atribut del GLB desconegut');
    const byteOffset=binOffset+(view.byteOffset||0)+(a.byteOffset||0);
    const length=a.count*count;
    check(byteOffset>=0&&byteOffset+length*arrayCtor.BYTES_PER_ELEMENT<=bytes.byteLength,
     'atribut del GLB fora de límits');
    // Copy into aligned arrays. Avoid binding geometry to a temporary ArrayBuffer.
    const array=new arrayCtor(length);
    const stride=arrayCtor.BYTES_PER_ELEMENT;
    for(let i=0;i<length;i++){
     const at=byteOffset+i*stride;
     array[i]=a.componentType===5126?data.getFloat32(at,true):
       a.componentType===5125?data.getUint32(at,true):data.getUint16(at,true);
    }
    return {array,components:count};
   }
   const primitive=gltf.meshes?.[0]?.primitives?.[0];
   check(primitive?.mode===4,'només s’admeten triangles');
   const geometry=new THREE.BufferGeometry();
   const position=accessor(primitive.attributes.POSITION);
   const uv=accessor(primitive.attributes.TEXCOORD_0);
   const indices=accessor(primitive.indices);
   check(position.components===3 && uv.components===2 && indices.components===1,
    'atributs del model incorrectes');
   geometry.setAttribute('position',new THREE.BufferAttribute(position.array,3));
   geometry.setAttribute('uv',new THREE.BufferAttribute(uv.array,2));
   geometry.setIndex(new THREE.BufferAttribute(indices.array,1));
   geometry.computeVertexNormals();
   geometry.computeBoundingBox();

   const image=gltf.images?.[0];
   check(image?.bufferView!=null&&image.mimeType==='image/png','falta la textura PNG');
   const imageView=bufferViews[image.bufferView];
   const png=new Uint8Array(bytes,binOffset+(imageView.byteOffset||0),imageView.byteLength);
   const url=URL.createObjectURL(new Blob([png],{type:'image/png'}));
   let texture;
   try{texture=await new THREE.TextureLoader().loadAsync(url)}
   finally{URL.revokeObjectURL(url)}
   texture.flipY=false; // glTF convention (the source atlas has origin at top left)
   texture.colorSpace=THREE.SRGBColorSpace;
   const pbr=gltf.materials?.[primitive.material]?.pbrMetallicRoughness||{};
   const material=new THREE.MeshStandardMaterial({
    map:texture,color:0xffffff,
    metalness:pbr.metallicFactor??.4,
    roughness:pbr.roughnessFactor??1
   });
   const scene=new THREE.Group();
   const mesh=new THREE.Mesh(geometry,material);
   mesh.name='Humvee_D_source';scene.add(mesh);
   return {scene};
  }
 };
}

function registerAnimatedWheels(THREE,root,gameScale){
 // The approved preview uses a front -X GLB and rotates it to in-game -Z.
 // Reparent all four wheels to root-aligned X spin pivots, then wrap the
 // front pair with steering Y pivots. This matches game-core.js:
 // w.rotation.x -= speed * dt / w.userData.radius.
 root.updateMatrixWorld(true);
 const wheelMeshes=[];
 root.traverse(child=>{
  if(child.name?.startsWith('humvee-truck-wheel-') && child.userData?.axleX!=null)
   wheelMeshes.push(child);
 });
 check(wheelMeshes.length===4,'no hi ha les quatre rodes A4.3');
 const rolling=[],steering=[];
 for(const wheel of wheelMeshes){
  const worldCenter=wheel.getWorldPosition(new THREE.Vector3());
  const localCenter=root.worldToLocal(worldCenter.clone());
  const steer=new THREE.Group();
  steer.name='humveeSteer_'+wheel.name;
  steer.position.copy(localCenter);
  root.add(steer);
  const spin=new THREE.Group();
  spin.name='humveeRoll_'+wheel.name;
  steer.add(spin);
  root.updateMatrixWorld(true);
  spin.attach(wheel); // keep the precise preview orientation and dimensions
  spin.userData.radius=WHEEL_RADIUS*gameScale;
  spin.userData.axleX=wheel.userData.axleX;
  rolling.push(spin);
  if(wheel.userData.axleX<=FRONT_AXLE_X+.15)steering.push(steer);
 }
 check(rolling.length===4&&steering.length===2,
  'falten els pivots de rodes o direcció');
 root.userData.wheels=rolling;
 root.userData.steeringPivots=steering;
 return root;
}

export async function prepareHumveeD31Runtime(THREE,{vehicleScale=1.3}={}){
 check(vehicleScale>0,'factor físic de vehicle invàlid');
 const GLBLoader=makeLocalGLBLoader(THREE);
 const prepared=await loadApprovedHumveeD31(THREE,GLBLoader);
 check(prepared.stats.doors===4&&prepared.stats.panels===8,
  'les quatre portes aplanades no estan preparades');
 // The game factory always applies VS.cotxe to its returned group.
 // Compensate this outer scale to get exactly the approved 175% in WORLD.
 const innerScale=HUNTER_HUMVEE_GAME_SCALE/vehicleScale;
 const template=createApprovedHumveeD31(prepared,innerScale);
 template.name='Humvee_D31_template_175pct';
 const box=new THREE.Box3().setFromObject(template);
 const size=box.getSize(new THREE.Vector3()).multiplyScalar(vehicleScale);
 check(size.x>3&&size.x<7 && size.z>6&&size.z<10,
  'mides fora del rang del cotxe militar ('+size.x.toFixed(2)+'×'+size.z.toFixed(2)+')');
 let instances=0;
 return Object.freeze({
  name:'Humvee D3.1',
  scale:HUNTER_HUMVEE_GAME_SCALE,
  bodyTriangles:prepared.triangles.length,
  dimensions:Object.freeze({width:size.x,height:size.y,length:size.z}),
  create(){
   const car=template.clone(true); // geometry/material shared, no new GLB decoding
   registerAnimatedWheels(THREE,car,HUNTER_HUMVEE_GAME_SCALE);
   car.userData.humveeModel='D3.1';
   car.userData.humveeGameScale=HUNTER_HUMVEE_GAME_SCALE;
   car.name='Humvee_D3.1_game_instance_'+(++instances);
   return car;
  }
 });
}
