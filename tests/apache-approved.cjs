// Connexió del model Apache triat, i comprovació del GLB en publicar-lo.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const runtime=read('src/apache-araon-runtime.mjs');
const core=read('src/vehicle-model-core.mjs');
const boot=read('src/bootstrap.mjs');
const catalog=read('src/vehicle-candidate-catalog.mjs');
const readme=read('assets/vehicle-models/README.md');
for(const check of ['Apache_Main_Rotor_Pivot','Apache_Tail_Rotor_Pivot','APACHE_TRIANGLES=2193',
  'MODEL_SCALE=.00405','WHEEL_CONTACT=.405','rotor=p.main','tailRotor=p.tail',
  'shell.rotation.y=Math.PI'])
 assert(runtime.includes(check),'Falta un invariant d’Apache: '+check);
assert(boot.includes('prepareApacheAraonRuntime'));
assert(boot.indexOf('prepareApacheAraonRuntime')<boot.indexOf('const loadClassic='));
assert(core.includes('approvedApache')&&core.includes('approvedModel')&&core.includes('apacheModel'));
assert(core.includes('if(!approvedModel)'),'Falta reserva procedural');
assert(!catalog.includes("{id:'heli_combat'"),'L’Apache acceptat no pot ser candidat');
assert(readme.includes('Araon')&&readme.includes('CC BY 4.0'));
execFileSync(process.execPath,['--check',path.join(root,'src/apache-araon-runtime.mjs')],{stdio:'pipe'});
const asset=path.join(root,'assets/vehicle-models/apache-araon-salvia-black.glb');
assert(fs.existsSync(asset),'Falta el GLB definitiu Apache: no permetre una reserva silenciosa a producció');
const data=fs.readFileSync(asset);
assert.equal(data.toString('ascii',0,4),'glTF','Capçalera GLB invàlida');
assert.equal(data.readUInt32LE(4),2,'GLB no és versió 2');
assert.equal(data.readUInt32LE(8),data.length,'Mida del GLB inconsistente');
const digest=require('node:crypto').createHash('sha256').update(data).digest('hex');
assert.equal(digest,'be906866d6ac87835f2e30b11ce14bcc6b6ff13ee2cb39e798fd3cf6167f89df',
 'El fitxer aprovat ha canviat inesperadament');
const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString('utf8'));
const tris=json.meshes.reduce((n,m)=>n+m.primitives.reduce((a,p)=>
 a+json.accessors[p.indices].count/3,0),0);
assert.equal(tris,2193,'La geometria de l’Apache no coincideix amb la variant escollida');
for(const name of ['main_rotor_lambert2_0','tail_rotor_lambert2_0']){
 const mesh=json.meshes.find(m=>m.name===name);
 assert(mesh,'Falta '+name);
 assert(mesh.primitives.every(p=>json.materials[p.material].name==='black_details'),
  'Les aspes de '+name+' han de ser negres');
}
const details=json.meshes.find(m=>m.name==='hull_50_rodes_75');
assert(details?.primitives.some(p=>json.materials[p.material].name==='black_details'),
 'Les rodes/detalls han de conservar el material negre mat');
assert(json.materials.some(m=>m.name==='black_details'&&m.pbrMetallicRoughness.roughnessFactor>=.95));
assert(json.images?.length>=4,'Falten les quatre textures integrades');
console.log('Apache definitiu verificat a GitHub: model sàlvia-negre, 2.193 triangles i dues hèlixs negres.');
