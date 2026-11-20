import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three-r186.module.mjs';
import {playerModel} from '../src/player-model-core.mjs';
import {palette as gamePalette} from '../src/palette-core.mjs';
import {vehicleModels} from '../src/vehicle-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
import {createHumanProposal,sampleHumanGait} from '../src/human-proposals.mjs';
import {sampleHumanSwimming} from '../src/human-swim-proposals.mjs';
import {rotateModelAroundNativePelvis} from '../src/player-ejection-pivot.mjs';
import {createHumanGameRuntimeV17,GAME_HUMAN_SKIN_VERSION} from '../src/human-game-runtime-v17.mjs';
import {HUMAN_PLAYER_GAME_NATIVE_HEIGHT,HUMAN_WORLD_UNITS_PER_METER} from '../src/human-model-catalog.mjs';
import {moveOnFoot} from '../src/player-simulation.mjs';
import {pushWalls,pushTree} from '../src/world-physics.mjs';
import * as crewPhysics from '../src/vehicle-occupant-damage-core.mjs';
import {vehicleOccupantHeadWorld,vehicleSeatWorld,marineCrewHeadWorld,
 vehicleSeatProjectileContact,marineCrewProjectileContact} from '../src/vehicle-occupant-damage-core.mjs';
import {TRUCK_CABIN,COMMANDO_HEAD_PIVOT_HEIGHT,enemyCrewLocalSeat,
 HELICOPTER_CREW_PROFILES} from '../src/vehicle-crew-anchors.mjs';

