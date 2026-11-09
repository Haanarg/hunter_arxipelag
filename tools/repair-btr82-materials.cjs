#!/usr/bin/env node
// One-off, reproducible correction for BTR-82 preview LODs in Hunter: Arxipèlag.
// VTK decimation retained the geometry and material IDs but lost the original
// texture-atlas UV correspondence. In the source, wheel texture material_9
// contains bright pink/blue/green patches; with displaced UVs it produces the
// rainbow artefacts shown in the mobile screenshot. Use a matte, opaque
// military palette without textures instead of pretending the old UVs work.
// No changes to meshes, indices, normals, positions, nodes or original 100%.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = process.env.BTR82_DIR || path.resolve(__dirname, '../assets/vehicle-candidates/tanqueta');
const COLORS = [
  [0.32,0.38,0.32,1], // 0: primary hull, sage olive
  [0.28,0.34,0.27,1], // 1: hull details, shaded olive
  [0.16,0.19,0.17,1], // 2: vents and outlines
  [0.35,0.41,0.34,1], // 3: turret
  [0.58,0.58,0.56,1], // 4: white lights
  [0.70,0.70,0.68,1], // 5: off-white markings
  [0.64,0.58,0.18,1], // 6: warning lights
  [0.35,0.41,0.45,1], // 7: glazed elements
  [0.42,0.48,0.46,1], // 8: metal details
  [0.17,0.18,0.17,1], // 9: eight rubber wheels
];
const profiles = [
  ['btr82-75pct.glb', 16109],
  ['btr82-50pct.glb', 10745],
  ['btr82-25pct.glb', 5371]
];
function parseGlb(bytes) {
  assert.equal(bytes.toString('ascii',0,4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const jsonLength=bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  const json=JSON.parse(bytes.subarray(20, 20+jsonLength).toString('utf8'));
  const binStart=20+jsonLength;
  assert.equal(bytes.readUInt32LE(binStart+4), 0x004e4942);
  const binLength=bytes.readUInt32LE(binStart);
  const bin=bytes.subarray(binStart+8, binStart+8+binLength);
  assert.equal(bin.length, binLength);
  return {json,bin};
}
function align(n){return (n+3)&~3;}
function pack(json,bin) {
  let raw=Buffer.from(JSON.stringify(json),'utf8');
  raw=Buffer.concat([raw,Buffer.alloc(align(raw.length)-raw.length,32)]);
  const binary=Buffer.concat([bin,Buffer.alloc(align(bin.length)-bin.length)]);
  const output=Buffer.alloc(12+8+raw.length+8+binary.length);
  output.write('glTF',0,'ascii');output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);
  output.writeUInt32LE(raw.length,12);output.writeUInt32LE(0x4e4f534a,16);
  raw.copy(output,20);
  const offset=20+raw.length;
  output.writeUInt32LE(binary.length,offset);output.writeUInt32LE(0x004e4942,offset+4);
  binary.copy(output,offset+8);
  return output;
}
function repair(oldData,expectedCount) {
  const {json:j,bin}=parseGlb(oldData);
  assert.equal(j.meshes.length,18, 'BTR-82 amb 18 malles abans de reparar');
  assert.equal(j.materials.length,COLORS.length);
  const oldCount=j.meshes.reduce((sum,mesh)=>sum+mesh.primitives.reduce((part,p)=>part+j.accessors[p.indices].count/3,0),0);
  assert.equal(oldCount,expectedCount,'No modificar triangles de la variant');
  if(j.asset.generator?.includes('BTR-82-matte-UV-repair-v1') && !j.images?.length) return oldData;
  assert.equal(j.images.length,11,'S’han de partir dels GLB originals publicats');
  const imageViews=new Set(j.images.map(x=>x.bufferView));
  // Abandon corrupted atlas UVs. Preserve all geometry and material grouping.
  j.materials.forEach((mat,i)=>{
    const pbr=mat.pbrMetallicRoughness||{};
    mat.pbrMetallicRoughness={
      baseColorFactor:COLORS[i],metallicFactor:0.05,roughnessFactor:0.95
    };
    delete mat.alphaMode;delete mat.alphaCutoff;
    delete mat.emissiveTexture;
    delete mat.extensions;
    if(i===4)mat.emissiveFactor=[0.08,0.08,0.07];else delete mat.emissiveFactor;
    mat.doubleSided=true;
  });
  j.asset.generator='Hunter BTR-82-matte-UV-repair-v1';
  j.asset.extras={...(j.asset.extras||{}),btr82LodTextures:'matte:original UV atlas not safe after decimation'};
  delete j.images;delete j.textures;delete j.samplers;
  delete j.extensionsUsed;delete j.extensionsRequired;
  // Remove image-only buffer views and their PNG bytes; remap all accessor views.
  const remap=new Map(),views=[],chunks=[];
  let cursor=0;
  for(let i=0;i<j.bufferViews.length;i++) {
    if(imageViews.has(i)) continue;
    const oldView=j.bufferViews[i];
    assert.equal(oldView.buffer,0);
    const bytes=bin.subarray(oldView.byteOffset||0,(oldView.byteOffset||0)+oldView.byteLength);
    assert.equal(bytes.length,oldView.byteLength);
    const newOffset=align(cursor),gap=newOffset-cursor;
    if(gap)chunks.push(Buffer.alloc(gap));
    chunks.push(bytes);cursor=newOffset+bytes.length;
    remap.set(i,views.length);
    views.push({...oldView,byteOffset:newOffset});
  }
  for(const acc of j.accessors) {
    if(acc.bufferView===undefined) throw new Error('Unsupported sparse accessor');
    assert(remap.has(acc.bufferView),'Accessor apuntava a PNG i no a geometria');
    acc.bufferView=remap.get(acc.bufferView);
  }
  j.bufferViews=views;
  const nextBin=Buffer.concat(chunks);
  j.buffers[0].byteLength=nextBin.length;
  const output=pack(j,nextBin);
  const reread=parseGlb(output);
  assert.equal(reread.json.meshes.length,18);
  assert.equal(reread.json.materials.length,10);
  assert.equal(reread.json.accessors.length,72);
  assert.equal(reread.json.images,undefined);
  return output;
}
for(const [name,count] of profiles){
  const file=path.join(ROOT,name),before=fs.readFileSync(file),after=repair(before,count);
  fs.writeFileSync(file,after);
  const sha=crypto.createHash('sha256').update(after).digest('hex');
  console.log('MATERIALS REPARATS',name,'triangles',count,'bytes',after.length,'sha256',sha);
}