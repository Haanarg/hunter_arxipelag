import assert from 'node:assert/strict';
import {createRelayCombat} from '../server/coop-combat.mjs';
const car={id:'car-1',t:'cotxe',x:0,y:0,z:-12,hd:0,seats:[null,null],
  enemyCrew:['soldier-1',null],life:5,destroyed:false};
const enemy={id:'soldier-1',t:'soldat',x:car.x,y:car.y,z:car.z,hp:4,
  enemyVehicleId:car.id,enemySeat:0,ai:false};
const meta={id:'glass-coop-fixture',mode:'native',seed:67,difficulty:1,targets:[enemy]};
const player={id:'host',x:0,y:0,z:0,hd:0,hp:25};
const inventory=new Map([['host',{weapon:'pistol',bullets:20,grenades:0,disguised:false}]]);
let vehicleDamageCalls=0;
const vehicles={live:()=>[car],mounted:()=>null,contact:()=>.1,
  damage:()=>{vehicleDamageCalls++;return {destroyed:false}},enemyRelease:()=>true};
const combat=createRelayCombat({meta,inventory,players:()=>[player],vehicles,
  active:()=>true,geometry:()=>({walls:[],buildings:[]}),
  world:()=>({heightAt:()=>0})});
function shoot(start,id){
 const response=combat.command('host',{epoch:meta.id,weapon:'pistol',commandId:id},start);
 assert.equal(response.code,'FIRED');
 for(let tick=start;tick<start+12;tick++)combat.step(tick);
}
shoot(1,'first-pane');
let shot=combat.snapshot();
assert.deepEqual(car.brokenVehicleWindows,[0]);
assert.equal(shot.targets[0].hp,4,'Glass absorbs the first projectile');
assert.ok(shot.effects.some(e=>e.kind==='vehicle-glass'),'Glass effect is broadcast for both clients');
assert.equal(vehicleDamageCalls,0,'Vehicle health untouched by a pane hit');
shoot(50,'second-person');
shot=combat.snapshot();
assert.equal(shot.targets[0].hp,2,'Second shot wounds seated soldier');
assert.equal(car.life,5,'Injuring the soldier does not damage the vehicle');
assert.equal(vehicleDamageCalls,0);
console.log('Authoritative coop glass and occupant damage without hull loss: OK');