globalThis.window=globalThis;
const runtime=createHumanGameRuntimeV17();
globalThis.HUNTER_HUMAN_V17=runtime;
assert.equal(GAME_HUMAN_SKIN_VERSION,'humans-v18');
assert.equal(HUMAN_PLAYER_GAME_NATIVE_HEIGHT,3.11232,'Alçada nadiua aprovada');
// Auditoria del límit entre física autoritativa i render V17/V18:
 // els dos motors de moviment i les parets no consulten cap jerarquia
 // Three.js ni el grup antic 2/3, també amb dues rèpliques COOP.
 for(const path of ['../src/player-simulation.mjs','../src/player-vertical.mjs',
                    '../src/world-physics.mjs','../src/vehicle-occupant-damage-core.mjs']){
  const text=readFileSync(new URL(path,import.meta.url),'utf8');
  assert(!/humanGameLegacyRig|LEGACY_GAME_RIG_SCALE|humanGameCanonicalJoints|\.getWorldPosition\(/.test(text),
   'La física pura no depèn del rig o del render: '+path);
 }
 const physicalPoint={x:2,z:-4,hd:.28};
 const physicalInput={forward:1,strafe:.2,run:true};
 const runPure=()=>moveOnFoot(physicalPoint,physicalInput,1/60,{limit:1600});
 const moveA=runPure(),moveB=runPure();
 assert.deepEqual(moveA,moveB,
  'Moviment autoritatiu independent de frames de pell, escala i COOP');
 const physicalWall={x0:2,x1:4,z0:-5,z1:-3,y0:0,y1:4};
 const bodyA={x:2.2,y:1,z:-4,hd:0},bodyB={...bodyA};
 pushWalls(bodyA,[physicalWall],.6);
 pushWalls(bodyB,[physicalWall],.6);
 assert.deepEqual(bodyA,bodyB,
  'Col·lisions amb parets pures i deterministes sense malles V17');
 const deterministicSeat={t:'cotxe',x:4,z:-5,hd:.7,y:1};
 assert.deepEqual(vehicleOccupantHeadWorld(deterministicSeat,0),
  vehicleOccupantHeadWorld({...deterministicSeat},0));
 assert.deepEqual(vehicleSeatWorld(deterministicSeat,1),
  vehicleSeatWorld({...deterministicSeat},1));
 // El COOP consumia coordenades del canó ocult fins a aquesta fase.
 // Els projectils confirmats es dibuixen des de la mateixa boca V18
 // que SOLO (l'autoritat de dany continua al servidor).
 const coopSource=readFileSync(
  new URL('../src/coop-world-runtime.js',import.meta.url),'utf8');
 const coopMuzzleStart=coopSource.indexOf('function nativeCoopProjectileMuzzle(weapon)');
 const coopMuzzleEnd=coopSource.indexOf('function updateNativeCoop(dt)',coopMuzzleStart);
 assert(coopMuzzleStart>=0&&coopMuzzleEnd>coopMuzzleStart,
  'Contracte de boca de projectil COOP localitzable');
 const coopMuzzle=coopSource.slice(coopMuzzleStart,coopMuzzleEnd);
 assert(coopMuzzle.includes("nativeWeaponMuzzleWorld?.(THREE,pl,kind)")&&
  !coopMuzzle.includes('u.assaultMuzzle')&&
  !coopMuzzle.includes('u.sniperMuzzle')&&
  !coopMuzzle.includes('u.gun;point='),
  'COOP ja no deriva la posició de tret d\'armes V17 ocultes');
 const pureTreeA={x:1,y:0,z:1,hd:.3},pureTreeB={...pureTreeA},
       tree={x:1.1,y:0,z:1.0,r:.25};
 pushTree(pureTreeA,tree);pushTree(pureTreeB,tree);
 assert.deepEqual(pureTreeA,pureTreeB,
  'Empentes físiques de vegetació sense consultar la figura humana');
 console.log('PASS physical audit: pure locomotion, terrain walls and deterministic seat hitboxes are independent from legacy rig');
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
  // La cabriola es calcula amb la pelvis real del rig aprovat.
  // Després de canviar el pare en COOP, el punt mundial continua fix.
  const originalTranslation=g.position.clone(),originalOrientation=g.rotation.clone();
  for(const angle of [-Math.PI/3,-Math.PI,Math.PI*2]){
   g.position.copy(originalTranslation);g.rotation.copy(originalOrientation);
   g.updateWorldMatrix(true,true);
   const pivotBefore=bones.pelvis.getWorldPosition(new T.Vector3());
   const pivotAfter=rotateModelAroundNativePelvis(g,angle);
   assert(pivotAfter.distanceTo(pivotBefore)<1e-7,
    'La cabriola V18 conserva exactament la pelvis sense cintura 2.05: '+angle);
  }
  g.position.copy(originalTranslation);g.rotation.copy(originalOrientation);
  const ejectionParent=new T.Group();
  ejectionParent.position.set(9,4,-7);
  ejectionParent.rotation.y=.56;ejectionParent.scale.setScalar(1.25);
  ejectionParent.add(g);g.updateWorldMatrix(true,true);
  const coopPivotBefore=bones.pelvis.getWorldPosition(new T.Vector3());
  const coopPivotAfter=rotateModelAroundNativePelvis(g,-Math.PI*.72);
  assert(coopPivotAfter.distanceTo(coopPivotBefore)<1e-7,
   'COOP: el gir d\'expulsió respecta la pelvis V18 amb pare escalat i girat');
  ejectionParent.remove(g);
  g.position.copy(originalTranslation);g.rotation.copy(originalOrientation);
  g.updateWorldMatrix(true,true);
  console.log('PASS ejection: native V18 pelvis pivot and COOP transformed-parent invariance');
  // La rotació i l'ajupiment visibles no poden dependre ja de l'estat
  // d'un maluc, coll o tors ocult quan hi ha hagut un tick del joc.
  const nativeBodyState={
   pelvisYaw:-.24,spinePitch:-.19,spineYaw:.35,spineRoll:0,
   headPitch:.19,headYaw:0,headRoll:-.07,crouchDrop:-.30
  };
  u.humanGameNativeBodyPose=nativeBodyState;
  u.lowerBody.rotation.y=.95;u.upperBody.rotation.x=.88;
  u.upperBody.rotation.y=-.75;u.head.rotation.set(.70,.40,.63);
  updateHuman(g);
  assert(Math.abs(canonical.position.y+.30)<1e-9,
    'Ajupiment V18 exacte sense factor del rig ocult');
  assert(Math.abs(bones.pelvis.rotation.y+.24)<1e-9,
    'Lateralitat de la pelvis numèrica V18');
  assert(Math.abs(bones.spine.rotation.y-(.35+.24))<1e-9,
    'El tors V18 mira al vector global i compensa el gir de malucs');
  assert(Math.abs(bones.head.rotation.z+.07)<1e-9,
    'El cap V18 ignora rotacions ocultes del controlador');
  u.lowerBody.rotation.y=-1.27;u.upperBody.rotation.x=-.93;
  u.upperBody.rotation.y=1.26;u.head.rotation.set(-.8,-.9,-.7);
  updateHuman(g);
  assert(Math.abs(canonical.position.y+.30)<1e-9&&
    Math.abs(bones.spine.rotation.y-(.35+.24))<1e-9&&
    Math.abs(bones.head.rotation.z+.07)<1e-9,
    'Controlador ocult perturbar no canvia la postura corporal canònica');
  delete u.humanGameNativeBodyPose;
  u.lowerBody.rotation.y=0;u.upperBody.rotation.set(0,0,0);
  u.head.rotation.set(0,0,0);
  updateHuman(g);
  console.log('PASS V18 native torso/head/crouch independent of V17 control');
  // Prova explícita dels VUIT canals de braços i cames visibles:
  // canviar les rotacions del controlador V17 no pot alterar-los.
  const limbIds=['hipL','hipR','kneeL','kneeR',
                 'shoulderL','shoulderR','elbowL','elbowR'];
  u.humanGameNativeBodyPose={
   pelvisYaw:0,spinePitch:0,spineYaw:0,spineRoll:0,
   headPitch:0,headYaw:0,headRoll:0,crouchDrop:0
  };
  u.humanGameNativeLimbPose=Object.fromEntries(limbIds.map((id,i)=>[
   id,{x:(i+1)*.055,z:(i%2?1:-1)*.035}
  ]));
  u.gameLandMove=0;u.runBlend=0;
  for(const bone of [u.ll,u.lr,u.lkl,u.lkr,u.al,u.ar,u.ael,u.aer])
   bone.rotation.set(.82,-.61,1.25);
  updateHuman(g);
  for(const id of limbIds){
   const expected=u.humanGameNativeLimbPose[id],bone=bones[id];
   assert(Math.abs(bone.rotation.x-expected.x)<1e-9&&
    Math.abs(bone.rotation.z-expected.z)<1e-9,
    'Membre V18 sense lectura de rotacions antigues: '+id);
  }
  for(const bone of [u.ll,u.lr,u.lkl,u.lkr,u.al,u.ar,u.ael,u.aer])
   bone.rotation.set(-.9,.3,-1.1);
  updateHuman(g);
  for(const id of limbIds){
   const expected=u.humanGameNativeLimbPose[id],bone=bones[id];
   assert(Math.abs(bone.rotation.x-expected.x)<1e-9&&
    Math.abs(bone.rotation.z-expected.z)<1e-9,
    'Canvi del rig ocult no altera el membre: '+id);
  }
  delete u.humanGameNativeLimbPose;
  delete u.humanGameNativeBodyPose;
  for(const bone of [u.ll,u.lr,u.lkl,u.lkr,u.al,u.ar,u.ael,u.aer])
   bone.rotation.set(0,0,0);
  updateHuman(g);
  console.log('PASS V18 native locomotion without reading legacy limb transforms');
  // L'explosió del protagonista no pot animar membres ocults V17.
  // El ragdoll V18 es torna a aplicar després de humanGamePose() al RAF.
  const ragdollWindow={window:{}};
  runInNewContext(readFileSync(new URL('../src/ragdoll-lite.js',import.meta.url),'utf8'),ragdollWindow);
  const rag=ragdollWindow.window.HUNTER_RAGDOLL;
  const state=rag.make(g,{blast:true,seed:9.2,impulse:{vy:4}});
  assert(state.native&&state.joints.length===9,
   'Ragdoll: exclusivament els nou ossos visibles del V18');
  assert(state.joints.some(x=>x.node===bones.shoulderR)&&
   state.joints.some(x=>x.node===bones.hipL),
   'El ragdoll mou espatlla i maluc de l\'editor, no controls V17');
  rag.update(state,1/30,{airborne:true});
  const ragAngle=bones.shoulderR.rotation.x;
  g.userData.humanGamePose();
  assert(rag.apply(state),'La cabriola restaura la postura física després de l\'animador V18');
  assert(Math.abs(bones.shoulderR.rotation.x-ragAngle)<1e-9,
   'El render no esborra la postura de l\'impacte');
  rag.reset(state);
  assert(!state.active);
  g.userData.humanGamePose();
  assert(rag.applyNativeFlip(g,.45),'L\'expulsió es fa sobre els ossos V18');
  assert(Math.abs(bones.shoulderR.rotation.x-.58*(1-.45**8))<1e-9,
   'La rotació visible del braç segueix el gir de l\'expulsió');
  g.userData.humanGamePose();
  console.log('PASS native V18 ragdoll and flip pose do not depend on legacy control bones');

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
   // En apuntar, els canells V18 han de tenir un destí anatòmic propi:
   // deformar els braços ocults no els ha de pujar sobre el cap.
   u.visualAimSmoothed=new T.Vector3(0,0,-1);
   u.ar.rotation.x=-1.10;u.aer.rotation.x=-.90;
   updateHuman(g);
   const nativePistolA=u.humanGameNativePistolSupport;
   assert(nativePistolA&&nativePistolA.rightDistance<.035,
    'IK dreta de pistola mesura el canell del V18');
   const nativeRightA=bones.wristR.getWorldPosition(new T.Vector3());
   const nativeHead=bones.head.getWorldPosition(new T.Vector3());
   assert(nativeRightA.y<nativeHead.y-.12,
    'El puny V18 no puja per sobre del crani en apuntar');
   u.ar.rotation.x=1.24;u.aer.rotation.x=.85;
   updateHuman(g);
   const nativeRightB=bones.wristR.getWorldPosition(new T.Vector3());
   assert(nativeRightB.distanceTo(nativeRightA)<.035,
    'El canell visible de pistola no depèn de les rotacions IK del braç ocult');
   assert(u.humanGameNativePistolSupport?.leftDistance<.16,
    'El palmell esquerre s’apropa al suport real de la pistola');
   assert.deepEqual(gunProxy.scale.toArray(),[1,1,1],
    'L’IK de pistola tampoc introdueix correctors d’escala');
   u.ar.rotation.x=oldR;u.aer.rotation.x=0;
   u.visualAimSmoothed=null;
   u.pistolBlend=0;u.gun.quaternion.identity();updateHuman(g);
   assert.equal(u.humanGameNativePistolSupport,null,
    'El solver natiu de pistola queda inactiu quan no s’apunta');
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
   'Ajupiment V18 amb mateixa profunditat aprovada');
  const nativePelvisMeters=bones.pelvis.parent.position.y/HUMAN_WORLD_UNITS_PER_METER;
  const expectedCrouch=(u.lowerBody.position.y-u.hipHeight)*
   u.humanGameLegacyRig.scale.y*Math.min(1,nativePelvisMeters/u.hipHeight);
  assert(Math.abs(canonical.position.y-expectedCrouch)<1e-8,
   'Desplaçament de la pelvis calculat des de dimensions V18');
  // El model és fill d'un altre espai en el joc i en COOP:
  // la conversió entre Object3D ha de ser invariant al pare.
  const parent=new T.Group();
  parent.position.set(12,4,-7);parent.rotation.y=.67;
  parent.scale.setScalar(1.35);parent.add(g);
  g.rotation.y=-.41;updateHuman(g);
  assert(Math.abs(canonical.position.y-expectedCrouch)<1e-8,
   'Ajupiment del model V18 sota transformació del pare COOP');
  parent.remove(g);g.rotation.y=0;
  for(const fraction of [.25,.5,.75,1]){
   u.lowerBody.position.y=oldLowerY-.72*fraction;
   u.upperBody.position.y=oldUpperY-.72*fraction;
   updateHuman(g);
   assert(Math.abs(canonical.position.y-expectedCrouch*fraction)<1e-8,
    'Ajupiment lineal en la geometria nativa: '+fraction);
  }
  u.lowerBody.position.y=oldLowerY;u.upperBody.position.y=oldUpperY;
  updateHuman(g);
  // V18 natació: desplaçaments finals sense LEGACY_SWIM_POSITION ni
  // dependència del controlador ocult, en idle, B3 i C4.
  const swimAt=(mode,time,blend=1,previousMode=mode,transition=1)=>{
   u.gameSwimActive=blend>0;u.gameSwimBlend=blend;
   u.gameSwimMode=mode;u.gameSwimPreviousMode=previousMode;
   u.gameSwimTransition=transition;u.gameSwimSeconds=time;
   updateHuman(g);
   return canonical.position.clone();
  };
  for(const mode of ['breast','crawl']){
   for(const second of [0,.55,1.3]){
    const p=swimAt(mode,second);
    assert(Math.abs(p.z-.61)<1e-8,
     'Natació V18 '+mode+': centre horitzontal definit per la postura nativa');
    const swimSample=sampleHumanSwimming(
     mode==='breast'?'swim-breast-3':'swim-crawl-4',second);
    assert(Math.abs(p.y-(.35+swimSample.bob))<1e-8,
     'Natació V18 '+mode+': alçada de la postura B3/C4 sense transformació 2/3');
    assert.deepEqual(canonical.scale.toArray(),[1,1,1],
     'Natació V18 no modifica l’escala del model '+mode);
   }
  }
  const swimFull=swimAt('breast',.7);
  const swimHalf=swimAt('breast',.7,.5);
  assert(Math.abs(swimHalf.z-swimFull.z*.5)<1e-8&&
   Math.abs(swimHalf.y-swimFull.y*.5)<1e-8,
   'Entrada a l’aigua: blend de posició real i lineal sobre el mateix V18');
  const swimIdle=swimAt('idle',.6);
  assert(Math.abs(swimIdle.z)<1e-10&&Math.abs(swimIdle.y)<.017,
   'Manteniment en superfície: bob nadiu, sense desplaçament longitudinal');
  const swimTransition=swimAt('crawl',.7,1,'breast',.5);
  assert(Math.abs(swimTransition.z-.61)<1e-8&&
   Math.abs(swimTransition.y-swimFull.y)<.06,
   'Transició B3 a C4 sense salt d’escala del cos');
  const coopSwimParent=new T.Group();
  coopSwimParent.position.set(12,4,-7);coopSwimParent.rotation.y=.67;
  coopSwimParent.scale.setScalar(1.35);coopSwimParent.add(g);
  const coopSwim=swimAt('breast',.7);
  assert(coopSwim.distanceTo(swimFull)<1e-7,
   'La natació V18 és invariant al pare girat/escalat de COOP');
  coopSwimParent.remove(g);
  u.gameSwimBlend=0;u.gameSwimActive=false;
  updateHuman(g);
  assert(canonical.position.length()<1e-8,
   'Sortida de l’aigua: restauració de la postura local nativa');
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
   const grip=new Three.Object3D();
   grip.name='hunter-pistol-grip-center';
   grip.position.set(0,-.20,.055);parent.add(grip);
   const muzzle=new Three.Object3D();
   muzzle.name='hunter-pistol-muzzle';
   muzzle.position.set(0,.183,-1.47);slide.add(muzzle);
   parent.add(slide,flash);
   return {slide,flash};
  }
 };
 runInNewContext(readFileSync(new URL('../src/rider.js',import.meta.url),'utf8'),riderSandbox);
 const driver=riderSandbox.window.HUNTER_RIDER.create(T,{
  scene:new T.Scene(),box(){},material:c=>new T.MeshStandardMaterial({color:c}),
  scales:{cotxe:1.3,cotxe_civil:1.2,hover:1.3,moto:1.2,bici:1.2,
   llanxa:1.95,llanxa_coets:1.95,barca_rems:1.2,moto_aquatica:1.2,
   windsurf:1.2},heightAt:()=>0,shadows:false
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
 // Cotxes: el PILOT visible és ara la geometria i les articulacions
 // aprovades del V18, no els vuit segments de braç/cama extensibles.
 const carSeatBody=driver.object.userData.riderSeatCanonicalBody,
       carSeatJoints=driver.object.userData.riderSeatCanonicalJoints;
 assert(driver.object.userData.riderSeatCanonicalActive&&
  carSeatBody?.userData.humanSeatCanonical&&carSeatJoints?.pelvis,
  'El conductor del GAZ és un model V18 complet');
 assert(carSeatBody.visible&&carSeatBody.scale.toArray().every(x=>x===1),
  'El conductor GAZ conserva arrel nativa i visibilitat V18');
 assert(Math.abs(carSeatBody.userData.humanSeatNativeHeight-
  HUMAN_PLAYER_GAME_NATIVE_HEIGHT*.825)<.03,
  'El V18 del GAZ integra talla de cabina .825 a la geometria');
 assert(driver.object.userData.riderDetailNodes.every(n=>
  n===driver.object.userData.pistol||n.visible===false),
  'Cap segment ni tros de figura V17 visible a la cabina GAZ');
 assert(carSeatJoints.pelvis.getWorldPosition(new T.Vector3()).distanceTo(
  driver.object.userData.torso.getWorldPosition(new T.Vector3()))<1e-7,
  'La pelvis V18 se situa sobre el seient real del GAZ');
 const seatJointLengths=()=>{
  const joints=driver.object.userData.riderSeatCanonicalJoints;
  return ['L','R'].flatMap(side=>[['hip','knee'],['knee','ankle'],
   ['shoulder','elbow'],['elbow','wrist']].map(([a,b])=>
    joints[a+side].getWorldPosition(new T.Vector3()).distanceTo(
     joints[b+side].getWorldPosition(new T.Vector3()))));
 };
 const carLengths=seatJointLengths();
 assert(carLengths.every(x=>x>.2&&x<.8),
  'El V18 GAZ conserva braços i cames anatòmics sense segments extensibles');
 const gazPassenger={t:'cotxe',o:gaz,v:0,pedalPhase:0};
 driver.update(gazPassenger,1/60,1);
 const gazGuestSeat=driver.object.userData.riderSeatCanonicalHip.clone();
 assert(gazGuestSeat.x>0&&
  carSeatJoints.pelvis.getWorldPosition(new T.Vector3()).distanceTo(
   driver.object.userData.torso.getWorldPosition(new T.Vector3()))<1e-7,
  'El passatger COOP ocupa seient dret amb V18 i ancoratge correcte');
 assert(carLengths.every((len,i)=>Math.abs(seatJointLengths()[i]-len)<1e-5),
  'Conductor i passatger comparteixen longituds nadiues del V18');
 driver.update(gazPassenger,1/60,0);
 const ownGeometry=nativePart.geometry;
 driver.update({t:'cotxe',o:gaz,v:0,pedalPhase:0},1/60);
 assert.equal(nativePart.geometry,ownGeometry,
  'Cap clonació ni multiplicació de geometria dins els ticks de conducció');
 const gazShot=driver.firePistol({t:'cotxe',o:gaz},()=>null);
 assert(gazShot?.origin&&gazShot?.direction,
  'Disparador del conductor GAZ conserva l’origen del canó');
 const realRiderPistol=driver.object.userData.pistol;
 const muzzleMarker=realRiderPistol.getObjectByName('hunter-pistol-muzzle'),
       gripMarker=realRiderPistol.getObjectByName('hunter-pistol-grip-center');
 assert(muzzleMarker&&gripMarker,
  'Rider V18 comparteix els dos marcadors de l\'arma aprovada');
 assert(gazShot.origin.distanceTo(muzzleMarker.getWorldPosition(new T.Vector3()))<1e-8,
  'El tret GAZ surt del silenciador visible, no del vector antic d\'escala');
 assert(driver.object.userData.riderNativePistolMounted,
  'La pistola del GAZ es munta exclusivament des del canell V18');
 const gazWrist=driver.object.userData.riderSeatCanonicalJoints.wristR;
 assert(gripMarker.getWorldPosition(new T.Vector3()).distanceTo(
   gazWrist.getWorldPosition(new T.Vector3()))<1e-7,
  'Empunyadura sobre el canell V18 del conductor GAZ');
 const gazShotOrigin=gazShot.origin.clone();
 driver.object.userData.limbs[2].rotation.set(1.8,.7,-.6);
 driver.object.userData.limbs[3].rotation.set(-.8,1.1,.9);
 driver.object.updateWorldMatrix(true,true);
 assert(muzzleMarker.getWorldPosition(new T.Vector3()).distanceTo(gazShotOrigin)<1e-7,
  'El tret del rider no depèn de rotacions dels braços ocults V17');
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
 const hoverNative=driver.object.userData.riderSeatCanonicalBody,
       hoverJoints=driver.object.userData.riderSeatCanonicalJoints;
 assert(hoverNative?.visible&&hoverNative.scale.toArray().every(x=>x===1),
  'El pilot de l\'hovercraft utilitza únicament la pell canònica V18');
 assert(Math.abs(hoverNative.userData.humanSeatNativeHeight-
  HUMAN_PLAYER_GAME_NATIVE_HEIGHT*.63)<.03,
  'La talla .63 de l\'hovercraft es cuina a la geometria');
 assert(driver.object.userData.riderDetailNodes.every(n=>
  n===driver.object.userData.pistol||n.visible===false),
  'Les peces extensibles V17 queden ocultes a l\'hovercraft');
 assert(hoverJoints.pelvis.getWorldPosition(new T.Vector3()).distanceTo(
  driver.object.userData.torso.getWorldPosition(new T.Vector3()))<1e-7,
  'La pelvis del pilot V18 coincideix amb el seient de l\'hovercraft');
 const hoverSeat=driver.object.userData.torso.getWorldPosition(new T.Vector3());
 assert(hoverSeat.distanceTo(new T.Vector3(-.30*1.3,1.58*1.3,
  -1.08*1.3))<1e-5,'Pilot hover sobre el seient real');
 driver.update({t:'hover',o:hover,v:0,pedalPhase:0},1/60,1);
 const passengerSeat=driver.object.userData.torso.getWorldPosition(new T.Vector3());
 const hoverGuestJoints=driver.object.userData.riderSeatCanonicalJoints;
 assert(hoverGuestJoints===hoverJoints&&
  hoverGuestJoints.pelvis.getWorldPosition(new T.Vector3()).distanceTo(
    passengerSeat)<1e-7,
  'El COOP guest de l\'hovercraft manté el mateix rig i cambia només de seient');
 assert(driver.object.userData.riderSeatCanonicalPose.hands.length===2&&
  driver.object.userData.riderSeatCanonicalPose.feet.length===2,
  'La IK de pilot i passatger rep dues mans i dos peus natius');
 const hoverNativeLengths=seatJointLengths();
 driver.update({t:'hover',o:hover,v:0,pedalPhase:0},1/60,0);
 assert(hoverNativeLengths.every((len,i)=>
  Math.abs(seatJointLengths()[i]-len)<1e-5),
  'Els ossos V18 mantenen longitud sota canvi COOP pilot/pass');
 const seatParent=new T.Group();
 seatParent.position.set(-8,3,6);seatParent.rotation.y=.65;
 seatParent.scale.setScalar(1.2);seatParent.add(driver.object);
 driver.object.updateWorldMatrix(true,true);
 assert(hoverJoints.pelvis.getWorldPosition(new T.Vector3()).distanceTo(
  driver.object.userData.torso.getWorldPosition(new T.Vector3()))<1e-7,
  'Un pare COOP transformat no desencaixa la pelvis V18 del seient');
 seatParent.remove(driver.object);

 assert(passengerSeat.distanceTo(new T.Vector3(.30*1.3,1.58*1.3,
  -1.08*1.3))<1e-5,'Passatger COOP hover a la segona plaça');
 const hoverShot=driver.firePistol({t:'hover',o:hover},()=>null);
 assert(hoverShot?.origin?.distanceTo(
  muzzleMarker.getWorldPosition(new T.Vector3()))<1e-8,
  'La pistola del passatger hover surt del marcador geomètric V18');
 assert(gripMarker.getWorldPosition(new T.Vector3()).distanceTo(
  driver.object.userData.riderSeatCanonicalJoints.wristR
   .getWorldPosition(new T.Vector3()))<1e-7,
  'El passatger COOP de l\'hovercraft té l\'arma ancorada al canell V18');
 // Migració a pell V18 dels cinc vehicles nàutics amb un únic
 // controlador d'IK. La figura V17 es conserva oculta per als tirs.
 driver.reset();
 const seaBodies=new Map();
 const checkMarine=(vehicle,seatIndex=null,expectedYaw=null)=>{
  driver.update(vehicle,1/60,seatIndex);
  const d=driver.object.userData,body=d.riderSeatCanonicalBody,
    joints=d.riderSeatCanonicalJoints;
  assert(d.riderSeatCanonicalActive&&body?.visible&&joints?.pelvis,
   'Model V18 visible del '+vehicle.t);
  assert(body.userData.humanSeatCanonical&&
   body.userData.humanSeatNativeSize===1&&
   Math.abs(body.userData.humanSeatNativeHeight-HUMAN_PLAYER_GAME_NATIVE_HEIGHT)<.03,
   'Talla natural sense reduccions ocultes: '+vehicle.t);
  assert.deepEqual(body.scale.toArray(),[1,1,1],
   'Sense escalar l\'arrel del '+vehicle.t);
  assert(d.riderDetailNodes.every(node=>
   node===d.pistol||!node.visible),
   'Sense duplicats V17 sota la figura V18: '+vehicle.t);
  const hip=joints.pelvis.getWorldPosition(new T.Vector3()),
    oldSeat=d.torso.getWorldPosition(new T.Vector3());
  assert(hip.distanceTo(oldSeat)<1e-7,
   'La pelvis V18 segueix el seient autoritatiu: '+vehicle.t+
   ' '+hip.distanceTo(oldSeat));
  const lengths=seatJointLengths();
  assert(lengths.every(n=>n>.3&&n<1.0&&Number.isFinite(n)),
   'Segments V18 finits i anatomics: '+vehicle.t);
  for(const side of ['L','R'])for(const bone of ['hip','knee','ankle','shoulder','elbow','wrist'])
   assert(joints[bone+side].getWorldPosition(new T.Vector3())
      .toArray().every(Number.isFinite),'Pose V18 finita de '+vehicle.t+'/'+bone+side);
  if(expectedYaw!==null){
   // Els 180° són equivalents a -180° en Three.js quan es reconstrueix
   // l'Euler. Comparar quaternions amb q/-q equivalència valida el
   // gir anatòmic real sense exigir un representant numèric únic.
   const yawError=Math.atan2(Math.sin(d.torso.rotation.y-expectedYaw),
     Math.cos(d.torso.rotation.y-expectedYaw));
   const quaternionAgreement=Math.abs(body.quaternion.dot(d.torso.quaternion));
   assert(Math.abs(yawError)<.0001&&quaternionAgreement>1-1e-9,
    'L\'orientació V18 respecta el rumb anatòmic del '+vehicle.t+
    ': yawError='+yawError+' quaternionAgreement='+quaternionAgreement);
  }
  const baseline=seaBodies.get(vehicle.t);
  if(baseline){
   assert(baseline.root===body,'Cap regeneració de malles quan canvia seient: '+vehicle.t);
   assert(lengths.every((n,i)=>Math.abs(n-baseline.lengths[i])<1e-6),
    'Bones de longitud constant: '+vehicle.t);
  }else seaBodies.set(vehicle.t,{root:body,lengths});
  return {body,joints,hip,pose:d.riderSeatCanonicalPose};
 };
 const jetski={t:'moto_aquatica',o:new T.Group(),v:2,pedalPhase:0};
 checkMarine(jetski);
 jetski.v=7;
 const movingJet=checkMarine(jetski);
 assert(movingJet.pose.wholeBody&&movingJet.pose.hands.length===2,
  'Moto aquàtica: tors inclinat i dues mans sobre el manillar V18');
 assert(movingJet.body.rotation.x>.18,
  'Moto aquàtica: inclinació cap endavant pròpia del pilot');
 const rowHull=new T.Group();
 rowHull.userData.rowingSeat={y:1.1,z:.4};
 rowHull.userData.oars=[new T.Group(),new T.Group()];
 rowHull.userData.oars.forEach((o,i)=>{
  o.position.set(i===0?-.55:.55,1.6,-.15);
  o.userData.grip=new T.Vector3(0,0,-.25);
  rowHull.add(o);
 });
 const rowing={t:'barca_rems',o:rowHull,v:2,pedalPhase:.6,yawRate:0};
 const rowPose=checkMarine(rowing,null,Math.PI);
 assert(rowPose.pose.hands[0].distanceTo(rowPose.pose.hands[1])>.2,
  'Rems independents: la mà esquerra i dreta segueixen cada pala');
 rowing.pedalPhase=1.8;
 checkMarine(rowing,null,Math.PI);
 // El remador dispara amb la pistola pròpia, sense modificar el
 // contracte d'origen físic, però la mà V18 continua el gest.
 const rowShot=driver.firePistol(rowing,()=>null);
 assert(rowShot?.origin?.toArray().every(Number.isFinite),
  'Pistola del remador continua disparant des del punt de canó');
 assert(rowShot.origin.distanceTo(
  muzzleMarker.getWorldPosition(new T.Vector3()))<1e-8,
  'La barca de rems fa servir la boca V18 del silenciador');
 assert(gripMarker.getWorldPosition(new T.Vector3()).distanceTo(
  driver.object.userData.riderSeatCanonicalJoints.wristR
   .getWorldPosition(new T.Vector3()))<1e-7,
  'La presa de pistola del remador és al canell V18, no a l\'antiga extremitat');
 const rowFiringPose=checkMarine(rowing);
 const rowFiringExpectedYaw=Math.PI-.52*driver.object.userData.shotBlend;
 assert(Math.abs(Math.atan2(
   Math.sin(driver.object.userData.torso.rotation.y-rowFiringExpectedYaw),
   Math.cos(driver.object.userData.torso.rotation.y-rowFiringExpectedYaw)))<1e-10&&
   Math.abs(rowFiringPose.body.quaternion.dot(
     driver.object.userData.torso.quaternion))>1-1e-9,
  'Després del tick, el gir de tret del remador i del V18 coincideixen');
 const sailBoard=new T.Group(),sailBoom=new T.Group();
 sailBoard.add(sailBoom);
 sailBoard.userData.windsurfRig=sailBoom;
 sailBoard.userData.windsurfGrips=[
  new T.Vector3(-.5,2.5,-.18),new T.Vector3(.5,2.4,-.16)
 ];
 const windsurf={t:'windsurf',o:sailBoard,v:7,pedalPhase:0};
 driver.reset();
 checkMarine(windsurf,null,1.13);
 // Sense el tir, el cos gira 1.13 rad cap a la vela i el turmell
 // manté longitud exacta sota rotació i inclincació.
 driver.reset();
 checkMarine(windsurf,null,1.13);
 const marineBoat={t:'llanxa',o:new T.Group(),v:6,pedalPhase:0};
 const boatCaptain=checkMarine(marineBoat,0);
 assert(boatCaptain.pose.hands.length===2&&
  boatCaptain.pose.feet.length===2,'Llanxa: els quatre destins IK arriben al V18');
 const boatGuest=checkMarine(marineBoat,1);
 assert(boatGuest.hip.x>boatCaptain.hip.x+.5,
  'COOP llanxa: passatger es desplaça al seient dret');
 checkMarine(marineBoat,0);
 const rocketBoat={t:'llanxa_coets',o:new T.Group(),v:4,pedalPhase:0};
 checkMarine(rocketBoat,0);
 const rocketGuest=checkMarine(rocketBoat,1);
 assert(rocketGuest.hip.x>0,'COOP llanxa de coets: passatger a estribord');
 const marineParent=new T.Group();marineParent.position.set(9,3,-7);
 marineParent.rotation.y=.48;marineParent.scale.setScalar(1.25);
 marineParent.add(driver.object);driver.object.updateWorldMatrix(true,true);
 assert(driver.object.userData.riderSeatCanonicalJoints.pelvis
    .getWorldPosition(new T.Vector3()).distanceTo(
      driver.object.userData.torso.getWorldPosition(new T.Vector3()))<1e-7,
  'COOP amb pare girat/escalat: pelvis marítima coincideix amb el seient');
 marineParent.remove(driver.object);
 // La postura nova no depèn de les rotacions dels segments antics.
 const marineJoints=driver.object.userData.riderSeatCanonicalJoints;
 const wrist0=marineJoints.wristR.getWorldPosition(new T.Vector3());
 driver.object.userData.limbs[2].rotation.set(1.4,-.6,.8);
 driver.object.userData.limbs[3].rotation.set(-1.2,.7,-.3);
 driver.object.updateWorldMatrix(true,true);
 assert(wrist0.distanceTo(marineJoints.wristR.getWorldPosition(new T.Vector3()))<1e-7,
  'La mà V18 de llanxa no rep les rotacions de les extremitats V17');
 // El canó nadiu és el mateix en SOLO/COOP, també després del gir
 // i escala d'un pare de presentació que no intervé en la física.
 driver.update({t:'llanxa',o:marineBoat.o,v:0,pedalPhase:0},1/60,1);
 const coopMarineShot=driver.firePistol(marineBoat,()=>[.20,.08,-.97]);
 assert(coopMarineShot?.origin?.distanceTo(
  muzzleMarker.getWorldPosition(new T.Vector3()))<1e-8,
  'COOP: el punt del tret de passatger segueix la boca visible V18');
 assert(gripMarker.getWorldPosition(new T.Vector3()).distanceTo(
  driver.object.userData.riderSeatCanonicalJoints.wristR
   .getWorldPosition(new T.Vector3()))<1e-7,
  'COOP: pistola de llanxa al canell V18, fins i tot amb autoapuntat');
 driver.update({t:'llanxa',o:marineBoat.o,v:0,pedalPhase:0},1/60,0,600);
 assert(!driver.object.userData.riderSeatCanonicalActive&&
  !driver.object.userData.riderSeatCanonicalBody&&
  driver.object.userData.riderFarProxy.visible,
  'LOD llunyà: només figura econòmica, el V18 nàutic s\'oculta');
 driver.reset();
 console.log('PASS V18 native marine riders: jetski, rowboat, windsurf, boats (driver/COOP passenger), fixed lengths, yaw and LOD');
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
  // Els helicòpters KA-60 / MI-24D ja porten dos pilots V18 propis:
  // mesuram l'os del cap i la base real en la geometria final (després
  // del bake) contra les coordenades físiques pures del Worker COOP.
  for(const type of ['heli','heli_combat']){
    const craft=makeVehicle(type),crew=craft.userData.cockpitCrew;
    assert.equal(crew.length,2,'Helicòpter amb dos pilots V18 reals: '+type);
    assert(craft.scale.toArray().every(v=>v===1),'Heli sense reescala del grup');
    for(let seat=0;seat<2;seat++){
      const pilot=crew[seat],joints={};
      pilot.traverse(o=>{
        if(o.userData?.humanMotionJoint)joints[o.userData.humanMotionJoint]=o;
      });
      assert(joints.pelvis&&joints.head&&joints.wristL&&joints.wristR,
       'Pilot de '+type+' amb rig V18 articulat i intacte');
      assert.equal(pilot.userData.humanProposal?.role,'soldier');
      const physicalSeat=vehicleSeatWorld(
        {t:type,x:0,y:0,z:0,hd:0},seat,0),
            physicalHead=vehicleOccupantHeadWorld(
        {t:type,x:0,y:0,z:0,hd:0},seat,0),
            visibleSeat=pilot.getWorldPosition(new T.Vector3()),
            visibleHead=joints.head.getWorldPosition(new T.Vector3()),
            expectedSeat=new T.Vector3(physicalSeat.x,physicalSeat.y,physicalSeat.z),
            expectedHead=new T.Vector3(physicalHead.x,physicalHead.y,physicalHead.z);
      const seatError=visibleSeat.distanceTo(expectedSeat),
            headError=visibleHead.distanceTo(expectedHead);
      console.log('HELI_V18_CREW_ANCHORS',JSON.stringify({
        type,seat,visibleSeat:visibleSeat.toArray(),
        physicalSeat:expectedSeat.toArray(),
        visibleHead:visibleHead.toArray(),
        physicalHead:expectedHead.toArray(),seatError,headError
      }));
      assert(seatError<.012,
       'Ancoratge pilot V18 i hitbox de seient: '+type+'/'+seat+' error '+seatError);
      assert(headError<.012,
       'Cap del pilot V18 i hitbox balística: '+type+'/'+seat+' error '+headError);
    }
    // Tant la fabricació visual com el Worker transformen els ancoratges
    // amb el mateix sistema de coordenades de vehicle en gir i alçada.
    craft.position.set(7,3,-8);craft.rotation.y=.73;
    craft.updateWorldMatrix(true,true);
    for(let seat=0;seat<2;seat++){
      const actor=crew[seat],joints={};
      actor.traverse(o=>{
        if(o.userData?.humanMotionJoint)joints[o.userData.humanMotionJoint]=o;
      });
      const state={t:type,x:7,y:3,z:-8,hd:.73},
            p=vehicleSeatWorld(state,seat,3),
            h=vehicleOccupantHeadWorld(state,seat,3);
      assert(actor.getWorldPosition(new T.Vector3()).distanceTo(
        new T.Vector3(p.x,p.y,p.z))<.012,
        'Seient V18 de l\'helicòpter girat '+type+'/'+seat);
      assert(joints.head.getWorldPosition(new T.Vector3()).distanceTo(
        new T.Vector3(h.x,h.y,h.z))<.012,
        'Head hitbox V18 de l\'helicòpter girat '+type+'/'+seat);
    }
  }
  console.log('PASS V18 helicopter cockpit pilots and shared SOLO/COOP hitbox anchors');
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
 // Els comandos militars reals neixen amb fit 0.8: la talla de
 // cabina històrica el reemplaçava, no feia 0.8 * mida de vehicle.
 old.scale.setScalar(size);
 actual.scale.setScalar(.8);
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
 assert.equal(actual.userData.humanCrewFactoryScale,.8,
  'La talla V18 de la fàbrica militar és substituïda, no multiplicada');
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
  HUNTER_VEHICLE_OCCUPANT_DAMAGE:crewPhysics,
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
  const boatAvatarHead=crew.rider.userData.head.getWorldPosition(new T.Vector3()),
    boatState={t:'patrulla_marina',x:0,y:0,z:0,hd:0,
      marineCrewHp:[4,4],marineBrokenWindshield:[0,1,2]},
    boatHitHead=marineCrewHeadWorld(boatState,seat,0),
    mount=enemyCrewLocalSeat('patrulla_marina',seat);
  assert(boatAvatarHead.distanceTo(new T.Vector3(
    boatHitHead.x,boatHitHead.y,boatHitHead.z))<1e-5,
    'Cap del patruller V18 i hitbox coincidents: '+seat);
  assert(crew.rider.position.distanceTo(new T.Vector3(
    mount.x,mount.y,mount.z))<1e-8,
    'El muntatge de patrullera comparteix coordenades amb el Worker');
  const headContact=marineCrewProjectileContact(
    {x:boatHitHead.x,y:boatHitHead.y,z:boatHitHead.z-5},
    {x:boatHitHead.x,y:boatHitHead.y,z:boatHitHead.z+3},boatState);
  assert(headContact?.kind==='marine-crew'&&headContact.seat===seat,
    'Una bala a l\'altura del cap real arriba al patruller '+seat);
 const muzzle=crewSandbox.__boatMuzzle(boat,seat);
 assert(muzzle.distanceTo(crew.muzzle.getWorldPosition(new T.Vector3()))<1e-8,
  'Muzzle de patrullera i arma real en el mateix punt');
}
const rotatedMarineActor=marine.boatWeapons[0].rider;
boat.position.set(7,2,-4);boat.rotation.y=.57;boat.updateWorldMatrix(true,true);
const rotatedMarineHead=marineCrewHeadWorld(
 {t:'patrulla_marina',x:7,z:-4,y:2,hd:.57},0,2);
assert(rotatedMarineActor.userData.head.getWorldPosition(new T.Vector3()).distanceTo(
 new T.Vector3(rotatedMarineHead.x,rotatedMarineHead.y,rotatedMarineHead.z))<1e-5,
 'El centre del cap de patrullera segueix el gir i trasllat real');
boat.position.set(0,0,0);boat.rotation.y=0;boat.updateWorldMatrix(true,true);
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
for(const [type,size]of [['cotxe',.43],['cotxe_civil',.43],
 ['camio',.31],['moto',.52]]){
 const vehicle=new T.Group();
 if(type==='camio')vehicle.userData.truckCabin=TRUCK_CABIN;
 const occupants=attachCarCrew(vehicle,{type});
 for(const [seat,avatar] of [occupants.driver,occupants.gunner].entries()){
  if(!avatar)continue;
  const head=avatar.userData.head.getWorldPosition(new T.Vector3()),
    state={t:type,x:0,y:0,z:0,hd:0,
      brokenVehicleWindows:[0,1]},
    center=vehicleOccupantHeadWorld(state,seat,0),
    mount=vehicleSeatWorld(state,seat,0);
  assert(head.distanceTo(new T.Vector3(center.x,center.y,center.z))<1e-5,
    'Cap V18 coincident amb la hitbox: '+type+'/'+seat);
  assert(avatar.position.distanceTo(
    new T.Vector3(mount.x,mount.y,mount.z))<1e-8,
    'Seient real coincideix amb la hitbox: '+type+'/'+seat);
  const contact=vehicleSeatProjectileContact(
    {x:center.x,y:center.y,z:center.z-4},
    {x:center.x,y:center.y,z:center.z+3},state,
    seat===0?[{hp:4}]:[{hp:0},{hp:4}]);
  assert(contact?.kind==='vehicle-occupant'&&contact.seat===seat,
    'Tret al cap V18 efectiu: '+type+'/'+seat);
 }
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
// El solc físic i la figura d'un vehicle girat han de coincidir,
 // sense escalar la distància al centre en canviar el rumb o la Y.
 const rotatedBoat={t:'patrulla_marina',x:0,y:0,z:0,hd:0,
   marineCrewHp:[4,4],marineBrokenWindshield:[]};
 const windshieldHead=marineCrewHeadWorld(rotatedBoat,0,0);
 const windshieldFrom={x:windshieldHead.x,y:windshieldHead.y,z:-5};
 const windshieldTo={x:windshieldHead.x,y:windshieldHead.y,z:4};
 const glassFirst=marineCrewProjectileContact(
   windshieldFrom,windshieldTo,rotatedBoat);
 assert(glassFirst?.kind==='marine-glass',
   'El vidre real cobreix primer el cap V18 del patruller');
 rotatedBoat.marineBrokenWindshield=[0,1,2];
 const riderAfterGlass=marineCrewProjectileContact(
   windshieldFrom,windshieldTo,rotatedBoat);
 assert(riderAfterGlass?.kind==='marine-crew'&&riderAfterGlass.seat===0,
   'Després de trencar el vidre, la bala arriba al cap V18');
 const vehicleGlass={t:'cotxe',x:0,y:0,z:0,hd:0},
   driverHit=vehicleOccupantHeadWorld(vehicleGlass,0,0),
   fromWindow={x:driverHit.x,y:driverHit.y,z:driverHit.z-4},
   toWindow={x:driverHit.x,y:driverHit.y,z:driverHit.z+4};
 const firstWindow=vehicleSeatProjectileContact(fromWindow,toWindow,
   vehicleGlass,[{hp:4},{hp:0}]);
 assert(firstWindow?.kind==='vehicle-glass'&&firstWindow.seat===0,
   'Cotxe: primer el vidre davant la cara V18');
 vehicleGlass.brokenVehicleWindows=[0];
 const afterWindow=vehicleSeatProjectileContact(fromWindow,toWindow,
   vehicleGlass,[{hp:4},{hp:0}]);
 assert(afterWindow?.kind==='vehicle-occupant'&&afterWindow.seat===0,
   'Cotxe: després del vidre, la bala arriba al soldat V18');
assert.equal(COMMANDO_HEAD_PIVOT_HEIGHT,3.26,
 'Alçada geomètrica del cap V18 fixa, no 2.65*VS');
console.log('PASS hitboxes V18 nadiues: cap, malucs, projectils, girs i seients dels comandaments');
console.log('PASS tripulants V18 nadius: GAZ/camió/moto, patrulleres, dos seients, malles i canons');

// El general manté EXACTAMENT la seva mida, postura i LOD després
// de coure la reducció 0.8 dins geometria i pivots articulats.
function generalNativeFixture(){
 const g=runtime.suppress(()=>playerModel.create(T,{headVariant:'compactD'}));
 const u=g.userData;
 const gun=new T.Group();gun.name='general-gun';
 gun.position.set(0,-.6195,-.035);u.aer.add(gun);u.gun=gun;
 const bore=new T.Object3D();bore.name='general-bore';bore.position.set(0,.12,-.93);gun.add(bore);
 runtime.install(T,g,{role:'general'});
 const full=new T.Group();full.name='hunter-enemy-full';
 for(const child of [...g.children])full.add(child);
 g.add(full);
 const mid=new T.Mesh(new T.BoxGeometry(.76,2.58,.53),
  new T.MeshStandardMaterial({color:0x681d30}));
 const far=new T.Mesh(new T.BoxGeometry(.61,2.27,.48),
  new T.MeshStandardMaterial({color:0x812735}));
 mid.position.y=1.45;far.position.y=1.30;
 g.add(mid,far);
 u.enemyFullRoot=full;u.enemyMidMesh=mid;u.enemyFarMesh=far;
 g.position.set(9,.6,-6);g.rotation.y=.41;g.scale.setScalar(.8);
 u.ar.rotation.set(.48,0,-.13);u.lr.rotation.x=-.37;u.lkr.rotation.x=-.61;
 return g;
}
const officerLegacy=generalNativeFixture(),officerNative=generalNativeFixture();
const officerWorld=()=>new T.Box3().setFromObject(officerLegacy,true);
const expectedOfficerBounds=officerWorld();
const compareOfficer=()=>{
 officerLegacy.updateWorldMatrix(true,true);
 officerNative.updateWorldMatrix(true,true);
 const a=new T.Box3().setFromObject(officerNative,true),
       b=new T.Box3().setFromObject(officerLegacy,true);
 assert(a.min.distanceTo(b.min)<1e-5&&a.max.distanceTo(b.max)<1e-5,
  'El general natiu conserva la mida del model antic també en moviment');
 for(const joint of ['head','ar','aer','lr','lkr']){
  const before=officerLegacy.userData[joint].getWorldPosition(new T.Vector3()),
    after=officerNative.userData[joint].getWorldPosition(new T.Vector3());
  assert(before.distanceTo(after)<1e-5,'Articulació del general '+joint+' estable');
 }
 const m1=officerLegacy.getObjectByName('general-bore')
   .getWorldPosition(new T.Vector3());
 const m2=officerNative.getObjectByName('general-bore')
   .getWorldPosition(new T.Vector3());
 assert(m1.distanceTo(m2)<1e-5,
  'El general conserva la boca de foc original en la mateixa posició');
 const lodA=officerLegacy.userData.enemyMidMesh,
       lodB=officerNative.userData.enemyMidMesh;
 assert(new T.Box3().setFromObject(lodA,true).getSize(new T.Vector3())
  .distanceTo(new T.Box3().setFromObject(lodB,true).getSize(new T.Vector3()))<1e-5,
  'Variant LOD mitjana del general amb dimensions idèntiques');
};
assert.equal(runtime.normalizeOnFootEnemy(officerNative,{role:'general'}),officerNative);
assert.deepEqual(officerNative.scale.toArray(),[1,1,1],
 'General a peu amb escala d’arrel unitària');
assert.equal(officerNative.userData.humanOnFootNativeScale,.8);
assert.equal(officerNative.userData.humanOnFootLodNormalized,true);
assert.equal(runtime.normalizeOnFootEnemy(officerNative,{role:'general'}),officerNative,
 'Una sola normalització per general');
assert.deepEqual(officerWorld().min.toArray(),expectedOfficerBounds.min.toArray());
compareOfficer();
for(const g of [officerLegacy,officerNative]){
 const u=g.userData;
 u.ar.rotation.x=-.78;u.aer.rotation.x=.64;u.lr.rotation.x=.32;
 u.lkr.rotation.x=-1.12;u.head.rotation.y=.42;
}
compareOfficer();
assert.throws(()=>runtime.normalizeOnFootEnemy(officerNative,{role:'soldier'}),
 /Rol d’enemic a peu canviat/);
console.log('PASS general V18 natiu: escala, cap, braços, genolls, arma i LOD sense canvis');

// Soldats normals/elit: arrel 0.8 eliminada DESPRÉS del LOD i sense
// clonar repetidament les geometries compartides de malles fusionades.
const sharedInfantryMid=new T.BoxGeometry(.76,2.58,.53),
      sharedInfantryFar=new T.BoxGeometry(.61,2.27,.48);
function infantryFixture(){
 const g=nativeSoldier(),u=g.userData;
 const full=new T.Group();full.name='hunter-enemy-full';
 for(const child of [...g.children])full.add(child);
 g.add(full);
 const mat=new T.MeshStandardMaterial({color:0x52664c});
 const mid=new T.Mesh(sharedInfantryMid,mat),
       far=new T.Mesh(sharedInfantryFar,mat);
 mid.position.y=1.45;far.position.y=1.30;
 g.add(mid,far);
 u.enemyFullRoot=full;u.enemyMidMesh=mid;u.enemyFarMesh=far;
 u.profile='enemy-commando-approved';
 g.position.set(2,.6,-9);g.rotation.y=.27;g.scale.setScalar(.8);
 u.ar.rotation.x=1.18;u.aer.rotation.x=.52;
 u.ll.rotation.x=.76;u.lkl.rotation.x=-1.18;
 return g;
}
const infantryLegacy=infantryFixture(),infantryNative=infantryFixture();
const expectedInfantry=new T.Box3().setFromObject(infantryLegacy,true);
runtime.normalizeOnFootEnemy(infantryNative,{role:'soldier'});
assert.deepEqual(infantryNative.scale.toArray(),[1,1,1],
 'Infanteria V18: no cal escala d’arrel');
assert.equal(infantryNative.userData.humanOnFootNativeScale,.8);
let intrinsicInfantry=new T.Box3().setFromObject(infantryNative,true);
assert(intrinsicInfantry.min.distanceTo(expectedInfantry.min)<1e-5&&
 intrinsicInfantry.max.distanceTo(expectedInfantry.max)<1e-5,
 'La infanteria normal preserva el contorn, amb els mateixos LOD');
for(const joint of ['head','ar','aer','ll','lkl']){
 assert(infantryLegacy.userData[joint].getWorldPosition(new T.Vector3())
  .distanceTo(infantryNative.userData[joint].getWorldPosition(new T.Vector3()))<1e-6,
  'Ossos V18 de soldat al mateix lloc: '+joint);
}
const secondInfantry=infantryFixture();
runtime.normalizeOnFootEnemy(secondInfantry,{role:'soldier'});
assert.equal(secondInfantry.userData.enemyMidMesh.geometry,
 infantryNative.userData.enemyMidMesh.geometry,
 'La geometria de LOD es comparteix i no es multiplica per soldat');
assert.equal(secondInfantry.userData.enemyFarMesh.geometry,
 infantryNative.userData.enemyFarMesh.geometry,
 'Cache de nivell llunyà per a totes les unitats');
const elfGeometry=()=>new T.MeshStandardMaterial({color:0x3c4435});
const boxInfantry=(parent,w,h,d,color,x=0,y=0,z=0)=>{
 const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),elfGeometry());
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
};
const rocketWindow={HUNTER_HUMAN_V17:runtime,HUNTER_PALETTE:{}};
const rocketSandbox={window:rocketWindow};
runInNewContext(readFileSync(new URL('../src/characters.js',import.meta.url),'utf8'),
 rocketSandbox);
