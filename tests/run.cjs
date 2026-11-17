// Explicit suites: no accidental execution of helpers or historical candidates.
'use strict';
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const suites={
  "basic": [
    "version-sync.cjs",
    "simulation-clock.cjs",
    "player-simulation.mjs",
    "smoke-basic.cjs",
    "progressive-build-progress.mjs",
    "mission-viability-validator.cjs",
    "heliport-tower-clearance.mjs",
    "hq-btr-patrol-clearance.mjs",
    "hangar-roof-destruction.mjs",
    "structure-durability.mjs",
    "tower-blast-guard-containment.mjs",
    "btr82-driving-and-hangar.mjs",
    "bunker-gate-timing.mjs",
    "bunker-finale-layout.mjs",
    "ferry-ramp-transitions.mjs",
    "ammo-pickup-hud.mjs",
    "vehicle-health-and-blast.mjs",
    "bazooka-armored-lock.mjs",
    "tank-civic-runover.mjs",
    "armored-crew-controls.mjs",
    "armored-turret-camera.mjs",
    "operation-save.mjs",
    "operation-recovery.mjs",
    "operation-autosave.cjs",
    "coop-state-delta.mjs",
    "coop-connection.mjs",
    "coop-lobby.mjs",
    "native-coop-startup.cjs",
    "cloudflare-backend.mjs"
  ],
  "performance": [
    "path-height-cache.mjs",
    "vegetation-placement-parity.mjs",
    "static-decor-direct-batch.mjs",
    "palm-lod-copy.mjs"
  ],
  "models": [
    "gaz-tigr-approved.mjs",
    "gaz-tigr-door-contours.mjs",
    "t90m-game-integration.mjs",
    "btr82-3b-game-parity.mjs",
    "btr82-distant-lod.mjs",
    "ferry-proposals.mjs",
    "ka60-game-integration.mjs",
    "mi24-proposals.mjs",
    "jet-ski-final.mjs",
    "jet-ski-color-distribution.cjs",
    "streetfighter-final.mjs"
  ],
  "lab": [
    "vehicle-candidate-studio.cjs",
    "vehicle-live-editor.mjs",
    "vehicle-lab-player-reference.mjs",
    "human-proposals.mjs",
    "human-lab-evidence.mjs"
  ]
};
const name=process.argv[2]||'basic';
if(name!=='all'&&!Object.hasOwn(suites,name)){console.error('Unknown suite: '+name);process.exit(2);}
const files=name==='all'?Object.values(suites).flat():suites[name];
let failed=0;
for(const file of files){
  console.log('\n--- '+file+' ---');
  const result=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit',cwd:path.resolve(__dirname,'..')});
  if(result.error||result.status!==0){failed++;console.error('FAIL '+file, result.error||result.signal||result.status);}
}
console.log('\n'+(files.length-failed)+'/'+files.length+' checks passed ('+name+')');
process.exitCode=failed?1:0;
