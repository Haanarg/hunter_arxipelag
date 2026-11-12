// Integració amb Three.js real: el visor 3B i el joc han de tenir
// EXACTAMENT la mateixa torreta/geometria; proves de foc SOLO i COOP.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {createBtr823BPreview} from '../src/btr82-3b-preview.mjs';
import {installBtr82Model3B,BTR82_3B_GAME_FIT} from '../src/btr82-3b-native.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {vehicleGunPose,turretSpecs} from '../src/vehicle-turret-core.mjs';
import {BTR82_3B_TURRET_AXIS_Z} from '../src/btr82-3b-geometry.mjs';

const preview=createBtr823BPreview(),rig=new THREE.Group();
installBtr82Model3B(THREE,rig);
const sx=BTR82_3B_GAME_FIT.x*BTR82_3B_GAME_FIT.sizeMultiplier;
const sy=BTR82_3B_GAME_FIT.y*BTR82_3B_GAME_FIT.sizeMultiplier;
const sz=BTR82_3B_GAME_FIT.z*BTR82_3B_GAME_FIT.sizeMultiplier;
const margin=.8125*sy+BTR82_3B_GAME_FIT.groundMargin;
assert.equal(sx,sy);assert.equal(sy,sz);
const p=preview.getObjectByName('BTR82_v3_low_angular_turret').geometry,
 g=rig.getObjectByName('BTR82_3B_curved_turret').geometry;
const a=p.getAttribute('position'),b=g.getAttribute('position');
assert.equal(a.count,b.count);
assert.equal(rig.userData.btr82TurretBodyScale,.75);
assert.equal(rig.userData.btr82TurretForwardZ,-.65);
assert(Math.abs(BTR82_3B_TURRET_AXIS_Z+.938)<.04);
assert(Math.abs(rig.userData.turretPivot.position.z-BTR82_3B_TURRET_AXIS_Z*sz)<1e-8);
for(let i=0;i<a.count;i++){
 const expected=[
  a.getX(i)*sx,
  (a.getY(i)-.18)*sy+margin,
  a.getZ(i)*sz
 ];
 const got=[
  b.getX(i)+rig.userData.turretPivot.position.x,
  b.getY(i)+rig.userData.turretPivot.position.y,
  b.getZ(i)+rig.userData.turretPivot.position.z
 ];
 for(let axis=0;axis<3;axis++)
  assert(Math.abs(expected[axis]-got[axis])<1e-5,
   'Diferència visor/joc a vèrtex '+i+' eix '+axis);
}

const hardware=rig.getObjectByName('BTR82_3B_batched_hardware');
assert(hardware?.isMesh&&hardware.geometry.userData.btr82HardwareBatch);
assert.equal(preview.userData.btr82Details3B.sideAccessDoors,2);
assert.equal(preview.userData.btr82Details3B.sideAccessToKeel,true,
 'La comporta del visor arriba fins a la quilla');
assert.equal(preview.userData.btr82Details3B.rearSidePanels,4);
assert.equal(preview.userData.btr82Details3B.rearSideSymmetricX,true);
assert.equal(hardware.geometry.userData.previewDetailCount,97,
 'Portelles posteriors i comportes fins a la quilla incloses al lot del joc');
assert.equal(rig.children.filter(o=>o.name==='BTR82_3B_batched_hardware').length,1);
const batchXYZ=hardware.geometry.getAttribute('position');
const batchColor=hardware.geometry.getAttribute('color');
assert(batchXYZ.count>1000&&batchColor.count===batchXYZ.count,
 'Detalls del BTR-82 absents o sense els colors originals');
// Tots els vèrtexs dels 97 detalls han de coincidir exactament entre
// el visor i el lot renderitzat pel joc (mateixa escala i altura de rodes).
preview.updateMatrixWorld(true,true);
let detailVertex=0,detailMeshes=0;
preview.getObjectByName('BTR82_3B_hardware').traverse(mesh=>{
 if(!mesh.isMesh)return;
 detailMeshes++;
 const transformed=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
 const expanded=transformed.index?transformed.toNonIndexed():transformed;
 const xyz=expanded.getAttribute('position');
 for(let j=0;j<xyz.count;j++,detailVertex++){
  const expect=[xyz.getX(j)*sx,xyz.getY(j)*sy+margin,xyz.getZ(j)*sz];
  const got=[batchXYZ.getX(detailVertex),batchXYZ.getY(detailVertex),
   batchXYZ.getZ(detailVertex)];
  for(let axis=0;axis<3;axis++)
   assert(Math.abs(expect[axis]-got[axis])<1e-4,
    'Detall del BTR discrepant entre visor/joc: malla '+mesh.name+' / '+detailVertex);
 }
 if(expanded!==transformed)expanded.dispose();
 transformed.dispose();
});
assert.equal(detailMeshes,97,'Les dues cares han de mantenir tots els detalls');
assert.equal(detailVertex,batchXYZ.count,'El joc no pot perdre triangles durant l’agrupació');
const testRig=new THREE.Group();
installBtr82Model3B(THREE,testRig);
assert.equal(hardware.geometry,testRig.getObjectByName('BTR82_3B_batched_hardware').geometry,
 'Els detalls han de ser compartits entre vehicles');

const pitch=rig.userData.turretPitch,muzzle=rig.userData.turretMuzzle;
for(const yaw of [0,.3,-.8])for(const elevation of [0,.2,-.27]){
 rig.userData.turretPivot.rotation.y=yaw;
 pitch.rotation.x=elevation;
 rig.updateWorldMatrix(true,true);
 const worldMuzzle=muzzle.getWorldPosition(new THREE.Vector3());
 const pose=vehicleGunPose({
  t:'tanqueta',hd:0,x:0,y:0,z:0,turretYaw:yaw,turretPitch:elevation
 });
 for(const k of ['x','y','z']){
  const expected=worldMuzzle[k]*vehicleSpecs.scales.tanqueta;
  assert(Math.abs(expected-pose.origin[k])<1e-5,
   'El canó visual i el tir COOP divergeixen en '+k+' yaw='+yaw+' pitch='+elevation);
 }
}
assert(Math.abs(turretSpecs.tanqueta.pivot[2]+.936)<1e-9);
console.log('PASS 3B: visor = joc, detalls agrupats i compartits, trets SOLO/COOP sincronitzats');
