// Regressió geomètrica del candidat 3B de Paradoxa (sense WebGL).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three-r186.module.mjs';
import {applyBtr823BDetails} from '../src/btr82-3b-details.mjs';
import {createBtr82TurretV3Geometry} from '../src/btr82-hull-v3.mjs';
import {compactBtr823BTurret,BTR82_3B_TURRET_PIVOT_Z} from '../src/btr82-angular-facets.mjs';

const scene=new THREE.Group();
const group=applyBtr823BDetails(scene);
assert.equal(group.name,'BTR82_3B_hardware');
assert.equal(group.position.y,-.18);
assert.equal(scene.userData.btr82Details3B.previewOnly,true);
assert.deepEqual([scene.userData.btr82Details3B.rearGuards,
 scene.userData.btr82Details3B.roofHatches,
 scene.userData.btr82Details3B.roofVents,
 scene.userData.btr82Details3B.frontVisors,
 scene.userData.btr82Details3B.headlights],[2,2,2,2,4]);
assert.throws(()=>applyBtr823BDetails(scene),/duplicats/);
const count=prefix=>group.children.filter(node=>node.name.startsWith(prefix)).length;
assert(count('BTR82_3B_rear_guard_')>=7,'defenses i travessers posteriors');
assert.equal(count('BTR82_3B_rear_hatch_'),4,'dues trapes i marcs');
assert.equal(count('BTR82_3B_vent_slit_'),10,'reixetes de ventilació');
assert.equal(count('BTR82_3B_front_vision_glass_'),2,'dues mirilles davanteres');
assert.equal(count('BTR82_3B_front_headlight_'),8,'quatre focus amb caixa i lent');
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
assert(page.includes('model3-angular-20261111-a6'));
assert(page.includes('defenses posteriors'));
console.log('PASS model 3B Paradoxa: defenses i coberta posterior, mirilles, 4 focus i torreta compacta');
