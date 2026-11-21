import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as T from '../vendor/three-r186.module.mjs';
import {playerModel} from '../src/player-model-core.mjs';
import {palette} from '../src/palette-core.mjs';
import {createHumanGameRuntimeV17} from '../src/human-game-runtime-v17.mjs';
import {TRUCK_CABIN,enemyCrewLocalSeat} from '../src/vehicle-crew-anchors.mjs';
import {marineCrewHeadWorld,vehicleOccupantHeadWorld,
 marineCrewProjectileContact,vehicleSeatProjectileContact} from '../src/vehicle-occupant-damage-core.mjs';
import * as crewPhysics from '../src/vehicle-occupant-damage-core.mjs';

// Factories de partida REAL: no stubs de soldados ni malles de prova.
// Els tiradors embarcats mantenen el canó i els muntatges numèrics
// exactes del Worker COOP, però totes les malles viuen al V18.
globalThis.window=globalThis;
globalThis.HUNTER_PLAYER_MODEL=playerModel;
globalThis.HUNTER_PALETTE=palette;
globalThis.HUNTER_VEHICLE_OCCUPANT_DAMAGE=crewPhysics;
const runtime=createHumanGameRuntimeV17();
globalThis.HUNTER_HUMAN_V17=runtime;
runtime.installHooks();
const sandbox={window:globalThis,HUNTER_PLAYER_MODEL:playerModel,
 HUNTER_PALETTE:palette};
runInNewContext(readFileSync(
 new URL('../src/characters.js',import.meta.url),'utf8'),sandbox);
assert.equal(typeof globalThis.HUNTER_CHARACTERS.createNativeEnemyCrew,'function',
 'La fàbrica del joc exposa el constructor específic de tripulants V18');
const box=(parent,w,h,d,color,x=0,y=0,z=0)=>{
 const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),
  new T.MeshStandardMaterial({color}));
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
};
const marineSrc=readFileSync(
 new URL('../src/marine-patrol.js',import.meta.url),'utf8');
const marineSandbox={
 THREE:T,bx:box,window:globalThis
};
runInNewContext(marineSrc+
 '\nthis.__makeBoat=attachEnemyBoatCrew;this.__aimBoat=aimEnemyBoatCrew;'+
 'this.__muzzleBoat=enemyBoatCrewMuzzle;',marineSandbox);
const carSource=readFileSync(
 new URL('../src/enemy-ai.js',import.meta.url),'utf8');
const start=carSource.indexOf('function attachEnemyCarCrew('),
 end=carSource.indexOf('// L\'única font visual de les tripulacions',start);
assert(start>0&&end>start,'Factory de cotxes localitzable');
const makeCar=new Function('THREE','window','bx','M','attachEnemyBoatCrew',
 carSource.slice(start,end)+';return attachEnemyCarCrew;')(
 T,globalThis,box,()=>new T.MeshStandardMaterial(),marineSandbox.__makeBoat);
