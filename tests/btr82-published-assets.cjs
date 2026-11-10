// Only two approved GLBs may exist in the tankette preview directory.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../assets/vehicle-candidates/tanqueta');
const assets=[
 {file:'btr82-base-100.glb',size:428172,triangles:5371,meshes:18,sha:'5d26d5af11a575d085411308e2cb8e695f6d6346d505798661cde88165d4be7d'},
 {file:'btr82-50-repaired.glb',size:175632,triangles:3671,meshes:23,sha:'1450da14334ebece0c4f4f30212ac18f98715bf7fe5204cffaf1155e9b8b76f3'}
];
assert.deepEqual(fs.readdirSync(dir).filter(x=>x.endsWith('.glb')).sort(),assets.map(x=>x.file).sort());
for(const item of assets){
 const d=fs.readFileSync(path.join(dir,item.file));
 assert.equal(d.length,item.size,item.file);
 assert.equal(d.toString('ascii',0,4),'glTF');assert.equal(d.readUInt32LE(4),2);
 assert.equal(d.readUInt32LE(8),d.length);
 assert.equal(crypto.createHash('sha256').update(d).digest('hex'),item.sha);
 const j=JSON.parse(d.subarray(20,20+d.readUInt32LE(12)).toString('utf8'));
 assert.equal(j.meshes.length,item.meshes);
 assert.equal(j.meshes.reduce((n,m)=>n+m.primitives.reduce((a,p)=>a+j.accessors[p.indices].count/3,0),0),item.triangles);
 assert.equal(j.images?.length||0,0,'No UV atlas corruption');
 const names=new Set(j.meshes.map(x=>x.name));
 assert.equal([...names].filter(x=>x.startsWith('Object_')).length,8);
 if(item.file==='btr82-50-repaired.glb'){
  for(const name of ['hull_continuous_roof_liner','hull_continuous_side_liners',
   'eight_closed_wheel_hubs','auxiliary_headlamp_housings_2','auxiliary_front_headlamps_2'])
    assert(names.has(name),'Missing repair '+name);
  function triangles(name){return j.meshes.find(x=>x.name===name).primitives.reduce(
    (n,p)=>n+j.accessors[p.indices].count/3,0)}
  assert.equal(triangles('eight_closed_wheel_hubs'),320);
  assert.equal(triangles('auxiliary_front_headlamps_2'),24);
  assert.equal(triangles('auxiliary_headlamp_housings_2'),24);
  assert(j.materials.some(x=>x.name==='front_headlamp_lenses'));
  assert(j.materials.every(x=>x.alphaMode!=='BLEND'&&
    x.pbrMetallicRoughness?.baseColorFactor?.[3]===1));
 }
 console.log('PASS '+item.file+': '+item.triangles+' triangles / '+item.meshes+' malles');
}
const m=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/vehicle-candidates/manifest.json'),'utf8'));
assert.equal(m.selectedForLod.tanqueta.activePreviewModels,2);
assert.equal(m.selectedForLod.tanqueta.original.triangles,5371);
assert.equal(m.selectedForLod.tanqueta.selected.triangles,3671);
console.log('PASS two-model BTR-82 preview');
