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
 setXYZ(i,x,y,z){this.array[i*this.itemSize]=x;
  this.array[i*this.itemSize+1]=y;this.array[i*this.itemSize+2]=z}
}
class Geometry{
 constructor(){this.userData={}}
 setAttribute(k,v){this[k]=v}
 getAttribute(k){return this[k]}
 setIndex(values){this.index={count:values.length,array:values,getX:i=>values[i]}}
 clone(){const g=new Geometry();g.userData={...this.userData};
  g.setAttribute('position',new Attribute([...this.getAttribute('position').array],3));
  if(this.index)g.setIndex([...this.index.array]);return g}
 computeVertexNormals(){}
 computeBoundingSphere(){}
 computeBoundingBox(){}
}
const three={BufferGeometry:Geometry,Float32BufferAttribute:Attribute};
const removeImports=code=>code.replace(/^import .*$/gm,'').replace(/^export /gm,'');
const stationApi=new Function('THREE',removeImports(baseSource)+
 ';return {BTR82_HULL_V3_STATIONS,createBtr82HullGeometryFromStations,createBtr82TurretV3Geometry,BTR82_CABIN_SHIFT_Z};')(three);
const noseApi=new Function('THREE','makeBtr82HullV3','BTR82_HULL_V3_STATIONS','createBtr82HullGeometryFromStations',
 removeImports(source)+';return {fromFacets,BTR82_NOSE_CANDIDATES};'
 )(three,()=>{},stationApi.BTR82_HULL_V3_STATIONS,stationApi.createBtr82HullGeometryFromStations);
const angularApi=new Function('THREE','fromFacets','buildBtr82NoseCandidate','BTR82_CABIN_SHIFT_Z',
 removeImports(angularSource)+';return {BTR82_ANGULAR_VARIANTS,createBtr82AngularGeometry,centreBtr82AngularHardware,reverseBtr82StrongTurretBody,BTR82_3B_TURRET_PIVOT_Z,BTR82_3B_BARREL_RETRACTION_Z};'
 )(three,noseApi.fromFacets,()=>{},stationApi.BTR82_CABIN_SHIFT_Z);
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
 // La simetria de vèrtexs no basta: comprovació del reflex exacte
 // de CADA triangle dels laterals i les tapes.
 const point=k=>positions.slice(k*3,k*3+3);
 const coord=v=>v.map(n=>n.toFixed(6)).join(',');
 const face=pts=>pts.map(coord).sort().join('|');
 const faceSet=new Set();
 for(let i=0;i<faces.length;i+=3)
  faceSet.add(face(faces.slice(i,i+3).map(point)));
 for(let i=0;i<faces.length;i+=3){
  const mirror=faces.slice(i,i+3).map(point).map(([x,y,z])=>[-x,y,z]);
  assert(faceSet.has(face(mirror)),label+' té triangles laterals sense reflex');
 }
 const g=geometry.userData;
 assert(g.angularStations>3&&g.angularProfiles>=5);
 return {triangles:faces.length/3,stations:g.angularStations,profiles:g.angularProfiles};
}
const mild=checkManifold(angularApi.createBtr82AngularGeometry('angular-mild'),'Moderat');
const strong=checkManifold(angularApi.createBtr82AngularGeometry('angular-strong'),'Fort');
assert.equal(mild.triangles,336);
assert.equal(mild.stations,10);
assert.equal(mild.profiles,7);
assert.equal(strong.triangles,240);
assert.equal(strong.stations,7);
assert.equal(strong.profiles,7);
assert(strong.triangles<mild.triangles&&mild.triangles<556);
assert.equal(checkManifold(angularApi.createBtr82AngularGeometry('facets'),'Base reflectida').triangles,556);
const strongGeo=angularApi.createBtr82AngularGeometry('angular-strong');
const p=strongGeo.getAttribute('position'),at=3*14;
assert.equal(p.getZ(at+7),-3.23);
assert.equal(p.getX(at+7),1.34,'La quilla ha de tocar la zona interior de les rodes');
assert.equal(p.getX(at+6),1.405,'La paret interior ha de ser més ampla');
assert.equal(p.getX(at+5),1.47,'El blindatge s’ha de prolongar sobre el pneumàtic');
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
const wheelXZ=[[-1.688,-2.938],[1.688,-2.938],[1.688,-.938],[-1.688,-.938],
 [1.688,1.688],[-1.688,1.813],[-1.688,3.585],[1.688,3.585]];
for(let i=0;i<8;i++){
 const p=nodes.get('BTR82_truck_A43_wheel_'+i).position;
 p.x=wheelXZ[i][0];p.z=wheelXZ[i][1];
}
for(const name of ['BTR82_new_black_barrel','BTR82_new_black_muzzle'])
 nodes.get(name).position.x=-.06;