const bazookaFactory=rocketWindow.HUNTER_CHARACTERS.equipBazooka;
bazookaFactory(T,infantryLegacy,{box:boxInfantry});
bazookaFactory(T,infantryNative,{box:boxInfantry});
const oldRocket=infantryLegacy.userData.bazooka,
      newRocket=infantryNative.userData.bazooka;
assert.deepEqual(newRocket.scale.toArray(),[1,1,1],
 'Bazuca del soldat a peu en geometria nativa, sense corrector');
assert.equal(newRocket.userData.humanEnemyAttachmentScale,.8,
 'Talla del bazuca incorporada a la geometria una sola vegada');
for(const hand of ['rightGrip','leftGrip']){
 const a=infantryLegacy.userData.enemyBazookaIK[hand]
  .getWorldPosition(new T.Vector3());
 const b=infantryNative.userData.enemyBazookaIK[hand]
  .getWorldPosition(new T.Vector3());
 assert(a.distanceTo(b)<1e-5,'Presa del bazuca '+hand+' sense desplaçar');
}
const oldTip=oldRocket.localToWorld(new T.Vector3(0,0,-1.66)),
 newTip=newRocket.localToWorld(new T.Vector3(0,0,-1.66*.8));
assert(oldTip.distanceTo(newTip)<1e-5,
 'El canó del bazuca conserva el punt d’impacte directe');
