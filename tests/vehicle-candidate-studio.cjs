// Comprovacions estàtiques del taller de models externs; no cal WebGL ni xarxa.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('assets/vehicle-candidates/manifest.json'));
const excluded=['camio','barca_rems','windsurf'];
const catalogText=read('src/vehicle-candidate-catalog.mjs');
const studio=read('src/vehicles-externs-proves.mjs');
const html=read('vehicles-externs-proves.html');
const types=[...catalogText.matchAll(/\{id:'([^']+)'/g)].map(match=>match[1]);
assert.equal(types.length,11,'Només 11 tipus de vehicles en revisió');
for(const id of excluded){
  assert(!types.includes(id),'Candidat descartat en el catàleg: '+id);
  assert(!(id in manifest.models),'Candidat descartat en el manifest: '+id);
  assert(!fs.existsSync(path.join(root,'assets/vehicle-candidates',id)),'GLB rebutjats encara al repositori: '+id);
}
assert(types.includes('moto')&&types.includes('moto_aquatica'));
assert.equal(manifest.models.moto.find(item=>item.slot===2)?.id,'15425','Streetfighter escollida');
assert.equal(manifest.models.moto_aquatica.find(item=>item.slot===3)?.id,'39428','Jet Ski escollida');
const files=Object.values(manifest.models).flat();
assert.equal(files.length,manifest.savedModels);
assert.equal(files.reduce((sum,r)=>sum+r.bytes,0),manifest.savedBytes);
for(const item of files){
 const filename=path.join(root,'assets/vehicle-candidates',item.file);
 assert(fs.existsSync(filename),'GLB del manifest no existeix: '+item.file);
 assert.equal(fs.statSync(filename).size,item.bytes,'Mida GLB incorrecta: '+item.file);
}
for(const ratio of ['.85','.65','.45','.25'])assert(studio.includes('ratio:'+ratio),'LOD absent '+ratio);
for(const part of ['side-stand','naked-streetfighter_13','handlebar'])assert(studio.includes(part),'Retoc de moto absent: '+part);
assert(studio.includes('simplifier.modify('),'La simplificació ha de modificar les malles de veritat');
assert(studio.includes('i<6'),'El visor necessita 6 panells per comparar LOD');
assert(html.includes('id="featureInfo"'),'Falta apartat de descripció de LOD');
assert(fs.existsSync(path.join(root,'vendor/three-addons/modifiers/SimplifyModifier.js')));
assert(fs.existsSync(path.join(root,'vendor/three-addons/libs/meshopt_simplifier.module.js')));
for(const file of ['src/vehicles-externs-proves.mjs','src/vehicle-candidate-catalog.mjs','vendor/three-addons/modifiers/SimplifyModifier.js']){
  execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
}
console.log('Taller de models: 11 vehicles, 32 GLB verificats, dos seleccionats i 4 variants LOD cadascun.');
