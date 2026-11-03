import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {ARCADE_BLAST_STYLE,arcadeBlastKind,arcadeBlastDirection,arcadeBlastProfile,createArcadeBlastFX} from '../src/arcade-blast-fx.mjs';
import {readFileSync} from 'node:fs';
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
assert.equal(ARCADE_BLAST_STYLE.id,3);
assert.equal(ARCADE_BLAST_STYLE.coreOpacity,.4);
assert.equal(arcadeBlastKind({weapon:'grenade'}),'grenade');
assert.equal(arcadeBlastKind('c4'),'c4');
assert.equal(arcadeBlastKind({weapon:'bazooka',spl:8}),'projectile');
assert.equal(arcadeBlastKind({weapon:'projectile'}),'projectile');
assert.equal(arcadeBlastKind({weapon:'grenade',spl:16}),'grenade','grenades remain the small preset');
assert.equal(arcadeBlastKind({weapon:'tank',splash:8}),'projectile');
assert.equal(arcadeBlastKind({weapon:'bazooka'}),'grenade');
assert.equal(arcadeBlastKind(null),'grenade');
const grenade=arcadeBlastProfile('grenade'),projectile=arcadeBlastProfile('projectile'),c4=arcadeBlastProfile('c4');
assert.equal(grenade.scale,1);
assert.equal(projectile.scale,1.5);
assert.equal(c4.scale,2.55,'C4 is 50% larger than the previous 1.7×');
assert(c4.scale>projectile.scale&&c4.duration>grenade.duration);
assert.deepEqual(arcadeBlastDirection({vx:0,vy:0,vz:25}),{x:0,y:0,z:1});
assert.deepEqual(arcadeBlastDirection({direction:{x:-10,y:0,z:0}}),{x:-1,y:0,z:0});
assert.equal(arcadeBlastDirection({vx:0,vy:0,vz:0}),null);
assert(c4.shards>grenade.shards);
assert(arcadeBlastProfile('c4','mobile').sparks<c4.sparks);
assert.equal(arcadeBlastProfile('bazooka'),null);
const scene=new THREE.Scene(),fx=createArcadeBlastFX(THREE,scene,{limit:2});
assert.equal(fx.active,0);
assert.equal(fx.emit(3,0,-2,'grenade',17),true);
assert.equal(fx.active,1);
assert.equal(fx.emit(11,0,6,{weapon:'c4'},25),true);
assert.equal(fx.active,2);
assert.equal(fx.emit(0,0,0,{weapon:'projectile',direction:{x:0,y:0,z:1}}),true);
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
assert.match(combat,/HUNTER_ARCADE_BLAST_FX\.emit\(x,y,z,kind==='projectile'/);
assert.match(combat,/vx:source\.vx,vy:source\.vy,vz:source\.vz/);
assert.match(combat,/direction:source\.direction/);
assert.doesNotMatch(combat,/blastRingG|fx\.push\(/,'Old blast rings must not remain in combat');
assert.doesNotMatch(load('src/game-core.js'),/blastRingG|grenades=\[\],fx=\[\]/,'Old ring geometry and collection removed');
assert.match(combat,/HUNTER_ARCADE_BLAST_FX\?\.update\(dt\)/);
assert.match(combat,/boom\(b\.x,b\.y,b\.z,48,COMBAT_BALANCE\.weapons\.c4,'b',null,'c4'\)/);
const coop=load('src/coop-world-runtime.js');
assert.match(coop,/direction:effect\.direction/);
assert.match(coop,/weapon:effect\.weapon,splash:effect\.weapon==='projectile'/);
const server=load('server/coop-combat.mjs');
assert.match(server,/weapon:blast\.weapon==='c4'\?'c4':blast\.projectile\?'projectile':'grenade'/);
assert.match(server,/projectile:true,direction:\{x:p\.vx,y:p\.vy,z:p\.vz\}/);
assert.match(server,/actorId:g\.actorId,weapon:g\.weapon,ownerOnly:true/);
console.log('arcade blast FX: three scales 1/1.5/2.55, projectile direction, upright smoke, shared single/COOP FX, pooling and cleanup OK');
