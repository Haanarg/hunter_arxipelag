'use strict';
// Regression of the REAL Three.js rider, windsurf rig, beach folding and pistol.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{
 const THREE=await import(pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')).href);
 const sandbox={Math};sandbox.window=sandbox;vm.createContext(sandbox);
 for(const f of ['src/palette.js','src/player-model.js','src/characters.js',
                 'src/vehicles.js','src/rider.js'])
   vm.runInContext(read(f),sandbox,{filename:f});
 const material=c=>new THREE.MeshStandardMaterial({color:c});
 const box=(g,w,h,d,c,x=0,y=0,z=0)=>{
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(c));
   mesh.position.set(x,y,z);g.add(mesh);return mesh;
 };
 const mk=sandbox.HUNTER_VEHICLES.createFactory(THREE,{box,material,shadows:false});
 const board=mk('windsurf'),rig=board.userData.windsurfRig;
 // Seven jet-ski hues, including red, each with contrasting sail panels.
 // Creating a differently colored board must not repaint existing boards.
 const carPalette={};
 vm.runInNewContext(read('src/civilian-cars.js'),{window:carPalette});
 const jetColors=carPalette.HUNTER_CIVILIAN_CARS.jetskiColors.map(c=>c.hex);
 assert.equal(jetColors.length,7,'Seven shared vivid hues');
 const colored=jetColors.map(color=>mk('windsurf',{color}));
 colored.forEach((v,i)=>{
   assert.equal(v.userData.windsurfSailColor,jetColors[i],
     'Sail keeps its selected palette color');
   assert.notEqual(v.userData.windsurfSailAccent,jetColors[i],
     'Contrasting decorative panels are distinguishable');
   const sail=v.userData.windsurfRig.getObjectByName('windsurf-sail');
   assert(sail,'Each windsurf contains its own sail mesh');
   assert.equal(sail.material.color.getHex(),jetColors[i],
     'Main sail material uses the selected jet-ski color');
 });
 assert.equal(colored[0].userData.windsurfRig.getObjectByName('windsurf-sail').material.color.getHex(),
   jetColors[0],'Other windsurfs do not recolor the first sail');
 assert.equal(new Set(colored.map(v=>v.userData.windsurfSailColor)).size,7,
   'All available windsurf colors are different');
 // Run real color-selection logic without graphics. Each windsurf uses
 // a different color but no extra calls to world generator's R().
 const generator=read('src/world-generation.js'),
       addStart=generator.indexOf('const add=(t,x,z,a,meta={})=>{'),
       addEnd=generator.indexOf('// Cap tanc neutral dins del HQ:',addStart);
 assert(addStart>=0&&addEnd>addStart,'Vehicle color generation exists');
 const env={window:carPalette,pa:{x:40,z:-53},V:[],seedSearchMode:true,
   R:()=>{env.randomCalls++;return .5},randomCalls:0,
   seedVehicleStub:()=>({}),mkV:()=>({}),hAt:()=>0,
   helicopterLandedAltitude:()=>0,world:{add:()=>{}},
   VT:{windsurf:{m:'w',life:1},moto_aquatica:{m:'w',life:3}}};
 const add=new Function('env','with(env){'+generator.slice(addStart,addEnd)+'return add;}')(env);
 for(let i=0;i<7;i++)add('windsurf',i*10,0,0);
 assert.equal(env.randomCalls,0,'Windsurf color selection preserves world RNG');
 assert.equal(new Set(env.V.map(v=>v.color)).size,7,
   'Seven windsurfs cycle through the entire shared palette');
 assert(env.V.every(v=>jetColors.includes(v.color)),
   'All windsurf colors come from the jet-ski palette');
 add('moto_aquatica',80,0,0);
 assert.equal(env.randomCalls,1,'Jet ski still consumes its normal RNG draw');
 assert(rig&&rig.parent===board,'Mast attached to the board');
 assert.equal(board.userData.windsurfGrips.length,2,'Two distinct hand grips');
 assert(board.userData.windsurfGrips.every(p=>p.x<0),'Mirrored sail is on port');
 assert(board.userData.windsurfGrips[0].distanceTo(board.userData.windsurfGrips[1])>.35,
   'Hands separated naturally on the boom');
 const scene=new THREE.Group();scene.add(board);
 const rider=sandbox.HUNTER_RIDER.create(THREE,{scene,box,material,
   scales:sandbox.HUNTER_VEHICLES.scales,heightAt:()=>.12,shadows:false});
 const v={t:'windsurf',o:board,x:0,z:0,hd:0,v:0,
   bump:0,beached:true,grounded:true};
 // Execute the production place() to test beach and raise transitions.
 sandbox.HUNTER_VEHICLE_DYNAMICS={shore:{draft:{windsurf:.12},clearance:()=>.25}};
 sandbox.HUNTER_WATER_JUMPS={update:()=>({lift:0,pitch:0})};
 const core=read('src/game-core.js'),
   start=core.indexOf('function place(v,t,dt,tr)'),
   end=core.indexOf('let runStepTimer=',start);
 assert(start>=0&&end>start,'Production vehicle placing function found');
 const physics={window:sandbox,THREE,cv:null,
   VT:{windsurf:{m:'w',maxF:22}},VS:sandbox.HUNTER_VEHICLES.scales,
   hAt:()=>.12,wy:()=>0,groundAt:()=>.12,vehicleBox:()=>({w:1.9,d:4.3}),
   animateTankTracks:()=>{}};
 vm.createContext(physics);
 vm.runInContext(core.slice(start,end),physics);
 physics.place(v,0,0,0);
 const fallenAxis=new THREE.Vector3(0,1,0).applyQuaternion(rig.quaternion);
 assert(Math.abs(fallenAxis.y)<.06&&fallenAxis.z>.95,
   'On the beach the mast is horizontal and parallel to the board');
 assert(new THREE.Box3().setFromObject(rig).max.y<1,
   'The grounded sail lies close to the beach rather than upright');
 // Boarding raises the same rig, without teleporting the mast or swapping arms.
 physics.cv=v;v.beached=false;v.grounded=false;v.v=8;
 for(let i=0;i<85;i++)physics.place(v,i*.05,.05,0);
 assert(board.userData.windsurfLay<.01,'Sail raises smoothly under control');
 assert(new THREE.Box3().setFromObject(rig).max.y>8,
   'The new sail is significantly taller than before');
 rider.update(v,.05);
 const obj=rider.object,u=obj.userData;
 assert(Math.abs(u.torso.rotation.y-1.13)<.05,'Seven-eighths mirrored torso');
 assert(u.torso.rotation.x>.1,'Torso leaning back');
 obj.updateWorldMatrix(true,true);board.updateWorldMatrix(true,true);
 const grips=board.userData.windsurfGrips.map(p=>rig.localToWorld(p.clone()));
 const shoulder=side=>new THREE.Vector3(side*.57,1.17,0)
   .applyQuaternion(u.torso.quaternion).add(u.torso.position)
   .applyMatrix4(obj.matrixWorld);
 for(const [i,side] of [[0,-1],[1,1]]){
   const forearm=u.limbs[i*2+1];
   const hand=new THREE.Vector3(0,-forearm.userData.restLength*forearm.scale.y,0)
     .applyQuaternion(forearm.quaternion).add(forearm.position)
     .applyMatrix4(obj.matrixWorld);
   assert(hand.distanceTo(grips[i])<.001,'Hand '+i+' rests exactly on its boom grip');
   assert(shoulder(side).distanceTo(grips[i])<1.48,'Arm '+i+' not overextended');
 }
 const leftBefore=u.limbs[1].quaternion.clone();
 const shot=rider.firePistol(v,(origin,dir)=>[dir.x,dir.y,dir.z]);
 assert(shot&&u.pistol.visible,'Right-handed pistol shot succeeds');
 assert(shot.origin.x>0,'Pistol muzzle is on the surfer’s right side');
 assert(shot.direction.z<-.98,'Projectile leaves the barrel forward');
 assert(u.limbs[1].quaternion.angleTo(leftBefore)<.001,
   'The left hand continues gripping the boom during the shot');
 console.log('PASS windsurf: riding pose, right-hand shot, beach sail and seven-color seeded palette');
})().catch(e=>{console.error(e);process.exitCode=1});
