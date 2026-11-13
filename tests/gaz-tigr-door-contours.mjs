import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {createReferenceVehicle} from '../src/vehicle-reference-candidates.mjs';
import {prepareGazTigrRuntime} from '../src/gaz-tigr-runtime.mjs';

function verify(root,name){
 const meshes=[];root.traverse(node=>{if(node.isMesh)meshes.push(node)});
 const find=n=>meshes.filter(m=>m.name===n);
 const points=mesh=>{
  const arr=mesh.geometry.attributes.position,vertices=[];
  for(let i=0;i<arr.count;i++)vertices.push([arr.getX(i),arr.getY(i),arr.getZ(i)]);
  return vertices;
 };
 const fronts=find('Porta lateral davantera'),rears=find('Porta lateral posterior');
 assert.equal(fronts.length,2,name+': manca una porta davantera');
 assert.equal(rears.length,2,name+': manca una porta posterior');
 const windshieldZ=y=>-.91+(y-1.63)*.35/.74;
 for(const door of fronts){
  const v=points(door),upper=v.filter(p=>p[1]>=2.17);
  assert(upper.length,name+': falta muntant A');
  assert(Math.max(...v.map(p=>p[1]))<=2.225,name+': la porta sobresurt pel parabrisa');
  for(const p of upper)assert(p[2]>windshieldZ(p[1])+.045,name+': porta envaeix el parabrisa');
  assert(v.some(p=>Math.abs(p[2]+.76)<1e-4&&Math.abs(p[1]-1.63)<1e-4));
 }
 for(const door of rears){
  const g=door.geometry,a=g.attributes.position,idx=g.index;
  const count=idx?idx.count:a.count;
  // Mostreig interior dels triangles, per detectar intersecció amb el
  // pas de roda i no només comprovar els vèrtexs del contorn.
  for(let i=0;i<count;i+=3){
   const tri=[0,1,2].map(j=>{
    const k=idx?idx.getX(i+j):i+j;
    return {z:a.getZ(k),y:a.getY(k)};
   });
   for(let n=0;n<=10;n++)for(let m=0;m<=10-n;m++){
    const u=n/10,v=m/10,w=1-u-v;
    const z=u*tri[0].z+v*tri[1].z+w*tri[2].z;
    const y=u*tri[0].y+v*tri[1].y+w*tri[2].y;
    assert((z-1.60)**2+(y-.56)**2>(.74-.005)**2,
      name+': porta posterior toca el parafang z='+z.toFixed(2)+', y='+y.toFixed(2));
   }
  }
  const v=points(door);
  assert(v.some(p=>Math.abs(p[2]-.89)<1e-4&&Math.abs(p[1]-.97)<1e-4),
    name+': falta el retall inferior');
  assert(v.some(p=>Math.abs(p[2]-1.33)<1e-4&&Math.abs(p[1]-1.28)<1e-4),
    name+': falta el perfil del parafang');
 }
 const panes=find('Vidre lateral');
 assert.equal(panes.length,4);
 for(const pane of panes)assert(pane.material.transparent&&pane.material.opacity<.3);
 const frontGlass=panes.filter(mesh=>points(mesh).some(p=>p[2]<0));
 assert.equal(frontGlass.length,2);
 for(const pane of frontGlass){
  const v=points(pane),bottom=v.filter(p=>Math.abs(p[1]-1.77)<1e-4),
    top=v.filter(p=>Math.abs(p[1]-2.17)<1e-4);
  assert(Math.min(...top.map(p=>p[2]))>Math.min(...bottom.map(p=>p[2]))+.04,
    name+': vidre davanter lateral sense perfil inclinat');
 }
}
verify(createReferenceVehicle(THREE,'tigr-v1'),'laboratori');
const gaz=prepareGazTigrRuntime(THREE),car=gaz.create();
verify(car,'joc');
assert.equal(car.userData.gazModel,'Tigr-M');
assert.equal(car.userData.wheels.length,4);
assert.equal(car.userData.steeringPivots.length,2);
const restored=new THREE.ObjectLoader().parse(car.toJSON());
verify(restored,'exportació editor');
console.log('PASS GAZ: portes alineades amb parabrisa, retall al parafang i model del joc intacte');