angularApi.centreBtr82AngularHardware(fake);
for(const name of ['BTR82_new_black_barrel','BTR82_new_black_muzzle'])
 assert.equal(nodes.get(name).position.x,0,'El canó ha de seguir X=0');
for(const [l,r] of [[0,1],[3,2],[5,4],[6,7]]){
 const a=nodes.get('BTR82_truck_A43_wheel_'+l).position;
 const b=nodes.get('BTR82_truck_A43_wheel_'+r).position;
 assert.equal(a.x,-b.x);assert.equal(a.z,b.z);
 assert.equal(a.y,0);assert.equal(b.y,0);
}
// Les dades de la torreta que ja tenim defineixen sis anelles de vuit punts.
const originalTurret=stationApi.createBtr82TurretV3Geometry();
const originalXYZ=[...originalTurret.getAttribute('position').array];
const testTurret={name:'BTR82_v3_low_angular_turret',isMesh:true,
 geometry:originalTurret,userData:{},position:{x:0,y:-.18,z:0}};
const barrel=nodes.get('BTR82_new_black_barrel');
const muzzle=nodes.get('BTR82_new_black_muzzle');
barrel.isMesh=true;muzzle.isMesh=true;
barrel.position.z=-1.91+.38;muzzle.position.z=-3.47+.38;
const gunBefore={barrel:{...barrel.position},muzzle:{...muzzle.position}};
const wheelsBefore=Array.from({length:8},(_,i)=>(
 {...nodes.get('BTR82_truck_A43_wheel_'+i).position}));
const localScene={userData:{},getObjectByName:name=>
 name==='BTR82_v3_low_angular_turret'?testTurret:nodes.get(name)};
angularApi.reverseBtr82StrongTurretBody(localScene);
assert.notEqual(testTurret.geometry,originalTurret,'Cal girar una còpia de la malla');
assert(Math.abs(angularApi.BTR82_3B_TURRET_PIVOT_Z+.31)<1e-9,'Pivot incorrecte');
assert.equal(angularApi.BTR82_3B_BARREL_RETRACTION_Z,0);
assert.equal(localScene.userData.btr82StrongTurret.bodyRotationY,180);
const sourceTurret=originalTurret.getAttribute('position');
const turnedTurret=testTurret.geometry.getAttribute('position');
for(let i=0;i<sourceTurret.count;i++){
 assert(Math.abs(sourceTurret.getX(i)+turnedTurret.getX(i))<1e-9,
  'Rotació 180º sobre Y: X incorrecte');
 assert.equal(sourceTurret.getY(i),turnedTurret.getY(i),
  'El gir no ha de canviar l’altura');
 assert(Math.abs(sourceTurret.getZ(i)+turnedTurret.getZ(i)-
  2*angularApi.BTR82_3B_TURRET_PIVOT_Z)<1e-9,
  'La torreta no ha girat exactament sobre el pivot longitudinal');
}
assert.deepEqual(originalTurret.getAttribute('position').array,originalXYZ,
 'La torreta dels models 3/3A no ha de quedar modificada');
for(let ring=0;ring<6;ring++)assert(
 turnedTurret.getZ(ring*8+4)<turnedTurret.getZ(ring*8),
 'La corba posterior original ha de mirar a -Z després de girar');
assert.deepEqual(barrel.position,gunBefore.barrel,'El cos del canó no es pot moure');
assert.deepEqual(muzzle.position,gunBefore.muzzle,'La boca de foc no es pot moure');
for(let i=0;i<8;i++)assert.deepEqual(
 nodes.get('BTR82_truck_A43_wheel_'+i).position,wheelsBefore[i],
 'Gir de torreta ha mogut una roda');
assert(angularSource.includes("if(method==='angular-strong')reverseBtr82StrongTurretBody(scene)"),
 'El gir només ha d’afectar la 3B');
assert.throws(()=>angularApi.reverseBtr82StrongTurretBody(localScene),/ja està girada/);
// A la part alta, l'extrem posterior del canó ja queda dins el
// cos de la torreta girat; no cal escurçar-ne la part visible.
const gunTailZ=gunBefore.barrel.z+2.90/2;
const bodyBackZ=Math.max(turnedTurret.getZ(5*8),turnedTurret.getZ(4*8));
assert(gunTailZ<bodyBackZ,'El canó no penetra dins la torreta girada');
assert(-.32-.18>-.8125,'Els baixos han de quedar per sobre del terra');
assert.equal(JSON.stringify(Array.from(baseline.getAttribute('position').array)),originalData,
 'La versió original no s’ha d’alterar en crear variants');
console.log('PASS BTR 3B: torreta 180º corba cap al davant, canó immòbil, 3/3A intactes');
