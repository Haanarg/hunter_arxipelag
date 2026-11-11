import * as THREE from '../vendor/three-r186.module.mjs';

// BTR-82 v3c: el gir Y +90° i el reajustament ample/llarg són DEFINITIUS.
// Les estacions descriuen el casc FINAL (proa=-Z, popa=+Z) i són
// simètriques NOMÉS en X, paral·lelament al canó. Proa i popa diferents.
// La geometria és una única closca manifold, sense plaques superposades.
//
// Perfil d'una MITJA secció [x,y,offsetZ], del sostre al ventre:
// roof, brow, shoulder, belt, lip, shelf, wheelWell, stepFoot, belly, keel.
// "shelf" + "wheelWell" formen un graó horitzontal SOBRE els pneumàtics,
// mentre que "stepFoot" baixa la panxa entre les dues fileres de rodes.
// Les rodes tenen centre X aproximadament ±1.69, radi ~0.81 i no es toquen.
export const BTR82_HULL_V3_STATIONS=Object.freeze([
 {z:-5.425,roof:[1.04,1.12,.72],brow:[1.36,1.14,.51],shoulder:[1.65,1.06,.21],
  belt:[1.75,.91,0],lip:[1.75,.85,0],shelf:[1.49,.83,.04],
  wheelWell:[1.20,.79,.13],stepFoot:[1.08,-.02,.36],
  belly:[.89,-.19,.48],keel:[.28,-.22,.56]},
 {z:-4.36,roof:[1.16,1.44,.20],brow:[1.50,1.43,.11],shoulder:[1.83,1.29,.03],
  belt:[1.88,1.06,0],lip:[1.88,.94,0],shelf:[1.56,.92,0],
  wheelWell:[1.27,.92,0],stepFoot:[1.15,-.05,0],
  belly:[.96,-.24,0],keel:[.30,-.28,0]},
 {z:-3.23,roof:[1.24,1.65,0],brow:[1.58,1.55,0],shoulder:[1.91,1.35,0],
  belt:[1.89,1.08,0],lip:[1.89,.94,0],shelf:[1.56,.92,0],
  wheelWell:[1.27,.92,0],stepFoot:[1.15,-.05,0],
  belly:[.96,-.24,0],keel:[.30,-.28,0]},
 {z:-2.15,roof:[1.24,1.65,0],brow:[1.58,1.55,0],shoulder:[1.91,1.35,0],
  belt:[1.89,1.08,0],lip:[1.89,.94,0],shelf:[1.56,.92,0],
  wheelWell:[1.27,.92,0],stepFoot:[1.15,-.05,0],
  belly:[.96,-.24,0],keel:[.30,-.28,0]},
 {z:-.70,roof:[1.24,1.65,0],brow:[1.58,1.55,0],shoulder:[1.91,1.35,0],
  belt:[1.89,1.08,0],lip:[1.89,.94,0],shelf:[1.56,.92,0],
  wheelWell:[1.27,.92,0],stepFoot:[1.15,-.05,0],
  belly:[.96,-.24,0],keel:[.30,-.28,0]},
 {z: .85,roof:[1.24,1.65,0],brow:[1.58,1.55,0],shoulder:[1.91,1.35,0],
  belt:[1.89,1.08,0],lip:[1.89,.94,0],shelf:[1.56,.92,0],
  wheelWell:[1.27,.92,0],stepFoot:[1.15,-.05,0],
  belly:[.96,-.24,0],keel:[.30,-.28,0]},
 {z:2.25,roof:[1.24,1.65,0],brow:[1.58,1.55,0],shoulder:[1.91,1.35,0],
  belt:[1.89,1.08,0],lip:[1.89,.94,0],shelf:[1.56,.92,0],
  wheelWell:[1.27,.92,0],stepFoot:[1.15,-.05,0],
  belly:[.96,-.24,0],keel:[.30,-.28,0]},
 {z:3.54,roof:[1.24,1.65,0],brow:[1.58,1.55,0],shoulder:[1.91,1.35,0],
  belt:[1.89,1.08,0],lip:[1.89,.94,0],shelf:[1.56,.92,0],
  wheelWell:[1.27,.92,0],stepFoot:[1.15,-.05,0],
  belly:[.96,-.24,0],keel:[.30,-.28,0]},
 {z:4.58,roof:[1.24,1.62,0],brow:[1.57,1.51,0],shoulder:[1.82,1.34,0],
  belt:[1.81,1.07,0],lip:[1.81,.93,0],shelf:[1.54,.92,0],
  wheelWell:[1.27,.92,0],stepFoot:[1.15,-.05,0],
  belly:[.96,-.22,0],keel:[.30,-.26,0]},
 // Popa XATA: gairebé la mateixa amplada, tots els punts al mateix Z.
 {z:5.425,roof:[1.26,1.56,0],brow:[1.55,1.48,0],shoulder:[1.74,1.32,0],
  belt:[1.74,1.04,0],lip:[1.73,.94,0],shelf:[1.48,.92,0],
  wheelWell:[1.26,.92,0],stepFoot:[1.14,-.04,0],
  belly:[.96,-.19,0],keel:[.30,-.22,0]}
]);

const PROFILE_ORDER=['roof','brow','shoulder','belt','lip','shelf',
 'wheelWell','stepFoot','belly','keel'];
