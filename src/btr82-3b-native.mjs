// BTR-82 model 3B definitiu: mateixa geometria que el comparador,
// però amb rodes i canó animables i ajust visual al volum de la tanqueta
// existent. Cap geometria GLB ni càrrega de xarxa durant la partida.
import {createBtr82AngularGeometry,BTR82_3B_BARREL_LOWERING_Y} from './btr82-angular-facets.mjs';
import {shapeBtr823BTurret,BTR82_3B_TURRET_FORWARD_Z,
 BTR82_3B_TURRET_AXIS_Z,BTR82_3B_GUN_Y,BTR82_3B_YAW_Y,
 BTR82_3B_TURRET_SCALE} from './btr82-3b-geometry.mjs';
import {createBtr823BHardwareBatch} from './btr82-3b-details.mjs?rev=front-glass-v2';
import {createBtr82TurretV3Geometry,BTR82_CABIN_SHIFT_Z} from './btr82-hull-v3.mjs';
import {vehicleSpecs} from './vehicle-specs.mjs';

// Conservam les proporcions EXACTES del 3B del visor: la compressió
// longitudinal antiga (.46 contra .65 en X/Y) feia solapar pneumàtics.
// L'escala uniforme, amb el factor 1.5, recupera els espais entre eixos.
// La hitbox física corresponent es declara a vehicle-specs.mjs.
export const BTR82_3B_GAME_FIT=Object.freeze({
 x:.65,y:.65,z:.65,sizeMultiplier:1.5,bodyDrop:.18,groundMargin:.15,
 sourceTireRadius:.8125,sourceWheelHalfWidth:.25
});
const WHEEL_Z=Object.freeze([-2.938,-.938,1.7505,3.585]);
const cache=new WeakMap();
const GUN_REAR_Z=-1.91+BTR82_CABIN_SHIFT_Z+2.90/2+BTR82_3B_TURRET_FORWARD_Z;
const BARREL_CENTER_Z=-1.91+BTR82_CABIN_SHIFT_Z+BTR82_3B_TURRET_FORWARD_Z;
const MUZZLE_CENTER_Z=-3.47+BTR82_CABIN_SHIFT_Z+BTR82_3B_TURRET_FORWARD_Z;
const MUZZLE_TIP_Z=MUZZLE_CENTER_Z-.28/2;
const GUN_SOURCE_Y=BTR82_3B_GUN_Y;

function makeCombinedWheelGeometry(THREE,radius,width){
 const positions=[],normals=[],colors=[];
 for(const [r,depth,hex,segments] of [
  [radius,width,0x242924,12],
  [radius*(.46/.80),width*1.03,0x717b70,10],
  [radius*(.20/.80),width*1.06,0x303930,8]
 ]){
  const geometry=new THREE.CylinderGeometry(r,r,depth,segments);
  geometry.rotateZ(Math.PI/2);
  const flat=geometry.index?geometry.toNonIndexed():geometry;
  const xyz=flat.getAttribute('position'),normal=flat.getAttribute('normal'),
        color=new THREE.Color(hex);
  for(let i=0;i<xyz.count;i++){
   positions.push(xyz.getX(i),xyz.getY(i),xyz.getZ(i));
   normals.push(normal.getX(i),normal.getY(i),normal.getZ(i));
   colors.push(color.r,color.g,color.b);
  }
  if(flat!==geometry)flat.dispose();
  geometry.dispose();
 }
 const merged=new THREE.BufferGeometry();
 merged.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 merged.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 merged.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 merged.computeBoundingSphere();
 return merged;
}

function shared(THREE){
 if(cache.has(THREE))return cache.get(THREE);
 const {x:baseX,y:baseY,z:baseZ,sizeMultiplier,bodyDrop,groundMargin,
   sourceTireRadius,sourceWheelHalfWidth}=BTR82_3B_GAME_FIT;
 const sx=baseX*sizeMultiplier,sy=baseY*sizeMultiplier,
   sz=baseZ*sizeMultiplier;
 const tireRadius=sourceTireRadius*sy;
 const wheelCentreY=tireRadius+groundMargin;
 const hullGeometry=createBtr82AngularGeometry('angular-strong');
 hullGeometry.scale(sx,sy,sz);
 hullGeometry.translate(0,wheelCentreY-bodyDrop*sy,0);

 // Geometria idèntica al visor: torreta compacta (75%) i desplaçada
 // endavant fins al segon eix; el canó i el pivot giren amb ella.
 const turretGeometry=shapeBtr823BTurret(createBtr82TurretV3Geometry());
 turretGeometry.scale(sx,sy,sz);
 const turretPivotY=wheelCentreY+(BTR82_3B_YAW_Y-bodyDrop)*sy;
 const turretPivotZ=BTR82_3B_TURRET_AXIS_Z*sz;
 turretGeometry.translate(0,wheelCentreY-bodyDrop*sy-turretPivotY,-turretPivotZ);
 turretGeometry.computeBoundingSphere();

 // Trapes, defenses, mirilles horitzontals i focus: una sola malla
 // estàtica compartida entre totes les tanquetes (evita 53 draw calls/vehicle).
 const hardwareGeometry=createBtr823BHardwareBatch(THREE);
 hardwareGeometry.scale(sx,sy,sz);
 hardwareGeometry.translate(0,wheelCentreY,0);

 const hullMaterial=new THREE.MeshStandardMaterial({
  color:0x5f6c53,roughness:.93,metalness:.04,
  side:THREE.DoubleSide,flatShading:true
 });
 const turretMaterial=new THREE.MeshStandardMaterial({
  color:0x56624d,roughness:.93,metalness:.04,
  side:THREE.DoubleSide,flatShading:true
 });
 const gunMaterial=new THREE.MeshStandardMaterial({
  color:0x101010,roughness:.78,metalness:.20
 });
 const wheelMaterial=new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:.86,metalness:.12,flatShading:true
 });
 const hardwareMaterial=new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:.88,metalness:.12,flatShading:true
 });
 const barrelGeometry=new THREE.CylinderGeometry(
  .085*sx,.085*sx,2.90*sz,12);
 const muzzleGeometry=new THREE.CylinderGeometry(
  .115*sx,.115*sx,.28*sz,12);
 const wheelGeometry=makeCombinedWheelGeometry(THREE,tireRadius,
  sourceWheelHalfWidth*2*sx);
 const result={hullGeometry,turretGeometry,hardwareGeometry,hullMaterial,turretMaterial,
  hardwareMaterial,gunMaterial,wheelMaterial,barrelGeometry,muzzleGeometry,wheelGeometry,
  turretPivotY,turretPivotZ,wheelCentreY,tireRadius,sx,sy,sz};
 cache.set(THREE,result);
 return result;
}

