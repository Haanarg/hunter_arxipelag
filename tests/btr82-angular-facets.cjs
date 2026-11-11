// Test focalitzat del model 3 amb dos graus reals de simplificació.
// No s'han de llançar GitHub Actions per canvis de laboratori.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const baseSource=read('src/btr82-hull-v3.mjs');
const source=read('src/btr82-nose-candidates.mjs');
const angularSource=read('src/btr82-angular-facets.mjs');
const viewer=read('src/btr82-six-nose-lab.mjs');
const six=read('btr82-morros-candidats.html'),page=read('btr82-model3-angular.html');
const lab=read('vehicles-externs-proves.html');
const wf=read('.github/workflows/rebuild-runtime.yml');
assert(page.includes('data-btr82-angular="true"'));
assert(page.includes('Model 3 · dues variants més angulars'));
assert(page.includes('href="btr82-morros-candidats.html"'));
assert(six.includes('href="btr82-model3-angular.html"'));
assert(lab.includes('href="btr82-model3-angular.html"'));
assert(viewer.includes('angularMode?BTR82_ANGULAR_VARIANTS:BTR82_NOSE_CANDIDATES'));
assert(viewer.includes('buildBtr82AngularCandidate(method.id,baseline)'));
assert(!/^\s*push:/m.test(wf),'Actions ha de continuar manual');
assert(/workflow_dispatch:/.test(wf));
class Attribute{
 constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize}
 getX(i){return this.array[i*this.itemSize]}
 getY(i){return this.array[i*this.itemSize+1]}
 getZ(i){return this.array[i*this.itemSize+2]}
}
class Geometry{
 constructor(){this.userData={}}
 setAttribute(k,v){this[k]=v}
 getAttribute(k){return this[k]}
 setIndex(values){this.index={count:values.length,array:values,getX:i=>values[i]}}
 computeVertexNormals(){}
 computeBoundingSphere(){}
 computeBoundingBox(){}
}
const three={BufferGeometry:Geometry,Float32BufferAttribute:Attribute};
const removeImports=code=>code.replace(/^import .*$/gm,'').replace(/^export /gm,'');
const stationApi=new Function('THREE',removeImports(baseSource)+
 ';return {BTR82_HULL_V3_STATIONS,createBtr82HullGeometryFromStations};')(three);
const noseApi=new Function('THREE','makeBtr82HullV3','BTR82_HULL_V3_STATIONS','createBtr82HullGeometryFromStations',
 removeImports(source)+';return {fromFacets,BTR82_NOSE_CANDIDATES};'
 )(three,()=>{},stationApi.BTR82_HULL_V3_STATIONS,stationApi.createBtr82HullGeometryFromStations);
const angularApi=new Function('THREE','fromFacets','buildBtr82NoseCandidate',
 removeImports(angularSource)+';return {BTR82_ANGULAR_VARIANTS,createBtr82AngularGeometry};'
 )(three,noseApi.fromFacets,()=>{});
assert.equal(noseApi.BTR82_NOSE_CANDIDATES.length,6,'Els sis experiments originals han de romandre');
assert.deepEqual(angularApi.BTR82_ANGULAR_VARIANTS.map(a=>a.id),
 ['facets','angular-mild','angular-strong']);
