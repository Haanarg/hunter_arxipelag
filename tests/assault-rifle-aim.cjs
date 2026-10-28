'use strict';
// Autoapuntat del fusell d'assalt: alçades pronunciades sense falsos
// positius al nivell del terra ni alteracions a la pistola.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/combat.js','utf8');
const begin=src.indexOf('// Les armes pesades prioritzen riscos immediats:'),
      end=src.indexOf('// La retícula i el míssil de l\'helicòpter',begin);
assert(begin>=0&&end>begin,'Funcions de punteria localitzades');
const ctx={E:[],VS:{llanxa:1},wallCandidates:()=>[],buildingCandidates:()=>[],hAt:()=>0};
vm.runInNewContext(src.slice(begin,end)+
  '\n globalThis.aim={autoAimWeaponShot,enemyAimCenterY,ASSAULT_AIM_CONE,ASSAULT_AIM_VERTICAL};',ctx);
const aim=ctx.aim;
function fire(target,kind='assault',originY=1.6){
  ctx.E=[target];
  return aim.autoAimWeaponShot(0,originY,0,0,0,-1,85,
    kind==='assault'?aim.ASSAULT_AIM_CONE:.97,kind,null,130,Math.PI/2);
}
const headOn=[0,0,-1];
const tower={t:'torre',x:8,z:-2,hp:24,o:{position:{y:0}}};
let direction=fire(tower);
assert(direction[0]>.5&&direction[1]>.4,'Caseta alta a 76° horitzontals elegible');
assert.deepEqual(Array.from(fire(tower,'light')),headOn,'La pistola conserva el seu con estricte');
const overhead={t:'torre',x:0,z:0,hp:24,o:{position:{y:0}}};
direction=fire(overhead);
assert(direction[1]>.95&&direction[2]>0,'Caseta just a sobre del jugador elegible');
const low={t:'soldat',x:7,z:-2,hp:5,o:{position:{y:0}}};
direction=fire(low,'assault',20);
assert(direction[0]>.3&&direction[1]<-.8,'Blanc molt per sota elegible');
const flatSide={t:'soldat',x:10,z:-2,hp:5,o:{position:{y:0}}};
assert.deepEqual(Array.from(fire(flatSide)),headOn,'No selecciona soldats de costat a peu pla');
const behind={t:'soldat',x:0,z:9,hp:5,o:{position:{y:0}}};
assert.deepEqual(Array.from(fire(behind)),headOn,'No autoapunta darrere del jugador');
assert(src.includes("'assault',null,130,ASSAULT_AIM_VERTICAL"),'El fusell usa el nou perfil');
assert(src.includes("target.suppressedUntil=elapsed+2"),'Es conserva el foc de supressió');
console.log('OK: con 3D ampliat (amunt/avall), torres, sense regressió de pistola');
