'use strict';
// Proves CPU del laboratori: procediment per llavor, escalat pel radi,
// límit de draw calls i restauració. No executa WebGL ni GitHub Actions.
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
(async()=>{
 const url=pathToFileURL(path.join(__dirname,'../src/explosion-burst-preview.mjs')).href;
 const {EXPLOSION_PRESETS,EXPLOSION_VARIANTS,EXPLOSION_PALETTE,
   createProceduralExplosion,explosionMetrics,mulberry32}=await import(url);
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
 assert.equal(explosionMetrics(48*2,1.8).radius,96,
   'El radi ×2 del C4 no pot quedar retallat al límit antic de 90 m');
 assert(explosionMetrics(48*2,1.8).count>500,
   'El C4 de radi doble ha de tenir més de 500 volums procedurals');
 assert(EXPLOSION_PALETTE.hot.some(color=>color===0xffef30),
   'La nova paleta conté grocs molt intensos');
 assert(EXPLOSION_PALETTE.dark.some(color=>color===0xf31e65),
   'La nova paleta conté magentes saturats');
 const scene=new THREE.Scene();
 const fx=createProceduralExplosion(scene,{radius:16,density:1,seed:12});
 assert.equal(fx.group.parent,scene);
 const parts=fx.group.children.filter(x=>x.isInstancedMesh);
 assert.equal(parts.length,4,'Quatre famílies de polígons agrupades');
 assert.deepEqual(Object.keys(EXPLOSION_VARIANTS),['A','B','C']);
 assert.equal(fx.variant,'B','El motor arrenca en l’estil B seleccionat');
 for(const mesh of parts.slice(0,3)){
   assert(mesh.material.isMeshStandardMaterial,'La punta és un volum il·luminat');
   assert.equal(mesh.material.transparent,false,'Les puntes no són plaques planes/transparents');
   mesh.geometry.computeBoundingBox();
   const bb=mesh.geometry.boundingBox;
   assert(bb.max.y-bb.min.y>.9,'Cada punta té longitud tridimensional');
   assert(bb.max.x-bb.min.x>.3,'Cada punta té gruix real');
   assert(bb.max.z-bb.min.z>.3,'Cada punta té profunditat real');
   assert(Math.abs(bb.min.y)<1e-5,'La base de la punta neix del nucli');
 }
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
 const geometryB=parts.map(p=>p.geometry);
 for(const mesh of parts.slice(0,3)){
   mesh.geometry.computeBoundingBox();
   const bb=mesh.geometry.boundingBox;
   assert(bb.max.y-bb.min.y>.9,'Les puntes B mantenen la longitud 3D');
   assert(bb.max.x-bb.min.x>.3&&bb.max.z-bb.min.z>.3,
     'Les puntes B no són superfícies planes');
 }
 assert.equal(fx.setVariant('A'),true);
 assert.equal(fx.variant,'A');
 const geometryA=parts.map(p=>p.geometry);
 assert.notEqual(geometryB[0],geometryA[0],'A/B han de tenir malles diferents');
 assert.equal(geometryB[3],geometryA[3],'El fum es comparteix entre variants');
 assert.deepEqual(snapshots(),first,'Canviar A/B conserva la llavor');
 assert.equal(fx.setVariant('D'),false,'Només s’admeten A, B i C');
 assert.equal(fx.setVariant('B'),true);
 assert.equal(fx.variant,'B');
 assert.deepEqual(snapshots(),first,'Tornar a B recupera la mateixa explosió');
 fx.launch({radius:48,density:1.2,seed:123});
 assert.deepEqual(snapshots(),first,
   'La mateixa llavor reprodueix la mateixa forma i els mateixos colors');
 fx.launch({radius:48,density:1.2,seed:124});
 assert.notDeepEqual(snapshots(),first,'Una altra llavor canvia l’explosió');
 // Regressions del C: no és un pic ni una closca única.
 assert.equal(fx.setVariant('C'),true);
 const C=fx.launch({radius:96,density:1.8,seed:222,variant:'C'});
 assert.equal(C.radius,96);
 assert.equal(C.count,C.volumeCount,'El C mostra nombre de volums, no de fragments');
 assert(C.volumeCount>=8&&C.volumeCount<=12);
 assert.equal(fx.volumeCount,C.volumeCount);
 assert.equal(parts.reduce((n,p)=>n+p.count,0),0,
   'C no genera cap mena de puntes radials del model B');
 assert(fx.fireballGroup.visible,'Els volums C són visibles');
 const blobs=fx.fireballGroup.children;
 assert.equal(blobs.length,12,'C té una paleta de dotze blobs quasi esfèrics');
 assert.equal(blobs.filter(x=>x.visible).length,C.volumeCount);
 for(const blob of blobs){
  blob.geometry.computeBoundingBox();
  const size=new THREE.Vector3();
  blob.geometry.boundingBox.getSize(size);
  const ratio=Math.max(size.x,size.y,size.z)/Math.min(size.x,size.y,size.z);
  assert(ratio<1.65,'Cada capa és irregular però relativament esfèrica');
  assert(blob.material.isMeshStandardMaterial,'Cada capa és un volum il·luminat');
  assert(Math.hypot(blob.position.x,blob.position.y,blob.position.z)<.8,
    'Les capes mantenen pràcticament el mateix centre');
 }
 const poses=blobs.map(x=>[...x.position.toArray(),...x.rotation.toArray(),
   ...x.scale.toArray()]);
 fx.launch({radius:96,density:1.8,seed:222,variant:'C'});
 assert.deepEqual(blobs.map(x=>[...x.position.toArray(),...x.rotation.toArray(),
   ...x.scale.toArray()]),poses,'La mateixa llavor reprodueix la bola de foc');
 fx.launch({radius:96,density:1.8,seed:223,variant:'C'});
 assert.notDeepEqual(blobs.map(x=>[...x.position.toArray(),...x.rotation.toArray(),
   ...x.scale.toArray()]),poses,'La bola canvia lleument amb una nova llavor');
 const custom=[0xffffff,0xffee22,0xffa500,0xff7000,0xe23b20,0x89200e];
 assert.equal(fx.setPalette(custom),true);
 assert.equal(blobs[0].material.color.getHex(),custom[3]);
 assert.equal(blobs[1].material.color.getHex(),custom[1]);
 assert.equal(blobs[5].material.color.getHex(),custom[4]);
 assert.equal(fx.setPalette([0x123]),false,'Calen sis colors vàlids');
 for(let i=0;i<60;i++)fx.tick(.04);
 assert.equal(fx.fireballGroup.visible,false,
   'Els volums també desapareixen quan acaba el temps');
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
 assert.match(html,/const RADIUS_MULTIPLIER=2,EXPLOSION_STYLE='B'/,
   'La configuració del preview és fixament radi doble i estil B');
 assert.match(html,/createProceduralExplosion\(scene,\{\.\.\.preset,variant:'B'\}\)/,
   'Cada explosió comença realment amb la geometria B');
 assert.match(html,/p\.radius\*RADIUS_MULTIPLIER/,
   'Les distàncies de les explosions del preview s’escalen ×2');
 assert.doesNotMatch(html,/id="radius"/,
   'El multiplicador no pot tornar a ser ajustable al preview');
 assert.doesNotMatch(html,/id="variantA"/,
   'L’estil A no ha d’aparèixer com a selector en aquesta iteració');
 assert.match(html,/class="palette-preview"/,
   'La nova paleta de colors vius ha de ser visible al panell');
 assert.match(html,/id="modelC"/,'El C es pot seleccionar per comparar');
 assert.match(html,/id="modelB"/,'El B continua disponible');
 assert.match(html,/a\.effect\.setPalette\(colors\)/,
   'Les sis paletes canvien els colors dels volums C');
 assert.match(html,/model==='C'\?' volums':' fragments'/,
   'Es mostra el nombre real de volums del model C');
 console.log('OK C quasi esfèric superposat, sense puntes, colors i llavors');
})().catch(err=>{console.error(err);process.exitCode=1});
