import assert from 'node:assert/strict';
import {createRelayCombat} from '../server/coop-combat.mjs';
import {validatePlayerInput} from '../src/player-simulation.mjs';
const actor={id:'a',x:0,y:0,z:0,hp:25,hd:0},bag={weapon:'pistol',bullets:120},geometry={walls:[],buildings:[]};
const options={meta:{id:'held',mode:'native',targets:[]},players:()=>[actor],inventory:new Map([['a',bag]]),world:()=>({heightAt:()=>0}),geometry:()=>geometry,active:()=>true};
let combat=createRelayCombat(options);const shots=[];
for(let tick=1;tick<=60;tick++){
 combat.hold('a',tick);combat.hold('a',tick);combat.step(tick);
 for(const effect of combat.snapshot().effects)if(effect.kind==='shot'&&effect.tick===tick)shots.push(tick);
 if(tick===30)combat=createRelayCombat({...options,record:combat.checkpoint()});
}
const lastShot=combat.snapshot().effects.find(e=>e.kind==='shot'&&e.tick===57);
assert(lastShot,'El darrer tret conserva efecte autoritatiu');
assert.match(lastShot.projectileId,/^bullet-[0-9]+$/,'El tret confirmat identifica la bala fins i tot si desapareix abans del següent snapshot');
assert.equal(lastShot.weapon,'pistol');
assert(Math.abs(lastShot.from.x)<1e-9);
assert(Math.abs(lastShot.from.y-1.5)<1e-9);
assert(Math.abs(lastShot.from.z+.7)<1e-9,
 'Les bales COOP han de sortir davant el jugador, igual que la pistola individual');
assert.deepEqual(shots,[1,8,15,22,29,36,43,50,57],'continuous server fire follows shared cooldown independently of 10Hz snapshots and round trips');assert.equal(bag.bullets,111,'one cartridge per successful shot, including checkpoint restoration');
assert.ok(validatePlayerInput({forward:1,turn:0,strafe:0,run:false,climb:0,crouch:false,fire:true}));assert.equal(validatePlayerInput({forward:1,turn:0,strafe:0,run:false,fire:'yes'}),false);
console.log('native held fire: shared server cadence, no per-shot RPC, ammo conservation, duplicate tick gate and checkpoint recovery passed');
