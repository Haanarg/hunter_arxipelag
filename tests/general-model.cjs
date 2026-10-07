const assert=require('node:assert/strict');
(async()=>{
 const {run}=await require('./harness.cjs')();
 const result=run(`(()=>{
 const general=HUNTER_CHARACTERS.createSoldier(THREE,{box:bx,material:M,general:true}),a=general.userData;
 if(a.profile!=='general-approved-thick-epaulettes'||!a.knees||!a.elbows)throw Error('general rig');
 const bounds=new THREE.Box3().setFromObject(general);if(Math.abs(bounds.max.y-bounds.min.y-3.55)>.0001||Math.abs(bounds.min.y)>.0001)throw Error('general height/ground');
 const playerColor=pl.userData.cap.material.color.getHex();a.mats[0][0].color.setHex(0);if(pl.userData.cap.material.color.getHex()!==playerColor)throw Error('shared player material');
 for(let i=0;i<96;i++){
  HUNTER_CHARACTERS.animateSoldier(general,{phase:i*Math.PI/12,moving:true,aim:i>48,dt:1/30});
  if(a.knees.some(j=>j.rotation.x>0))throw Error('inverted knees');
  general.updateMatrixWorld(true);general.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))throw Error('invalid transform')});
 }
 const gunDir=new THREE.Vector3(0,0,-1).transformDirection(a.gun.matrixWorld);if(gunDir.z>-.98)throw Error('gun direction');
 HUNTER_CHARACTERS.animateSoldier(general,{dt:.1,death:1});if(a.knees.some(j=>j.rotation.x>=0))throw Error('death pose');
 return {profile:a.profile,height:bounds.max.y-bounds.min.y,poses:96};
 })()`);assert.equal(result.poses,96);
 const victory=run(`(()=>{R=mul(12345);world=new THREE.Group();const boss=mkEn('general',0,0,0);if(boss.o.userData.profile!=='general-approved-thick-epaulettes')throw Error('spawn model');hurtE(boss,boss.hp+1);return over===1&&DEAD.includes(boss)&&!E.includes(boss)&&endEl.textContent.includes('MISSIÓ COMPLERTA')})()`);
 assert(victory,'general death completes mission');result.victory=true;console.log(JSON.stringify({passed:true,...result}));
})().catch(e=>{console.error(e);process.exitCode=1});
