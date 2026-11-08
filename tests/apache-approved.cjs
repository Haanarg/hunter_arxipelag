// Contracte Apache: el model d'Araon ha de ser un asset REAL present al repo,
// no un GLB inexistent amb reserva procedural silenciosa. Sense WebGL/xarxa.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const runtime=read('src/apache-araon-runtime.mjs');
const core=read('src/vehicle-model-core.mjs');
const boot=read('src/bootstrap.mjs');
const catalog=read('src/vehicle-candidate-catalog.mjs');
const readme=read('assets/vehicle-models/README.md');
for(const check of ['Apache_Main_Rotor_Pivot','Apache_Tail_Rotor_Pivot',
 'APACHE_TRIANGLES=2173','TARGET_LENGTH=7.15','WHEEL_CONTACT=.405',
 'rotor=p.main','tailRotor=p.tail','shell.rotation.y=Math.PI',
 'DecompressionStream','APACHE_MODEL_URL','apache-araon-50mesh.zlib'])
 assert(runtime.includes(check),'Falta un invariant d’Apache: '+check);
assert(boot.includes('prepareApacheAraonRuntime'));
assert(boot.indexOf('prepareApacheAraonRuntime')<boot.indexOf('const loadClassic='));
assert(core.includes('approvedApache')&&core.includes('approvedModel')&&core.includes('apacheModel'));
assert(core.includes('if(!approvedModel)'),'Falta reserva procedural');
assert(!catalog.includes("{id:'heli_combat'"),'L’Apache acceptat no pot ser candidat');
assert(readme.includes('Araon')&&readme.includes('CC BY 4.0'));
execFileSync(process.execPath,['--check',path.join(root,'src/apache-araon-runtime.mjs')],{stdio:'pipe'});
const asset=path.join(root,'assets/vehicle-models/apache-araon-50mesh.zlib');
assert(fs.existsSync(asset),'Falta el binari real de l’Apache a GitHub');
const compressed=fs.readFileSync(asset);
assert.equal(compressed.length,18862,'Mida binària Apache incorrecta');
assert.equal(crypto.createHash('sha256').update(compressed).digest('hex'),
 '23a6b241470d04f8cd021293d85b68ec65ecaace1e5a52fa3551f6edeb00ea56',
 'El binari Apache ha canviat inesperadament');
const data=zlib.inflateSync(compressed);
assert.equal(data.length,27481,'Descompressió Apache incompleta');
assert.equal(data.toString('ascii',0,4),'APG2','Capçalera compacta Apache incorrecta');
const v=[1518,178,53,164,144],f=[1481,153,45,264,230];
let p=4,triangles=0;
let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity,z0=Infinity,z1=-Infinity;
let rotorY0=Infinity,rotorY1=-Infinity;
for(let part=0;part<5;part++){
 const nv=data.readUInt32LE(p),nf=data.readUInt32LE(p+4);p+=8;
 assert.equal(nv,v[part],'Vèrtexs de la peça '+part);
 assert.equal(nf,f[part],'Triangles de la peça '+part);
 triangles+=nf;
 for(let i=0;i<nv;i++){
  const x=data.readInt16LE(p)/1000,y=data.readInt16LE(p+2)/1000,z=data.readInt16LE(p+4)/1000;
  p+=6;
  x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
  z0=Math.min(z0,z);z1=Math.max(z1,z);
  if(part===3){rotorY0=Math.min(rotorY0,y);rotorY1=Math.max(rotorY1,y)}
 }
 for(let i=0;i<nf*3;i++){
  assert(data.readUInt16LE(p)<nv,'Triangle amb índex invàlid a la peça '+part);
  p+=2;
 }
 p+=nv; // lluminositat original del material per vèrtex.
}
assert.equal(p,data.length,'Contingut incomplet o sobrant');
assert.equal(triangles,2173,'Els 2.173 triangles de l’Apache han de ser reals');
const k=7.15/(z1-z0),width=(x1-x0)*k;
const rotor=.405+((rotorY0+rotorY1)/2-y0)*k;
assert(width>4&&width<5.5,'L’Apache no cap a l’escala prevista');
assert(rotor>1&&rotor<4,'Altura del rotor incompatible amb la física');
console.log('Apache Araon: binari 18,9 kB, 2.173 triangles, 5 malles i dos rotors; escala coherent.');
