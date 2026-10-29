import assert from 'node:assert/strict';
import {vehicleDamage,vehicleHullDistance,combatBalance} from '../src/combat-rules.mjs';
import {launchProjectile} from '../src/projectile-core.mjs';
import {createRelayVehicles} from '../server/coop-vehicles.mjs';
import {createRelayCombat} from '../server/coop-combat.mjs';

// Freeze the original damageVehicle rule across all chassis and shot classes.
for(const [t,life] of Object.entries(combatBalance.vehicles))for(const shotClass of ['light','heavy','collision','impact'])for(const amount of [NaN,-1,0,.1,1,4.1,50]){
 const blocked=shotClass==='light'&&['tanc','tanqueta'].includes(t),whole=n=>Number.isFinite(n)&&n>0?Math.ceil(n):0;
 const damage=blocked?0:shotClass==='collision'?1:whole(amount);
 assert.equal(vehicleDamage({t,life},amount,1,shotClass).life,Math.max(0,life-damage));
}
assert.equal(vehicleDamage({t:'cotxe',life:5,destroyed:true},99,1,'heavy').damaged,false);
assert.equal(vehicleHullDistance({x:0,z:0},0,1.6,0,1,0),0);
assert.equal(vehicleHullDistance({x:0,z:0},0,1.6,0,1,5),3.4);

function fixture({seats=[null,null],life=5,t='cotxe',walls=[],record={},second=false}={}){
 const players=[{id:'a',x:0,y:0,z:0,hd:0,hp:20},{id:'b',x:30,y:0,z:0,hd:0,hp:20}];
 const meta={id:'damage',seed:67,bounds:{x0:-100,x1:100,z0:-100,z1:100},vehicles:[{id:'v',t,x:0,y:0,z:-8,hd:0,v:0,life,seats},...(second?[{id:'other',t:'cotxe',x:0,y:0,z:-12,hd:0,v:0,life:5,seats:[null,null]}]:[])]};
 if(seats.includes('b'))Object.assign(players[1],{x:0,z:-8});
 const world={heightAt:()=>0,resolveBody:(a,b)=>b,locomotionAt:()=>({floor:0})},geometry={walls,buildings:[]},inventory=new Map(players.map(p=>[p.id,{weapon:'pistol',bullets:24,grenades:2}]));let active=true;
 const vehicles=createRelayVehicles({meta,world:()=>world,players:()=>players,active:()=>active});
 const options={meta,record,vehicles,world:()=>world,geometry:()=>geometry,players:()=>players,inventory,active:()=>active,damagePlayer:(id,damage)=>{const p=players.find(p=>p.id===id);p.hp=Math.max(0,p.hp-damage);return true;}};
 return {vehicles,combat:createRelayCombat(options),options,players,inventory,pause(){active=false;}};
}
const fire=(f,id,tick)=>f.combat.command('a',{epoch:'damage',commandId:id,weapon:'pistol'},tick);
let f=fixture();assert.equal(f.vehicles.snapshot()[0].life,5);fire(f,'first',0);assert.equal(f.vehicles.snapshot()[0].life,5,'launch is not an impact');
for(let i=1;i<=3;i++)f.combat.step(i);assert.equal(f.vehicles.snapshot()[0].life,1,'uses original 5HP and relay pistol damage 4');
fire(f,'first',0);assert.equal(f.inventory.get('a').bullets,23,'duplicate does not shoot twice');
fire(f,'last',10);for(let i=11;i<=13;i++)f.combat.step(i);
assert.equal(f.vehicles.snapshot()[0].destroyed,true);assert.equal(f.vehicles.snapshot()[0].life,0);
assert.equal(f.vehicles.command('a',{epoch:'damage',operation:'enter',vehicleId:'v',commandId:'wreck'}).code,'DESTROYED');
assert.equal(f.combat.snapshot().effects.filter(e=>e.kind==='vehicle-destroyed').length,1);

// Enemy bullets hit the shell, not the passenger sphere at the same position.
f=fixture({seats:[null,'b'],record:{projectiles:[launchProjectile({x:0,y:1.5,z:-2},[0,0,-1],130,{id:'enemy',actorId:'guard',enemy:true,dmg:2})]}});
for(let i=1;i<=3;i++)f.combat.step(i);assert.equal(f.vehicles.snapshot()[0].life,3);assert.equal(f.players[1].hp,20);
// Fatal shot releases the passenger and damages once with the original 4..6 rule.
f=fixture({life:1,seats:[null,'b'],record:{projectiles:[launchProjectile({x:0,y:1.5,z:-2},[0,0,-1],130,{id:'fatal',actorId:'guard',enemy:true,dmg:2})]}});
for(let i=1;i<=3;i++)f.combat.step(i);assert.deepEqual(f.vehicles.snapshot()[0].seats,[null,null]);assert.ok(f.players[1].hp>=14&&f.players[1].hp<=16);assert.equal(f.vehicles.mounted('b'),undefined);

const grenade={id:'g',actorId:'a',x:0,y:1,z:-8,vx:0,vy:0,vz:0,explodeAt:1};
f=fixture({second:true,record:{grenades:[grenade]}});f.combat.step(1);assert.ok(f.vehicles.snapshot().every(v=>v.destroyed),'grenade and shared vehicle blast chain');assert.equal(f.combat.snapshot().effects.filter(e=>e.kind==='vehicle-destroyed').length,2);
const count=f.combat.snapshot().effects.filter(e=>e.kind==='explosion').length;f.combat.step(2);assert.equal(f.combat.snapshot().effects.filter(e=>e.kind==='explosion').length,count,'no duplicate destruction next tick');
// Cover blocks bullets and blast; a paused fuse cannot destroy a vehicle.
const wall={x0:-4,x1:4,z0:-5,z1:-4.8,y0:0,y1:5};
f=fixture({walls:[wall],record:{grenades:[{...grenade,z:-3}]}});fire(f,'covered',0);for(let i=1;i<=3;i++)f.combat.step(i);assert.equal(f.vehicles.snapshot()[0].life,5);
f=fixture({record:{grenades:[grenade]}});f.pause();f.combat.step(1);assert.equal(f.vehicles.snapshot()[0].life,5);
// Light shots ricochet from armour; bicycles break without a secondary blast.
f=fixture({t:'tanc'});fire(f,'armour',0);for(let i=1;i<=3;i++)f.combat.step(i);assert.equal(f.vehicles.snapshot()[0].life,5);
f=fixture({t:'bici',life:1});fire(f,'bike',0);for(let i=1;i<=3;i++)f.combat.step(i);assert.equal(f.vehicles.snapshot()[0].destroyed,true);assert.equal(f.combat.snapshot().effects.some(e=>e.kind==='explosion'),false);
console.log('shared vehicle damage: original chassis/armour matrix, flight, shell protection, fatal ejection, chain, cover, pause, idempotency and non-explosive bicycle passed');
