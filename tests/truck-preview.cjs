'use strict';
const assert=require('node:assert/strict');

(async()=>{
 const THREE=await import('../vendor/three-r186.module.mjs');
 const {createTruckConcept,truckConcepts}=await import('../src/truck-concepts.mjs');
 assert.equal(truckConcepts.length,4,'Calen quatre iteracions de l’A4');
 const models=truckConcepts.map((_,i)=>createTruckConcept(THREE,i));
 const specials=[
   'rear-clear-center','rear-guard-skid','rear-modular-center','rear-bastion-main'
 ];
 const triangles=[];
 const tireRadius=.80,tireHalfWidth=.235,axles=[-2.68,.82,2.80];
 for(const [i,model] of models.entries()){
   const label=truckConcepts[i].name;
   assert.equal(model.userData.armorLevel,4,label+': conservar model A4');
   assert.deepEqual(model.userData.axles,axles,label+': posició dels eixos');
   assert.equal(model.userData.wheelCount,6);
   assert.equal(model.children.filter(o=>o.isGroup&&o.position.y===.82).length,6);
   assert.equal(model.getObjectByName('lateral-spare-wheel'),undefined);
   assert(model.userData.cabinHollow&&model.userData.frontGlazingTransparent);
   assert(model.getObjectByName('A-cabin-roof')?.geometry.parameters.depth>2.5);
   const front=model.getObjectByName('A-front-windscreen');
   const sides=model.children.filter(o=>o.name==='A-side-window');
   assert(front&&sides.length===2,'Calen tres vidres');
   for(const glass of [front,...sides])
     assert(glass.material.transparent&&glass.material.opacity<.5&&!glass.material.depthWrite,
       label+': finestres transparents');
   const frontHits=new THREE.Raycaster(new THREE.Vector3(.78,3.15,-10),
     new THREE.Vector3(0,0,1)).intersectObject(model,true);
   assert.equal(frontHits[0]?.object,front,label+': parabrisa frontal visible');
   const sideHits=new THREE.Raycaster(new THREE.Vector3(-10,3.14,-2.08),
     new THREE.Vector3(1,0,0)).intersectObject(model,true);
   assert.equal(sideHits[0]?.object?.name,'A-side-window',label+': finestra lateral visible');
   assert(model.userData.rearArmor,'Cal protegir la part posterior');
   assert(model.getObjectByName('rear-armor-bumper'));
   assert(model.getObjectByName('rear-armor-upper'));
   assert(model.getObjectByName(specials[i]),
     label+': la iteració posterior ha de ser distinta');
   assert.equal(model.userData.archCount,6,'Cal un arc per a cadascuna de les sis rodes');
   assert(model.userData.wheelClearanceMin>=.10,
     label+': marge mínim de 10 cm entre roda i parafang');

   const arches=[];let triCount=0;
   model.updateMatrixWorld(true);
   model.traverse(obj=>{
     if(!obj.isMesh)return;
     const pos=obj.geometry.getAttribute('position');
     if(pos)triCount+=(obj.geometry.index?obj.geometry.index.count:pos.count)/3;
     if(obj.userData.wheelArch)arches.push(obj);
     // Blindatge A4, excepte els arcs especials; aquests es validen per radi.
     if(!/^(armor|command|rear|bastion|modular|guard)-/.test(obj.name)||obj.userData.wheelArch)
       return;
     if(obj.geometry.type!=='BoxGeometry')return;
     const bounds=new THREE.Box3().setFromObject(obj);
     for(const zc of axles)for(const sign of[-1,1]){
       const wc=sign*1.63;
       const dx=Math.max(0,bounds.min.x-(wc+tireHalfWidth),(wc-tireHalfWidth)-bounds.max.x);
       const dy=Math.max(0,bounds.min.y-(.82+tireRadius),(.82-tireRadius)-bounds.max.y);
       const dz=Math.max(0,bounds.min.z-(zc+tireRadius),(zc-tireRadius)-bounds.max.z);
       // AABB conservadora: com a mínim 4 cm de separació a qualsevol peça.
       assert(Math.hypot(dx,dy,dz)>=.04-1e-6,
        label+': blindatge '+obj.name+' envaeix la roda '+sign+' / '+zc);
     }
   });
   assert.equal(arches.length,6,label+': sis arcs corbats reals');
   for(const arch of arches){
     const pos=arch.geometry.getAttribute('position');
     assert(pos.count>=8*6,'El parafang ha de seguir una corba i no ser una caixa');
     // Les cordes de les facetes, no només els vèrtexs, han de deixar espai.
     const index=arch.geometry.index;
     for(let f=0;f<index.count;f+=3){
       const a=new THREE.Vector3().fromBufferAttribute(pos,index.getX(f));
       const b=new THREE.Vector3().fromBufferAttribute(pos,index.getX(f+1));
       const c=new THREE.Vector3().fromBufferAttribute(pos,index.getX(f+2));
       for(const pt of [a,b,c,a.clone().add(b).multiplyScalar(.5),
         a.clone().add(c).multiplyScalar(.5),b.clone().add(c).multiplyScalar(.5),
         a.clone().add(b).add(c).multiplyScalar(1/3)]){
         const d=Math.hypot(pt.y-.82,pt.z-arch.userData.axleZ);
         assert(d>=tireRadius+.09-1e-6,
           label+': triangle del parafang massa a prop del pneumàtic');
       }
     }
   }
   assert(triCount<3600,label+': conservar model low-poly');
   triangles.push(Math.round(triCount));
 }
 assert(new Set(models.map(m=>m.userData.armorPartCount)).size>=3,
   'Les quatre iteracions han de tenir geometries diferents');
 console.log('OK: 4 iteracions de l’A4, sis arcs, col·lisions, vidres, blindatge posterior');
 console.log('Triangles:',triangles.join(', '));
})().catch(err=>{console.error(err);process.exitCode=1});
