import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three-r186.module.mjs';
import {playerModel} from '../src/player-model-core.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
import {createHumanProposal,sampleHumanGait} from '../src/human-proposals.mjs';
import {createHumanGameRuntimeV17,GAME_HUMAN_SKIN_VERSION} from '../src/human-game-runtime-v17.mjs';
import {HUMAN_PLAYER_GAME_NATIVE_HEIGHT,HUMAN_WORLD_UNITS_PER_METER} from '../src/human-model-catalog.mjs';

globalThis.window=globalThis;
const runtime=createHumanGameRuntimeV17();
globalThis.HUNTER_HUMAN_V17=runtime;
assert.equal(GAME_HUMAN_SKIN_VERSION,'humans-v18');
assert.equal(HUMAN_PLAYER_GAME_NATIVE_HEIGHT,3.11232,'Alçada nadiua aprovada');
const preview=createHumanProposal(T,'player','a',{visualOnly:true});
let sourceWeapons=0;preview.traverse(n=>{if(n.userData?.humanWeapon)sourceWeapons++});
assert.equal(sourceWeapons,0,'La geometria del joc no inclou una còpia de les armes del visor');

// Les comprovacions existents demanen explícitament la postura del tick.
// L'actualització de matrius no ha de tornar a calcular animacions.
function updateHuman(model){
 model.userData.humanGamePose?.();
 model.updateMatrixWorld(true);
}
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
 gun.add(part);
 const gunGrip=new T.Object3D();gunGrip.name='hunter-pistol-grip-center';
 gunGrip.position.set(0,-.20,.055);gun.add(gunGrip);
 u.aer.add(gun);u.gun=gun;
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
  const reference=createHumanProposal(T,'player','a',{visualOnly:true,nativeHeight:HUMAN_PLAYER_GAME_NATIVE_HEIGHT});
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
  updateHuman(g);
  reference.updateMatrixWorld(true);
  const bound=new T.Box3();
  for(const mesh of actual)bound.union(new T.Box3().setFromObject(mesh,true));
  const expectedBound=new T.Box3().setFromObject(reference,true);
  const actualSize=bound.getSize(new T.Vector3()),expectedSize=expectedBound.getSize(new T.Vector3());
  console.log('CANONICAL_BOUNDS',JSON.stringify({actual:actualSize.toArray(),expected:expectedSize.toArray(),center:bound.getCenter(new T.Vector3()).toArray(),gameScale:g.scale.toArray(),visualScale:canonical.scale.toArray(),editorScale:reference.scale.toArray(),gameWorldScale:canonical.getWorldScale(new T.Vector3()).toArray()}));
  assert(Math.abs(actualSize.y-expectedSize.y)<.002,'Player 1.6 times larger, exact editor geometry');
  // The old gameplay shoulder is only a control. Animation must actually
  // rotate the editor's corresponding shoulder pivot and preserve the torso.
  const oldR=u.ar.rotation.x,restShoulder=bones.shoulderR.quaternion.clone();
  u.ar.rotation.x+=.4;updateHuman(g);
  const moved=restShoulder.angleTo(bones.shoulderR.quaternion);
  console.log('CANONICAL_SHOULDER_MOTION',moved,bones.shoulderR.rotation.toArray());
  assert(moved>.35&&moved<.45,'Game pose drives native shoulder joint');
  u.ar.rotation.x=oldR;updateHuman(g);
  assert(restShoulder.angleTo(bones.shoulderR.quaternion)<.002,'Rest pose exactly recovers editor geometry');
  // Dimensions consolidades: model natiu 1.6, root del jugador 1,
  // el controlador antic i les armes conserven la mida física original.
  assert.equal(g.scale.x,1,'L’arrel del jugador ja no corregeix l’escala');
  assert(Math.abs(u.humanGameLegacyRig.scale.x-2/3)<1e-12,
   'Un únic grup de compatibilitat conserva l’escala dels controls antics');
  const scaledView=new T.Box3();
  for(const mesh of actual)scaledView.union(new T.Box3().setFromObject(mesh,true));
  const inGameSize=scaledView.getSize(new T.Vector3());
  assert(Math.abs(inGameSize.y-expectedSize.y)<.002,
   'El protagonista conserva la geometria nativa (sense límit de 2 m): '+inGameSize.y);
  const sampleRatio=canonical.getWorldScale(new T.Vector3());
  assert(Math.abs(sampleRatio.x-1)<.002,
   'L’escala visual de món és directa, sense multiplicar-la per l’arrel');
  const gunProxy=canonical.getObjectByName('Arma canònica · gun');
  assert(gunProxy&&gunProxy.parent===bones.wristR,'Visible pistol grip on editor wrist');
  assert.equal(gunProxy.userData.humanPistolHeldInFist,true,
   'La pistola no pot desplaçar-se fora del puny dret');
  assert.deepEqual(gunProxy.scale.toArray(),[1,1,1],
   'Pistola V18 amb la mida definitiva integrada a la geometria');
  assert(gunProxy.userData.humanNativeWeaponScale,
   'Pistola amb dimensions natives i sense corrector d’escala posterior');
  const rightHand=bones.wristR.children.find(o=>o.userData.humanHand==='R');
  const leftHand=bones.wristL.children.find(o=>o.userData.humanHand==='L');
  const fist=rightHand.children.find(o=>o.name==='Puny dret sobre la culata');
  const palm=leftHand.children.find(o=>o.name==='Palmell esquerre pla sota la pistola');
  assert(fist&&palm&&fist.children.length>=5&&palm.children.length>=5,
   'El puny dret tanca els dits i el palmell esquerre es manté obert');
  u.pistolBlend=0;updateHuman(g);
  assert(fist.visible&&!palm.visible,'Puny dret tancat també quan no apunta');
  u.pistolBlend=1;updateHuman(g);
  assert(fist.visible&&palm.visible,'Dreta tancada i esquerra plana quan apunta');
   // En repòs i caminar, l'arma segueix l'avantbraç del rig natiu.
   u.pistolBlend=0;updateHuman(g);
   const carried=new T.Vector3(0,0,-1).applyQuaternion(gunProxy.getWorldQuaternion(new T.Quaternion()));
   const forearm=bones.wristR.getWorldPosition(new T.Vector3())
     .sub(bones.elbowR.getWorldPosition(new T.Vector3())).normalize();
   assert(carried.dot(forearm)>.999,'Pistola seguint l’avantbraç de l’editor');
   u.pistolBlend=1;
   u.gun.quaternion.setFromAxisAngle(new T.Vector3(1,0,0),.42);
   updateHuman(g);
   const gripOffset=gunProxy.position.clone();
   assert(Math.abs(gripOffset.y-.024)<.002&&Math.abs(gripOffset.z+.064)<.002,
    'La culata visible roman dins del puny i segueix el canell, no orbita pel pit');
   const gripAnchor=gunProxy.getObjectByName('hunter-pistol-grip-center');
   assert(gripAnchor,'La pistola real declara el seu punt de subjecció');
   const gripCenter=gripAnchor.getWorldPosition(new T.Vector3()),
     fistCenter=fist.localToWorld(new T.Vector3(0,-.065,0));
   assert(gripCenter.distanceTo(fistCenter)<.15,
    'El mànec ha de travessar físicament el puny dret, no quedar sobre la mà');
   const actualGun=new T.Vector3(0,0,-1).applyQuaternion(gunProxy.getWorldQuaternion(new T.Quaternion()));
   const sourceGun=new T.Vector3(0,0,-1).applyQuaternion(u.gun.getWorldQuaternion(new T.Quaternion()));
   assert(actualGun.dot(sourceGun)>.999,'Canó visible orientat com l’arma real');
   u.pistolBlend=0;u.gun.quaternion.identity();updateHuman(g);
   for(const yaw of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
    g.rotation.y=yaw;updateHuman(g);
    const direction=new T.Vector3(0,0,-1).applyQuaternion(g.getWorldQuaternion(new T.Quaternion()));
    for(const id of ['spine','head']){
     const facing=new T.Vector3(0,0,-1).applyQuaternion(bones[id].getWorldQuaternion(new T.Quaternion()));
     assert(facing.dot(direction)>.995,'Orientació '+id+' per a rumb '+yaw);
    }
   }
   g.rotation.y=0;updateHuman(g);
   u.runBlend=1;u.ph=Math.PI*2*.39;updateHuman(g);
   assert(Math.abs(bones.ankleL.rotation.x-sampleHumanGait(.39,1).ankle)<.001,'Cursa del joc = turmell de l’editor');
   u.runBlend=0;updateHuman(g);
  // La passa de caminar ha de moure el V18, també sense runBlend.
  u.gameLandMove=1;u.ph=0;updateHuman(g);
  const walkHipL=bones.hipL.rotation.x,walkHipR=bones.hipR.rotation.x;
  u.ph=Math.PI;updateHuman(g);
  assert(Math.abs(bones.hipL.rotation.x-walkHipL)>.40||
   Math.abs(bones.hipR.rotation.x-walkHipR)>.40,
   'Caminar canvia les articulacions reals del V18 entre passes');
  u.gameLandMove=0;updateHuman(g);
  assert.equal(u.humanGameCanonicalSoles.length,2,'Soles V18 i no antigues');
  assert(u.humanGameCanonicalSoles.every(m=>m.userData.humanLandmark==='sole'&&m.castShadow),
   'Les soles originals projecten ombra si el perfil ho permet');
  assert(!part.visible&&part.parent===gun,'Old ghost gun is not visible or detached from gameplay controller');
  const oldLowerY=u.lowerBody.position.y,oldUpperY=u.upperBody.position.y;
  u.lowerBody.position.y-=.72;u.upperBody.position.y-=.72;
  updateHuman(g);
  assert(canonical.position.y<-.19&&canonical.position.y>-.35,
   'Old 4m crouch is translated to native 2m joints, not -0.72m full drop');
  u.lowerBody.position.y=oldLowerY;u.upperBody.position.y=oldUpperY;
  updateHuman(g);
  // Fusell i bazuca: mà de suport V18 i geometries visuals nadiues.
  // Prova sense el sistema d'armes clàssic: només ancoratges geomètrics.
  const longKinds={
   assault:['hunter-assault-trigger-grip','hunter-assault-foregrip'],
   sniper:['hunter-sniper-trigger-grip','hunter-sniper-foregrip'],
   bazooka:['hunter-bazooka-right-underbarrel-grip',
    'hunter-bazooka-left-support-grip']
  };
  u.gun.visible=false;
  u.ar.rotation.x=1.1;u.aer.rotation.x=.85;
  for(const [kind,[rightName,gripName]]of Object.entries(longKinds)){
   const weapon=new T.Group();
   weapon.scale.setScalar(.84);weapon.visible=true;
   const skin=new T.Mesh(new T.BoxGeometry(.15,.17,.85),
    new T.MeshStandardMaterial({color:0x343e32}));
   weapon.add(skin);
   const grip=new T.Object3D();
   grip.name=gripName;grip.position.set(-.35,-.12,-.30);weapon.add(grip);
   const right=new T.Object3D();
   right.name=rightName;right.position.set(.03,-.10,.24);weapon.add(right);
   u.upperBody.add(weapon);u[kind]=weapon;
   updateHuman(g);
   const proxy=canonical.getObjectByName('Arma canònica · '+kind);
   assert(proxy&&proxy.userData.humanNativeWeaponScale,'Còpia d’arma nativa '+kind);
   assert.deepEqual(proxy.scale.toArray(),[1,1,1],
    'Cap factor visual de fusell al V18: '+kind);
   assert.equal(proxy.parent,bones.spine,
    'La còpia de l’arma és filla del tors, mai del canell: '+kind);
   assert(proxy.userData.humanLongGunNativeMounted,
    'El punt de subjecció dret es deriva de l’espatlla V18: '+kind);
   const pose=u.humanGameNativeLongGunSupport;
   assert.equal(pose?.weapon,kind,'IK V18 de mà esquerra activa '+kind);
   assert(pose.distance<.13,'La mà esquerra segueix el guardamà real '+kind+
    ': error '+pose.distance);
   assert(pose.rightDistance<.13,'La mà dreta segueix el gallet real '+kind+
    ': error '+pose.rightDistance);
   for(const side of ['L','R'])
    assert(bones['shoulder'+side].quaternion.toArray().every(Number.isFinite),
     'IK de les dues mans V18 finita '+side+' '+kind);
   weapon.visible=false;
  }
  // La resta d'armes visibles també han de tenir transform d'arrel unitari,
  // incloses les cisalles, que abans canviaven d'escala en cada fotograma.
  for(const kind of ['knife','grenade','cisalla']){
   const model=new T.Group();model.visible=true;
   model.add(new T.Mesh(new T.BoxGeometry(.12,.35,.60),
    new T.MeshStandardMaterial({color:0x737a66})));
   u.upperBody.add(model);u[kind]=model;
   updateHuman(g);
   const proxy=canonical.getObjectByName('Arma canònica · '+kind);
   assert(proxy&&proxy.userData.humanNativeWeaponScale,
    'Arma visible creada amb mida nativa: '+kind);
   assert.deepEqual(proxy.scale.toArray(),[1,1,1],
    'Sense factors d’escala residuals: '+kind);
   model.visible=false;
  }
  u.gun.visible=true;
  u.ar.rotation.x=oldR;u.aer.rotation.x=0;
  updateHuman(g);
  assert.equal(u.humanGameNativeLongGunSupport,null,
   'L’IK de suport desapareix quan el jugador ja no sosté arma llarga');
  console.log('PASS editor avatar exact rig and meshes, native long-gun support and original gait');
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

 // La fàbrica real del rider: canvia només la mida dels ocupants del GAZ.
 const riderSandbox={
  window:{
   HUNTER_PLAYER_MODEL:{create:(Three,options)=>playerModel.create(Three,options)},
   HUNTER_HUMAN_V17:runtime
  },
  createPlayerPistol:(Three,parent)=>{
   const slide=new Three.Group(),flash=new Three.Group();
   parent.add(slide,flash);
   return {slide,flash};
  }
 };
 runInNewContext(readFileSync(new URL('../src/rider.js',import.meta.url),'utf8'),riderSandbox);
 const driver=riderSandbox.window.HUNTER_RIDER.create(T,{
  scene:new T.Scene(),box(){},material:c=>new T.MeshStandardMaterial({color:c}),
  scales:{cotxe:1.3,cotxe_civil:1.2,hover:1.3,moto:1.2,bici:1.2},heightAt:()=>0,shadows:false
 });
 const nativePart=driver.object.userData.riderDetailNodes
   .flatMap(root=>{const found=[];root.traverse(n=>{
     if(n.isMesh&&n.geometry?.getAttribute?.('position'))found.push(n);
   });return found}).find(Boolean);
 assert(nativePart,'El rider disposa de geometria pròpia per a la talla de cabina');
 const partSize=()=>{
  nativePart.geometry.computeBoundingBox();
  return nativePart.geometry.boundingBox.getSize(new T.Vector3());
 };
 const initialPartSize=partSize();
 const gaz=new T.Group();gaz.userData.gazModel='Tigr-M';
 driver.update({t:'cotxe',o:gaz,v:0,pedalPhase:0},1/60);
 assert.deepEqual(driver.object.scale.toArray(),[1,1,1],
  'El conductor GAZ té arrel 1 i geometria de cabina nativa');
 assert.equal(driver.object.userData.riderNativeSize,.825,
  'Mida GAZ consolidada en les malles, no en l’arrel');
 assert(driver.object.userData.riderNativeGeometry,'Rider amb geometria pròpia');
 assert(partSize().distanceTo(initialPartSize.clone().multiplyScalar(.825))<.0001,
  'La geometria original ha incorporat el perfil GAZ una sola vegada');
 const seat=driver.object.userData.torso.getWorldPosition(new T.Vector3());
 assert(seat.distanceTo(new T.Vector3(-.72*1.3*1.25,
   1.22*1.3*1.25,.42*1.3*1.25))<1e-5,
  'L’ancoratge del pilot GAZ té coordenades mundials, sense inversos');
 const ownGeometry=nativePart.geometry;
 driver.update({t:'cotxe',o:gaz,v:0,pedalPhase:0},1/60);
 assert.equal(nativePart.geometry,ownGeometry,
  'Cap clonació ni multiplicació de geometria dins els ticks de conducció');
 const gazShot=driver.firePistol({t:'cotxe',o:gaz},()=>null);
 assert(gazShot?.origin&&gazShot?.direction,
  'Disparador del conductor GAZ conserva l’origen del canó');
 assert(gazShot.origin.distanceTo(driver.object.userData.pistol.localToWorld(
   new T.Vector3(0,.183,-1.47).multiplyScalar(.825)))<1e-6,
  'Origen de la bala al canó real amb la mida nativa del GAZ');
 assert(Math.abs(gazShot.direction.length()-1)<1e-6);
 driver.reset();
 const headBounds=new T.Box3().setFromObject(driver.object.userData.head,true);
 assert(headBounds.max.y<2.37*1.3*1.25,'El cap ha de cabre sota el sostre GAZ ampliat');
 driver.update({t:'cotxe_civil',o:new T.Group(),v:0,pedalPhase:0},1/60);
 assert.equal(driver.object.scale.x,1,'Cotxe civil: escala d’arrel 1');
 assert.equal(driver.object.userData.riderNativeSize,.82,'Mida final civil nativa');
 assert(partSize().distanceTo(initialPartSize.clone().multiplyScalar(.82))<.0001,
  'El model civil només canvia la talla intrínseca');
 driver.update({t:'cotxe',o:new T.Group(),v:0,pedalPhase:0},1/60);
 assert.equal(driver.object.scale.x,1,'Cotxe estàndard: escala d’arrel 1');
 assert.equal(driver.object.userData.riderNativeSize,.82,
  'Altres cotxes tenen la mateixa talla final de cabina');
 const hover=new T.Group();
 hover.userData.hovercraftSeatPositions=[
  new T.Vector3(-.30,1.58,-1.08),new T.Vector3(.30,1.58,-1.08)
 ];
 hover.userData.hovercraftSteeringPosition=new T.Vector3(-.30,1.88,-1.98);
 driver.update({t:'hover',o:hover,v:0,pedalPhase:0},1/60,0);
 assert.equal(driver.object.scale.x,1,'Hover: arrel nativa sense .63');
 assert.equal(driver.object.userData.riderNativeSize,.63,
  'L’hovercraft incorpora la talla .63 al rig');
 assert(partSize().distanceTo(initialPartSize.clone().multiplyScalar(.63))<.0001,
  'La geometria del pilot hover té les dimensions originals aprovades');
 const hoverSeat=driver.object.userData.torso.getWorldPosition(new T.Vector3());
 assert(hoverSeat.distanceTo(new T.Vector3(-.30*1.3,1.58*1.3,
  -1.08*1.3))<1e-5,'Pilot hover sobre el seient real');
 driver.update({t:'hover',o:hover,v:0,pedalPhase:0},1/60,1);
 const passengerSeat=driver.object.userData.torso.getWorldPosition(new T.Vector3());
 assert(passengerSeat.distanceTo(new T.Vector3(.30*1.3,1.58*1.3,
  -1.08*1.3))<1e-5,'Passatger COOP hover a la segona plaça');
 const hoverShot=driver.firePistol({t:'hover',o:hover},()=>null);
 assert(hoverShot?.origin?.distanceTo(driver.object.userData.pistol.localToWorld(
  new T.Vector3(0,.183,-1.47).multiplyScalar(.63)))<1e-6,
  'La pistola del passatger hover conserva canó i dimensions natives');
 driver.reset();
  // Els pilots de dues rodes fan servir EXACTAMENT la pell del jugador
  // a peu; cap bone scale ha de variar amb la posició del pedal.
  const anatomicalBody=driver.object.children.find(o=>o.userData.twoWheelCanonical);
  assert(anatomicalBody,'La moto i la bicicleta han de tenir el model canònic');
  assert.deepEqual(anatomicalBody.scale.toArray(),[1,1,1],
   'Malles i pivots tenen la mida del jugador a peu incorporada, no un factor d’escala ocult');
  const footAvatar=playerModel.create(T,{articulated:true});
  // La pell té escala nativa 1.6 amb l'arrel a 1; l'escala antiga
  // 2/3 només pertany al grup ocult de controls i armes.
  assert.equal(footAvatar.scale.x,1);
  footAvatar.updateMatrixWorld(true,true);
  const footRig=footAvatar.userData.humanGameCanonicalRig;
  // Compare ONLY the identical anatomical meshes, not optional hidden
  // hand/weapon overlays created by the on-foot gameplay adapter.
  const anatomicalBounds=root=>{
   const bounds=new T.Box3(),meshBounds=new T.Box3();
   root.traverse(n=>{
    if(n.isMesh&&(root!==footRig||n.userData.humanCanonicalOriginalGeometry)){
     meshBounds.setFromObject(n,true);bounds.union(meshBounds);
    }
   });
   return bounds.getSize(new T.Vector3());
  };
  const footBounds=anatomicalBounds(footRig),
        pilotBounds=anatomicalBounds(anatomicalBody);
  console.log('FOOT_TWO_WHEEL_PARITY',JSON.stringify({
    foot:footBounds.toArray(),pilot:pilotBounds.toArray(),
    riderRigScale:anatomicalBody.scale.toArray()}));
  for(const axis of ['x','y','z'])
   assert(Math.abs(footBounds[axis]-pilotBounds[axis])<.003,
    'Pilot de dues rodes i model a peu tenen la mateixa mida mundial ('+axis+')');
  assert(Math.abs(driver.object.userData.twoWheelCanonicalHeight-runtime.footVisualHeight)<.002,
   'La mida inicial del pilot deriva del model humà original sense cap límit imposat');
  const riderJoints={};
  anatomicalBody.traverse(o=>{if(o.userData.humanMotionJoint)riderJoints[o.userData.humanMotionJoint]=o});
  const point=id=>riderJoints[id].getWorldPosition(new T.Vector3());
  const boneMeasures=()=>['L','R'].flatMap(side=>[
    point('hip'+side).distanceTo(point('knee'+side)),
    point('knee'+side).distanceTo(point('ankle'+side)),
    point('shoulder'+side).distanceTo(point('elbow'+side)),
    point('elbow'+side).distanceTo(point('wrist'+side))
  ]);
  const makeVehicle=vehicleModels.createFactory(T,{
   box:(parent,w,h,d,color)=>{
    const piece=new T.Mesh(new T.BoxGeometry(w,h,d),
      new T.MeshStandardMaterial({color}));parent.add(piece);return piece;
   },
   material:color=>new T.MeshStandardMaterial({color}),
   shadows:false,batching:playerBatching
  });
  const moto=makeVehicle('moto');
  assert.equal(moto.userData.motorcycleVisualScale,1.24,'Moto amb escala real segons distància entre eixos');
  assert(moto.userData.twoWheelAnchors?.seat&&moto.userData.twoWheelAnchors?.gripL
    &&moto.userData.twoWheelAnchors?.pedalR,'Moto: ancoratges reals del xassís');
  assert(Math.abs(moto.userData.wheels[0].userData.radius-.34738122819654627*1.24*1.2)<.002,
   'Moto: roda física i visual de la mateixa mida');
  // Una unitat mètrica equival a HUMAN_WORLD_UNITS_PER_METER unitats
  // visuals: cap alçada nominal de 2 m s'imposa al jugador.
  // Honda CB650R: distància entre eixos 1,45 m; selló 0,81 m.
  const meters=units=>units/HUMAN_WORLD_UNITS_PER_METER;
  moto.updateWorldMatrix(true,true);
  const axles=moto.userData.wheels.map(w=>w.getWorldPosition(new T.Vector3()));
  const wheelbase=meters(axles[0].distanceTo(axles[1]));
  const motoSeatMeters=meters(
    moto.userData.twoWheelAnchors.seat.getWorldPosition(new T.Vector3()).y);
  assert(Math.abs(wheelbase-1.45)<.025,
   'Moto: distància entre eixos de streetfighter real, no 1,99 m');
  assert(Math.abs(motoSeatMeters-.81)<.025,
   'Moto: selló proper als 81 cm reals, no 1,26 m');
  console.log('REAL_WORLD_MOTORCYCLE_PROPORTIONS',JSON.stringify({
   riderHeightM:2,wheelbaseM:wheelbase,seatM:motoSeatMeters}));
  const motorcycle={t:'moto',o:moto,v:0,pedalPhase:0};
  driver.update(motorcycle,1/60);
  assert.equal(driver.object.scale.x,1,'Escala global neutra per al pilot anatòmic');
  assert.equal(driver.object.userData.riderNativeSize,1,
   'El pas de l’hover a la moto recupera les mides nadiues del V18');
  assert(partSize().distanceTo(initialPartSize)<.0001,
   'La malla del rider recupera la mida original, sense factors acumulats');
  assert(anatomicalBody.visible,'La malla de la moto ha de ser visible');
  const stoppedLegLength=point('hipL').distanceTo(point('kneeL'))+
    point('kneeL').distanceTo(point('ankleL'));
  console.log('TWO_WHEEL_SEAT_DEBUG',JSON.stringify({
   pelvisY:point('pelvis').y,
   target:driver.object.userData.twoWheelFloorY+.82*stoppedLegLength,
   floor:driver.object.userData.twoWheelFloorY,
   seat:driver.object.userData.twoWheelSeatHip,
   stop:driver.object.userData.twoWheelStopped,
   bone:stoppedLegLength,
   saddle:moto.userData.twoWheelAnchors.seat.getWorldPosition(new T.Vector3()).toArray()
  }));
  assert(Math.abs(point('pelvis').y-
   (driver.object.userData.twoWheelFloorY+.82*stoppedLegLength))<.012,
   'Moto aturada: maluc a l’alçada de suport calculada a partir de les cames a peu');
  const motoMeasures=boneMeasures();
  assert(motoMeasures.every(n=>n>.4&&n<1),'Longituds anatòmiques del pilot');
  assert(Math.abs(driver.object.userData.twoWheelCanonicalLegLengths.thigh-
    motoMeasures[0])<.001,'L’IK usa la distància real del maluc al genoll, no la posició local zero');
  assert(Math.abs(driver.object.userData.twoWheelCanonicalLegLengths.shin-
    motoMeasures[1])<.001,'L’IK usa la distància real del genoll al turmell, no la posició local zero');
  assert(driver.object.userData.riderDetailNodes.every(node=>
   node===driver.object.userData.pistol||node.visible===false),
   'Cap pilot antic ni cames extensibles poden aparèixer damunt de la moto');
  const avatarBodyBounds=()=>new T.Box3().setFromObject(anatomicalBody,true);
  const inspectPose=label=>{
   const hipL=point('hipL'),hipR=point('hipR'),kneeL=point('kneeL'),
     ankleL=point('ankleL'),neck=point('neck'),head=point('head');
   const box=avatarBodyBounds(),limbUpper=hipL.distanceTo(kneeL),
     limbLower=kneeL.distanceTo(ankleL),reach=hipL.distanceTo(ankleL);
   console.log('TWO_WHEEL_POSE_DIAGNOSTIC',JSON.stringify({
    label,body:{min:box.min.toArray(),max:box.max.toArray()},
    hip:hipL.toArray(),knee:kneeL.toArray(),ankle:ankleL.toArray(),
    neck:neck.toArray(),head:head.toArray(),
    limbs:{upper:limbUpper,lower:limbLower,reach,bend:Math.acos(Math.min(1,Math.max(-1,
      (limbUpper*limbUpper+limbLower*limbLower-reach*reach)/(2*limbUpper*limbLower))))*180/Math.PI}
   }));
  };
  inspectPose('moto-stopped-initial');

  const footJoint=footAvatar.userData.humanGameCanonicalJoints;
  const footLength=(a,b)=>footJoint[a].getWorldPosition(new T.Vector3())
    .distanceTo(footJoint[b].getWorldPosition(new T.Vector3()));
  const footLengths=['L','R'].flatMap(side=>[
   footLength('hip'+side,'knee'+side),footLength('knee'+side,'ankle'+side),
   footLength('shoulder'+side,'elbow'+side),footLength('elbow'+side,'wrist'+side)
  ]);
  footLengths.forEach((len,i)=>assert(Math.abs(len-motoMeasures[i])<.002,
   'Cada segment de cama i braç coincideix amb el rig a peu ('+i+')'));
  const bici=makeVehicle('bici');
  assert.equal(bici.userData.bicycleVisualScale,.74,'Bicicleta: roda adulta 700C');
  assert(bici.userData.twoWheelAnchors?.seat&&bici.userData.twoWheelAnchors?.gripR
    &&bici.userData.twoWheelAnchors?.pedalL,'Bici: ancoratges del selló, manillar i pedals');
  assert(Math.abs(bici.userData.wheels[0].userData.radius-.62*.74*1.2)<.001,
    'Bicicleta: les rodes comparteixen el factor visual i físic');
  bici.updateWorldMatrix(true,true);
  const bikeWheelM=meters(2*bici.userData.wheels[0].userData.radius),
    bikeSeatM=meters(bici.userData.twoWheelAnchors.seat
      .getWorldPosition(new T.Vector3()).y);
  assert(Math.abs(bikeWheelM-.69)<.025,
    'Bici: diàmetre de roda 700C real, no 82 cm');
  assert(bikeSeatM>1.00&&bikeSeatM<1.12,
    'Bici: alçada de selló plausible per al ciclista de 2 m');
  console.log('REAL_WORLD_BICYCLE_PROPORTIONS',JSON.stringify({
   riderHeightM:2,wheelDiameterM:bikeWheelM,seatM:bikeSeatM}));
  driver.update({t:'bici',o:bici,v:0,pedalPhase:0},1/60);
  assert.equal(driver.object.scale.x,1,'Ciclista amb escala visual canònica');
  const topOfSaddle=bici.userData.twoWheelAnchors.seat.getWorldPosition(new T.Vector3()).y;
  const pelvisBottom=new T.Box3();
  for(const piece of riderJoints.pelvis.children)
   if(piece.isMesh)pelvisBottom.expandByObject(piece);
  assert(Math.abs(point('pelvis').y-
   (driver.object.userData.twoWheelFloorY+.82*stoppedLegLength))<.012,
   'Bici aturada: genolls flexionats sense deformar la cama');
  const bentKnee=(side)=>{
   const hip=point('hip'+side),knee=point('knee'+side),ankle=point('ankle'+side);
   const a=hip.distanceTo(knee),b=knee.distanceTo(ankle),c=hip.distanceTo(ankle);
   return Math.acos(Math.max(-1,Math.min(1,(a*a+b*b-c*c)/(2*a*b))))*180/Math.PI;
  };
  assert(bentKnee('L')<150&&bentKnee('R')<150,
   'El ciclista aturat no queda amb les cames hiperesteses');
  assert(Math.abs(point('ankleL').y-.14)<.04&&Math.abs(point('ankleR').y-.14)<.04,
   'Tots dos peus del ciclista arriben a terra');
  inspectPose('bike-stopped');
  assert(driver.object.userData.riderDetailNodes.every(node=>
   node===driver.object.userData.pistol||node.visible===false),
   'Cap pilot antic ni cames extensibles poden aparèixer damunt de la bicicleta');
  const stopped=boneMeasures();
  stopped.forEach((v,i)=>assert(Math.abs(v-motoMeasures[i])<.0001,
   'Ni les cuixes ni els panxells no canvien de llargada entre moto i bici'));
  for(let n=0;n<45;n++){
   bici.userData.crank.rotation.x=-n*.18;
   driver.update({t:'bici',o:bici,v:7,pedalPhase:n*.18},1/60);
  }
  pelvisBottom.makeEmpty();
  for(const piece of riderJoints.pelvis.children)
   if(piece.isMesh)pelvisBottom.expandByObject(piece);
  assert(Math.abs(pelvisBottom.min.y-topOfSaddle-.018)<.006,
   'Quan pedala, el cul torna a situar-se just per sobre del selló');
  for(const phase of [0,Math.PI/3,2*Math.PI/3,Math.PI,Math.PI*1.6]){
   bici.userData.crank.rotation.x=-phase;
   driver.update({t:'bici',o:bici,v:7,pedalPhase:phase},1/60);
   boneMeasures().forEach((v,i)=>assert(Math.abs(v-motoMeasures[i])<.0001,
    'Les cames i els braços han de conservar la longitud mentre pedala'));
   for(const side of ['L','R'])
    assert(bentKnee(side)>42&&bentKnee(side)<158,
     'El genoll durant el pedaleig conserva una flexió anatòmica real');
  }
  inspectPose('bike-pedaling');
  // La mà ha d'arribar fins al manillar real i el peu fins al pedal
  // real, no fins a punts inventats que es desplacen amb l'escala.
  for(const side of ['L','R']){
   const wrist=point('wrist'+side),
     grip=bici.userData.twoWheelAnchors['grip'+side]
       .getWorldPosition(new T.Vector3());
   const foot=point('ankle'+side),
     pedal=bici.userData.twoWheelAnchors['pedal'+side]
       .getWorldPosition(new T.Vector3());
   const gap=wrist.distanceTo(grip),pedalGap=foot.distanceTo(pedal);
   console.log('BIKE_ACTUAL_GRIP_PEDAL',side,JSON.stringify({gap,pedalGap}));
   assert(gap<.18,'Mà '+side+' arriba al manillar geomètric de la bicicleta');
   assert(grip.y<point('shoulder'+side).y-.08,
    'El manillar de la bicicleta no pot obligar a aixecar els colzes fins al cap');
   assert(pedalGap<.12,'Peu '+side+' arriba al pedal físic de la bicicleta');
  }
  driver.update({...motorcycle,v:8},1/60);
  inspectPose('moto-moving-early');
  boneMeasures().forEach((v,i)=>assert(Math.abs(v-motoMeasures[i])<.0001,
   'La transició de bicicleta a moto no pot estirar cap segment'));
  // Igual que a la bicicleta: peus al reposapeus en marxa,
  // peus al terreny després de frenar, sense canviar de longitud.
  for(let n=0;n<45;n++)driver.update({...motorcycle,v:8},1/60);
  for(const side of ['L','R']){
    const wrist=point('wrist'+side),
      grip=moto.userData.twoWheelAnchors['grip'+side].getWorldPosition(new T.Vector3());
    const ankle=point('ankle'+side),
      footrest=moto.userData.twoWheelAnchors['pedal'+side].getWorldPosition(new T.Vector3());
    const gap=wrist.distanceTo(grip),footGap=ankle.distanceTo(footrest);
    console.log('MOTO_ACTUAL_GRIP_FOOTREST',side,JSON.stringify({gap,footGap}));
    assert(gap<.18,'Mà '+side+' arriba al manillar real de la moto');
    assert(grip.y<point('shoulder'+side).y-.08,
      'Manillar de la moto situat per sota de les espatlles del pilot');
    assert(footGap<.12,'Peu '+side+' arriba al reposapeu real de la moto');
  }
  const ridingFootY=(point('ankleL').y+point('ankleR').y)/2;
  const ridingSpread=point('ankleR').x-point('ankleL').x;
  assert(ridingFootY>.55,'A la moto en marxa els peus són als reposapeus');
  for(let n=0;n<45;n++)driver.update(motorcycle,1/60);
  inspectPose('moto-stopped-final');
  const stoppedFootY=(point('ankleL').y+point('ankleR').y)/2,
    stoppedSpread=point('ankleR').x-point('ankleL').x;
  assert(stoppedSpread<ridingSpread+.02,
   'En aturar-se, les cames baixen sense obrir-se exageradament');
  assert(stoppedFootY<.25,'La moto aturada baixa tots dos peus fins al terra');
  assert(stoppedFootY<ridingFootY-.25,
   'Cal veure la transició de baixada dels peus quan la moto frena');
  boneMeasures().forEach((v,i)=>assert(Math.abs(v-motoMeasures[i])<.0001,
   'Frenar i posar els peus a terra no estira les cames de la moto'));

