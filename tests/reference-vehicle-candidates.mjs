// Test de geometria procedimental: candidats editables i independents del joc.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {createReferenceVehicle,REFERENCE_CANDIDATE_VERSION} from '../src/vehicle-reference-candidates.mjs';
import {getT90Rig,stepT90MPreview,stepT90Tracks} from '../src/t90m-preview-animation.mjs';

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
  assert(size.x>5.4&&size.x<6.1,'Amplada T-90M ×1.5');
  assert.equal(candidate.scale.x,1.5,'Escala exacta 150 %');
  assert.equal(candidate.scale.y,1.5);
  assert.equal(candidate.scale.z,1.5);
  assert(candidate.getObjectByName('Cadena contínua buida').geometry.parameters.shapes.holes.length===1,'Cadena buida');
  assert(size.z>10,'El canó llarg ha d’estar dins la caixa visual');
  const rig=getT90Rig(candidate);
  assert(rig&&rig.tracks.length===2,'Les erugues han de tenir dos controls independents');
  assert.equal(rig.wheels.length,12,'Sis pivots de roda per costat');
  const left=rig.tracks.find(t=>t.side===-1),right=rig.tracks.find(t=>t.side===1);
  assert(left.links.length>30&&right.links.length>30);
  const before=left.links[0].position.clone();
  stepT90MPreview(candidate,{throttle:1,steer:0,turretYaw:60,elevation:15},.07);
  assert(left.links[0].position.distanceTo(before)>.01,'Les sabates s’han de moure');
  assert(rig.turret.rotation.y>0&&rig.barrel.rotation.x>0,'Torreta i canó animats');
  const l0=left.phase,r0=right.phase;
  stepT90Tracks(candidate,{throttle:0,steer:1},.07);
  assert(left.phase<l0&&right.phase>r0,'Gir pivotant amb erugues en sentits contraris');
  assert(rig.wheels.some(w=>Math.abs(w.rotation.x)>0),'Rodes que roden');

 }else{
  assert.equal(names.filter(n=>n.startsWith('Pneumàtic tot terreny')).length,4);
  assert.equal(names.filter(n=>n.startsWith('Porta lateral')).length,4);
  assert.equal(candidate.userData.candidateParts.doors,4);
  assert.equal(candidate.userData.candidateParts.seats,4);
  assert(candidate.getObjectByName('Volant'));
  const panes=all.filter(o=>/^(Vidre lateral|Vidre posterior|Finestreta posterior lateral|Parabrisa partit)/.test(o.name));
  assert.equal(panes.length,10);
  for(const pane of panes){
   assert(pane.material.transparent&&pane.material.opacity<.3);
   const p=pane.geometry.attributes.position,center=new THREE.Vector3();
   for(let i=0;i<p.count;i++)center.add(new THREE.Vector3().fromBufferAttribute(p,i));
   center.divideScalar(p.count);pane.localToWorld(center);
   const direction=new THREE.Vector3(0,1.97, .65).sub(center).normalize();
   // First opaque obstruction must lie beyond the wall, not directly behind glass.
   const ray=new THREE.Raycaster(center.clone().addScaledVector(direction,-.08),direction,.001,.16);
   assert.equal(ray.intersectObjects(all).filter(h=>!h.object.material.transparent).length,0,pane.name+' té blindatge darrere');
  }

  assert(size.x>2.4&&size.x<2.8,'Amplada Tigr amb retrovisors');
  assert(size.z>5.6&&size.z<5.9,'Longitud Tigr');
  assert.equal(candidate.userData.candidateParts.wheelbase,3.3);
  assert.equal(names.filter(n=>n==='Panell lateral amb passos de roda').length,2);
 }
 const json=candidate.toJSON();
 const restored=new THREE.ObjectLoader().parse(json);
 assert.equal(restored.userData.referenceCandidate,type);
 if(type==='tigr-v1')for(const original of all){
  const copy=restored.getObjectByProperty('uuid',original.uuid);
  assert.deepEqual(Array.from(copy.geometry.attributes.position.array),Array.from(original.geometry.attributes.position.array),'Geometria editable preservada: '+original.name);
 }
 assert(new THREE.Box3().setFromObject(restored).getSize(new THREE.Vector3()).distanceTo(size)<1e-4,
  'La geometria ha de poder-se exportar i importar per l’editor');
}
assert.throws(()=>createReferenceVehicle(THREE,'unknown'),/desconegut/);
console.log('PASS vehicle reference candidates: T-90M + GAZ Tigr-M geometry, wheels, editable JSON');
