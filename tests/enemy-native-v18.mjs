import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as T from '../vendor/three-r186.module.mjs';
import {playerModel} from '../src/player-model-core.mjs';
import {palette as gamePalette} from '../src/palette-core.mjs';
import {createHumanGameRuntimeV17} from '../src/human-game-runtime-v17.mjs';

globalThis.window=globalThis;
globalThis.HUNTER_PLAYER_MODEL=playerModel;
globalThis.HUNTER_PALETTE=gamePalette;
const runtime=createHumanGameRuntimeV17();
globalThis.HUNTER_HUMAN_V17=runtime;
runtime.installHooks();
for(const file of ['enemy-lod.js','characters.js','general-model.js','ragdoll-lite.js']){
 const code=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
 runInNewContext(code,{window:globalThis,HUNTER_PLAYER_MODEL:playerModel,
   HUNTER_PALETTE:gamePalette});
}
const box=(parent,w,h,d,color,x=0,y=0,z=0)=>{
 const geo=new T.BoxGeometry(w,h,d),
  material=new T.MeshStandardMaterial({color}),
  mesh=new T.Mesh(geo,material);
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
};
const roles=[
 {label:'soldat',options:{},role:'soldier'},
 {label:'elit',options:{elite:true},role:'elite'},
 {label:'general',options:{general:true},role:'general'}
];
for(const {label,options,role} of roles){
 const model=globalThis.HUNTER_CHARACTERS.createSoldier(T,{
  ...options,box,palette:gamePalette
 });
 const u=model.userData,j=u.humanEnemyNativeJoints,
  rig=u.humanEnemyNativeRig;
 assert(j&&rig&&u.humanEnemyNativeRole===role,
  'Fàbrica real d\'infanteria usa esquelet V18 '+label);
 assert.deepEqual(model.scale.toArray(),[1,1,1],
  'Escala unitària de model físic '+label);
 assert.deepEqual(rig.scale.toArray(),[1,1,1],
  'Escala unitària de rig V18 '+label);
 assert.equal(Object.keys(j).length,16,'Els 16 pivots V18 '+label);
 assert(rig.parent===u.enemyFullRoot,
  'El cos V18 forma part del LOD full '+label);
 const nativeMeshes=[];
 rig.traverse(node=>{if(node.isMesh)nativeMeshes.push(node)});
 assert(nativeMeshes.length>10,'El cos de l\'editor es renderitza '+label);
 assert(u.humanGameV17Counts.added>20&&
   u.humanGameV17Counts.removed>10,'Cap pell V17 sobre els antics ossos '+label);
 assert(u.gun?.parent===j.wristR&&
  u.gun.userData.humanEnemyNativeWeaponMount,
  'El fusell autèntic penja del canell V18 '+label);
 assert.equal(u.enemyLOD,'full');
 model.updateWorldMatrix(true,true);
 const bounds=new T.Box3().setFromObject(rig,true);
 assert(bounds.getSize(new T.Vector3()).y>2.2&&
   bounds.getSize(new T.Vector3()).y<3.5,
   'Contorn anatòmic visible i coherent amb la hitbox '+label);
 // Canviar els pivots invisibles ja no pot deformar la pell canònica.
 const start=j.shoulderL.rotation.x;
 u.al.rotation.set(1.7,.9,-1.3);
 u.lr.rotation.x=-.81;
 model.updateWorldMatrix(true,true);
 assert.equal(j.shoulderL.rotation.x,start,
  'Braç visual immune al controlador antic '+label);
 globalThis.HUNTER_CHARACTERS.animateSoldier(model,{
  phase:Math.PI/2,moving:true,aim:false,dt:1/30
 });
 assert(j.hipL.rotation.x>.40&&j.hipR.rotation.x<-.40,
  'Cursa sobre malucs originals de l\'editor '+label);
 assert(Number.isFinite(j.elbowR.rotation.x)&&
  Number.isFinite(j.kneeR.rotation.x),'Cames i colzes V18 '+label);
 const oldShoulder=j.shoulderL.rotation.x;
 globalThis.HUNTER_CHARACTERS.animateSoldier(model,{
  phase:Math.PI/2,moving:false,aim:true,dt:.15
 });
 assert(j.shoulderL.rotation.x>oldShoulder+.20,
  'Apuntat anima les espatlles canòniques '+label);
 const rag=globalThis.HUNTER_RAGDOLL.make(model,{
  blast:true,seed:role==='general'?8:3
 });
 assert(rag.native&&rag.joints.length===9,
  'Explosió i mort al ragdoll V18 real '+label);
 globalThis.HUNTER_RAGDOLL.update(rag,1/30,{airborne:true});
 assert(rag.joints.every(x=>Number.isFinite(x.node.rotation.x)),
  'Ragdoll del soldat V18 sense angles no finits '+label);
 globalThis.HUNTER_RAGDOLL.reset(rag);
 assert(globalThis.HUNTER_ENEMY_LOD.setLevel(model,'mid'));
 assert(!u.enemyFullRoot.visible&&u.enemyMidMesh.visible,
  'El LOD mitjà oculta l\'esquelet complet '+label);
 assert(globalThis.HUNTER_ENEMY_LOD.setLevel(model,'far'));
 assert(globalThis.HUNTER_ENEMY_LOD.setLevel(model,'full'));
 assert(u.enemyFullRoot.visible&&rig.parent===u.enemyFullRoot,
  'El LOD complet recupera la figura articulada '+label);
 if(role==='soldier'){
  const tip=u.gun.getWorldPosition(new T.Vector3());
  assert(tip.toArray().every(Number.isFinite),
   'La boca de foc del fusell real segueix el V18');
  globalThis.HUNTER_CHARACTERS.equipBazooka(T,model,{box});
  assert(u.rocketSoldier&&u.bazooka&&
   u.enemyBazookaIK?.leftGrip&&u.enemyBazookaIK?.rightGrip,
   'Bazuca i dos punts de presa de la infanteria');
  globalThis.HUNTER_CHARACTERS.animateSoldier(model,{
   phase:0,moving:false,aim:true,dt:.08
  });
  assert(Number.isFinite(j.shoulderR.rotation.x),
   'El braç V18 conserva apuntat antitanc');
  assert(Number.isFinite(u.humanEnemyNativeRocketSupport?.rightDistance)&&
   Number.isFinite(u.humanEnemyNativeRocketSupport?.leftDistance),
   'Les dues mans V18 del soldat antitanc resolen IK dels grips reals');
 }
 if(role==='elite')assert(u.eliteSoldier,
  'Blindatge i metralladora de l\'elit continuen equipats');
 console.log('PASS ENEMY NATIVE V18 '+label+': skeleton, weapon, animation, ragdoll, LOD, scale');
}
// Requisició i patrons de llanxes NO han de rebre la migració
// d'infanteria que canviaria els ancoratges dels seus vehicles.
const crew=globalThis.HUNTER_CHARACTERS.createCommando(T,{palette:gamePalette});
assert(!crew.userData.humanEnemyNativeRig&&
 crew.userData.humanGameV17==='soldier',
 'Els conductors conserven la via compatible fins a la migració de seients');
console.log('PASS ENEMY V18 on foot / backward-compatible vehicle crew');
