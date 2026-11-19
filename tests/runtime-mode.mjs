import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {selectRuntimeMode} from '../src/runtime-mode.mjs';
const mode=query=>selectRuntimeMode(new URLSearchParams(query));
const menu=readFileSync(new URL('../src/menu-boot.mjs',import.meta.url),'utf8');
const bootstrap=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8');
assert.match(menu,/const runtimeMode=selectRuntimeMode\(params\)/,
 'El menú consulta el mateix selector');
assert.match(menu,/runtimeMode==='bundle'/,'La precàrrega respecta el mode explícit');
assert.match(bootstrap,/const useBundle=selectRuntimeMode\(params\)==='bundle'/,
 'El motor principal consulta el mateix selector');
assert.equal(mode(''),'source','Source és el mode predeterminat');
assert.equal(mode('?avatarAudit=1'),'source','El panell V18 no activa el bundle');
assert.equal(mode('?runtime=source'),'source','Source explícit');
assert.equal(mode('?runtime=bundle'),'bundle','Bundle només amb opt-in explícit');
assert.equal(mode('?runtime=bundle&perfAudit=1'),'source','PerfAudit força source');
assert.equal(mode('?runtime=unknown'),'source','Mode desconegut no activa un paquet');
console.log('PASS runtime mode: source per defecte, bundle només explícit');
