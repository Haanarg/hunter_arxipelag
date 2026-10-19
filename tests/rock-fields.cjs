'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const THREE=await import('../vendor/three-r186.module.mjs');
 const {baseRockCluster,generateRockFields}=await import('../src/rock-fields.mjs');
 const all=[];
 for(let x=25;x<165;x+=17){
   const parts=[];
   const n=baseRockCluster(x,60,1.2,(a,b,s,kind)=>{parts.push({x:a,z:b,s,kind});return true});
   assert(n===3||n===4,'Cada roca antiga es converteix en un grup de 3-4');
   assert.equal(parts.length,n);
   assert(parts.every(p=>p.s>.4&&p.s<1.5));
   all.push(...parts);
 }
 const islands=[
   {x:0,z:0,r:265},{x:700,z:100,r:320},
   {x:1400,z:600,r:235},{x:-630,z:950,r:295},
   {x:-1250,z:-450,r:245},{x:800,z:-1100,r:285}
 ];
 const hAt=(x,z)=>{
   let height=-8;
   for(const island of islands){
     const d=Math.hypot(x-island.x,z-island.z);
     height=Math.max(height,54*(1-(d/island.r)**2)-6);
   }
   return height;
 };
 const placements=[];
 const run=()=>generateRockFields({islands,hAt,canPlace:()=>true,
   addRock:(x,z,s,kind)=>{placements.push({x,z,s,kind,h:hAt(x,z)});return true}});
 const stats=run();
 assert(stats.summitB>0&&stats.summitD>0,'Variacions de B i D als vessants');
 assert(stats.shoreClusters>0,'Esculls costaners de tipus C');
 assert(placements.some(p=>p.h<0)&&placements.some(p=>p.h>24),
   'Pedres emergides i submergides, i afloraments d’altitud');
 assert(placements.every(p=>p.s>.5&&p.s<5.1),'Mides controlades per LOD');
 const count=placements.length,copy=placements.map(p=>JSON.stringify(p));
 placements.length=0;
 const stats2=run();
 assert.deepEqual(stats,stats2,'La distribució és determinista per llavor');
 assert.deepEqual(placements.map(p=>JSON.stringify(p)),copy,'Cap dependència de l’RNG de joc');
 const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/vegetation.js'),'utf8');
 const ctx={window:{},THREE,console};
 require('node:vm').createContext(ctx);
 require('node:vm').runInContext(src,ctx);
 const model=ctx.window.HUNTER_VEGETATION.create(THREE,{materialProfile:()=>({}),random:()=>.5});
 const p=model.geometry.rock,large=model.geometry.rockTall;
 const tris=g=>(g.index?.count||g.attributes.position.count)/3;
 assert(tris(p)<=36&&tris(large)<=36,'Dos models simples no rodons');
 const world=new THREE.Group(),rocks=[
   [3,1,4,1.3,0,0,.2,0],[9,1,6,2,0,0,-.2,1],
   [15,1,9,.9,0,0,.1,0],[30,1,12,2.5,0,0,.2,1]
 ];
 const visuals=model.build({world,palms:[],bushes:[],rocks,playerX:0,playerZ:0});
 const instances=[];
 visuals.rocks.traverse(o=>{if(o.isInstancedMesh)instances.push(o)});
 assert.equal(instances.length,2,'Màxim dos lots instanciats per sector');
 assert.equal(instances.reduce((s,m)=>s+m.count,0),rocks.length);
 const game=await require('./harness.cjs')();
 const hits=game.run(`(()=>{
   TG.clear();
   TG.set('1,2',[{x:30,z:40,r:3,rock:true,topY:5,bottomY:-1}]);
   return [!!nearbyRock(32,41,1,0,2),
     !!nearbyRock(32,41,1,-1.4,2),
     !!nearbyRock(32,41,1,10,13)]
 })()`);
 assert.equal(hits[0],true,'Col·lisió terrestre');
 assert.equal(hits[1],true,'Col·lisió marítima');
 assert.equal(hits[2],false,'Vehicles aeris per sobre no col·lisionen');
 console.log('OK roques: grups B/C/D, esculls, cims, instàncies i col·lisions 3D');
})().catch(e=>{console.error(e);process.exitCode=1});
