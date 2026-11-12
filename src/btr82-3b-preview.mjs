import * as THREE from '../vendor/three-r186.module.mjs';
import {createBtr82AngularGeometry} from './btr82-angular-facets.mjs';
import {createBtr82TurretV3Geometry,BTR82_CABIN_SHIFT_Z} from './btr82-hull-v3.mjs';
import {shapeBtr823BTurret,BTR82_3B_TURRET_SCALE,
 BTR82_3B_TURRET_FORWARD_Z,BTR82_3B_GUN_Y} from './btr82-3b-geometry.mjs';
import {applyBtr823BDetails} from './btr82-3b-details.mjs?rev=side-access-v3';

// El candidat de prova 3B és completament procedimental: no depèn del GLB
// antic ni de la càrrega de cap alternativa. Les dimensions són les originals
// del visor (sense la compressió longitudinal que havia aparegut al joc).
const AXLES=Object.freeze([-2.938,-.938,1.7505,3.585]);
const TIRE_RADIUS=.8125;
const TIRE_WIDTH=.50;
const BODY_DROP=.18;
const WHEEL_X=1.688;
// Alias del contracte de proves existent. La geometria és comuna amb el joc.
export const BTR82_3B_PREVIEW_TURRET_SCALE=BTR82_3B_TURRET_SCALE;
const GUN_PREVIEW_Y=BTR82_3B_GUN_Y-BODY_DROP;

function rimmedWheel(){
 const group=new THREE.Group();
 group.name='BTR82_3B_preview_wheel';
 const rubber=new THREE.MeshStandardMaterial({color:0x242924,roughness:.90,flatShading:true});
 const rim=new THREE.MeshStandardMaterial({color:0x717b70,roughness:.70,metalness:.22,flatShading:true});
 const hub=new THREE.MeshStandardMaterial({color:0x303930,roughness:.86,metalness:.16});
 for(const [name,radius,width,mat,segments] of [
  ['tire',TIRE_RADIUS,TIRE_WIDTH,rubber,12],
  ['rim',TIRE_RADIUS*.46/.80,TIRE_WIDTH*1.03,rim,10],
  ['hub',TIRE_RADIUS*.20/.80,TIRE_WIDTH*1.06,hub,8]
 ]){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,width,segments),mat);
  mesh.name='BTR82_3B_preview_wheel_'+name;
  mesh.rotation.z=Math.PI/2;
  mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
 return group;
}
function gunCylinder(name,radius,length,z,material){
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,12),material);
 mesh.name=name;
 mesh.rotation.x=Math.PI/2;
 mesh.position.set(0,GUN_PREVIEW_Y,z+BTR82_CABIN_SHIFT_Z+BTR82_3B_TURRET_FORWARD_Z);
 mesh.castShadow=true;mesh.receiveShadow=true;
 return mesh;
}

// Reconstrueix EXACTAMENT el casc 3B low-poly i la torreta del comparador,
// inclòs el retall de mitja lluna girat 180º, abans d'afegir els nous detalls.
export function createBtr823BPreview(){
 const model=new THREE.Group();
 model.name='BTR82_3B_revised_preview';
 const hullMat=new THREE.MeshStandardMaterial({color:0x5f6c53,roughness:.93,
  metalness:.04,flatShading:true,side:THREE.DoubleSide});
 const turretMat=new THREE.MeshStandardMaterial({color:0x56624d,roughness:.93,
  metalness:.04,flatShading:true,side:THREE.DoubleSide});
 const gunMat=new THREE.MeshStandardMaterial({color:0x101010,roughness:.78,metalness:.20});

 const hull=new THREE.Mesh(createBtr82AngularGeometry('angular-strong'),hullMat);
 hull.name='BTR82_v3_lowered_centre_hull';
 hull.position.y=-BODY_DROP;
 hull.castShadow=true;hull.receiveShadow=true;
 model.add(hull);

 const geometry=shapeBtr823BTurret(createBtr82TurretV3Geometry());
 const turret=new THREE.Mesh(geometry,turretMat);
 turret.name='BTR82_v3_low_angular_turret';
 turret.position.y=-BODY_DROP;
 turret.castShadow=true;turret.receiveShadow=true;
 model.add(turret);

 model.add(gunCylinder('BTR82_new_black_barrel',.085,2.90,-1.91,gunMat));
 model.add(gunCylinder('BTR82_new_black_muzzle',.115,.28,-3.47,gunMat));

 for(const [axle,z] of AXLES.entries())for(const side of [-1,1]){
  const wheel=rimmedWheel();
  wheel.name='BTR82_3B_preview_wheel_'+axle+'_'+(side<0?'L':'R');
  wheel.position.set(side*WHEEL_X,0,z);
  model.add(wheel);
 }

 applyBtr823BDetails(model);
 model.userData.btr82Preview='3B-revised';
 model.userData.previewOnly=true;
 model.userData.btr82WheelCount=8;
 model.userData.btr82TurretBodyScale=BTR82_3B_PREVIEW_TURRET_SCALE;
 model.userData.btr82TurretForwardZ=BTR82_3B_TURRET_FORWARD_Z;
 model.userData.btr82GunCenterY=GUN_PREVIEW_Y;
 model.userData.btr82Source='SIpriv · Low Poly BTR-82 · CC BY 4.0';
 return model;
}
