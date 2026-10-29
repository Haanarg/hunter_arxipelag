(async()=>{
const shared=await import('../src/combat-rules.mjs'),aiming=await import('../src/aiming-core.mjs');
'use strict';
// Ràfegues del fusell: comprova la seqüència real, sense arrencar el WebGL.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('src/combat.js','utf8');
const begin=src.indexOf('// Ràfega de tres bales, separades 75 ms.');
const end=src.indexOf('// La pistola personal és utilitzable',begin);
assert(begin>=0&&end>begin,'El controlador de ràfega existeix');
assert(src.includes('if(!beginAssaultBurst())return;'),'La lògica de dispar inicia la ràfega');
const shots=[];
const ctx={window:{HUNTER_SHARED_COMBAT:shared},
  ammo:12,assaultRifleEquipped:true,inv:{fusell_assalt:1},cv:null,
  swimming:false,over:0,paused:false,playerFall:null,playerEject:null,hp:8,
  pl:{userData:{upperBody:{rotation:{x:-.22,y:0}},
    assault:{rotation:{x:0,y:0}},
    assaultMuzzle:{getWorldPosition(v){return v.set(.4,2.45,-1.72)}}},
    position:{x:0,y:0,z:0},rotation:{y:0},updateMatrixWorld(){}},
  THREE:{Vector3:class {set(x,y,z){this.x=x;this.y=y;this.z=z;return this}}},
  P:{hd:0,x:0,y:0,z:0},playerCrouched:false,
  SMALL_ARMS_RANGE:aiming.SMALL_ARMS_RANGE,SMALL_ARMS_AIM_CONE:.82,SMALL_ARMS_AIM_VERTICAL:Math.PI/2,
  COMBAT_BALANCE:{weapons:{pistol:1}},mW:{},SMALL_ARMS_SCALE:.7,
  msg:'',msgT:0,fcd:0,time:0,aims:0,
  autoAimWeaponShot(){this.aims++;return this.aims===1?[0,0,-1]:[.6,0,-.8]},
  shoot(x,y,z,dx,dy,dz){shots.push({time:ctx.time,x,y,z,dx,dz})}
};
// Evitam dependre del binding 'this' dins de la funció de punteria.
ctx.autoAimWeaponShot=()=>{ctx.aims++;return ctx.aims===1?[0,0,-1]:[.6,0,-.8]};
const helperStart=src.indexOf('function assaultMuzzleWorld()'),helperEnd=begin;
assert(helperStart>=0&&helperEnd>helperStart);
vm.runInNewContext(src.slice(helperStart,helperEnd)+src.slice(begin,end)+
  '\n globalThis.burst={beginAssaultBurst,updateAssaultBurst,cancelAssaultBurst};',ctx);
assert(ctx.burst.beginAssaultBurst());
assert.equal(shots.length,1,'La primera bala és immediata');
assert.equal(shots[0].x,.4,'La bala surt lateralment de la punta del canó');
assert.equal(shots[0].y,2.45,'La bala surt a l\'alçada del canó, no del tors');
assert.equal(shots[0].z,-1.72,'La bala surt per davant del personatge');
assert(Math.abs(ctx.pl.userData.assault.rotation.x-.22)<1e-8,'El canó compensa el pitch del tors');
assert.equal(ctx.ammo,11,'Només consumeix la primera bala inicialment');
ctx.time=.04;ctx.burst.updateAssaultBurst(.04);
assert.equal(shots.length,1,'La segona bala no surt prematurament');
ctx.time=.08;ctx.burst.updateAssaultBurst(.04);
assert.equal(shots.length,2,'La segona bala és posterior');
ctx.time=.12;ctx.burst.updateAssaultBurst(.04);
assert.equal(shots.length,2);
ctx.time=.16;ctx.burst.updateAssaultBurst(.04);
assert.equal(shots.length,3,'La tercera bala és posterior');
assert.equal(ctx.ammo,9,'La ràfega gasta tres cartutxos');
assert.equal(ctx.aims,3,'Es recalcula l’autoapuntat cada tret');
assert.notEqual(shots[0].dx,shots[1].dx,'Pot canviar de blanc durant la ràfega');
assert(shots[0].time<shots[1].time&&shots[1].time<shots[2].time);
ctx.time=.4;ctx.burst.beginAssaultBurst();
assert.equal(shots.length,4);
ctx.assaultRifleEquipped=false;
ctx.burst.updateAssaultBurst(.1);
assert.equal(shots.length,4,'Canviar arma cancel·la trets pendents');
ctx.assaultRifleEquipped=true;
ctx.ammo=2;
assert.equal(ctx.burst.beginAssaultBurst(),false,'No s’inicia una ràfega amb menys de tres bales');
assert.equal(shots.length,4);
console.log('OK: fusell d’assalt, tres trets seqüencials, consum, retarget i cancel·lació');

})().catch(error=>{console.error(error);process.exitCode=1});

