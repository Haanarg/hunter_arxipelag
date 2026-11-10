import * as THREE from '../vendor/three-r186.module.mjs';

// BTR-82: segona iteració només de silueta. Frontal en falca, arestes vives,
// cantó inferior bisellat en V i posterior inclinat. El volum exterior conserva
// l'escala de la v1; el cos baixa ~0,20 m per apropar-se a les rodes.
// X es reflecteix a cada anell: dues meitats matemàticament simètriques.
// Proa=-Z, popa=+Z; les seccions van ordenades de davant a darrere.
//
// Cadascuna defineix cinc punts de la MITJA secció [x, y, desplaçament z]:
// sostre, aresta d'espatlla, franja lateral, bisell inferior, baix en V.
// Els desplaçaments Z a les tapes creen un morro en falca, no plans verticals.
export const BTR82_HULL_V2_STATIONS=Object.freeze([
 {z:-5.03,roof:[1.14,1.52,.22],shoulder:[1.58,1.33,-.08],belt:[1.48,1.04,-.14],lower:[1.26,.74,-.12],keel:[.84,.51,.02]},
 {z:-4.54,roof:[1.25,1.76,0],shoulder:[1.78,1.49,-.04],belt:[1.77,1.12,-.08],lower:[1.53,.84,-.09],keel:[1.05,.39,-.04]},
 {z:-3.76,roof:[1.28,1.87,0],shoulder:[1.90,1.53,0],belt:[1.88,1.12,0],lower:[1.60,.85,0],keel:[1.12,.39,0]},
 {z: 3.77,roof:[1.28,1.87,0],shoulder:[1.90,1.53,0],belt:[1.88,1.12,0],lower:[1.60,.85,0],keel:[1.12,.39,0]},
 {z: 4.65,roof:[1.27,1.83,0],shoulder:[1.84,1.49,.05],belt:[1.81,1.10,.10],lower:[1.54,.82,.10],keel:[1.06,.39,0]},
 {z: 5.41,roof:[1.20,1.62,-.30],shoulder:[1.70,1.35,.02],belt:[1.68,1.02,.13],lower:[1.43,.76,.12],keel:[.98,.43,-.02]}
]);

function outline(station){
 const {z,roof,shoulder,belt,lower,keel}=station;
 const right=[roof,shoulder,belt,lower,keel].map(([x,y,dz])=>[x,y,z+dz]);
 const [r,s,b,l,k]=right;
 return [
  [-r[0],r[1],r[2]],r,s,b,l,k,
  [-k[0],k[1],k[2]],[-l[0],l[1],l[2]],
  [-b[0],b[1],b[2]],[-s[0],s[1],s[2]]
 ];
}

function buildClosedGeometry(rings){
 const n=rings[0].length,positions=rings.flat(2),indices=[];
 if(!rings.every(r=>r.length===n))throw Error('Estacions amb diferent nombre de vèrtexs');
 for(let r=0;r<rings.length-1;r++)for(let k=0;k<n;k++){
  const a=r*n+k,b=r*n+(k+1)%n,c=(r+1)*n+(k+1)%n,d=(r+1)*n+k;
  // En sentit exterior: la coberta té la normal cap amunt.
  indices.push(a,c,b,a,d,c);
 }
 // Tapes normals cap a -Z (proa) i +Z (popa).
 for(let k=1;k<n-1;k++){
  indices.push(0,k,k+1);
  const end=(rings.length-1)*n;
  indices.push(end,end+k+1,end+k);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setIndex(indices);
 g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.candidateSimplified=true;
 return g;
}

export function createBtr82HullV2Geometry(){
 return buildClosedGeometry(BTR82_HULL_V2_STATIONS.map(outline));
}

export function createBtr82TurretV2Geometry(){
 // Torreta octagonal de plaques planes, no circular: falca frontal i
 // laterals inclinats. A sota travessa el sostre del casc: sense escletxa.
 // El canó existent continua a y=2,69, x=-0,06, mirant cap a -Z.
 const profile=[
  [-.53,-1.57],[.53,-1.57],[.94,-1.13],[.94,-.48],
  [.67,.20],[-.67,.20],[-.94,-.48],[-.94,-1.13]
 ];
 const zCenter=-.68;
 const rings=[
  {y:1.76,x:1.04,z:1.05},
  {y:2.22,x:1.00,z:1.00},
  {y:2.82,x:.72,z:.80},
  {y:2.94,x:.67,z:.76}
 ].map(r=>profile.map(([x,z])=>[x*r.x,r.y,zCenter+(z-zCenter)*r.z]));
 // Aquest perfil s'ordena en sentit oposat al del casc; invertim
 // els triangles si cal, però la geometria és tancada per construcció.
 return buildClosedGeometry(rings);
}

const KEEP=/^BTR82_(?:truck_A43_wheel_[0-9]+|new_black_(?:barrel|muzzle))$/;
export function makeBtr82HullV2(baseline){
 const scene=baseline.clone(true),discard=[];
 function preserved(object){
  for(let p=object;p&&p!==scene;p=p.parent)if(KEEP.test(p.name))return true;
  return false;
 }
 scene.traverse(object=>{if(object.isMesh&&!preserved(object))discard.push(object)});
 for(const object of discard)object.parent?.remove(object);
 const hull=new THREE.Mesh(createBtr82HullV2Geometry(),
  new THREE.MeshStandardMaterial({color:0x626e57,roughness:.93,metalness:.04,
   side:THREE.DoubleSide,flatShading:true}));
 hull.name='BTR82_v2_aggressive_symmetric_hull';
 hull.castShadow=true;hull.receiveShadow=true;scene.add(hull);
 const turret=new THREE.Mesh(createBtr82TurretV2Geometry(),
  new THREE.MeshStandardMaterial({color:0x56624d,roughness:.92,metalness:.04,
   side:THREE.DoubleSide,flatShading:true}));
 turret.name='BTR82_v2_angular_turret';
 turret.castShadow=true;turret.receiveShadow=true;scene.add(turret);
 const wheels=[],gun=[];
 scene.traverse(o=>{
  if(/^BTR82_truck_A43_wheel_[0-9]+$/.test(o.name))wheels.push(o);
  if(/^BTR82_new_black_(?:barrel|muzzle)$/.test(o.name))gun.push(o);
 });
 if(wheels.length!==8||gun.length!==2)
  throw Error('Casc v2: cal conservar les vuit rodes completes i el canó existent');
 scene.userData.btr82HullV2={
  version:2,closed:true,symmetrical:true,
  hullTriangles:hull.geometry.index.count/3,
  turretTriangles:turret.geometry.index.count/3,
  hullBottom:.39,roofHeight:1.87,
  retainedWheels:wheels.length,retainedGunParts:gun.length,
  discardedReferenceMeshes:discard.length
 };
 return scene;
}
