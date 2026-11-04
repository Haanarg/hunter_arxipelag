import test from 'node:test';
import assert from 'node:assert/strict';
import {planBuildingShell} from '../src/building-shell.mjs';
import {combatBalance,wallBlastDamage,roofBlastDamage} from '../src/combat-rules.mjs';

test('prison barracks has the same wall/roof HP as a fishing hut',()=>{
  const civilian=planBuildingShell(18,68,6,{civilianHut:true,wood:true,doorSide:0},()=>.5);
  const barracks=planBuildingShell(18,68,6,{wood:true,weakWalls:true,doorSide:0},()=>.5);
  assert.equal(civilian.wallHp,4);
  assert.equal(barracks.wallHp,civilian.wallHp);
  assert.equal(barracks.roofHp,civilian.roofHp);
  assert.ok(barracks.roofHp<=combatBalance.weapons.grenade);
});

test('grenade next to either end of the long timber wall destroys the panel',()=>{
  const wall={x0:5,x1:5.8,z0:-34,z1:34,y0:0,y1:6,hp:4,weakWood:true};
  for(const z of [-32,32]){
    assert.ok(wallBlastDamage(wall,6,1,z,16,combatBalance.weapons.grenade)>=wall.hp);
  }
  assert.equal(wallBlastDamage({...wall,weakWood:false},6,1,32,16,combatBalance.weapons.grenade),0,
    'non-timber walls retain their previous center-distance rule');
});

test('one grenade can collapse the long barracks roof at either end after rotation',()=>{
  const barracks={x:120,z:-20,angle:Math.PI/2,localW:18,localD:68,w:68,d:18,
    rhp:8,weakWood:true,rb:false,kind:'prison-camp'};
  const ordinary={...barracks,weakWood:false};
  for(const end of [-32,32]){
    const x=barracks.x-end,z=barracks.z;
    assert.ok(roofBlastDamage(barracks,x,z,16,combatBalance.weapons.grenade)>=barracks.rhp);
    assert.equal(roofBlastDamage(ordinary,x,z,16,combatBalance.weapons.grenade),0);
  }
  assert.equal(roofBlastDamage({...barracks,rb:true},barracks.x,barracks.z,16,10),0);
});
