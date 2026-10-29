import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {modelTraces} from './helpers/vehicle-model-trace.mjs';
const original=JSON.parse(readFileSync(new URL('./fixtures/vehicle-model-traces.json',import.meta.url)));
assert.deepEqual(await modelTraces(vehicleModels),original);
console.log('all 16 shared model geometries, transforms and materials match frozen individual v0.6.39 hashes');
