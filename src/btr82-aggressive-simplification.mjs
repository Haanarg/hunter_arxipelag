// BTR-82 LOD conservador: mateixa Three.js r186 / meshoptimizer que el motor.
// Original Sketchfab: 199 malles, 21.483 triangles. Concentram primer
// geometries del mateix material, respectant 8 rodes i torreta independents.
import * as THREE from '../vendor/three-r186.module.mjs';
import {SimplifyModifier} from 'three/addons/modifiers/SimplifyModifier.js';
import {MeshoptSimplifier} from 'three/addons/libs/meshopt_simplifier.module.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

export const BTR82_RATIOS=Object.freeze([1,.75,.50,.25]);
const WHEEL_NODES=new Set(['Object_428','Object_431','Object_434','Object_436',
  'Object_439','Object_441','Object_444','Object_446']);

export function countBtrTriangles(root){
 let triangles=0;
 root.traverse(o=>{if(o.isMesh&&o.geometry)
  triangles+=(o.geometry.getIndex()?.count??o.geometry.getAttribute('position')?.count??0)/3});
 return Math.round(triangles);
}
export function countBtrMeshes(root){
 let count=0;root.traverse(o=>{if(o.isMesh)count++});return count;
}
function region(mesh){
 if(WHEEL_NODES.has(mesh.name))return 'wheel:'+mesh.name;
 let node=mesh.parent;
 while(node){
  if(node.name==='bone27_180')return 'turret';
  node=node.parent;
 }
 return 'hull';
}
function positionOnlyIndices(geometry){
 // meshoptimizer requires tightly packed world-space XYZ; UV + normals
 // stay attached when we remap each output vertex after simplification.
 const attr=geometry.getAttribute('position'),positions=new Float32Array(attr.count*3);
 for(let i=0;i<attr.count;i++){
  positions[i*3]=attr.getX(i);
  positions[i*3+1]=attr.getY(i);
  positions[i*3+2]=attr.getZ(i);
 }
 return positions;
}
function compact(geometry,indexArray){
 const indices=new Uint32Array(indexArray);
 const [remap,unique]=MeshoptSimplifier.compactMesh(indices); // reindexes in place
 const output=new THREE.BufferGeometry();
 for(const [name,attribute] of Object.entries(geometry.attributes)){
  const dst=new THREE.BufferAttribute(
   new attribute.array.constructor(unique*attribute.itemSize),attribute.itemSize,
   attribute.normalized);
  for(let i=0;i<remap.length;i++){
   const index=remap[i];if(index===0xffffffff)continue;
   for(let k=0;k<attribute.itemSize;k++)
    dst.setComponent(index,k,attribute.getComponent(i,k));
  }
  output.setAttribute(name,dst);
 }
 output.setIndex(new THREE.BufferAttribute(indices,1));
 output.userData.candidateSimplified=true;
 return output;
}
async function simplifyBucket(geometry,ratio,minTriangles,modifier){
 const base=(geometry.getIndex()?.count ?? geometry.getAttribute('position').count)/3;
 const target=Math.max(Math.min(base,minTriangles),Math.ceil(base*ratio));
 if(target>=base)return geometry;
 // IMPORTANT: SimplifyModifier welds non-indexed meshes before simplifying.
 // Compute the amount to remove from that SAME welded vertex count. Using
 // raw triangle-corner vertices here used to request >100% reduction.
 const indexed=geometry.getIndex()?geometry:mergeVertices(geometry);
 // The vendored SimplifyModifier preserves normal and UV metric first.
 let output;
 try{
  const attr=indexed.getAttribute('position');
  const n=Math.max(0,Math.round(attr.count*(1-target/base)));
  output=await modifier.modify(indexed,n);
 }catch(e){console.warn('BTR-82: simplificació regular fallida',{base,target},e)}
 let actual=output?(output.getIndex()?.count??output.getAttribute('position')?.count??0)/3:base;
 if(actual>=Math.floor(target*.65)&&actual<=Math.ceil(target*1.15)&&actual>0)
  return output;
 // Keep a recognisable shape: a decimator must not collapse to a few
 // triangles and call that a conservative 75% or 50% model.
 if(output&&actual<target*.65){output.dispose();output=null;actual=base}
 // Malles Blockbench desconnectades poden bloquejar la simplificació normal.
 // Meshoptimizer sloppy és la reserva quan el resultat no és suficient.
 await MeshoptSimplifier.ready;
 const indices=indexed.getIndex();
 if(!indices){return output||geometry}
 try{
  const result=MeshoptSimplifier.simplifySloppy(indices.array,
   positionOnlyIndices(indexed),3,null,Math.max(3,Math.floor(target)*3),1);
  const optimized=compact(indexed,result[0]);
  const got=optimized.getIndex().count/3;
  if(got>=Math.floor(target*.65)&&got>0&&(got<actual||!output)){
   if(output)output.dispose();
   return optimized;
  }
  optimized.dispose();
 }catch(e){console.warn('BTR-82: reducció agressiva fallida',{base,target},e)}
 return output||geometry;
}
function compatibleGeometry(mesh){
 let geo=mesh.geometry.clone();
 // GLB source uses one material per primitive. Keep a consistent attribute
 // signature so mergeGeometries never concatenates mismatched vertices.
 for(const name of Object.keys(geo.attributes)){
  if(!['position','normal','uv'].includes(name))geo.deleteAttribute(name);
 }
 if(!geo.getAttribute('normal'))geo.computeVertexNormals();
 if(!geo.getAttribute('uv')){
  const count=geo.getAttribute('position').count;
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(count*2),2));
 }
 if(geo.getIndex()){const unindexed=geo.toNonIndexed();geo.dispose();geo=unindexed}
 geo.applyMatrix4(mesh.matrixWorld);
 return geo;
}
function makeBuckets(root){
 root.updateMatrixWorld(true);
 const wheelPivot=new Map(),turretNode=root.getObjectByName('bone27_180');
 const turretPos=new THREE.Vector3();
 if(turretNode)turretNode.getWorldPosition(turretPos);
 const groups=new Map();
 root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry||mesh.isSkinnedMesh)return;
  const material=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
  if(!material)return;
  const area=region(mesh),key=area+'::'+material.uuid;
  if(!groups.has(key))groups.set(key,{area,material,parts:[]});
  groups.get(key).parts.push(compatibleGeometry(mesh));
  if(area.startsWith('wheel:')&&!wheelPivot.has(area)){
   const pivot=new THREE.Vector3();
   mesh.parent?.getWorldPosition(pivot);
   wheelPivot.set(area,pivot);
  }
 });
 return {groups,wheelPivot,turretPos};
}
export async function buildBtr82Lod(original,ratio,{isCurrent=()=>true}={}){
 if(!(ratio>0&&ratio<1))throw Error('La reducció ha de ser inferior al 100%');
 const {groups,wheelPivot,turretPos}=makeBuckets(original),result=new THREE.Group();
 result.name='BTR_82_LOD_'+Math.round(ratio*100);
 const turret=new THREE.Group();turret.name='BTR_82_TURRET';
 turret.position.copy(turretPos);result.add(turret);
 const wheelGroups=new Map(),modifier=new SimplifyModifier();
 let sourceMeshes=0,kept=0;
 const resources=[];
 try{
  for(const {area,material,parts} of groups.values()){
   if(!isCurrent())return null;
   sourceMeshes+=parts.length;
   const merged=parts.length===1?parts[0]:mergeGeometries(parts,false);
   if(!merged)throw Error('No s’han pogut combinar les peces de '+area);
   for(const part of parts)if(part!==merged)part.dispose();
   resources.push(merged);
   const min=area.startsWith('wheel:')?18:area==='turret'?6:3;
   const reduced=await simplifyBucket(merged,ratio,min,modifier);
   if(!isCurrent())return null;
   if(reduced!==merged)resources.push(reduced);
   const model=new THREE.Mesh(reduced,material);
   model.castShadow=true;model.receiveShadow=true;
   model.name=area+'_'+material.name;
   let parent=result,pivot=null;
   if(area==='turret'){parent=turret;pivot=turretPos}
   else if(area.startsWith('wheel:')){
    parent=wheelGroups.get(area);
    if(!parent){
     parent=new THREE.Group();parent.name=area;
     parent.position.copy(wheelPivot.get(area)||new THREE.Vector3());
     wheelGroups.set(area,parent);result.add(parent);
    }
    pivot=parent.position;
   }
   if(pivot){reduced.translate(-pivot.x,-pivot.y,-pivot.z)}
   // The reduced geometry is detached from its 199 original meshes.
   parent.add(model);kept++;
  }
  result.userData.btr82Lod={ratio,sourceMeshes,mergedMeshes:kept,
   triangles:countBtrTriangles(result),targetTriangles:Math.round(countBtrTriangles(original)*ratio)};
  return result;
 }catch(e){
  for(const resource of resources)resource.dispose();
  throw e;
 }
}