for(const kind of ['enemyMidMesh','enemyFarMesh']){
 const a=infantryLegacy.userData[kind],b=infantryNative.userData[kind];
 const boxA=new T.Box3().setFromObject(a,true),boxB=new T.Box3().setFromObject(b,true);
 assert(boxA.min.distanceTo(boxB.min)<1e-5&&
 boxA.max.distanceTo(boxB.max)<1e-5,
  'Tub del bazuca visible al LOD '+kind+' a la mida original');
}
const afterRocketA=new T.Box3().setFromObject(infantryLegacy,true),
      afterRocketB=new T.Box3().setFromObject(infantryNative,true);
assert(afterRocketA.min.distanceTo(afterRocketB.min)<1e-5&&
 afterRocketA.max.distanceTo(afterRocketB.max)<1e-5,
 'El soldat antitanc i els seus tres LOD tenen el mateix volum');
assert.equal(infantryNative.userData.enemyBazookaIK.forearmLength,.62*.8,
 'Longitud nativa del braç de suport del bazuca');
console.log('PASS soldat V18 natiu: normal, bazuca tardà, mans, canó, LOD i geometries compartides');

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
// La migració es fa DESPRÉS de generar el full/mid/far de
// createSoldier: no és correcte fer-la al createCommando compartit
// perquè els requisadors i soldats amb bazuca encara tenen altres mounts.
globalThis.HUNTER_CHARACTERS=Object.freeze({
 createCommando(T){return playerModel.create(T)},
 createSoldier(T,{general=false,elite=false}={}){
  const o=general?globalThis.HUNTER_GENERAL_MODEL.create(T):this.createCommando(T);
  if(elite&&!general){
   o.userData.eliteSoldier=true;
   const plate=new T.Mesh(new T.BoxGeometry(1.16,.62,.44),
    new T.MeshStandardMaterial({color:0x303f37}));
   plate.position.set(0,2.63,-.37);o.add(plate);
  }
  o.scale.setScalar(.8);
  o.userData.profile=general?'general-approved-thick-epaulettes':
   'enemy-commando-approved';
  o.userData.enemyFullRoot=new T.Group();
  o.userData.enemyMidMesh=new T.Mesh(new T.BoxGeometry(.4,1,.4),
   new T.MeshStandardMaterial());
  o.userData.enemyFarMesh=new T.Mesh(new T.BoxGeometry(.3,.8,.3),
   new T.MeshStandardMaterial());
  o.add(o.userData.enemyFullRoot,o.userData.enemyMidMesh,
   o.userData.enemyFarMesh);
  return o;
 }
});
const generalFactory=globalThis.HUNTER_CHARACTERS.createSoldier(T,{general:true});
assert.equal(generalFactory.userData.humanOnFootNativeRole,'general',
 'La fàbrica real d’enemics normalitza el general després dels tres LOD');
