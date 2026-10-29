#!/usr/bin/env node
(async()=>{
const testSharedCombat=await import('../src/combat-rules.mjs'),testSharedVehicles=await import('../src/vehicle-dynamics-core.mjs');
// La resistència i la inèrcia d'envestida han de dependre del vehicle.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const core=fs.readFileSync(path.join(root,'src/game-core.js'),'utf8');
const dynamics=fs.readFileSync(path.join(root,'src/vehicle-dynamics.js'),'utf8');
const ctx={window:{HUNTER_SHARED_COMBAT:testSharedCombat,HUNTER_SHARED_VEHICLES:testSharedVehicles},Math};
vm.createContext(ctx);vm.runInContext(dynamics,ctx);
assert.equal(ctx.window.HUNTER_VEHICLE_DYNAMICS.types.camio.life,10,'El camió ha de tenir 10 PV');
const start=core.indexOf('function ramSpeedFactor('),end=core.indexOf('function killShark(',start);
assert.ok(start>=0&&end>start,'Falta la resposta dels vehicles pesants');
vm.runInContext(core.slice(start,end)+'\nthis.ram=ramSpeedFactor;this.crush=tankCanCrush;',ctx);
assert.equal(ctx.ram('camio',true),1,'Filferrada: el camió no pot frenar');
assert.equal(ctx.ram('camio',false),.55,'Les parets continuen frenant el camió');
assert.ok(ctx.ram('tanc',true)>.99,'Filferrada: el tanc no pot frenar gaire');
assert.ok(ctx.ram('tanc',false)>.99,'Paret: el tanc no pot frenar gaire');
assert.ok(ctx.crush({t:'tanc',v:1.5},{t:'cotxe'},5,1),'El tanc aixafa cotxes a baixa velocitat');
assert.ok(ctx.crush({t:'tanc',v:20},{t:'camio'},5,2.2),'El tanc aixafa camions');
assert.ok(!ctx.crush({t:'tanc',v:20},{t:'ferry'},5,10),'No ha de travessar ferris');
assert.ok(!ctx.crush({t:'tanc',v:20},{t:'tanc'},5,5),'No ha de travessar altres tancs');
assert.ok(core.includes("if(!heavy)v.v*=.9"),'Les palmeres no han de frenar camions ni tancs');
assert.ok(core.includes("if(!heavy)collisionDamageVehicle"),'Les palmeres no han de llevar PV al camió');
console.log('OK vehicles pesants: 10 PV, inèrcia i envestida');

})().catch(error=>{console.error(error);process.exitCode=1});
