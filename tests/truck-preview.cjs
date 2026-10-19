'use strict';
const assert=require('node:assert/strict');

(async()=>{
 const THREE=await import('../vendor/three-r186.module.mjs');
 const {createTruckConcept,truckConcepts}=await import('../src/truck-concepts.mjs');
 assert.equal(truckConcepts.length,4);
 const models=truckConcepts.map((_,i)=>createTruckConcept(THREE,i));
 const expectedSpecial=['field-underbody','shield-center','bastion-cargo-wall-1','command-roof-armor'];
 const triangleCounts=[];
 for(let i=0;i<models.length;i++){
   const model=models[i],tag='model '+(i+1);
   assert.equal(model.userData.truckVariant,truckConcepts[i].id,tag);
   assert.equal(model.userData.armorLevel,i+1,tag+': nivell de blindatge');
   assert(model.userData.armorPartCount>=40,tag+': blindatge 3D, no només color');
   assert(model.getObjectByName('armor-front-shield'),tag+': escut frontal real');
   assert(model.getObjectByName(expectedSpecial[i]),tag+': protecció característica');
   assert.deepEqual(model.userData.axles,[-2.68,.82,2.80],tag+': eixos separats');
   assert(model.userData.axles[2]-model.userData.axles[1]>1.6);
   assert.equal(model.userData.wheelCount,6);
   assert.equal(model.children.filter(o=>o.isGroup&&o.position.y===.82).length,6);
   assert.equal(model.getObjectByName('lateral-spare-wheel'),undefined,tag+': cap recanvi lateral');
   assert.equal(model.userData.cabinHollow,true,tag+': cabina buida');
   assert(model.getObjectByName('A-cabin-roof')?.geometry.parameters.depth>2.5);
   const front=model.getObjectByName('A-front-windscreen'),
      sides=model.children.filter(o=>o.name==='A-side-window');
   assert(front,tag+': parabrisa davant');
   assert.equal(sides.length,2,tag+': dues finestres laterals');
   for(const glass of [front,...sides])
     assert(glass.material.transparent&&glass.material.opacity<.5&&!glass.material.depthWrite,
      tag+': vidres realment transparents');
   const frontHits=new THREE.Raycaster(new THREE.Vector3(.78,3.15,-10),
      new THREE.Vector3(0,0,1)).intersectObject(model,true);
   assert.equal(frontHits[0]?.object,front,tag+': parabrisa visible des del davant');
   const sideHits=new THREE.Raycaster(new THREE.Vector3(-10,3.14,-2.08),
      new THREE.Vector3(1,0,0)).intersectObject(model,true);
   assert.equal(sideHits[0]?.object?.name,'A-side-window',tag+': finestra lateral descoberta');
   let triangles=0;
   model.traverse(o=>{
     if(!o.isMesh||!o.geometry?.getAttribute('position'))return;
     triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.getAttribute('position').count)/3;
   });
   triangleCounts.push(Math.round(triangles));
   assert(triangles<3500,tag+': conservar l’estil low-poly');
 }
 assert(new Set(models.map(m=>m.userData.armorPartCount)).size>=3,
    'Els reforços han de ser variants geomètricament diferents');
 console.log('OK: 4 models de l’A, 6x6, blindats, cabina buida, vidres visibles i sense recanvi lateral');
 console.log('Triangles per variant:',triangleCounts.join(', '));
})().catch(e=>{console.error(e);process.exitCode=1});
