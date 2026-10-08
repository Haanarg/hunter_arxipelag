(async()=>{
// Quatre caps al voltant del 75%, amb colls escurçats i pivots abaixats.
const assert=require('assert'),fs=require('fs'),path=require('path');
const {pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..');
global.window=global;
const THREE=await import(pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')));
const {playerHeadConcepts,createPlayerHeadConcept}=await import(
  pathToFileURL(path.join(root,'src/player-head-concepts.mjs'))
);
const original=global.HUNTER_PLAYER_MODEL.create(THREE);
original.updateMatrixWorld(true);
const originalSize=new THREE.Box3().setFromObject(original.userData.head)
  .getSize(new THREE.Vector3());
assert.equal(playerHeadConcepts.length,4,'exactly four proposals');

const results=[];
for(let i=0;i<playerHeadConcepts.length;i++){
  const design=playerHeadConcepts[i];
  const model=createPlayerHeadConcept(THREE,i);
  model.updateMatrixWorld(true);
  const u=model.userData,head=u.head,neck=u.headConcept.neck;
  const dims=new THREE.Box3().setFromObject(head).getSize(new THREE.Vector3());
  const width=dims.x/originalSize.x,height=dims.y/originalSize.y;

  assert.deepEqual(head.scale.toArray(),design.headScale,'head has the selected proportions');
  assert(width>=.71&&width<=.80,'head width is around 75%');
  assert(height>=.69&&height<=.80,'head height is around 75%');
  assert(head.position.y<original.userData.head.position.y,'head is lowered');
  assert.deepEqual(neck.scale.toArray(),design.neckScale,'neck width and height are reduced');
  assert(neck.scale.y<1&&neck.scale.x<1&&neck.scale.z<1,'neck is shorter and thinner');
  assert(neck.geometry.type==='CylinderGeometry','neck remains the original anatomical model');
  assert.equal(head.children.length,original.userData.head.children.length,'all head features preserved');
  assert.equal(u.cap.parent,head,'hat remains attached');
  assert.equal(u.visor.parent,head,'visor remains attached');
  assert.equal(u.ll.position.y,original.userData.ll.position.y,'legs unchanged');
  assert.equal(u.ar.position.y,original.userData.ar.position.y,'arms unchanged');
  assert.equal(u.profile,original.userData.profile,'original player rig preserved');

  // The player model can be resized in vehicles without losing the collar.
  const small=createPlayerHeadConcept(THREE,i,{unitScale:.8});
  assert(small.userData.headConcept.neck,'scaled player model still has a neck');
  assert(Math.abs(small.userData.head.position.y-design.headY*.8)<1e-9);

  results.push({name:design.name,width:+width.toFixed(3),height:+height.toFixed(3),
    neckHeight:design.neckScale[1],headY:design.headY});
}
// La D escollida ha de ser exactament la que fabrica el joc, sense desviacions.
const approved=global.HUNTER_PLAYER_MODEL.create(THREE,{headVariant:'compactD'});
const dPreview=createPlayerHeadConcept(THREE,3);
const dCfg=playerHeadConcepts[3],source=global.HUNTER_PLAYER_MODEL.headStyles.compactD;
assert.deepEqual(dCfg.headScale,[...source.headScale],'preview D uses gameplay head dimensions');
assert.deepEqual(dCfg.neckScale,[...source.neckScale],'preview D uses gameplay neck dimensions');
for(const [label,a,b]of [
  ['head scale',approved.userData.head.scale,dPreview.userData.head.scale],
  ['head position',approved.userData.head.position,dPreview.userData.head.position],
  ['neck scale',approved.userData.neck.scale,dPreview.userData.headConcept.neck.scale],
  ['cap position',approved.userData.cap.position,dPreview.userData.cap.position],
  ['visor scale',approved.userData.visor.scale,dPreview.userData.visor.scale]
])assert(a.distanceTo(b)<1e-9,label+' must match preview D');
assert.equal(approved.userData.headVariant,'compactD');
const untouched=global.HUNTER_PLAYER_MODEL.create(THREE);
assert.equal(untouched.userData.headVariant,'original','enemy/default models keep original head');
assert.equal(untouched.userData.head.scale.x,1);
assert.equal(untouched.userData.neck.scale.y,1);
const html=fs.readFileSync(path.join(root,'proves.html'),'utf8');
const explosives=fs.readFileSync(path.join(root,'explosius-proves.html'),'utf8');
assert(html.includes('src/player-head-concepts.mjs?v=20261008-head-02'),
  'browser loads the refreshed module');
assert(html.includes('entry.headScale[0]'),'UI reads new head dimensions');
assert(html.includes('id="bodyView"')&&html.includes('id="headView"'),'full-body and close-up toggles');
assert(html.includes('id="front"')&&html.includes('id="profile"'),'front and profile comparisons');
assert(explosives.includes('src/explosive-concepts.mjs'),'older explosives previews preserved');
console.log(JSON.stringify({passed:true,variants:results,gameModelUntouched:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
