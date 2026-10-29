import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enemyAccuracy} from '../src/enemy-accuracy-core.mjs';
import {accuracyTrace} from './helpers/enemy-accuracy-trace.mjs';
import {createRelayCombat} from '../server/coop-combat.mjs';
assert.equal(accuracyTrace(enemyAccuracy),JSON.parse(readFileSync(new URL('./fixtures/enemy-accuracy-trace.json',import.meta.url))).hash,'198 pre-extraction cases retain spread, sampled direction and theoretical chance');
assert.equal(enemyAccuracy.difficultyScale(.6),3);assert.equal(enemyAccuracy.difficultyScale(1),1.5);assert.equal(enemyAccuracy.difficultyScale(1.5),1);assert.deepEqual(enemyAccuracy.direction(1,'rifle',0,0,-10,(a,b)=>(a+b)/2),[0,0,-1]);
function fixture(){const actors=[{id:'a',x:0,y:0,z:0,hp:20},{id:'b',x:50,y:0,z:0,hp:20}],geometry={walls:[]},meta={id:'enemy-flight',seed:67,difficulty:1,targets:[{id:'guard',x:0,y:0,z:-16,hp:12,ai:true,heading:Math.PI,seenTicks:30,focus:'a',lastAttack:-90,patrol:[]}]},options={meta,inventory:new Map(actors.map(p=>[p.id,{}])),players:()=>actors,damagePlayer:(id,n)=>{actors.find(p=>p.id===id).hp-=n;},geometry:()=>geometry,world:()=>({heightAt:()=>0}),active:()=>true};return {actors,geometry,options,combat:createRelayCombat(options)};}
let f=fixture();f.combat.step(1);assert.equal(f.actors[0].hp,20);assert.equal(f.combat.snapshot().projectiles[0].enemy,true);assert.equal(Math.round(Math.hypot(f.combat.snapshot().projectiles[0].vx,f.combat.snapshot().projectiles[0].vy,f.combat.snapshot().projectiles[0].vz)),70);const record=f.combat.checkpoint(),restored=createRelayCombat({...f.options,record});for(let t=2;t<=7;t++){f.combat.step(t);restored.step(t);}assert.deepEqual(f.combat.checkpoint(),restored.checkpoint(),'restore preserves RNG and trajectory before impact');f.combat.step(8);assert.equal(f.actors[0].hp,18,'damage waits until the bullet reaches the body');
f=fixture();f.combat.step(1);f.actors[0].x=10;for(let t=2;t<=12;t++)f.combat.step(t);assert.equal(f.actors[0].hp,20,'player can evade an already-fired bullet');
f=fixture();f.combat.step(1);f.geometry.walls.push({x0:-4,x1:4,z0:-8,z1:-7.8,y0:0,y1:6});for(let t=2;t<=12;t++)f.combat.step(t);assert.equal(f.actors[0].hp,20,'new cover blocks an incoming guard bullet');
// Another actor can intercept the same physical trajectory; it is not target-locked.
f=fixture();f.combat.step(1);f.actors[1].x=0;f.actors[1].z=-8;for(let t=2;t<=7;t++)f.combat.step(t);assert.equal(f.actors[1].hp,18);assert.equal(f.actors[0].hp,20);
console.log('shared enemy accuracy: 198 frozen original profiles, difficulty, deterministic RNG/flight restore, delayed damage, evasion, cover and first actor contact passed');
