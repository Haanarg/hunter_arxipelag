// Regressió d'inventari: no hi ha GLB antics de tanqueta, Huey,
// llanxes de combat ni ferris al repositori publicable.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const assets=path.join(root,'assets');
const manifest=JSON.parse(fs.readFileSync(path.join(assets,'vehicle-candidates/manifest.json'),'utf8'));
const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
 const p=path.join(dir,ent.name);
 return ent.isDirectory()?walk(p):ent.name.toLowerCase().endsWith('.glb')?[path.relative(assets,p).replaceAll(path.sep,'/')]:[];
}):[];
const actual=walk(assets).sort();
const expected=[
 'vehicle-candidates/llanxa/1-transport-collection-hd-sport-runabout-5b288a58.glb',
 'vehicle-candidates/llanxa/2-powerboat-racing-and-launch-ramp-offshore-monohull-rac-2fa0de2f.glb',
 'vehicle-candidates/llanxa/3-powerboat-racing-and-launch-ramp-rescue-boat-ed671043.glb'
].sort();
assert.deepEqual(actual,expected,'Només han de quedar tres GLB de llanxa ràpida');
assert.equal(manifest.savedModels,3);
assert.equal(manifest.savedBytes,851208);
for(const key of ['ferry','llanxa_coets','tanqueta'])
 assert.deepEqual(manifest.models[key],[],key+' no pot tenir candidats desats');
assert(!manifest.selectedForLod,'La BTR-82 antiga ja no pot referenciar GLB');
for(const record of manifest.models.llanxa){
 const rel='vehicle-candidates/'+record.file;
 assert(actual.includes(rel),'Fitxer conservat absent: '+rel);
 assert.equal(fs.statSync(path.join(assets,rel)).size,record.bytes);
}
const preview=fs.readFileSync(path.join(root,'src/btr82-3b-preview.mjs'),'utf8');
const huey=fs.readFileSync(path.join(root,'src/huey-duane-runtime.mjs'),'utf8');
assert(preview.includes('createBtr823BPreview')&&!preview.includes('GLTFLoader'));
assert(huey.includes('createNativeHuey')&&!/import\s+.*GLTFLoader/.test(huey)&&!/new\s+GLTFLoader\s*\(/.test(huey),
 'El Huey no pot carregar un GLB (els comentaris històrics no compten)');
const fetcher=fs.readFileSync(path.join(root,'tools/fetch-vehicle-candidates.mjs'),'utf8');
assert(fetcher.includes("REMOTE_ONLY_CATEGORIES=new Set(['llanxa_coets','ferry'])"));
console.log('PASS inventari GLB: només 3 llanxes ràpides; BTR-82, Huey, combat i ferris retirats');
