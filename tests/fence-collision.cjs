#!/usr/bin/env node
// Les col·lisions amb filferrades han de tocar el vehicle real i no el radi de cerca.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=fs.readFileSync(path.join(__dirname,'../src/game-core.js'),'utf8');
const from=core.indexOf('function fenceVehicleContact('),to=core.indexOf('const obbAxes=',from);
assert.ok(from>=0&&to>from,'No s’ha trobat la col·lisió precisa');
const recoveryStart=core.indexOf('function mayRamWhileRecovering(');
const recoveryEnd=core.indexOf('function tankCanCrush(',recoveryStart);
assert.ok(recoveryStart>=0&&recoveryEnd>recoveryStart);
const ctx={Math,Number};vm.createContext(ctx);
vm.runInContext(core.slice(from,to)+'\nthis.contact=fenceVehicleContact;',ctx);
vm.runInContext(core.slice(recoveryStart,recoveryEnd)+'\nthis.canRam=mayRamWhileRecovering;',ctx);
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
assert.ok(core.includes('ax:x1,az:z1,bx:x2,bz:z2'),'Cada tram ha de conservar els extrems reals');
assert.ok(core.includes('const hitX=touch?.x??w.cx'),'L’efecte ha de sortir al contacte real');
console.log('OK filferrades: col·lisió precisa i inèrcia contínua');
