import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shellColliders,knifeWindowHit} from '../src/building-shell.mjs';

const geom=shellColliders(0,-3,0,18,14,8,{doorSide:0},()=>.5);
const wall=geom.walls.find(w=>w.windowPanes?.length&&w.z0<0);
assert.ok(wall,'house has ground-floor windows');
const pane=wall.windowPanes[0],face=pane.axis==='z'?
 {x:pane.x,y:0,z:pane.z+2.1,hd:0}:
 {x:pane.x+2.1,y:0,z:pane.z,hd:Math.PI/2};
const towards={...face};
if(pane.axis==='z')towards.hd=pane.z<0?0:Math.PI;
else towards.hd=pane.x<0?Math.PI/2:-Math.PI/2;
const normal=pane.axis,sign=pane[normal]<0?-1:1;
if(normal==='z'){towards.z=pane.z+sign*2.1;towards.hd=sign>0?0:Math.PI;}
else{towards.x=pane.x+sign*2.1;towards.hd=sign>0?Math.PI/2:-Math.PI/2;}
const hit=knifeWindowHit(towards,geom.walls);
assert.ok(hit,'knife can strike a close window in front of the actor');
assert.equal(hit.wall,wall);
assert.equal(hit.paneIndex,0);
const intact=new Set([geom.walls.indexOf(wall)+':0']);
assert.equal(knifeWindowHit(towards,geom.walls,2.8,(i,p)=>!intact.has(i+':'+p)),null,
 'broken glass cannot be broken twice');
assert.equal(knifeWindowHit({...towards,hd:towards.hd+Math.PI},geom.walls),null,
 'knife cannot break glass behind the actor');
const tooFar={...towards,[normal]:pane[normal]+sign*6};
assert.equal(knifeWindowHit(tooFar,geom.walls),null,'knife has short reach');
const upstairs=shellColliders(0,-3,0,18,14,16,{doorSide:0,floors:2},()=>.5);
assert.equal(knifeWindowHit(towards,upstairs.walls)?.wall.upperFloorWindow,false,
 'at ground level only ground-floor glass is reachable');

const src=readFileSync(new URL('../src/combat.js',import.meta.url),'utf8');
const scope=src.slice(src.indexOf('function sniperReticlePoint('),src.indexOf('function sniperShotVector('));
assert.ok(scope.includes('if(t>=bestT)break;'),'sniper range sampling uses the valid local hit bound');
assert.ok(!scope.includes('flight.fraction'),'zoom shot must not access a projectile that does not exist');
// Executam el traçat real, amb la mira activa, sense cap flight preexistent.
const scopedWorld={
 P:{x:0,y:0,z:0},scopeYaw:0,
 wallCandidates:()=>[],buildingCandidates:()=>[],
 enemyCandidatesAt:()=>[],vehicleCandidatesAt:()=>[],
 bunkerProjectileSurface:()=>-100,
 THREE:{Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z}}},
 window:{HUNTER_BUILDING_SHELL:{wallShotHit:()=>null}}
};
const {runInNewContext}=await import('node:vm');
const focusPoint=runInNewContext(scope+';sniperReticlePoint({dx:0,dy:0,dz:-1},120)',scopedWorld);
assert.ok(Number.isFinite(focusPoint.z)&&focusPoint.z<-100,
 'a scoped sniper shot computes its target without throwing');
scopedWorld.wallCandidates=()=>[{}];
scopedWorld.window.HUNTER_BUILDING_SHELL.wallShotHit=()=>.25;
const blocked=runInNewContext(scope+';sniperReticlePoint({dx:0,dy:0,dz:-1},120)',scopedWorld);
assert.ok(blocked.z>-40&&blocked.z<-20,
 'the first obstacle limits the bullet even when the scope ray is longer');

const server=readFileSync(new URL('../server/coop-combat.mjs',import.meta.url),'utf8');
assert.ok(server.includes('knifeWindowHit(p,geometry().walls,2.8'),'server uses same knife collision');
assert.ok(server.includes("effect('glass',tick,{actorId,at:pane.point"),'server broadcasts the broken pane');

const manifest=readFileSync(new URL('../src/runtime-bundle.mjs',import.meta.url),'utf8');
const bundle=manifest.match(/RUNTIME_BUNDLE_PATH\s*=\s*"([^"]+)"/)?.[1];
assert.ok(bundle);
const runtime=readFileSync(new URL('../'+bundle,import.meta.url),'utf8');
assert.ok(runtime.includes('if(t>=bestT)break;'),'bundled sniper fix is present');
assert.ok(runtime.includes('HUNTER_BUILDING_SHELL.knifeWindowHit'),'bundled knife logic is present');
console.log('OK: scoped sniper shot and knife glass collisions/bundle');
