// Regressió geomètrica del candidat 3B de Paradoxa (sense WebGL).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three-r186.module.mjs';
import {applyBtr823BDetails,createBtr823BHardwareBatch,
 BTR82_3B_SIDE_ACCESS} from '../src/btr82-3b-details.mjs';
import {createBtr82TurretV3Geometry} from '../src/btr82-hull-v3.mjs';
import {compactBtr823BTurret,BTR82_3B_TURRET_PIVOT_Z} from '../src/btr82-angular-facets.mjs';

const scene=new THREE.Group();
const group=applyBtr823BDetails(scene);
assert.equal(group.name,'BTR82_3B_hardware');
assert.equal(group.position.y,-.18);
assert.equal(scene.userData.btr82Details3B.visorHorizontal,true);
assert.deepEqual([scene.userData.btr82Details3B.rearGuards,
 scene.userData.btr82Details3B.roofHatches,
 scene.userData.btr82Details3B.roofVents,
 scene.userData.btr82Details3B.frontVisors,
 scene.userData.btr82Details3B.headlights,
 scene.userData.btr82Details3B.sideAccessDoors],[2,2,2,2,4,2]);
assert.throws(()=>applyBtr823BDetails(scene),/duplicats/);
const count=prefix=>group.children.filter(node=>node.name.startsWith(prefix)).length;
assert(count('BTR82_3B_rear_guard_')>=7,'defenses i travessers posteriors');
assert.equal(count('BTR82_3B_rear_hatch_'),4,'dues trapes i marcs');
assert.equal(count('BTR82_3B_vent_slit_'),10,'reixetes de ventilació');
assert.equal(count('BTR82_3B_front_vision_glass_'),2,'dues mirilles davanteres');
assert.equal(count('BTR82_3B_front_headlight_'),8,'quatre focus amb caixa i lent');
assert.equal(count('BTR82_3B_side_access_'),12,
 'Hi ha d’haver dues comportes, amb contorn, placa, frontisses i nansa');
const wheelZ=[-.938,1.7505],radius=.8125;
assert.equal(BTR82_3B_SIDE_ACCESS.centreZ,(wheelZ[0]+wheelZ[1])/2);
for(const side of ['left','right']){
 const outline=scene.getObjectByName('BTR82_3B_side_access_'+side+'_outline');
 const door=scene.getObjectByName('BTR82_3B_side_access_'+side+'_leaf');
 const latch=scene.getObjectByName('BTR82_3B_side_access_'+side+'_latch');
 const handle=scene.getObjectByName('BTR82_3B_side_access_'+side+'_handle');
 assert(outline?.isMesh&&door?.isMesh&&latch?.isMesh&&handle?.isMesh,
  'Comporta incompleta al lateral '+side);
 assert.equal(door.material.color.getHex(),0x59684f,'Fulla de blindatge verda');
 assert.equal(outline.material.color.getHex(),0x29342e,'Junta fosca visible');
 for(const part of [door,outline]){
  const position=part.geometry.getAttribute('position');
  for(let i=0;i<position.count;i++){
   const z=position.getZ(i);
   assert(z>wheelZ[0]+radius+.025&&z<wheelZ[1]-radius-.025,
    'La comporta no pot arribar a les rodes');
   assert(position.getY(i)>=1.02&&position.getY(i)<=1.60);
   assert(Math.abs(position.getX(i))>1.60,'El blindatge ha de ser a l’exterior del casc');
   assert((side==='left'?-1:1)*position.getX(i)>0,'Costat invertit');
  }
 }
 for(const i of [0,1])assert(scene.getObjectByName(
  'BTR82_3B_side_access_'+side+'_hinge_'+i)?.isMesh);
 const a=outline.geometry.getAttribute('position');
 // Tres nivells: la placa segueix el bisell del casc, no flota vertical.
 assert(Math.abs(a.getX(0)-a.getX(2))>.10);
 assert(Math.abs(a.getX(2)-a.getX(4))>.20);
}


const keelScene=new THREE.Group();
const keelGroup=applyBtr823BDetails(keelScene,{extendSideAccessToKeel:true});
assert.equal(keelScene.userData.btr82Details3B.sideAccessToKeel,true);
assert.equal(scene.userData.btr82Details3B.sideAccessToKeel,false,
 'El joc conserva la comporta anterior fins que el candidat sigui aprovat');
assert.equal(keelGroup.children.length,group.children.length,
 'No s’hi afegeixen malles: s’allarguen les dues comportes existents');
