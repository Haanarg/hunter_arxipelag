// Strict validation of the archived original and four BTR-82 25%-base GLBs.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../assets/vehicle-candidates/tanqueta');
const cases=[
 ['btr82-original.glb',1592172,21483,199,'575fd57e125edfb9c6b1d539ed6eadb44468f9bf3c709a48c135f876db664679',true],
 ['btr82-base-100.glb',428172,5371,18,'5d26d5af11a575d085411308e2cb8e695f6d6346d505798661cde88165d4be7d',false],
 ['btr82-base-75.glb',261668,4025,18,'d7ce68d9c889be2db3aaffa6311966c3ebf669fbcb1415b022de835a62382de6',false],
 ['btr82-base-50.glb',182672,2684,18,'cc6ab2a872632eec774534ff7538654b740b2d903c71edac3a841c24f6360a91',false],
 ['btr82-base-25.glb',84128,1338,18,'7a2b483dc53171e3eaae0f92c250a50c0188021ef647904678dff658e9dc2fa3',false]
];
assert.deepEqual(fs.readdirSync(dir).filter(n=>n.endsWith('.glb')).sort(),cases.map(x=>x[0]).sort(),
 'No poden quedar els GLB de la primera generació com a candidats');
for(const [name,size,tris,meshes,sha,archived] of cases){
 const d=fs.readFileSync(path.join(dir,name));assert.equal(d.length,size,name);
 assert.equal(d.toString('ascii',0,4),'glTF',name);
 assert.equal(d.readUInt32LE(4),2,name);
 assert.equal(d.readUInt32LE(8),d.length,name);
 assert.equal(crypto.createHash('sha256').update(d).digest('hex'),sha,name);
 const jsonlen=d.readUInt32LE(12),j=JSON.parse(d.subarray(20,20+jsonlen).toString('utf8'));
 assert.equal(j.meshes.length,meshes,name);
 const tri=j.meshes.reduce((n,m)=>n+m.primitives.reduce((s,p)=>s+j.accessors[p.indices].count/3,0),0);
 assert.equal(tri,tris,name);
 assert.equal(j.materials.length,10,name);
 if(archived){
  assert.equal(j.images.length,11,'L’original de Sketchfab ha de conservar les 11 textures');
 }else{
  assert.equal(j.images?.length||0,0,'Cap atlas UV a '+name);
  assert.equal(j.textures?.length||0,0,'Cap textura trencada a '+name);
  assert.equal(j.meshes.filter(m=>m.name.startsWith('Object_')).length,8,
   'S’han de preservar les vuit rodes independents en '+name);
  assert.equal(j.nodes.length,19,'Un node arrel + 18 malles en '+name);
  assert(j.materials.every(m=>m.pbrMetallicRoughness?.roughnessFactor>=.9&&
   m.pbrMetallicRoughness?.baseColorFactor?.[3]===1),'Materials opacs mats en '+name);
  for(const mesh of j.meshes){
   for(const p of mesh.primitives){
    const vertexCount=j.accessors[p.attributes.POSITION].count;
    const idx=j.accessors[p.indices];
    assert.equal(idx.count%3,0,'Índexs triangulats de '+name);
    assert(vertexCount>=3,'Malla buida en '+name);
   }
  }
  if(name==='btr82-base-25.glb'){
   for(const m of j.meshes.filter(m=>m.name.startsWith('Object_')))
    assert.equal(j.accessors[m.primitives[0].indices].count/3,48,'Roda octogonal regular');
  }
 }
 console.log('OK '+name+': '+tri+' triangles / '+meshes+' malles');
}
const m=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../assets/vehicle-candidates/manifest.json'),'utf8'));
assert.equal(m.selectedForLod.tanqueta.sourceTriangles,5371);
assert.deepEqual(m.selectedForLod.tanqueta.ratioLevels,[1,.75,.5,.25]);
console.log('PASS: nova base BTR-82 i tres reduccions 75/50/25 sense atles ni artefactes');
