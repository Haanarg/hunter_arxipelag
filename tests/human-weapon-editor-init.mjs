import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {createHumanProposal,setHumanPreviewWeapon,HUMAN_PREVIEW_WEAPONS} from '../src/human-proposals.mjs';
import {prepareGameWeaponPreview,createGameWeaponPreview,GAME_WEAPON_TYPES} from '../src/human-weapon-preview.mjs';
globalThis.window=globalThis;
assert.equal(globalThis.HUNTER_CHARACTERS,undefined,'No cal arrencar la partida');
assert.equal(globalThis.HUNTER_BOLT_CUTTERS,undefined,'No cal carregar cisalles a part');
assert.throws(()=>createHumanProposal(T,'player','a'),/Cal carregar els models compartits/,
 'Reprodueix la regressió abans de preparar les fàbriques');
await prepareGameWeaponPreview();
await prepareGameWeaponPreview();
assert.equal(typeof globalThis.HUNTER_CHARACTERS?.createPlayer,'function');
assert.equal(typeof globalThis.HUNTER_BOLT_CUTTERS?.create,'function');
assert.deepEqual([...HUMAN_PREVIEW_WEAPONS],[...GAME_WEAPON_TYPES]);
for(const style of ['a','b']){
 const model=createHumanProposal(T,'player',style);
 const mount=model.getObjectByName('Arma del joc');
 assert(mount?.userData.humanPreviewWeapon,'Punt de muntatge V18 · '+style);
 for(const kind of GAME_WEAPON_TYPES){
  assert.equal(setHumanPreviewWeapon(T,model,kind),true,'Arma '+kind);
  assert.equal(mount.userData.humanWeapon,kind);
  const visual=mount.children.find(c=>c.userData.gameWeaponType===kind);
  assert(visual,'Arma visible '+kind);
  let meshes=0;visual.traverse(n=>{if(n.isMesh)meshes++});
  assert(meshes>0,'Arma real buida '+kind);
  assert(createGameWeaponPreview(T,kind).isObject3D);
 }
}
console.log('PASS editor HUMANS V18: inicialització autònoma i 7 armes reals, variants A/B');
