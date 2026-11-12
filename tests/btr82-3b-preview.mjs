// Comprovació real amb Three.js, sense WebGL ni fitxers GLB.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3,Vector3} from '../vendor/three-r186.module.mjs';
import {createBtr823BPreview,BTR82_3B_PREVIEW_TURRET_SCALE,
 BTR82_3B_PREVIEW_FRONT_CUT_Z} from '../src/btr82-3b-preview.mjs';
import {createBtr82TurretV3Geometry} from '../src/btr82-hull-v3.mjs';
import {compactBtr823BTurret,BTR82_3B_TURRET_PIVOT_Z,
 createBtr82AngularGeometry} from '../src/btr82-angular-facets.mjs';
import {BTR82_3B_TURRET_FORWARD_Z,BTR82_3B_TURRET_AXIS_Z} from '../src/btr82-3b-geometry.mjs';

const model=createBtr823BPreview();
assert.equal(model.name,'BTR82_3B_revised_preview');
assert.equal(model.userData.btr82Preview,'3B-revised');
assert.equal(model.userData.btr82WheelCount,8);
assert.equal(model.userData.previewOnly,true);
assert.equal(BTR82_3B_PREVIEW_FRONT_CUT_Z,-4.54);
assert.equal(model.userData.btr82FrontCutZ,-4.54);
assert.equal(model.userData.btr82Details3B.sideAccessToKeel,true,
 'La comporta que mostra el visor ha d’arribar fins a la quilla');
assert.equal(model.userData.btr82Details3B.rearSidePanels,4);
for(const side of ['left','right'])for(const i of [0,1]){
 assert(model.getObjectByName('BTR82_3B_rear_side_'+side+'_panel_'+i+'_seam')?.isMesh);
 assert(model.getObjectByName('BTR82_3B_rear_side_'+side+'_panel_'+i+'_armour')?.isMesh);
}
for(const side of ['left','right']){
 const frame=model.getObjectByName('BTR82_3B_side_access_'+side+'_outline');
 const position=frame.geometry.getAttribute('position');
 assert.equal(position.count,14,
  'Cal resseguir també el plec de sota la coberta');
 assert(Math.abs(position.getY(0)+.32)<1e-6,
  'La comporta del visor no arriba a la quilla');
}
assert.equal(BTR82_3B_PREVIEW_TURRET_SCALE,.75);
assert.equal(model.userData.btr82TurretBodyScale,.75);
assert.equal(model.userData.btr82TurretForwardZ,-.65);
assert(Math.abs(BTR82_3B_TURRET_AXIS_Z-(-.938))<.04,
 'La torreta ha d’estar gairebé damunt del segon eix de rodes');
const wheels=model.children.filter(o=>/^BTR82_3B_preview_wheel_\d+_[LR]$/.test(o.name));
assert.equal(wheels.length,8,'Hi ha d’haver 8 rodes independents');
for(const z of [-2.938,-.938,1.7505,3.585]){
 const pair=wheels.filter(w=>Math.abs(w.position.z-z)<1e-9);
 assert.equal(pair.length,2,'Cada eix ha de tenir 2 rodes');
 assert.equal(pair[0].position.x,-pair[1].position.x);
}
// El morro no ha d'avançar per davant dels fars, però ha de conservar
// una tapa completa, simètrica i sense triangles degenerats.
const hull=model.getObjectByName('BTR82_v3_lowered_centre_hull');
const trimmedHull=hull.geometry;
trimmedHull.computeBoundingBox();
const originalHull=createBtr82AngularGeometry('angular-strong');
originalHull.computeBoundingBox();
assert(originalHull.boundingBox.min.z<-5.4,'Morro original conservat per al joc');
assert(Math.abs(trimmedHull.boundingBox.min.z-BTR82_3B_PREVIEW_FRONT_CUT_Z)<1e-5,
 'El visor ha de retallar la falca davant dels quatre fars');
assert.equal(trimmedHull.userData.frontCutZ,BTR82_3B_PREVIEW_FRONT_CUT_Z);
const hullPos=trimmedHull.getAttribute('position');
const hullIndices=trimmedHull.index;
const section=[];
for(let i=0;i<hullPos.count;i++)
 if(Math.abs(hullPos.getZ(i)-BTR82_3B_PREVIEW_FRONT_CUT_Z)<1e-5)
  section.push([hullPos.getX(i),hullPos.getY(i)]);
assert(section.length>=14);
for(const [x,y] of section)
 assert(section.some(([xx,yy])=>Math.abs(x+xx)<1e-5&&Math.abs(y-yy)<1e-5),
  'El nou tancament frontal ha de ser exactament simètric');
let caps=0;
for(let i=0;i<hullIndices.count;i+=3){
 const ids=[hullIndices.getX(i),hullIndices.getX(i+1),hullIndices.getX(i+2)];
 const vert=ids.map(j=>new Vector3(
  hullPos.getX(j),hullPos.getY(j),hullPos.getZ(j)));
 assert(new Vector3().subVectors(vert[1],vert[0]).cross(
   new Vector3().subVectors(vert[2],vert[0])).length()>1e-7,
  'El retall ha deixat triangles degenerats');
 if(vert.every(v=>Math.abs(v.z-BTR82_3B_PREVIEW_FRONT_CUT_Z)<1e-5))caps++;
}
assert(caps>=14,'Falta la tapa frontal del casc retallat');
for(let i=0;i<4;i++){
 const housing=model.getObjectByName('BTR82_3B_front_headlight_'+i+'_housing');
 const lens=model.getObjectByName('BTR82_3B_front_headlight_'+i+'_lens');
 assert(lens.position.z<BTR82_3B_PREVIEW_FRONT_CUT_Z,
  'Els fars han de quedar PER DAVANT de la carrosseria retallada');
 assert(housing.position.z+housing.geometry.parameters.height/2>=
    BTR82_3B_PREVIEW_FRONT_CUT_Z,
  'El suport del far ha de continuar en contacte amb el nou frontal');
}
const wheelDiameter=2*.8125;
const stations=[-2.938,-.938,1.7505,3.585];
for(let i=1;i<stations.length;i++)
 assert(stations[i]-stations[i-1]>wheelDiameter+.10,'Les rodes no es poden tocar');

