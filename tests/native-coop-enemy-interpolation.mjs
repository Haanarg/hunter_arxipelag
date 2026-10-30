import assert from 'node:assert/strict';
import {createNativeCoopInterpolation} from '../src/native-coop-interpolation.mjs';

// La simulació conserva 377 soldats autoritatius; només els que es mouen
// necessiten trajectòria gràfica entre snapshots de 10 Hz.
const base=Array.from({length:377},(_,i)=>({
 id:'guard-'+i,x:i*4,y:1,z:i%7,heading:0,hp:25
}));
const frame=(tick,mutate=()=>{})=>{
 const targets=base.map(row=>({...row}));
 mutate(targets);
 return {missionId:'enemy-motion',tick,status:'running',
  players:[{id:'a',x:0,y:1,z:0,hd:0,hp:25}],
  vehicles:[],combat:{targets}
 };
};
const near=(value,expected,epsilon=.001)=>assert(Math.abs(value-expected)<=epsilon,
 `Valor ${value} fora de ${expected} ± ${epsilon}`);
// Igual que els deltes reals, els registres estàtics mantenen identitat.
const retained=createNativeCoopInterpolation();
const retainedStart=frame(0);
retained.receive(retainedStart,'a');
retained.receive({...retainedStart,tick:3,
 combat:{targets:[...retainedStart.combat.targets]}},'a');
assert.equal(retained.stats.activeEnemies,0,
 'Cap trajectòria si els 377 registres conserven la referència');
const system=createNativeCoopInterpolation();
system.receive(frame(0),'a');
assert.equal(system.stats.activeEnemies,0,'Els soldats inicials no es mouen');
system.receive(frame(3,rows=>{
 rows[10].x+=1.2;rows[10].heading=.2;
 rows[100].x+=2.4;rows[100].heading=.5;
}),'a');
assert.equal(system.stats.activeEnemies,2,'Només els soldats canviats tenen track');
const first=system.enemy('guard-10').x;
for(let i=0;i<5;i++)system.advance(1/60);
assert(system.enemy('guard-10').x>first,'Moviment a cada fotograma');
assert.equal(system.enemy('guard-11'),null,'Els 375 soldats quiets no s’interpolen');
const visible=system.enemy('guard-10').x;
system.receive(frame(6,rows=>{
 rows[10].x+=2.4;rows[10].heading=.4;
 rows[100].x+=4.8;
}),'a');
near(system.enemy('guard-10').x,visible,1e-9);
assert.equal(system.stats.activeEnemies,2,'La nova pose no reinicia trajectòries');
system.advance(1/60);
assert(system.enemy('guard-10').x>visible,'Continua avançant suaument');
const from=system.enemy('guard-10').x;
// Un salt físic real no s'ha de suavitzar al llarg de desenes de metres.
system.receive(frame(9,rows=>{
 rows[10].x=999;rows[100].x+=7.2;
}),'a');
assert.equal(system.enemy('guard-10'),null,'Teletransport real del soldat');
assert(system.stats.teleports>0,'Comptador del teleport');
assert(system.enemy('guard-100'),'La resta de soldats continuen');
system.receive(frame(12,rows=>{
 rows[10].hp=0;rows[100].hp=0;
}),'a');
assert.equal(system.enemy('guard-100'),null,'Mort: eliminar trajectòria gràfica');
assert.equal(system.stats.activeEnemies,0);
// Els deltes poden reordenar soldats quan se n'inserten o eliminen.
const reordered=createNativeCoopInterpolation();
reordered.receive(frame(0),'a');
reordered.receive(frame(3,rows=>{rows[10].x+=.9}),'a');
const reverse=frame(6,rows=>{rows[10].x+=1.8});
reverse.combat.targets.reverse();
reordered.receive(reverse,'a');
assert.equal(reordered.stats.activeEnemies,1,'Reordenar els 377 enemics no duplica tracks');
assert(reordered.enemy('guard-10'),'Es conserva la mateixa identitat de soldat');
// Si s'acaben els moviments, el track desapareix i no costa CPU al render.
const still=createNativeCoopInterpolation();
still.receive(frame(0),'a');
still.receive(frame(3,rows=>{rows[10].x+=1}),'a');
still.advance(.1);
still.receive(frame(6,rows=>{rows[10].x+=1}),'a');
still.receive(frame(9,rows=>{rows[10].x+=1}),'a');
still.advance(.1);
for(let tick=12;tick<=60;tick+=3){
 still.receive(frame(tick,rows=>{rows[10].x+=1}),'a');
 still.advance(.1);
}
assert.equal(still.stats.activeEnemies,0,'El soldat aturat allibera el track');
assert.equal(system.enemy('guard-11'),null,'La multitud quieta segueix sense tracks');
console.log('native coop enemy interpolation: 377 soldiers, smooth movement, teleport, death, reorder, idle passed');
