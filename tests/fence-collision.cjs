#!/usr/bin/env node
// Les col·lisions amb filferrades han de tocar el vehicle real i no el radi de cerca.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=fs.readFileSync(path.join(__dirname,'../src/game-core.js'),'utf8');
const from=core.indexOf('function fenceVehicleContact('),to=core.indexOf('const obbAxes=',from);
assert.ok(from>=0&&to>from,'No s’ha trobat la col·lisió precisa');
const recoveryStart=core.indexOf('function vehicleRamThreshold(');
const recoveryEnd=core.indexOf('function tankCanCrush(',recoveryStart);
assert.ok(recoveryStart>=0&&recoveryEnd>recoveryStart);
const ctx={Math,Number};vm.createContext(ctx);
vm.runInContext(core.slice(from,to)+'\nthis.contact=fenceVehicleContact;',ctx);
vm.runInContext(core.slice(recoveryStart,recoveryEnd)+
 '\nthis.canRam=mayRamWhileRecovering;this.canBreak=vehicleCanBreakBarrier;this.threshold=vehicleRamThreshold;',ctx);
const box={x:0,z:0,hd:0,w:9.45,d:15.975,v:{v:18}},
  fence=(ax,az,bx,bz)=>({barbed:true,ax,az,bx,bz});
assert.equal(ctx.contact(fence(-3,-11,3,-11),box),null,
  'La filferrada pròxima però davant del radi real no ha de petar');
assert.equal(ctx.contact(fence(9,-3,9,3),box),null,
  'La filferrada lateral fora del buc no ha de petar');
let hit=ctx.contact(fence(-3,-7,3,-7),box);
assert.ok(hit&&Math.abs(hit.z+7)<1e-7&&Math.abs(hit.x)<=3,
  'El contacte frontal ha de quedar sobre la filferrada tocada');
hit=ctx.contact(fence(-7,-3,-7,3),{...box,hd:Math.PI/2});
assert.ok(hit&&Math.abs(hit.x+7)<1e-7,
  'El contacte funciona també amb el vehicle girat');
assert.equal(ctx.canRam('tanc',true,.08),true,'El tanc no s’atura per recuperació');
assert.equal(ctx.canRam('camio',true,.08),true,'El camió no s’atura en una segona filferrada');
assert.equal(ctx.canRam('cotxe',true,.08),false,'Els vehicles lleugers mantenen la recuperació');
// Una moto marxa enrere dins un recinte estret no pot trencar la
// filferrada ni rebre els 2 PV de dany de l'embestida.
assert.equal(ctx.threshold({t:'moto',v:-12},true),21);
assert.equal(ctx.canBreak({t:'moto',v:-12},true),false);
assert.equal(ctx.canBreak({t:'moto',v:-6},true),false);
assert.equal(ctx.canBreak({t:'moto',v:15},true),false);
assert.equal(ctx.canBreak({t:'moto',v:17},true),true);
assert.equal(ctx.canBreak({t:'moto',v:21},false),false);
assert.equal(ctx.canBreak({t:'moto',v:24},false),true);
// Els pesants conserven el seu comportament propi, sense destrossar
// accidentalment una tanca al primer toc.
assert.equal(ctx.canBreak({t:'camio',v:8},true),false);
assert.equal(ctx.canBreak({t:'camio',v:14},true),true);
assert.equal(ctx.canBreak({t:'tanc',v:1},true),true);
assert.ok(core.includes('if(vehicleCanBreakBarrier(v,barbed)){'),
 "La col·lisió física real ha d'aplicar el nou llindar");
assert.ok(core.includes('if(speed>10){\n        collisionDamageVehicle(v,'),
 'Les roques no poden danyar el vehicle a poca velocitat');
assert.ok(core.includes('if(!heavy&&speed<=10){'),
 'No es poden enderrocar palmeres amb maniobres lentes');
assert.ok(core.includes('ax:x1,az:z1,bx:x2,bz:z2'),'Cada tram ha de conservar els extrems reals');
assert.ok(core.includes('const hitX=touch?.x??w.cx'),'L’efecte ha de sortir al contacte real');
console.log('OK filferrades: col·lisió precisa i inèrcia contínua');
