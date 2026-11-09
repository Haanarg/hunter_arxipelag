// Regression: original and three distinct conservative BTR-82 LODs.
// Exercises the real Three.js r186 and vendored meshoptimizer under Node 22.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,symlinkSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {classifyBtr82Upload,LOD_PERCENTAGES} from '../src/btr82-upload-policy.mjs';

const cases=[
 {name:'low_poly_btr_82.glb',triangles:21483,meshes:199,targetSlot:4,expect:'source',slot:1},
 {name:'btr82-original-compatible.glb',triangles:21483,meshes:199,targetSlot:1,expect:'source',slot:1},
 ...[75,50,25].map((pct,i)=>({name:'btr82-'+pct+'pct.glb',
  triangles:[16109,10745,5371][i],meshes:18,targetSlot:1,expect:'lod',slot:i+2})),
 {name:'btr82-5pct-textures-ok.glb',triangles:1077,meshes:18,targetSlot:4,expect:'obsolete'},
 {name:'btr82-2pct.glb',triangles:448,meshes:18,targetSlot:4,expect:'obsolete'},
 {name:'custom-reduction.glb',triangles:5371,meshes:18,targetSlot:4,expect:'lod',slot:4},
 {name:'renamed-reduction.glb',triangles:10745,meshes:18,targetSlot:1,expect:'lod',slot:3}
];
for(const c of cases){
 const result=classifyBtr82Upload(c);
 assert.equal(result.kind,c.expect,c.name);
 if(c.expect!=='obsolete')assert.equal(result.slot,c.slot,c.name);
}
assert.deepEqual(LOD_PERCENTAGES,[75,50,25]);

// Three.js is already vendored, and addons import 'three'. For Node tests,
// expose a temporary package alias in the untracked node_modules directory.
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const alias=join(root,'node_modules/three');
mkdirSync(alias,{recursive:true});
writeFileSync(join(alias,'package.json'),JSON.stringify({
 name:'three',version:'0.186.0',type:'module',
 exports:{'.':'./index.mjs','./addons/*':'./addons/*'}
}));
writeFileSync(join(alias,'index.mjs'),"export * from '../../vendor/three-r186.module.mjs';\n");
const addon=join(alias,'addons');
if(!existsSync(addon))symlinkSync('../../vendor/three-addons',addon,'dir');
const THREE=await import('../vendor/three-r186.module.mjs');
const {buildBtr82Lod,countBtrTriangles,countBtrMeshes,BTR82_RATIOS,
 normalizeBtr82Glb}=await import('../src/btr82-aggressive-simplification.mjs');
assert.deepEqual(BTR82_RATIOS,[1,.75,.50,.25]);

const source=new THREE.Group(),mats=Array.from({length:10},(_,i)=>
 new THREE.MeshStandardMaterial({color:0x314a43+i*0x040402}));
const geo=new THREE.SphereGeometry(.5,8,6),turret=new THREE.Group();
turret.name='bone27_180';source.add(turret);
const wheels=['Object_428','Object_431','Object_434','Object_436',
 'Object_439','Object_441','Object_444','Object_446'];
for(let i=0;i<199;i++){
 const mesh=new THREE.Mesh(geo,i<8?mats[9]:mats[i%9]);
 mesh.name=i<8?wheels[i]:'Object_'+i;
 mesh.position.set((i%10)*1.2,Math.floor(i/10)*.4,(i%8)*1.1);
 (i>=175?turret:source).add(mesh);
}
const total=countBtrTriangles(source);
assert.equal(countBtrMeshes(source),199);
assert(total>=10000);
let prev=total,first=0;
for(const ratio of [.75,.50,.25]){
 const lod=await buildBtr82Lod(source,ratio);
 assert(lod,'Simplification should return a model');
 const triangles=countBtrTriangles(lod),meshes=countBtrMeshes(lod);
 assert(triangles>0&&triangles<total*.95,'LOD '+ratio+' did not simplify: '+triangles+'/'+total);
 assert(meshes<199,'LOD '+ratio+' did not merge: '+meshes);
 assert(lod.getObjectByName('BTR_82_TURRET'),'The turret pivot must be preserved');
 assert(wheels.every(n=>lod.getObjectByName('wheel:'+n)),'All eight wheel pivots must survive');
 if(first===0)first=triangles;
 assert(triangles<=prev,'Successively lower ratios should not increase triangles: '+ratio);
 prev=triangles;
 console.log('BTR82 synthetic actual meshoptimizer LOD',Math.round(ratio*100)+'%',
  triangles,'triangles',meshes,'meshes');
}
assert(prev<first,'The 25% LOD must have fewer triangles than 75%');
assert.equal(countBtrTriangles(source),total,'The source GLB must remain unmodified');

// Minimal original glTF extension translation: no geometry or texture bytes lost.
const json={asset:{version:'2.0'},extensionsUsed:['KHR_materials_pbrSpecularGlossiness'],
 extensionsRequired:['KHR_materials_pbrSpecularGlossiness'],
 materials:[{extensions:{KHR_materials_pbrSpecularGlossiness:{
 diffuseFactor:[.5,.7,.6,1],diffuseTexture:{index:0},glossinessFactor:0
 }}}],buffers:[{byteLength:0}]};
const str=new TextEncoder().encode(JSON.stringify(json)),len=(str.length+3)&~3;
const binary=new Uint8Array(12+8+len+8);
const view=new DataView(binary.buffer);
view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,binary.length,true);
view.setUint32(12,len,true);view.setUint32(16,0x4e4f534a,true);
binary.fill(32,20,20+len);binary.set(str,20);
view.setUint32(20+len,0,true);view.setUint32(24+len,0x004e4942,true);
const cleaned=await normalizeBtr82Glb(new Blob([binary]));
const arr=new Uint8Array(await cleaned.arrayBuffer());
const normalized=JSON.parse(new TextDecoder().decode(
 arr.subarray(20,20+new DataView(arr.buffer).getUint32(12,true))));
assert(!normalized.extensionsRequired?.includes('KHR_materials_pbrSpecularGlossiness'));
assert.equal(normalized.materials[0].pbrMetallicRoughness.baseColorTexture.index,0);
console.log('PASS: source/LOD import classification, true meshoptimizer reduction, 8 wheel pivots, palette extension compatibility');
