// Binary integrity gate before publishing BTR-82 source/LODs to GitHub.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../assets/vehicle-candidates/tanqueta');
const cases=[
 ['btr82-original.glb',1592172,21483,199,'575fd57e125edfb9c6b1d539ed6eadb44468f9bf3c709a48c135f876db664679'],
 ['btr82-75pct.glb',1164540,16109,18,'a1e2b6342bb813afd2bba23cd4b27cb1badcd9d5ede01e3665daa44a4eef380b'],
 ['btr82-50pct.glb',843888,10745,18,'f3c8db5e24ecf568a597d9383cb7885ccf6821a56c37c4a8293a3f8e68d257b5'],
 ['btr82-25pct.glb',428172,5371,18,'5d26d5af11a575d085411308e2cb8e695f6d6346d505798661cde88165d4be7d']
];
const actual=fs.readdirSync(dir).filter(n=>n.endsWith('.glb')).sort();
assert.deepEqual(actual,cases.map(x=>x[0]).sort(),'Només s’han de publicar els GLB aprovats');
for(const [name,size,tris,meshes,sha] of cases){
 const data=fs.readFileSync(path.join(dir,name));
 assert.equal(data.length,size,'Mida inconsistent de '+name);
 assert.equal(data.toString('ascii',0,4),'glTF','Capçalera incorrecta de '+name);
 assert.equal(data.readUInt32LE(4),2,'Versió GLB incorrecta '+name);
 assert.equal(data.readUInt32LE(8),data.length,'Longitud incorrecta '+name);
 assert.equal(crypto.createHash('sha256').update(data).digest('hex'),sha,'SHA256 inesperat '+name);
 const len=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+len).toString('utf8'));
 assert.equal(json.meshes.length,meshes,'Nombre de malles inesperat '+name);
 const total=json.meshes.reduce((n,m)=>n+m.primitives.reduce((s,p)=>s+json.accessors[p.indices].count/3,0),0);
 assert.equal(total,tris,'Nombre de triangles incorrecte '+name);
 assert.equal(json.materials?.length,10,'Materials incomplets de '+name);
 if(name==='btr82-original.glb'){
  assert.equal(json.images?.length,11,'L’original ha de conservar les 11 textures PNG');
  assert(json.materials.every(m=>m.pbrMetallicRoughness?.baseColorTexture),
   'L’original NO es pot modificar ni perdre les textures');
 }else{
  assert.equal(json.images?.length||0,0,'Cap atlas UV defectuós al LOD '+name);
  assert.equal(json.textures?.length||0,0,'No deixar textures pendents al LOD '+name);
  assert(json.asset.generator?.includes('BTR-82-matte-UV-repair-v1'),
   'El GLB ha de tenir la reparació validada de materials');
  for(const mat of json.materials){
   assert.equal(mat.pbrMetallicRoughness?.baseColorTexture,undefined,
    'Les UV errònies no s’han de fer servir al LOD '+name);
   assert(!mat.alphaMode||mat.alphaMode==='OPAQUE',
    'S’han de treure les màscares alfa que invisibilitzen el casc');
   assert.equal(mat.pbrMetallicRoughness?.baseColorFactor?.[3],1);
   assert(mat.pbrMetallicRoughness?.roughnessFactor>=.9,
    'Materials mats obligatoris per als LOD');
  }
 }
 console.log('OK '+name+': '+total+' triangles, '+meshes+' malles, '+
  (name==='btr82-original.glb'?'11 textures originals':'10 materials militars mats, sense artefactes UV'));
}
const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../assets/vehicle-candidates/manifest.json'),'utf8'));
assert.deepEqual(manifest.selectedForLod.tanqueta.ratioLevels,[1,.75,.5,.25]);
console.log('BTR-82: GLB aprovats, íntegres i disponibles al banc de models.');
