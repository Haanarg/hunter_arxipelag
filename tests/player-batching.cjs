'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
  const T=await import('../vendor/three-r186.module.mjs'),w={};
  vm.runInNewContext(fs.readFileSync('src/player-batching.js','utf8'),{window:w});
  const root=new T.Group(),pivot=new T.Group();pivot.name='arm';root.add(pivot);
  const material=new T.MeshStandardMaterial({color:0x445533,roughness:.9});
  const keep=new T.Mesh(new T.BoxGeometry(.2,.3,.4),material);
  keep.position.set(1,.5,0);root.userData.aimTarget=keep;pivot.add(keep);
  for(let i=0;i<6;i++){
    const m=new T.Mesh(new T.BoxGeometry(.4,.6,.8),material);
    m.position.set(i*.6,.3,0);m.castShadow=m.receiveShadow=true;
    pivot.add(m);
  }
  const otherMaterial=new T.MeshStandardMaterial({color:0x334455});
  pivot.add(new T.Mesh(new T.BoxGeometry(.1,.1,.1),otherMaterial));
  root.updateMatrixWorld(true);
  const firstBounds=new T.Box3().setFromObject(root).clone();
  const originalTriangles=pivot.children.filter(m=>m.isMesh).reduce((n,m)=>{
    const g=m.geometry;return n+(g.index?g.index.count:g.attributes.position.count)/3;
  },0);
  const stats=w.HUNTER_PLAYER_BATCH.optimize(T,root);
  root.updateMatrixWorld(true);
  assert.strictEqual(keep.parent,pivot,'referenced mesh is not merged');
  assert.equal(stats.before,8);
  assert.equal(stats.after,3);
  assert.equal(stats.groups,5);
  const mesh=pivot.children.find(m=>m.name==='hunter-player-rigid-batch');
  assert(mesh,'batch exists');assert.equal(mesh.material,material);
  assert.equal(mesh.geometry.attributes.position.count,6*36);
  assert.equal(mesh.castShadow,true);assert.equal(mesh.receiveShadow,true);
  const afterBounds=new T.Box3().setFromObject(root);
  assert(firstBounds.min.distanceTo(afterBounds.min)<1e-5);
  assert(firstBounds.max.distanceTo(afterBounds.max)<1e-5);
  const afterTriangles=pivot.children.filter(m=>m.isMesh).reduce((n,m)=>{
    const g=m.geometry;return n+(g.index?g.index.count:g.attributes.position.count)/3;
  },0);
  assert.equal(afterTriangles,originalTriangles,'no geometry or triangles lost');
  pivot.rotation.y=.7;root.updateMatrixWorld(true);
  assert(firstBounds.min.distanceTo(afterBounds.min)<100,'pivot remains animatable');
  assert.equal(root.userData.aimTarget,keep,'userData references intact');
  const second=w.HUNTER_PLAYER_BATCH.optimize(T,root);
  assert.equal(second.groups,0,'idempotent');
  console.log('PASS player batching: rigid pieces, transforms, refs, shadows and triangles');
})().catch(e=>{console.error(e);process.exitCode=1});
