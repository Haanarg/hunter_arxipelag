import * as THREE from '../vendor/three-r186.module.mjs';

// Crea una cinta de xapa a partir de punts projectats sobre el MODEL.
// Sobre buits curts continua sobre el pla tangent de l'últim contacte,
// sense posar una planxa fixa a l'espai ni saltar distàncies grans.
const MAX_BRIDGE=.58;
const MAX_DEPTH_JUMP=.36;
export function surfacePaintSample(model,hit,ray,last){
 if(!model)return null;
 model.updateWorldMatrix(true,false);
 let world,normal,material,source='superfície';
 if(hit){
  world=hit.point.clone();
  normal=(hit.face?.normal?.clone()||new THREE.Vector3(0,1,0))
   .transformDirection(hit.object.matrixWorld).normalize();
  if(last&&world.distanceTo(last.world)>MAX_BRIDGE)return null;
  if(last&&Math.abs(world.clone().sub(last.world).dot(last.normal))>MAX_DEPTH_JUMP)return null;
  material=hit.object.material;
 }else if(last&&ray){
  const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(last.normal,last.world);
  world=new THREE.Vector3();
  if(!ray.intersectPlane(plane,world)||world.distanceTo(last.world)>MAX_BRIDGE)return null;
  normal=last.normal.clone();
  material=last.material;
  source='pont curt';
 }else return null;
 const point=model.worldToLocal(world.clone());
 const normalLocal=model.worldToLocal(world.clone().add(normal)).sub(point).normalize();
 return {point,normal:normalLocal,world,material,source};
}
function paintMaterial(source){
 const mat=Array.isArray(source)?source[0]:source;
 const color=mat?.color?.clone?.()||new THREE.Color(0x59665b);
 const copy=new THREE.MeshStandardMaterial({color,roughness:mat?.roughness??.9,
  metalness:mat?.metalness??0,side:THREE.DoubleSide,
  polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 return copy;
}
export function createSurfacePaintStroke(model,sourceMaterial){
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([],3));
 const mesh=new THREE.Mesh(geometry,paintMaterial(sourceMaterial));
 mesh.name='Vehicle_painted_armour_surface';
 mesh.userData.vehicleSurfacePaint=true;
 mesh.castShadow=true;mesh.receiveShadow=true;
 // La xapa és real i visible, però el raig del pinzell cerca el casc
 // existent; no repinta sobre el seu propi resultat en aquesta passada.
 mesh.userData.vehicleAnnotationOverlay=true;
 mesh.raycast=()=>{};
 model.add(mesh);
 return {mesh,vertices:[],triangles:0};
}
export function appendSurfacePaint(stroke,previous,next,radius,mirror=false){
 if(!stroke||!previous||!next)return 0;
 const direction=next.point.clone().sub(previous.point),len=direction.length();
 if(len<.006||len>MAX_BRIDGE)return 0;
 const tangent=direction.clone().normalize();
 const averageNormal=previous.normal.clone().add(next.normal).normalize();
 let side=new THREE.Vector3().crossVectors(averageNormal,tangent).normalize();
 if(side.lengthSq()<.1)return 0;
 const width=Math.max(.04,Math.min(1.2,Number(radius)))*.5;
 const p=previous.point,q=next.point,half=side.multiplyScalar(width);
 const offset=averageNormal.multiplyScalar(.008);
 const a=p.clone().add(half).add(offset),b=p.clone().sub(half).add(offset);
 const c=q.clone().add(half).add(offset),d=q.clone().sub(half).add(offset);
 const push=(u,v,w)=>stroke.vertices.push(...u.toArray(),...v.toArray(),...w.toArray());
 push(a,b,c);push(b,d,c);
 let made=2;
 if(mirror){
  const mirrored=v=>new THREE.Vector3(-v.x,v.y,v.z);
  // La reflexió canvia l'orientació: doble cara i normals coherents.
  push(mirrored(a),mirrored(c),mirrored(b));
  push(mirrored(b),mirrored(c),mirrored(d));
  made+=2;
 }
 const old=stroke.mesh.geometry;
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(stroke.vertices,3));
 geo.computeVertexNormals();
 geo.computeBoundingSphere();
 stroke.mesh.geometry=geo;old.dispose();
 stroke.triangles+=made;
 return made;
}