assert.deepEqual(generalFactory.scale.toArray(),[1,1,1]);
const infantryFactory=globalThis.HUNTER_CHARACTERS.createSoldier(T,{general:false});
assert.equal(infantryFactory.userData.humanOnFootNativeRole,'soldier',
 'Els soldats normals també normalitzen les variants full/mid/far');
assert.deepEqual(infantryFactory.scale.toArray(),[1,1,1]);
const eliteFactory=globalThis.HUNTER_CHARACTERS.createSoldier(T,{elite:true});
assert.equal(eliteFactory.userData.humanOnFootNativeRole,'soldier',
 'L’elit es normalitza després de rebre armadura i metralladora');
assert.equal(eliteFactory.userData.eliteSoldier,true);
assert.deepEqual(eliteFactory.scale.toArray(),[1,1,1]);
const driverCrew=globalThis.HUNTER_CHARACTERS.createCommando(T);
assert.equal(driverCrew.userData.humanOnFootNativeRole,undefined,
 'Comandos de vehicles i llanxes continuen amb escala provisional de cabina');

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


// La fàbrica de joc (no un doble de codi) comprova que una direcció
// temporalment nul·la no envia la pistola cap a l'antic y=3.10.
// La meta s'ha de derivar del V18 fins i tot el primer fotograma COOP.
// Cisalla geomètrica real: els marcadors i les dues fulles formen part
// de la mateixa fàbrica que fa servir el joc, no d'un stub de proves.
const cuttersTestWindow={};
runInNewContext(readFileSync(new URL('../src/bolt-cutters.js',import.meta.url),'utf8'),
 {window:cuttersTestWindow});
