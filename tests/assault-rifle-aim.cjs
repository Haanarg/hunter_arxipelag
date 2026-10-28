'use strict';
// Pistola i fusell comparteixen el perfil 3D sense alterar la resta d'armes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/combat.js','utf8');
const begin=src.indexOf('// Les armes pesades prioritzen riscos immediats:'),
      end=src.indexOf('// La retícula i el míssil de l\'helicòpter',begin);
assert(begin>=0&&end>begin,'Funcions de punteria localitzades');
const ctx={E:[],VS:{llanxa:1},wallCandidates:()=>[],buildingCandidates:()=>[],hAt:()=>0};
vm.runInNewContext(src.slice(begin,end)+
  '\n globalThis.aim={autoAimWeaponShot,enemyAimCenterY,SMALL_ARMS_AIM_CONE,SMALL_ARMS_AIM_VERTICAL};',ctx);
const aim=ctx.aim;
function fire(target,kind='assault',originY=1.6){
  ctx.E=[target];
  const wide=kind==='assault'||kind==='pistol';
  return Array.from(aim.autoAimWeaponShot(0,originY,0,0,0,-1,85,
    wide?aim.SMALL_ARMS_AIM_CONE:.97,kind,null,130,Math.PI/2));
}
const forward=[0,0,-1];
const tower={t:'torre',x:8,z:-2,hp:24,o:{position:{y:0}}};
for(const kind of ['assault','pistol']){
  let direction=fire(tower,kind);
  assert(direction[0]>.5&&direction[1]>.4,kind+': caseta alta i desplaçada lateralment');
  assert.deepEqual(fire(tower,kind),fire(tower,'assault'),kind+': mateix vector de punteria');
  const overhead={t:'torre',x:0,z:0,hp:24,o:{position:{y:0}}};
  direction=fire(overhead,kind);
  assert(direction[1]>.95,kind+': caseta exactament a sobre');
  const low={t:'soldat',x:7,z:-2,hp:5,o:{position:{y:0}}};
  direction=fire(low,kind,20);
  assert(direction[0]>.3&&direction[1]<-.8,kind+': blanc molt per sota');
  const flatSide={t:'soldat',x:10,z:-2,hp:5,o:{position:{y:0}}};
  assert.deepEqual(fire(flatSide,kind),forward,kind+': no seleccionar blancs laterals a peu pla');
  const behind={t:'soldat',x:0,z:9,hp:5,o:{position:{y:0}}};
  assert.deepEqual(fire(behind,kind),forward,kind+': no seleccionar blancs darrere');
}
assert.deepEqual(fire(tower,'light'),forward,'Altres armes: punteria original');
assert(src.includes("SMALL_ARMS_AIM_CONE,'pistol',null,130,SMALL_ARMS_AIM_VERTICAL)"),
  'Pistola a peu amb el con compartit');
assert(src.includes("direction.x,direction.y,direction.z,75,\n      SMALL_ARMS_AIM_CONE,'pistol'"),
  'Pistola des de vehicles oberts amb el mateix con');
assert(src.includes("SMALL_ARMS_AIM_CONE,'assault',null,130,SMALL_ARMS_AIM_VERTICAL"),
  'Fusell amb el con compartit');
assert(src.includes("target.suppressedUntil=elapsed+2"),'Foc de supressió intacte');
console.log('OK: con d\'autoapuntat compartit, pistola a peu/vehicle, fusell, casetes i blancs baixos');
