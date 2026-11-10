// Only two approved GLBs may exist in the tankette preview directory.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../assets/vehicle-candidates/tanqueta');
const assets=[
 {file:'btr82-base-100.glb',size:428172,triangles:5371,meshes:18,sha:'5d26d5af11a575d085411308e2cb8e695f6d6346d505798661cde88165d4be7d'},
 {file:'btr82-50-repaired.glb',size:148760,triangles:4253,meshes:12,sha:'1ed1a2c58c00378c78ba5ead13a310000de496799a15d4044d9a29fae91566e7'}
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
  // Each wheel is independently animated later, but one draw call each.
  for(const m of j.meshes.filter(m=>m.name.startsWith('Object_'))){
   const p=m.primitives[0];
   assert.equal(j.accessors[p.indices].count/3,144,'Detailed rounded wheel');
   assert(p.attributes.COLOR_0!==undefined,'Vertex-coloured rim, tyre and hub');
  }
  const hull=j.meshes.find(m=>m.name==='BTR82_hull_symmetric_batched');
  assert(hull,'Batched armour missing');
  assert.equal(hull.primitives.length,1,'One draw call for painted hull');
  assert(hull.primitives[0].attributes.COLOR_0!==undefined,'Colour batching required');
  const turret=j.meshes.find(m=>m.name==='BTR82_turret');
  assert(turret,'Turret pivot geometry missing');
  const cannon=j.meshes.find(m=>m.name==='BTR82_black_barrel_and_muzzle');
  assert(cannon,'Thin barrel plus wider muzzle missing');
  assert.equal(j.accessors[cannon.primitives[0].indices].count/3,96,'Two black cylinders');
  const gunMat=j.materials[cannon.primitives[0].material];
  assert.equal(gunMat.name,'matte_black_gun_and_muzzle');
  assert(Math.max(...gunMat.pbrMetallicRoughness.baseColorFactor.slice(0,3))<.09,
   'Gun needs to be black');
  assert(j.meshes.some(m=>m.name==='BTR82_front_lenses_two'),'Four front lights retained');
  // Validate actual symmetric geometry and centred dark panels at BOTH ends,
  // rather than trusting labels or inspection screenshots alone.
  const binStart=20+d.readUInt32LE(12)+8;
  const readAttr=(index,components)=>{
   const a=j.accessors[index],view=j.bufferViews[a.bufferView];
   const offset=binStart+(view.byteOffset||0)+(a.byteOffset||0);
   return Array.from({length:a.count},(_,i)=>{
    const base=offset+i*components*(a.componentType===5126?4:1);
    return Array.from({length:components},(_,k)=>
     a.componentType===5126?d.readFloatLE(base+k*4):d.readUInt8(base+k));
   });
  };
  const attrs=hull.primitives[0].attributes;
  const positions=readAttr(attrs.POSITION,3),colours=readAttr(attrs.COLOR_0,4);
  for(const side of ['front','rear']){
   const x=[];
   for(let i=0;i<positions.length;i++){
    const p=positions[i],c=colours[i];
    if(c[0]===35&&c[1]===44&&c[2]===39&&
      (side==='front'?p[2]>5.97:p[2]<-5.10))x.push(p[0]);
   }
   assert(x.length>=6,'Missing central dark '+side+' panel');
   const sorted=x.map(v=>Math.round(v*1000)).sort((a,b)=>a-b);
   assert.deepEqual(sorted,sorted.map(v=>v===0?0:-v).reverse(),
    'Dark panel offset from central axis: '+side);
  }
  assert(j.materials.every(m=>m.alphaMode!=='BLEND'),'No translucent palette artifacts');
 }
 console.log('PASS '+item.file+': '+item.triangles+' triangles / '+item.meshes+' malles');
}
const m=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/vehicle-candidates/manifest.json'),'utf8'));
assert.equal(m.selectedForLod.tanqueta.activePreviewModels,2);
assert.equal(m.selectedForLod.tanqueta.original.triangles,5371);
assert.equal(m.selectedForLod.tanqueta.selected.triangles,4253);
assert.equal(m.selectedForLod.tanqueta.selected.meshes,12);
console.log('PASS two-model BTR-82 preview');
