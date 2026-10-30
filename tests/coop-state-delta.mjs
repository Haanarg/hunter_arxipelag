import assert from 'node:assert/strict';
import {diffCoopState,applyCoopDelta} from '../src/coop-state-delta.mjs';
const wire=value=>JSON.parse(JSON.stringify(value));
let state={tick:0,players:[{id:'a',x:0,hp:25},{id:'b',x:3,hp:25}],combat:{targets:[{id:'guard',hp:4,patrol:[{x:10,z:20}]}],projectiles:[],effects:[]},vehicles:[{id:'v',destroyed:false,seats:[null,null]}],walls:[]},client=wire(state);
for(let tick=1;tick<=200;tick++){
 const previous=JSON.stringify(state),next=structuredClone(state);next.tick=tick;next.players[0].x+=.4;
 if(tick%7===0)next.combat.projectiles.push({id:'p'+tick,x:tick,life:2});
 for(const p of next.combat.projectiles){p.x++;p.life-=.1;}next.combat.projectiles=next.combat.projectiles.filter(p=>p.life>0);
 if(tick===20)next.vehicles[0].seats=['a',null];if(tick===30)next.vehicles[0].destroyed=true;
 if(tick===40)next.players.reverse();if(tick===50)next.combat.targets[0].aim={x:1};if(tick===60)delete next.combat.targets[0].aim;
 if(tick===70)next.walls=[1,3,7];if(tick===80)next.combat.targets[0].optional=undefined;
 const delta=wire(diffCoopState(state,next));client=applyCoopDelta(client,delta);assert.deepEqual(client,wire(next),'lossless delta at '+tick);assert.equal(JSON.stringify(state),previous,'encoding never mutates baseline');state=next;
}
assert.equal(diffCoopState(state,structuredClone(state)),null);
// Fins a 374 vehicles + 377 soldats: modificacions petites sense enviar
// totes les entitats. Inclou claus de JavaScript que poden ser heretades.
const vehicles=Array.from({length:374},(_,i)=>({
 id:'car-'+i,x:i*3,z:i,hd:0,meta:{seats:[null,null],destroyed:false}
}));
const guards=Array.from({length:377},(_,i)=>({
 id:'guard-'+i,hp:25,x:i,y:1,z:i*2
}));
const dense={tick:300,vehicles,combat:{targets:guards}};
const changed=wire(dense);
changed.tick=303;
changed.vehicles[187].x+=5;
changed.combat.targets[208].hp-=7;
const compact=diffCoopState(dense,changed);
assert.deepEqual(applyCoopDelta(wire(dense),wire(compact)),changed);
const reused=applyCoopDelta(dense,compact);
assert.strictEqual(reused.vehicles[0],dense.vehicles[0],
 'Vehicle intacte reutilitza la mateixa referència sense Map intermedi');
assert.notStrictEqual(reused.vehicles[187],dense.vehicles[187],
 'Vehicle modificat crea una referència independent');
assert.strictEqual(reused.combat.targets[0],dense.combat.targets[0],
 'Soldat intacte tampoc no es reconstrueix en cada delta');
assert(JSON.stringify(compact).length<500,'Canvis petits no envien centenars de files');
const special={actors:[{id:'toString',hp:25},{id:'constructor',hp:25}]};
const specialNext=wire(special);specialNext.actors[0].hp=24;
assert.deepEqual(applyCoopDelta(wire(special),wire(diffCoopState(special,specialNext))),specialNext,
 'Els identificadors heretats no es confonen amb patches');
const reordered={actors:[{id:'constructor',hp:25},{id:'toString',hp:25}]};
assert.deepEqual(applyCoopDelta(wire(special),wire(diffCoopState(special,reordered))),reordered,
 'Reordenar identificadors sense patches conserva els valors');
const duplicated={actors:[{id:'same',hp:1},{id:'same',hp:2}]};
const duplicatedNext=wire(duplicated);duplicatedNext.actors[1].hp=3;
assert.deepEqual(applyCoopDelta(wire(duplicated),wire(diffCoopState(duplicated,duplicatedNext))),duplicatedNext,
 'La llista amb IDs duplicats utilitza la substitució segura');
console.log('state deltas: 200 frames, entity insert/remove/reorder, nested updates/deletions, vehicle seats/destruction and immutable baselines passed');
