const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();game.start('67');const payload=game.run('captureNativeCoopWorld()');
 const {generateNativeMission,nativeFingerprint}=await import('../server/coop-native.mjs'),{restoreRelayMission}=await import('../server/coop-mission.mjs'),{createNativePrediction}=await import('../src/native-coop-prediction.mjs');
 const room={id:'prediction',revision:1,seed:67,mapScale:1,difficulty:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]},generated=generateNativeMission(room,payload,await nativeFingerprint(JSON.stringify(payload))),mission=restoreRelayMission(generated.record,generated.geometry);mission.setStatus('running');
 const prediction=createNativePrediction(payload.geometry),initial=mission.snapshot(),input={forward:0,turn:1,strafe:0,run:false};prediction.receive(initial,'a');prediction.sent(1);
 const moved=prediction.advance(1/30,input);assert.ok(moved.hd>initial.players[0].hd,'local turn responds before any network round trip');assert.equal(initial.players[0].hd,mission.snapshot().players[0].hd,'prediction never moves authority');
 mission.accept('a',{protocol:1,epoch:mission.meta.id,sequence:1,input,interact:false});mission.step(false);const confirmed=mission.snapshot();prediction.receive(confirmed,'a');assert.equal(prediction.pending(),0);assert.equal(prediction.advance(0,input).hd,confirmed.players[0].hd,'acknowledged step reconciles exactly');
 prediction.sent(2);prediction.advance(1/30,input);prediction.receive(confirmed,'a');assert.equal(prediction.pending(),1,'unacknowledged input is replayed');assert.ok(prediction.advance(0,input).hd>confirmed.players[0].hd);
 for(let i=0;i<100;i++)prediction.advance(.1,input);assert.equal(prediction.pending(),12,'loss of server updates cannot produce unlimited local drift');
 const paused={...confirmed,status:'paused'};prediction.receive(paused,'a');assert.equal(prediction.pending(),0);assert.equal(prediction.advance(.2,input).hd,confirmed.players[0].hd,'pause clears prediction');
 const seated=structuredClone(confirmed);seated.vehicles[0].seats=[null,'a'];prediction.receive(seated,'a');assert.equal(prediction.advance(.2,input).hd,confirmed.players[0].hd,'passengers cannot predict vehicle steering');
 const {stepRangeVehicle}=await import('../src/coop-vehicle-motion-core.mjs'),{createStaticWorldAdapter}=await import('../src/world-adapter.mjs'),{createCanonicalWater}=await import('../src/canonical-water.mjs'),{vehicleDynamics}=await import('../src/vehicle-dynamics-core.mjs');
 const clear={...payload.geometry,walls:[],trees:[],buildings:[],stairs:[],piers:[],bunker:null},world=createStaticWorldAdapter(clear),water=createCanonicalWater(world.heightAt),drive={forward:1,turn:.4,strafe:.2,climb:.3,run:false,crouch:false,fire:false};let types=0;
 for(const type of Object.keys(vehicleDynamics.types)){
   const row=structuredClone(confirmed.vehicles.find(v=>v.t===type));assert.ok(row,type+' exists in fixture');const mode=vehicleDynamics.types[type].m;
   Object.assign(row,{x:mode==='w'?2200:payload.spawn.x,z:mode==='w'?2200:payload.spawn.z,v:0,hd:0,seats:['a',null]});row.y=mode==='w'?water.surfaceAt(row.x,row.z,confirmed.tick/30):world.heightAt(row.x,row.z)+(mode==='a'?20:.06);if(mode==='a')row.alt=row.y;
   const state=structuredClone(confirmed);state.vehicles=[row];Object.assign(state.players[0],{x:row.x,y:row.y,z:row.z,hd:row.hd});
   const local=createNativePrediction(clear),expected=structuredClone(row);local.receive(state,'a');local.sent(2);
   for(let step=1;step<=6;step++){stepRangeVehicle(expected,drive,1/30,state.tick+step,world,water,{x0:-world.limit,x1:world.limit,z0:-world.limit,z1:world.limit});local.advance(1/30,drive);for(const field of ['x','y','z','hd','v','sideV','strafeV','alt','verticalV'])assert.equal(local.vehicle()[field],expected[field],type+' shared prediction '+field);}
   assert.ok(local.vehicle().driveInput>0,type+' accelerates without waiting for network');types++;
 }
 assert.equal(types,16);
 const car=structuredClone(confirmed.vehicles.find(v=>v.t==='cotxe'));Object.assign(car,{x:payload.spawn.x,z:payload.spawn.z,y:world.heightAt(payload.spawn.x,payload.spawn.z)+.06,hd:0,v:25,seats:['a',null]});
 const wall={id:'prediction-wall',x0:car.x-20,x1:car.x+20,z0:car.z-8.2,z1:car.z-8,y0:car.y-1,y1:car.y+10,open:false},blockedGeometry={...clear,walls:[wall]},blocked=structuredClone(confirmed);blocked.vehicles=[car];Object.assign(blocked.players[0],{x:car.x,y:car.y,z:car.z,hd:0});
 const collision=createNativePrediction(blockedGeometry);collision.receive(blocked,'a');collision.sent(2);for(let i=0;i<12;i++)collision.advance(1/30,{forward:1,turn:0,strafe:0,run:false});
 assert.ok(collision.vehicle().z>wall.z1,'prediction does not cross a solid wall');assert.equal(collision.vehicle().life,car.life,'predicted collision cannot apply authoritative damage');

 console.log('native prediction: response before RTT, original shared locomotion, authority isolation, acknowledgement/replay, bounded drift, pause, passenger gate and all 16 shared vehicle models passed');
})().catch(error=>{console.error(error);process.exitCode=1});
