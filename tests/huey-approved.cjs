// Huey Duane's Mind 110%: geometria Three.js sense GLB, dos seients visibles.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const native=read('src/huey-duane-native-geometry.mjs');
const runtime=read('src/huey-duane-runtime.mjs');
const game=read('src/vehicle-model-core.mjs'),boot=read('src/bootstrap.mjs');
const catalog=read('src/vehicle-candidate-catalog.mjs');
const m=JSON.parse(native.match(/const M=(\[[^\n]+\]);\n/)[1]);
const n=JSON.parse(native.match(/const N=(\[[^\n]+\]);\n/)[1]);
const a=JSON.parse(native.match(/const A=(\{[^\n]+\});\n/)[1]);
assert.equal(m.length,6,'Falten peces de la geometria del Huey');
assert(n.some(x=>x.name==='Top_Rotor')&&n.some(x=>x.name==='Back_Rotor'),
 'Pivots de rotor Huey absents');
let triangles=0;
for(const mesh of m)for(const p of mesh.primitives)triangles+=a[p.indices][2]/3;
assert.equal(triangles,1767,'El Huey ha perdut cares originals de les portes obertes');
assert(native.includes('addCockpitSeats(THREE,root)'),'Falten seients a la cabina');
assert(native.includes("['pilot',-.44]")&&native.includes("['copilot',.44]"),
 'Pilot i copilot han de tenir un seient propi');
assert(native.includes("shell.scale.setScalar(1.485)"),'El Huey no és un 10% més gran');
assert(native.includes("root.userData.rotor=main;root.userData.tailRotor=tail"));
assert(native.includes("root.userData.cockpitSeatCount=2"));
assert(runtime.includes('prepareHueyDuaneRuntime')&&runtime.includes('2119')&&
 runtime.includes('HUEY_SCALE_FACTOR=1.10'));
assert(!/import\\s+.*GLTFLoader/.test(runtime)&&!/\\.glb[\"']/.test(runtime),\n 'El Huey no pot importar ni carregar un GLB');
assert(!fs.existsSync(path.join(root,'assets/vehicle-models/huey-duane-doors-open.glb')),
 'El GLB Huey encara es publica al joc');
assert(fs.statSync(path.join(root,'assets/vehicle-models/huey-duane-native-atlas.png')).size>500000,
 'L’atles del Huey natiu és incomplet');
assert(boot.includes('prepareHueyDuaneRuntime')&&
 boot.indexOf('prepareHueyDuaneRuntime')<boot.indexOf('const loadClassic='));
assert(game.includes('approvedHuey')&&game.includes("g.userData.hueyModel='duane-100-open-engine-native-110'"));
assert(!catalog.includes("{id:'heli'")&&!catalog.includes("{id:'heli_combat'"));
for(const file of ['src/huey-duane-runtime.mjs','src/huey-duane-native-geometry.mjs'])
 execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
console.log('Huey natiu 110%: 1767 triangles originals, 2 seients (+352), textura i rotors conservats; cap GLB.');
