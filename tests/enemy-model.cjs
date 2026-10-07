const assert=require('node:assert/strict');
(async()=>{
 const {run}=await require('./harness.cjs')();
 const result=run(`(()=>{
  const model=HUNTER_CHARACTERS.createSoldier(THREE,{box:bx,material:M}),a=model.userData;
  const general=HUNTER_CHARACTERS.createSoldier(THREE,{box:bx,material:M,general:true});
  if(a.profile!=='enemy-commando-approved'||!a.knees||!a.elbows)throw Error('missing commando rig');
  const bounds=new THREE.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;
  if(Math.abs(height-3.294)>.0001||Math.abs(bounds.min.y)>.0001)throw Error('soldier size/ground changed');
  const green=pl.userData.cap.material.color.getHex();
  for(const [mat,,color]of a.mats)if(mat.color.getHex()!==color)throw Error('enemy not red');
  a.mats[0][0].color.setHex(0);if(pl.userData.cap.material.color.getHex()!==green)throw Error('shared mutable materials');
  for(let i=0;i<96;i++){
   HUNTER_CHARACTERS.animateSoldier(model,{phase:i*Math.PI/12,moving:true,aim:i>48,dt:1/30});
   for(const knee of a.knees)if(knee.rotation.x>0)throw Error('reversed knee');
   model.updateMatrixWorld(true);model.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))throw Error('invalid transform')});
  }
  const direction=new THREE.Vector3(0,0,-1).transformDirection(a.gun.matrixWorld);
  if(direction.z>-.98||Math.abs(direction.y)>.1)throw Error('rifle not aimed forward');
  HUNTER_CHARACTERS.animateSoldier(model,{dt:.1,death:1});
  if(a.knees.some(j=>j.rotation.x>=0))throw Error('death pose');
  if(general.userData.profile===a.profile||general.scale.x!==1)throw Error('general changed');
  return {height,poses:96,profile:a.profile,generalPreserved:true};
 })()`);
 assert.equal(result.poses,96);console.log(JSON.stringify({passed:true,...result}));
})().catch(e=>{console.error(e);process.exitCode=1});
