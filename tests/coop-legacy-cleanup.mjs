import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {runtimeScripts} from '../src/runtime-scripts.mjs';

// La UI antiga NO pot reapareixer. La connexio i el mon COOP natius es mantenen.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const obsolete=[
  'src/coop-play.mjs','src/coop-play-connection.mjs',
  'src/coop-play-view.mjs','src/coop-play.css',
  'src/coop-building-view.mjs','src/coop-combat-view.mjs',
  'src/coop-palm-view.mjs','src/coop-vehicle-view.mjs'
];
for(const path of obsolete){
  assert.equal(existsSync(resolve(root,path)),false,
    'El client cooperatiu separat no ha de tornar al projecte: '+path);
  assert.ok(!runtimeScripts.includes(path),
    'El runtime individual/cooperatiu natiu no ha de carregar '+path);
}
const read=path=>readFileSync(resolve(root,path),'utf8');
const boot=read('src/bootstrap.mjs');
const native=read('src/native-coop-connection.mjs');
const lobby=read('src/coop-menu.js');
const launcher=read('coop.html');
const packageJSON=JSON.parse(read('package.json'));
for(const path of obsolete){
  const basename=path.split('/').at(-1);
  for(const [name,code] of [['bootstrap',boot],['coop native',native],['coop lobby',lobby]])
    assert.ok(!code.includes(basename),name+' no ha de referenciar '+basename);
  for(const command of Object.values(packageJSON.scripts||{}))
    assert.ok(!command.includes(path),'Cap script npm pot referenciar '+path);
}
assert.match(launcher,/index\.html/,'coop.html preserva els enllacos antics i va al runtime natiu');
assert.match(native,/coop-socket\.mjs/,'El transport WebSocket natiu s\'ha de conservar');
assert.match(boot,/coop-connection\.mjs/,'La connexio de la sala actual es conserva');
assert.match(boot,/native-coop-connection\.mjs/,'La connexio de partida nativa es conserva');
assert.ok(runtimeScripts.includes('src/coop-world-runtime.js'));
assert.ok(runtimeScripts.includes('src/game-core.js'));
console.log('OK: prototip separat eliminat; runtime individual, COOP natiu, lobby i redireccio intactes');
