// Regressió: una ona expansiva no pot expulsar els soldats vius del
// forjat d'una torre ni encastar-los als quatre parapets.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 TOWER_GUARD_FLOOR_Y,TOWER_GUARD_BODY_RADIUS,TOWER_GUARD_BLAST_CLEARANCE,TOWER_END_PARAPET_Z,
 TOWER_SIDE_PARAPET_X,towerParapetVolumes,towerGuardPosition,
 towerGuardDeckPoint,towerGuardWithinDeck
} from '../src/tower-model.mjs';

const source=readFileSync(new URL('../src/enemy-ai.js',import.meta.url),'utf8');
const start=source.indexOf('function moveBlastedEnemy(u,dt){');
const end=source.indexOf('// Requises de vehicles neutrals.',start);
assert(start>=0&&end>start,'No hem trobat la funció real de l’ona expansiva');
const calls=[];
const move=new Function('enemySolidAt','enemyReindex','buildingLocalPoint','window',
 source.slice(start,end)+'\nreturn moveBlastedEnemy;')(
 ()=>true,(u,ox,oz)=>calls.push([ox,oz,u.x,u.z]),()=>({x:0,z:0}),
 {HUNTER_TOWER_MODEL:{towerGuardDeckPoint,towerGuardWithinDeck}}
);
const tower={x:110,z:-140,gy:5};
const parapets=towerParapetVolumes();
assert.equal(parapets.length,4);
assert(parapets.some(p=>p.x===TOWER_SIDE_PARAPET_X));
assert(parapets.some(p=>p.z===TOWER_END_PARAPET_Z));
const maxX=TOWER_SIDE_PARAPET_X-.09-TOWER_GUARD_BODY_RADIUS-.07;
const maxZ=TOWER_END_PARAPET_Z-.09-TOWER_GUARD_BODY_RADIUS-.07;
assert(maxX>1.43&&maxZ>.25,'Els dos soldats han de cabre als llocs de vigilància');
assert(TOWER_GUARD_FLOOR_Y+2.78+TOWER_GUARD_BLAST_CLEARANCE<12.16,
 'L’explosió no pot fer travessar el sostre al cap del soldat');
assert(source.includes('if(u.blastHeight>limit)'),
 'El bucle de ragdoll ha de topar amb la part interior de la coberta');

for(const seat of [0,1]){
 const spawn=towerGuardPosition({x:tower.x,z:tower.z,y:tower.gy},seat);
 assert.equal(spawn.y,tower.gy+TOWER_GUARD_FLOOR_Y);
 assert(towerGuardWithinDeck(tower,spawn.x,spawn.z));
 for(const heading of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5]){
  const u={t:'soldat',towerGuard:true,towerHost:tower,gy:spawn.y,
   x:spawn.x,z:spawn.z,hd:0,hp:4,blastImpulse:{
    vx:Math.cos(heading)*46,vz:Math.sin(heading)*46,vy:17
   }};
  for(let frame=0;frame<34;frame++){
   move(u,.05);
   assert(towerGuardWithinDeck(tower,u.x,u.z),
    'El soldat ha travessat un parapet després d’una explosió');
   assert(Math.abs(u.x-tower.x)<=maxX+1e-8);
   assert(Math.abs(u.z-tower.z)<=maxZ+1e-8);
   assert.equal(u.gy,spawn.y,'El moviment horitzontal no canvia la cota');
  }
 }
}
// Recuperar un defensor procedent d'un guardat amb coordenades corruptes.
const stranded={t:'soldat',towerGuard:true,towerHost:tower,gy:tower.gy+TOWER_GUARD_FLOOR_Y,
 x:tower.x+11,z:tower.z-7,hp:4,hd:0,blastImpulse:{vx:70,vy:12,vz:-20}};
move(stranded,.06);
assert(towerGuardWithinDeck(tower,stranded.x,stranded.z));
assert.equal(stranded.blastImpulse.vx,0);
assert.equal(stranded.blastImpulse.vz,0);
// Ni les patrulles ordinàries ni el general canvien de comportament.
const ground={t:'soldat',towerGuard:false,x:0,z:0,hd:0,hp:4,
 blastImpulse:{vx:20,vz:0,vy:0}};
move(ground,.05);
assert(ground.x>.5);
assert(source.includes('u.gy=(tower.gy??tower.o?.position.y??0)+rules.TOWER_GUARD_FLOOR_Y'),
 'La IA de vigilància ha de reposar la cota correcta abans de disparar');
assert(source.includes('u.towerGuard&&!u.towerHost?.destroyed?u.gy:enemyGroundAt'),
 'En ragdoll la cota de suport ha de ser la plataforma, no el terreny o el sostre');
assert(calls.length>0,'El desplaçament ha d’invalidar l’índex espacial');
console.log('PASS tower blast guard containment: 2 guards × 5 directions, reparació i altura');
