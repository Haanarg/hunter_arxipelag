// Test específic del comparador de sis morros (no llança GitHub Actions).
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('btr82-morros-candidats.html');
const viewer=read('src/btr82-six-nose-lab.mjs');
const impl=read('src/btr82-nose-candidates.mjs');
const hull=read('src/btr82-hull-v3.mjs'),studio=read('src/btr82-lod-studio.mjs');
assert(html.includes('Sis mètodes')||html.includes('sis candidats'));
assert(html.includes('id="grid"')&&html.includes('data-view="bottom"'));
assert(html.includes('id="reference"')&&html.includes('id="zoomIn"'));
assert(viewer.includes("new THREE.WebGLRenderer")&&viewer.includes('renderer.setScissor'));
assert(viewer.includes('BTR82_NOSE_CANDIDATES')&&viewer.includes('buildBtr82NoseCandidate'));
assert(studio.includes('export function makeBtr82LabBaseline'));
assert(hull.includes('export function createBtr82HullGeometryFromStations'));
assert(read('vehicles-externs-proves.html').includes('href="btr82-morros-candidats.html"'));
const script=impl.replace(/^import .*$/gm,'').replace(/^export /gm,'');
const core=hull.replace(/^import .*$/gm,'').replace(/^export /gm,'');
const stations=new Function('THREE',core+';return BTR82_HULL_V3_STATIONS;')({});
const api=new Function('THREE','makeBtr82HullV3','BTR82_HULL_V3_STATIONS','createBtr82HullGeometryFromStations',
 script+';return {BTR82_NOSE_CANDIDATES,fromBottom,fromFacets,fromSilhouettes,fromSections,btr82SliceAtZ,clipBtr82Triangles};'
 )({},()=>{},stations,()=>{});
assert.equal(api.BTR82_NOSE_CANDIDATES.length,6);
assert.equal(new Set(api.BTR82_NOSE_CANDIDATES.map(x=>x.id)).size,6);
assert.deepEqual(api.BTR82_NOSE_CANDIDATES.map(x=>x.id),
 ['current','bottom','facets','silhouette','slices','original']);
function wellOrdered(rows){
 assert(rows.length>=3);
 for(let i=1;i<rows.length;i++)assert(rows[i].z>rows[i-1].z,'Estacions Z desordenades');
 for(const r of rows)for(const [name,points] of Object.entries(r)){
  if(name==='z')continue;
  assert.equal(points.length,3);
  assert(points.every(Number.isFinite),'Coordenades incorrectes a '+name);
 }
}
wellOrdered(api.fromBottom());wellOrdered(api.fromFacets());
// Prisma sintètic per comprovar matemàticament les seccions i el retall.
const triangles=[];
for(const y of [.20,1.45]){
 triangles.push([[-1.2,y,-5.5],[1.2,y,-5.5],[1.2,y,-3.4]]);
 triangles.push([[-1.2,y,-5.5],[1.2,y,-3.4],[-1.2,y,-3.4]]);
}
assert(api.btr82SliceAtZ(triangles,-4.8).length>=2);
wellOrdered(api.fromSilhouettes(triangles));wellOrdered(api.fromSections(triangles));
assert(api.clipBtr82Triangles(triangles,-4.5,true).length>0);
assert(api.clipBtr82Triangles(triangles,-4.5,false).length>0);
assert(impl.includes("openSeam:true"),'La costura del candidat 6 ha de constar oberta');
for(const file of ['src/btr82-nose-candidates.mjs','src/btr82-six-nose-lab.mjs','src/btr82-hull-v3.mjs'])
 new Function(read(file).replace(/^import .*$/gm,'').replace(/^export /gm,''));
console.log('PASS laboratori sis morros: 6 mètodes, seccions, retalls i visor sincronitzat');