// Original Sketchfab GLB uses required KHR_materials_pbrSpecularGlossiness,
// which Three.js r186 does not decode. Rewrite only the glTF JSON chunk
// into equivalent metallic-roughness PBR; all source geometry, textures and
// animation BIN data remain intact. No unsupported plugin/URL required.
export async function normalizeBtr82Glb(blob){
 const ab=await blob.arrayBuffer(),src=new Uint8Array(ab),view=new DataView(ab);
 if(src.length<20||view.getUint32(0,true)!==0x46546c67||
  view.getUint32(4,true)!==2||view.getUint32(8,true)!==src.length)
  throw Error('El fitxer no és un GLB v2 íntegre');
 const jsonSize=view.getUint32(12,true),jsonType=view.getUint32(16,true);
 if(jsonType!==0x4e4f534a||20+jsonSize>src.length)throw Error('JSON glTF incorrecte');
 const json=JSON.parse(new TextDecoder().decode(src.subarray(20,20+jsonSize)).trim());
 const ext='KHR_materials_pbrSpecularGlossiness';
 if(!json.extensionsUsed?.includes(ext)&&!json.extensionsRequired?.includes(ext))return blob;
 for(const mat of json.materials||[]){
  const sg=mat.extensions?.[ext];if(!sg)continue;
  mat.pbrMetallicRoughness={baseColorFactor:sg.diffuseFactor||[1,1,1,1],
   ...(sg.diffuseTexture?{baseColorTexture:sg.diffuseTexture}:{}),
   roughnessFactor:Math.min(1,Math.max(.2,1-(sg.glossinessFactor??0))),
   metallicFactor:0};
  delete mat.extensions[ext];
  if(!Object.keys(mat.extensions).length)delete mat.extensions;
 }
 for(const key of ['extensionsUsed','extensionsRequired']){
  if(json[key])json[key]=json[key].filter(x=>x!==ext);
 }
 const str=new TextEncoder().encode(JSON.stringify(json)),aligned=(str.length+3)&~3;
 const rest=src.subarray(20+jsonSize),out=new Uint8Array(20+aligned+rest.length);
 out.set(src.subarray(0,12));const header=new DataView(out.buffer);
 header.setUint32(8,out.length,true);header.setUint32(12,aligned,true);
 header.setUint32(16,0x4e4f534a,true);out.fill(32,20,20+aligned);out.set(str,20);
 out.set(rest,20+aligned);
 return new Blob([out],{type:'model/gltf-binary'});
}
