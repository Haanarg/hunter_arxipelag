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
assert(html.includes('9 vehicles'),'El text del catàleg ha d’estar actualitzat');
const files=Object.values(manifest.models).flat();
assert.equal(files.length,26,'Han de quedar 26 GLB candidats no seleccionats');
assert.equal(manifest.savedModels,files.length);
assert.equal(manifest.savedBytes,files.reduce((sum,item)=>sum+item.bytes,0));
for(const item of files){
 const filename=path.join(root,'assets/vehicle-candidates',item.file);
 assert(fs.existsSync(filename),'GLB candidat absent: '+item.file);
 assert.equal(fs.statSync(filename).size,item.bytes,'Mida GLB incorrecta: '+item.file);
}
for(const file of ['src/vehicles-externs-proves.mjs','src/vehicle-candidate-catalog.mjs','src/streetfighter-25-geometry.mjs'])
 execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
console.log('Banc de models: 9 vehicles, 26 GLB; moto i moto aquàtica definitives fora del catàleg.');
