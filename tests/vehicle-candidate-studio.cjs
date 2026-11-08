// Integritat de la carpeta de candidats, sense WebGL ni xarxa.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('assets/vehicle-candidates/manifest.json'));
const excluded=['camio','barca_rems','windsurf','moto_aquatica','moto','heli','heli_combat'];
const catalog=read('src/vehicle-candidate-catalog.mjs');
const studio=read('src/vehicles-externs-proves.mjs');
const html=read('vehicles-externs-proves.html');
const types=[...catalog.matchAll(/\{id:'([^']+)'/g)].map(m=>m[1]);
assert.equal(types.length,7,'Catàleg: set vehicles pendents després d’aprovar Huey i Apache');
for(const id of excluded){
 assert(!types.includes(id),'Vehicle definitivament decidit encara al catàleg: '+id);
 assert(!(id in manifest.models),'Vehicle acceptat encara al manifest: '+id);
 assert(!fs.existsSync(path.join(root,'assets/vehicle-candidates',id)),'Carpeta de GLB rebutjats encara present: '+id);
}
for(const id of ['bici','cotxe_civil','llanxa','ferry'])assert(types.includes(id));
assert(fs.existsSync(path.join(root,'src/jet-ski-25-geometry.mjs')),'Falta el model de moto aquàtica del joc');
assert(fs.existsSync(path.join(root,'src/streetfighter-25-geometry.mjs')),'Falta el model definitiu Naked streetfighter');
assert(!studio.includes('FEATURED'),'El banc de proves no ha de calcular LOD de motos acceptades');
assert(!studio.includes('SimplifyModifier'),'No cal simplificar els candidats acceptats al banc');
assert(!html.includes('id="steeringControl"'),'La pestanya de moto i els seus controls s’han retirat');
assert(html.includes('7 tipus de vehicles'),'El text del catàleg ha d’estar actualitzat');
const files=Object.values(manifest.models).flat();
assert.equal(files.length,14,'Sis GLB genèrics retirats dels blindats; queden 14 CC0 locals');
assert.deepEqual(manifest.models.tanc,[],'Els antics tancs genèrics han desaparegut');
assert.deepEqual(manifest.models.tanqueta,[],'Els antics APC genèrics han desaparegut');
assert(manifest.limits.maxFileBytes>=32*1024*1024,'Cal admetre GLB més grans per als blindats');
for(const id of ['tanc','tanqueta']){
 const refs=manifest.externalModels?.[id];
 assert.equal(refs?.length,3,'Calen tres alternatives noves '+id);
 assert(refs.every(r=>r.provider==='sketchfab'&&/^[0-9a-f]{32}$/.test(r.modelId)
  &&r.license.startsWith('CC BY')&&/^https:\/\/sketchfab.com\/3d-models\//.test(r.url)
  &&r.triangles>1000),'Les fonts han de ser reals i amb llicència visible');
 for(const oldName of ['main-battle-tank','light-tank','self-propelled-gun','tracked-apc','wheeled-apc','armoured-car'])
  assert(!refs.some(r=>r.title.toLowerCase().includes(oldName)),'No conservar candidats genèrics');
 assert(!fs.existsSync(path.join(root,'assets/vehicle-candidates',id)),'Queden binaris rebutjats: '+id);
}
assert(studio.includes("entry.provider==='sketchfab'")&&studio.includes("frame.src='https://sketchfab.com/models/'"),
 'El preview ha de mostrar els models reals amb el visor oficial Sketchfab');
assert(studio.includes('slot.sourceFrame.remove()'),'El visor anterior s’ha de destruir quan es canvia de categoria');
assert(html.includes('M1A1 Abrams')&&html.includes('NZLAV 8×8'),'Cal explicar les noves referències a la pàgina');
for(const id of ['heli','heli_combat'])assert(!(id in manifest.models),'Helicòpter descartat encara al manifest: '+id);
assert.equal(manifest.retiredHelicopterCandidates,6);
assert(!catalog.includes('755d8518a06e41b19752c1b54c0da588'),'El Huey aprovat ja no ha de figurar entre els candidats');
assert(!catalog.includes('df0993ee21e74a759cd0519f6fc51cf8'),'El model Apache acceptat no pot seguir entre candidats');
assert(!studio.includes('helicopterToolbar'),'La barra de l’Apache s’ha de retirar');
assert.equal(manifest.savedModels,files.length);
assert.equal(manifest.savedBytes,files.reduce((sum,item)=>sum+item.bytes,0));
for(const item of files){
 const filename=path.join(root,'assets/vehicle-candidates',item.file);
 assert(fs.existsSync(filename),'GLB candidat absent: '+item.file);
 assert.equal(fs.statSync(filename).size,item.bytes,'Mida GLB incorrecta: '+item.file);
}
for(const old of ['helicopters-lod-proves.html','apache-variants-proves.html',
 'src/helicopters-lod-proves.mjs','src/apache-variants-proves.mjs',
 'assets/vehicle-candidates/helicopter-lods/manifest.json',
 'assets/vehicle-candidates/helicopter-lods/apache-hybrid-manifest.json'])
 assert(!fs.existsSync(path.join(root,old)),'Cal retirar el candidat obsolet: '+old);
for(const file of ['src/vehicles-externs-proves.mjs','src/vehicle-candidate-catalog.mjs','src/streetfighter-25-geometry.mjs'])
 execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
console.log('Banc de models: 7 tipus pendents, 14 GLB locals CC0 i 6 referències oficials Abrams/NZLAV; Huey i Apache acceptats.');
