const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const T=await import(require('node:url').pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')));
 const c=vm.createContext({Math,console,Float32Array,Uint8Array});c.window=c;
 for(const file of ['src/waves.js','src/vehicle-dynamics.js','src/movement-fx.js'])
   vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
 const scene=new T.Scene(),time={value:0},bed=()=>-8,
   fx=c.HUNTER_MOVEMENT_FX.create(T,{scene,quality:'desktop',
     waveModel:c.HUNTER_WAVES,waterTime:time,waterBed:bed});
 assert.equal(scene.children.length,4,'exactly four stable draw meshes');
 assert(Object.values(fx.groups).every(g=>g.mesh.isInstancedMesh));
 assert(Object.values(fx.groups).every(g=>g.mesh.count===0));
 for(const group of Object.values(fx.groups))
   assert(group.material.vertexShader.includes('fxAlpha')&&
     group.material.vertexShader.includes('instanceMatrix')&&
     group.material.fragmentShader.includes('alphaFX'),
     'instanced per-particle fade and transforms');
 assert.equal(fx.footstep(0,0,0),false,'no splash on dry ground');
 assert.equal(fx.footstep(0,0,2.8),false,'swimmers do not create steps');
 assert(fx.footstep(0,0,.8),'shallow water creates splash');
 assert.equal(fx.stats.emitted.ripple,1);
 assert.equal(fx.stats.droplets,3);
 let emitted=fx.stats.emitted.ripple;
 fx.playerStep({phase:0,x:0,z:0,heading:0,moving:true,
   surfaceAt:()=>1,groundAt:()=>0,swimming:false,inVehicle:false,falling:false});
 assert(!fx.playerStep({phase:1.1,x:0,z:0,heading:0,moving:true,
   surfaceAt:()=>1,groundAt:()=>0}),'same stride must not repeat');
 assert(fx.playerStep({phase:3.3,x:0,z:0,heading:0,moving:true,
   surfaceAt:()=>1,groundAt:()=>0}),'foot phase creates one contact');
 emitted++;
 assert.equal(fx.stats.emitted.ripple,emitted);
 assert(!fx.playerStep({phase:6.4,x:0,z:0,heading:0,moving:false,
   surfaceAt:()=>1,groundAt:()=>0}),'stopped person does not splash');
 const v={t:'llanxa',x:0,z:0,hd:0,v:30,yawRate:.1};
 const vehicleOptions={playerX:0,playerZ:0,terrainAt:()=>-8,waterAt:()=>0};
 fx.vehicle(v,.1,vehicleOptions);v.z=-4;fx.vehicle(v,.1,vehicleOptions);
 assert(fx.stats.emitted.wake>=3&&fx.stats.waterTrails>0,'boat leaves two curling wake edges');
 const car={t:'cotxe',x:0,z:0,hd:0,v:25};fx.vehicle(car,.1,vehicleOptions);
 car.z=-3;fx.vehicle(car,.1,{...vehicleOptions,terrainAt:()=>2,waterAt:()=>0});
 assert(fx.stats.landTrails>0&&fx.stats.emitted.smoke>0,'land exhaust and dust');
 const bike={t:'bici',x:0,z:0,hd:0,v:12};
 const before=fx.stats.emitted.smoke;
 fx.vehicle(bike,.1,vehicleOptions);bike.z=-3;fx.vehicle(bike,.1,vehicleOptions);
 assert.equal(fx.stats.emitted.smoke,before,'bicycles do not emit exhaust');
 const heli={t:'heli_combat',x:1,z:1,alt:6,hd:.7,v:0};
 fx.vehicle(heli,.2,{...vehicleOptions,playerVehicle:heli,terrainAt:()=>1,waterAt:()=>0});
 assert(fx.stats.downwash>0,'hovering piloted helicopter raises dust');
 const parked={t:'heli',x:2,z:2,alt:3,hd:0,v:0},noEngine=fx.stats.downwash;
 fx.vehicle(parked,.2,{...vehicleOptions,terrainAt:()=>1,waterAt:()=>0});
 assert.equal(fx.stats.downwash,noEngine,'parked helicopter with stopped rotor emits no dust');
 const dustCount=fx.stats.emitted.air;
 heli.alt=50;fx.vehicle(heli,.2,{...vehicleOptions,playerVehicle:heli,terrainAt:()=>1,waterAt:()=>0});
 assert.equal(fx.stats.emitted.air,dustCount,'high helicopter does not raise dust');
 fx.damageSmoke(car,.8,4);
 const camera=new T.PerspectiveCamera();camera.position.set(0,10,20);
 fx.update(.016,camera);
 assert(fx.stats.active.wake>0&&fx.stats.active.air>0);
 assert(fx.stats.drawMeshes<=4&&fx.stats.drawMeshes>=3);
 assert.equal(fx.groups.wake.mesh.count,fx.stats.active.wake);
 for(const g of Object.values(fx.groups))assert(g.mesh.count<=g.capacity);
 fx.setWaterVisible(false);
 assert(!fx.groups.wake.mesh.visible&&!fx.groups.ripple.mesh.visible);
 assert(!fx.footstep(0,0,.8),'disabled sea prevents foam effects');
 fx.setWaterVisible(true);assert(fx.groups.wake.mesh.visible);
 for(let i=0;i<1000;i++)fx.emit('wake',{x:i,z:0,width:1});
 fx.update(.1,camera);
 assert(fx.groups.wake.mesh.count<=fx.groups.wake.capacity,'particle pool is bounded');
 fx.reset();
 assert(Object.values(fx.groups).every(g=>g.mesh.count===0),'reset drops every old-world trail');
 const material=fx.groups.wake.material;
 fx.dispose();
 assert.equal(scene.children.length,0,'no leaked meshes on cleanup');
 console.log('PASS: 4 pooled meshes, footsteps, wakes, dust/exhaust, downwash, disabled water, disposal',
   JSON.stringify(fx.stats));
 const game=await require('./harness.cjs')();
 game.start('67');
 const integration=game.run(`(()=>{
  const models=V.filter(v=>v.t==='heli'||v.t==='llanxa'||v.t==='cotxe').length,
    initialized=!!window.HUNTER_MOVEMENT_FX_STATS&&movementFx.groups.wake.mesh.parent===scene,
    joined=movementFx.groups.wake.material.uniforms.time===water.uniforms.time;
  movementFx.footstep(P.x,P.z,.8);
  movementFx.update(.016,cam);
  const visible=movementFx.groups.ripple.mesh.count>0;
  movementFx.reset();
  return {models,initialized,joined,visible,reset:movementFx.groups.ripple.mesh.count===0};
 })()`);
 for(const [key,value] of Object.entries(integration))assert(value,key+': '+JSON.stringify(integration));
 console.log('PASS: real world initialization and identical animated water time');
})().catch(e=>{console.error(e);process.exitCode=1});