const characterWindow={
 HUNTER_PLAYER_MODEL:playerModel,
 HUNTER_PALETTE:gamePalette,
 HUNTER_BOLT_CUTTERS:cuttersTestWindow.HUNTER_BOLT_CUTTERS,
 HUNTER_PLAYER_BATCH:{optimize:()=>({before:0,after:0})}
};
const characterContext={window:characterWindow,THREE:T};
runInNewContext(readFileSync(new URL('../src/characters.js',import.meta.url),'utf8'),characterContext);
const characterBox=(parent,w,h,d,color,x=0,y=0,z=0)=>{
 const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),
  new T.MeshStandardMaterial({color}));
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
};
const gameAvatar=characterWindow.HUNTER_CHARACTERS.createPlayer(T,{
 box:characterBox,palette:gamePalette
});
assert(gameAvatar.userData.humanGameCanonicalJoints,
 'Les articulacions V18 existeixen abans de preparar l’arma');
const controls=characterWindow.HUNTER_CHARACTERS;
// Fotograma zero real: encara no s'ha fet cap lerp/normalize de la mira.
const controlOptions={forward:0,strafe:0,dt:0,swimming:false,
 inVehicle:false,ammo:12};
gameAvatar.userData.pistolAimTime=1;
gameAvatar.userData.visualAimSmoothed.set(0,0,0);
controls.animatePlayerControls(gameAvatar,controlOptions);
const firstAim=gameAvatar.userData.pistolRig.nativeGoal;
assert(firstAim&&firstAim.toArray().every(Number.isFinite),
 'Sense autoapuntat inicial, la pistola encara té un objectiu V18 real');
