const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('67');
 const {generateNativeMission,nativeFingerprint}=await import('../server/coop-native.mjs');
 const {restoreRelayMission}=await import('../server/coop-mission.mjs');
 const payload=game.run('captureNativeCoopWorld()');
 const room={id:'interpolation-runtime',revision:1,seed:67,mapScale:1,difficulty:1,
  allReady:true,expiresAt:Date.now()+86400000,
  members:[{id:'a',name:'A'},{id:'b',name:'B'}]};
 const generated=generateNativeMission(room,payload,await nativeFingerprint(JSON.stringify(payload))),
  mission=restoreRelayMission(generated.record,generated.geometry);
 mission.setStatus('running');
 const original=mission.snapshot();
 const actor=original.players.find(p=>p.id==='a'),other=original.players.find(p=>p.id==='b'),
   car=original.vehicles[0];
 assert(actor&&other&&car,'Calen dos jugadors i un vehicle');
 const a={...actor,x:car.x+2,z:car.z+2},b={...other,x:car.x+5,y:car.y,z:car.z+5};
 const first={...original,tick:0,players:[a,b],
   vehicles:original.vehicles.map((v,i)=>i===0?{...v,seats:[null,null]}:v)};
 game.context.visualInterpolationFirst=first;
 game.run(`
 nativeCoopSession={preparing:false,self:'a',state:visualInterpolationFirst,
  remotes:new Map(),walls:Wl.slice(),buildings:B.slice(),palms:PL.slice(),
  vehicles:new Map(V.map(v=>[v.saveId,v])),enemies:new Map(E.map(e=>[e.saveId,e])),
  items:new Map(items.map(it=>[it.saveId,it])),projectiles:new Map(),grenades:new Map(),
  seenEffects:new Set(),channel:{},nextFireTick:1000};
 clearKeys();paused=false;worldVisualTick=1000;palmVisualTick=1000;
 updateNativeCoop(.016);
 `);
 const initial=game.run(`(()=>{
 const s=nativeCoopSession;
 const model=s.remotes.get('b'),v=s.vehicles.get(s.state.vehicles[0].id);
 return {remoteX:model.position.x,vehicleX:v.x,localX:P.x,cache:!!s.interpolation};
 })()`);
 assert(initial.cache,'El buffer es crea dins del mateix motor');
 assert.equal(initial.localX,a.x,'La càmera continua ancorada al jugador local');
 const second={...first,tick:3,
   players:[a,{...b,x:b.x+9,hd:b.hd+.2}],
   vehicles:first.vehicles.map((v,i)=>i===0?{...v,x:v.x+6}:v)};
 game.context.visualInterpolationSecond=second;
 const mid=game.run(`(()=>{
 nativeCoopSession.state=visualInterpolationSecond;
 updateNativeCoop(.05);
 const s=nativeCoopSession;
 return {remoteX:s.remotes.get('b').position.x,
  vehicleX:s.vehicles.get(s.state.vehicles[0].id).x,
  localX:P.x,interpolated:s.interpolation.stats.activeVehicles};
 })()`);
 const close=(actual,expected,label)=>assert(Math.abs(actual-expected)<.05,
 label+': expected '+expected+', got '+actual);
 close(mid.remoteX,b.x+4.5,'Company interpolat mig interval');
 close(mid.vehicleX,car.x+3,'Vehicle interpolat mig interval');
 close(mid.localX,a.x,'Jugador propi sense retard artificial');
 assert.equal(mid.interpolated,1,'Una sola trajectòria de vehicle en aquesta fixture');
 const end=game.run(`(()=>{
 updateNativeCoop(.05);
 return {remoteX:nativeCoopSession.remotes.get('b').position.x,
  vehicleX:nativeCoopSession.vehicles.get(nativeCoopSession.state.vehicles[0].id).x};
 })()`);
 close(end.remoteX,b.x+9,'Company arriba a la posició confirmada');
 close(end.vehicleX,car.x+6,'Vehicle arriba a la posició confirmada');
 // Un passatger local ha de seguir el vehicle remot, no bloquejar-ne
 // la interpolació per ser cv. La predicció queda reservada al conductor.
 const seated={...second,tick:6,vehicles:second.vehicles.map((v,i)=>i===0?
  {...v,seats:['b','a']}:v)};
 game.context.visualInterpolationSeated=seated;
 game.run('nativeCoopSession.state=visualInterpolationSeated;updateNativeCoop(.016)');
 const moved={...seated,tick:9,vehicles:seated.vehicles.map((v,i)=>i===0?
  {...v,x:v.x+6}:v)};
 game.context.visualInterpolationPassenger=moved;
 const passenger=game.run(`(()=>{
 nativeCoopSession.state=visualInterpolationPassenger;updateNativeCoop(.05);
 return {cvId:cv?.saveId,x:cv?.x};
 })()`);
 assert.equal(passenger.cvId,car.id,'El seient local continua reconegut');
 close(passenger.x,car.x+9,'Passatger segueix el vehicle remot interpolat');
 // Quan el pilot local prediu, el vehicle propi no pot rebre l'overlay remot.
 const driver={...moved,tick:12,vehicles:moved.vehicles.map((v,i)=>i===0?
  {...v,seats:['a','b'],x:v.x+6}:v)};
 game.context.visualInterpolationDriver=driver;
 const driven=game.run(`(()=>{
 const s=nativeCoopSession;
 s.prediction={advance(){return s.state.players[0]},vehicle(){return {
   id:s.state.vehicles[0].id,x:12345,z:456,hd:1,v:2}}};
 s.state=visualInterpolationDriver;updateNativeCoop(.05);
 return {cvId:cv?.saveId,x:cv?.x,localX:P.x};
 })()`);
 assert.equal(driven.cvId,car.id);
 assert.equal(driven.x,12345,'Predicció del pilot local té prioritat');
 assert.equal(driven.localX,a.x,'El jugador propi no es desplaça pel buffer');
 console.log('native coop original runtime: remote actor/vehicle interpolation, passenger and driver priority passed');
})().catch(e=>{console.error(e);process.exitCode=1});
