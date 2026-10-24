// Approved in-game Humvee geometry and shared texture.
import {D31_PROCEDURAL_DATA} from './humvee-procedural-b-data.mjs?v=d31-a2-b3';
const geomCache=new WeakMap();
const noIndex=g=>g.index?g.index.count:g.getAttribute('position')?.count||0;
function rawFloats(base64){
 const raw=atob(base64),bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 if(bytes.length%4)throw Error('Incorrect float32 encoded geometry length');
 return new Float32Array(bytes.buffer);
}
export function describeHumvee3D(group, THREE){
 let meshes=0,triangles=0,drawCalls=0;
 group.traverse(object=>{
  if(!object.isMesh)return;
  meshes++;drawCalls++;
  triangles+=noIndex(object.geometry)/3;
 });
 // Pass the Three.js namespace as an argument, NEVER via userData:
 // Object3D.clone() JSON-serializes userData; storing the imported THREE
 // namespace there prevented the B scene from being cloned/rendered.
 if(!THREE?.Box3)throw Error('Cal passar THREE per mesurar el Humvee');
 const box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3());
 return {meshes,triangles,drawCalls,width:size.x,height:size.y,length:size.z};
}
export async function loadHumveeMethodB(THREE){
 let cached=geomCache.get(THREE);
 if(cached)return cached;
 cached=(async()=>{
  const src=D31_PROCEDURAL_DATA;
  // Some browsers/CSP profiles reject data:image URLs. Match the working
  // game loader: make a local Blob URL, load it, then revoke it.
  // A failed texture must not make the entire B model disappear.
  let texture=null;
  const bytes=Uint8Array.from(atob(src.png),char=>char.charCodeAt(0));
  const pngURL=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
  try{
   texture=await new THREE.TextureLoader().loadAsync(pngURL);
   texture.flipY=false;
   texture.colorSpace=THREE.SRGBColorSpace;
  }catch(error){
   console.warn('Humvee B: atles PNG no carregat, mostrant carrosseria oliva de reserva',error);
  }finally{
   URL.revokeObjectURL(pngURL);
  }
  const materials=src.materials.map(m=>{
   const p=m.pbr||{},f=p.baseColorFactor||[1,1,1,1];
   const color=new THREE.Color().setRGB(f[0],f[1],f[2],THREE.LinearSRGBColorSpace);
   // GLB atlas only exists for the hull. Keep a colored hull even if the
   // PNG is blocked or corrupted instead of white/transparent geometry.
   if(p.baseColorTexture&&!texture)color.setHex(0x697653);
   const opt={color,metalness:p.metallicFactor??0,
    roughness:p.roughnessFactor??1,side:m.doubleSided?THREE.DoubleSide:THREE.FrontSide};
   if(p.baseColorTexture&&texture)opt.map=texture;
   if(m.alphaMode==='BLEND'||f[3]<1){
    opt.transparent=true;opt.opacity=f[3];opt.depthWrite=false;
   }
   return new THREE.MeshStandardMaterial(opt);
  });
  const geometry=src.meshes.map(part=>{
   const g=new THREE.BufferGeometry();
   g.setAttribute('position',new THREE.Float32BufferAttribute(rawFloats(part.position),3));
   g.setAttribute('normal',new THREE.Float32BufferAttribute(rawFloats(part.normal),3));
   if(part.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(rawFloats(part.uv),2));
   g.computeBoundingSphere();g.computeBoundingBox();
   return g;
  });
  const nodeCache=[];
  function fromNode(i){
   if(nodeCache[i])return nodeCache[i];
   const d=src.nodes[i],obj=d.mesh!=null?
    new THREE.Mesh(geometry[d.mesh],materials[src.meshes[d.mesh].material]):
    new THREE.Group();
   obj.name=d.name;
   obj.userData={...(d.extras||{})};
   if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;}
   if(d.translation)obj.position.fromArray(d.translation);
   if(d.rotation)obj.quaternion.fromArray(d.rotation);
   if(d.scale)obj.scale.fromArray(d.scale);
   nodeCache[i]=obj;
   for(const child of d.children||[])obj.add(fromNode(child));
   return obj;
  }
  const template=new THREE.Group();
  template.name='Humvee B · dades GLB convertides a BufferGeometry';
  template.add(fromNode(0));
  const metric=describeHumvee3D(template,THREE);
  const expected=src.meta.renderTriangles??2894;
  // Baked GLB: 2,534 unique triangles plus repeated wheel meshes
  // rendered four times -> 2,894 real on-screen triangles.
  if(!Number.isFinite(metric.triangles)||Math.abs(metric.triangles-expected)>.01)
   throw Error('La geometria B no coincideix amb el D3.1 aprovat: '+
    metric.triangles+' / '+expected);
  return {
   name:'B · Geometria exacta convertida en JS',
   meta:metric,
   create(){
    const model=template.clone(true);
    model.userData.method='B';
    return model;
   }
  };
 })();
 geomCache.set(THREE,cached);
 try{return await cached}catch(error){geomCache.delete(THREE);throw error}
}

