// Binary integrity gate before publishing BTR-82 source/LODs to GitHub.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../assets/vehicle-candidates/tanqueta');
const cases=[
 ['btr82-original.glb',1592172,21483,199,'575fd57e125edfb9c6b1d539ed6eadb44468f9bf3c709a48c135f876db664679'],
 ['btr82-75pct.glb',1182664,16109,18,'ba0d4fc38c0cc34c7460cfe32c47d3ee1a51bee3037c285160d6f39a2d290bac'],
 ['btr82-50pct.glb',862008,10745,18,'0aff5936eb9408c0a2bb58611c5fb62211144ffc5c17e1c5eb3ca0feef86e4d2'],
 ['btr82-25pct.glb',446292,5371,18,'b37fc29c3b7719c21547c2668d0b5231c8a23bb951e70ae5406e0f9c555a0dab']
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
 assert.equal(json.images?.length,11,'Falten les textures del BTR-82 a '+name);
 assert(json.materials?.length>=10,'Falten els materials del BTR-82 a '+name);
 console.log('OK '+name+': '+total+' triangles, '+meshes+' malles, 11 textures PNG');
}
const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../assets/vehicle-candidates/manifest.json'),'utf8'));
assert.deepEqual(manifest.selectedForLod.tanqueta.ratioLevels,[1,.75,.5,.25]);
console.log('BTR-82: GLB aprovats, íntegres i disponibles al banc de models.');
