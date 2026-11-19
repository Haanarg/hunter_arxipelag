'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function snapshot(mode){
 const cmd=spawnSync(process.execPath,[path.join(__dirname,'runtime-parity-snapshot.cjs')],{
   cwd:root,env:{...process.env,HUNTER_TEST_BUNDLE:mode==='bundle'?'1':'0'},
   encoding:'utf8',timeout:120000,maxBuffer:30*1024*1024
 });
 if(cmd.error||cmd.status!==0)throw Error(
  mode+' no arrenca: '+(cmd.error?.message||cmd.signal||cmd.status)+
  '\n'+cmd.stdout?.slice(-4000)+'\n'+cmd.stderr?.slice(-4000));
 const line=cmd.stdout.split(/\r?\n/).find(row=>row.startsWith('HUNTER_PARITY_SNAPSHOT '));
 assert(line,mode+': falta la captura del joc real al harness\n'+cmd.stdout.slice(-3000));
 return JSON.parse(line.slice('HUNTER_PARITY_SNAPSHOT '.length));
}
const source=snapshot('source'),bundle=snapshot('bundle');
assert.equal(source.idle.rig,true,'El jugador necessita el V18 canònic en el mode source');
assert.equal(source.idle.pose,'function','El V18 ha de tenir pose()');
assert(source.idle.meshes>=60,'Malles V18 visibles insuficients');
assert(source.idle.casters>0,'El V18 ha de tenir malles preparades per fer ombra');
assert(source.walking.landMove>.5,'Caminar ha d\'alimentar el rig V18');
assert(Math.abs(source.walking.hipL-source.idle.hipL)>.05||
       Math.abs(source.walking.hipR-source.idle.hipR)>.05,
       'Caminar ha de moure els malucs V18');
assert.equal(source.breast.swim,'B3','Braça B3 activada');
assert.equal(source.crawl.swim,'C4','Crol C4 activat');
assert(source.breast.swimBlend>.7&&source.crawl.swimBlend>.9,
 'Natació V18 activa, no només el selector textual');
assert.deepStrictEqual(bundle,source,
 'DIVERGÈNCIA: el bundle NO és equivalent als 70 scripts originals per al V18, caminar, braça, crol i ombres');
console.log('PASS paritat SOURCE/BUNDLE: dues partides isolades, rig V18, caminar, B3, C4 i ombres');
console.log(JSON.stringify({meshCount:source.idle.meshes,casters:source.idle.casters,
walkHipL:source.walking.hipL,breast:source.breast.swim,crawl:source.crawl.swim}));