for(const path of ['src/rider.js','src/marine-patrol.js','src/enemy-ai.js','src/coop-world-runtime.js']){
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 assert(source.includes('HUNTER_PLAYER_MODEL.create')||source.includes('createCommando')||source.includes('makeSoldier')||source.includes('createPlayer'),path+' factory/driver contract');
}
// Les talles aprovades dels tripulants passen a geometria i pivots, sense
// reescalar arrels cada cop que giren les armes o canvien de vehicle.
const nativeSoldier=()=>{
 const root=runtime.suppress(()=>playerModel.create(T,{headVariant:'compactD'}));
 // El factory del soldat enemic porta fusell, però el playerModel
 // anatòmic de prova no n'instancia cap automàticament.
 const weapon=new T.Group();weapon.name='Test · fusell real del tripulant';
 weapon.add(new T.Mesh(new T.BoxGeometry(.17,.15,.72),
  new T.MeshStandardMaterial({color:0x263032})));
 root.userData.aer.add(weapon);
 root.userData.gun=weapon;
 runtime.install(T,root,{role:'soldier'});
 return root;
};
for(const size of [.31,.43,.52]){
 const old=nativeSoldier(),actual=nativeSoldier();
 for(const root of [old,actual]){
  root.position.set(1.4,.7,-2.3);
  root.rotation.y=.38;
  root.userData.ll.rotation.x=.74;
  root.userData.lkl.rotation.x=-1.16;
  root.userData.ar.rotation.x=1.18;
  root.userData.aer.rotation.x=.48;
  const muzzle=new T.Object3D();muzzle.name='crew-test-muzzle';
  muzzle.position.set(0,0,-1.08);root.userData.gun.add(muzzle);
 }
 old.scale.setScalar(size);
 old.updateWorldMatrix(true,true);
 const expectedBox=new T.Box3().setFromObject(old,true);
 const expectedHead=old.userData.head.getWorldPosition(new T.Vector3());
 const expectedMuzzle=old.getObjectByName('crew-test-muzzle')
  .getWorldPosition(new T.Vector3());
 const originalAngles=[actual.userData.ll.rotation.x,
  actual.userData.lkl.rotation.x,actual.userData.ar.rotation.x];
 assert.equal(runtime.normalizeEnemyCrew(actual,size),actual);
 assert.deepEqual(actual.scale.toArray(),[1,1,1],
  'Arrel de tripulant enemic V18 unitària: '+size);
 assert.equal(actual.userData.humanCrewNativeScale,size);
 actual.updateWorldMatrix(true,true);
 const actualBox=new T.Box3().setFromObject(actual,true);
 assert(actualBox.min.distanceTo(expectedBox.min)<1e-5&&
  actualBox.max.distanceTo(expectedBox.max)<1e-5,
  'Model complet de tripulant amb dimensions idèntiques: '+size);
 assert(actual.userData.head.getWorldPosition(new T.Vector3())
  .distanceTo(expectedHead)<1e-6,
  'Punt anatòmic de cap en la mateixa posició mundial: '+size);
 assert(actual.getObjectByName('crew-test-muzzle')
  .getWorldPosition(new T.Vector3()).distanceTo(expectedMuzzle)<1e-6,
  'Canó/arma antiga en la mateixa posició mundial: '+size);
 assert.deepEqual([actual.userData.ll.rotation.x,
  actual.userData.lkl.rotation.x,actual.userData.ar.rotation.x],originalAngles,
  'Postura nativa preservada: '+size);
 assert.equal(runtime.normalizeEnemyCrew(actual,size),actual,
  'La normalització és idempotent');
 assert.throws(()=>runtime.normalizeEnemyCrew(actual,size+.01),
  /talla diferent/,'No es reescala un tripulant ja normalitzat');
}
const crewSandbox={
 THREE:T,
 window:{
  HUNTER_HUMAN_V17:runtime,
  HUNTER_CHARACTERS:{
   createCommando:nativeSoldier,
   createSoldier:nativeSoldier
  }
 }
};
const marineSource=readFileSync(new URL('../src/marine-patrol.js',import.meta.url),'utf8');
runInNewContext(marineSource+
 '\nthis.__attachBoatCrew=attachEnemyBoatCrew;this.__aimBoatCrew=aimEnemyBoatCrew;'+
 'this.__boatMuzzle=enemyBoatCrewMuzzle;',crewSandbox);