const byName=name=>model.getObjectByName(name);
for(const name of ['BTR82_v3_lowered_centre_hull','BTR82_v3_low_angular_turret',
 'BTR82_new_black_barrel','BTR82_new_black_muzzle','BTR82_3B_hardware'])
 assert(byName(name)?.isObject3D,name+' absent');
for(let i=0;i<4;i++)
 for(const part of ['housing','lens'])
  assert(byName('BTR82_3B_front_headlight_'+i+'_'+part)?.isMesh,'Falta focus '+i+' '+part);
for(const side of ['left','right'])
 for(const name of ['rear_guard_'+side+'_lower','front_vision_glass_'+side,
   'rear_hatch_'+side])
  assert(byName('BTR82_3B_'+name)?.isMesh,'Falta detall '+name);

assert.equal(byName('BTR82_v3_lowered_centre_hull').position.y,-.18);
assert.equal(byName('BTR82_v3_low_angular_turret').position.y,-.18);
const expectedGunY=1.71+(2.36-1.71)*.75-.18;
assert(Math.abs(byName('BTR82_new_black_barrel').position.y-expectedGunY)<1e-9);
assert(Math.abs(byName('BTR82_new_black_muzzle').position.y-expectedGunY)<1e-9,
 'El canó i la boca de foc han de baixar junts');
assert(Math.abs(byName('BTR82_new_black_barrel').position.z-(-1.53+BTR82_3B_TURRET_FORWARD_Z))<1e-9);

// La reducció ha de ser uniforme, ancorada al centre X/Z original i a
// la base Y, i no pot modificar la geometria de la resta del vehicle.
const sourceTurret=createBtr82TurretV3Geometry();
const original=sourceTurret.getAttribute('position');
for(let i=0;i<original.count;i++)
 original.setXYZ(i,-original.getX(i),original.getY(i),
  2*BTR82_3B_TURRET_PIVOT_Z-original.getZ(i));
compactBtr823BTurret(sourceTurret);
sourceTurret.computeBoundingBox();
const revisedTurret=byName('BTR82_v3_low_angular_turret');
const measured=revisedTurret.geometry;
measured.computeBoundingBox();
const a=sourceTurret.boundingBox,b=measured.boundingBox;
for(const dimension of ['x','y','z']){
 const oldSpan=a.max[dimension]-a.min[dimension];
 const newSpan=b.max[dimension]-b.min[dimension];
 assert(Math.abs(newSpan/oldSpan-.75)<2e-5,
  'La torreta ha de ser 25% més petita en '+dimension);
}
assert(Math.abs(a.min.y-b.min.y)<1e-6,'La base de la torreta no es pot alçar');
const centre=(bbox,key)=>(bbox.min[key]+bbox.max[key])/2;
assert(Math.abs(centre(a,'x')-centre(b,'x'))<1e-6,
 'La torreta no pot moure’s lateralment');
assert(Math.abs(centre(b,'z')-(BTR82_3B_TURRET_PIVOT_Z+
 (centre(a,'z')-BTR82_3B_TURRET_PIVOT_Z)*.75+BTR82_3B_TURRET_FORWARD_Z))<1e-6,
 'La torreta ha de seguir centrada sobre el mateix eix longitudinal');
const gunTail=byName('BTR82_new_black_barrel').position.z+2.90/2;
const ring=3*8,compactPos=measured.getAttribute('position');
const front=Math.min(...[...Array(8).keys()].map(i=>compactPos.getZ(ring+i)));
const rear=Math.max(...[...Array(8).keys()].map(i=>compactPos.getZ(ring+i)));
assert(gunTail>front+.15&&gunTail<rear,
 'La culata del canó ha de penetrar dins la nova torreta');
assert(Math.abs(compactPos.getY(ring)- (expectedGunY+.18))<1e-6,
 'El canó ha de conservar el contacte amb el rebaix més profund');
model.updateWorldMatrix(true,true);
const bounds=new Box3().setFromObject(model);
const size=bounds.getSize(new Vector3());
assert(size.x>3&&size.x<5&&size.z>10&&size.z<12,'Volum del 3B inesperat');
assert(size.y>3,'El model complet ha de tenir altura');

const file=readFileSync(new URL('../src/vehicles-externs-proves.mjs',import.meta.url),'utf8');
const page=readFileSync(new URL('../vehicles-externs-proves.html',import.meta.url),'utf8');
assert(file.includes('createBtr823BPreview()'),'El banc principal no construeix el 3B');
assert(file.includes("slot.outer.hidden=btrStudy?slots.indexOf(slot)>0:slots.indexOf(slot)>3"));
assert(!file.includes('studio.load(token)'),'No s’han de carregar els antics GLB');
assert(page.includes('live-editor-20261112-btr82-front-trim-5'),'Revisió de memòria cau');
console.log('PASS 3B preview: morro retallat darrere dels fars, frontal tancat/simètric, joc preservat');
