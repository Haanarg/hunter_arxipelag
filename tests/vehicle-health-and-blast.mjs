import assert from 'node:assert/strict';
import {combatBalance} from '../src/combat-rules.mjs';
import {vehicleDynamics} from '../src/vehicle-dynamics-core.mjs';
import {createArcadeBlastFX,arcadeBlastProfile} from '../src/arcade-blast-fx.mjs';
import * as THREE from '../vendor/three-r186.module.mjs';
const base={bici:1,moto:2,cotxe:5,cotxe_civil:4,camio:10,tanqueta:12,tanc:20,
  windsurf:1,barca_rems:2,moto_aquatica:3,llanxa:5,llanxa_coets:10,ferry:15,
  hover:6,heli:10,heli_combat:15};
for(const [type,old] of Object.entries(base)){
 assert.equal(combatBalance.vehicles[type],old*2,type);
 assert.equal(vehicleDynamics.types[type].life,old*2,type+' servidor/joc');
}
assert.equal(Object.keys(combatBalance.vehicles).length,Object.keys(base).length);
assert.equal(arcadeBlastProfile('c4').scale,2.55);
assert.equal(arcadeBlastProfile('projectile').scale,1.5);
const scene=new THREE.Scene(),fx=createArcadeBlastFX(THREE,scene);
for(let i=0;i<8;i++)assert.equal(fx.emit(i*2,0,0,'grenade',i),true);
assert.equal(scene.children.length,5,'Màxim de cinc grups FX compartits');
for(let i=0;i<22;i++)fx.update(.075);
const active=scene.children.filter(g=>g.visible);
assert.ok(active.length>0);
const dormant=active.flatMap(g=>g.children.filter(o=>o.isInstancedMesh)).filter(m=>!m.visible);
assert.ok(dormant.length>0,'Els grups de partícules extingides deixen de dibuixar');
assert.ok(dormant.every(m=>m.count===0));
fx.dispose();
console.log('OK 16 vehicles amb el doble de vida, explosions reciclades i malles inactives ocultes');
