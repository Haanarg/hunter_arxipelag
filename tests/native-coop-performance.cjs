const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();game.start('67');const payload=game.run('captureNativeCoopWorld()');
 const {generateNativeMission,nativeFingerprint}=await import('../server/coop-native.mjs'),{restoreRelayMission}=await import('../server/coop-mission.mjs'),{diffCoopState,applyCoopDelta}=await import('../src/coop-state-delta.mjs'),{writeCoopCheckpoint,readCoopCheckpoint}=await import('../server/coop-checkpoint.mjs');
 const room={id:'performance',revision:1,seed:67,mapScale:1,difficulty:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]},generated=generateNativeMission(room,payload,await nativeFingerprint(JSON.stringify(payload))),first=restoreRelayMission(generated.record,generated.geometry),second=restoreRelayMission(generated.record,generated.geometry);
 first.setStatus('running');second.setStatus('running');let previous=first.snapshot(),decoded=JSON.parse(JSON.stringify(previous)),fullBytes=0,deltaBytes=0;
 for(let frame=0;frame<30;frame++){
  for(let i=0;i<3;i++){first.step();assert.equal(second.step(false),undefined,'server can step without cloning a presentation snapshot');}
  const next=second.snapshot(),delta=diffCoopState(previous,next);fullBytes+=Buffer.byteLength(JSON.stringify(next));deltaBytes+=Buffer.byteLength(JSON.stringify(delta));decoded=applyCoopDelta(decoded,JSON.parse(JSON.stringify(delta)));assert.deepEqual(decoded,JSON.parse(JSON.stringify(next)));previous=next;
 }
 assert.deepEqual(first.snapshot(),second.snapshot(),'snapshot-free stepping preserves the full simulation');assert.ok(deltaBytes<fullBytes*.4,'steady-state payload reduced by at least 60%');
 const values=new Map();let bytes=0,metaWrites=0;const storage={async get(k){return structuredClone(values.get(k));},async put(k,v){values.set(k,structuredClone(v));bytes+=Buffer.byteLength(JSON.stringify(v));if(k.startsWith('native-meta:'))metaWrites++;}};
 await writeCoopCheckpoint(storage,second.checkpoint(100));const firstBytes=bytes;bytes=0;metaWrites=0;second.step(false);const record=second.checkpoint(200);await writeCoopCheckpoint(storage,record);const repeatedBytes=bytes;assert.equal(metaWrites,0,'static campaign metadata is written once');assert.deepEqual(await readCoopCheckpoint(storage),JSON.parse(JSON.stringify(record)),'split static/dynamic record restores losslessly');assert.ok(repeatedBytes<Buffer.byteLength(JSON.stringify(record))*.8,'repeated persistence writes at least 20% less data');
 const legacy=structuredClone(record);values.clear();values.set('mission',legacy);assert.deepEqual(await readCoopCheckpoint(storage),legacy,'legacy single-value checkpoint remains readable');
 console.log(JSON.stringify({fixture:'original-world-seed-67',frames:30,fullBytes,deltaBytes,payloadReductionPercent:Math.round((1-deltaBytes/fullBytes)*1000)/10,firstCheckpointBytes:firstBytes,repeatedCheckpointBytes:repeatedBytes,previousRepeatedBytes:Buffer.byteLength(JSON.stringify(record))}));
})().catch(error=>{console.error(error);process.exitCode=1});
