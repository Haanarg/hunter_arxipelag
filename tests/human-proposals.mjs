import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three-r186.module.mjs';
import {HUMAN_PROFILES,HUMAN_CATALOG,HUMAN_STYLES} from '../src/human-model-catalog.mjs';
import {createHumanProposal,poseHumanProposal,HUMAN_VERSION,measureHumanAnatomy} from '../src/human-proposals.mjs';
import {createCurrentHuman} from '../src/human-current-models.mjs';
globalThis.window=globalThis;
assert.equal(HUMAN_CATALOG.length,7);assert(HUMAN_CATALOG.every(c=>!c.validated&&c.kind==='huma'&&c.options.length===3));
const choices=new Set();let count=0;
for(const [role,p]of Object.entries(HUMAN_PROFILES)){
 const actual=await createCurrentHuman(T,role);assert.equal(actual.userData.humanOriginal,role);
 assert(new T.Box3().setFromObject(actual).getSize(new T.Vector3()).y>2.8);
 assert.doesNotThrow(()=>new T.ObjectLoader().parse(actual.toJSON()),'Original serialitzable '+role);
 const shapes=new Set();
 for(const style of Object.keys(HUMAN_STYLES)){
  const model=createHumanProposal(T,role,style),joints={},rest={},meshes=[];choices.add(role+style);
  model.traverse(n=>{if(n.userData.humanMotionJoint)joints[n.userData.humanMotionJoint]=n;if(n.userData.humanRestJoint)rest[n.userData.humanRestJoint]=n;if(n.isMesh)meshes.push(n)});
  assert.equal(Object.keys(joints).length,16);
  assert.equal(rest.kneeL.parent,joints.hipL);assert.equal(rest.ankleR.parent,joints.kneeR);
  assert.equal(rest.elbowL.parent,joints.shoulderL);assert.equal(rest.wristR.parent,joints.elbowR);
  poseHumanProposal(model,0,'rest');
  assert.equal(model.userData.humanProposal.version,HUMAN_VERSION);
  const anatomy=measureHumanAnatomy(T,model);assert(anatomy);
  const {ratios:r,headUnits,points,unit,skullBounds,neckBounds}=anatomy;
  assert(Math.abs(headUnits-8)<.10,'Vuit caps reals '+role+style);
  for(const [id,target,tolerance]of [['shoulderL',6.66,.09],['elbowL',5.06,.09],['wristL',3.77,.09],['crotch',4,.07],['tipL',3.20,.10],['kneeL',2.33,.08],['ankleL',.46,.04]])assert(Math.abs(r[id]-target)<tolerance,id+' '+r[id]+' '+role+style);
  for(const id of ['shoulder','elbow','wrist','hip','knee','ankle','tip'])assert(Math.abs(r[id+'L']-r[id+'R'])<.015,id+' simetria');
  assert((points.chin.y-points.shoulderL.y)/unit<.37,'Coll perceptiblement més curt');
  assert((points.head.y-points.chin.y)/unit>.20,'Pivot dins del crani, no sota el mentó');
  assert(points.head.z>(skullBounds.min.z+skullBounds.max.z)/2,'Pivot posterior');
  assert(neckBounds.max.y-points.head.y>unit*.12&&neckBounds.intersectsBox(skullBounds),'Clatell dins el crani');
  assert(rest.elbowL.position.length()+rest.wristL.position.length()>.69,'Braços allargats');
  assert(rest.ankleL.position.length()>.44&&rest.kneeL.position.length()<.50,'Genolls elevats');
  console.log('ANATOMY',role,style,JSON.stringify({heads:headUnits,knee:8-r.kneeL,elbow:8-r.elbowL,wrist:8-r.wristL,tip:8-r.tipL,neckGap:(points.chin.y-points.shoulderL.y)/unit}));
  const size=new T.Box3().setFromObject(model).getSize(new T.Vector3());
  assert(Math.abs(size.y-p.height)<.002,'Alçada del joc '+role+style);
  assert(size.x/size.y<.40,'Proporcions estretes, braços i cap humans '+role+style);
  let triangles=0;for(const m of meshes){assert([...m.geometry.attributes.position.array].every(Number.isFinite));assert(m.geometry.userData.labOwned);triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3}
  assert(triangles<13000&&meshes.length<55);
  shapes.add(JSON.stringify(meshes.map(m=>Array.from(m.geometry.attributes.position.array))));
  const restPos=rest.elbowL.position.clone(),headRotation=rest.head.rotation.clone();
  const footBefore=joints.ankleL.getWorldPosition(new T.Vector3());
  poseHumanProposal(model,.25,'walk');const footAfter=joints.ankleL.getWorldPosition(new T.Vector3());
  assert(footBefore.distanceTo(footAfter)>.05);assert(joints.kneeL.rotation.x<=0&&joints.kneeR.rotation.x<=0);
  poseHumanProposal(model,.25,'crouch');assert(joints.pelvis.position.y<-.25);assert.equal(joints.kneeL.rotation.x,-1.78);
  for(const mode of ['idle','walk','run','crouch','aim','work','wave'])for(const t of [0,.25,.5,1]){
   poseHumanProposal(model,t,mode);model.updateMatrixWorld(true);
   model.traverse(n=>assert(n.matrixWorld.elements.every(Number.isFinite),role+style+mode));
   assert(new T.Box3().setFromObject(model).min.y>-.12,'Peus o accessoris sota terra '+role+style+mode);
  }
  assert.deepEqual(rest.elbowL.position.toArray(),restPos.toArray());assert.deepEqual(rest.head.rotation.toArray(),headRotation.toArray());
  // Edits belong to rest pivots; playback and JSON round-tripping preserve them.
  rest.head.rotation.y=.22;poseHumanProposal(model,.4,'walk');assert.equal(rest.head.rotation.y,.22);
  const copy=new T.ObjectLoader().parse(model.toJSON());poseHumanProposal(copy,.6,'run');poseHumanProposal(model,.6,'run');
  assert(new T.Box3().setFromObject(copy).getSize(new T.Vector3()).distanceTo(new T.Box3().setFromObject(model).getSize(new T.Vector3()))<1e-6);
  console.log('PASS',role,style,meshes.length,'malles',triangles,'triangles');count++;
 }
 assert.equal(shapes.size,3);
}
assert.equal(count,21);assert.equal(choices.size,21);
const lab=readFileSync(new URL('../src/vehicles-externs-proves.mjs',import.meta.url),'utf8'),html=readFileSync(new URL('../vehicles-externs-proves.html',import.meta.url),'utf8');
assert(html.includes('id="humanGuides"')&&html.includes('HUMANS V1'));assert(lab.includes('measureHumanAnatomy(THREE,slot.model)'));
assert(html.indexOf('id="humanList"')>html.indexOf('id="vehicleList"'));
assert(html.includes(':is(#vehicleList,#humanList) button[data-validation=\'pending\']'));
assert(lab.includes('(config.human?humanList:list).append(button)'));
assert(lab.includes('config.human?await createCurrentHuman(THREE,config.human)'));
assert(lab.includes('!original&&!currentType.human&&'),'Les proporcions humanes no s’ajusten a l’amplada antiga');
for(const mode of ['walk','run','crouch','aim','work','wave'])assert(html.includes('value="'+mode+'"'));
assert(!readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8').includes('human-proposals'),'Candidats fora del joc');
console.log('PASS 7 originals, 21 candidats, 16 articulacions, moviment, edició i JSON');
