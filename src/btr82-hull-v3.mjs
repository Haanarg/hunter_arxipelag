import * as THREE from '../vendor/three-r186.module.mjs';

// Casc BTR-82 v3 — silueta més propera al blindat de referència:
// sostre baix, proa fortament inclinada, espatlles angulars, i una
// panxa CENTRAL estreta que baixa entre les columnes de rodes.
// El perfil es construeix en una sola malla tancada i simètrica (X).
// No hi ha planxes solapades, forats ni pinzells de reparació.
// Estacions en metres: proa = -Z, popa = +Z.
// Punts de MITJA SECCIÓ [amplada x, altura y, desviació z]:
// roof, upper, shoulder, belt, skirt, inner, belly, keel.
// Els últims 3 punts estan ENTRE LES RODES, no a l'exterior.
// La franja del ventre queda deliberadament prop del terreny (y=.17-.25).
export const BTR82_HULL_V3_STATIONS=Object.freeze([
 {z:-5.10,roof:[1.01,1.19,.61],upper:[1.37,1.17,.24],shoulder:[1.64,1.03,-.03],belt:[1.73,.84,-.10],skirt:[1.46,.66,-.10],inner:[1.02,.43,-.04],belly:[.63,.29,.02],keel:[.18,.25,.05]},
 {z:-4.72,roof:[1.13,1.40,.30],upper:[1.53,1.36,.13],shoulder:[1.80,1.24,-.03],belt:[1.86,.97,-.10],skirt:[1.51,.71,-.10],inner:[1.10,.42,-.04],belly:[.68,.21,0],keel:[.19,.18,0]},
 {z:-4.18,roof:[1.22,1.59,.07],upper:[1.62,1.49,.02],shoulder:[1.88,1.36,0],belt:[1.88,1.00,0],skirt:[1.52,.69,0],inner:[1.14,.39,0],belly:[.69,.18,0],keel:[.20,.16,0]},
 {z:-3.55,roof:[1.26,1.68,0],upper:[1.68,1.51,0],shoulder:[1.91,1.37,0],belt:[1.91,1.00,0],skirt:[1.49,.68,0],inner:[1.09,.38,0],belly:[.67,.17,0],keel:[.20,.15,0]},
 {z:-1.65,roof:[1.26,1.68,0],upper:[1.68,1.51,0],shoulder:[1.91,1.37,0],belt:[1.91,1.00,0],skirt:[1.49,.68,0],inner:[1.09,.38,0],belly:[.67,.17,0],keel:[.20,.15,0]},
 {z: 1.25,roof:[1.26,1.68,0],upper:[1.68,1.51,0],shoulder:[1.91,1.37,0],belt:[1.91,1.00,0],skirt:[1.49,.68,0],inner:[1.09,.38,0],belly:[.67,.17,0],keel:[.20,.15,0]},
 {z: 3.60,roof:[1.26,1.68,0],upper:[1.68,1.51,0],shoulder:[1.91,1.37,0],belt:[1.91,1.00,0],skirt:[1.49,.68,0],inner:[1.09,.38,0],belly:[.67,.17,0],keel:[.20,.15,0]},
 {z: 4.55,roof:[1.21,1.64,-.06],upper:[1.63,1.47,.02],shoulder:[1.85,1.34,.09],belt:[1.82,.97,.10],skirt:[1.45,.65,.09],inner:[1.06,.36,.03],belly:[.65,.18,0],keel:[.19,.16,0]},
 {z: 5.48,roof:[1.08,1.37,-.38],upper:[1.46,1.31,-.11],shoulder:[1.70,1.17,.02],belt:[1.70,.90,.15],skirt:[1.40,.61,.17],inner:[1.03,.36,.09],belly:[.64,.22,0],keel:[.18,.20,-.03]}
]);

function section(station){
 const names=['roof','upper','shoulder','belt','skirt','inner','belly','keel'];
 const right=names.map(name=>{
  const [x,y,dz]=station[name];
  return [x,y,station.z+dz];
 });
 return [...right.map(([x,y,z])=>[-x,y,z]).slice(0,1),...right,
  ...right.slice(1).reverse().map(([x,y,z])=>[-x,y,z])];
}

