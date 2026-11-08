#!/usr/bin/env node
// Regressió real de les regles de col·lisió: tanc contra bancs i pous.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {tankCivicRam,barrierRam} from '../src/combat-rules.mjs';
import {firstVehicleContact} from '../src/coop-vehicle-contacts-core.mjs';

const wall=(kind,hp=kind==='bench'?5:8)=>({
 civicFurniture:kind,civicGroup:'civic:7',hp,open:false,rammable:false,
 x0:-1,x1:1,z0:5,z1:7,y0:-.1,y1:kind==='bench'?1.2:1.85
});
const tank={t:'tanc',v:2.2};
for(const kind of ['bench','well']){
 const w=wall(kind);
 assert.equal(barrierRam(tank,w,0),null,'El mobiliari no és una barrera corrent');
 const impact=tankCivicRam(tank,w,1.5);
 assert(impact,'El tanc ha de trencar el '+kind+' fins i tot amb cooldown');
 assert.equal(impact.damage,0,'El tanc no ha de perdre vida en trencar mobiliari');
 assert.equal(impact.speedFactor,.995,'Sense fre sobtat en l’embestida');
 assert.equal(w.rammable,false,'No mutar la propietat física de l’objecte');
 assert(tankCivicRam({...tank,v:-.7},w),'També es pot enderrocar en marxa enrere');
 assert.equal(tankCivicRam({...tank,v:0},w),null,'Aturat no destrueix');
 assert.equal(tankCivicRam({...tank,v:0.01},w),null,'El contacte per vibració no destrueix');
 assert.equal(tankCivicRam({...tank,t:'tanqueta',v:30},w),null,'Tanqueta no admesa');
 assert.equal(tankCivicRam({...tank,t:'camio',v:40},w),null,'Camió no admès');
 assert.equal(tankCivicRam({...tank,t:'cotxe',v:40},w),null,'Cotxe no admès');
 assert.equal(tankCivicRam(tank,{...w,open:true}),null,'No colpejar un banc ja obert');
 assert.equal(tankCivicRam(tank,{...w,civicObject:{broken:true}}),null,'No destruir dues vegades');
}
// Provar el mateix flux de destrucció del joc amb els fragments originals.
const core=fs.readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
const start=core.indexOf('function collapseCivicProp('),end=core.indexOf('function mkB(',start);
assert(start>0&&end>start,'El joc ha de conservar el destructor real de mobiliari');
for(const kind of ['bench','well']){
 const parts=Array.from({length:kind==='bench'?1:12},()=>wall(kind));
 const rubble=kind==='well'?{...wall(kind),civicFurniture:null,civicRubble:true,open:true}:null;
 const civic={kind,x:0,y:0,z:6,walls:parts,rubbleWall:rubble,
  intact:[{visible:true},{visible:true}],rubble:rubble?{visible:false}:null,broken:false};
 for(const w of parts)w.civicObject=civic;
 const Wl=[...parts,...(rubble?[rubble]:[])],effects={debris:0,puffs:0,sounds:0};
 const context={Wl,wallGridCount:0,wholeDamage:Math.ceil,
  debris:()=>effects.debris++,puff:()=>effects.puffs++,snd:()=>effects.sounds++,
  rn:(a,b)=>(a+b)/2};
 vm.runInNewContext(core.slice(start,end)+'\nglobalThis.damageCivic=dmgW;',context);
 context.damageCivic(parts[0],parts[0].hp,'heavy');
 assert.equal(civic.broken,true,'Trencament del '+kind);
 assert.equal(context.wallGridCount,-1,'Cal invalidar la graella física');
 assert.equal(Wl.length,kind==='bench'?0:1,'Eliminar tots els colliders de '+kind);
 assert(parts.every(w=>w.hp===0&&w.open&&w.playerBlock===false));
 assert(civic.intact.every(o=>!o.visible),'Ocultar la geometria sencera');
 if(rubble){assert.strictEqual(Wl[0],rubble);assert.equal(rubble.open,false);
  assert.equal(civic.rubble.visible,true);}
 assert.equal(effects.sounds,1,'Només una animació i so de destrucció');
 context.damageCivic(parts[0],parts[0].hp,'heavy');
 assert.equal(effects.sounds,1,'La segona col·lisió no pot repetir els efectes');
}
// En COOP, el Worker fa escombratge contra els mateixos volums, i després
// ja no ha de detectar la roca baixa amb el tanc.
const rubble={...wall('well'),civicFurniture:null,civicRubble:true,open:false,y1:.95};
const from={x:0,y:0,z:19,hd:0},to={x:0,y:0,z:0,hd:0,t:'tanc',v:3};
assert.equal(firstVehicleContact(to,from,[],{walls:[wall('well')]})?.kind,'wall');
assert.equal(firstVehicleContact(to,from,[],{walls:[rubble]}),null,'El tanc travessa el pou ensorrat');
assert.equal(firstVehicleContact({...to,t:'cotxe'},from,[],{walls:[rubble]})?.kind,'wall',
 'Els vehicles normals encara topen amb les runes');
const movement=core.slice(core.indexOf('function stepV('),core.indexOf('function animateTankTracks('));
assert(movement.includes("if(w.civicRubble&&v.t==='tanc')continue;"));
assert(movement.includes('tankCivicRam(v,w,v.envCd)')&&movement.includes('dmgW(w,w.hp)'),
 'La física SOLO/visual COOP ha de destruir el mobiliari amb el seu gestor habitual');
const relay=fs.readFileSync(new URL('../server/coop-vehicles.mjs',import.meta.url),'utf8');
assert(relay.includes('tankCivicRam(probe,hit.target,recovery)'),
 'El Worker COOP ha de fer servir la mateixa regla de tanc');
console.log('PASS: tanc enderroca bancs/pous, runes travessables, sense dany ni canvi en altres vehicles, SOLO+COOP');
