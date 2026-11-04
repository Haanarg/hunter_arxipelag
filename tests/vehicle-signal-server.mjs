import assert from 'node:assert/strict';
import {createRelayCombat} from '../server/coop-combat.mjs';
import {RADII,VEHICLE_SIGNAL_SOUNDS} from '../src/enemy-perception-core.mjs';
const positions=[20,90,120,155,195];
for(const [type,sound] of Object.entries(VEHICLE_SIGNAL_SOUNDS)){
 const player={id:'driver',x:0,y:0,z:0,hp:20};
 const vehicle={id:'v1',t:type,x:0,y:0,z:0,seats:['driver']};
 const guards=positions.map((x,i)=>({id:'g'+i,t:'soldat',x,y:0,z:0,hp:12,state:'patrol',ai:true,heading:0}));
 const combat=createRelayCombat({meta:{id:'signals',mode:'native',targets:guards,seed:3},
   inventory:new Map([['driver',{weapon:'pistol'}]]),players:()=>[player],visiblePlayers:()=>[player],
   vehicles:{live:()=>[vehicle],mounted:()=>vehicle},
   geometry:()=>({walls:[],buildings:[]}),
   world:()=>({heightAt:()=>0,locomotionAt:()=>({floor:0,basement:false})}),
   active:()=>true});
 assert.equal(combat.vehicleSignal('driver',vehicle,30),true);
 const snapshot=combat.snapshot(),fx=snapshot.effects.at(-1);
 assert.equal(fx.kind,'vehicle-signal');assert.equal(fx.radius,RADII[sound]);assert.equal(fx.sound,sound);
 for(const g of snapshot.targets)assert.equal(g.state==='search',g.x<RADII[sound],type+' / '+g.x);
 assert.equal(combat.vehicleSignal('other',vehicle,31),false);
 assert.equal(combat.vehicleSignal('driver',{...vehicle,t:'ferry'},32),false);
}
console.log('OK server: radi canònic, guardes dins/fora i autoria del vehicle');