const baseline=stationApi.createBtr82HullGeometryFromStations(noseApi.fromFacets());
assert.equal(baseline.index.count/3,508,'No s’ha de canviar el model 3 de partida');
const originalData=JSON.stringify(Array.from(baseline.getAttribute('position').array));
function checkManifold(geometry,label){
 const positions=geometry.getAttribute('position').array,faces=geometry.index.array;
 assert(geometry.index.count>=100);
 const segments=new Map(),mirrorSet=new Set();
 const coordinate=v=>v.map(x=>x.toFixed(6)).join(':');
 for(let i=0;i<positions.length;i+=3)
  mirrorSet.add(coordinate(positions.slice(i,i+3)));
 let volume=0,minArea=Infinity;
 for(let i=0;i<faces.length;i+=3){
  const ids=faces.slice(i,i+3);
  for(let j=0;j<3;j++){
   const edge=[ids[j],ids[(j+1)%3]].sort((a,b)=>a-b).join(':');
   segments.set(edge,(segments.get(edge)||0)+1);
  }
  const [p,q,r]=ids.map(k=>positions.slice(k*3,k*3+3));
  const u=q.map((x,j)=>x-p[j]),v=r.map((x,j)=>x-p[j]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const area=Math.hypot(...n)/2;
  minArea=Math.min(minArea,area);
  volume+=(p[0]*n[0]+p[1]*n[1]+p[2]*n[2])/6;
 }
 assert([...segments.values()].every(count=>count===2),label+' ha de ser una malla tancada');
 assert(minArea>.0001,label+' té triangles degenerats');
 assert(volume>40,label+' ha de tenir volum positiu');
 for(let i=0;i<positions.length;i+=3){
  const [x,y,z]=positions.slice(i,i+3);
  assert(mirrorSet.has(coordinate([-x,y,z])),label+' ha de ser simètric només esquerra/dreta');
 }
 assert(positions.every(Number.isFinite),label+' té coordenades no finites');
 const g=geometry.userData;
 assert(g.angularStations>3&&g.angularProfiles>=5);
 return {triangles:faces.length/3,stations:g.angularStations,profiles:g.angularProfiles};
}
const mild=checkManifold(angularApi.createBtr82AngularGeometry('angular-mild'),'Moderat');
const strong=checkManifold(angularApi.createBtr82AngularGeometry('angular-strong'),'Fort');
assert.equal(mild.triangles,296);
assert.equal(mild.stations,10);
assert.equal(mild.profiles,7);
assert.equal(strong.triangles,212);
assert.equal(strong.stations,7);
assert.equal(strong.profiles,7);
assert(strong.triangles<mild.triangles&&mild.triangles<508);
const strongGeo=angularApi.createBtr82AngularGeometry('angular-strong');
const p=strongGeo.getAttribute('position'),at=3*14;
assert.equal(p.getZ(at+7),-3.23);
assert.equal(p.getX(at+7),.98,'La quilla ha de ser ampla');
assert(p.getX(at+4)>p.getX(at+5)&&p.getX(at+5)>p.getX(at+6),
 'Cal preservar la lleixa de les rodes i la paret interior');
assert(Math.abs(p.getY(at+4)-p.getY(at+5))<.04,
 'La lleixa protectora ha de ser quasi plana');
assert(p.getY(at+6)-p.getY(at+7)>.2,'El ventre ha de tenir una cantonada marcada');
const lower=new Function('THREE','makeBtr82HullV3','BTR82_HULL_V3_STATIONS',
 'createBtr82HullGeometryFromStations',removeImports(source)+
 ';return {lowerBtr82LabBody,BTR82_LAB_BODY_DROP};'
 )(three,()=>{},stationApi.BTR82_HULL_V3_STATIONS,()=>{});
assert.equal(lower.BTR82_LAB_BODY_DROP,.18);
const nodes=new Map();
for(const name of ['BTR82_v3_lowered_centre_hull','BTR82_v3_low_angular_turret',
 'BTR82_new_black_barrel','BTR82_new_black_muzzle'])
 nodes.set(name,{isMesh:true,position:{y:1}});
for(let i=0;i<8;i++)nodes.set('BTR82_truck_A43_wheel_'+i,{position:{y:0}});
const fake={userData:{},getObjectByName:name=>nodes.get(name)};
assert.equal(lower.lowerBtr82LabBody(fake),.18);
for(const name of ['BTR82_v3_lowered_centre_hull','BTR82_v3_low_angular_turret',
 'BTR82_new_black_barrel','BTR82_new_black_muzzle'])
 assert(Math.abs(nodes.get(name).position.y-.82)<1e-9,'Cos/torreta/canó desalineats');
for(let i=0;i<8;i++)assert.equal(nodes.get('BTR82_truck_A43_wheel_'+i).position.y,0);
assert.throws(()=>lower.lowerBtr82LabBody(fake),/Ja s’ha abaixat/);
assert(-.32-.18>-.8125,'Els baixos han de quedar per sobre del terra');
assert.equal(JSON.stringify(Array.from(baseline.getAttribute('position').array)),originalData,
 'La versió original no s’ha d’alterar en crear variants');
console.log('PASS angular BTR 3B: 508 -> 296 / 212 triangles; quilla ampla, escaló i carrosseria −18 cm');
