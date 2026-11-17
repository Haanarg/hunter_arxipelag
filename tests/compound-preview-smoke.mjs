// Node runtime smoke for stand-alone compound concept rendering (no GPU/browser).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {palette,playerModel} from '../src/player-model-core.mjs';
import {playerBatching} from '../src/player-batching-core.mjs';
import {createCompoundConcept} from '../src/compound-concepts.mjs';
import {compoundLayouts} from '../src/compound-layouts.mjs';
import {phase2Layouts} from '../src/compound-phase2-layouts.mjs';
import {phase3Layouts} from '../src/compound-phase3-layouts.mjs';
import {newWorldLayouts} from '../src/compound-phase4-layouts.mjs';

export function runCompoundPreviewSmoke(){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 globalThis.window=globalThis;
 window.HUNTER_PALETTE=palette;
 window.HUNTER_PLAYER_MODEL=playerModel;
 window.HUNTER_PLAYER_BATCH=playerBatching;
 // These are the actual classic scripts loaded by compounds-preview.html.
 for(const file of ['src/bolt-cutters.js','src/characters.js','src/general-model.js','src/buildings.js','src/explosive-visuals.js']){
  vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
 }
 assert(window.HUNTER_BUILDINGS&&window.HUNTER_CHARACTERS);
 const heavy=newWorldLayouts.find(layout=>layout.vehicles?.some(v=>v.t==='camio'));
 assert(heavy,'Expected a phase-4 compound with a truck');
 const layouts=[compoundLayouts.find(l=>l.id==='hangar'),phase2Layouts[0],phase3Layouts.find(l=>l.id==='base'),heavy];
 for(const layout of layouts){
  assert(layout,'Missing compound layout');
  const concept=createCompoundConcept(layout);
  assert(concept.root?.isGroup,'Missing scene graph in '+layout.id);
  const vehicleTypes=[];
  concept.root.traverse(node=>{if(node.userData.previewVehicle)vehicleTypes.push(node.userData.previewVehicle)});
  for(const {t} of layout.vehicles||[])assert(vehicleTypes.includes(t),'Missing '+t+' in '+layout.id);
  console.log('PASS compound preview: '+layout.id+' / '+vehicleTypes.join(','));
 }
}
