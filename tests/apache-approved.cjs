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
if(fs.existsSync(asset)){
 const data=fs.readFileSync(asset);
 assert.equal(data.toString('ascii',0,4),'glTF');
 assert.equal(data.readUInt32LE(4),2);
 assert.equal(data.readUInt32LE(8),data.length);
 const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString('utf8'));
 const tris=json.meshes.reduce((n,m)=>n+m.primitives.reduce((a,p)=>
   a+json.accessors[p.indices].count/3,0),0);
 assert.equal(tris,2193);
 assert(json.meshes.some(m=>m.name==='main_rotor_lambert2_0'));
 assert(json.meshes.some(m=>m.name==='tail_rotor_lambert2_0'));
 assert(json.materials.some(m=>m.name==='black_details'&&m.pbrMetallicRoughness.roughnessFactor>=.95));
 assert(json.images?.length>=4);
 console.log('Apache: GLB sàlvia-negre present i 2.193 triangles verificats');
}else{
 console.warn('Apache: integració preparada, però falta publicar el GLB binari a assets/vehicle-models/apache-araon-salvia-black.glb. La reserva procedural segueix activa.');
}
