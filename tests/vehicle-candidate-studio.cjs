// Integritat de la carpeta de candidats, sense WebGL ni xarxa.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('assets/vehicle-candidates/manifest.json'));
const excluded=['camio','barca_rems','windsurf','moto_aquatica','moto','heli','heli_combat'];
const catalog=read('src/vehicle-candidate-catalog.mjs');
const studio=read('src/vehicles-externs-proves.mjs');
const html=read('vehicles-externs-proves.html');
const types=[...catalog.matchAll(/\{id:'([^']+)'/g)].map(m=>m[1]);
assert.equal(types.length,7,'Catàleg: set vehicles pendents després d’aprovar Huey i Apache');
for(const id of excluded){
 assert(!types.includes(id),'Vehicle definitivament decidit encara al catàleg: '+id);
 assert(!(id in manifest.models),'Vehicle acceptat encara al manifest: '+id);
 assert(!fs.existsSync(path.join(root,'assets/vehicle-candidates',id)),'Carpeta de GLB rebutjats encara present: '+id);
}
for(const id of ['bici','cotxe_civil','llanxa','ferry'])assert(types.includes(id));
assert(fs.existsSync(path.join(root,'src/jet-ski-25-geometry.mjs')),'Falta el model de moto aquàtica del joc');
assert(fs.existsSync(path.join(root,'src/streetfighter-25-geometry.mjs')),'Falta el model definitiu Naked streetfighter');
assert(!studio.includes('FEATURED'),'El banc de proves no ha de calcular LOD de motos acceptades');
assert(!studio.includes('SimplifyModifier'),'No cal simplificar els candidats acceptats al banc');
assert(!html.includes('id="steeringControl"'),'La pestanya de moto i els seus controls s’han retirat');
assert(html.includes('7 tipus de vehicles'),'El text del catàleg ha d’estar actualitzat');
const files=Object.values(manifest.models).flat();
assert.equal(files.length,11,'Els candidats CC0 locals vigents són onze; el BTR-82 es compta a part');
assert.deepEqual(manifest.models.tanc,[],'Els antics tancs genèrics han desaparegut');
assert.deepEqual(manifest.models.tanqueta,[],'Els antics APC genèrics han desaparegut');
assert(manifest.limits.maxFileBytes>=32*1024*1024,'Cal admetre GLB més grans per als blindats');
for(const id of ['tanc','tanqueta']){
 const refs=manifest.externalModels?.[id];
 assert.equal(refs?.length,id==='tanqueta'?1:3,'El tanc conserva tres candidats; la tanqueta només el BTR-82 aprovat');
 assert(refs.every(r=>r.provider==='sketchfab'&&/^[0-9a-f]{32}$/.test(r.modelId)
  &&r.license.startsWith('CC BY')&&/^https:\/\/sketchfab.com\/3d-models\//.test(r.url)
  &&r.triangles>1000),'Les fonts han de ser reals i amb llicència visible');
 for(const oldName of ['main-battle-tank','light-tank','self-propelled-gun','tracked-apc','wheeled-apc','armoured-car'])
  assert(!refs.some(r=>r.title.toLowerCase().includes(oldName)),'No conservar candidats genèrics');
 if(id==='tanc')assert(!fs.existsSync(path.join(root,'assets/vehicle-candidates',id)),'Queden antics GLB genèrics del tanc');
}
assert(studio.includes("entry.provider==='sketchfab'")&&studio.includes("frame.src='https://sketchfab.com/models/'"),
 'El preview ha de mostrar els models reals amb el visor oficial Sketchfab');
assert(studio.includes('slot.sourceFrame.remove()'),'El visor anterior s’ha de destruir quan es canvia de categoria');
assert(html.includes('M1A1 Abrams')&&html.includes('BTR-82'),
 'Cal explicar el BTR-82 seleccionat al preview');
assert.equal(manifest.selectedForLod?.tanqueta?.activePreviewModels,2); // selecció històrica del manifest, no les tres targetes del taller
assert.equal(manifest.selectedForLod.tanqueta.original.triangles,5371);
assert.equal(manifest.selectedForLod.tanqueta.selected.triangles,4581);
assert.equal(manifest.selectedForLod.tanqueta.selected.meshes,25);
assert.equal(manifest.externalModels.tanqueta[0]?.modelId,'6226acae68424d99bf03882b245ff7c5');
assert(!catalog.includes('fe28759be4914e4a9ea52d73aa503a4e'));
assert(!catalog.includes('3a813f5520974d21b3b3bba52e04a7d9'));
const btr=read('src/btr82-lod-studio.mjs');
assert(btr.includes("BASE_FILE='btr82-base-100.glb'")&&btr.includes('withTruckWheels')&&btr.includes('createTruckModel')&&btr.includes('replaceBarrelWithCylinders')&&btr.includes('BTR82_new_black_muzzle'));
assert(btr.includes('SimplifyModifier')&&btr.includes('reduceSurfaces')&&btr.includes('installFourHeadlights'));
assert(!btr.includes('sealArmourPanels')&&!btr.includes('BTR82_sealed_side_cover_')&&!btr.includes('BTR82_unified_rear_upper_cover')&&!btr.includes('BTR82_unified_rear_underside'), 'No han de tornar els tancaments artificials');
assert(btr.includes("addCylinder('BTR82_new_black_barrel',.085,2.90,-1.91)"));
assert(btr.includes('mesh.position.set(x,1.56,z)'),'Els fars han de tornar a la posició anterior');
assert.equal((btr.match(/slot:[0-4],level:[0-4]/g)||[]).length,3,'Comparativa: original, v3 i v2');
assert(btr.includes('LOD_RATIOS=[.18,.22,.27,.32]'),'El low-poly ha de conservar les reduccions acumulatives');
assert(!btr.includes('repoPrecomputedLod'));
assert(studio.includes("const btrStudy=config.id==='tanqueta'"));
assert(studio.includes("slot.outer.hidden=btrStudy?slots.indexOf(slot)>2:slots.indexOf(slot)>3"),
 'El BTR-82 mostra tres panells, sense modificar els altres vehicles');
assert(html.includes('#grid.btr-study{grid-template-columns:repeat(3'));
const hullV2=read('src/btr82-hull-v2.mjs');
assert(hullV2.includes('makeBtr82HullV2')&&hullV2.includes('BTR82_HULL_V2_STATIONS'));
const hullV3=read('src/btr82-hull-v3.mjs');
assert(hullV3.includes('BTR82_HULL_V3_STATIONS')&&hullV3.includes('createBtr82HullV3Geometry'));
assert(hullV3.includes('makeBtr82HullV3')&&hullV3.includes('BTR82_v3_lowered_centre_hull'));
assert(hullV3.includes('BTR82_v3_low_angular_turret')&&hullV3.includes('preserved(mesh)'));
assert(hullV3.includes('hullBottom:.15')&&hullV3.includes('roofHeight:1.68'));
assert(hullV3.includes('wheels!==8||barrel!==2'),'La v3 manté rodes i canó originals');
assert(btr.includes('const clean=makeBtr82HullV3(baseline)'));
assert(btr.includes('const previous=makeBtr82HullV2(baseline)'));
assert(btr.includes('present(PASSES[1],clean,local)')&&btr.includes('present(PASSES[2],previous,local)'));
assert(!btr.includes('makeBtr82HullV1'),'La v1 no es carrega');
const currentRender=btr.slice(btr.indexOf('async function renderFromSource'),btr.indexOf('async function load'));
assert(html.includes('casc v3')&&html.includes('tres targetes'));
assert(html.includes('ventre central')||html.includes('part central inferior'));


assert(html.includes('Editor de marques 3D')&&html.includes('btrSelectGroup')&&html.includes('btrCopySelection')&&html.includes('btrSelectMode'));
assert(html.includes('Tapar forats (clic)')&&html.includes('Eliminar peces'));
assert(html.includes('Verd')&&html.includes('blau')&&html.includes('Desfer última acció'));
assert(html.includes('btr82-central-belly-hull-v3'));
assert(!html.includes('casc v1'));
assert(html.includes('part central inferior')&&html.includes('casc v2'));
assert(html.includes('tres targetes'));

assert(html.includes('Pintar xapa (arrossegar)')&&html.includes('id="btrMirrorSurfacePaint"'));
assert(html.includes('Simetria de la xapa (X)'));
const armourPaint=read('src/vehicle-surface-paint.mjs');
assert(armourPaint.includes('surfacePaintSample')&&armourPaint.includes('createSurfacePaintStroke')&&armourPaint.includes('appendSurfacePaint'));
assert(armourPaint.includes('MAX_BRIDGE=.58')&&armourPaint.includes('MAX_DEPTH_JUMP=.36'));
assert(armourPaint.includes('mirror')&&armourPaint.includes('mirrored(a)')&&armourPaint.includes('mirrored(b)'));
assert(armourPaint.includes('stroke.mesh.geometry=geo;old.dispose()'));
assert(studio.includes('vehicle-annotation-editor.mjs?rev=surface-paint-v12'));

assert(html.includes('id="btrLargeHoleMode"')&&html.includes('Forats grans (contorn tancat)'));
assert(html.includes('max="2.50"'));
assert(studio.includes('vehicle-annotation-editor.mjs?rev=surface-paint-v12'));
assert(html.includes('id="btrRepairLiveStatus"')&&html.includes('id="btrRepairLiveCount"'));
assert(html.includes('superfície exacta')&&html.includes('el comptador de triangles'));
assert(studio.includes('btr82-central-belly-hull-v3'));
assert(!studio.includes('btr82-angular-low-hull-v2'));
assert(!currentRender.includes('reduceSurfaces('),'La v2 no ha de passar per SimplifyModifier');
const confirmed=read('src/btr82-confirmed-repairs.mjs');
assert(confirmed.includes('BTR82_CONFIRMED_REPAIRS')&&confirmed.includes('applyBtr82ConfirmedRepairs'));
assert(!currentRender.includes('applyBtr82ConfirmedRepairs('),'La v2 no hereta reparacions antigues');

assert(btr.includes("BTR82_VERSION='btr82-central-belly-hull-v3'"));
const holeBrush=read('src/vehicle-hole-brush.mjs');
assert(holeBrush.includes('getHoleBrushTarget')&&holeBrush.includes('closeHoleUnderBrush'));
assert(holeBrush.includes('boundaries(mesh)')&&holeBrush.includes('ShapeUtils.triangulateShape'));
assert(holeBrush.includes('e.count!==1')&&holeBrush.includes('maxPlanar>(large?.20:.065)'));
assert(holeBrush.includes('getHoleBrushTarget(mesh,worldPoint,maxRadius,options={})'));
assert(holeBrush.includes('maxSpan=large?')&&holeBrush.includes('nearest=Math.min(nearest'));
assert(selector.includes('btrLargeHoleMode')&&selector.includes('large:largeHole?.checked===true'));

assert(holeBrush.includes('geo.setIndex(indices)')&&holeBrush.includes('geo.computeVertexNormals()'));

assert(!html.includes('id="btrPartTool" class="btr-part-tool" hidden'),'L\'editor ha de ser visible per defecte');
assert(html.includes('id="pan-up"')&&html.includes('id="pan-down"'),'Calen botons de navegació vertical');
assert(studio.includes('zoom=Math.max(.025')&&studio.includes('const distance=Math.max(.35,size*1.85*zoom+.35)'), 'Cal zoom proper sense límit fix de 3 metres');
assert(studio.includes("document.querySelector('#pan-up')")&&studio.includes("document.querySelector('#pan-down')"), 'Controls verticals connectats');
assert(studio.includes("if(e.shiftKey||(e.buttons&2))")&&studio.includes('lookY+=(e.clientY-old[1])*distance*.0017'), 'Pan vertical amb Shift o botó dret');
assert(studio.includes('lookY=defaultLookY'), 'Enquadra també restaura el pan');
assert(studio.includes('createVehicleAnnotationEditor')&&studio.includes('vehicleEditor.begin(slot,e)')&&studio.includes('vehicleEditor.move(slot,e)'));
assert(studio.includes("document.querySelector('#btrPartTool').hidden=false"));
const repair=read('src/btr82-rear-seam-repair.mjs');
assert(repair.includes('repairMarkedRearSeams')&&repair.includes('hull_material_0')&&repair.includes('groups.push'));
assert(repair.includes('[-.581,1.813,5.497]')&&repair.includes('[-1.397,1.494,5.748]')&&repair.includes('[-.352,.543,5.518]'));
assert(repair.includes('BTR82_upper_rear_single_trapezoid')&&repair.includes('geometry.setIndex([0,1,2,0,2,3])'));
assert(repair.includes('if(group.group===1)')&&repair.includes('addUpperTrapezoid(scene,hull)'));
assert(repair.includes('joined.setIndex([...faces,...patches])'));
assert(!currentRender.includes('repairMarkedRearSeams('));
assert(currentRender.includes('baixos bisellats en V'));
assert(!currentRender.includes('removeMarkedFrontDetails('));
assert(btr.includes('if(removed!==18||keep.length!==12)'));
assert(btr.includes("[['hull_material_7',66],['hull_material_8',4]]"));
assert(btr.includes('trim.geometry=cleaned')&&btr.includes('mesh.parent.remove(mesh)'));
assert(btr.includes('retainedRearTriangles:4'));
assert(btr.includes('triangles:removed+70'));
assert(!currentRender.includes('removeBtr82AnnotatedDetails('),'El casc nou no pot heretar pedaços antics');
const details=read('src/btr82-annotated-detail-removal.mjs');
assert(details.includes('export const BTR82_DELETE_MARKS')&&details.includes('connectedPatches'));
assert(details.includes('hull_material_0')&&details.includes('hull_material_1')&&details.includes('hull_material_2'));
assert(details.includes('turret_material_3')&&details.includes('turret_material_2'));
assert(details.includes('[1.585,1.665,-3.063]')&&details.includes('[-0.450,2.333,-1.311]'));
assert(details.includes('maxTriangles')&&details.includes('maxSpan')&&details.includes('patch.centroids.some'));
assert(details.includes('scene.userData.btr82AnnotatedDetailCleanup=report'));

assert(!btr.includes("scene.getObjectByName('hull_material_0');\n  mesh.parent.remove"));
const painted=read('src/btr82-painted-hole-repair.mjs');
assert(painted.includes('BTR82_PAINTED_HOLES')&&painted.includes('applyBtr82PaintAnnotations'));
assert(painted.includes('id:15')&&painted.includes('id:2')&&painted.includes('id:14'));
assert(painted.includes("mesh:'hull_material_0'")&&painted.includes("mesh:'hull_material_1'"));
assert(painted.includes('pointToTrack')&&painted.includes('boundaryEdges')&&painted.includes('maxGap>(stroke.pointCloud?.42:.28)'));
assert(painted.includes('cap component independent prou petit')&&painted.includes('c.faces.length>14'));
assert(!currentRender.includes('applyBtr82PaintAnnotations('));
assert(hullV2.includes('buildClosedGeometry(rings)')&&hullV2.includes('indices.push(a,c,b,a,d,c)'));

assert(painted.includes('id:105')&&painted.includes('id:106'),'Dues noves traçades per tapar forats');
for(const id of [201,202,203,204])assert(painted.includes('id:'+id),'Falta una zona del nou informe de 49 marques');
assert(painted.includes('pointCloud:true')&&painted.includes('pointToStroke'), 'No s’han de generar unions fictícies entre marques llunyanes');
assert(painted.includes('removeNewPaintedUpperDetails(scene)'),'Eliminació dels petits detalls de dalt');
assert(painted.includes('upperRemoved:upperRemoval.removed'),'Recompte antic de detalls retirats');
const selector=read('src/vehicle-annotation-editor.mjs');
assert(selector.includes('paintArmour(stroke,x,y,force=false)'));
assert(selector.includes("current.mode==='patch'")&&selector.includes('stroke.paintMirror'));
assert(selector.includes('stroke.paint.mesh.removeFromParent()'));
assert(selector.includes("mode()==='patch'")&&selector.includes('previewMaterial.color.setHex(COLORS.patch)'));
assert(selector.includes('placeCursor(slot,e.clientX,e.clientY)'));
assert(selector.includes('paintArmour(current,e.clientX,e.clientY)'));

assert(selector.includes('raycaster.intersectObjects')&&selector.includes('navigator.clipboard')&&selector.includes('EXPLICACIÓ:'));
assert(selector.includes("fill:'TAPAR FORAT'")&&selector.includes("remove:'ELIMINAR PEÇA'"));
assert(selector.includes('intersectPlane')&&selector.includes('stroke.marks.push'));
assert(selector.includes("stroke.mode==='fill'||stroke.mode==='remove'?nearestHit")&&selector.includes('espai buit / cap cara detectada'), 'El pinzell d’eliminar ha de preservar marques fins i tot sense un hit sobre la malla');
assert(selector.includes('No s’ha pogut marcar aquesta zona'), 'Cal avisar si no es pot desar la traçada');
assert(studio.includes('vehicle-annotation-editor.mjs?rev=surface-paint-v12'), 'Cal invalidar la memòria cau del nou pinzell');
assert(selector.includes('Vehicle_hole_repair_live_preview')&&selector.includes('showPatchPreview(target)'));
assert(selector.includes('target.mesh.add(previewPatch)')&&selector.includes('clearPatchPreview()'));
assert(selector.includes('repairCounts()')&&selector.includes('btrRepairLiveCount'));
assert(selector.includes('edit.mesh.material=edit.previousMaterial'), 'Desfer ha de restaurar el material original');
assert(studio.includes('vehicleEditor.hover(slot,e)'),'El cursor ha de seguir la superfície en moviment');
assert(selector.includes('getHoleBrushTarget')&&selector.includes('closeHoleUnderBrush'));
assert(selector.includes('stroke.edits.push(edit)')&&selector.includes('edit.mesh.geometry=edit.previous'));
assert(!selector.includes('stroke.plane=new THREE.Plane()'),'No es poden pintar forats al pla virtual fix');
assert(selector.includes('getType()')&&selector.includes('mesh.name'));
assert(read('README.md').includes('editor de marques 3D'));
assert(read('to-do.MD').includes('Laboratori de proves de models 3D'));
assert(btr.includes('withTruckWheels')&&btr.includes('replaceBarrelWithCylinders'));
assert(!btr.includes('mesh.position.set(x,.54,z)'));

for(const obsolete of ['src/btr82-aggressive-simplification.mjs',
 'src/btr82-upload-policy.mjs','tests/btr82-preview-runtime.mjs','tools/repair-btr82-materials.cjs'])
 assert(!fs.existsSync(path.join(root,obsolete)),'Obsolete BTR-82 generator left behind: '+obsolete);
for(const id of ['heli','heli_combat'])assert(!(id in manifest.models),'Helicòpter descartat encara al manifest: '+id);
assert.equal(manifest.retiredHelicopterCandidates,6);
assert(!catalog.includes('755d8518a06e41b19752c1b54c0da588'),'El Huey aprovat ja no ha de figurar entre els candidats');
assert(!catalog.includes('df0993ee21e74a759cd0519f6fc51cf8'),'El model Apache acceptat no pot seguir entre candidats');
assert(!studio.includes('helicopterToolbar'),'La barra de l’Apache s’ha de retirar');
assert.equal(manifest.savedModels,files.length);
assert.equal(manifest.savedBytes,files.reduce((sum,item)=>sum+item.bytes,0));
for(const item of files){
 const filename=path.join(root,'assets/vehicle-candidates',item.file);
 assert(fs.existsSync(filename),'GLB candidat absent: '+item.file);
 assert.equal(fs.statSync(filename).size,item.bytes,'Mida GLB incorrecta: '+item.file);
}
for(const old of ['helicopters-lod-proves.html','apache-variants-proves.html',
 'src/helicopters-lod-proves.mjs','src/apache-variants-proves.mjs',
 'assets/vehicle-candidates/helicopter-lods/manifest.json',
 'assets/vehicle-candidates/helicopter-lods/apache-hybrid-manifest.json'])
 assert(!fs.existsSync(path.join(root,old)),'Cal retirar el candidat obsolet: '+old);
for(const file of ['src/vehicles-externs-proves.mjs','src/vehicle-candidate-catalog.mjs','src/btr82-lod-studio.mjs','src/vehicle-annotation-editor.mjs','src/vehicle-hole-brush.mjs','src/vehicle-surface-paint.mjs','src/btr82-part-selector.mjs','src/btr82-rear-seam-repair.mjs','src/btr82-annotated-detail-removal.mjs','src/btr82-painted-hole-repair.mjs','src/btr82-confirmed-repairs.mjs','src/btr82-hull-v2.mjs','src/btr82-hull-v3.mjs','src/streetfighter-25-geometry.mjs'])
 execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(root,'tests/btr82-hull-v3-geometry.cjs')],{stdio:'pipe'});
console.log('PASS default reusable vehicle 3D annotation editor: join parts, paint holes and mark parts for removal');
