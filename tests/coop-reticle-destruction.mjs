import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRelayCombat} from '../server/coop-combat.mjs';

function fixture(weapon){
 const meta={id:'coop-aim-fix',mode:'native',seed:67,targets:[]},
   players=[{id:'host',x:0,y:0,z:0,hd:0,hp:25},
            {id:'guest',x:100,y:0,z:100,hd:0,hp:25}],
   bag={weapon,bullets:24,grenades:2,bazooka:3,sniper:1,sniperAmmo:6,disguised:false},
   inventory=new Map([['host',bag],['guest',{...bag}]]);
 const vehicles={mounted:()=>null,live:()=>[{id:'motorbike',t:'moto',x:9,y:0,z:-12,seats:[],destroyed:false}]};
 const combat=createRelayCombat({
   meta,inventory,players:()=>players,vehicles,active:()=>true,
   geometry:()=>({walls:[],buildings:[]}),world:()=>({heightAt:()=>0})
 });
 return {combat,bag,epoch:meta.id};
}
let {combat,bag,epoch}=fixture('bazooka');
let result=combat.command('host',{epoch,weapon:'bazooka',commandId:'bazooka-to-house',
 aim:{x:0,y:2,z:-24}},1);
assert.equal(result.code,'FIRED');
let bullet=combat.snapshot().projectiles[0];
assert.ok(Math.abs(bullet.vx)<.01,'bazooka follows reticle instead of off-axis motorbike');
assert.ok(bullet.vz<0);
assert.equal(bag.bazooka,2);
({combat,bag,epoch}=fixture('sniper'));
result=combat.command('host',{epoch,weapon:'sniper',commandId:'scoped-shot',
 aim:{x:25,y:8,z:-180}},1);
assert.equal(result.code,'FIRED');
bullet=combat.snapshot().projectiles[0];
assert.ok(bullet.vx>0,'scoped sniper follows crosshair, not player heading');
assert.equal(bag.sniperAmmo,5,'one shot consumes one sniper round');
// Restringir el tret de bazuca al con ±60° evita dreceres manipulades.
({combat,bag,epoch}=fixture('bazooka'));
result=combat.command('host',{epoch,weapon:'bazooka',commandId:'outside-cone',
 aim:{x:25,y:2,z:-5}},1);
assert.equal(result.code,'FIRED');
bullet=combat.snapshot().projectiles[0];
assert.ok(bullet.vz<0,'reticle outside the permitted arc cannot turn the rocket sideways');

const client=readFileSync(new URL('../src/coop-world-runtime.js',import.meta.url),'utf8');
assert.match(client,/s\.channel\.combat\(weapon,undefined,undefined,aim\)/);
assert.match(client,/nativeCoopCommand\('fire'\)/);
assert.match(client,/vehicleDebris\(v,row\.y\)/);
assert.match(client,/wallBreak\(w\)/);
const runtime=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
assert.match(runtime,/nativeCoopSession&&scopeActive&&sniperEquipped/);
console.log('COOP sniper reticle, bazooka reticle, cone validation, direct scoped button and destruction animations: OK');
