// Integritat de la carpeta de candidats, sense WebGL ni xarxa.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('assets/vehicle-candidates/manifest.json'));
const excluded=['camio','barca_rems','windsurf','moto_aquatica','moto'];
const catalog=read('src/vehicle-candidate-catalog.mjs');
const studio=read('src/vehicles-externs-proves.mjs');
const html=read('vehicles-externs-proves.html');
const types=[...catalog.matchAll(/\{id:'([^']+)'/g)].map(m=>m[1]);
assert.equal(types.length,9,'Nou catàleg: nou vehicles pendents de seleccionar');
for(const id of excluded){
 assert(!types.includes(id),'Vehicle definitivament decidit encara al catàleg: '+id);
 assert(!(id in manifest.models),'Vehicle acceptat encara al manifest: '+id);
 assert(!fs.existsSync(path.join(root,'assets/vehicle-candidates',id)),'Carpeta de GLB rebutjats encara present: '+id);
}
for(const id of ['bici','cotxe_civil','llanxa','ferry','heli'])assert(types.includes(id));
assert(fs.existsSync(path.join(root,'src/jet-ski-25-geometry.mjs')),'Falta el model de moto aquàtica del joc');
assert(fs.existsSync(path.join(root,'src/streetfighter-25-geometry.mjs')),'Falta el model definitiu Naked streetfighter');
assert(!studio.includes('FEATURED'),'El banc de proves no ha de calcular LOD de motos acceptades');
assert(!studio.includes('SimplifyModifier'),'No cal simplificar els candidats acceptats al banc');
assert(!html.includes('id="steeringControl"'),'La pestanya de moto i els seus controls s’han retirat');
assert(html.includes('9 tipus de vehicles'),'El text del catàleg ha d’estar actualitzat');
const files=Object.values(manifest.models).flat();
assert.equal(files.length,20,'Han de quedar 20 GLB candidats després de retirar els helicòpters civils');
for(const id of ['heli','heli_combat'])assert(!(id in manifest.models),'Helicòpter descartat encara al manifest: '+id);
assert.equal(manifest.retiredHelicopterCandidates,6);
for(const source of ['755d8518a06e41b19752c1b54c0da588','df0993ee21e74a759cd0519f6fc51cf8'])assert(catalog.includes(source),'Model militar escollit absent: '+source);
assert(studio.includes("entry.provider==='sketchfab'"),'Cal visor oficial Sketchfab per als helicòpters');
assert.equal(manifest.savedModels,files.length);
assert.equal(manifest.savedBytes,files.reduce((sum,item)=>sum+item.bytes,0));
for(const item of files){
 const filename=path.join(root,'assets/vehicle-candidates',item.file);
 assert(fs.existsSync(filename),'GLB candidat absent: '+item.file);
 assert.equal(fs.statSync(filename).size,item.bytes,'Mida GLB incorrecta: '+item.file);
}
const helicopterManifest=JSON.parse(read('assets/vehicle-candidates/helicopter-lods/manifest.json'));
const helicopterPage=read('helicopters-lod-proves.html');
const helicopterScript=read('src/helicopters-lod-proves.mjs');
assert.equal(helicopterManifest.state,'metadata_only_awaiting_binary_upload','No marcar els GLB com a pujats si encara falten');
for(const [type,levels] of Object.entries({huey:[2014,1649,1286,922],apache:[3808,2990,2173,1355]})){
 const variants=helicopterManifest.models[type].variants;
 assert.deepEqual(variants.map(item=>item.level),[100,75,50,25]);
 assert.deepEqual(variants.map(item=>item.triangles),levels);
 for(const variant of variants)assert(variant.file===type+'_'+variant.level+'.glb');
}
assert(helicopterPage.includes('Huey')&&helicopterPage.includes('Apache'),'Pàgina de comparació d’helicòpters absent');
assert(helicopterScript.includes('unzipSelected')&&helicopterScript.includes('getBlob'),'El visor ha de poder carregar ZIP i GLB publicats');
assert(html.includes('helicopters-lod-proves.html'),'Falta l’enllaç al nou comparador des del banc general');
for(const file of ['src/vehicles-externs-proves.mjs','src/vehicle-candidate-catalog.mjs','src/streetfighter-25-geometry.mjs','src/helicopters-lod-proves.mjs'])
 execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
console.log('Banc de models: 9 vehicles, 20 GLB locals; Huey/Apache triats i visor de 8 LOD (pendents de pujar).');
