// Humvee D3.1 regression: final 175% GLB, procedural A/B comparison,
// exact geometry conversion, and no dependency on deleted working GLB.
// Manual run: node tests/humvee-d31-game.cjs
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const baked=fs.readFileSync(path.join(root,'assets/humvee/humvee_D31_175.glb'));
const view=new DataView(baked.buffer,baked.byteOffset,baked.byteLength);
function gltfFromBinary(){
 assert.equal(view.getUint32(0,true),0x46546c67);
 assert.equal(view.getUint32(4,true),2);
 assert.equal(view.getUint32(8,true),baked.length);
 const jsonLength=view.getUint32(12,true);
 assert.equal(view.getUint32(16,true),0x4e4f534a);
 const gltf=JSON.parse(baked.subarray(20,20+jsonLength).toString('utf8'));
 const binHead=20+jsonLength;
 assert.equal(view.getUint32(binHead+4,true),0x004e4942);
 return {gltf,binHead:binHead+8};
}
(async()=>{
 const {D31_PROCEDURAL_DATA:procedural}=await import('../src/humvee-procedural-b-data.mjs');
 const {gltf,binHead}=gltfFromBinary();
 const bakedRoot=gltf.nodes.find(n=>n.extras?.baked);
 assert.ok(bakedRoot,'GLB root must carry baked=true');
 assert.equal(bakedRoot.extras.gameScale,1.75);
 assert.equal(bakedRoot.extras.bodyTriangles,1686);
 assert.equal(gltf.nodes.filter(n=>n.extras?.wheel).length,4);
 assert.equal(gltf.nodes.filter(n=>n.extras?.wheel&&n.extras.front).length,2);
 assert.equal(procedural.meta.scale,1.75);
 assert.equal(procedural.meta.triangles,2534);
 assert.equal(procedural.meta.sourceTriangles,1686);
 assert.equal(procedural.meshes.length,gltf.meshes.length);
 assert.equal(procedural.nodes.length,gltf.nodes.length);
 assert.equal(procedural.materials.length,gltf.materials.length);
 assert.equal(gltf.images[0].mimeType,'image/png');
 const imageView=gltf.bufferViews[gltf.images[0].bufferView];
 const tex=baked.subarray(binHead+imageView.byteOffset,binHead+imageView.byteOffset+imageView.byteLength);
 assert.deepEqual(Buffer.from(procedural.png,'base64'),tex,'Original texture must survive exactly in JS method B');
 // Byte-for-byte: all positions, normals and UVs must be identical.
 let triangles=0;
 for(let i=0;i<gltf.meshes.length;i++){
  const raw=gltf.meshes[i].primitives[0],stored=procedural.meshes[i];
  assert.equal(raw.material,stored.material);
  for(const [key,destination] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){
   const ref=raw.attributes[key];
   if(ref==null){assert.ok(stored[destination]===null);continue}
   const a=gltf.accessors[ref],v=gltf.bufferViews[a.bufferView],
     components=a.type==='VEC3'?3:a.type==='VEC2'?2:1,
     offset=binHead+(v.byteOffset||0)+(a.byteOffset||0),
     actual=baked.subarray(offset,offset+a.count*components*4);
   assert.deepEqual(Buffer.from(stored[destination],'base64'),actual,
    'Mismatch in procedural B '+i+'/'+key);
  }
  triangles+=stored.vertices/3;
 }
 assert.equal(triangles,2534);
 const AandB=read('src/humvee-procedural-models.mjs');
 assert.ok(AandB.includes('export function createHumveeMethodA(THREE)'));
 assert.ok(AandB.includes('export async function loadHumveeMethodB(THREE)'));
 assert.ok(AandB.includes('new THREE.ExtrudeGeometry'));
 assert.ok(AandB.includes('new THREE.CylinderGeometry'));
 assert.ok(AandB.includes("new THREE.Float32BufferAttribute(rawFloats(part.position),3)"));
 assert.ok(!/\b(loadAsync|fetch)\s*\(\s*['"\x60][^'"\x60]*\.glb/.test(AandB),
  'The A/B runtime must not request an external GLB');
 const preview=read('humvee-procedural-proves.html');
 assert.ok(preview.includes('createHumveeMethodA(THREE)'));
 assert.ok(preview.includes('loadHumveeMethodB(THREE)'));
 assert.ok(read('proves.html').includes('href="humvee-procedural-proves.html"'));
 assert.ok(read('humvee-preview.html').includes('humvee-procedural-proves.html'));
 const scale=read('src/humvee-d31-scale-preview.mjs');
 assert.ok(scale.includes("loadHumveeMethodB"));
 assert.ok(!scale.includes("humvee_D.glb"));
 const runtime=read('src/humvee-d31-runtime.mjs');
 assert.ok(runtime.includes('assets/humvee/humvee_D31_175.glb'));
 assert.ok(!runtime.includes('humvee_D.glb'));
 assert.ok(read('src/vehicles.js').includes('window.HUNTER_HUMVEE_D31.create()'));
 assert.ok(read('src/version.mjs').includes("'0.5.72'"));
 assert.equal(fs.existsSync(path.join(root,'assets/humvee/humvee_D.glb')),false,
  'The original temporary D source was supposed to be deleted');
 console.log('Humvee D3.1 175%: verified GLB and exact JS procedural B,',
  triangles,'triangles, 4 wheels; A parametric; no original source GLB');
})().catch(err=>{console.error(err);process.exitCode=1});
