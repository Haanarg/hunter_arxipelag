// Regressió: llavor 422475840. L'heliport del camp de presoners no
// pot tenir cap torre sobre la plataforma, ni al marge de seguretat.
// Geometria pura: no arrenca WebGL, ni modifica RNG, ni imposa una altra llavor.
import assert from 'node:assert/strict';
import {prisonCampLayout} from '../src/prison-camp-layout.mjs';
import {runtimeLayouts} from '../src/compound-runtime-layouts.mjs';
import {
 helipadTowerClear,reserveHelipadTowerSpace,HELIPAD_TOWER_CLEARANCE,compoundPoint
} from '../src/compound-planning.mjs';

const towers=l=>l.towers||[l.tower].filter(Boolean);
const safe=l=>!l.helipad||towers(l).every(t=>helipadTowerClear(l.helipad,t));
const actual=reserveHelipadTowerSpace(prisonCampLayout);
assert(safe(actual),'El camp de presoners encara té una torre dins l’heliport');
assert.equal(towers(actual).length,4,'No hem de perdre cap torre del camp');
assert.deepEqual(towers(actual)[3],{x:56,z:8},
 'La torre est ha de quedar fora del quadrat i del rotor de la plataforma');
assert.equal(HELIPAD_TOWER_CLEARANCE.margin,6);
// Aquestes són les coordenades que produïen el problema a la captura del
// 08/11/2026 amb la llavor 422475840. El planificador l'ha de corregir.
const historical=structuredClone(prisonCampLayout);
historical.towers[3]={x:56,z:56};
assert(!safe(historical),'Cal detectar la torre històrica sobre l’heliport');
const before=JSON.stringify(historical);
const fixed=reserveHelipadTowerSpace(historical);
assert.deepEqual(JSON.stringify(historical),before,'La reserva no pot modificar el layout font');
assert.equal(fixed.heliportTowerClearance?.relocated,1,
 'La torre conflictiva hauria de recol·locar-se');
assert.equal(fixed.heliportTowerClearance?.omitted,0);
assert.equal(towers(fixed).length,4);
assert(safe(fixed),'El corrector no ha respectat la plataforma quadrada');
assert.strictEqual(reserveHelipadTowerSpace(fixed),fixed,
 'La reserva ha de ser idempotent quan ja no hi ha conflicte');
// La transformació del complex només gira per quarts de volta i manté les
// distàncies. Verificam les quatre orientacions sense cap RNG.
for(let turns=0;turns<4;turns++){
 const tr=compoundPoint({x:1026,z:871},turns*Math.PI/2);
 const [px,pz]=tr(fixed.helipad.x,fixed.helipad.z);
 const p={...fixed.helipad,x:px,z:pz};
 for(const t of towers(fixed)){
  const [x,z]=tr(t.x,t.z);
  // Prova conservadora sense dependre de la rotació dels eixos locals.
  const distance=Math.hypot(x-px,z-pz);
  assert(distance>fixed.helipad.clearRadius+6,
   'La torre entra dins la reserva del disc de rotor, gir '+turns);
 }
}
// Aplicam exactament el mateix control als heliports presents en les
// variants actuals (inclòs el tipus 2 amb torre pròpia).
for(const layout of runtimeLayouts.filter(l=>l.helipad)){
 const checked=reserveHelipadTowerSpace(layout);
 assert(safe(checked),'Solapament de torres amb heliport a '+layout.id);
}
const impossible={
 id:'impossible',size:[20,20],helipad:{x:0,z:0,size:18,clearRadius:10},
 buildings:[],routes:[],props:[],vehicles:[],tower:{x:0,z:0}
};
const omitted=reserveHelipadTowerSpace(impossible);
assert.equal(omitted.tower,null,
 'Si un lloc és físicament impossible, no s’hi pot aixecar la torre');
assert.equal(omitted.heliportTowerClearance.omitted,1);
console.log('Heliports protegits: llavor 422475840, torre del camp recol·locada, 4 orientacions i variants verificades.');
