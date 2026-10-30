const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('67');
 const {generateNativeMission,nativeFingerprint}=await import('../server/coop-native.mjs');
 const {restoreRelayMission}=await import('../server/coop-mission.mjs');
 const payload=game.run('captureNativeCoopWorld()');
 const room={id:'smooth-enemies',revision:1,seed:67,mapScale:1,difficulty:1,
  allReady:true,expiresAt:Date.now()+86400000,
  members:[{id:'a',name:'A'},{id:'b',name:'B'}]};
 const generated=generateNativeMission(room,payload,await nativeFingerprint(JSON.stringify(payload)));
 const mission=restoreRelayMission(generated.record,generated.geometry);
 mission.setStatus('running');
 const original=mission.snapshot();
 const target=original.combat.targets.find(row=>row.hp>0&&Number.isFinite(row.x)&&Number.isFinite(row.y));
 assert(target,'La missió de prova necessita un soldat actiu');
 game.context.coopEnemyFirst=original;
 game.run(`
 nativeCoopSession={preparing:false,self:'a',state:coopEnemyFirst,
  remotes:new Map(),walls:Wl.slice(),buildings:B.slice(),palms:PL.slice(),
  vehicles:new Map(V.map(v=>[v.saveId,v])),enemies:new Map(E.map(e=>[e.saveId,e])),
  items:new Map(items.map(it=>[it.saveId,it])),projectiles:new Map(),grenades:new Map(),
  seenEffects:new Set(),channel:{}};
 clearKeys();paused=false;worldVisualTick=1000;palmVisualTick=1000;
 updateNativeCoop(.016);`);
 const next={...original,tick:original.tick+3,
  combat:{...original.combat,targets:original.combat.targets.map(row=>row.id===target.id?
   {...row,x:row.x+4,heading:(row.heading||0)+.1}:row)}};
 game.context.coopEnemySecond=next;
 game.context.coopEnemyId=target.id;
 const before=game.run(`(()=>{
  const e=nativeCoopSession.enemies.get(coopEnemyId);
  return {logicalX:e.x,visualX:e.o.position.x};
 })()`);
 assert(before,'El soldat existeix al món gràfic');
 const mid=game.run(`(()=>{
  nativeCoopSession.state=coopEnemySecond;
  updateNativeCoop(.05);
  const s=nativeCoopSession,e=s.enemies.get(coopEnemyId);
  return {visualX:e.o.position.x,logicalX:e.x,tracks:s.interpolation.stats.activeEnemies};
 })()`);
 assert.equal(mid.logicalX,target.x+4,'La IA manté l’estat autoritatiu sense retard');
 assert(mid.visualX>before.visualX&&mid.visualX<target.x+4,
  'La posició gràfica del soldat avança entre snapshots');
 assert.equal(mid.tracks,1,'Només el soldat modificat té track gràfic');
 const end=game.run(`(()=>{
  updateNativeCoop(.05);
  return nativeCoopSession.enemies.get(coopEnemyId).o.position.x;
 })()`);
 assert(end>mid.visualX,'El soldat avança al següent frame sense paquet nou');
 const dead={...next,tick:next.tick+3,
  combat:{...next.combat,targets:next.combat.targets.map(row=>row.id===target.id?{...row,hp:0}:row)}};
 game.context.coopEnemyDead=dead;
 const final=game.run(`(()=>{
  nativeCoopSession.state=coopEnemyDead;updateNativeCoop(.016);
  const s=nativeCoopSession,e=s.enemies.get(coopEnemyId);
  return {visible:e.o.visible,track:s.interpolation.enemy(coopEnemyId)};
 })()`);
 assert.equal(final.visible,false,'L’enemic mort no es representa');
 assert.equal(final.track,null,'La mort retira la trajectòria visual');
 console.log('native coop enemy runtime: visual smoothing, authority isolation and death passed');
})().catch(err=>{console.error(err);process.exitCode=1});
