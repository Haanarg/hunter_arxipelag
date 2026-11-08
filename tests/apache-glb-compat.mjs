import assert from 'node:assert/strict';
import {convertApacheLegacyMaterials,apacheCompatibleBlob} from '../src/apache-glb-compat.mjs';

const enc=new TextEncoder(),dec=new TextDecoder();
function buildGLB(json,bytes=[17,19,23,29]){
 const raw=enc.encode(JSON.stringify(json));
 const padded=(raw.byteLength+3)&~3;
 const out=new Uint8Array(12+8+padded+8+4);
 const dv=new DataView(out.buffer);
 dv.setUint32(0,0x46546c67,true);
 dv.setUint32(4,2,true);
 dv.setUint32(8,out.length,true);
 dv.setUint32(12,padded,true);
 dv.setUint32(16,0x4e4f534a,true);
 out.fill(32,20,20+padded);
 out.set(raw,20);
 const next=20+padded;
 dv.setUint32(next,4,true);
 dv.setUint32(next+4,0x004e4942,true);
 out.set(bytes,next+8);
 return out.buffer;
}
function parseGLB(buffer){
 const data=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);
 const dv=new DataView(data.buffer,data.byteOffset,data.byteLength);
 assert.equal(dv.getUint32(0,true),0x46546c67);
 assert.equal(dv.getUint32(8,true),data.byteLength);
 const jsonLength=dv.getUint32(12,true);
 const json=JSON.parse(dec.decode(data.subarray(20,20+jsonLength)));
 return {json,tail:Array.from(data.subarray(20+jsonLength))};
}
const legacy={
 asset:{version:'2.0'},
 extensionsUsed:['KHR_materials_pbrSpecularGlossiness'],
 extensionsRequired:['KHR_materials_pbrSpecularGlossiness'],
 materials:[
  {name:'glass',alphaMode:'BLEND',doubleSided:true,extensions:{KHR_materials_pbrSpecularGlossiness:{
   diffuseFactor:[0,0,0,.15],specularFactor:[1,1,1],glossinessFactor:.87}}},
  {name:'lambert2',normalTexture:{index:2},occlusionTexture:{index:3},extensions:{KHR_materials_pbrSpecularGlossiness:{
   diffuseFactor:[1,1,1,1],diffuseTexture:{index:0},specularGlossinessTexture:{index:1},glossinessFactor:1}}},
 ],
 textures:[{source:0},{source:1},{source:2},{source:3}],
 images:[{bufferView:0},{bufferView:1},{bufferView:2},{bufferView:3}]
};
const original=buildGLB(legacy);
const result=convertApacheLegacyMaterials(original);
assert.equal(result.converted,2);
assert.equal(result.connected,1);
assert.equal(result.images,4);
const before=parseGLB(original),after=parseGLB(result.buffer);
assert.deepEqual(after.tail,before.tail,'Bytes BIN (imatges i geometria) idèntics');
assert.deepEqual(after.json.materials[1].pbrMetallicRoughness.baseColorTexture,{index:0});
assert.equal(after.json.materials[1].pbrMetallicRoughness.metallicFactor,0);
assert.equal(after.json.materials[1].pbrMetallicRoughness.roughnessFactor,.14);
assert.equal(after.json.materials[0].alphaMode,'BLEND');
assert.equal(after.json.materials[0].doubleSided,true);
assert.equal(after.json.materials[0].pbrMetallicRoughness.baseColorFactor[3],.15);
assert.equal(after.json.materials[1].normalTexture.index,2);
assert.equal(after.json.materials[1].occlusionTexture.index,3);
assert(!('extensionsUsed' in after.json));
assert(!('extensionsRequired' in after.json));
assert.deepEqual(before.json,legacy,'El GLB original no es modifica');
const already=convertApacheLegacyMaterials(result.buffer);
assert.equal(already.converted,0);
const wrapper=await apacheCompatibleBlob(new Blob([original],{type:'model/gltf-binary'}));
assert.equal(wrapper.converted,2);
assert.equal(wrapper.blob.type,'model/gltf-binary');
assert.deepEqual(parseGLB(await wrapper.blob.arrayBuffer()).json,after.json);
assert.throws(()=>convertApacheLegacyMaterials(new Uint8Array([1,2,3])),/incomplet/);
console.log('Apache: compatibilitat KHR specGloss -> PBR sense perdre cap textura ni modificar el BIN.');