const boat=new T.Group();
const marine=crewSandbox.__attachBoatCrew(boat,{type:'patrulla_marina'});
assert.equal(marine.boatWeapons.length,2);
for(const [seat,crew]of marine.boatWeapons.entries()){
 assert.deepEqual(crew.rider.scale.toArray(),[1,1,1],
  'Patrullera: soldat V18 amb arrel 1');
 assert.equal(crew.rider.userData.humanCrewNativeScale,.43);
 const eye=boat.worldToLocal(crew.aimEye.getWorldPosition(new T.Vector3()));
 assert(Math.abs(eye.y-(.89+2.7*.43))<1e-6,
  'Punt de mira geomètric a la mateixa altura que el model anterior');
 assert.equal(crew.rider.position.x,seat===0?-.58:.58);
 const muzzle=crewSandbox.__boatMuzzle(boat,seat);
 assert(muzzle.distanceTo(crew.muzzle.getWorldPosition(new T.Vector3()))<1e-8,
  'Muzzle de patrullera i arma real en el mateix punt');
}
assert.equal(typeof crewSandbox.__aimBoatCrew(boat,0,new T.Vector3(5,4,-35),.1),'boolean');
const carSource=readFileSync(new URL('../src/enemy-ai.js',import.meta.url),'utf8');
const start=carSource.indexOf('function attachEnemyCarCrew('),
 end=carSource.indexOf('// L\'única font visual de les tripulacions',start);
