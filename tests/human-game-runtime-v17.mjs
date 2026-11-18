import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three-r186.module.mjs';
import {playerModel} from '../src/player-model-core.mjs';
import {createHumanProposal} from '../src/human-proposals.mjs';
import {createHumanGameRuntimeV17,GAME_HUMAN_SKIN_VERSION} from '../src/human-game-runtime-v17.mjs';

globalThis.window=globalThis;
const runtime=createHumanGameRuntimeV17();
globalThis.HUNTER_HUMAN_V17=runtime;
assert.equal(GAME_HUMAN_SKIN_VERSION,'humans-v18');
const preview=createHumanProposal(T,'player','a',{visualOnly:true});
let sourceWeapons=0;preview.traverse(n=>{if(n.userData?.humanWeapon)sourceWeapons++});
assert.equal(sourceWeapons,0,'La geometria del joc no inclou una còpia de les armes del visor');

function skinParts(model){
 const parts=[];model.traverse(n=>{if(n.userData?.humanGameV17Mesh)parts.push(n)});return parts;
}

function headNeckProfile(neck,skull){
 const n=new T.Box3().setFromObject(neck,true),k=new T.Box3().setFromObject(skull,true);
 assert(!n.isEmpty()&&!k.isEmpty(),'Coll i mandíbula amb malla visible');
 const neckSize=n.getSize(new T.Vector3()),skullSize=k.getSize(new T.Vector3());
 const delta=k.getCenter(new T.Vector3()).sub(n.getCenter(new T.Vector3()));
 return {offset:delta.divideScalar(neckSize.y).toArray(),skull:skullSize.divideScalar(neckSize.y).toArray()};
}
function referenceHeadNeckProfile(role){
 const original=createHumanProposal(T,role,'a',{visualOnly:true});
 let n=null,k=null;
 original.traverse(p=>{
  if(p.isMesh&&p.name==='Coll anatòmic i clatell')n=p;
  if(p.isMesh&&p.name==='Mandíbula i crani')k=p;
 });
 assert(n&&k,'El visor defineix coll anatòmic i crani per a '+role);
 return headNeckProfile(n,k);
}
function assertHeadNeckParity(game,role,label){
 const parts=skinParts(game);
 const neck=parts.find(p=>p.userData.humanGameV17Source==='Coll anatòmic i clatell');
 const skull=parts.find(p=>p.userData.humanGameV17Source==='Mandíbula i crani');
 assert(neck&&skull,'El joc carrega les malles anatòmiques originals '+label);
 const expected=referenceHeadNeckProfile(role),actual=headNeckProfile(neck,skull);
 for(const channel of ['offset','skull'])for(let i=0;i<3;i++)
  assert(Math.abs(actual[channel][i]-expected[channel][i])<.018,
   label+' coll/cap no correspon al laboratori: '+channel+'['+i+'] '+actual[channel][i]+' vs '+expected[channel][i]);
 const collar=new T.Box3().setFromObject(neck,true),face=new T.Box3().setFromObject(skull,true);
 assert(face.min.y<collar.max.y,'El coll penetra l’interior de la mandíbula '+label);
 assert(face.min.z<collar.max.z&&face.max.z>collar.min.z,'Coll i crani coincideixen en profunditat '+label);
 assert(game.userData.humanGameV17NeckMatched===true,'Adaptador de coll correcte en ús '+label);
 console.log('PASS anatomical neck/head '+label,JSON.stringify(actual));
}
for(const role of ['player','soldier','rocket','elite','general']){
 const g=runtime.suppress(()=>playerModel.create(T,{unitScale:role==='player'?1.2:1,headVariant:'compactD',articulated:role==='player'}));
 const u=g.userData,hips=[u.ll,u.lr],knees=[u.lkl,u.lkr],arms=[u.al,u.ar],elbows=[u.ael,u.aer],boots=[...u.boots];
 const oldRefs={ll:u.ll,lr:u.lr,lkl:u.lkl,lkr:u.lkr,al:u.al,ar:u.ar,ael:u.ael,aer:u.aer,head:u.head};
 const oldPivotY=u.ll.position.y,oldKneeY=u.lkl.position.y,oldArmY=u.ael.position.y;
 const soleContacts=[...u.soleContacts];assert.equal(soleContacts.length,4);
 const gun=new T.Group();gun.name='Exact existing game weapon';
 const part=new T.Mesh(new T.BoxGeometry(.06,.16,.30),new T.MeshStandardMaterial({color:0x202927}));
 gun.add(part);u.aer.add(gun);u.gun=gun;
 const same=runtime.install(T,g,{role});
 assert.equal(same,g);assert.equal(g.userData.humanGameV17,role);
 assert(g.userData.humanGameV17Counts.added>20,'Geometria real V17 '+role);
 assert(g.userData.humanGameV17Counts.removed>10,'Pell anterior reemplaçada '+role);
 const pieces=skinParts(g);
 assert.equal(pieces.length,g.userData.humanGameV17Counts.added);
 for(const [name,ref]of Object.entries(oldRefs))assert.equal(u[name],ref,'El pivot antic no es substitueix '+name);
 assert.equal(u.ll.position.y,oldPivotY);assert.equal(u.lkl.position.y,oldKneeY);
 assert.equal(u.ael.position.y,oldArmY);assert.deepEqual(u.soleContacts,soleContacts);
 assert.equal(part.parent,gun,'L’arma i ancoratge originals segueixen muntats');
 assert(pieces.some(m=>m.userData.humanGameV17Source==='Malucs i cintura'),'Pelvis V17');
 assert(pieces.some(m=>m.userData.humanGameV17Source==='Cuixa'),'Cuixes V17');
 assert(pieces.some(m=>m.userData.humanGameV17Source==='Deltoide'),'Espatlles V16');
 assert(pieces.some(m=>m.userData.humanGameV17Source==='Panxell'),'Panxells V12');
 assert(pieces.some(m=>m.userData.humanGameV17Source==='Bota'),'Botes V11');
 assert(pieces.some(m=>m.userData.humanGameV17Source==='Mandíbula i crani'),'Cap V17');
 assertHeadNeckParity(g,role,role+' compactD');
 if(role==='player'){
  const canonical=g.userData.humanGameCanonicalRig;
  assert(canonical?.userData.humanProposal?.role==='player','Game uses editor native root as actual render body');
  const bones=g.userData.humanGameCanonicalJoints;
  assert.equal(Object.keys(bones).length,16,'All 16 canonical editor joints have been retained');
  const reference=createHumanProposal(T,'player','a',{visualOnly:true});
  const source=[],actual=[];
  reference.traverse(n=>{if(n.isMesh)source.push(n)});
  canonical.traverse(n=>{if(n.isMesh&&n.userData.humanCanonicalOriginalGeometry)actual.push(n)});
  assert.equal(actual.length,source.length,'Every editor mesh is present unchanged in game');
  for(let i=0;i<source.length;i++){
   const a=actual[i],b=source[i],attrA=a.geometry.attributes.position,attrB=b.geometry.attributes.position;
   assert.equal(a.name,b.name,'Native visual mesh ordering from editor');
   assert.equal(attrA.count,attrB.count,'Native mesh vertex count: '+a.name);
   assert.deepEqual([...attrA.array],[...attrB.array],'Exact mesh vertices, without geometric deformation: '+a.name);
   assert.equal(a.material.color.getHex(),b.material.color.getHex(),'Editor material colour: '+a.name);
  }
  const bound=new T.Box3();
  for(const mesh of actual)bound.union(new T.Box3().setFromObject(mesh));
  assert(Math.abs(bound.getSize(new T.Vector3()).y-2)<.002,'Native game model is 2.00m, not stretched old body');
  // The old gameplay shoulder is only a control. Animation must actually
  // rotate the editor's corresponding shoulder pivot and preserve the torso.
  const oldR=u.ar.rotation.x;u.ar.rotation.x+=.4;g.updateMatrixWorld(true);
  assert(Math.abs(bones.shoulderR.rotation.x-.4)<.002,'Game pose drives native shoulder joint');
  u.ar.rotation.x=oldR;g.updateMatrixWorld(true);
  assert(Math.abs(bones.shoulderR.rotation.x)<.002,'Rest pose exactly recovers editor geometry');
  console.log('PASS native game player identical to editor: 16 joints, '+actual.length+' unmodified meshes, 2.00 m');
 }
 const box=new T.Box3().setFromObject(g);
 assert(box.max.y-box.min.y>2.8&&box.max.y-box.min.y<6.5,'Alçada comparable amb el model antic');
 if(role==='player'){
  const pants=pieces.find(m=>m.userData.humanGameV17Source==='Malucs i cintura');
  assert.equal(pants.material.color.getHex(),0x50aa49,'Pantalons reals de V17');
  assert(pieces.some(m=>m.userData.humanGameV17Source==='Costura central dels pantalons'),'Bragueta V17');
 }
 // The same old animation API/poses are still valid in standing, crouching,
 // vehicle steering, and aiming. Only the render meshes have changed.
 for(const mode of ['run','crouch','aim','seat']){
  u.ll.rotation.x=mode==='seat'?Math.PI/2:mode==='crouch'?1.02:.28;
  u.lkl.rotation.x=mode==='crouch'?-1.78:mode==='run'?-1.1:-.38;
  u.ar.rotation.x=mode==='aim'?1.2:mode==='seat'?1.05:-.15;
  u.aer.rotation.x=mode==='aim'?.8:.4;
  const angles=[u.ll.rotation.x,u.lkl.rotation.x,u.ar.rotation.x,u.aer.rotation.x];
  g.updateWorldMatrix(true,true);
  assert.deepEqual([u.ll.rotation.x,u.lkl.rotation.x,u.ar.rotation.x,u.aer.rotation.x],angles,mode+' pose unchanged');
  g.traverse(n=>assert(n.matrixWorld.elements.every(Number.isFinite),'Transform finita '+role+mode));
 }
 if(role==='player'){
  // The existing rider system reparents the SAME bones. Their V17 meshes
  // remain children of the same bones after those seat transforms.
  const outer=new T.Group(),torso=new T.Group();outer.add(torso);
  for(const arm of [...hips,...knees,...arms,...elbows,...boots])outer.add(arm);
  for(const child of [...g.children]){child.position.y-=u.hipHeight;torso.add(child)}
  assert(skinParts(outer).length>15,'Rider conserva la pell V17 amb rig reparentat');
  assert(hips.every(hip=>hip.parent===outer)&&arms.every(arm=>arm.parent===outer));
 }
 if(role==='general'){
  const tails=pieces.filter(m=>m.userData.humanGameV17Source?.startsWith('Faldó cassaca'));
  const bigoti=pieces.filter(m=>m.userData.humanGameV17Source?.toLowerCase().includes('bigoti'));
  assert.equal(tails.length,4,'Cassaca V18 del general al joc');
  assert.equal(bigoti.length,4,'Bigoti V18 del general al joc');
  for(const tail of tails)assert([u.ll,u.lr].includes(tail.parent),'Faldons subjectes als pivots animats dels malucs originals');
  assert(pieces.some(m=>m.userData.humanGameV17Source==='Cintura entallada de cassaca'));
 }
 console.log('PASS V18 role '+role+' '+pieces.length+' meshes; preserved weapons, poses and real joints');
}
// Test a normal head (scale 1), as well as the compactD (~.74) head.
// They must retain the same anatomical neck-to-skull relation.
for(const role of ['player','soldier']){
 const standard=runtime.suppress(()=>playerModel.create(T,{headVariant:null}));
 runtime.install(T,standard,{role});
 assertHeadNeckParity(standard,role,role+' normal');
}
// Vehicle drivers and passengers must get V17 at the unmodified shared
// HUNTER_PLAYER_MODEL factory: driver system calls that exact method.
const rider=playerModel.create(T,{headVariant:'compactD'});
assert.equal(rider.userData.humanGameV17,'player');
assert.equal(rider.userData.headVariant,'compactD');
assert.equal(rider.userData.boots.length,2);
for(const path of ['src/rider.js','src/marine-patrol.js','src/enemy-ai.js','src/coop-world-runtime.js']){
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 assert(source.includes('HUNTER_PLAYER_MODEL.create')||source.includes('createCommando')||source.includes('makeSoldier')||source.includes('createPlayer'),path+' factory/driver contract');
}
// Test interception of classic global factories, both bundled and source.
runtime.installHooks();
globalThis.HUNTER_CHARACTERS=Object.freeze({
 createCommando(T){return playerModel.create(T)},
 createSoldier(T){return this.createCommando(T)}
});
const soldier=globalThis.HUNTER_CHARACTERS.createSoldier(T);
assert.equal(soldier.userData.humanGameV17,'soldier','Vehicle/enemy crew shares V17 soldier');
globalThis.HUNTER_GENERAL_MODEL=Object.freeze({create(T){return playerModel.create(T)}});
assert.equal(globalThis.HUNTER_GENERAL_MODEL.create(T).userData.humanGameV17,'general');
const civilians=[];
globalThis.HUNTER_PRISONERS=Object.freeze({
 create({THREE}){
  return Object.freeze({
   entities:civilians,
   configure(){
    civilians.length=0;
    for(const role of ['farmer','mechanic']){
     const o=new THREE.Group(),rig=new THREE.Group();o.add(rig);
     const head=new THREE.Mesh(new THREE.SphereGeometry(.18),new THREE.MeshStandardMaterial());head.position.y=1.57;rig.add(head);
     const legs=[-1,1].map(side=>{const bone=new THREE.Group();bone.position.set(side*.14,.82,0);rig.add(bone);return bone});
     const arms=[-1,1].map(side=>{const bone=new THREE.Group();bone.position.set(side*.34,1.30,0);rig.add(bone);return bone});
     civilians.push({role,o,rig,head,legs,arms});
    }
   },
   reset(){civilians.length=0}
  });
 }
});
const prisoners=globalThis.HUNTER_PRISONERS.create({THREE:T});
prisoners.configure({});
for(const u of prisoners.entities){
 assert.equal(u.o.userData.humanGameV17,u.role);
 assert(skinParts(u.o).length>15);
 assert.equal(u.legs.length,2);assert.equal(u.arms.length,2);
 u.legs[0].rotation.x=Math.PI/2;u.arms[0].rotation.x=-.5;
 u.head.rotation.y=.25;
 assert.equal(u.legs[0].rotation.x,Math.PI/2,'Presoner assegut');
 assert.equal(u.arms[0].rotation.x,-.5,'Postura captiva intacta');
 assert.equal(u.head.rotation.y,.25,'Salutació mecànic intacta');
}
const bootstrap=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8');
assert(bootstrap.indexOf('installHooks()')<bootstrap.indexOf('const loadClassic='),
 'Hooks instal·lats abans dels scripts clàssics');
const playerCore=readFileSync(new URL('../src/player-model-core.mjs',import.meta.url),'utf8');
assert(playerCore.includes("HUNTER_HUMAN_V17?.install(T,g,{role:'player'})"));
console.log('PASS game V17 player, enemy soldiers, officer, 2 civilian roles, boat/car/bike/motorcycle/hover/rowing drivers; legacy poses');
