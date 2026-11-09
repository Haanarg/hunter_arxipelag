import assert from 'node:assert/strict';
import {combatBalance,directRocketHitDamage,explosionDamage,vehicleDamage} from '../src/combat-rules.mjs';
import {vehicleDynamics} from '../src/vehicle-dynamics-core.mjs';
import {createArcadeBlastFX,arcadeBlastProfile} from '../src/arcade-blast-fx.mjs';
import * as THREE from '../vendor/three-r186.module.mjs';
const base={bici:1,moto:2,cotxe:5,cotxe_civil:4,camio:10,tanqueta:10,tanc:20,
  windsurf:1,barca_rems:2,moto_aquatica:3,llanxa:5,llanxa_coets:10,ferry:15,
  hover:6,heli:10,heli_combat:15};
for(const [type,old] of Object.entries(base)){
 assert.equal(combatBalance.vehicles[type],old*2,type);
 assert.equal(vehicleDynamics.types[type].life,old*2,type+' servidor/joc');
}
assert.equal(Object.keys(combatBalance.vehicles).length,Object.keys(base).length);
const enemyTankette={t:'tanqueta',hp:20};
for(const weapon of ['bazooka','heliMissile','boatRocket']){
 assert.equal(directRocketHitDamage(weapon,'enemy',enemyTankette),10,weapon+' a tanqueta HQ');
 assert.equal(directRocketHitDamage(weapon,'vehicle',{t:'tanqueta',life:20}),10,weapon+' a tanqueta neutral');
 assert.equal(directRocketHitDamage(weapon,'enemy',{t:'soldat',hp:4}),0,'soldat: només expansió');
 assert.equal(directRocketHitDamage(weapon,'wall',{hp:10}),0,'paret: només expansió');
}
for(const weapon of ['tank','grenade','c4','rifle'])assert.equal(
 directRocketHitDamage(weapon,'enemy',enemyTankette),0,weapon+' no és bazuca/míssil');
assert.equal(directRocketHitDamage('bazooka','enemy',{t:'tanqueta',destroyed:true}),0);
const hit=directRocketHitDamage('bazooka','enemy',enemyTankette);
assert.equal(enemyTankette.hp-hit,10);
assert.equal(enemyTankette.hp-hit-hit,0,'dos coets directes destrueixen tanqueta HQ de 20 PV');
assert.equal(vehicleDamage({t:'tanqueta',life:20},10,1,'heavy',20).life,10);
assert.equal(vehicleDamage({t:'tanqueta',life:10},10,1,'heavy',20).life,0);
assert(explosionDamage(10,4.5,18)<10,'l\u2019ona a 4,5 m és menor que l\u2019impacte directe');
const soloCombat=(await import('node:fs')).readFileSync(new URL('../src/combat.js',import.meta.url),'utf8');
const coopCombat=(await import('node:fs')).readFileSync(new URL('../server/coop-combat.mjs',import.meta.url),'utf8');
assert(soloCombat.includes("u===directHit?.target")&&soloCombat.includes("v===directHit?.target"));
assert(soloCombat.includes("directRocketHitDamage(")&&soloCombat.includes("damageVehicle(directHit.target,directHit.damage"));
assert(coopCombat.includes("t!==blast.directHit?.target")&&coopCombat.includes("v===blast.directHit?.target"));
assert(coopCombat.includes("directRocketHitDamage(p.weapon,result.kind,result.target)"));

assert.equal(arcadeBlastProfile('c4').scale,2.55);
assert.equal(arcadeBlastProfile('projectile').scale,1.5);
const scene=new THREE.Scene(),fx=createArcadeBlastFX(THREE,scene);
for(let i=0;i<8;i++)assert.equal(fx.emit(i*2,0,0,'grenade',i),true);
assert.equal(scene.children.length,5,'Màxim de cinc grups FX compartits');
const lights=scene.children.flatMap(group=>group.children.filter(o=>o.isPointLight));
assert.equal(lights.length,1,'Una sola llum dinàmica compartida per tots els esclats');
for(let i=0;i<22;i++)fx.update(.075);
const active=scene.children.filter(g=>g.visible);
assert.ok(active.length>0);
const dormant=active.flatMap(g=>g.children.filter(o=>o.isInstancedMesh)).filter(m=>!m.visible);
assert.ok(dormant.length>0,'Els grups de partícules extingides deixen de dibuixar');
assert.ok(dormant.every(m=>m.count===0));
fx.dispose();
console.log('OK 16 vehicles amb el doble de vida, explosions reciclades i malles inactives ocultes');
