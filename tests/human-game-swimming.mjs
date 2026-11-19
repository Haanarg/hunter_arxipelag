import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as T from '../vendor/three-r186.module.mjs';
import {palette} from '../src/palette-core.mjs';
import {playerModel} from '../src/player-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
import {createHumanGameRuntimeV17} from '../src/human-game-runtime-v17.mjs';
import {GAME_SWIM_MODES} from '../src/human-game-swim-bridge.mjs';
import {HUMAN_SWIM_PROPOSALS} from '../src/human-swim-proposals.mjs';

globalThis.HUNTER_HUMAN_V17=createHumanGameRuntimeV17();
const game={
 HUNTER_PLAYER_MODEL:playerModel,
 HUNTER_PLAYER_BATCH:playerBatching,
 HUNTER_PALETTE:palette,
 HUNTER_BOLT_CUTTERS:{create:()=>new T.Group(),pose:()=>{}}
};
runInNewContext(readFileSync(new URL('../src/characters.js',import.meta.url),'utf8'),
 {window:game},{filename:'characters.js'});
const api=game.HUNTER_CHARACTERS;
assert(api&&typeof api.animatePlayer==='function');
assert.deepEqual(GAME_SWIM_MODES,{breast:'swim-breast-3',crawl:'swim-crawl-4'});
const box=(parent,w,h,d,color=0x343434,x=0,y=0,z=0)=>{
 const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),
  new T.MeshStandardMaterial({color}));
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
};
function player(){
 const p=api.createPlayer(T,{box}),u=p.userData;
 assert(u.humanGameCanonicalRig?.userData.humanProposal,'Avatar del joc vinculat al rig natiu de l’editor');
 assert.equal(Object.keys(u.humanGameCanonicalJoints).length,16);
 return p;
}
const p=player(),u=p.userData,skin=u.humanGameCanonicalRig,j=u.humanGameCanonicalJoints;
const animate=(model,options={})=>{
 const dt=1/60;
 model.position.set(0,0,0);model.rotation.y=.21;
 api.animatePlayer(model,{forward:1,dt,swimming:true,inVehicle:false,ammo:12,
  running:false,...options});
 model.updateMatrixWorld(true);
 const skin=model.userData.humanGameCanonicalRig;
 model.traverse(node=>{
  if(node.userData?.humanGameV17Mesh)
   assert(node.matrixWorld.elements.every(Number.isFinite),'Malla finita durant natació');
 });
 return skin;
};
for(let i=0;i<220;i++)animate(p);
assert(u.gameSwimActive&&u.gameSwimBlend>.999);
assert(u.crawlBlend<.001,'Caminar dins l’aigua activa B3');
assert.equal(skin.userData.humanProposal.role,'player');
assert(Math.abs(skin.rotation.y)<.001,'Braça: sense roll axial');
assert(Math.abs(skin.rotation.x+Math.PI/2)<.01,'Braça: decúbit pron');
const b3Time=u.gameSwimSeconds,elbow=j.elbowR.rotation.x;
assert(elbow<=-10*Math.PI/180&&elbow>=-90*Math.PI/180,'B3: flexió de colze a la malla real');
const crown=j.head.getWorldPosition(new T.Vector3());
const lift=api.swimVisualLift(p,2.1,0);
assert(lift>0&&Math.abs(crown.y+lift-2.26)<.03,'Braça: cap real alineat amb aigua sense moure física');
assert.equal(p.position.y,0,'La simulació física no és desplaçada per l’animació');

for(let i=0;i<190;i++)animate(p,{running:true});
assert(u.crawlBlend>.9999,'La tecla de córrer activa C4');
assert(Math.abs(skin.rotation.x+Math.PI/2)<.01);
assert(Math.abs(skin.rotation.y)<=40*Math.PI/180+.00001,'Crol: roll longitudinal limitat');
assert(Math.abs(j.elbowR.rotation.y)<.001&&Math.abs(j.elbowR.rotation.z)<.001,'Crol: colze com a frontissa única, tolerància de barreja de postures');
const c4Flex=-j.elbowR.rotation.x;
assert(c4Flex>=10*Math.PI/180-.005&&c4Flex<=100*Math.PI/180+.005,'Crol: sense hiperextensió');
assert(HUMAN_SWIM_PROPOSALS.crawl[3].roll===40*Math.PI/180);
const headC=j.head.getWorldPosition(new T.Vector3());
assert(Math.abs(headC.y+api.swimVisualLift(p,2.1,0)-2.26)<.03,'Crol: cap a la superfície');
assert.equal(p.position.y,0,'Crol no canvia Y del jugador físic');

// B3<->C4 transitions affect only visual blend, never feet collision, or P.y.
for(let i=0;i<140;i++)animate(p,{running:false});
assert(u.crawlBlend<.0001,'Retorn a B3 sense reiniciar el món');
assert(Math.abs(skin.rotation.y)<.005,'Braça sense roll després de crol');
const newPlayer=player();
for(let i=0;i<135;i++)animate(newPlayer,{running:true});
assert(newPlayer.userData.crawlBlend>.99,'COOP: altre jugador té rellotge propi de crol');
assert(u.crawlBlend<.01,'COOP: animació independent per jugador');

for(let i=0;i<130;i++){
 p.position.set(0,0,0);
 api.animatePlayer(p,{forward:0,dt:1/60,swimming:false,inVehicle:false,ammo:6});
 p.updateMatrixWorld(true);
}
assert(!u.gameSwimActive&&u.gameSwimBlend<.0001);
assert(Math.abs(skin.rotation.x)<.001&&Math.abs(skin.rotation.y)<.001,
 'Sortida de l’aigua: tors torna dret, sense roll residual');
assert(Math.abs(p.position.y)<.015,'La respiració de repòs a terra no crea un impuls vertical');
assert(u.gun.visible||u.knife.visible,'Les armes tornen a aparèixer en sortir de l’aigua');
console.log('PASS B3/C4 canonicals al joc real, SOLO+COOP, 40°, IK, límits, flotació, armes i retorn a terra');
