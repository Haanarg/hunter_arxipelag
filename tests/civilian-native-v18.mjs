import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as T from '../vendor/three-r186.module.mjs';
import {createHumanGameRuntimeV17} from '../src/human-game-runtime-v17.mjs';

// Provam les factories reals del camp de presoners, amb animador SO/COOP
// i hook V18, en lloc de crear malles aïllades de tests.
globalThis.window=globalThis;
const runtime=createHumanGameRuntimeV17();
globalThis.HUNTER_HUMAN_V17=runtime;
runtime.installHooks();
const sandbox={window:{}};
runInNewContext(readFileSync(new URL('../src/prisoners.js',import.meta.url),'utf8'),sandbox);
globalThis.HUNTER_PRISONERS=sandbox.window.HUNTER_PRISONERS;
const world=new T.Group();
const camp={
 x:0,z:0,angle:0,
 layout:{
  rescuePoint:{x:0,z:8},mechanicStation:{x:5,z:14},
  prisoners:[
   {id:'prisoner-farmer-1',role:'farmer',x:0,z:14,pose:'seated'},
   {id:'prisoner-mechanic-1',role:'mechanic',x:3,z:12,pose:'standing'}
  ]
 }
};
const create=()=>globalThis.HUNTER_PRISONERS.create({
 THREE:T,heightAt:()=>0,canMove:()=>true,clearLine:()=>true,
 notify:()=>{},sound:()=>{}
});
const game=create();
game.configure({world,camp});
assert.equal(game.entities.length,2,'El camp genera els dos tipus de presoner');
for(const u of game.entities){
 const g=u.o?.userData?.humanCivilianCanonicalRig,
       j=u.o?.userData?.humanCivilianCanonicalJoints;
 assert(g&&j?.head&&j?.hipL&&j?.kneeR&&j?.shoulderL,
  'Model canònic directe a '+u.role);
 assert.deepEqual(g.scale.toArray(),[1,1,1],
  'Escala V18 de presoner sense pegat');
 assert.deepEqual(u.o.scale.toArray(),[1,1,1],
  'El civil V18 té arrel física nativa sense factor de taller');
 assert(u.o.userData.humanCivilianRootBaked,
  'L\'única consolidació de mida s\'ha aplicat en crear el model');
 assert(g.parent===u.rig,'L\'esquelet V18 segueix el moviment del personatge');
 // Les caixes d'un presoner ASSEGUT mesuren la silueta compactada.
 // Per validar la talla original del rig, mesuram la postura dreta.
 const initialPose=u.pose;
 u.pose='standing';u.cheering=false;
 runtime.poseCivilianV18(u);
 const b=new T.Box3().setFromObject(g,true),
       height=b.getSize(new T.Vector3()).y;
 u.pose=initialPose;
 runtime.poseCivilianV18(u);
 assert(Math.abs(g.userData.humanNativeHeight-(u.role==='mechanic'?1.75:1.7175))<1e-9,
  'La talla del civil V18 es construeix des de la mesura canònica');
 assert(Math.abs(height-game.config.standingHeight)<.03,
  'Alçada V18 física dempeus, sense escala a l\'arrel: '+u.role+' = '+height);
}
const context={
 active:true,canInteract:false,
 player:{x:1,y:0,z:10,hd:0},
 enemies:[],vehicles:[],visualRange:200
};
game.update(1/30,context);
const farmer=game.entities.find(u=>u.role==='farmer');
const mechanic=game.entities.find(u=>u.role==='mechanic');
assert(farmer.cheering&&mechanic.cheering,'Civils saluden el jugador a prop');
const farmerJ=farmer.o.userData.humanCivilianCanonicalJoints;
assert(Math.abs(farmer.rig.position.y+.695*farmer.modelScale)<1e-8,
 'Seient civil manté la posició mundial després de bake');
assert(farmerJ.hipL.rotation.x>1,'Un presoner assegut flexiona els malucs V18');
assert(Math.abs(farmerJ.shoulderL.rotation.z)>1,
 'El presoner saluda amb l\'espatlla canònica V18');
// Alterar el controlador antic no ha de tocar la pell visible.
const z=farmerJ.shoulderL.rotation.z;
farmer.arms[0].rotation.z=2.8;farmer.head.rotation.y=1.2;
game.update(0,context);
assert(Math.abs(farmerJ.shoulderL.rotation.z-z)<1e-10,
 'L\'espatlla V18 ignora u.arms');
// El guest COOP anima amb el mateix actor; el servidor només envia estat.
game.applyCoopState({
 discovered:true,released:false,
 entities:game.entities.map(u=>({
  id:u.id,x:u.x+1,y:u.y,z:u.z,
  hp:u.hp,state:'evacuating',pose:'standing',
  following:false,phase:Math.PI/2
 }))
},.05,{x:1,y:0,z:10});
assert(farmer.o.userData.humanCivilianNativeState.walking===true,
 'La interpolació COOP publica el moviment real al rig V18');
assert.equal(farmerJ.head.rotation.y,0,
 'El cap canònic torna a neutral amb l\'alliberament');
assert(Math.abs(farmer.rig.position.y+.06*farmer.modelScale)<1e-8,
 'En alliberar-se el civil recupera l\'alçada de peu V18 correcta');
const oldNative=farmer.o.userData.humanCivilianCanonicalRig;
game.reset();
assert.equal(game.entities.length,0,'L\'API de camp resta funcional');
assert.equal(oldNative.parent,null,'El rig V18 es desmunta en reiniciar la missió');
console.log('PASS civilian V18 real factory: farmer/mechanic, visible geometry, seated, wave, COOP, reset');
