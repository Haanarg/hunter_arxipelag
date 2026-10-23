// Node regression test: approved D3.1 Humvee geometry and its game hookup.
// Run manually: node tests/humvee-d31-game.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const glb=fs.readFileSync(path.join(root,'assets/humvee/humvee_D.glb'));
function sourceTriangles(){
 const data=new DataView(glb.buffer,glb.byteOffset,glb.byteLength);
 assert.equal(data.getUint32(0,true),0x46546c67);
 const jsonLength=data.getUint32(12,true);
 const gltf=JSON.parse(glb.subarray(20,20+jsonLength).toString('utf8'));
 const byteOffset=20+jsonLength+8;
 const accessor=(index,id,component)=>{
  const a=gltf.accessors[index],view=gltf.bufferViews[a.bufferView];
  const start=byteOffset+(view.byteOffset||0)+(a.byteOffset||0);
  const offset=start+id*component*(a.componentType===5125?4:4);
  return Array.from({length:component},(_,j)=>a.componentType===5125
   ?data.getUint32(offset+j*4,true)
   :data.getFloat32(offset+j*4,true));
 };
 const primitive=gltf.meshes[0].primitives[0],idx=primitive.indices;
 const faces=[];
 for(let i=0;i<gltf.accessors[idx].count;i+=3){
  const face=[];
  for(let j=0;j<3;j++){
   const index=accessor(idx,i+j,1)[0];
   face.push({p:accessor(primitive.attributes.POSITION,index,3),
    uv:accessor(primitive.attributes.TEXCOORD_0,index,2),n:[0,1,0]});
  }
  faces.push(face);
 }
 return faces;
}
(async()=>{
 const [geometry,refinement,patch,runtime]=await Promise.all([
  import('../src/humvee-d3-geometry.mjs'),
  import('../src/humvee-d31-refinements.mjs'),
  import('../src/humvee-d31-selected-patch.mjs'),
  import('../src/humvee-d31-runtime.mjs')
 ]);
 assert.equal(runtime.HUNTER_HUMVEE_GAME_SCALE,1.75);
 assert.deepEqual([...patch.SELECTED_D31_FRONT_PLUS_Z],[1242,1246,1250,1252]);
 const raw=sourceTriangles();assert.equal(raw.length,2499);
 const zs=raw.flatMap(tri=>tri.map(v=>v.p[2])).sort((a,b)=>a-b);
 const zAxis=(zs[Math.floor(.05*(zs.length-1))]+zs[Math.floor(.95*(zs.length-1))])*.5;
 const mesh=geometry.deriveSymmetricD3(raw,zAxis,[2200],{dropDoorFacets:false})[0];
 const noTires=refinement.removeOriginalTires(mesh.triangles,zAxis);
 assert.equal(mesh.faces,2196);
 assert.equal(noTires.triangles.length,1632,'D3.1 original face IDs have changed!');
 for(const id of patch.SELECTED_D31_FRONT_PLUS_Z){
  const c=noTires.triangles[id].reduce((sum,v)=>sum.map((n,i)=>n+v.p[i]/3),[0,0,0]);
  assert.ok(c[0]<0&&c[1]>.7&&c[2]>1);
 }
 const flattened=patch.flattenSelectedDoorPatchOnAllDoors(noTires.triangles,zAxis);
 assert.equal(flattened.stats.doors,4);
 assert.equal(flattened.stats.panels,8);
 assert.equal(flattened.stats.perDoorTriangles,2);
 assert.equal(flattened.triangles.length,1686);
 assert.ok(flattened.triangles.every(face=>face.length===3&&
  face.every(v=>v.p.every(Number.isFinite)&&v.uv.every(Number.isFinite))));
 const loader=read('src/humvee-d31-runtime.mjs');
 assert.ok(loader.includes("new THREE.TextureLoader().loadAsync(url)"),'GLB atlas must be loaded');
 assert.ok(loader.includes("root.userData.steeringPivots=steering"));
 assert.ok(loader.includes("root.userData.wheels=rolling"));
 const bootstrap=read('src/bootstrap.mjs');
 assert.ok(bootstrap.indexOf("prepareHumveeD31Runtime")<
  bootstrap.indexOf("else await loadLegacy()"),'Humvee must preload before vehicle factories');
 const vehicles=read('src/vehicles.js');
 assert.ok(vehicles.includes("window.HUNTER_HUMVEE_D31.create()"));
 assert.ok(vehicles.includes("cotxe:[3.65,6.45]"));
 assert.ok(vehicles.includes("g.userData.humveeModel='D3.1'"));
 assert.ok(read('src/rider.js').includes("humveeModel==='D3.1'"));
 assert.ok(read('src/enemy-ai.js').includes("mkV('cotxe');attachEnemyCarCrew(g)"),
  'Les patrulles enemigues també han de carregar el Humvee');
 assert.ok(read('src/enemy-lod.js').includes("humvee?4.65:3.1"),
  'El LOD de les patrulles ha de tenir la mida de la carrosseria nova');
 assert.ok(read('src/version.mjs').includes("'0.5.70'"));
 console.log('Humvee D3.1 175% game regression OK:',{
  original:mesh.faces,withoutTyres:noTires.triangles.length,
  flattened:flattened.triangles.length,doorPanels:flattened.stats.panels
 });
})().catch(error=>{console.error(error);process.exitCode=1;});
