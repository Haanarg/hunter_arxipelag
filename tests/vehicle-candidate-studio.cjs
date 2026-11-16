// Minimal deploy contract: current catalog, published asset integrity and lab revision.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
(async()=>{
 const {CATALOG}=await import('../src/vehicle-candidate-catalog.mjs');
 const {vehicleSpecs}=await import('../src/vehicle-specs.mjs');
 const ids=CATALOG.map(c=>c.id);
 assert.equal(new Set(ids).size,ids.length,'Duplicate catalog id');
 assert.deepEqual(CATALOG.filter(c=>!c.experimental).map(c=>c.id).sort(),Object.keys(vehicleSpecs.scales).sort());
 for(const c of CATALOG){assert.equal(typeof c.validated,'boolean');assert(Array.isArray(c.options));}
 const dir=path.join(root,'assets/vehicle-candidates');
 const manifest=JSON.parse(read('assets/vehicle-candidates/manifest.json'));
 const records=Object.values(manifest.models).flat();
 assert.equal(manifest.savedModels,records.length);
 assert.equal(manifest.savedBytes,records.reduce((n,r)=>n+r.bytes,0));
 const listed=records.map(r=>{
  assert(typeof r.file==='string'&&!path.isAbsolute(r.file)&&!r.file.split(/[\\/]/).includes('..'));
  assert.equal(fs.statSync(path.join(dir,r.file)).size,r.bytes,'Wrong size: '+r.file);
  return r.file;
 });
 assert.equal(new Set(listed).size,listed.length);
 const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):/\.glb$/i.test(e.name)?[path.relative(dir,p).split(path.sep).join('/')]:[];});
 assert.deepEqual(walk(dir).sort(),listed.sort(),'Unlisted or missing candidate GLB');
 const revision=JSON.parse(read('assets/vehicle-candidates/lab-revision.json')).revision;
 assert(typeof revision==='string'&&revision.length>0);
 const html=read('vehicles-externs-proves.html'),entry=read('src/vehicles-externs-proves.mjs');
 assert(read('src/vehicle-live-editor.mjs').includes("LAB_REVISION='"+revision+"'"));
 assert(html.includes('src/vehicles-externs-proves.mjs?rev='+revision));
 for(const module of ['vehicle-live-editor.mjs','vehicle-candidate-catalog.mjs'])assert(entry.includes(module+'?rev='+revision));
 for(const id of ['liveEditor','vehicleList','humanList','humanMotion','liveClearResolved'])assert(html.includes('id="'+id+'"'),'Missing lab control '+id);
 // Parse the active lab entry and helpers, not tests of retired vehicles.
 for(const file of ['vehicles-externs-proves.mjs','vehicle-candidate-catalog.mjs','vehicle-live-editor.mjs','vehicle-live-geometry.mjs','vehicle-annotation-editor.mjs','vehicle-hole-brush.mjs','human-proposals.mjs','human-model-catalog.mjs','human-current-models.mjs','human-lab-evidence.mjs','human-lab-evidence-ui.mjs'])execFileSync(process.execPath,['--check',path.join(root,'src',file)],{stdio:'inherit'});
 console.log('PASS lab: current fleet, asset manifest, revision and syntax');
})().catch(e=>{console.error(e);process.exitCode=1;});
