// Approved two-card BTR-82 preview and regression protection for geometry.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../assets/vehicle-candidates/tanqueta');
const specs=[
 {file:'btr82-base-100.glb',bytes:428172,triangles:5371,meshes:18,
  sha:'5d26d5af11a575d085411308e2cb8e695f6d6346d505798661cde88165d4be7d'},
 {file:'btr82-50-repaired.glb',bytes:147776,triangles:4199,meshes:13,
  sha:'fd8b42095ef030cf6d055074ab342a953d1129b31cbc606061509ceb2a4e1ee1'}
];
assert.deepEqual(fs.readdirSync(dir).filter(f=>f.endsWith('.glb')).sort(),
 specs.map(x=>x.file).sort(),'Only the base and corrected BTR-82 may remain');
function parse(file){
 const data=fs.readFileSync(path.join(dir,file));
 assert.equal(data.toString('ascii',0,4),'glTF');
 assert.equal(data.readUInt32LE(4),2);
 assert.equal(data.readUInt32LE(8),data.length);
 const n=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+n).toString('utf8'));
 const binStart=20+n+8;
 return {data,json,binStart};
}
function accessor(glb,index){
 const a=glb.json.accessors[index],v=glb.json.bufferViews[a.bufferView];
 const width={5121:1,5123:2,5125:4,5126:4}[a.componentType];
 const comps={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
 assert(width&&comps,'Unexpected accessor type '+a.type);
 const offset=glb.binStart+(v.byteOffset||0)+(a.byteOffset||0);
 const stride=v.byteStride||width*comps;
 const out=[];
 for(let i=0;i<a.count;i++){
  const row=[];for(let k=0;k<comps;k++){
   const pos=offset+i*stride+k*width;
   row.push(a.componentType===5126?glb.data.readFloatLE(pos):
    a.componentType===5125?glb.data.readUInt32LE(pos):
    a.componentType===5123?glb.data.readUInt16LE(pos):glb.data.readUInt8(pos));
  }out.push(row);
 }
 return out;
}
function triangles(glb,mesh){
 const faces=[];
 for(const p of mesh.primitives){
  const verts=accessor(glb,p.attributes.POSITION);
  const indices=accessor(glb,p.indices).map(x=>x[0]);
  for(let k=0;k<indices.length;k+=3)
   faces.push([verts[indices[k]],verts[indices[k+1]],verts[indices[k+2]]]);
 }
 return faces;
}
function fingerprint(face){
 return face.map(pos=>pos.map(n=>Math.round(n*100000)).join(',')).sort().join('|');
}
const models={};
for(const s of specs){
 const g=parse(s.file);models[s.file]=g;
 assert.equal(g.data.length,s.bytes);
 assert.equal(crypto.createHash('sha256').update(g.data).digest('hex'),s.sha);
 assert.equal(g.json.meshes.length,s.meshes);
 assert.equal(g.json.meshes.reduce((total,m)=>
  total+m.primitives.reduce((n,p)=>n+g.json.accessors[p.indices].count/3,0),0),s.triangles);
 assert.equal(g.json.images?.length||0,0,'No corrupt texture atlases');
 const names=new Set(g.json.meshes.map(m=>m.name));
 assert.equal([...names].filter(n=>n.startsWith('Object_')).length,8,
  'All eight improved wheels must remain');
 console.log('OK '+s.file+': '+s.triangles+' triangles / '+s.meshes+' meshes');
}
const base=models['btr82-base-100.glb'],fixed=models['btr82-50-repaired.glb'];
const sourceHull=base.json.meshes.filter(m=>m.name.startsWith('hull_'));
const restored=fixed.json.meshes.find(m=>m.name==='BTR82_hull_original_restored');
assert.equal(sourceHull.length,8,'Expected eight source hull components');
assert(restored,'Authentic hull not present');
const sourceFaces=sourceHull.flatMap(m=>triangles(base,m));
const fixedFaces=triangles(fixed,restored);
assert.equal(sourceFaces.length,2556,'Source hull geometry unexpectedly changed');
assert.equal(fixedFaces.length,2600,'Original hull + 44 interior liner triangles expected');
const available=new Map();
for(const face of fixedFaces){
 const key=fingerprint(face);available.set(key,(available.get(key)||0)+1);
}
for(const face of sourceFaces){
 const key=fingerprint(face),count=available.get(key)||0;
 assert(count>0,'A face of the genuine front/rear/hull has been lost or altered: '+key);
 available.set(key,count-1);
}
assert.equal([...available.values()].reduce((a,b)=>a+b,0),44,
 'Only the old 44 liner triangles may supplement genuine hull faces');
const turret=fixed.json.meshes.find(m=>m.name==='BTR82_turret');
const gun=fixed.json.meshes.find(m=>m.name==='BTR82_black_barrel_and_muzzle');
assert(turret&&gun,'Turret/barrel missing');
const turretPositions=turret.primitives.flatMap(p=>accessor(fixed,p.attributes.POSITION));
const gunPositions=gun.primitives.flatMap(p=>accessor(fixed,p.attributes.POSITION));
const tMinZ=Math.min(...turretPositions.map(x=>x[2]));
const gMinZ=Math.min(...gunPositions.map(x=>x[2])),gMaxZ=Math.max(...gunPositions.map(x=>x[2]));
assert(gMinZ<tMinZ-1.5&&gMaxZ<0,
 'Barrel must project toward the genuine BTR-82 FRONT (-Z), never rear (+Z)');
assert.equal(triangles(fixed,gun).length,96,'Thin tube and wider muzzle');
const gunMat=fixed.json.materials[gun.primitives[0].material];
assert.equal(gunMat.name,'matte_black_gun_and_muzzle');
assert(Math.max(...gunMat.pbrMetallicRoughness.baseColorFactor.slice(0,3))<.09);
const radius=x=>Math.hypot(x[0],x[1]-2.63);
const tipR=Math.max(...gunPositions.filter(v=>v[2]<-3.45).map(radius));
const shaftR=Math.max(...gunPositions.filter(v=>v[2]>-2.9&&v[2]<-2.4).map(radius));
assert(tipR>.09&&shaftR<.07,'Muzzle should be wider than barrel');
for(const m of fixed.json.meshes.filter(x=>x.name.startsWith('Object_'))){
 assert.equal(triangles(fixed,m).length,144,'Preserve the fuller low-poly wheels');
 assert(m.primitives[0].attributes.COLOR_0!==undefined,'Tyre/rim vertex colours');
}
for(const name of ['BTR82_aux_front_housings','BTR82_aux_front_lenses']){
 const mesh=fixed.json.meshes.find(m=>m.name===name);assert(mesh,'Missing '+name);
 const positions=mesh.primitives.flatMap(p=>accessor(fixed,p.attributes.POSITION));
 assert(positions.every(p=>p[2]<0),'Auxiliary headlights must face the genuine front (-Z)');
}
assert(fixed.json.materials.every(m=>m.alphaMode!=='BLEND'),'No translucent broken UV palette');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'../manifest.json'),'utf8'));
assert.equal(manifest.selectedForLod.tanqueta.activePreviewModels,2);
assert.equal(manifest.selectedForLod.tanqueta.original.triangles,5371);
assert.equal(manifest.selectedForLod.tanqueta.selected.triangles,4199);
assert.equal(manifest.selectedForLod.tanqueta.selected.meshes,13);
console.log('PASS: authentic hull faces preserved, gun forward, detailed wheels and lights');
