const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const T=await import(pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')));
 global.window=global;
 for(const file of ['src/palette.js','src/player-model.js','src/bolt-cutters.js','src/characters.js'])
   vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
 const box=(g,w,h,d,c,x,y,z)=>{
   const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color:c}));
   m.position.set(x,y,z);g.add(m);return m;
 };
 const characters=window.HUNTER_CHARACTERS,
       model=characters.createPlayer(T,{box}),u=model.userData;
 const pose=characters.grenadeChargeArmPose;
 const close=(x,y,tolerance=.018)=>Math.abs(x-y)<tolerance;
 const half=pose(.5);
 assert(close(half.shoulderX,-.08,1e-8)&&close(half.shoulderZ,1.18,1e-8)&&close(half.elbowX,.72,1e-8),'old pose must remain at half charge');
 const low=pose(0),high=pose(1);
 assert(low.shoulderX>half.shoulderX&&half.shoulderX>high.shoulderX,'arm moves backwards as power increases');
 assert(low.shoulderZ<half.shoulderZ&&half.shoulderZ<high.shoulderZ,'arm opens with force');
 assert(high.elbowX>half.elbowX&&half.elbowX>low.elbowX,'elbow opens with force');
 assert.deepEqual(pose(-1),low);assert.deepEqual(pose(2),high);
 const common={forward:0,dt:1/60,swimming:false,inVehicle:false,ammo:16,
   bazookaEquipped:false,grenadeEquipped:true,sniperEquipped:false};
 const animate=(power,frames=90)=>{
   for(let i=0;i<frames;i++)characters.animatePlayer(model,{...common,grenadeChargePower:power});
   return {x:u.ar.rotation.x,z:u.ar.rotation.z,elbowX:u.aer.rotation.x,elbowZ:u.aer.rotation.z};
 };
 let before=null;
 for(const power of [0,.25,.5,.75,1]){
   const actual=animate(power),wanted=pose(power);
   assert(close(actual.x,wanted.shoulderX),'shoulder X at '+power);
   assert(close(actual.z,wanted.shoulderZ),'shoulder Z at '+power);
   assert(close(actual.elbowX,wanted.elbowX),'elbow X at '+power);
   assert(close(actual.elbowZ,wanted.elbowZ),'elbow Z at '+power);
   if(before)assert(actual.x<before.x&&actual.z>before.z,'continuous pose '+power);
   before=actual;
 }
 u.grenadeThrow=.55;u.grenadeReleased=false;u.grenadeThrowPower=1;
 const initial=animate(0,1);
 assert(initial.x<-.30&&initial.z>1.45,'throw starts from fully charged pose');
 for(let i=0;i<25;i++)characters.animatePlayer(model,{...common,grenadeEquipped:false,grenadeChargePower:0});
 assert(u.ar.rotation.x>initial.x&&u.ar.rotation.z<initial.z,'throw sweeps forward from charged pose');
 console.log('PASS: grenade arm 0/25/50/75/100%, midpoint and charged release');
})().catch(error=>{console.error(error);process.exitCode=1});
