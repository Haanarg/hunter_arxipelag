#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three-r186.module.mjs';

const read=name=>fs.readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
const buildingsWindow={};
vm.runInNewContext(read('buildings.js'),{window:buildingsWindow});
const materials=new Map(),material=color=>{
 if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color}));
 return materials.get(color);
};
const visual=buildingsWindow.HUNTER_BUILDINGS.create(THREE,{material,materialProfile:()=>({})})
 .createHangarShell({width:24,depth:33,height:12,wallColor:0xb2b4b8,roofColor:0x71818a});
const world=new THREE.Group(),dgeo=new THREE.BoxGeometry(1,1,1),DB=[];
visual.group.position.set(37,8,-51);world.add(visual.group);
visual.group.updateMatrixWorld(true);
const b={o:visual.group,x:37,z:-51,fy:8,w:24,d:33,h:12,
 roof:visual.roof,rhp:10,hangar:true};
const segments=b.roof.userData.hitSegments;
assert.equal(segments.length,10,'the arched roof consists of ten sections');
assert.ok(b.roof.children.some(m=>m.userData.roofBatch),'roof keeps its original batched meshes');
const originalRoofMaterial=b.roof.children.find(m=>m.isMesh).material;

const core=read('game-core.js');
const start=core.indexOf('function shatterHangarRoof(b){');
const stop=core.indexOf('function fragileDebrisWaterHeight(',start);
assert.ok(start>=0&&stop>start,'must use production destruction implementation');
const effects={puff:0,debris:0,sound:0};
const state={THREE,world,DB,dgeo,items:[],
 rn:(a,z)=>(a+z)*.5,
 puff:()=>effects.puff++,
 debris:()=>effects.debris++,
 snd:()=>effects.sound++,
 destroyInteriorStair:()=>{throw Error('Unexpected interior stair collapse')}
};
vm.runInNewContext(core.slice(start,stop)+'\n globalThis.breakRoof=roofBreak;',state);

const combat=read('combat.js'),cs=combat.indexOf('function hangarRoofSegmentT('),
 ce=combat.indexOf('function updPj(dt)',cs);
assert.ok(cs>=0&&ce>cs,'must test actual hangar collision function');
let collisionCalls=0;
const collisions={Math,segmentAabbT:()=>{collisionCalls++;return .3}};
vm.runInNewContext(combat.slice(cs,ce)+'\n globalThis.roofHit=hangarRoofSegmentT;',collisions);
const testRay=[b.x,b.fy+20,b.z,b.x,b.fy-3,b.z];
assert.equal(collisions.roofHit(...testRay,b),.3,'intact roof intercepts projectile');
assert.ok(collisionCalls>0);

b.roof.visible=false; // Camera was already inside the hangar.
state.breakRoof(b);
assert.equal(b.rb,1);
assert.equal(b.rhp,0);
assert.equal(b.roof.visible,false);
assert.equal(DB.length,30,'ten roof sections break into three separate metal panels');
assert.equal(world.children.length,31,'fragments are not attached to the hidden building roof');
const expected=segments[0],first=DB[0].m,where=new THREE.Vector3(
 expected.x,expected.y,-expected.depth/2+expected.depth/6).applyMatrix4(b.roof.matrixWorld);
assert.ok(first.position.distanceTo(where)<1e-5,'fragment starts on the original arched roof');
assert.equal(first.geometry,dgeo,'fragments share one box geometry');
assert.equal(first.material,originalRoofMaterial,'fragments reuse the original metal material');
assert.ok(DB.every(d=>d.m.visible&&d.m.parent===world&&d.life>0),'shards are independently visible and animated');
assert.equal(effects.sound,1);
assert.ok(effects.puff>=12&&effects.debris>=10,'keep dust and minor debris');
const before=collisionCalls;
assert.equal(collisions.roofHit(...testRay,b),null,'destroyed hangar must not stop projectiles');
assert.equal(collisionCalls,before,'skip physical roof tests after destruction');
state.breakRoof(b);
assert.equal(DB.length,30,'repeated damage does not spawn roof twice');
assert.equal(effects.sound,1);

const houseRoof=new THREE.Mesh(new THREE.BoxGeometry(8,.3,9),material(0x977a53));
const house={x:-5,z:11,fy:2,w:8,d:9,h:5,roof:houseRoof,rhp:8};
state.breakRoof(house);
assert.equal(houseRoof.visible,false,'ordinary building roof destruction unchanged');
assert.equal(DB.length,30,'ordinary buildings do not spawn hangar panels');

console.log('PASS: hangar roof breaks into independently visible falling panels; no invisible roof collision or duplicate destruction');
