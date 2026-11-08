// Integritat del banc de visualització dels dos helicòpters natius.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const h=read('src/huey-duane-native-geometry.mjs');
const a=read('src/apache-araon-runtime.mjs');
const html=read('helicopters-engine-compare.html');
const viewer=read('src/helicopters-engine-compare.mjs');
const catalog=read('src/vehicle-candidate-catalog.mjs');
const base=read('vehicles-externs-proves.html');
const m=JSON.parse(h.match(/const M=(\[[^\n]+\]);\n/)[1]);
const access=JSON.parse(h.match(/const A=(\{[^\n]+\});\n/)[1]);
assert.equal(m.length,6);
assert.equal(m.reduce((n,part)=>n+part.primitives.reduce((x,p)=>x+access[p.indices][2]/3,0),0),1767);
assert(h.includes("shell.scale.setScalar(1.485)"));
assert(h.includes("addCockpitSeats(THREE,root)"));
assert(a.includes('const TARGET_LENGTH=10.725;'));
assert(a.includes('function rebuildLandingGear(THREE,root)'));
for(const name of ['huey-solid','huey-native','apache-solid','apache-native'])
 assert(html.includes('data-model="'+name+'"'),'Panell absent: '+name);
assert(viewer.includes('prepareHueyDuaneRuntime'));
assert(viewer.includes('prepareApacheAraonRuntime'));
assert(viewer.includes('wireframe:true'));
assert(!viewer.includes('GLTFLoader')&&!viewer.includes('.glb'));
assert(!catalog.includes("{id:'heli_combat'")&&!catalog.includes("{id:'heli'"));
assert(base.includes('helicopters-engine-compare.html'));
for(const file of ['src/huey-duane-native-geometry.mjs','src/apache-araon-runtime.mjs','src/helicopters-engine-compare.mjs'])
 execFileSync(process.execPath,['--check',path.join(root,file)]);
console.log('Comparador natiu: Huey +10% amb seients, Apache +50% amb rodes rodones i quatre vistes sense GLB.');