assert(start>0&&end>start,'El factory de soldats enemics continua disponible');
const attachCarCrew=new Function('THREE','window','bx','M','attachEnemyBoatCrew',
 carSource.slice(start,end)+';return attachEnemyCarCrew;')(
 T,crewSandbox.window,(parent,w,h,d,color,x=0,y=0,z=0)=>{
  const part=new T.Mesh(new T.BoxGeometry(w,h,d),
   new T.MeshStandardMaterial({color}));
  part.position.set(x,y,z);parent.add(part);return part;
 },()=>new T.MeshStandardMaterial(),crewSandbox.__attachBoatCrew);
for(const [type,size]of [['cotxe',.43],['camio',.31],['moto',.52]]){
 const vehicle=new T.Group();
 if(type==='camio')vehicle.userData.truckCabin={
  enemySeat:{x:.9,y:1.55,z:-.42},gunMount:{x:.9,y:2.36,z:-.53}
 };
 const occupants=attachCarCrew(vehicle,{type});
 for(const rider of [occupants.driver,occupants.gunner].filter(Boolean)){
  assert.deepEqual(rider.scale.toArray(),[1,1,1],
   'Enemic de vehicle '+type+' amb arrel 1');
  assert.equal(rider.userData.humanCrewNativeScale,size,
   'Talla nativa del vehicle '+type);
 }
 assert(occupants.motorcycleMuzzle?.getWorldPosition(new T.Vector3())
  .toArray().every(Number.isFinite)??true,
  'La boca de foc del motorista segueix el rig V18');
 if(occupants.gunner)assert(occupants.muzzle?.getWorldPosition(
  new T.Vector3()).toArray().every(Number.isFinite),
  'Boca de foc del tirador a la torreta sense doble escala');
}
console.log('PASS tripulants V18 nadius: GAZ/camió/moto, patrulleres, dos seients, malles i canons');

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
