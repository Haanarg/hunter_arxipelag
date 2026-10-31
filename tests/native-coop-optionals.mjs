import assert from 'node:assert/strict';
import {createNativeOptionals} from '../server/coop-optionals.mjs';
import {combatBalance} from '../src/combat-rules.mjs';

function make(){
 const actors=[{id:'host',x:0,y:1,z:0,hp:25},{id:'guest',x:150,y:1,z:150,hp:25}],
   fleet=[{id:'jeep-1',t:'cotxe',x:20,y:1,z:20,life:3,
     maxLife:combatBalance.vehicles.cotxe,v:0,destroyed:false,seats:[null,null]}],
   walls=[{x0:-2,x1:2,z0:9,z1:10,y0:0,y1:3,open:false,hp:5}],
   geometry={walls},
   targets=[{id:'guard',t:'soldat',hp:4,x:0,y:1,z:5},
     {id:'tower',t:'torre',hp:8,x:3,y:1,z:5},
     {id:'hq-guard',t:'soldat',hp:4,x:120,y:1,z:120,state:'patrol'}],
   camp={id:'prison-camp',x:0,z:0,angle:0,
     rescuePoint:{x:0,y:1,z:0},mechanicStation:{x:18,y:1,z:18},
     guardIds:['guard','tower'],fenceIndexes:[0],
     farmerEscape:[{x:10,y:1,z:22},{x:10,y:1,z:26}],
     mechanicAccess:[{x:20,y:1,z:24},{x:18,y:1,z:18}],
     entities:[{id:'mechanic',role:'mechanic',x:0,y:1,z:0,hp:4,state:'captive',pose:'standing'},
       ...Array.from({length:4},(_,i)=>({id:'farmer-'+i,role:'farmer',
         x:i-2,y:1,z:0,hp:4,state:'captive',pose:i%2?'seated':'standing'}))]},
   meta={id:'phase2',mode:'native',optional:{prison:camp,radio:[
     {id:'radio-0',x:1,y:1,z:1,colliderIndex:-1,
       sourceIds:['guard'],hqDefenders:['hq-guard']}]}},
   world={heightAt:()=>1,locomotionAt:()=>({floor:1,terrain:1,basement:false}),
     resolveBody:(a,b)=>b};
 const ctx={meta,world:()=>world,geometry:()=>geometry,players:()=>actors,
   vehicles:{live:()=>fleet,mounted:id=>fleet.find(v=>v.seats.includes(id))||null},
   active:()=>true,canSee:()=>true};
 let optional=createNativeOptionals(ctx),tick=0;
 return {actors,fleet,geometry,targets,ctx,meta,get optional(){return optional;},
   step(n=1){for(let i=0;i<n;i++)optional.step(++tick,targets,actors);return optional.snapshot();},
   tick:()=>tick,
   restore(){optional=createNativeOptionals({...ctx,record:optional.checkpoint()});}};
}
let f=make(),state=f.step(3);
assert.equal(state.prison.released,false);
assert.equal(state.prison.rescue.guards,1);
assert.equal(state.prison.rescue.towers,1);
assert.equal(state.prison.rescue.breach,false);
assert.equal(f.optional.warn(f.targets[0],f.actors[0],4,f.targets),1,
  'Una ràdio operativa mobilitza un defensor de l\'HQ');
assert.equal(f.targets[2].state,'search');
assert.equal(state.radio[0].operational,true);
assert.equal(f.optional.command('host',{epoch:'phase2',commandId:'radio-sabotage',
  operation:'sabotage',target:'radio-0'},4).ok,true);
assert.equal(f.optional.warn(f.targets[0],f.actors[0],10,f.targets),0,
  'El sabotatge anul·la nous avisos');
assert.equal(f.optional.snapshot().radio[0].operational,false);
const saved=f.optional.checkpoint();f.restore();
assert.deepEqual(f.optional.checkpoint(),saved,'Checkpoint restaura la ràdio i els NPC');
f.targets[0].hp=f.targets[1].hp=0;f.step(3);
assert.equal(f.optional.snapshot().prison.released,false,
  'No es rescata sense una bretxa a la tanca interior');
f.geometry.walls[0].open=true;
state=f.step(3);
assert.equal(state.prison.released,true);
assert.equal(state.prison.entities.filter(u=>u.state==='evacuating').length,4);
assert.equal(state.prison.entities.find(u=>u.role==='mechanic').state,'to-station');
f.step(1700);
state=f.optional.snapshot();
const mechanic=state.prison.entities.find(u=>u.role==='mechanic');
assert.equal(mechanic.state,'ready','El mecànic arriba al taller');
assert(state.prison.entities.filter(u=>u.role==='farmer').every(u=>u.state==='rescued'),
  'Els quatre camperols completen la fugida');
f.actors[0].x=mechanic.x;f.actors[0].z=mechanic.z;f.actors[0].y=mechanic.y;
assert.equal(f.optional.command('host',{epoch:'phase2',commandId:'follow-on',
 operation:'follow',target:'mechanic'},f.tick()).ok,true);
assert.equal(f.optional.snapshot().prison.entities.find(u=>u.role==='mechanic').following,true);
assert.equal(f.optional.command('guest',{epoch:'phase2',commandId:'other-follow',
 operation:'follow',target:'mechanic'},f.tick()).ok,false,
 'Un jugador distant no pot donar ordres al mecànic');
assert.equal(f.optional.command('host',{epoch:'phase2',commandId:'follow-off',
 operation:'follow',target:'mechanic'},f.tick()).ok,true);
const car=f.fleet[0];car.x=mechanic.x+2;car.z=mechanic.z;car.y=mechanic.y;
assert.equal(f.optional.command('host',{epoch:'phase2',commandId:'repair',
 operation:'repair',target:car.id},f.tick()).ok,true);
f.step(183);
assert.equal(car.life,car.maxLife,'Reparació compartida després de sis segons');
assert.equal(f.optional.snapshot().prison.repair,null);
const original=f.optional.checkpoint();
assert.equal(f.optional.damage('mechanic',4,f.tick()),4);
assert.equal(f.optional.snapshot().prison.entities.find(u=>u.role==='mechanic').state,'dead');
assert.equal(f.optional.command('host',{epoch:'phase2',commandId:'repair-dead',
 operation:'repair',target:car.id},f.tick()).ok,false,
 'Un mecànic mort no pot reparar');
console.log('Fase 2: presos, bretxa, ràdio, HQ, mecànic, seguir, reparar, morir i checkpoint OK');
