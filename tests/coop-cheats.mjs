import assert from 'node:assert/strict';
import {COOP_CHEAT_KEYS,normalizeCoopCheats,grantCoopCheatItems,moveCoopCheatFly}
 from '../src/coop-cheats.mjs';

assert.deepEqual(COOP_CHEAT_KEYS,['items','invisible','immune','fly']);
assert.deepEqual(normalizeCoopCheats({items:true,immune:true,invisible:'true',fly:1}),
 {items:true,invisible:false,immune:true,fly:false},
 'Only literal booleans can enable cheats');
const host={bullets:2,grenades:0},guest={bullets:0,sniperAmmo:0},
 vehicles=[{rockets:0},{rockets:4},{}];
for(const bag of [host,guest])grantCoopCheatItems(bag,vehicles);
for(const bag of [host,guest]){
 for(const key of ['bullets','grenades','medkits','disguise','assault',
  'sniper','sniperAmmo','bazooka','c4','cutters'])
  assert.equal(bag[key],9999,`Both players: ${key}`);
}
assert.equal(vehicles[0].rockets,9999);
assert.equal(vehicles[1].rockets,9999);
const origin={x:0,y:2,z:0,hd:0,hp:25};
const forward=moveCoopCheatFly(origin,{forward:1,strafe:0,turn:0,climb:1},
 {limit:250,heightAt:()=>0});
assert(forward.z<0&&forward.y>origin.y);
assert.equal(forward.hp,25);assert.equal(forward.swimming,false);
assert.equal(forward.fall,null);
assert.deepEqual(origin,{x:0,y:2,z:0,hd:0,hp:25},
 'Fly must not mutate authoritative input');
const down=moveCoopCheatFly({...forward,y:1},{forward:0,strafe:0,turn:0,climb:-1},
 {limit:250,heightAt:()=>0});
assert.equal(down.y,1,'Flight cannot go below the ground');
const edge=moveCoopCheatFly({...origin,x:240,z:240},{forward:1,strafe:1,turn:1,climb:0},
 {limit:250,heightAt:()=>0,dt:1});
assert(Math.abs(edge.x)<=250&&Math.abs(edge.z)<=250);
console.log('coop cheats: safe flags, shared weapon grants, vehicles and shared fly physics passed');
