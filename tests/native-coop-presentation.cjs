const assert=require('node:assert/strict');
(async()=>{
 const g=await require('./harness.cjs')();g.start('67');
 const {generateNativeMission,nativeFingerprint}=await import('../server/coop-native.mjs'),{restoreRelayMission}=await import('../server/coop-mission.mjs');
 const payload=g.run('captureNativeCoopWorld()'),room={id:'presentation',revision:1,seed:67,mapScale:1,difficulty:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]};
 const generated=generateNativeMission(room,JSON.parse(JSON.stringify(payload)),await nativeFingerprint(JSON.stringify(payload))),mission=restoreRelayMission(generated.record,generated.geometry);mission.setStatus('running');
 const state=mission.snapshot();state.players[0].x=150;state.players[0].z=150;state.players[0].hd=0;state.players[1].x=-150;state.players[1].z=-150;state.players[1].hd=Math.PI;
 g.context.nativeTestState=state;g.context.nativeTestMeta=mission.meta;
 const before=g.run('ren.domElement');
 for(const self of ['b','a']){
  g.context.nativeTestSelf=self;
  const result=g.run(`(()=>{nativeCoopSession={preparing:false,self:nativeTestSelf,state:nativeTestState,meta:nativeTestMeta,remotes:new Map(),walls:Wl.slice(),buildings:B.slice(),palms:PL.slice(),vehicles:new Map(V.map(v=>[v.saveId,v])),enemies:new Map(E.map(e=>[e.saveId,e])),items:new Map(items.map(it=>[it.saveId,it])),projectiles:new Map(),grenades:new Map(),seenEffects:new Set(),lastFire:0,channel:{}};update(1,0);return {p:{...P},camera:cam.position.toArray(),perspective:cam.isPerspectiveCamera,hud:document.getElementById('hud').innerHTML,remote:nativeCoopSession.remotes.size};})()`);
  const actor=state.players.find(p=>p.id===self);assert.equal(result.p.x,actor.x);assert.equal(result.p.z,actor.z);assert.equal(result.p.hd,actor.hd);assert.equal(result.perspective,true);assert.equal(result.remote,1);
  const behind=(result.camera[0]-actor.x)*Math.sin(actor.hd)+(result.camera[2]-actor.z)*Math.cos(actor.hd);assert.ok(behind>0,'original camera follows own actor from behind');assert.ok(result.hud.includes('HUNTER'));
  assert.equal(g.run('ren.domElement'),before,'same original renderer/canvas');
  g.run('stopNativeCoop()');
 }
 console.log('native presentation: both identities/order, original HUD, perspective chase camera, same renderer and remote native model passed');
})().catch(e=>{console.error(e);process.exitCode=1});
