import * as THREE from '../vendor/three-r186.module.mjs';

// Prototip v1: casc 100% tancat i simètric. Coordenades en metres,
// proa=-Z i popa=+Z. Manté les rodes i el canó actuals.
export const BTR82_HULL_V1_STATIONS=Object.freeze([
 [-5.04,1.31,1.67,1.48,1.66,1.49,.92],
 [-4.70,1.37,1.80,1.62,1.92,1.67,.92],
 [-3.75,1.36,1.90,1.71,2.09,1.77,.87],
 [3.80,1.36,1.90,1.71,2.09,1.77,.87],
 [4.80,1.35,1.84,1.66,2.02,1.72,.89],
 [5.61,1.27,1.71,1.52,1.82,1.59,.89]
]);
const KEEP=/^BTR82_(?:truck_A43_wheel_[0-9]+|new_black_(?:barrel|muzzle)|front_headlight_[0-9]+_(?:housing|lens))$/;
function profile(station){
 const [z,roofX,shoulderX,lowerX,roofY,shoulderY,lowerY]=station;
 const bottomX=Math.min(1.37,lowerX-.18);
 return [
  [-roofX,roofY,z],[roofX,roofY,z],
  [shoulderX,shoulderY,z],[lowerX,lowerY,z],
  [bottomX,.59,z],[-bottomX,.59,z],
  [-lowerX,lowerY,z],[-shoulderX,shoulderY,z]
 ];
}
export function createBtr82ClosedHullGeometry(){
 const rings=BTR82_HULL_V1_STATIONS.map(profile);
 const positions=rings.flat(2);
 const indices=[];
 for(let r=0;r<rings.length-1;r++)for(let k=0;k<8;k++){
  const a=r*8+k,b=r*8+(k+1)%8,c=(r+1)*8+(k+1)%8,d=(r+1)*8+k;
  indices.push(a,b,c,a,c,d);
 }
 // Tapes completes (frontal i posterior), també simètriques en X.
 for(let k=1;k<7;k++){
  indices.push(0,k+1,k);
  const end=(rings.length-1)*8;
  indices.push(end,end+k,end+k+1);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.candidateSimplified=true;
 return g;
}
function createBtr82V1TurretGeometry(){
 // Torreta de quatre anells, 12 costats, segellada a dalt i a baix.
 // Assentada sobre un sostre continu, encavalcada amb l'origen del canó.
 const rings=[
  {y:2.025,rx:.93,rz:1.03},
  {y:2.37,rx:.87,rz:.98},
  {y:2.85,rx:.64,rz:.78},
  {y:2.91,rx:.58,rz:.71}
 ];
 const sides=12,positions=[],indices=[],zCenter=-.67;
 for(const ring of rings)for(let k=0;k<sides;k++){
  const a=2*Math.PI*k/sides;
  positions.push(Math.cos(a)*ring.rx,ring.y,zCenter+Math.sin(a)*ring.rz);
 }
 for(let r=0;r<rings.length-1;r++)for(let k=0;k<sides;k++){
  const a=r*sides+k,b=r*sides+(k+1)%sides,c=(r+1)*sides+(k+1)%sides,d=(r+1)*sides+k;
  indices.push(a,b,c,a,c,d);
 }
 for(let k=1;k<sides-1;k++){
  indices.push(0,k,k+1);
  const top=(rings.length-1)*sides;
  indices.push(top,top+k+1,top+k);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.candidateSimplified=true;
 return g;
}
export function makeBtr82HullV1(baseline){
 const scene=baseline.clone(true),removed=[];
 // Els pneumàtics i les llantes són MESHES filles del grup de cada roda:
 // protegir tots els descendents, no només el node arrel de la roda.
 function keepNode(node){
  let o=node;
  while(o&&o!==scene){if(KEEP.test(o.name))return true;o=o.parent}
  return false;
 }
 scene.traverse(o=>{if(o.isMesh&&!keepNode(o))removed.push(o)});
 for(const mesh of removed)mesh.parent?.remove(mesh);
 const hull=new THREE.Mesh(createBtr82ClosedHullGeometry(),
  new THREE.MeshStandardMaterial({color:0x626d57,roughness:.92,metalness:.08,side:THREE.DoubleSide}));
 hull.name='BTR82_v1_symmetrical_closed_hull';
 hull.castShadow=true;hull.receiveShadow=true;scene.add(hull);
 const turret=new THREE.Mesh(createBtr82V1TurretGeometry(),
  new THREE.MeshStandardMaterial({color:0x59644f,roughness:.91,metalness:.09,side:THREE.DoubleSide}));
 turret.name='BTR82_v1_symmetrical_turret';
 turret.castShadow=true;turret.receiveShadow=true;scene.add(turret);
 const wheels=[],guns=[],headlights=[];
 scene.traverse(o=>{
  if(/^BTR82_truck_A43_wheel_[0-9]+$/.test(o.name))wheels.push(o);
  if(/^BTR82_new_black_(?:barrel|muzzle)$/.test(o.name))guns.push(o);
  if(/^BTR82_front_headlight_[0-9]+_lens$/.test(o.name))headlights.push(o);
 });
 if(wheels.length!==8||guns.length!==2||headlights.length!==4)
  throw Error('Casc v1: falten rodes, canó o fars originals');
 const expectedHullTriangles=(BTR82_HULL_V1_STATIONS.length-1)*16+12;
 if(hull.geometry.index.count/3!==expectedHullTriangles)
  throw Error('Casc v1: recompte inesperat de triangles');
 scene.userData.btr82HullV1={
  version:1,hullTriangles:expectedHullTriangles,turretTriangles:turret.geometry.index.count/3,
  symmetrical:true,closed:true,retainedWheels:wheels.length,retainedGunParts:guns.length,
  retainedHeadlights:headlights.length,removedOriginalMeshes:removed.length
 };
 return scene;
}
