#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {gameVersion,syncEntry,syncVersion,FILES}=require('../tools/sync-version.cjs');
const root=path.resolve(__dirname,'..'),version=gameVersion(fs.readFileSync(path.join(root,'src/version.mjs'),'utf8'));
assert.match(version,/^\d+\.\d+\.\d+$/);
assert.equal(syncVersion().updated.length,0,'els segells de la portada i dels imports han de coincidir');
for(const file of FILES){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 assert.equal(syncEntry(source,version,file).content,source,'versió desincronitzada a '+file);
}
const sample='<div id="versionBadge">v0.6.1</div><script src="a.js?v=0.6.1&visual=8"></script>'+
 '<script src="b.js?local=0.6.1"></script>';
const changed=syncEntry(sample,'0.6.2','index.html');
assert(changed.content.includes('>v0.6.2<'));
assert(changed.content.includes('v=0.6.2&visual=8'));
assert(changed.content.includes('local=0.6.2'));
assert.equal(changed.stamps,2);
assert.throws(()=>syncEntry('no versions','0.6.2','index.html'),/segells de versió/);
console.log('PASS: GAME_VERSION i segells de la portada/ESM sincronitzats');
