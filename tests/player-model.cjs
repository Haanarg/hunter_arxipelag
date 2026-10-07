// Model compartit, direcció de genolls, equipament i conductors reals (sense GPU).
const assert=require('node:assert/strict');
(async()=>{
 const {run}=await require('./harness.cjs')();
 const result=run(`(()=>{
  const u=pl.userData;
  if(u.profile!=='tactic-approved-long-visor'||u.profile!==rider.userData.profile)throw Error('different player/rider models');
  const original=u.mats.map(([m])=>m.color.getHex());setDis(true);
  const disguise=disg&&u.mats.every(([m],i)=>m.color.getHex()!==original[i]);
  const matching=rider.userData.mats.every(([m],i)=>m.color.equals(u.mats[i][0].color));setDis(false);
  for(const mode of ['walk','swim','aim','knife','bazooka','grenade']){
   u.firePose=mode==='aim'?2:0;u.meleePose=mode==='knife'?2:0;
   for(let i=0;i<48;i++){
    window.HUNTER_CHARACTERS.animatePlayer(pl,{forward:1,dt:1/60,swimming:mode==='swim',inVehicle:false,ammo:10,bazookaEquipped:mode==='bazooka',grenadeEquipped:mode==='grenade'});
    if(u.lkl.rotation.x>1e-6||u.lkr.rotation.x>1e-6)throw Error('inverted knee '+mode);
   }
   const visible=mode==='aim'?u.gun:mode==='knife'?u.knife:mode==='bazooka'?u.bazooka:mode==='grenade'?u.grenade:null;
   if(visible&&!visible.visible)throw Error('missing equipment '+mode);
  }
  const demo=HUNTER_RIDER.create(THREE,{scene:new THREE.Scene(),scales:VS,heightAt:()=>0,shadows:false}),driver=demo.object;
  let checks=0;
  for(const type of ['bici','moto','moto_aquatica','llanxa','llanxa_coets','barca_rems','windsurf']){
   const q={t:type,v:4,pedalPhase:0,o:mkV(type)};
   q.o.position.set(0,0,0);
   for(let phase=0;phase<24;phase++){
    q.pedalPhase=phase*Math.PI/12;demo.update(q,.1);driver.updateMatrixWorld(true);
    if(!driver.visible)throw Error('hidden driver '+type);
    driver.traverse(o=>{if(o.isMesh&&!o.matrixWorld.elements.every(Number.isFinite))throw Error('invalid transform '+type)});
    for(const limb of driver.userData.limbs)if(limb.scale.y<=0)throw Error('collapsed limb '+type);
    checks++;
   }
   if(type==='bici'){
    q.v=0;for(let k=0;k<90;k++)demo.update(q,1/60);
    if(driver.userData.motion>.00001)throw Error('feet not lowered at rest');
   }
  }
  demo.update(null,.1);if(driver.visible)throw Error('driver remains after exit');
  return {profile:u.profile,disguise,matching,poseChecks:checks,triangles:(()=>{let n=0;const body=HUNTER_PLAYER_MODEL.create(THREE);body.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3});return n})()};
 })()`);
 assert(result.disguise&&result.matching);assert.equal(result.poseChecks,168);assert.equal(result.triangles,2636);
 console.log(JSON.stringify({passed:true,...result}));
})().catch(e=>{console.error(e);process.exitCode=1});
