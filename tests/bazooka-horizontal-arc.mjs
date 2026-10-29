import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BAZOOKA_MAX_HORIZONTAL_YAW,limitBazookaHorizontalAim,createAimSelector} from '../src/aiming-core.mjs';

assert(Math.abs(BAZOOKA_MAX_HORIZONTAL_YAW-Math.PI/3)<1e-12,'Arc total 120°');
function heading(yaw,pitch=0){return [Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)]}
function bearing(direction,fx=0,fz=-1){
 const [dx,,dz]=direction,forward=Math.hypot(fx,fz),horizontal=Math.hypot(dx,dz);
 if(horizontal<1e-8)return 0;
 const ux=fx/forward,uz=fz/forward;
 return Math.atan2(ux*dz-uz*dx,ux*dx+uz*dz);
}
let count=0;
for(const pitch of [-1.2,-.8,0,.8,1.2])for(const degrees of [-179,-121,-91,-75,-60,-59,0,59,60,75,91,121,179]){
 const direction=heading(degrees*Math.PI/180,pitch),focus={target:'enemy',point:{x:1},kind:'enemy'},
   result=limitBazookaHorizontalAim(direction,0,-1,focus),
   outputYaw=bearing(result),expected=Math.max(-60,Math.min(60,degrees))*Math.PI/180;
 assert(Math.abs(outputYaw-expected)<1e-10,'Yaw bounded correctly '+degrees+'° pitch '+pitch);
 assert(Math.abs(Math.hypot(...result)-Math.hypot(...direction))<1e-10,'Speed/magnitude preserved');
 assert(Math.abs(result[1]-direction[1])<1e-10,'Elevation preserved');
 assert.equal(focus.target,Math.abs(degrees)>60?null:'enemy','Focus cleared only when safety clamp activates');
 count++;
}
for(const facingDeg of [-180,-90,-17,0,33,90,175]){
 const yaw=facingDeg*Math.PI/180,fx=Math.sin(yaw),fz=-Math.cos(yaw),
       direction=heading(yaw+Math.PI*.82,.45),
       result=limitBazookaHorizontalAim(direction,fx,fz);
 assert(Math.abs(Math.abs(bearing(result,fx,fz))-Math.PI/3)<1e-10);
 count++;
}
const target={id:'out-of-arc'},focus={};
const selector=createAimSelector({origin:{x:0,y:2,z:0},direction:[0,0,-1],range:185,
 cone:-1,shotClass:'heavy',focus});
selector.consider(target,'enemy',0,130,40,25);
assert.equal(focus.target,target,'Synthetic future wide aim selected rear-side enemy');
const clamped=limitBazookaHorizontalAim(selector.direction(),0,-1,focus);
assert(Math.abs(bearing(clamped))<=Math.PI/3+1e-10);
assert.equal(focus.target,null,'No false green reticle after clipping');
const combat=readFileSync(new URL('../src/combat.js',import.meta.url),'utf8');
const reticle=combat.slice(combat.indexOf('function updateBazookaReticle(dt){'),combat.indexOf('// Conservem el punt',combat.indexOf('function updateBazookaReticle(dt){')));
const a=combat.indexOf('else if(!cv&&bazookaEquipped&&inv.bazooka)');
const fire=combat.slice(a,combat.indexOf('else if(!cv&&ammo>0',a));
assert(reticle.includes('window.HUNTER_SHARED_AIMING.limitBazookaHorizontalAim('),'Reticle uses final yaw limit');
assert(fire.includes('window.HUNTER_SHARED_AIMING.limitBazookaHorizontalAim('),'Actual projectile uses final yaw limit');
const {weaponCatalog}=await import('../src/weapon-catalog.mjs');assert.equal(weaponCatalog.bazooka.cone,.68,'Normal target selection not widened');assert(combat.includes('BAZOOKA_AIM_CONE=window.HUNTER_SHARED_WEAPONS.weaponCatalog.bazooka.cone'));
console.log('PASS bazooka: '+count+' yaw/pitch samples, 120° hard cap, retained elevation, reticle and projectile');

