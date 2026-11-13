import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATALOG} from '../src/vehicle-candidate-catalog.mjs';

const names=CATALOG.map(x=>x.id);
assert(!names.includes('cotxe_civil'),'El C1A aprovat ja no pertany al laboratori');
assert(!names.includes('cotxe'),'El GAZ aprovat ha de desaparèixer de les pestanyes');
for(const id of ['heli','heli_combat']){
 assert(names.includes(id),'Cal la pestanya '+id);
 const config=CATALOG.find(x=>x.id===id);
 assert.equal(config.kind,'aire');
 assert.equal(config.options.length,1,'Actual i candidat Kamov');
 assert.equal(config.options[0].variant,id==='heli'?'ka60':'ka52');
}
const lab=readFileSync(new URL('../src/vehicles-externs-proves.mjs',import.meta.url),'utf8');
assert(lab.includes('prepareHueyDuaneRuntime(THREE)'));
assert(lab.includes('prepareApacheAraonRuntime(THREE)'));
assert(lab.includes('stepKamovRotors(slot.model,dt)'));
assert(!lab.includes('createCivilianCarRoofCandidate'));
assert(!lab.includes('prepareGazTigrRuntime'));
assert(!lab.includes('makeCurrentGaz'));
assert(lab.includes('makeOriginal(type,{color:0x4b9fd1})'));
const boot=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8');
const vehicles=readFileSync(new URL('../src/vehicles.js',import.meta.url),'utf8');
assert(boot.includes('window.HUNTER_CIVIL_C1A=createCivilianCarModel'));
assert(vehicles.includes('civilianCar:window.HUNTER_CIVIL_C1A'));
assert(boot.includes('window.HUNTER_GAZ_TIGR=prepareGazTigrRuntime'));
assert(vehicles.includes('gaz:window.HUNTER_GAZ_TIGR'));
console.log('PASS lab: GAZ al joc i fora del laboratori; candidats Kamov preservats');
