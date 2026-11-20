'use strict';
// Escaneig exhaustiu del codi font: només és regressió automàtica per a
// correccions ja eliminades. Les escales estructurals pendents són documentades
// explícitament a docs/model-scale-audit.md, mai no es tapen.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=path.join(root,'src');
const files=[];
function walk(dir){
 for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,ent.name);
  if(ent.isDirectory())walk(p);
  else if(/\.(?:js|mjs|cjs)$/.test(p))files.push(p);
 }
}
walk(source);
const signs=[];
const re=/\.scale\s*(?:\.set(?:Scalar)?\s*\(|\.multiplyScalar\s*\(|\.divideScalar\s*\(|\.[xyz]\s*(?:[+\-*/]?=))|(?:visualScale|VisualScale|RiderScale|riderScale|legacyRigScale|truckVisualFit|scaleFactor|sizeMultiplier)/g;
for(const f of files){
 const s=fs.readFileSync(f,'utf8');
 s.split('\n').forEach((line,i)=>{
  if(re.test(line))signs.push({file:path.relative(root,f).replace(/\\/g,'/'),line:i+1,
   expression:line.trim().slice(0,160)});
  re.lastIndex=0;
 });
}
const forbidden=[
 ['src/gaz-tigr-runtime.mjs',/car\.scale\.setScalar\(1\.25\)|gazVisualScale/],
 ['src/t90m-runtime.mjs',/model\.scale\.x\s*!==\s*1\.5/],
 ['src/truck-model.mjs',/g\.scale\.setScalar\(\.82\)/],
 ['src/vehicle-model-core.mjs',/truck\.scale\.setScalar\(fit\)|(?:pilot|driver)\.scale\.multiplyScalar\(1\.30\//],
 ['src/enemy-ai.js',/truckVisualFit|truckFit/],
 ['src/vehicle-specs.mjs',/vehicleCollisionScale|gazVisualScale/]
];
for(const [name,pattern]of forbidden){
 const data=fs.readFileSync(path.join(root,name),'utf8');
 assert(!pattern.test(data),'S\u2019ha reintrodu\u00eft una correcci\u00f3 post-model a '+name);
}
const grouped=new Map();
for(const s of signs)grouped.set(s.file,(grouped.get(s.file)||0)+1);
const report={
 scannedFiles:files.length,matchedExpressions:signs.length,
 filesWithScale:grouped.size,
 topFiles:[...grouped].sort((a,b)=>b[1]-a[1]).slice(0,14),
 criticalUnresolved:[
  'src/human-game-runtime-v17.mjs: legacy rig 2/3 + V18 visual 1.6',
  'src/rider.js: diferent escala en vehicles i inversions de coordenades',
  'src/vehicle-model-core.mjs: moto, bici, hover no uniforme',
  'src/ka60-runtime.mjs: compensaci\u00f3 amb VS.heli',
  'src/game-core.js: dimensions helic\u00f2pter calculades amb factors hist\u00f2rics'
 ]};
console.log('SCALE_SOURCE_AUDIT '+JSON.stringify(report));
console.log('PASS escaneig de totes les fonts i barreres de regressi\u00f3 de mides base');
