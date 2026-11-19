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
 // The real in-game factory is also imported by the editor. Keep runtime dependencies.
 const {vehicleModels}=await import('../src/vehicle-model-core.mjs');
 const THREE=await import('../vendor/three-r186.module.mjs');
 const {playerBatching}=await import('../src/player-batching-core.mjs');
 const factory=vehicleModels.createFactory(THREE,{
  box:(parent,w,h,d,color)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));parent.add(mesh);return mesh},
  material:color=>new THREE.MeshStandardMaterial({color}),
  shadows:false,batching:playerBatching
 });
 const hover=factory('hover');
 assert.equal(hover.userData.hovercraftModel,'D-model-3','Approved hovercraft must be available in the actual game factory');
 
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
 const html=read('proves.html'),entry=read('src/vehicles-externs-proves.mjs');
 assert(read('src/vehicle-live-editor.mjs').includes("LAB_REVISION='"+revision+"'"));
 assert(html.includes('src/vehicles-externs-proves.mjs?rev='+revision));
 for(const module of ['vehicle-live-editor.mjs','vehicle-candidate-catalog.mjs'])assert(entry.includes(module+'?rev='+revision));
 for(const id of ['liveEditor','vehicleList','humanList','humanMotion','liveClearResolved','sectionTabs','sectionPreview','sectionFrame'])assert(html.includes('id="'+id+'"'),'Missing lab control '+id);
 // Parse the active lab entry and helpers, not tests of retired vehicles.
 for(const file of ['proves-hub.mjs','vehicles-externs-proves.mjs','vehicle-candidate-catalog.mjs','vehicle-live-editor.mjs','vehicle-live-geometry.mjs','vehicle-annotation-editor.mjs','vehicle-hole-brush.mjs','human-proposals.mjs','human-model-catalog.mjs','human-current-models.mjs','human-lab-evidence.mjs','human-lab-evidence-ui.mjs','compound-preview.mjs','compound-concepts.mjs'])execFileSync(process.execPath,['--check',path.join(root,'src',file)],{stdio:'inherit'});
 // Parse the inline startup module as well; broken dynamic imports must block deploy.
 const inline=[...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 assert.equal(inline.length,1,'Exactly one inline editor bootstrap expected');
 execFileSync(process.execPath,['--check','--input-type=module'],{input:inline[0],stdio:['pipe','pipe','pipe']});
 // Permet paràmetres addicionals de cache-busting després de la revisió
 // aprovada, sense perdre el contracte del laboratori.
 assert(html.includes("import('./src/vehicles-externs-proves.mjs?rev="+revision),
  'El mòdul de l’editor s’importa amb la revisió aprovada');
 // The compound viewer is standalone, NOT bootstrapped by the game's classic bridges.
 const compoundHtml=read('compounds-preview.html');
 assert(!compoundHtml.includes('src/vehicles.js')&&!compoundHtml.includes('src/player-model.js')&&!compoundHtml.includes('src/palette.js'));
 const compoundEntry=read('src/compound-preview.mjs');
 const compoundFactory=read('src/compound-concepts.mjs');
 assert(compoundEntry.includes('window.HUNTER_PLAYER_MODEL=playerModel;'));
 assert(compoundEntry.includes('window.HUNTER_PALETTE=palette;'));
 assert(compoundEntry.includes('window.HUNTER_PLAYER_BATCH=playerBatching;'));
 assert(compoundFactory.includes('vehicleModels.createFactory(T,'));
 assert(!compoundFactory.includes('window.HUNTER_VEHICLES.createFactory('));
 // These previews have their own revisions; changing the human lab must not break their cache identifiers.
 assert(/compound-preview\.mjs\?rev=[\w-]+/.test(compoundHtml));
 assert(/compound-concepts\.mjs\?rev=[\w-]+/.test(compoundEntry));
 const modelEditor=read('src/vehicles-externs-proves.mjs');
 assert(/renderer\.setScissorTest\(false\);\s*renderer\.clear\(true,true,true\);\s*renderer\.setScissorTest\(true\);/.test(modelEditor),'The full WebGL canvas must be cleared before each clipped frame');
 assert(html.includes('body[data-editor-kind=""] #draw{display:none!important}'));
 const {runCompoundPreviewSmoke}=await import('./compound-preview-smoke.mjs');
 runCompoundPreviewSmoke();
 const hub=await import('../src/proves-hub.mjs');
 assert.deepEqual(hub.SECTIONS.map(s=>s.id),['characters','vehicles','nature','animations','compounds']);
 for(const section of Object.values(hub.SECTION_TOOLS))for(const tool of section)if(tool.url)assert(fs.existsSync(path.join(root,tool.url.split('?')[0])),'Missing preview: '+tool.url);
 assert(!html.includes('knifeAttackConcepts')&&!html.includes('createKnifePoseConcept'));
 console.log('PASS lab: 5 sections, live editor, preview pages, asset manifest, revision and syntax');
})().catch(e=>{console.error(e);process.exitCode=1;});