// Retorna un rig amb els mateixos contractes que la tanqueta original:
// g.userData.wheels, turretPivot, turretPitch i turretMuzzle.
export function installBtr82Model3B(THREE,g,{resources=null}={}){
 const p=shared(THREE);
 if(resources)for(const item of Object.values(p))
  if(item?.isBufferGeometry||item?.isMaterial)resources.retain(item);
 const hull=new THREE.Mesh(p.hullGeometry,p.hullMaterial);
 hull.name='BTR82_3B_hull';
 g.add(hull);
 const hardware=new THREE.Mesh(p.hardwareGeometry,p.hardwareMaterial);
 hardware.name='BTR82_3B_batched_hardware';
 g.add(hardware);
 for(const z of WHEEL_Z)for(const side of [-1,1]){
  const front=z===WHEEL_Z[0];
  // La mangueta gira suaument sobre Y al primer eix; la roda interior
  // continua rodant en X. La resta de les rodes no giren direccionalment.
  const steering=front?new THREE.Group():null;
  const parent=steering||g;
  if(front){
   steering.name='BTR82_3B_front_steering';
   steering.position.set(side*1.688*p.sx,p.wheelCentreY,z*p.sz);
   g.add(steering);
   (g.userData.steeringPivots||(g.userData.steeringPivots=[])).push(steering);
  }
  const w=new THREE.Group();
  if(!front)w.position.set(side*1.688*p.sx,p.wheelCentreY,z*p.sz);
  w.name='BTR82_3B_wheel';
  const mesh=new THREE.Mesh(p.wheelGeometry,p.wheelMaterial);
  w.add(mesh);parent.add(w);
  w.userData.radius=p.tireRadius*vehicleSpecs.scales.tanqueta;
  (g.userData.wheels||(g.userData.wheels=[])).push(w);
 }
 const pivot=new THREE.Group();
 pivot.name='BTR82_3B_complete_turret_yaw';
 pivot.position.set(0,p.turretPivotY,p.turretPivotZ);
 g.add(pivot);
 const turret=new THREE.Mesh(p.turretGeometry,p.turretMaterial);
 turret.name='BTR82_3B_curved_turret';
 pivot.add(turret);

 // La malla de la torreta gira sencera amb pivot (Y). Només aquest
 // subgrup del canó fa el capcineig (X), sense inclinar el blindatge.
 // El pivot de capcineig és a la culata, al rebaix frontal.
 const pitch=new THREE.Group();
 pitch.name='BTR82_3B_gun_pitch';
 pitch.position.set(0,p.wheelCentreY+
  (GUN_SOURCE_Y-BTR82_3B_GAME_FIT.bodyDrop)*p.sy-
  p.turretPivotY,GUN_REAR_Z*p.sz-p.turretPivotZ);
 pivot.add(pitch);
 const barrel=new THREE.Mesh(p.barrelGeometry,p.gunMaterial);
 barrel.name='BTR82_3B_black_barrel';
 barrel.rotation.x=Math.PI/2;
 barrel.position.z=(BARREL_CENTER_Z-GUN_REAR_Z)*p.sz;
 pitch.add(barrel);
 const muzzleRing=new THREE.Mesh(p.muzzleGeometry,p.gunMaterial);
 muzzleRing.name='BTR82_3B_black_muzzle';
 muzzleRing.rotation.x=Math.PI/2;
 muzzleRing.position.z=(MUZZLE_CENTER_Z-GUN_REAR_Z)*p.sz;
 pitch.add(muzzleRing);
 const shot=new THREE.Object3D();
 shot.position.z=(MUZZLE_TIP_Z-GUN_REAR_Z)*p.sz;
 pitch.add(shot);
 g.userData.turretPivot=pivot;
 g.userData.turretPitch=pitch;
 g.userData.turretMuzzle=shot;
 g.userData.btr82Model='3B';
 g.userData.btr82WheelCount=8;
 g.userData.btr82VisualScale=BTR82_3B_GAME_FIT.sizeMultiplier;
 g.userData.btr82FrontSteerCount=g.userData.steeringPivots.length;
 g.userData.btr82HullTriangles=p.hullGeometry.index.count/3;
 g.userData.btr82BarrelLowering=BTR82_3B_BARREL_LOWERING_Y;
 g.userData.btr82TurretBodyScale=BTR82_3B_TURRET_SCALE;
 g.userData.btr82TurretForwardZ=BTR82_3B_TURRET_FORWARD_Z;
 g.userData.btr82HardwareBatched=true;
 return g;
}