// El punt central es duplica entre costats? NO: cada secció inclou
// vèrtexs ±.18 a la quilla, que creen un pis central real, no solapat.
export function createBtr82HullV3Geometry(){
 const rings=BTR82_HULL_V3_STATIONS.map(section);
 const n=rings[0].length,vertices=rings.flat(2),indices=[];
 for(let r=0;r<rings.length-1;r++)for(let k=0;k<n;k++){
  const a=r*n+k,b=r*n+(k+1)%n,c=(r+1)*n+(k+1)%n,d=(r+1)*n+k;
  indices.push(a,c,b,a,d,c);
 }
 for(let k=1;k<n-1;k++){
  indices.push(0,k,k+1);
  const end=(rings.length-1)*n;
  indices.push(end,end+k+1,end+k);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.candidateSimplified=true;
 return geometry;
}

function createTurretGeometry(){
 // Una torreta prismàtica simple, més baixa i amb cares facetades.
 // Alçada de la base per sota de la coberta (1.68 m) perquè s'encasti.
 // El canó original a y=2.69 es manté i travessa la paret frontal.
 const profile=[[-.53,-1.59],[.53,-1.59],[.95,-1.14],[.95,-.43],
                [.66,.18],[-.66,.18],[-.95,-.43],[-.95,-1.14]];
 const zCenter=-.69;
 const rings=[
  {y:1.56,x:1.08,z:1.06},
  {y:2.13,x:1.01,z:1.00},
  {y:2.77,x:.72,z:.81},
  {y:2.87,x:.67,z:.76}
 ].map(level=>profile.map(([x,z])=>[x*level.x,level.y,zCenter+(z-zCenter)*level.z]));
 const n=profile.length,positions=rings.flat(2),indices=[];
 for(let r=0;r<rings.length-1;r++)for(let k=0;k<n;k++){
  const a=r*n+k,b=r*n+(k+1)%n,c=(r+1)*n+(k+1)%n,d=(r+1)*n+k;
  indices.push(a,c,b,a,d,c);
 }
 for(let k=1;k<n-1;k++){
  indices.push(0,k,k+1);
  const end=(rings.length-1)*n;
  indices.push(end,end+k+1,end+k);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.candidateSimplified=true;
 return geometry;
}

// Assaig de la hipòtesi d'orientació: antic lateral -> nova proa.
// Cal fer DUES operacions: gir Y +90° i intercanvi de dimensions X/Z.
// Un gir sol deixaria un casc 11 m d'ample i 4 m de llarg.
// La geometria original roman disponible per comparar instantàniament.
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
  const x=source.getX(i)-centerX;
  const y=source.getY(i);
  const z=source.getZ(i)-centerZ;
  // Gir Y +90: (x,z)->(z,-x). Escalat posterior:
  // X torna a la mateixa amplada, Z a la mateixa llargada.
  position.setXYZ(i,centerX+z*(width/length),y,centerZ-x*(length/width));
 }
 position.needsUpdate=true;
 result.computeVertexNormals();
 result.computeBoundingBox();result.computeBoundingSphere();
 result.userData.candidateSimplified=true;
 result.userData.btr82AxisSwap=true;
 return result;
}

const hullAxisCache=new WeakMap();
export function setBtr82HullV3AxisSwap(root,enabled){
 const mesh=root.getObjectByName('BTR82_v3_lowered_centre_hull');
 if(!mesh?.isMesh) return false;
 let pair=hullAxisCache.get(mesh);
 if(!pair){
  pair={original:mesh.geometry,swapped:createBtr82HullV3AxisSwapGeometry(mesh.geometry)};
  hullAxisCache.set(mesh,pair);
 }
 mesh.geometry=enabled?pair.swapped:pair.original;
 mesh.userData.btr82AxisSwap=!!enabled;
 return true;
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
 const report={
  version:3,closed:true,symmetrical:true,
  hullTriangles:hull.geometry.index.count/3,
  turretTriangles:turret.geometry.index.count/3,
  hullBottom:.15,roofHeight:1.68,
  retainedWheels:wheels,retainedGunParts:barrel,
  discardedReferenceMeshes:discard.length
 };
 scene.userData.btr82HullV3=report;
 return scene;
}
