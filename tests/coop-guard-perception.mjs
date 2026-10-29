import assert from 'node:assert/strict';
import {createRelayCombat,guardInView} from '../server/coop-combat.mjs';
const guard={x:0,z:0,heading:0};
assert.equal(guardInView(guard,{x:0,z:-8}),true);
assert.equal(guardInView(guard,{x:0,z:8}),false);
assert.equal(guardInView(guard,{x:8,z:0}),false);
assert.equal(guardInView(guard,{x:Math.sqrt(3)*4,z:-4}),true,'120 degree boundary included');
assert.equal(guardInView(guard,{x:7,z:-3}),false);
assert.equal(guardInView(guard,{x:0,z:2}),true,'close awareness behind guard');
assert.equal(guardInView({...guard,heading:Math.PI/2},{x:-8,z:0}),true);
function setup({wall=false,disguised=false}={}){
 const actor={id:'a',x:0,y:.06,z:8,hp:20,hd:Math.PI},bag={bullets:24,grenades:2,disguised};
 const geometry={walls:wall?[{x0:-20,x1:20,z0:3,z1:4,y0:0,y1:8}]:[],buildings:[]};
 const options={meta:{id:'vision',targets:[{id:'guard',x:0,y:.06,z:0,hp:12,ai:true,heading:0,lastAttack:-90,patrol:[]}]},inventory:new Map([['a',bag]]),players:()=>[actor],damagePlayer:(_,n)=>actor.hp-=n,geometry:()=>geometry,world:()=>({heightAt:()=>0}),active:()=>true};
 return {actor,bag,geometry,options,combat:createRelayCombat(options)};
}
let f=setup();for(let t=1;t<=60;t++)f.combat.step(t);assert.equal(f.actor.hp,20,'unheard actor behind is not detected');assert.equal(f.combat.snapshot().targets[0].focus,null);
f.combat.command('a',{epoch:'vision',commandId:'behind-shot',weapon:'pistol'},60);
assert.ok(Math.abs(Math.abs(f.combat.snapshot().targets[0].heading)-Math.PI)<1e-8,'sound turns guard towards source');
for(let t=61;t<90;t++)f.combat.step(t);assert.equal(f.actor.hp,20,'sound cannot bypass warning');f.combat.step(90);assert.equal(f.actor.hp,20);for(let t=91;t<=93;t++)f.combat.step(t);assert.equal(f.actor.hp,18);
f.actor.z=-8;f.combat.step(94);assert.equal(f.combat.snapshot().targets[0].state,'search','escaping behind breaks visual contact');assert.equal(f.combat.snapshot().targets[0].lastKnown.z,8,'search remembers last sight, not hidden live position');
const record=f.combat.checkpoint(),restored=createRelayCombat({...f.options,record});for(let t=95;t<=108;t++){f.combat.step(t);restored.step(t);}assert.deepEqual(restored.snapshot(),f.combat.snapshot(),'search scan and remembered source survive checkpoint');
f=setup({wall:true});f.combat.command('a',{epoch:'vision',commandId:'covered-noise',weapon:'pistol'},1);for(let t=2;t<=120;t++)f.combat.step(t);assert.equal(f.actor.hp,20,'hearing behind wall never allows blind attack');assert.equal(f.combat.snapshot().targets[0].lastKnown.z,8);assert.equal(f.combat.snapshot().targets[0].state,'search');f.combat.step(121);assert.equal(f.combat.snapshot().targets[0].state,'patrol');
f=setup({disguised:true});f.actor.z=-8;for(let t=1;t<=60;t++)f.combat.step(t);assert.equal(f.actor.hp,20,'frontal disguised actor outside four metres stays hidden');
f=setup();f.actor.z=1.5;for(let t=1;t<=31;t++)f.combat.step(t);assert.equal(f.actor.hp,18,'close awareness detects nearby actor behind');
console.log('guard perception: directional cone/boundary/heading, close awareness, hearing/warning, cover, last-known search, disguise and checkpoint passed');