function assertNative(rider,size,type,seat){
 const u=rider.userData,j=u.humanEnemyNativeJoints,
  rig=u.humanEnemyNativeRig;
 assert(u.humanEnemyNativeCrew&&j&&rig,
  'Ocupant visible amb figura V18: '+type+'/'+seat);
 assert.equal(Object.keys(j).length,16,
  'Els 16 pivots natius del V18: '+type+'/'+seat);
 assert.deepEqual(rider.scale.toArray(),[1,1,1],
  'Arrel del soldat 1 després de bake: '+type+'/'+seat);
 assert.deepEqual(rig.scale.toArray(),[1,1,1],
  'Arrel de l\'editor 1: '+type+'/'+seat);
 assert.equal(u.humanCrewNativeScale,size,
  'Talla del seient normalitzada: '+type+'/'+seat);
 assert.equal(u.humanEnemyNativeSeatType,type,
  'Tipus de seient transferit a la pose V18');
 assert.equal(u.humanEnemyNativeSeatIndex,seat,
  'Índex de seient V18 preservat');
 const body=[];
 rig.traverse(n=>{
  if(!n.isMesh)return;
  // Les armes REALS van unides al canell V18 i no són part
  // de la malla anatòmica del cos. No exigir als canons que
  // duguin marcadors de pell humana.
  for(let p=n;p;p=p.parent)if(p===u.gun)return;
  body.push(n);
 });
 assert(body.length>20&&body.every(n=>n.userData.humanEnemyNativeGeometry),
  'Només malles corporals originals V18, sense pell V17 duplicada: '+type+'/'+seat);
 const head=u.head.getWorldPosition(new T.Vector3()),
  nativeHead=j.head.getWorldPosition(new T.Vector3());
 assert(nativeHead.distanceTo(head)<.30,
  'Cap V18 anatòmic prop de la hitbox autoritativa: '+
   type+'/'+seat+' error='+nativeHead.distanceTo(head));
 const hipAngle=j.hipL.rotation.x,shoulderAngle=j.shoulderR.rotation.x;
 u.ll.rotation.x=-2;u.ar.rotation.x=2.5;
 rider.updateWorldMatrix(true,true);
 assert.equal(j.hipL.rotation.x,hipAngle,
  'El seient V18 no depèn de la rotació de cama antiga');
 assert.equal(j.shoulderR.rotation.x,shoulderAngle,
  'La subjecció V18 no depèn del braç antic');
 return j;
}
for(const type of ['cotxe','cotxe_civil','camio','moto']){
 const vehicle=new T.Group();
 if(type==='camio')vehicle.userData.truckCabin=TRUCK_CABIN;
 const result=makeCar(vehicle,{type});
 const size=enemyCrewLocalSeat(type,0).size;
 for(const [seat,rider] of [result.driver,result.gunner].entries()){
  if(!rider)continue;
  const j=assertNative(rider,size,type,seat);
  const physical=vehicleOccupantHeadWorld(
   {t:type,x:0,y:0,z:0,hd:0,brokenVehicleWindows:[0,1]},seat,0),
   actual=rider.userData.head.getWorldPosition(new T.Vector3());
  assert(actual.distanceTo(new T.Vector3(
   physical.x,physical.y,physical.z))<1e-6,
   'Hitbox terra/COOP inalterada: '+type+'/'+seat);
  const contact=vehicleSeatProjectileContact(
   {x:physical.x,y:physical.y,z:physical.z-4},
   {x:physical.x,y:physical.y,z:physical.z+4},
   {t:type,x:0,y:0,z:0,hd:0,brokenVehicleWindows:[0,1]},
   seat===0?[{hp:4}]:[{hp:0},{hp:4}]);
  assert(contact?.kind==='vehicle-occupant'&&contact.seat===seat,
   'Impacte conserva seient autoritatiu: '+type+'/'+seat);
  assert(j.kneeL.rotation.x<-.65,'Genolls V18 asseguts: '+type);
 }
 if(type==='moto'){
  assert(result.driver.userData.gun.parent===
   result.driver.userData.humanEnemyNativeJoints.wristR,
   'El fusell del motorista s\'aguanta amb el canell V18');
  assert(result.motorcycleMuzzle?.getWorldPosition(
   new T.Vector3()).toArray().every(Number.isFinite),
   'Boca de foc del motorista físicament real');
 }else{
  assert(result.gunner.userData.gun.parent===result.pitch,
   'La torre conserva el muntatge balístic independent del tirador');
  const u=result.gunner.userData,grips=u.humanEnemyNativeRifleGrips;
  assert(grips?.rightGrip&&grips?.leftGrip&&
   grips.rightGrip.parent===u.gun&&grips.leftGrip.parent===u.gun,
   'El fusell de la torreta té dues preses reals per les mans V18');
  const support=u.humanEnemyNativeRifleSupport;
  assert(Number.isFinite(support?.rightDistance)&&
   Number.isFinite(support?.leftDistance),
   'L\'IK del tirador resol ambdós braços a les preses del fusell');
  const before=result.muzzle.getWorldPosition(new T.Vector3());
  result.mount.rotation.y=.30;
  result.pitch.rotation.x=.20;
  vehicle.updateMatrixWorld(true,true);
  assert(runtime.poseNativeEnemyCrew(result.gunner,{type,seat:1}),
   'La rotació del canó torna a fer IK sobre la figura V18');
  const after=result.muzzle.getWorldPosition(new T.Vector3());
  assert(before.distanceTo(after)>.005,
   'El fusell físic i el seu muzzle segueixen girant amb la torreta');
  assert(Number.isFinite(u.humanEnemyNativeRifleSupport?.rightDistance)&&
   Number.isFinite(u.humanEnemyNativeRifleSupport?.leftDistance),
   'La postura V18 actualitza les mans també durant yaw/pitch de torre');
 }
}
for(const type of ['patrulla_marina','llanxa','llanxa_coets']){
 const vessel=new T.Group();
 const result=marineSandbox.__makeBoat(vessel,{type});
 assert.equal(result.boatWeapons.length,2);
 for(const [seat,w] of result.boatWeapons.entries()){
  const size=enemyCrewLocalSeat(type,seat).size,
   j=assertNative(w.rider,size,type,seat);
  const physical=marineCrewHeadWorld(
   {t:type,x:0,y:0,z:0,hd:0,
    marineCrewHp:[4,4],marineBrokenWindshield:[0,1,2]},seat,0),
   actual=w.rider.userData.head.getWorldPosition(new T.Vector3());
  assert(actual.distanceTo(new T.Vector3(
   physical.x,physical.y,physical.z))<1e-5,
   'Patruller V18 i hitbox COOP: '+type+'/'+seat);
  const blast=marineCrewProjectileContact(
   {x:physical.x,y:physical.y,z:physical.z-5},
   {x:physical.x,y:physical.y,z:physical.z+4},
   {t:type,x:0,y:0,z:0,hd:0,
    marineCrewHp:[4,4],marineBrokenWindshield:[0,1,2]});
  assert(blast?.kind==='marine-crew'&&blast.seat===seat,
   'Impactes a patrulla marítima: '+type+'/'+seat);
  if(!w.rocket)assert(w.weapon.parent===j.wristR,
   'Fusell de patrulla vinculat al canell V18');
  const muzzle=marineSandbox.__muzzleBoat(vessel,seat);
  assert(muzzle?.distanceTo(w.muzzle.getWorldPosition(
   new T.Vector3()))<1e-8,
   'Boca balística marina pròpia del fusell visible');
  assert(typeof marineSandbox.__aimBoat(vessel,seat,
   new T.Vector3(5,3,-30),.08)==='boolean',
   'Apuntat nadiu de patrulla sense modificar la física');
  if(w.rocket){
   const support=w.rider.userData.humanEnemyNativeRocketSupport;
   assert(Number.isFinite(support?.rightDistance)&&
    Number.isFinite(support?.leftDistance),
    'Les dues mans V18 segueixen grips de bazuca del vaixell');
  }
 }
 vessel.position.set(6,2,-4);vessel.rotation.y=.4;
 vessel.updateWorldMatrix(true,true);
 const rider=result.boatWeapons[0].rider,
  expected=marineCrewHeadWorld(
   {t:type,x:6,y:2,z:-4,hd:.4,marineCrewHp:[4,4]},0,2),
  head=rider.userData.head.getWorldPosition(new T.Vector3());
 assert(head.distanceTo(new T.Vector3(
  expected.x,expected.y,expected.z))<1e-5,
  'Cap del patruller gira amb el buc i la hitbox COOP');
}
const crew=globalThis.HUNTER_CHARACTERS.createCommando(T);
assert(!crew.userData.humanEnemyNativeCrew&&
 crew.userData.humanEnemyNativeRole==='soldier'&&
 crew.userData.humanEnemyNativeJoints?.head,
 'El comando genèric conserva el contracte d\'arma i ja té cos V18 original');
console.log('PASS real V18 enemy crews: land/marine seats, 16-joint figures, weapons, rocket IK and authoritative head collision');
