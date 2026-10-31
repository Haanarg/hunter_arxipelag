import assert from 'node:assert/strict';
import {createRelayCombat} from '../server/coop-combat.mjs';
import {stepNativeSoldierNavigation} from '../src/native-soldier-navigation.mjs';

function fixture(){
 const actors=[{id:'host',x:0,y:0,z:-34,hd:Math.PI,hp:100,crouched:false},
   {id:'guest',x:250,y:0,z:80,hd:0,hp:100}],
   inventory=new Map(actors.map(p=>[p.id,{weapon:'pistol',bullets:120,disguised:false}])),
   targets=[{id:'watch-1',t:'torre',x:0,y:0,z:0,hp:12,heading:0,ai:true,
     dmg:3,rate:.7,rng:112.5,heavyRange:95,heavyRate:4.2}],
   geometry={walls:[],buildings:[]},fleet=[],
   world={heightAt:()=>0,locomotionAt:()=>({floor:0,terrain:0,basement:false}),
     resolveBody:(a,b)=>b};
 const combat=createRelayCombat({meta:{id:'test',mode:'native',seed:67,difficulty:1,targets},
   inventory,players:()=>actors,visiblePlayers:()=>actors.filter(p=>p.hp>0),
   vehicles:{live:()=>fleet,mounted:id=>fleet.find(v=>v.seats.includes(id))||null,contact:()=>null},
   geometry:()=>geometry,world:()=>world,active:()=>true,
   damagePlayer:(id,amount)=>{actors.find(p=>p.id===id).hp-=amount;return true;}});
 const events=[],step=(start,end)=>{for(let tick=start;tick<=end;tick++){
   combat.step(tick);events.push(...combat.snapshot().effects.filter(e=>e.kind==='shot'&&e.tick===tick));
 }};
 return {combat,actors,fleet,events,step};
}

let f=fixture();
f.step(1,12);
assert(f.events.some(e=>e.actorId==='watch-1'&&e.weapon==='rifle'),
  'La torre dispara bales lleugeres als jugadors a peu');
let checkpoint=f.combat.checkpoint(),tower=checkpoint.targets[0];
assert.equal(tower.hp,12,'Disparar no treu vida a la torre');
assert.equal(tower.state,'attack','Detecta el jugador sense moure el xassís');
f.actors[0].z=-35;
assert(f.combat.command('host',{epoch:'test',commandId:'player-suppress',weapon:'pistol'},13).ok);
f.step(13,28);
tower=f.combat.snapshot().targets[0];
assert(tower.suppressedUntilTick>=70,
 'Un impacte de pistola a la caseta suprimeix la torre durant 60 ticks');
assert.equal(tower.hp,12,'Les armes lleugeres no fan dany estructural a la torre');
const before=f.events.length,until=tower.suppressedUntilTick;
f.step(29,until-1);
assert.equal(f.events.length,before,'No dispara mentre està suprimida');
f.step(until,until+45);
assert(f.events.length>before,'La torre recupera el foc després dels 2 segons');

f=fixture();
f.fleet.push({id:'car',t:'cotxe_civil',x:0,y:0,z:-34,seats:['host',null]});
f.step(1,10);
assert(f.events.some(e=>e.actorId==='watch-1'&&e.weapon==='bazooka'),
  'Canvia al canó pesat si el jugador està dins un vehicle');

const wall={x0:-3.5,x1:3.5,z0:-12,z1:-9};
const navWorld={heightAt:()=>0,locomotionAt:()=>({floor:0,terrain:0,basement:false}),
 resolveBody(from,to){
  if(to.x>wall.x0&&to.x<wall.x1&&to.z>wall.z0&&to.z<wall.z1)
   return {...from};
  return {...to};
 }};
const unit={id:'searcher',t:'soldat',x:0,y:0,z:0,hp:10,heading:0,
 state:'search',canSee:false,lastKnown:{x:0,z:-28},sp:7,guard:false,patrol:[]};
let flank=false;
for(let tick=0;tick<750;tick++){
 stepNativeSoldierNavigation(unit,{tick,world:navWorld,players:[]});
 if(Math.abs(unit.x)>3.5)flank=true;
}
assert(flank,'La ruta esquiva l\'obstacle en lloc de quedar clavada al mur');
assert(unit.z< -18,'El soldat cerca l\'última posició vista');
const seen={x:unit.x,z:unit.z};
unit.state='patrol';unit.lastKnown=null;unit.patrol=[{x:12,y:0,z:-24},{x:12,y:0,z:-16}];
for(let tick=750;tick<840;tick++)
 stepNativeSoldierNavigation(unit,{tick,world:navWorld,players:[]});
assert(Math.hypot(unit.x-seen.x,unit.z-seen.z)>1,
  'Recupera la patrulla quan acaba la recerca');

console.log('COOP IA fase 1: torre, armes lleugera/pesada, supressió 2 s, cerca, obstacle i retorn a patrulla OK');
