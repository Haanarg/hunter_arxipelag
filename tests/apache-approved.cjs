// Apache Araon en geometria nativa de Three.js: sense GLB ni descàrregues.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const runtime=read('src/apache-araon-runtime.mjs');
const core=read('src/vehicle-model-core.mjs'),boot=read('src/bootstrap.mjs');
const catalog=read('src/vehicle-candidate-catalog.mjs');
for(const check of ['Apache_Main_Rotor_Pivot','Apache_Tail_Rotor_Pivot',
 'APACHE_PACKED_TRIANGLES=2173','TARGET_LENGTH=10.725','WHEEL_CONTACT=.405',
 'rotor=p.main','tailRotor=p.tail','shell.rotation.y=Math.PI',
 'DecompressionStream','function rebuildLandingGear',
 "roundWheelCount=3",'Apache_Round_Wheel_','CylinderGeometry',
 "root.userData.apacheModel='araon-50-engine-native-round-wheels-150'"])
 assert(runtime.includes(check),'Falta un invariant Apache natiu: '+check);
assert(!runtime.includes('GLTFLoader')&&!runtime.includes('.glb')&&!runtime.includes('fetch('),
 'L’Apache natiu no pot dependre de fitxers GLB ni peticions de xarxa');
assert(boot.includes('prepareApacheAraonRuntime'));
assert(boot.indexOf('prepareApacheAraonRuntime')<boot.indexOf('const loadClassic='));
assert(core.includes('approvedApache')&&core.includes('apacheModel')&&core.includes('roundWheelCount=3'));
assert(!catalog.includes("{id:'heli_combat'"),'Apache acceptat ha de continuar absent dels candidats');
assert(!fs.existsSync(path.join(root,'assets/vehicle-models/apache-araon-salvia-black.glb')),
 'No s’ha retirat el GLB Apache del joc');
const encoded=runtime.match(/const APG2_DEFLATED='([^']+)';/);
assert(encoded&&encoded[1].length>25000,'No s’han incrustat les dades APG2 de l’Apache');
const compressed=Buffer.from(encoded[1],'base64');
assert.equal(compressed.length,18862,'Font Apache APG2 incorrecta');
assert.equal(crypto.createHash('sha256').update(compressed).digest('hex'),
 '23a6b241470d04f8cd021293d85b68ec65ecaace1e5a52fa3551f6edeb00ea56',
 'La geometria Apache original no coincideix amb el model validat');
const data=zlib.inflateSync(compressed);
assert.equal(data.length,27481);
assert.equal(data.toString('ascii',0,4),'APG2');
const v=[1518,178,53,164,144],f=[1481,153,45,264,230];
let p=4,total=0,discarded=0;
let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity,z0=Infinity,z1=-Infinity;
for(let part=0;part<5;part++){
 const nv=data.readUInt32LE(p),nf=data.readUInt32LE(p+4);p+=8;
 assert.equal(nv,v[part],'Nombre vèrtexs part '+part);
 assert.equal(nf,f[part],'Triangles part '+part);
 const points=[];
 for(let i=0;i<nv;i++){
  const x=data.readInt16LE(p)/1000,y=data.readInt16LE(p+2)/1000,z=data.readInt16LE(p+4)/1000;p+=6;
  points.push([x,y,z]);x0=Math.min(x0,x);x1=Math.max(x1,x);
  y0=Math.min(y0,y);y1=Math.max(y1,y);z0=Math.min(z0,z);z1=Math.max(z1,z);
 }
 for(let i=0;i<nf;i++){
  const a=data.readUInt16LE(p),b=data.readUInt16LE(p+2),c=data.readUInt16LE(p+4);p+=6;
  for(const index of [a,b,c])assert(index<nv,'Índex triangle invàlid');
  if(part===0){
   const x=(points[a][0]+points[b][0]+points[c][0])/3;
   const y=(points[a][1]+points[b][1]+points[c][1])/3;
   const z=(points[a][2]+points[b][2]+points[c][2])/3;
   const rear=Math.abs(x)>.70&&Math.abs(x)<1.35&&y<1.01&&z>.55&&z<1.83;
   const nose=Math.abs(x)<.34&&y<1.08&&z>2.08&&z<4.06;
   if(rear||nose)discarded++;
  }
 }
 total+=nf;p+=nv;
}
assert.equal(p,data.length);
assert.equal(total,2173);
assert(discarded>10&&discarded<300,'El filtre de les rodes ha eliminat massa o massa poques cares: '+discarded);
const k=10.725/(z1-z0),width=(x1-x0)*k;
assert(width>6&&width<9,'L’Apache no té el 150% de la mida esperada');
execFileSync(process.execPath,['--check',path.join(root,'src/apache-araon-runtime.mjs')]);
console.log('Apache natiu: 2173 triangles d’origen, '+discarded+' cares deformades retirades, tres rodes circulars, +50%.');
