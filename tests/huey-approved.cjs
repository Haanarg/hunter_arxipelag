const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=filename=>fs.readFileSync(path.join(root,filename),'utf8');

const asset=path.join(root,'assets/vehicle-models/huey-duane-doors-open.glb');
assert(fs.existsSync(asset),'Falta el GLB definitiu Huey amb portes obertes');
const bytes=fs.readFileSync(asset);
assert.equal(bytes.toString('ascii',0,4),'glTF','El fitxer no és un GLB');
assert.equal(bytes.readUInt32LE(4),2,'GLB versió incorrecta');
assert.equal(bytes.readUInt32LE(8),bytes.length,'Longitud GLB incorrecta');
const jsonLength=bytes.readUInt32LE(12);
assert.equal(bytes.toString('ascii',16,20),'JSON','Falta el manifest JSON glTF');
const gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));
assert.equal(gltf.meshes?.length,6,'El Huey ha de conservar les sis malles originals');
assert.equal(gltf.animations?.length,1,'Cal conservar l’animació original del Huey');
assert(gltf.images?.length>=1,'Falta la textura original del model');
assert(gltf.nodes.some(n=>n.name==='Top_Rotor'),'No existeix el pivot del rotor principal');
assert(gltf.nodes.some(n=>n.name==='Back_Rotor'),'No existeix el pivot del rotor de cua');
assert(gltf.animations[0].channels.some(ch=>gltf.nodes[ch.target?.node]?.name==='Top_Rotor'),
 'L’animació original no inclou el rotor principal');
assert(gltf.animations[0].channels.some(ch=>gltf.nodes[ch.target?.node]?.name==='Back_Rotor'),
 'L’animació original no inclou el rotor de cua');
const triangles=gltf.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>{
 const accessor=gltf.accessors[p.indices];
 assert(accessor,'Falten índexs al GLB');
 return n+accessor.count/3;
},0),0);
assert.equal(triangles,1767,'La geometria Huey 100 amb portes obertes no coincideix');
const game=read('src/vehicle-model-core.mjs');
const boot=read('src/bootstrap.mjs');
const approved=read('src/huey-duane-runtime.mjs');
const html=read('index.html');
const catalog=read('src/vehicle-candidate-catalog.mjs');
const apacheStudio=read('src/helicopters-lod-proves.mjs');
assert(approved.includes('huey-duane-doors-open.glb'),'La càrrega del Huey ha perdut la font GLB');
assert(approved.includes('shell.rotation.y=Math.PI'),'Orientació del morro Huey incorrecta');
assert(approved.includes('rotor=pivots.main')&&approved.includes('tailRotor=pivots.tail'),
 'Els dos rotors no tenen els punts d’animació del joc');
assert(boot.includes('prepareHueyDuaneRuntime')&&boot.indexOf('prepareHueyDuaneRuntime')<boot.indexOf('const loadClassic='),
 'Cal preparar el Huey abans del runtime clàssic síncron');
assert(game.includes('approvedHuey')&&game.includes("g.userData.hueyModel='duane-100-open'"),
 'La fàbrica de vehicles no empra el model definitiu Huey');
assert(html.includes('type="importmap"')&&html.includes('three/addons/'),
 'Cal resoldre GLTFLoader amb Three.js local');
assert(!catalog.includes("{id:'heli',"),'El Huey acceptat encara figura com a candidat');
assert(catalog.includes("{id:'heli_combat',"),'No es pot eliminar el candidat Apache');
assert(!apacheStudio.includes("choose('huey')")&&apacheStudio.includes("choose('apache')"),
 'El laboratori LOD encara obre Huey descartat');
console.log('Huey definitiu: GLB real 1.767 triangles, textura i animació conservades, rotors i arrencada verificats.');
