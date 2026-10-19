'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const THREE=await import('../vendor/three-r186.module.mjs');
 const {ROCK_CONCEPTS,rockGeometry,rockInstances,sharkSample,SHARK_CYCLE,SHARK_BITES}=await import('../src/nature-prototypes.mjs');
 assert.equal(ROCK_CONCEPTS.length,4,'Quatre escenes de roca');
 assert.equal(SHARK_CYCLE,12);
 assert.deepEqual([...SHARK_BITES],[2.65,8.65]);
 for(let i=0;i<4;i++){
   const rows=rockInstances(i);
   assert.equal(rows.length,ROCK_CONCEPTS[i].count,'Recompte previst de roques');
   assert([...new Set(rows.map(o=>o.kind))].length<=2,'Màxim dos lots instanciats');
   for(const row of rows){
     assert(row.radius>0&&row.halfHeight>0&&row.scale>0,
       'Col·lisió positiva i independent dels triangles');
     const geom=rockGeometry(THREE,row.kind),a=geom.getAttribute('position');
     const count=(geom.index?.count||a.count)/3;
     assert(count<=40,'Un model individual ha de ser realment low-poly');
     for(let n=0;n<a.count;n++)assert(
       Number.isFinite(a.getX(n))&&Number.isFinite(a.getY(n))&&Number.isFinite(a.getZ(n)),
       'Geometria deformada finita');
     geom.dispose();
   }
 }
 const coast=rockInstances(2),peak=rockInstances(3);
 assert(coast.some(o=>o.z<-2)&&coast.some(o=>o.z>4),'L’escull travessa la riba i entra dins l’aigua');
 assert(peak.filter(o=>o.scale>3).length>=4,'Els cims han de tenir roques gegants');
 for(const t of [2.65,8.65]){
   const s=sharkSample(t);
   assert(s.bite,'La mossegada ha de disparar efectes');
   assert(s.biteOffset>1.4&&s.biteOffset<2.1,'El tauró ha de passar a un costat del nedador');
 }
 assert(sharkSample(3.85).z>9,'El tauró continua de llarg després de mossegar');
 assert(Math.hypot(sharkSample(5).x,sharkSample(5).z)>18,
   'El tauró s’allunya abans de girar');
 assert(sharkSample(8.34).phase==='Nova embestida','Ha de tornar a atacar');
 let maxTurn=0,prior=null;
 for(let i=0;i<=1200;i++){
   const yaw=sharkSample(i*.01).yaw;
   if(prior!==null){
     const delta=Math.abs(Math.atan2(Math.sin(yaw-prior),Math.cos(yaw-prior)));
     maxTurn=Math.max(maxTurn,delta);
   }
   prior=yaw;
 }
 assert(maxTurn<.12,'La trajectòria del 8 ha de tenir tangents contínues, sense girs bruscos');
 const join=sharkSample(SHARK_CYCLE),origin=sharkSample(0);
 assert(Math.hypot(join.x-origin.x,join.z-origin.z)<1e-8,'El bucle ha de tancar sense salts');
 const page=fs.readFileSync(path.join(__dirname,'../roques-taurons-proves.html'),'utf8');
 assert(page.includes("new THREE.InstancedMesh"),'La preview ha d’emprar instàncies');
 assert(page.includes("SHARK_CYCLE"),'Simulació de l’atac amb el mateix generador');
 assert(page.includes('id="sharkView"'),'Vista de tauró present');
 assert(page.includes('id="colliders"'),'Representació dels colliders');
 assert(page.includes("new THREE.WebGLRenderer"),'Three.js real, no només il·lustracions');
 console.log('OK: 4 tipus de roca irregular, batches instanciats, colliders i mossegades de passada');
})().catch(err=>{console.error(err);process.exitCode=1});
