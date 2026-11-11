// Comprovació real amb Three.js, sense WebGL ni fitxers GLB.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3,Vector3} from '../vendor/three-r186.module.mjs';
import {createBtr823BPreview} from '../src/btr82-3b-preview.mjs';

const model=createBtr823BPreview();
assert.equal(model.name,'BTR82_3B_revised_preview');
assert.equal(model.userData.btr82Preview,'3B-revised');
assert.equal(model.userData.btr82WheelCount,8);
assert.equal(model.userData.previewOnly,true);
const wheels=model.children.filter(o=>/^BTR82_3B_preview_wheel_\d+_[LR]$/.test(o.name));
assert.equal(wheels.length,8,'Hi ha d’haver 8 rodes independents');
for(const z of [-2.938,-.938,1.7505,3.585]){
 const pair=wheels.filter(w=>Math.abs(w.position.z-z)<1e-9);
 assert.equal(pair.length,2,'Cada eix ha de tenir 2 rodes');
 assert.equal(pair[0].position.x,-pair[1].position.x);
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
assert(Math.abs(byName('BTR82_new_black_barrel').position.y-2.18)<1e-9);
assert(Math.abs(byName('BTR82_new_black_barrel').position.z-(-1.53))<1e-9);
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
assert(page.includes('compact-lab-v20-btr82-3b-revised'),'Revisió de memòria cau');
console.log('PASS 3B preview: model autònom visible, 8 rodes separades, coronament compacte, detalls i només una targeta');
