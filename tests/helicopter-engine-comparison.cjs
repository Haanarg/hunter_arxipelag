// Comparativa de GLB contra geometrias natives Three.js. Sense WebGL ni xarxa.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const huey=read('src/huey-duane-native-geometry.mjs');
const apache=read('src/apache-araon-runtime.mjs');
const html=read('helicopters-engine-compare.html');
const viewer=read('src/helicopters-engine-compare.mjs');
const catalog=read('src/vehicle-candidate-catalog.mjs');
const candidatesHtml=read('vehicles-externs-proves.html');
const source=fs.readFileSync(path.join(root,'assets/vehicle-models/huey-duane-doors-open.glb'));
const jsonLength=source.readUInt32LE(12);
const gltf=JSON.parse(source.subarray(20,20+jsonLength).toString('utf8'));
const binOffset=20+jsonLength+8;
const get=(regexp)=>{const m=huey.match(regexp);assert(m,'Falta una taula de geometria nativa');return JSON.parse(m[1])};
const accessors=get(/const A=(\{[^\n]+\});\n/);
const meshes=get(/const M=(\[[^\n]+\]);\n/);
const nodes=get(/const N=(\[[^\n]+\]);\n/);
assert.equal(meshes.length,6,'Huey natiu incomplet');
assert.equal(nodes.length,gltf.nodes.length,'La jerarquia de pivots ha canviat');
for(const name of ['Back_Rotor','Top_Rotor'])assert(nodes.some(n=>n.name===name),'Pèrdua de pivot: '+name);
let faces=0;
for(let i=0;i<gltf.meshes.length;i++){
 assert.equal(meshes[i].primitives.length,gltf.meshes[i].primitives.length);
 for(let j=0;j<meshes[i].primitives.length;j++){
  const p=meshes[i].primitives[j],orig=gltf.meshes[i].primitives[j];
  assert.deepEqual(p.attributes,orig.attributes);
  assert.equal(p.indices,orig.indices);
  faces+=gltf.accessors[p.indices].count/3;
 }
}
assert.equal(faces,1767,'El Huey natiu ha de reproduir exactament el GLB amb portes obertes');
const sizes={5126:4,5125:4,5123:2,5121:1},lengths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
for(const [id,arr] of Object.entries(accessors)){
 const a=gltf.accessors[id],view=gltf.bufferViews[a.bufferView];
 assert.equal(arr[0],a.componentType);assert.equal(arr[1],a.type);assert.equal(arr[2],a.count);
 const packed=Buffer.from(arr[3],'base64'),stride=view.byteStride||sizes[a.componentType]*lengths[a.type];
 const width=sizes[a.componentType]*lengths[a.type];
 assert.equal(packed.length,a.count*width);
 for(let i=0;i<a.count;i++){
  const p=binOffset+(view.byteOffset||0)+(a.byteOffset||0)+i*stride;
  assert(packed.subarray(i*width,(i+1)*width).equals(source.subarray(p,p+width)),
   'Accessor '+id+', element '+i+' canviat');
 }
}
const im=gltf.images[0],view=gltf.bufferViews[im.bufferView];
const atlas=fs.readFileSync(path.join(root,'assets/vehicle-models/huey-duane-native-atlas.png'));
assert(atlas.equals(source.subarray(binOffset+view.byteOffset,binOffset+view.byteOffset+view.byteLength)),
 'La textura del Huey natiu no coincideix amb la del GLB');
assert(!huey.includes('GLTFLoader')&&!huey.includes('.glb',huey.indexOf('export function createNativeHuey')),
 'La fàbrica nativa no ha de carregar cap GLB');
assert(huey.includes("root.userData.rotor=main;root.userData.tailRotor=tail"),
 'Els rotors del Huey natiu han de ser animables');
assert(apache.includes('export async function prepareApacheCompactNative(THREE)'));
assert(apache.includes('return prepareApacheAraonRuntime(THREE,{forceCompact:true})'));
for(const name of ['huey-glb','huey-native','apache-glb','apache-native'])
 assert(html.includes('data-model="'+name+'"'),'Panell absent: '+name);
assert(viewer.includes('createNativeHuey')&&viewer.includes('prepareApacheCompactNative'));
assert(!catalog.includes("{id:'heli_combat'"),'Apache acceptat torna a ser candidat');
assert(!catalog.includes("{id:'heli'"),'Huey acceptat torna a ser candidat');
assert(candidatesHtml.includes('helicopters-engine-compare.html'),'No hi ha accés al nou comparador');
for(const file of ['src/huey-duane-native-geometry.mjs','src/apache-araon-runtime.mjs','src/helicopters-engine-compare.mjs'])
 cp.execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
console.log('Helicòpters motor: Huey 1767 triangles i textura exacta del GLB, Apache compacte 2173, 4 panells i candidats retirats.');
