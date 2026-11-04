#!/usr/bin/env node
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
assert.match(read('src/vehicle-model-core.mjs'),/damageSmokeOrigin=\[11\.5,6\.35,1\.8\]/);
assert.match(read('src/movement-fx.js'),/function damageSmoke\(v,damage,y,sourceX=v\.x,sourceZ=v\.z\)/);
(async()=>{
 const game=await require('./harness.cjs')();game.start('12345');game.frame();
 const result=game.run(`(()=>{
   const model=mkV('ferry'),seen=[],original=movementFx.damageSmoke;
   movementFx.damageSmoke=(...args)=>seen.push(args);
   try{
     for(const hd of [0,Math.PI/2]){
       model.position.set(P.x+3,0,P.z+4);model.rotation.y=hd;
       const ferry={t:'ferry',x:P.x+3,z:P.z+4,hd,o:model,smokeT:0};
       updateDamagedVehicleSmoke(ferry,.4,20,100);
       model.updateWorldMatrix(true,false);
       const expected=new THREE.Vector3(...model.userData.damageSmokeOrigin).applyMatrix4(model.matrixWorld);
       const [v,d,y,x,z]=seen.at(-1)||[];
       if(v!==ferry||d<.5||Math.hypot(x-expected.x,y-expected.y,z-expected.z)>1e-6)return {error:'smoke misaligned'};
     }
     return {ok:true};
   }finally{movementFx.damageSmoke=original}
 })()`);
 assert.equal(result.error,undefined);assert.equal(result.ok,true);
 console.log('OK fum del ferri des del sostre de la cabina');
})().catch(e=>{console.error(e);process.exitCode=1});
