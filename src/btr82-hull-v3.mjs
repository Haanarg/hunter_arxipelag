import * as THREE from '../vendor/three-r186.module.mjs';

// BTR-82 v3i: eixos definitius X transversal / Z longitudinal del canó.
// Les estacions descriuen el casc FINAL (proa=-Z, popa=+Z) i són
// simètriques NOMÉS en X, paral·lelament al canó. Proa i popa diferents.
// Tota la geometria és una sola closca manifold en eixos finals, sense girs inversos.
//
// Perfil d'una MITJA secció FINAL [x,y,offsetZ], del sostre al ventre:
// roof, brow, shoulder, belt, lip, shelf, wheelWell, stepFoot, belly, keel.
// "shelf" + "wheelWell" formen un rail longitudinal SOBRE els pneumàtics,
// mentre que "stepFoot" baixa la panxa entre les dues fileres de rodes.
// Les rodes tenen centre X aproximadament ±1.69, radi ~0.81 i no es toquen.
export const BTR82_HULL_V3_STATIONS=Object.freeze([
 {z:-5.425,roof:[.84,1.12,.86],brow:[1.08,1.14,.68],shoulder:[1.24,1.06,.42],
  // Cunya completa: els baixos pugen fins a la punta, abans de les rodes.
  // Els tres punts superiors es conserven intactes.
  belt:[1.34,.91,0],lip:[1.27,.87,.035],shelf:[1.18,.82,.065],
  wheelWell:[1.07,.78,.085],stepFoot:[.96,.76,.10],
  belly:[.79,.78,.105],keel:[.30,.82,.11]},
 {z:-4.36,roof:[1.14,1.52,.25],brow:[1.43,1.50,.15],shoulder:[1.70,1.34,.06],
  belt:[1.76,1.06,0],lip:[1.76,.94,0],shelf:[1.54,.96,0],
  wheelWell:[1.20,.96,0],stepFoot:[1.11,-.08,0],
  belly:[.99,-.26,0],keel:[.32,-.32,0]},
 {z:-3.23,roof:[1.24,1.77,0],brow:[1.58,1.66,0],shoulder:[1.91,1.42,0],
  belt:[1.89,1.08,0],lip:[1.89,.94,0],shelf:[1.54,.96,0],
  wheelWell:[1.20,.96,0],stepFoot:[1.11,-.08,0],
  belly:[.99,-.26,0],keel:[.32,-.32,0]},
 {z:-2.15,roof:[1.24,1.77,0],brow:[1.58,1.66,0],shoulder:[1.91,1.42,0],
  belt:[1.89,1.08,0],lip:[1.89,.94,0],shelf:[1.54,.96,0],
  wheelWell:[1.20,.96,0],stepFoot:[1.11,-.08,0],
  belly:[.99,-.26,0],keel:[.32,-.32,0]},
 {z:-.70,roof:[1.24,1.77,0],brow:[1.58,1.66,0],shoulder:[1.91,1.42,0],
  belt:[1.89,1.08,0],lip:[1.89,.94,0],shelf:[1.54,.96,0],
  wheelWell:[1.20,.96,0],stepFoot:[1.11,-.08,0],
  belly:[.99,-.26,0],keel:[.32,-.32,0]},
 {z: .85,roof:[1.24,1.77,0],brow:[1.58,1.66,0],shoulder:[1.91,1.42,0],
  belt:[1.89,1.08,0],lip:[1.89,.94,0],shelf:[1.54,.96,0],
  wheelWell:[1.20,.96,0],stepFoot:[1.11,-.08,0],
  belly:[.99,-.26,0],keel:[.32,-.32,0]},
 {z:2.25,roof:[1.24,1.77,0],brow:[1.58,1.66,0],shoulder:[1.91,1.42,0],
  belt:[1.89,1.08,0],lip:[1.89,.94,0],shelf:[1.54,.96,0],
  wheelWell:[1.20,.96,0],stepFoot:[1.11,-.08,0],
  belly:[.99,-.26,0],keel:[.32,-.32,0]},
 {z:3.54,roof:[1.24,1.77,0],brow:[1.58,1.66,0],shoulder:[1.91,1.42,0],
  belt:[1.89,1.08,0],lip:[1.89,.94,0],shelf:[1.54,.96,0],
  wheelWell:[1.20,.96,0],stepFoot:[1.11,-.08,0],
  belly:[.99,-.26,0],keel:[.32,-.32,0]},
 {z:4.58,roof:[1.23,1.78,0],brow:[1.55,1.68,0],shoulder:[1.76,1.43,0],
  // La transició posterior inicia el bisell inferior sense tocar les rodes.
  belt:[1.76,1.09,0],lip:[1.70,.97,0],shelf:[1.44,.94,0],
  wheelWell:[1.18,.92,0],stepFoot:[1.07,.14,0],
  belly:[.94,-.01,0],keel:[.30,-.06,0]},
 // Popa hexagonal i xata, amb espatlles en biaix i panxa inferior recollida.
 // La quilla no ha de penjar com una caixa a la part posterior.
 {z:5.425,roof:[1.14,1.73,-.13],brow:[1.42,1.62,-.04],shoulder:[1.64,1.39,0],
  belt:[1.67,1.10,0],lip:[1.60,.98,-.06],shelf:[1.37,.89,-.15],
  wheelWell:[1.12,.85,-.22],stepFoot:[.96,.66,-.41],
  belly:[.77,.54,-.48],keel:[.26,.51,-.54]}
]);

