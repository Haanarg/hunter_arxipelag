// Hunter: Arxipèlag — baked Humvee D3.1 runtime (approved at 175%).
// This reader loads ONLY the final GLB: no original source mesh, decimation,
// mirroring, texture-UV patching, or procedural truck/wheel rebuild at start.
// The original humvee_D.glb is retained for the preview/editor until QA.
export const HUNTER_HUMVEE_GAME_SCALE=1.75;
export const HUNTER_HUMVEE_BAKED_FILE='assets/humvee/humvee_D31_175.glb';
const EXPECTED_BODY_TRIANGLES=1686;
const EXPECTED_WHEEL_COUNT=4;
const VEHICLE_SCALE=1.3;
const ROLL_RADIUS=.50*HUNTER_HUMVEE_GAME_SCALE;

function expect(condition,message){
 if(!condition)throw new Error('D3.1 GLB: '+message);
}
function localGLB(THREE,buffer){
 const bytes=new Uint8Array(buffer),d=new DataView(buffer);
 expect(bytes.length>=20 && d.getUint32(0,true)===0x46546c67,'identificador incorrecte');
 expect(d.getUint32(4,true)===2,'versió GLB desconeguda');
 expect(d.getUint32(8,true)===bytes.length,'mida GLB incorrecta');
 const jsonLength=d.getUint32(12,true);
 expect(d.getUint32(16,true)===0x4e4f534a,'no conté JSON glTF');
 const json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+jsonLength)));
 const binChunk=20+jsonLength;
 expect(binChunk+8<=bytes.length && d.getUint32(binChunk+4,true)===0x004e4942,
  'fragment binari no disponible');
 const binaryOffset=binChunk+8;
 expect(json.asset?.version==='2.0','el fitxer no és glTF 2.0');
 const views=json.bufferViews||[];
 const accessors=json.accessors||[];
 function attribute(index){
  const a=accessors[index];expect(a && !a.sparse,'accessor no compatible');
  const bv=views[a.bufferView];
  expect(bv&&bv.byteStride==null,'atribut entrellaçat no compatible');
  const count=a.type==='VEC3'?3:a.type==='VEC2'?2:1;
  const type=a.componentType;
  expect(type===5126||type===5125||type===5123,
   'tipus de vèrtex no compatible');
  const len=count*a.count,step=type===5123?2:4,
        start=binaryOffset+(bv.byteOffset||0)+(a.byteOffset||0);
  expect(start>=binaryOffset && start+len*step<=bytes.length,
   'atribut fora de límits');
  const result=type===5126?new Float32Array(len):
    type===5125?new Uint32Array(len):new Uint16Array(len);
  for(let i=0;i<len;i++){
   const off=start+i*step;
   result[i]=type===5126?d.getFloat32(off,true):
    type===5125?d.getUint32(off,true):d.getUint16(off,true);
  }
  return {array:result,size:count};
 }
 const geometries=(json.meshes||[]).map(spec=>{
  const p=spec.primitives?.[0];
  expect(p && p.mode===4,'malla amb primitives desconegudes');
  const g=new THREE.BufferGeometry();
  for(const [semantic,key] of [
   ['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']
  ]){
   if(p.attributes[semantic]==null)continue;
   const a=attribute(p.attributes[semantic]);
   g.setAttribute(key,new THREE.BufferAttribute(a.array,a.size));
  }
  if(p.indices!=null){
   const idx=attribute(p.indices);
   g.setIndex(new THREE.BufferAttribute(idx.array,idx.size));
  }
  if(!g.getAttribute('normal'))g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return {geometry:g,materialIndex:p.material};
 });
 expect(geometries.length>=7,'manca geometria al GLB definitiu');

 const images=(json.images||[]).map(image=>{
  expect(image.mimeType==='image/png'&&image.bufferView!=null,
   'no hi ha textura PNG incrustada');
  const view=views[image.bufferView],start=binaryOffset+(view.byteOffset||0);
  expect(start>=binaryOffset && start+view.byteLength<=bytes.length,'textura corrupta');
  const blob=new Blob([bytes.slice(start,start+view.byteLength)],{type:'image/png'});
  return URL.createObjectURL(blob);
 });
 // Promise owned by the caller; object URLs are revoked after upload.
 async function createTextures(){
  const result=[];
  try{
   for(const image of images){
    const texture=await new THREE.TextureLoader().loadAsync(image);
    texture.flipY=false; // glTF UV convention: match the approved preview.
    texture.colorSpace=THREE.SRGBColorSpace;
    result.push(texture);
   }
  }finally{for(const url of images)URL.revokeObjectURL(url)}
  return result;
 }
 async function build(){
  const textures=await createTextures();
  const materials=(json.materials||[]).map(spec=>{
   const pbr=spec.pbrMetallicRoughness||{};
   const f=pbr.baseColorFactor||[1,1,1,1];
   // glTF color factors are already in LINEAR color space.
   const color=new THREE.Color().setRGB(f[0],f[1],f[2],THREE.LinearSRGBColorSpace);
   const options={
    color,metalness:pbr.metallicFactor??1,roughness:pbr.roughnessFactor??1,
    side:spec.doubleSided?THREE.DoubleSide:THREE.FrontSide
   };
   if(pbr.baseColorTexture){
    const textureSpec=json.textures[pbr.baseColorTexture.index];
    options.map=textures[textureSpec.source];
   }
   if(spec.alphaMode==='BLEND'||f[3]<1){
    options.transparent=true;options.opacity=f[3];options.depthWrite=false;
   }
   return new THREE.MeshStandardMaterial(options);
  });
  const cache=[];
  function buildNode(id){
   if(cache[id])return cache[id];
   const spec=json.nodes[id];
   expect(spec!=null,'node no existent: '+id);
   const object=spec.mesh!=null
     ?new THREE.Mesh(geometries[spec.mesh].geometry,
       materials[geometries[spec.mesh].materialIndex])
     :new THREE.Group();
   object.name=spec.name||'D31_'+id;
   if(spec.translation)object.position.fromArray(spec.translation);
   if(spec.rotation)object.quaternion.fromArray(spec.rotation);
   if(spec.scale)object.scale.fromArray(spec.scale);
   object.userData={...(spec.extras||{})};
   if(object.isMesh)object.castShadow=object.receiveShadow=true;
   cache[id]=object;
   for(const child of spec.children||[])object.add(buildNode(child));
   return object;
  }
  const template=new THREE.Group();
  template.name='D3.1 baked root · 175%';
  for(const nodeId of json.scenes[json.scene||0].nodes)template.add(buildNode(nodeId));
  template.updateMatrixWorld(true);
  const rootNode=json.nodes.find(x=>x.extras?.baked);
  expect(rootNode?.extras?.bodyTriangles===EXPECTED_BODY_TRIANGLES,
   'el fitxer no és el D3.1 aprovat');
  const wheelGroups=[];
  template.traverse(o=>{if(o.userData.wheel)wheelGroups.push(o)});
  expect(wheelGroups.length===EXPECTED_WHEEL_COUNT,'no hi ha quatre rodes');
  expect(wheelGroups.filter(w=>w.userData.front).length===2,'falten les rodes davanteres');
  return {template,geometries,materials,scenes:json.scenes,stats:rootNode.extras};
 }
 return {build};
}
function rigWheels(THREE,root){
 const wheelNodes=[];
 root.traverse(o=>{if(o.userData?.wheel)wheelNodes.push(o)});
 expect(wheelNodes.length===EXPECTED_WHEEL_COUNT,
  'la instància no conserva les quatre rodes');
 const rolling=[],steering=[];
 for(const wheel of wheelNodes){
  const parent=wheel.parent;
  const original=wheel.position.clone();
  // Roll axis X is shared with the in-game vehicle animator. Each steering
  // joint turns around vertical Y; spinning remains a child transform.
  const steeringJoint=new THREE.Group();
  steeringJoint.name='humvee-steering-'+wheel.name;
  steeringJoint.position.copy(original);
  parent.add(steeringJoint);
  const rollingJoint=new THREE.Group();
  rollingJoint.name='humvee-rolling-'+wheel.name;
  steeringJoint.add(rollingJoint);
  parent.remove(wheel);
  wheel.position.set(0,0,0);
  rollingJoint.add(wheel);
  rollingJoint.userData.radius=ROLL_RADIUS;
  rolling.push(rollingJoint);
  if(wheel.userData.front)steering.push(steeringJoint);
 }
 expect(rolling.length===4&&steering.length===2,'pivots de rodes incomplets');
 root.userData.wheels=rolling;
 root.userData.steeringPivots=steering;
}
export async function prepareHumveeD31Runtime(THREE,{vehicleScale=VEHICLE_SCALE}={}){
 expect(Number.isFinite(vehicleScale)&&vehicleScale>0,'vehicleScale incorrecte');
 const response=await fetch(HUNTER_HUMVEE_BAKED_FILE);
 expect(response.ok,'no es pot descarregar el model final: HTTP '+response.status);
 const bytes=await response.arrayBuffer();
 const {template,geometries,materials,stats}=await localGLB(THREE,bytes).build();
 const bbox=new THREE.Box3().setFromObject(template);
 const size=bbox.getSize(new THREE.Vector3());
 expect(size.x>3&&size.x<7&&size.z>6&&size.z<10,
  'dimensions fora del rang militar: '+size.x.toFixed(2)+' × '+size.z.toFixed(2));
 let count=0;
 return Object.freeze({
  name:'Humvee D3.1 · baked',
  scale:HUNTER_HUMVEE_GAME_SCALE,
  bakedFile:HUNTER_HUMVEE_BAKED_FILE,
  bodyTriangles:stats.bodyTriangles,
  dimensions:Object.freeze({width:size.x,height:size.y,length:size.z}),
  drawCalls:geometries.length+12,
  create(){
   const model=template.clone(true);
   // The game vehicle factory applies VS.cotxe (1.3) to its whole group.
   // Pre-compensate it; the baked GLB is exactly 175% in WORLD units.
   model.scale.setScalar(1/vehicleScale);
   rigWheels(THREE,model);
   model.userData.humveeModel='D3.1';
   model.userData.humveeGameScale=HUNTER_HUMVEE_GAME_SCALE;
   model.name='Humvee_D3.1_baked_instance_'+(++count);
   return model;
  }
 });
}
