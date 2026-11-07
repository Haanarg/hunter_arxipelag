const assert=require('node:assert/strict');
(async()=>{
 const g=await require('./harness.cjs')();let payload,callbacks,commands=0;
 g.context.HUNTER_ACCOUNT_SERVICE={status:()=>({user:{id:'a'}})};
 g.context.HUNTER_NATIVE_COOP_TRANSPORT=options=>{callbacks=options;return {stats:{},start(){},stop(){},prepare(p){payload=p;},combat(){commands++;return true;},inventory(){return true;}};};
 const room={id:'startup',host:'a',revision:1,seed:67,mapScale:1,difficulty:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A',host:true},{id:'b',name:'B'}]};
 const task=g.context.HUNTER_NATIVE_COOP.start(room);await g.flushTasks();await task;
 assert.ok(payload.host);assert.ok(payload.payload.targets.some(e=>e.t==='general'));assert.equal(payload.fingerprint.length,64);assert.equal(g.run('generationPromise'),null);
 const {generateNativeMission}=await import('../server/coop-native.mjs'),{restoreRelayMission}=await import('../server/coop-mission.mjs'),generated=generateNativeMission(room,payload.payload,payload.fingerprint),mission=restoreRelayMission(generated.record,generated.geometry);mission.setStatus('running');
 callbacks.onMission({self:'a',meta:mission.meta,state:mission.snapshot()});g.run('update(1/30,0)');assert.equal(g.run('nativeCoopSession.preparing'),false);assert.equal(g.run('cam.isPerspectiveCamera'),true);
 g.dispatch('window','keydown',{code:'KeyW'});assert.equal(callbacks.getInput().forward,1);g.dispatch('window','keyup',{code:'KeyW'});g.run('fire()');assert.equal(commands,1,'original command authority routes fire to room');
 assert.throws(()=>g.run('captureOperation()'),/servidor/,'network state cannot overwrite a solo save');g.run('stopNativeCoop()');assert.equal(g.context.HUNTER_NATIVE_COOP.active(),false);
 console.log('native startup: original progressive generation, canonical preparation, room attachment, native controls, commands, save isolation and exit passed');
})().catch(e=>{console.error(e);process.exitCode=1});
