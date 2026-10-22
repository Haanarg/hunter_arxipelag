'use strict';
// Proves CPU del laboratori: procediment per llavor, escalat pel radi,
// límit de draw calls i restauració. No executa WebGL ni GitHub Actions.
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
(async()=>{
 const url=pathToFileURL(path.join(__dirname,'../src/explosion-burst-preview.mjs')).href;
 const {EXPLOSION_PRESETS,createProceduralExplosion,explosionMetrics,mulberry32}=await import(url);
 const THREE=await import(pathToFileURL(path.join(__dirname,'../vendor/three-r186.module.mjs')).href);
 assert.deepEqual(EXPLOSION_PRESETS.map(x=>x.id),
   ['car','grenade','heavy','c4']);
 assert.deepEqual(EXPLOSION_PRESETS.map(x=>x.radius),
   [10,16,24,48]);
 const a=mulberry32(18234),b=mulberry32(18234),c=mulberry32(18235);
 assert.equal(a(),b());
 assert.notEqual(a(),c());
 assert(explosionMetrics(48).count>explosionMetrics(10).count,
   'Un radi més gran ha de generar més peces');
 assert(explosionMetrics(48,1.8).count>explosionMetrics(48,.5).count,
   'La densitat ha de controlar el nombre de peces');
 assert(explosionMetrics(400,2.6).count<=640,
   'Un límit global protegeix el rendiment');
 const defaults=[10,16,24,48].map(radius=>explosionMetrics(radius,1.8).count);
 assert(defaults.every(count=>count>=100),
   'La densitat inicial ha de ser molt superior a la primera versió');
 assert(defaults[3]>=300,'C4 ha de tenir un núvol molt més dens');
 const scene=new THREE.Scene();
 const fx=createProceduralExplosion(scene,{radius:16,density:1,seed:12});
 assert.equal(fx.group.parent,scene);
 const parts=fx.group.children.filter(x=>x.isInstancedMesh);
 assert.equal(parts.length,4,'Quatre famílies de polígons agrupades');
 const stats=fx.launch({radius:48,seed:123,density:1.2});
 assert.equal(parts.reduce((n,x)=>n+x.count,0),stats.count);
 for(const mesh of parts){
   assert(mesh.count<=640);
   assert(mesh.instanceColor,'Cada polígono té color procedural per instància');
 }
 const snapshots=()=>parts.flatMap(m=>{
   const matrix=new THREE.Matrix4(),color=new THREE.Color(),arr=[];
   for(let i=0;i<Math.min(m.count,3);i++){
     m.getMatrixAt(i,matrix);m.getColorAt(i,color);
     arr.push(...matrix.elements.map(x=>Math.round(x*1e5)/1e5),color.getHex());
   }
   return arr;
 });
 const first=snapshots();
 fx.launch({radius:48,density:1.2,seed:123});
 assert.deepEqual(snapshots(),first,
   'La mateixa llavor reprodueix la mateixa forma i els mateixos colors');
 fx.launch({radius:48,density:1.2,seed:124});
 assert.notDeepEqual(snapshots(),first,'Una altra llavor canvia l’explosió');
 for(let i=0;i<60;i++)fx.tick(.04);
 assert.equal(fx.playing,false,'L’animació s’atura sola');
 for(const mesh of parts){
   const matrix=new THREE.Matrix4();
   for(let i=0;i<mesh.count;i++){
     mesh.getMatrixAt(i,matrix);
     assert(matrix.elements.every(Number.isFinite),'Matrius finites');
   }
 }
 fx.destroy();
 assert.equal(fx.group.parent,null,'La previsualització no deixa objectes orfes');
 const html=fs.readFileSync(path.join(__dirname,'../explosions-proves.html'),'utf8');
 assert.match(html,/value="180" step="10"/,
   'La pàgina s’obre amb una densitat del 180%');
 assert.match(html,/density=1\.8/,'El motor de la pàgina usa el valor inicial real');
 assert.match(html,/HUNTER_PLAYER_MODEL\.create\(THREE/,
   'Els quatre quadres utilitzen el model del protagonista');
 assert.match(html,/unitScale:1\.2/,'Es conserva la mida del model del joc');
 assert.match(html,/radius\*\.49\+7/,
   'La càmera és significativament més propera que radius+19');
 assert.match(html,/a\.player\.position\.set\(/,
   'El jugador queda visible al costat de cada explosió');
 console.log('OK explosió densa, càmera pròxima, personatge a escala, llavors i neteja');
})().catch(err=>{console.error(err);process.exitCode=1});
