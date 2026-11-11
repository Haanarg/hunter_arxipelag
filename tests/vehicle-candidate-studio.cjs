// Comprovacions bàsiques del laboratori de models: candidats, BTR-82 i editor.
'use strict';
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('assets/vehicle-candidates/manifest.json'));
const catalog=read('src/vehicle-candidate-catalog.mjs');
const studio=read('src/vehicles-externs-proves.mjs');
const html=read('vehicles-externs-proves.html');
const btr=read('src/btr82-lod-studio.mjs');
const hull=read('src/btr82-hull-v3.mjs');
const editor=read('src/vehicle-annotation-editor.mjs');

// Només categories pendents. No recuperar vehicles ja acceptats.
const types=[...catalog.matchAll(/\{id:'([^']+)'/g)].map(m=>m[1]);
assert.equal(types.length,5,'El laboratori ha de tenir cinc categories');
assert.deepEqual(new Set(types),new Set(['tanqueta','tanc','llanxa','llanxa_coets','ferry']));
for(const id of ['bici','cotxe_civil','camio','barca_rems','windsurf','moto_aquatica','moto','heli','heli_combat']){
 assert(!types.includes(id),'Vehicle aprovat al catàleg: '+id);
 assert(!(id in manifest.models),'Vehicle aprovat al manifest: '+id);
}
assert.equal(manifest.retiredHelicopterCandidates,6);
assert(!studio.includes('FEATURED')&&!studio.includes('SimplifyModifier'));

// Els comptadors han de reflectir els arxius actuals (no una xifra històrica fixa).
const files=Object.values(manifest.models).flat();
assert.equal(manifest.savedModels,files.length,'Recompte de models incorrecte');
assert.equal(manifest.savedBytes,files.reduce((sum,v)=>sum+v.bytes,0),'Recompte de bytes incorrecte');
for(const item of files){
 const filename=path.join(root,'assets/vehicle-candidates',item.file);
 assert(fs.existsSync(filename),'Falta el GLB: '+item.file);
 assert.equal(fs.statSync(filename).size,item.bytes,'Mida incorrecta: '+item.file);
}
assert.deepEqual(manifest.models.tanc,[]);
assert.deepEqual(manifest.models.tanqueta,[]);
assert(manifest.limits.maxFileBytes>=32*1024*1024);
assert.equal(manifest.externalModels.tanc.length,3);
assert.equal(manifest.externalModels.tanqueta.length,1);
for(const id of ['tanc','tanqueta'])for(const candidate of manifest.externalModels[id]){
 assert.equal(candidate.provider,'sketchfab');
 assert.match(candidate.modelId,/^[0-9a-f]{32}$/);
 assert(candidate.license.startsWith('CC BY'));
 assert(candidate.url.startsWith('https://sketchfab.com/3d-models/'));
}
assert.equal(manifest.externalModels.tanqueta[0].modelId,'6226acae68424d99bf03882b245ff7c5');

// Compara només l'original i la v3, amb coherència entre mòdul i revisió de cache.
const version=btr.match(/export const BTR82_VERSION='([^']+)'/)?.[1];
assert(version&&version.startsWith('btr82-'),'Falta la revisió del BTR-82');
assert(studio.includes('btr82-lod-studio.mjs?rev='+version),'Revisions del BTR-82 desincronitzades');
assert(html.includes('src/vehicles-externs-proves.mjs?rev='));
assert(btr.includes("BASE_FILE='btr82-base-100.glb'"));
assert(btr.includes('withTruckWheels')&&btr.includes('replaceBarrelWithCylinders'));
assert.equal((btr.match(/\{slot:[01],level:[03],title:/g)||[]).length,2,'Calen dos visors BTR-82');
assert(btr.includes('makeBtr82HullV3(baseline)')&&!btr.includes('makeBtr82HullV2('));
assert(studio.includes("const btrStudy=config.id==='tanqueta'"));
assert(studio.includes('slot.outer.hidden=btrStudy?slots.indexOf(slot)>0:slots.indexOf(slot)>3'));
assert(studio.includes('createBtr823BPreview()'));
assert(!studio.includes('studio.load(token)'),'Els antics GLB no han de carregar-se en triar la tanqueta');
assert(html.includes('#grid.btr-study{grid-template-columns:minmax(0,1fr)'));
assert(html.includes('#grid.btr-study{grid-template-columns:repeat(2'));
assert(hull.includes('BTR82_HULL_V3_STATIONS')&&hull.includes('createBtr82HullV3Geometry'));
assert(hull.includes('createBtr82TurretV3Geometry')&&hull.includes('makeBtr82HullV3'));
assert(hull.includes("frontClosure:'symmetric-centerline'"));
assert(hull.includes("noseProfile:'full-depth-converging-wedge'"));
assert(hull.includes("rearProfile:'raised-hexagonal-rear'"));
assert(hull.includes('retainedWheels:wheels,retainedGunParts:barrel'));

// Editor inactiu per defecte, sense el mode de xapa descartat.
assert(html.includes('id="btrPartTool"')&&html.includes('Editor de marques 3D'));
assert(html.includes('id="btrSelectEnabled"')&&!html.includes('id="btrSelectEnabled" checked'));
for(const tool of ['value="join"','value="fill"','value="remove"'])
 assert(html.includes(tool),'Eina de l’editor absent: '+tool);
assert(html.includes('id="btrLargeHoleMode"')&&html.includes('id="btrRepairLiveCount"'));
assert(!html.includes('Pintar xapa (arrossegar)')&&!html.includes('id="btrMirrorSurfacePaint"'));
assert(studio.includes('createVehicleAnnotationEditor'));
assert(editor.includes('getHoleBrushTarget')&&editor.includes('closeHoleUnderBrush'));
assert(editor.includes('large:largeHole?.checked===true'));
assert(studio.includes("document.querySelector('#pan-up')")&&studio.includes("document.querySelector('#pan-down')"));
assert(html.includes('id="pan-left"')&&html.includes('id="pan-right"'));
assert(studio.includes("document.querySelector('#pan-left')")&&studio.includes("document.querySelector('#pan-right')"));
assert(studio.includes('targetX=Math.cos(yaw)*panScreenX')&&studio.includes('targetZ=-Math.sin(yaw)*panScreenX'));
assert(studio.includes('panScreenX-=(e.clientX-old[0])*distance*.0017'),'Majúscules + arrossegar ha de moure horitzontalment');
assert(studio.includes('zoom=1;lookY=defaultLookY;panScreenX=0;updateCamera()'),'Enquadra ha de restablir el pan horitzontal');

// El node parser valida també les cadenes i l'escapat de cometes.
for(const file of [
 'tests/vehicle-candidate-studio.cjs','tests/btr82-hull-v3-geometry.cjs',
 'src/vehicles-externs-proves.mjs','src/vehicle-candidate-catalog.mjs',
 'src/btr82-lod-studio.mjs','src/btr82-hull-v3.mjs',
 'src/vehicle-annotation-editor.mjs','src/vehicle-hole-brush.mjs'
])execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'tests/btr82-hull-v3-geometry.cjs')],{stdio:'pipe'});
console.log('PASS vehicle candidate studio: catalog, manifest, BTR-82 v3, editor and syntax');
