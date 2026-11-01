import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {modelTraces} from './helpers/vehicle-model-trace.mjs';
const original=JSON.parse(readFileSync(new URL('./fixtures/vehicle-model-traces.json',import.meta.url)));
const current=await modelTraces(vehicleModels);
// El model D de l'hovercraft substitueix expressament el model històric; els
// altres quinze vehicles han de mantenir EXACTAMENT la geometria congelada.
const {hover:oldHover,...oldOthers}=original;
const {hover:newHover,...newOthers}=current;
assert.deepEqual(newOthers,oldOthers,'No s’han de modificar els altres quinze models');
assert.match(newHover,/^[0-9a-f]{64}$/);
assert.notEqual(newHover,oldHover,'La geometria de l’hovercraft ha de ser la nova variant D');
console.log('15 vehicles sense regressions respecte del baseline; hovercraft D actualitzat — OK');
