// Banc de proves Huey/Apache: edició LOCAL en memòria, sense substituir el joc.
// SimplifyModifier i MeshoptSimplifier de Three.js r186 (llicència MIT).
import {clone as cloneSkeleton} from '../vendor/three-addons/utils/SkeletonUtils.js';
import {SimplifyModifier} from '../vendor/three-addons/modifiers/SimplifyModifier.js';
import {GLTFExporter} from '../vendor/three-addons/exporters/GLTFExporter.js';

export const HELICOPTER_LEVELS=Object.freeze([1,.75,.5,.25]);
const protectedNames=/rotor|blade|propell|tailrotor|weapon|missile|rocket|turret|cannon|gun|glass|window|canopy|windscreen|skid|landing.gear/i;
export function countModelTriangles(root){
 let triangles=0;
 root.traverse(node=>{
  if(!node.isMesh || !node.geometry?.getAttribute('position'))return;
  const geo=node.geometry;
  triangles+=Math.floor((geo.getIndex()?.count ?? geo.getAttribute('position').count)/3);
 });
 return triangles;
}
function animatedNames(animations){
 const names=new Set();
 for(const clip of animations||[])for(const track of clip.tracks||[]){
  const name=String(track.name||'').split('.')[0];
  if(name)names.add(name);
 }
 return names;
}
function protectGeometry(mesh,animated){
 const geo=mesh.geometry;
 if(!geo?.getAttribute('position') || mesh.isSkinnedMesh || mesh.morphTargetInfluences)return true;
 if(Object.keys(geo.morphAttributes||{}).some(name=>(geo.morphAttributes[name]||[]).length))return true;
 if((geo.groups||[]).length>1 || Array.isArray(mesh.material))return true;
 if(geo.getAttribute('skinIndex') || geo.getAttribute('skinWeight'))return true;
 if(protectedNames.test(mesh.name||''))return true;
 // Les peces animades i els seus descendents mantenen els pivots i la topologia.
 for(let node=mesh;node;node=node.parent)if(animated.has(node.name))return true;
 const triangles=Math.floor((geo.getIndex()?.count??geo.getAttribute('position').count)/3);
 return triangles<90;
}
export async function simplifyHelicopter(original,animations,ratio){
 if(!(ratio>0&&ratio<=1))throw Error('Percentatge fora de rang');
 const root=cloneSkeleton(original);
 const animated=animatedNames(animations);
 const modifier=new SimplifyModifier();
 const meshes=[];
 root.traverse(mesh=>{if(mesh.isMesh)meshes.push(mesh)});
 let simplified=0,protectedMeshes=0,failed=0;
 for(const mesh of meshes){
  if(ratio===1 || protectGeometry(mesh,animated)){protectedMeshes++;continue}
  const old=mesh.geometry;
  const vertices=old.getAttribute('position').count;
  try{
   const reduced=await modifier.modify(old,Math.floor(vertices*(1-ratio)));
   const before=(old.getIndex()?.count??vertices);
   const after=(reduced.getIndex()?.count??reduced.getAttribute('position').count);
   if(after>=before){reduced.dispose();protectedMeshes++;continue}
   // No alliberam geos de l'original ni d'altres variants, que les comparteixen.
   mesh.geometry=reduced;
   reduced.computeBoundingBox();reduced.computeBoundingSphere();
   simplified++;
  }catch(error){failed++;console.warn('Malla preservada per incompatibilitat',mesh.name,error)}
 }
 return {root,animations,stats:{triangles:countModelTriangles(root),simplified,protectedMeshes,failed}};
}
export async function encodeHelicopterGLB(root,animations=[]){
 const exporter=new GLTFExporter();
 const glb=await exporter.parseAsync(root,{
  binary:true,animations,onlyVisible:false,maxTextureSize:2048,
  includeCustomExtensions:false
 });
 if(!(glb instanceof ArrayBuffer)||glb.byteLength<20)throw Error('No s’ha pogut generar un GLB binari');
 return glb;
}
