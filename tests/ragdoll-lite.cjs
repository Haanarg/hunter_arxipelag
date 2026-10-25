'use strict';
// Simulació articulada lleugera, sense biblioteca de cossos rígids ni
// malles extra. Regressions: splay en vol, aterratge, restauració i
// integració amb enemics, explosions i cinemàtica del jugador.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const ragdoll=source('src/ragdoll-lite.js');
const combat=source('src/combat.js');
const ai=source('src/enemy-ai.js');
const death=source('src/death-cinematic.js');
const core=source('src/game-core.js');
const runtime=source('src/runtime-scripts.mjs');
assert.match(runtime,/src\/ragdoll-lite\.js/);
assert.match(combat,/u\.ragdoll=window\.HUNTER_RAGDOLL\.make/);
assert.match(combat,/playerBlastRagdoll=window\.HUNTER_RAGDOLL\.make/);
assert.match(ai,/HUNTER_RAGDOLL\.update\(u\.blastRagdoll/);
assert.match(ai,/HUNTER_RAGDOLL\.update\(u\.ragdoll/);
assert.match(death,/HUNTER_RAGDOLL\.update\(v\.ragdoll/);
assert.match(core,/HUNTER_RAGDOLL\.reset\(playerBlastRagdoll\)/);
const context={window:{}};vm.createContext(context);vm.runInContext(ragdoll,context);
const engine=context.window.HUNTER_RAGDOLL;
const axis=()=>({x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}});
const joint=x=>({position:Object.assign(axis(),{x}),rotation:axis()});
const parts={al:joint(-.57),ar:joint(.57),
 ael:joint(0),aer:joint(0),ll:joint(-.265),lr:joint(.265),
 lkl:joint(0),lkr:joint(0),head:joint(0)};
const actor={userData:parts};
const initialPositions=[parts.al.position.x,parts.ar.position.x];
const state=engine.make(actor,{blast:true,seed:17,impulse:{vy:23}});
assert.equal(state.joints.length,9);
for(let i=0;i<60;i++)engine.update(state,.02,{airborne:true});
assert(parts.al.rotation.z<-.6&&parts.ar.rotation.z>.6,
 'Amb l’ona expansiva, els braços s’obren cap als costats');
assert(parts.ll.rotation.z<-.3&&parts.lr.rotation.z>.3,
 'Les cames se separen del cos, com a la referència');
assert.equal(parts.al.position.x,initialPositions[0],
 'L’espatlla esquerra no pot separar-se del tors durant el vol');
assert.equal(parts.ar.position.x,initialPositions[1],
 'L’espatlla dreta no pot separar-se del tors durant el vol');
for(const key of Object.keys(parts))
 for(const angle of ['x','z'])assert(Number.isFinite(parts[key].rotation[angle]));
for(let i=0;i<120;i++)engine.update(state,.02,{grounded:true});
assert(Math.abs(parts.al.rotation.z)<.5,'Els braços es relaxen en aterrar');
engine.reset(state);
assert.equal(state.active,false);
assert.equal(parts.al.position.x,initialPositions[0]);
assert.equal(parts.ar.position.x,initialPositions[1]);
assert.equal(parts.al.rotation.z,0);
assert.equal(parts.lr.rotation.z,0);
engine.update(state,.1,{airborne:true});
assert.equal(parts.al.rotation.z,0,'Ragdoll desactivat no anima extremitats');
const gentle=engine.make(actor,{blast:false,seed:4});
for(let i=0;i<50;i++)engine.update(gentle,.02,{grounded:true});
assert(Math.abs(parts.al.rotation.z)<.6,
 'Una mort sense explosió té braços més relaxats');
engine.reset(gentle);
console.log('OK ragdoll lleuger: braços/cames oberts, ressorts, aterratge i reinici');