assert(gameAvatar.userData.visualAimSmoothed.lengthSq()<.1,
 'L’escena de prova realment exercita la pèrdua temporal d’autoaim');
const initialAim=firstAim.clone();
gameAvatar.rotation.y=Math.PI/2;
gameAvatar.userData.visualAimSmoothed.set(0,0,0);
controls.animatePlayerControls(gameAvatar,controlOptions);
assert(gameAvatar.userData.pistolRig.nativeGoal.distanceTo(initialAim)>.3,
 'La meta V18 de la pistola segueix el rumb mundial i no el nord antic');
// Amb els fusells reals del jugador, la balística de les dues armes
// apunta al pivot de la malla V18: no al fusell ocult del controlador.
const muzzleUser=gameAvatar.userData;
muzzleUser.gun.visible=false;
for(const kind of ['assault','sniper']){
 const source=muzzleUser[kind],muzzle=muzzleUser[kind+'Muzzle'];
 source.visible=true;
 gameAvatar.position.set(4,1.5,-6);gameAvatar.rotation.y=.48;
 updateHuman(gameAvatar);
 const proxy=muzzleUser.humanGameCanonicalRig.getObjectByName('Arma canònica · '+kind);
 const anchor=proxy.getObjectByName('hunter-'+kind+'-muzzle');
 assert(proxy.visible&&anchor&&muzzle,
  'El model V18 dibuixat té una boca pròpia per '+kind);
 const origin=runtime.nativeRifleMuzzleWorld(T,gameAvatar,kind);
 assert(origin?.distanceTo(anchor.getWorldPosition(new T.Vector3()))<1e-8,
  'Les bales de '+kind+' surten del canó V18, no d\'una coordenada aproximada');
 const initial=origin.clone();
 // Moure el fusell ocult sense canviar la direcció no pot desplaçar la
 // geometria nativa: el seu muntatge deriva de l'espatlla V18.
 source.position.add(new T.Vector3(2,.8,-1));
 updateHuman(gameAvatar);
 const after=runtime.nativeRifleMuzzleWorld(T,gameAvatar,kind);
 assert(after.distanceTo(initial)<1e-6,
  'La boca V18 '+kind+' és independent de la translació del control ocult');
 source.position.add(new T.Vector3(-2,-.8,1));
 // La posició de COOP es pot reparentar sense desalinear el canó.
 const parent=new T.Group();
 parent.position.set(-11,2,3);parent.rotation.y=.65;parent.scale.setScalar(1.3);
 parent.add(gameAvatar);
 updateHuman(gameAvatar);
 const coop=runtime.nativeRifleMuzzleWorld(T,gameAvatar,kind);
 assert(coop.distanceTo(anchor.getWorldPosition(new T.Vector3()))<1e-8,
  'Canó V18 '+kind+' conserva l\'origen en espai mundial COOP');
 parent.remove(gameAvatar);
 source.visible=false;
 updateHuman(gameAvatar);
 assert.equal(runtime.nativeRifleMuzzleWorld(T,gameAvatar,kind),null,
  'El contracte natiu només exposa l\'arma '+kind+' equipada');
}
muzzleUser.gun.visible=true;
gameAvatar.position.set(0,0,0);gameAvatar.rotation.y=0;
updateHuman(gameAvatar);
assert.equal(runtime.nativeRifleMuzzleWorld(T,gameAvatar,'bazooka'),null,
 'El contracte rebutja armes sense boca V18 migrada');
console.log('PASS native V18 rifle muzzles assault/SV-98 and COOP transforms');
// Les boques dels canons de pistola silenciada i bazuca són del V18 real,
// no del controlador ocult ni de la posició provisional del jugador.
const weaponMuzzleActors=gameAvatar.userData;
const realCombatSource=readFileSync(new URL('../src/combat.js',import.meta.url),'utf8');
assert(realCombatSource.includes("nativeWeaponMuzzleWorld?.(THREE,pl,'gun')")&&
       realCombatSource.includes("nativeWeaponMuzzleWorld?.(THREE,pl,'bazooka')"),
 'El combat SOLO consulta les dues boques V18 reals');
for(const [kind,anchorName] of [['gun','hunter-pistol-muzzle'],
                                ['bazooka','hunter-bazooka-muzzle']]){
 for(const other of ['gun','bazooka','assault','sniper'])if(weaponMuzzleActors[other])
  weaponMuzzleActors[other].visible=other===kind;
 gameAvatar.position.set(2.3,1.2,-8.5);gameAvatar.rotation.y=.62;
 updateHuman(gameAvatar);
 const source=weaponMuzzleActors[kind],visual=weaponMuzzleActors.humanGameCanonicalRig
  .getObjectByName('Arma canònica · '+kind);
 const anchor=visual?.getObjectByName(anchorName);
 assert(visual?.visible&&anchor,'La boca V18 del '+kind+' està definida al generador');
 assert.deepEqual(visual.scale.toArray(),[1,1,1],
  'La pistola i el bazuca V18 conserven l\'escala unitària: '+kind);
 const before=runtime.nativeWeaponMuzzleWorld(T,gameAvatar,kind);
 assert(before?.distanceTo(anchor.getWorldPosition(new T.Vector3()))<1e-8,
  'El punt de tret de '+kind+' és l\'extrem del canó visible');
 source.position.add(new T.Vector3(4,.6,-1));
 updateHuman(gameAvatar);
 assert(runtime.nativeWeaponMuzzleWorld(T,gameAvatar,kind).distanceTo(before)<1e-6,
  'El punt de tret de '+kind+' no depèn de traslladar el controlador ocult');
 source.position.sub(new T.Vector3(4,.6,-1));
 const coopParent=new T.Group();
 coopParent.position.set(-12,3,17);coopParent.rotation.y=-.45;
 coopParent.scale.setScalar(1.25);coopParent.add(gameAvatar);
 updateHuman(gameAvatar);
 assert(runtime.nativeWeaponMuzzleWorld(T,gameAvatar,kind).distanceTo(
   anchor.getWorldPosition(new T.Vector3()))<1e-7,
  'La boca de '+kind+' segueix el pare transformat COOP');
 coopParent.remove(gameAvatar);
 source.visible=false;updateHuman(gameAvatar);
 assert.equal(runtime.nativeWeaponMuzzleWorld(T,gameAvatar,kind),null,
  'El contracte de '+kind+' no pot usar una arma desequipada');
}
weaponMuzzleActors.gun.visible=true;
gameAvatar.position.set(0,0,0);gameAvatar.rotation.y=0;
updateHuman(gameAvatar);
assert.equal(runtime.nativeWeaponMuzzleWorld(T,gameAvatar,'knife'),null,
 'El contracte V18 no inventa una boca per a armes sense canó');
console.log('PASS pistol silencer + bazooka muzzle on native V18; hidden guards, no legacy translation, COOP');
// Three.js angleTo() calcula acos(dot) i pot retornar ~3e-8 rad
// per quaternions IDÈNTICS quan el dot és 0.9999999999999999.
// La distància de components (amb equivalència q/-q) detecta
// desviacions reals sense aquest error de condicionament numèric.
const actionQuaternionGap=(a,b)=>{
 const d=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z,a.w-b.w);
 const opposite=Math.hypot(a.x+b.x,a.y+b.y,a.z+b.z,a.w+b.w);
 return Math.min(d,opposite);
};
// Animacions d'acció nadiues: el tick clàssic transmet OBJECTIUS
// anatòmics i el V18 guarda la seva interpolació pròpia. No pot llegir
// els angles dels braços ocults ni recalcular-la en cada render.
const actionAvatar=gameAvatar,actionU=actionAvatar.userData,
 actionJ=actionU.humanGameCanonicalJoints;
