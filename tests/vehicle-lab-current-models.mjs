import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATALOG} from '../src/vehicle-candidate-catalog.mjs';

const names=CATALOG.map(x=>x.id);
assert(names.includes('cotxe_civil'),'Cal el model C1A actual editable');
assert.equal(CATALOG.find(x=>x.id==='cotxe_civil').options.length,0);
assert(!names.includes('cotxe'),'El GAZ aprovat ha de desaparèixer de les pestanyes');
assert(!names.includes('tanc'),'El T-90M ja no ha de sortir al laboratori');
assert(!names.includes('tanqueta'),'La BTR-82 3B ja no ha de sortir al laboratori');
assert.deepEqual(names,['cotxe_civil','heli','heli_combat','llanxa','llanxa_coets','ferry']);
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
const gameModels=readFileSync(new URL('../src/vehicle-model-core.mjs',import.meta.url),'utf8');
assert(boot.includes('window.HUNTER_CIVIL_C1A=createCivilianCarModel'));
assert(vehicles.includes('civilianCar:window.HUNTER_CIVIL_C1A'));
assert(boot.includes('window.HUNTER_GAZ_TIGR=prepareGazTigrRuntime'));
assert(vehicles.includes('gaz:window.HUNTER_GAZ_TIGR'));
assert(gameModels.includes('installT90MModel(THREE,g)'),'El T-90M s’ha de conservar al joc');
assert(gameModels.includes('installBtr82Model3B(THREE,g'),'La BTR-82 s’ha de conservar al joc');
console.log('PASS lab: T-90M, BTR-82 i GAZ al joc i fora del laboratori; Kamov preservats');
