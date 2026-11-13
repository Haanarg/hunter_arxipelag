// Test de geometria procedimental: candidats editables i independents del joc.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {createReferenceVehicle,REFERENCE_CANDIDATE_VERSION} from '../src/vehicle-reference-candidates.mjs';

assert(REFERENCE_CANDIDATE_VERSION.includes('tigr'));
for(const [type,needles,minMeshes] of [
 ['tigr-v1',['Carrosseria GAZ Tigr-M','Porta lateral','Pneumàtic tot terreny','Parabrisa partit'],30],
 ['t90m-v1',['Casc inferior T-90M','Roda de carretera','Torreta giratòria T-90M','Canó principal 125 mm'],60]
]){
 const candidate=createReferenceVehicle(THREE,type);
 candidate.updateMatrixWorld(true);
 const all=[],names=[];
 candidate.traverse(o=>{
  names.push(o.name);
  if(!o.isMesh)return;
  all.push(o);
  const pos=o.geometry?.getAttribute('position');
  assert(pos&&pos.count>=3,type+' té una malla buida: '+o.name);
  for(let i=0;i<pos.count;i++)
   for(const value of [pos.getX(i),pos.getY(i),pos.getZ(i)])
    assert(Number.isFinite(value),type+' inclou coordenades no finites');
 });
 assert(all.length>=minMeshes,'Manca detall al candidat '+type);
 for(const name of needles)assert(names.some(n=>n.includes(name)),type+': falta '+name);
 const size=new THREE.Box3().setFromObject(candidate).getSize(new THREE.Vector3());
 for(const value of size.toArray())assert(value>1&&value<20,type+': dimensions incorrectes');
 assert(candidate.userData.referenceCandidate===type);
 if(type==='t90m-v1'){
  assert.equal(names.filter(n=>n.startsWith('Roda de carretera')).length,12);
  assert.equal(candidate.userData.candidateParts.wheelsPerSide,6);
  assert(size.x>3.6&&size.x<4.0,'Amplada T-90M');
  assert(candidate.getObjectByName('Cadena contínua buida').geometry.parameters.shapes.holes.length===1,'Cadena buida');
  assert(size.z>7,'El canó llarg ha d’estar dins la caixa visual');
 }else{
  assert.equal(names.filter(n=>n.startsWith('Pneumàtic tot terreny')).length,4);
  assert.equal(names.filter(n=>n.startsWith('Porta lateral')).length,4);
  assert.equal(candidate.userData.candidateParts.doors,4);
  assert(size.x>2.4&&size.x<2.8,'Amplada Tigr amb retrovisors');
  assert(size.z>5.6&&size.z<5.9,'Longitud Tigr');
  assert.equal(candidate.userData.candidateParts.wheelbase,3.3);
  assert.equal(names.filter(n=>n==='Panell lateral amb passos de roda').length,2);
 }
 const json=candidate.toJSON();
 const restored=new THREE.ObjectLoader().parse(json);
 assert.equal(restored.userData.referenceCandidate,type);
 assert(new THREE.Box3().setFromObject(restored).getSize(new THREE.Vector3()).distanceTo(size)<1e-4,
  'La geometria ha de poder-se exportar i importar per l’editor');
}
assert.throws(()=>createReferenceVehicle(THREE,'unknown'),/desconegut/);
console.log('PASS vehicle reference candidates: T-90M + GAZ Tigr-M geometry, wheels, editable JSON');
