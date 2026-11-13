// Contracte actual del laboratori, manifest i editor (sense dependències
// amb els antics candidats GLB de la BTR-82).
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('assets/vehicle-candidates/manifest.json'));
const catalog=read('src/vehicle-candidate-catalog.mjs');
const studio=read('src/vehicles-externs-proves.mjs');
const html=read('vehicles-externs-proves.html');
const types=[...catalog.matchAll(/\{id:'([^']+)'/g)].map(x=>x[1]);
assert.deepEqual(new Set(types),new Set([
 'tanqueta','cotxe','heli','heli_combat','tanc','llanxa','llanxa_coets','ferry'
]));
assert(!types.includes('cotxe_civil'));
for(const type of ['heli','heli_combat'])assert(!Object.hasOwn(manifest.models,type));
assert.equal(manifest.savedModels,3);
assert.equal(manifest.savedBytes,851208);
assert.equal(Object.values(manifest.models).flat().length,3);
assert.deepEqual(manifest.models.ferry,[]);
assert.deepEqual(manifest.models.llanxa_coets,[]);
assert.deepEqual(manifest.models.tanqueta,[]);
assert(!Object.hasOwn(manifest,'selectedForLod'));
assert(studio.includes('createBtr823BPreview()'));
assert(studio.includes('prepareHueyDuaneRuntime(THREE)'));
assert(studio.includes('prepareApacheAraonRuntime(THREE)'));
assert(!studio.includes('studio.load(token)'));
assert(studio.includes('slot.outer.hidden=slots.indexOf(slot)>(soloStudy?0:config.options.length)'));
assert(studio.includes('createVehicleAnnotationEditor'));
assert(studio.includes('createVehicleLiveEditor'));
assert(html.includes('id="liveEditor"')&&html.includes('id="vehicleList"'));
const labRevision=JSON.parse(read('assets/vehicle-candidates/lab-revision.json')).revision;
assert(read('src/vehicle-live-editor.mjs').includes("LAB_REVISION='"+labRevision+"'"));
assert(html.includes('src/vehicles-externs-proves.mjs?rev='+labRevision));
assert(studio.includes('vehicle-live-editor.mjs?rev='+labRevision));
assert(studio.includes('vehicle-candidate-catalog.mjs?rev='+labRevision));
for(const file of [
 'src/vehicles-externs-proves.mjs','src/vehicle-candidate-catalog.mjs',
 'src/vehicle-live-editor.mjs','src/btr82-3b-preview.mjs',
 'src/vehicle-annotation-editor.mjs','src/vehicle-hole-brush.mjs',
 'tools/fetch-vehicle-candidates.mjs','tests/btr82-published-assets.cjs',
 'tests/vehicle-candidate-studio.cjs'
])execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'tests/btr82-published-assets.cjs')],{stdio:'pipe'});
console.log('PASS laboratori: vuit pestanyes, manifest coherent, només tres GLB');
