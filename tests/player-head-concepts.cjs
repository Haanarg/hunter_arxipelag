(async()=>{
// Verificació del model real en les quatre variants, sense alterar el model del joc.
const assert=require('assert');
const fs=require('fs'),path=require('path');
const {pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..');
global.window=global;
const THREE=await import(pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')));
const {playerHeadConcepts,createPlayerHeadConcept}=await import(pathToFileURL(path.join(root,'src/player-head-concepts.mjs')));
const original=global.HUNTER_PLAYER_MODEL.create(THREE);
original.updateMatrixWorld(true);
const originalBox=new THREE.Box3().setFromObject(original.userData.head);
const originalSize=originalBox.getSize(new THREE.Vector3());
assert.equal(playerHeadConcepts.length,4,'exactly four head proposals');

const results=[];
playerHeadConcepts.forEach((design,i)=>{
 const model=createPlayerHeadConcept(THREE,i);
 model.updateMatrixWorld(true);
 const head=model.userData.head;
 const size=new THREE.Box3().setFromObject(head).getSize(new THREE.Vector3());
 const xRatio=size.x/originalSize.x,yRatio=size.y/originalSize.y;
 assert(Math.abs(head.scale.x-design.scale[0])<1e-9);
 assert(Math.abs(head.scale.y-design.scale[1])<1e-9);
 assert(Math.abs(head.scale.z-design.scale[2])<1e-9);
 assert(xRatio>=.60&&xRatio<=.72,'head width approximately two-thirds');
 assert(yRatio>=.60&&yRatio<=.72,'head height approximately two-thirds');
 assert.equal(head.children.length,original.userData.head.children.length,'cap, glasses, hair, nose and ears preserved');
 assert.equal(model.userData.cap.parent,head,'cap belongs to smaller head');
 assert.equal(model.userData.visor.parent,head,'visor belongs to smaller head');
 assert.equal(model.userData.ll.position.y,original.userData.ll.position.y,'legs remain unchanged');
 assert.equal(model.userData.ar.position.y,original.userData.ar.position.y,'arms remain unchanged');
 assert.equal(model.userData.profile,original.userData.profile,'player rig profile unchanged');
 results.push({name:design.name,xRatio:+xRatio.toFixed(3),yRatio:+yRatio.toFixed(3)});
});
const html=fs.readFileSync(path.join(root,'proves.html'),'utf8');
const old=fs.readFileSync(path.join(root,'explosius-proves.html'),'utf8');
assert(html.includes('src/player-head-concepts.mjs')&&html.includes('createPlayerHeadConcept(THREE,i)'),'Three.js preview uses the real head proposals');
assert(html.includes('id="bodyView"')&&html.includes('id="headView"'),'full-body and closeup comparison present');
assert(html.includes('id="front"')&&html.includes('id="profile"'),'front and profile comparisons present');
assert(old.includes('src/explosive-concepts.mjs'),'previous explosives preview kept');
console.log(JSON.stringify({passed:true,proposals:results,gameModelUntouched:true,explosivesPreviewPreserved:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