actionU.pistolAimTime=0;actionU.firePose=0;actionU.meleePose=.48;
controls.animatePlayerControls(actionAvatar,{
 ...controlOptions,dt:.08,forward:1,running:true,knifeEquipped:true
});
assert.equal(actionU.humanGameNativeAction?.kind,'knife',
 'El ganivet 3B/4B crea un estat d\'acció propi al V18');
updateHuman(actionAvatar);
const knifeArmPose=actionJ.shoulderR.quaternion.clone(),
 knifeLeftPose=actionJ.elbowL.quaternion.clone();
const knifeNative=actionU.humanGameCanonicalRig.getObjectByName('Arma canònica · knife');
assert(knifeNative?.visible&&knifeNative.parent===actionJ.wristR&&
 knifeNative.userData.humanActionNativeOriented,
 'El ganivet es munta al canell V18 sense quaternion de l\'avantbraç antic');
assert.deepEqual(knifeNative.scale.toArray(),[1,1,1]);
const knifeWorldQ=knifeNative.getWorldQuaternion(new T.Quaternion()).clone();
actionU.ar.rotation.set(2.3,-1.1,-1.5);
actionU.aer.rotation.set(-1.8,.3,.9);
actionU.al.rotation.set(-.8,1.3,-.4);
actionU.ael.rotation.set(1.9,-.5,.7);
updateHuman(actionAvatar);
assert(actionQuaternionGap(knifeArmPose,actionJ.shoulderR.quaternion)<1e-10&&
 actionQuaternionGap(knifeLeftPose,actionJ.elbowL.quaternion)<1e-10,
 'Els braços V18 del ganivet no copien les rotacions alterades del V17');
assert(actionQuaternionGap(knifeWorldQ,knifeNative.getWorldQuaternion(new T.Quaternion()))<1e-10,
 'La fulla V18 manté direcció tot i girar els ossos ocults');
updateHuman(actionAvatar);
assert(actionQuaternionGap(knifeArmPose,actionJ.shoulderR.quaternion)<1e-10,
 'Dos renders consecutius no avancen la interpolació del ganivet');

// La granada té fases de preparació, impuls i contrapès; el canell dret
// natiu determina el punt de sortida que utilitza el combat.
actionU.meleePose=0;actionU.grenadeThrow=.55;actionU.grenadeThrowPower=1;
actionU.grenadeReleased=false;
controls.animatePlayerControls(actionAvatar,{
 ...controlOptions,dt:.07,forward:0,grenadeEquipped:true,grenadeChargePower:.85
});
assert.equal(actionU.humanGameNativeAction?.kind,'grenade',
 'La granada crea el seu propi estat d\'acció V18');
updateHuman(actionAvatar);
const grenadeNative=actionU.humanGameCanonicalRig.getObjectByName('Arma canònica · grenade');
assert(grenadeNative?.visible&&grenadeNative.parent===actionJ.wristR&&
 grenadeNative.userData.humanActionNativeOriented,
 'La granada es recolza al canell V18 i té orientació nativa');
assert.deepEqual(grenadeNative.scale.toArray(),[1,1,1]);
const grenadeArm=actionJ.shoulderR.quaternion.clone(),
 grenadeLeft=actionJ.shoulderL.quaternion.clone(),
 grenadeWrist=actionJ.wristR.getWorldPosition(new T.Vector3()),
 grenadeWeaponQ=grenadeNative.getWorldQuaternion(new T.Quaternion()).clone();
actionU.ar.rotation.set(-2,1.5,.9);
actionU.aer.rotation.set(1.8,-.8,-1.1);
actionU.al.rotation.set(2.4,-.8,1);
actionU.ael.rotation.set(-1.1,.6,1.2);
updateHuman(actionAvatar);
assert(actionQuaternionGap(grenadeArm,actionJ.shoulderR.quaternion)<1e-10&&
 actionQuaternionGap(grenadeLeft,actionJ.shoulderL.quaternion)<1e-10,
 'La granada no hereta la postura manipulada del V17');
assert(grenadeWrist.distanceTo(actionJ.wristR.getWorldPosition(new T.Vector3()))<1e-8,
 'El punt real de llançament depèn del canell V18, no dels braços antics');
assert(actionQuaternionGap(grenadeWeaponQ,grenadeNative.getWorldQuaternion(new T.Quaternion()))<1e-10,
 'La granada visible conserva l\'orientació pròpia');

// L'activació i la desactivació es fan al tick, mai al renderer.
controls.animatePlayerControls(actionAvatar,{
 ...controlOptions,dt:.05,forward:0,ammo:12
});
assert.equal(actionU.humanGameNativeAction?.kind,'grenade',
 'Llançament en curs: la granada completa el seguiment dels braços V18 encara que es desequipi');
actionU.grenadeThrow=0;
controls.animatePlayerControls(actionAvatar,{
 ...controlOptions,dt:.05,forward:0,ammo:12
});
assert.equal(actionU.humanGameNativeAction,null,
 'Final del llançament: cap estat especial enganxat als braços');
controls.animatePlayerControls(actionAvatar,{
 ...controlOptions,dt:.05,forward:0,swimming:true
});
assert.equal(actionU.humanGameNativeAction,null,
 'Natació desactiva les postures de ganivet i granada');
console.log('PASS V18 knife 3B/4B and grenade action arms, blade/grenade attachment and legacy independence');
// La cisalla deixa d'utilitzar la rotació del controlador ocult per
// orientar el model visible, i deixa de copiar els angles de fulles V17.
// Les dues mans són resoltes per la mateixa IK dels fusells V18.
actionU.gameSwimBlend=0;actionU.gameSwimActive=false;
actionU.grenadeThrow=0;actionU.cisallaCut=.34;
controls.animatePlayerControls(actionAvatar,{
 ...controlOptions,dt:.016,forward:0,cisallaEquipped:true
});
updateHuman(actionAvatar);
const cutterSource=actionU.cisalla;
const cutterVisual=actionU.humanGameCanonicalRig.getObjectByName('Arma canònica · cisalla');
const cutterPose=actionU.humanGameNativeCutterSupport;
assert(cutterVisual?.visible&&cutterVisual.parent===actionJ.spine&&
 cutterVisual.userData.humanCutterNativeMounted&&
 cutterVisual.userData.humanCutterNativeOriented,
 'La cisalla real s\'ancora i s\'orienta al tors V18');
assert.deepEqual(cutterVisual.scale.toArray(),[1,1,1],
 'La cisalla visible conserva escala nativa 1 sense correccions per frame');
assert(cutterPose&&Number.isFinite(cutterPose.leftDistance)&&
 Number.isFinite(cutterPose.rightDistance)&&cutterPose.rootScale===1,
 'La cisalla comparteix IK nativa en totes dues mans');
const closing=actionU.humanGameNativeCutterClosing;
assert(Math.abs(cutterPose.closing-closing)<1e-10,
 'El V18 llegeix l\'estat de tall, no els quaternions de fulla antics');
assert(Math.abs(cutterVisual.children[0].rotation.z-(-.16+.24*closing))<1e-10&&
 Math.abs(cutterVisual.children[1].rotation.z-(.16-.24*closing))<1e-10,
 'Les fulles V18 obren i tanquen directament amb el valor natiu');
const cutterOrientation=cutterVisual.quaternion.clone();
const cutterR=actionJ.shoulderR.quaternion.clone(),
 cutterL=actionJ.shoulderL.quaternion.clone();
const cutterTipR=cutterVisual.getObjectByName('hunter-cutter-handle-right-end');
assert(cutterTipR,'La presa de la cisalla V18 existeix al model geomètric');
const cutterTipWorld=cutterTipR.getWorldPosition(new T.Vector3()).clone();
cutterSource.rotation.set(-1.7,.7,1.1);
cutterSource.position.set(10,-3,6);
cutterSource.userData.bladeArms[0].rotation.z=.88;
cutterSource.userData.bladeArms[1].rotation.z=-.92;
actionU.ar.rotation.set(-1.4,1.1,.9);
actionU.al.rotation.set(.3,-1.2,1.5);
updateHuman(actionAvatar);
assert(actionQuaternionGap(cutterOrientation,cutterVisual.quaternion)<1e-10,
 'El gir de la cisalla antiga no modifica el muntatge natiu V18');
assert(actionQuaternionGap(cutterR,actionJ.shoulderR.quaternion)<1e-10&&
 actionQuaternionGap(cutterL,actionJ.shoulderL.quaternion)<1e-10,
 'Ni el control de braços V17 ni la seva orientació mouen la presa de la cisalla');
assert(cutterTipWorld.distanceTo(cutterTipR.getWorldPosition(new T.Vector3()))<1e-8,
 'Els marcadors de mànec V18 no depenen de la translació de la cisalla oculta');
assert(Math.abs(cutterVisual.children[0].rotation.z-(-.16+.24*closing))<1e-10,
 'Modificar les fulles antigues no altera les fulles V18');
const cutterParent=new T.Group();
cutterParent.position.set(8,2,-5);
cutterParent.rotation.y=.66;cutterParent.scale.setScalar(1.2);
cutterParent.add(actionAvatar);updateHuman(actionAvatar);
assert(actionU.humanGameNativeCutterSupport?.rootScale===1&&
 cutterTipR.getWorldPosition(new T.Vector3()).toArray().every(Number.isFinite),
 'La cisalla V18 resta estable en un pare COOP girat i escalat');
cutterParent.remove(actionAvatar);
cutterSource.visible=false;updateHuman(actionAvatar);
assert.equal(actionU.humanGameNativeCutterSupport,null,
 'Sense cisalla equipada, no queden mans ni suport natiu de cisalla');
console.log('PASS V18 cutter mount, blade state, two hands IK, legacy independence and COOP');
console.log('PASS native crouch translation + V18 pistol fallback without legacy coordinates');
