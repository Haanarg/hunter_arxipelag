import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {ARCADE_BLAST_STYLE,arcadeBlastKind,arcadeBlastProfile,createArcadeBlastFX} from '../src/arcade-blast-fx.mjs';
import {readFileSync} from 'node:fs';
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
assert.equal(ARCADE_BLAST_STYLE.id,3);
assert.equal(ARCADE_BLAST_STYLE.coreOpacity,.4);
assert.equal(arcadeBlastKind({weapon:'grenade'}),'grenade');
assert.equal(arcadeBlastKind('c4'),'c4');
assert.equal(arcadeBlastKind({weapon:'bazooka'}),null);
assert.equal(arcadeBlastKind(null),null);
const grenade=arcadeBlastProfile('grenade'),c4=arcadeBlastProfile('c4');
assert(c4.scale>grenade.scale&&c4.duration>grenade.duration);
assert(c4.shards>grenade.shards);
assert(arcadeBlastProfile('c4','mobile').sparks<c4.sparks);
assert.equal(arcadeBlastProfile('bazooka'),null);
const scene=new THREE.Scene(),fx=createArcadeBlastFX(THREE,scene,{limit:2});
assert.equal(fx.active,0);
assert.equal(fx.emit(3,0,-2,'grenade',17),true);
assert.equal(fx.active,1);
assert.equal(fx.emit(11,0,6,{weapon:'c4'},25),true);
assert.equal(fx.active,2);
assert.equal(fx.emit(0,0,0,{weapon:'bazooka'}),false);
assert.equal(fx.emit(NaN,0,0,'grenade'),false);
assert.equal(fx.active,2);
assert.equal(scene.children.length,2,'exactly two reused blast groups');
for(const group of scene.children){
 const meshes=group.children.filter(c=>c.isInstancedMesh);
 assert.equal(meshes.length,5,'one instanced draw group per particle type');
 assert(meshes.every(c=>c.count>0&&!!c.instanceColor));
 assert(meshes.every(c=>c.material.transparent&&c.material.depthWrite===false),
  'translucent FX cannot hide intact walls or write depth');
 assert(group.children.some(c=>c.isMesh&&c.geometry.type==='SphereGeometry'),
  'spherical shockwave visible in 3D');
}
fx.update(.1);
for(const group of scene.children){
 assert(group.children.filter(c=>c.isInstancedMesh).every(c=>c.instanceMatrix.needsUpdate!==undefined||
   c.instanceMatrix.version>0));
}
assert.equal(fx.emit(20,1,10,'grenade',33),true,'bounded pool recycles one blast');
assert.equal(scene.children.length,2,'bounded pool avoids unbounded meshes');
for(let i=0;i<95;i++)fx.update(.075);
assert.equal(fx.active,0,'all visual effects expire');
fx.emit(0,0,0,'c4');
fx.clear();
assert.equal(fx.active,0,'stop COOP may clear stale visual effects');
fx.dispose();
assert.equal(scene.children.length,0,'scene is restored and materials released');
// Source-level integration contracts for both runtime paths.
const combat=load('src/combat.js');
assert.match(combat,/HUNTER_ARCADE_BLAST_FX\.emit\(x,y,z,kind\)/);
assert.match(combat,/HUNTER_ARCADE_BLAST_FX\?\.update\(dt\)/);
assert.match(combat,/boom\(b\.x,b\.y,b\.z,48,COMBAT_BALANCE\.weapons\.c4,'b',null,'c4'\)/);
const coop=load('src/coop-world-runtime.js');
assert.match(coop,/presentExplosion\(effect\.at\.x,effect\.at\.y,effect\.at\.z,effect\.radius,\{weapon:effect\.weapon\}\)/);
const server=load('server/coop-combat.mjs');
assert.match(server,/weapon:blast\.weapon\|\|null/);
assert.match(server,/actorId:g\.actorId,weapon:g\.weapon,ownerOnly:true/);
console.log('arcade blast FX: model 03, grenade/C4 parity, transparent shared geometry, bounded pooling, cleanup and server metadata OK');
