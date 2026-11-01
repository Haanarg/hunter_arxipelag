// Regressió de la comparativa Three.js: model 3 i les seves quatre iteracions.
// Executar: node tests/hovercraft-prototypes.mjs
import assert from 'node:assert/strict';
import {createHovercraftConcept,hovercraftConcepts} from '../src/hovercraft-concepts.mjs';
class Vector3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
  clone(){return new Vector3(this.x,this.y,this.z)}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
  multiplyScalar(n){this.x*=n;this.y*=n;this.z*=n;return this}
  length(){return Math.hypot(this.x,this.y,this.z)}
  normalize(){return this.multiplyScalar(1/(this.length()||1))}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
  copy(v){return this.set(v.x,v.y,v.z)}
}
class Geometry{
  constructor(...args){this.args=args}
  translate(){return this}
  setAttribute(){return this}
  setIndex(){return this}
  computeVertexNormals(){return this}
}
class Group {
  constructor(){
    this.children=[];this.userData={};this.visible=true;
    this.position=new Vector3();this.rotation={x:0,y:0,z:0};
    this.scale=new Vector3(1,1,1);this.quaternion={setFromUnitVectors(){}};
  }
  add(object){this.children.push(object)}
}
class Mesh extends Group {
  constructor(geometry,material){super();this.geometry=geometry;this.material=material}
}
class Material{constructor(options){Object.assign(this,options)}}
const T={Group,Mesh,Vector3,MeshStandardMaterial:Material,MeshPhysicalMaterial:Material,
  BufferGeometry:Geometry,Float32BufferAttribute:class{constructor(array){this.array=array}},
  DoubleSide:2};
for(const name of ['BoxGeometry','CylinderGeometry','SphereGeometry','TorusGeometry'])
  T[name]=Geometry;
assert.equal(hovercraftConcepts.length,4);
assert.deepEqual(hovercraftConcepts.map(c=>c.style),['recon','patrol','interceptor','command']);
for(let i=0;i<4;i++){
  const model=createHovercraftConcept(T,i),rig=model.userData;
  assert.equal(rig.rotors.length,1,`Variant ${i}: només una hèlix`);
  assert.equal(rig.cockpitSeats.length,2,`Variant ${i}: dues places dins la cabina`);
  assert.equal(rig.windowPanes.length,7,`Variant ${i}: set vidres amb obertures`);
  assert.deepEqual(rig.windowPanes.map(w=>w.userData.windowPane).sort(),
    ['front','front','rear','side','side','side','side']);
  for(const pane of rig.windowPanes){
    assert.equal(pane.material.transparent,true);
    assert.ok(pane.material.opacity<.45,'Els vidres han de permetre veure els seients');
    assert.equal(pane.material.depthWrite,false);
  }
  assert.equal(rig.skirtFilamentsRemoved,true);
  assert.ok(rig.canopyRoof,'El sostre s’ha de poder ocultar per inspeccionar l’interior');
  rig.canopyRoof.visible=false;
  assert.equal(rig.canopyRoof.visible,false);
  rig.animate(1);
  assert.ok(Math.abs(rig.rotors[0].rotation.z)>0,'L’hèlix s’ha de poder animar');
}
console.log('4 hovercrafts del model 3: 1 hèlix, 2 seients, 7 vidres transparents i flotador net — OK');
