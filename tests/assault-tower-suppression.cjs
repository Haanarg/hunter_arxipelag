'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const combat=fs.readFileSync('src/combat.js','utf8');
const enemyAi=fs.readFileSync('src/enemy-ai.js','utf8');
const death=fs.readFileSync('src/death-cinematic.js','utf8');
function between(text,a,b){const start=text.indexOf(a),end=text.indexOf(b,start+a.length);assert(start>=0&&end>start,'Bloc de codi existent');return text.slice(start,end)}
const aim=between(combat,'// Les armes pesades prioritzen riscos immediats:','// La retícula i el míssil de l\'helicòpter');
const tower={t:'torre',x:2,z:-5,hp:24,o:{position:{y:0}}};
const ctx={E:[tower],VS:{llanxa:1},wallCandidates:()=>[],buildingCandidates:()=>[],hAt:()=>0};
vm.runInNewContext(aim+'\n globalThis.aim={autoAimWeaponShot,enemyAimCenterY};',ctx);
const targetY=ctx.aim.enemyAimCenterY(tower);
assert.equal(targetY,9.15,'L’autoapuntat fixa el centre de la caseta, no les potes');
const direction=ctx.aim.autoAimWeaponShot(0,1.6,0,0,0,-1,85,.92,'light',null,130,Math.PI/2);
assert(direction[0]>.1&&direction[1]>.6,'El fusell adquireix la caseta elevada fora del con antic');
assert.equal(tower.hp,24,'L’autoapuntat no modifica els PV');
assert(combat.includes('target.suppressedUntil=elapsed+2'),'L’impacte renova la supressió dos segons');
assert(combat.includes("if(p.own==='p'&&p.shotClass==='light')"),'Només els impactes lleugers del jugador activen la supressió');
assert(enemyAi.includes("!suppressed&&weapon==='light'"),'La torre no pot disparar armes lleugeres');
assert(enemyAi.includes("!suppressed&&weapon==='heavy'"),'La torre tampoc pot disparar armes pesants');
const state={suppressedUntil:0};
function hit(time){state.suppressedUntil=time+2}
function canFire(time){return !(state.suppressedUntil>time)}
hit(10);assert(!canFire(11.99));hit(11.7);assert(!canFire(13.69));assert(canFire(13.7),'Cada impacte renova el termini');
assert(death.includes('[u.gun,u.knife,u.bazooka,u.grenade,u.sniper,u.assault,u.cisalla]'),'El fusell es pot desenganxar i amagar a la Parca');
const drop=between(death,'function deathDropWeapon(v){','// L\'arma cau independentment');
const origParent={add(){}};
const clone=()=>({clone});
const rifle={visible:true,parent:origParent,position:{clone:()=>({x:1,y:3,z:4})},quaternion:{clone},scale:{clone}};
const gun={visible:false},flash={visible:false},player={userData:{gun,knife:null,bazooka:null,grenade:null,sniper:null,assault:rifle,cisalla:null,pistolFlash:flash},updateMatrixWorld(){}};
const scene={attach(w){assert.equal(w,rifle);w.parent=scene;}};
const dctx={pl:player,scene,cv:null};
vm.runInNewContext(drop+'\n globalThis.testDrop=deathDropWeapon;',dctx);
const v={};dctx.testDrop(v);
assert.equal(v.droppedWeapon.object,rifle,'El fusell real queda desenganxat del cos');
assert.equal(v.droppedWeapon.parent,origParent,'Se’n conserva el pare per restaurar-lo');
assert.equal(rifle.parent,scene,'La cinemàtica el mou a l’escena');
console.log('OK: autoapuntat vertical, supressió renovable, caiguda del fusell');
