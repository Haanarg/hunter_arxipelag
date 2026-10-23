#!/usr/bin/env node
// Manual: node tests/humvee-procedural-b-and-heli-rotor.cjs
// No browser, WebGL, network model fetch or original GLB is necessary.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
(async()=>{
 const THREE=await import(pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')).href);
 // Mock only image download: use actual THREE geometries and scene graph.
 const loadTexture=THREE.TextureLoader.prototype.loadAsync;
 THREE.TextureLoader.prototype.loadAsync=async()=>new THREE.Texture();
 const previousFetch=global.fetch;
 global.fetch=async()=>{throw Error('Procedural B attempted network access')};
 try{
  const {prepareHumveeD31Runtime,HUNTER_HUMVEE_GAME_SCALE,HUNTER_HUMVEE_RENDERER}=
   await import(pathToFileURL(path.join(root,'src/humvee-d31-runtime.mjs')).href);
  assert.equal(HUNTER_HUMVEE_RENDERER,'procedural-B');
  assert.equal(HUNTER_HUMVEE_GAME_SCALE,1.75);
  const factory=await prepareHumveeD31Runtime(THREE,{vehicleScale:1.3});
  assert.equal(factory.renderer,'procedural-B');
  assert.equal(factory.bodyTriangles,1686);
  assert.equal(factory.renderedTriangles,2894);
  const first=factory.create(),second=factory.create();
  assert.equal(first.userData.humveeRenderer,'procedural-B');
  assert.equal(first.userData.wheels.length,4);
  assert.equal(first.userData.steeringPivots.length,2);
  assert.equal(second.userData.wheels.length,4);
  assert.equal(second.userData.steeringPivots.length,2);
  assert.notStrictEqual(first.userData.wheels[0],second.userData.wheels[0]);
  for(const wheel of first.userData.wheels)
   assert.equal(wheel.userData.radius,.875);
  const body=object=>object.getObjectByName('D31_Flattened_Body');
  assert.ok(body(first)?.isMesh && body(second)?.isMesh);
  assert.strictEqual(body(first).geometry,body(second).geometry,
   'All cars should reuse the same geometry');
  assert.strictEqual(body(first).material,body(second).material,
   'All cars should reuse the same material/texture');
  // Build the real vehicle and both helicopter types through its factory.
  const world={HUNTER_HUMVEE_D31:factory};
  const code=fs.readFileSync(path.join(root,'src/vehicles.js'),'utf8');
  vm.runInNewContext(code,{window:world,console,Math},{filename:'src/vehicles.js'});
  const material=color=>new THREE.MeshStandardMaterial({color});
  const box=(parent,w,h,d,color,x=0,y=0,z=0)=>{
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));
   mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  };
  const create=world.HUNTER_VEHICLES.createFactory(THREE,{box,material,shadows:false});
  const car=create('cotxe');
  assert.equal(car.userData.humveeModel,'D3.1');
  assert.equal(car.userData.wheels.length,4);
  assert.equal(car.userData.steeringPivots.length,2);
  assert.ok(Math.abs(new THREE.Box3().setFromObject(car).getSize(new THREE.Vector3()).x-
   factory.dimensions.width)<1e-4,'In-game size should remain at 175%');
  const roll=car.userData.wheels[0],steer=car.userData.steeringPivots[0];
  roll.rotation.x-=1.5;
  world.HUNTER_VEHICLES.animateSteering(car,'cotxe',1,.07);
  assert.ok(roll.rotation.x<0&&Math.abs(steer.rotation.y)>0);
  // One transverse bar = two opposed rotor blades on the combat heli.
  const combat=create('heli_combat'),utility=create('heli');
  assert.equal(combat.userData.rotor.children.filter(o=>o.isMesh).length,1);
  assert.equal(utility.userData.rotor.children.filter(o=>o.isMesh).length,2);
  assert.ok(combat.userData.tailRotor);
  console.log('OK: Humvee B (175%, 4 wheels, shared geometry), combat helicopter 2-blade rotor');
 }finally{
  THREE.TextureLoader.prototype.loadAsync=loadTexture;
  global.fetch=previousFetch;
 }
})().catch(error=>{console.error(error);process.exitCode=1});