function section(station){
 const right=PROFILE_ORDER.map(name=>{
  const [x,y,dz]=station[name];
  return [x,y,station.z+dz];
 });
 return [
  [-right[0][0],right[0][1],right[0][2]],
  ...right,
  ...right.slice(1).reverse().map(([x,y,z])=>[-x,y,z])
 ];
}
function closedMesh(rings){
 const n=rings[0].length,positions=rings.flat(2),indices=[];
 if(!rings.every(r=>r.length===n))throw Error('El casc té perfils incompatibles');
 for(let r=0;r<rings.length-1;r++)for(let k=0;k<n;k++){
  const a=r*n+k,b=r*n+(k+1)%n,c=(r+1)*n+(k+1)%n,d=(r+1)*n+k;
  indices.push(a,c,b,a,d,c);
 }
 for(let k=1;k<n-1;k++){
  indices.push(0,k,k+1);
  const last=(rings.length-1)*n;
  indices.push(last,last+k+1,last+k);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.candidateSimplified=true;
 return geometry;
}

// Gir històric +90 graus, més intercanvi proporcional d'ample/llarg.
// Definim la carcassa en el sistema FINAL i codifiquem la seva preimatge
// en les coordenades anteriors al gir. Aquesta operació es conserva
// explícitament, no es torna a construir el casc amb eixos invertits.
export function createBtr82HullV3Geometry(){
 const finalRings=BTR82_HULL_V3_STATIONS.map(section);
 const finalWidth=3.82,finalLength=10.85,ratio=finalWidth/finalLength;
 // Inversa de (x,z) -> (z*ratio,-x/ratio).
 const beforeRings=finalRings.map(ring=>ring.map(([x,y,z])=>[-z*ratio,y,x/ratio]));
 return closedMesh(beforeRings);
}

export function createBtr82HullV3AxisSwapGeometry(original){
 const source=original.getAttribute('position');
 if(!source)throw Error('La v3 no té vèrtexs de posició');
 original.computeBoundingBox();
 const bounds=original.boundingBox;
 const width=bounds.max.x-bounds.min.x;
 const length=bounds.max.z-bounds.min.z;
 if(width<2||length<6)throw Error('Proporcions inesperades del casc BTR v3');
 const centerX=(bounds.min.x+bounds.max.x)*.5;
 const centerZ=(bounds.min.z+bounds.max.z)*.5;
 const result=original.clone(),position=result.getAttribute('position');
 for(let i=0;i<position.count;i++){
  const x=source.getX(i)-centerX,y=source.getY(i),z=source.getZ(i)-centerZ;
  position.setXYZ(i,centerX+z*(width/length),y,centerZ-x*(length/width));
 }
 position.needsUpdate=true;
 result.computeVertexNormals();result.computeBoundingBox();result.computeBoundingSphere();
 result.userData.candidateSimplified=true;
 result.userData.btr82AxisSwap=true;
 return result;
}

function createTurretGeometry(){
 // Torreta angular centrada en X=0, dirigida endavant (-Z).
 // Es conserva el canó existent a x=-.06, y=2.69.
 const profile=[[-.53,-1.59],[.53,-1.59],[.95,-1.14],[.95,-.43],
                [.66,.18],[-.66,.18],[-.95,-.43],[-.95,-1.14]];
 const zCenter=-.69;
 const rings=[
  {y:1.55,x:1.08,z:1.06},
  {y:2.13,x:1.01,z:1.00},
  {y:2.77,x:.72,z:.81},
  {y:2.87,x:.67,z:.76}
 ].map(r=>profile.map(([x,z])=>[x*r.x,r.y,zCenter+(z-zCenter)*r.z]));
 return closedMesh(rings);
}

const KEEP=/^BTR82_(?:truck_A43_wheel_[0-9]+|new_black_(?:barrel|muzzle))$/;
export function makeBtr82HullV3(baseline){
 const scene=baseline.clone(true),discard=[];
 function preserved(mesh){
  for(let object=mesh;object&&object!==scene;object=object.parent)
   if(KEEP.test(object.name))return true;
  return false;
 }
 scene.traverse(object=>{if(object.isMesh&&!preserved(object))discard.push(object)});
 for(const object of discard)object.parent?.remove(object);
 const hull=new THREE.Mesh(createBtr82HullV3AxisSwapGeometry(createBtr82HullV3Geometry()),
  new THREE.MeshStandardMaterial({color:0x5f6c53,roughness:.93,metalness:.04,
   side:THREE.DoubleSide,flatShading:true}));
 hull.name='BTR82_v3_lowered_centre_hull';
 hull.castShadow=true;hull.receiveShadow=true;scene.add(hull);
 const turret=new THREE.Mesh(createTurretGeometry(),
  new THREE.MeshStandardMaterial({color:0x56624d,roughness:.93,metalness:.04,
   side:THREE.DoubleSide,flatShading:true}));
 turret.name='BTR82_v3_low_angular_turret';
 turret.castShadow=true;turret.receiveShadow=true;scene.add(turret);
 let wheels=0,barrel=0;
 scene.traverse(object=>{
  if(/^BTR82_truck_A43_wheel_[0-9]+$/.test(object.name))wheels++;
  if(/^BTR82_new_black_(?:barrel|muzzle)$/.test(object.name))barrel++;
 });
 if(wheels!==8||barrel!==2)throw Error('Casc v3: falten les 8 rodes o les 2 peces del canó');
 scene.userData.btr82HullV3={
  version:3,closed:true,symmetricalX:true,axisRotationDegrees:90,
  hullTriangles:hull.geometry.index.count/3,
  turretTriangles:turret.geometry.index.count/3,
  hullBottom:-.28,roofHeight:1.65,
  wheelStepHeight:.92,lowerBellyHalfWidth:1.15,
  retainedWheels:wheels,retainedGunParts:barrel,
  discardedReferenceMeshes:discard.length
 };
 return scene;
}
