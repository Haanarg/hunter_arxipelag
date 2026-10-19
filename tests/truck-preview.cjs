'use strict';
const assert=require('node:assert/strict');

(async()=>{
  // Three.js local: el test no necessita ni canvas ni WebGL.
  const THREE=await import('../vendor/three-r186.module.mjs');
  const {createTruckConcept,truckConcepts}=await import('../src/truck-concepts.mjs');
  assert.equal(truckConcepts.length,4);
  const models=truckConcepts.map((_,i)=>createTruckConcept(THREE,i));
  const [classic]=models;
  const axles=classic.userData.axles;
  assert.deepEqual(axles,[-2.68,.82,2.80]);
  assert(axles[2]-axles[1]>1.6,'Les rodes del mig i de darrere no es poden tocar');
  assert.equal(classic.userData.wheelCount,6);
  assert.equal(classic.children.filter(o=>o.isGroup&&o.position.y===.82).length,6,
    'El model A ha de tenir sis grups de roda');
  assert.equal(classic.getObjectByName('lateral-spare-wheel'),undefined,
    'Sense roda de recanvi lateral al model A');
  assert.equal(classic.userData.cabinHollow,true);
  const roof=classic.getObjectByName('A-cabin-roof');
  assert(roof?.geometry.parameters.width>3.2&&roof.geometry.parameters.depth>2.5,
    'La cabina del model A ha de ser més ampla i llarga cap enrere');
  const windshield=classic.getObjectByName('A-front-windscreen');
  const sideWindows=classic.children.filter(o=>o.name==='A-side-window');
  assert(windshield,'Cal parabrisa frontal');
  assert.equal(sideWindows.length,2,'Calen els dos vidres laterals');
  for(const glass of [windscreen,...sideWindows]){
    assert(glass.material.transparent&&glass.material.opacity<.5&&!glass.material.depthWrite,
      'Els vidres han de ser transparents i no tapar l’interior');
  }
  const frontRay=new THREE.Raycaster(
    new THREE.Vector3(.78,3.15,-10),new THREE.Vector3(0,0,1));
  const frontHits=frontRay.intersectObject(classic,true);
  assert.equal(frontHits[0]?.object,windscreen,
    'Mirant el model A de front, el parabrisa ha de ser visible i no tapat per la carrosseria');
  const sideRay=new THREE.Raycaster(
    new THREE.Vector3(-10,3.14,-2.08),new THREE.Vector3(1,0,0));
  const sideHits=sideRay.intersectObject(classic,true);
  assert.equal(sideHits[0]?.object.name,'A-side-window',
    'Mirant el model A de costat, la finestra ha de quedar davant de la cabina buida');
  for(const variant of models.slice(1)){
    assert.deepEqual(variant.userData.axles,[-2.68,1.58,2.73],
      'La iteració només pot canviar la posició dels eixos del model A');
    assert(variant.getObjectByName('lateral-spare-wheel'),
      'No modificar la roda de recanvi dels models B, C i D');
  }
  let triangles=0;
  classic.traverse(o=>{
    if(!o.isMesh||!o.geometry?.getAttribute('position'))return;
    triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.getAttribute('position').count)/3;
  });
  assert(triangles<3500,'El model A ha de continuar sent low-poly');
  console.log('OK: camió A 6×6, eixos separats, cabina buida i ampliada, vidres transparents visibles i sense recanvi');
  console.log('Triangles model A:',Math.round(triangles));
})().catch(err=>{console.error(err);process.exitCode=1});