const PROFILE_ORDER=['roof','brow','shoulder','belt','lip','shelf',
 'wheelWell','stepFoot','belly','keel'];
function section(station){
 // Coord. DEFINITIVES del BTR: la longitud i el canó són Z; X és transversal.
 // El perfil inferior forma rails longitudinals, no peces transposades.
 const lowerNames=new Set(['lip','shelf','wheelWell','stepFoot','belly','keel']);
 const right=PROFILE_ORDER.map(name=>{
  const [x,y,dz]=station[name];
  if(lowerNames.has(name)&&dz!==0&&station!==BTR82_HULL_V3_STATIONS[0]&&station!==BTR82_HULL_V3_STATIONS[BTR82_HULL_V3_STATIONS.length-1])
   throw Error('Eix longitudinal incorrecte a '+name+' z='+station.z);
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
 if(n!==PROFILE_ORDER.length*2){
  // La torreta té vuit costats i no fa servir la secció transversal
  // del casc. Conservem aquí el tancament simple que ja funcionava.
  for(let k=1;k<n-1;k++){
   indices.push(0,k,k+1);
   const last=(rings.length-1)*n;
   indices.push(last,last+k+1,last+k);
  }
 }else{
  // El morro havia estat un ventall des de la cantonada esquerra.
  // La diagonal resultant creava una falca visualment asimètrica.
  // Triangulació frontal en dues meitats exactes sobre el pla X=0.
  const closeEnd=(end,front)=>{
   const offset=end*n;
   const right=level=>offset+1+level;
   const left=level=>offset+(level===0?0:n-level);
   const middle=new Map();
   for(let level=1;level<PROFILE_ORDER.length-1;level++){
    const vertex=rings[end][1+level],index=positions.length/3;
    // Alguns graons de la popa són collineals: un rebaix simètric
    // interior evita triangles degenerats sense tocar les vores.
    const inset=(level===4?.04:level===5?.09:level===6?.16:level===8?.08:0)*(front?1:-1);
    positions.push(0,vertex[1],vertex[2]+inset);
    middle.set(level,index);
   }
   const tri=(a,b,c)=>front?indices.push(a,b,c):indices.push(a,c,b);
   const top=middle.get(1);
   tri(left(0),right(0),top);
   tri(left(0),top,left(1));
   tri(right(0),right(1),top);
   for(let level=1;level<PROFILE_ORDER.length-2;level++){
    const a=middle.get(level),b=middle.get(level+1);
    tri(left(level),a,left(level+1));
    tri(a,b,left(level+1));
    tri(a,right(level),right(level+1));
    tri(a,right(level+1),b);
   }
   const last=PROFILE_ORDER.length-1,low=middle.get(last-1);
   tri(left(last-1),low,left(last));
   tri(low,right(last-1),right(last));
   tri(low,right(last),left(last));
  };
  closeEnd(0,true);
  closeEnd(rings.length-1,false);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.candidateSimplified=true;
 return geometry;
}

// La v3b va validar el gir de 90° i l'intercanvi d'ample/llarg.
// Des de la v3d ja treballem DIRECTAMENT en aquests eixos definitius.
// L'antiga parella preimatge+gir s'anul·lava matemàticament i feia
// impossible distingir els rails inferiors dels panells transposats.
// La coberta i les espatlles conserven EXACTAMENT els seus punts v3c.
export function createBtr82HullV3Geometry(){
 return closedMesh(BTR82_HULL_V3_STATIONS.map(section));
}

// Shorter faceted turret, sloping nose and shoulders similar to source BTR.
// Cannon is a preserved original part and runs along -Z.
export function createBtr82TurretV3Geometry(){
 const outline=[[-.54,-1.60],[.54,-1.60],[.95,-1.13],[.95,-.43],
                [.66,.20],[-.66,.20],[-.95,-.43],[-.95,-1.13]];
 const cz=-.69;
 const levels=[
  // Retallada només la base de la torreta, per assentar-la al nou sostre.
  {y:1.71,rx:1.07,rz:1.06,dz:0},
  {y:1.90,rx:1.01,rz:1.03,dz:-.02},
  {y:2.20,rx:.85,rz:.94,dz:.03},
  {y:2.54,rx:.66,rz:.79,dz:.12},
  {y:2.79,rx:.58,rz:.70,dz:.19}
 ];
 const rings=levels.map(p=>outline.map(([x,z])=>[x*p.rx,p.y,cz+(z-cz)*p.rz+p.dz]));
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
 const hull=new THREE.Mesh(createBtr82HullV3Geometry(),
  new THREE.MeshStandardMaterial({color:0x5f6c53,roughness:.93,metalness:.04,
   side:THREE.DoubleSide,flatShading:true}));
 hull.name='BTR82_v3_lowered_centre_hull';
 hull.castShadow=true;hull.receiveShadow=true;scene.add(hull);
 const turret=new THREE.Mesh(createBtr82TurretV3Geometry(),
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
  hullBottom:-.32,roofHeight:1.78,
  rearKeelHeight:.51,rearOutline:'raised-hex-bevel',turretBaseHeight:1.71,
  noseKeelHeight:.82,noseTipZ:-5.425,
  wheelStepHeight:.96,lowerBellyHalfWidth:1.11,
  gunAxis:'-Z',transverseMirrorAxis:'X',frontClosure:'symmetric-centerline',
  noseProfile:'full-depth-converging-wedge',rearProfile:'raised-hexagonal-rear',turretProfile:'low-faceted-sloping',
  retainedWheels:wheels,retainedGunParts:barrel,
  discardedReferenceMeshes:discard.length
 };
 return scene;
}
