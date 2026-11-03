import assert from 'node:assert/strict';
import {BAZOOKA_MAX_HORIZONTAL_YAW,limitBazookaHorizontalAim,createAimSelector} from '../src/aiming-core.mjs';
import {weaponCatalog} from '../src/weapon-catalog.mjs';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const profile=weaponCatalog.bazooka;
assert.equal(BAZOOKA_MAX_HORIZONTAL_YAW,Math.PI/4);
assert(Math.abs(profile.cone-Math.cos(Math.PI/4))<1e-12);
assert.equal(profile.vertical,Math.PI/4);
function target(yaw,pitch,dist=70){
 const side=Math.sin(yaw)*Math.cos(pitch)*dist;
 const front=Math.cos(yaw)*Math.cos(pitch)*dist;
 return {x:side,y:2+Math.sin(pitch)*dist,z:-front};
}
function selected(yaw,pitch,visible=true){
 const focus={},selector=createAimSelector({
  origin:{x:0,y:2,z:0},direction:[0,0,-1],range:185,
  cone:profile.cone,verticalCone:profile.vertical,shotClass:'heavy',
  focus,isClear:()=>true,isOnScreen:()=>visible
 });
 const t=target(yaw,pitch);
 selector.consider({id:'test'},'enemy',0,t.x,t.y,t.z);
 return selector.hasTarget;
}
assert.equal(selected(0,0),true);
assert.equal(selected(Math.PI/4-.002,0),true);
assert.equal(selected(Math.PI/4+.002,0),false,'No target beyond 45 degrees sideways');
assert.equal(selected(0,Math.PI/4-.002),true);
assert.equal(selected(0,Math.PI/4+.002),false,'No target above 45 degrees vertical');
assert.equal(selected(0,0,false),false,'Visible cone target off screen is rejected');
const direction=limitBazookaHorizontalAim([Math.sin(Math.PI/3),0,-Math.cos(Math.PI/3)],0,-1);
const yaw=Math.atan2(direction[0],-direction[2]);
assert(Math.abs(yaw-Math.PI/4)<1e-10,'Final rocket direction is limited to 45 degrees');
assert.match(source('src/combat.js'),/isOnScreen:isPersonalBazooka\?bazookaTargetOnScreen:undefined/);
assert.match(source('src/coop-world-runtime.js'),/bazookaReticleElement\?\.style\.display!=='none'/);
assert.match(source('server/coop-combat.mjs'),/alignment>=profile\.cone-\.001&&pitch<=profile\.vertical\+\.001/);
console.log('OK: bazooka 90° total, screen-visible targets and server shot validation');