for(const side of ['left','right']){
 const sign=side==='left'?-1:1;
 const prev=scene.getObjectByName('BTR82_3B_side_access_'+side+'_outline');
 const frame=keelScene.getObjectByName('BTR82_3B_side_access_'+side+'_outline');
 const leaf=keelScene.getObjectByName('BTR82_3B_side_access_'+side+'_leaf');
 const oldY=prev.geometry.getAttribute('position');
 const f=frame.geometry.getAttribute('position'),p=leaf.geometry.getAttribute('position');
 assert.equal(oldY.count,6,'El model del joc manté el perfil curt de 3 nivells');
 assert.equal(f.count,14,'El contorn nou segueix 7 nivells reals del lateral');
 assert.equal(p.count,14,'La fulla ha de seguir també els plecs del casc');
 const levels=[
  [-.32,1.34],[-.08,1.405],[.96,1.47],[.96,1.59],
  [1.08,1.89],[1.42,1.91]
 ];
 for(const [i,[height,halfWidth]] of levels.entries()){
  assert(Math.abs(f.getY(i*2)-height)<1e-6,'Alçada de blindatge lateral incorrecta');
  assert(Math.abs(f.getX(i*2)*sign-(halfWidth+.048))<1e-6,
   'El contorn ha de seguir el pendent exacte del xassís');
 }
 assert(Math.abs(f.getY(0)-BTR82_3B_SIDE_ACCESS.keelY)<1e-6,
  'La comporta ha d’arribar fins a la quilla');
 assert(Math.abs(p.getY(0)-(-.285))<1e-6,
  'La placa verda ha de baixar fins gairebé la quilla');
 assert(f.getX(4)!==f.getX(6),'Conservar l’esglaó del lateral a Y=.96');
 assert.equal(leaf.material.color.getHex(),0x59684f);
 assert.equal(frame.material.color.getHex(),0x29342e);
 for(const part of [frame,leaf]){
  const arr=part.geometry.getAttribute('position');
  for(let i=0;i<arr.count;i++){
   const z=arr.getZ(i);
   assert(z>wheelZ[0]+radius+.025&&z<wheelZ[1]-radius-.025,
    'La comporta extensa no pot tocar les rodes');
   assert(Math.sign(arr.getX(i))===sign,
    'La comporta ha de romandre al seu costat de la tanqueta');
  }
 }
}

for(const side of ['left','right']){
 const frame=scene.getObjectByName('BTR82_3B_front_vision_frame_'+side);
 const glass=scene.getObjectByName('BTR82_3B_front_vision_glass_'+side);
 assert.equal(frame.rotation.x,0,'La mirilla ha de ser horitzontal');
 assert.equal(glass.rotation.x,0,'El vidre de la mirilla ha de ser horitzontal');
 assert.equal(frame.material.color.getHex(),0x5f6c53,
  'La carcassa no pot continuar grisa; ha de ser verd xassís');
 assert(frame.geometry.parameters.depth>=.80,
  'El blindatge s’ha d’allargar dins del xassís');
 assert(frame.position.z+frame.geometry.parameters.depth/2>-3.7,
  'L’extrem posterior del blindatge ha de penetrar al casc');
 assert(glass.position.z<frame.position.z,'El vidre ha d’apuntar cap endavant (-Z)');
 assert(glass.geometry.parameters.height>=.10,
  'La superfície negra ha de ser frontal i vertical, no plana damunt del casc');
 assert(glass.geometry.parameters.depth<.06,'La lent és una làmina prima frontal');
 assert(Math.abs(glass.position.y-frame.position.y)<.06,
  'La lent ha d’anar al davant de la carcassa, no damunt');
 assert(glass.position.z+glass.geometry.parameters.depth/2<
    frame.position.z-frame.geometry.parameters.depth/2+.025,
  'La cara negra ha de quedar just al frontal i penetrar-hi un poc');
}
const batch=createBtr823BHardwareBatch(THREE);
assert(batch.userData.btr82HardwareBatch);
assert.equal(batch.userData.previewDetailCount,65,
 'Les 12 peces de les dues comportes s’afegeixen als 53 detalls originals');
assert.equal(batch.index,null,'El lot ha d’estar sense índex per als colors compartits');
assert(batch.getAttribute('position').count>1000);
assert.equal(batch.getAttribute('color').count,batch.getAttribute('position').count);
assert.equal(batch.getAttribute('normal').count,batch.getAttribute('position').count);
for(const mesh of group.children.filter(node=>node.isMesh)){
 assert(mesh.geometry.getAttribute('position')?.count>0,'geometria buida: '+mesh.name);
 const p=mesh.geometry.getAttribute('position');
 for(const v of p.array)assert(Number.isFinite(v),'coordenada invàlida: '+mesh.name);
}

const geometry=createBtr82TurretV3Geometry();
const attr=geometry.getAttribute('position');
for(let i=0;i<attr.count;i++)attr.setXYZ(i,-attr.getX(i),attr.getY(i),
 2*BTR82_3B_TURRET_PIVOT_Z-attr.getZ(i));
const rawTop=Math.max(...[...Array(attr.count).keys()].map(i=>attr.getY(i)));
const rawTopFront=Math.min(...[...Array(attr.count).keys()]
 .filter(i=>attr.getY(i)>2.78).map(i=>attr.getZ(i)));
compactBtr823BTurret(geometry);
const top=Math.max(...[...Array(attr.count).keys()].map(i=>attr.getY(i)));
const topFront=Math.min(...[...Array(attr.count).keys()]
 .filter(i=>attr.getY(i)>2.5).map(i=>attr.getZ(i)));
assert(Math.abs(rawTop-top-.26)<1e-6,'la torreta s’abaixa 26 cm a la part superior');
assert(topFront>rawTopFront+.1,'voladís frontal superior més curt');
assert([...Array(attr.count).keys()].some(i=>Math.abs(attr.getY(i)-2.36)<1e-6),
 'es conserva el rebaix del canó a 2,36 m');

const viewer=readFileSync(new URL('../src/btr82-six-nose-lab.mjs',import.meta.url),'utf8');
const page=readFileSync(new URL('../btr82-model3-angular.html',import.meta.url),'utf8');
assert(viewer.includes("if(angularMode&&method.id==='angular-strong')applyBtr823BDetails(scene)"));
assert(page.includes('model3-angular-20261111-a7'));
assert(page.includes('defenses posteriors'));
console.log('PASS model 3B: dues comportes fins a la quilla al visor, eixos lliures, joc original i lot de detalls intactes');
