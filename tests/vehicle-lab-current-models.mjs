import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATALOG} from '../src/vehicle-candidate-catalog.mjs';

const names=CATALOG.map(x=>x.id);
assert(!names.includes('cotxe_civil'),'El C1A aprovat ja no pertany al laboratori');
for(const id of ['heli','heli_combat']){
 assert(names.includes(id),'Cal la pestanya '+id);
 const config=CATALOG.find(x=>x.id===id);
 assert.equal(config.kind,'aire');
 assert.deepEqual(config.options,[],'Ha de mostrar només el model definitiu');
}
const lab=readFileSync(new URL('../src/vehicles-externs-proves.mjs',import.meta.url),'utf8');
assert(lab.includes('prepareHueyDuaneRuntime(THREE)'));
assert(lab.includes('prepareApacheAraonRuntime(THREE)'));
assert(lab.includes("config.id==='heli'||config.id==='heli_combat'"));
assert(!lab.includes('createCivilianCarRoofCandidate'));
const boot=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8');
const vehicles=readFileSync(new URL('../src/vehicles.js',import.meta.url),'utf8');
assert(boot.includes('window.HUNTER_CIVIL_C1A=createCivilianCarModel'));
assert(vehicles.includes('civilianCar:window.HUNTER_CIVIL_C1A'));
console.log('PASS lab: helicòpters definitius editables, cotxe C1A integrat a la fàbrica del joc');
