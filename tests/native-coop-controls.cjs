const assert=require('node:assert/strict');
(async()=>{
 const g=await require('./harness.cjs')();g.start('67');
 const {generateNativeMission,nativeFingerprint}=await import('../server/coop-native.mjs'),{restoreRelayMission}=await import('../server/coop-mission.mjs');
 const payload=g.run('captureNativeCoopWorld()'),room={id:'controls',revision:1,seed:67,mapScale:1,difficulty:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]};
 const generated=generateNativeMission(room,payload,await nativeFingerprint(JSON.stringify(payload))),mission=restoreRelayMission(generated.record,generated.geometry);mission.setStatus('running');
 const state=mission.snapshot(),bag=state.inventories.find(b=>b.actorId==='a');Object.assign(bag,{weapon:'sniper',sniper:1,sniperAmmo:6,grenades:3});
 g.context.controlState=state;const shots=[],inventory=[];
 g.context.controlChannel={combat:weapon=>{shots.push({weapon,tick:state.tick});return true;},inventory:(...args)=>{inventory.push(args);return true;},stop(){}};
 g.run(`nativeCoopSession={preparing:false,self:'a',state:controlState,remotes:new Map(),walls:Wl.slice(),buildings:B.slice(),palms:PL.slice(),vehicles:new Map(V.map(v=>[v.saveId,v])),enemies:new Map(E.map(e=>[e.saveId,e])),items:new Map(items.map(it=>[it.saveId,it])),projectiles:new Map(),grenades:new Map(),seenEffects:new Set(),channel:controlChannel};updateNativeCoop(0);`);
 assert.equal(g.run("selectNativeCoopWeapon('granada')"),true);g.run('updateNativeCoop(0)');
 assert.equal(g.run('selectedWeapon()'),'granada','grenade selection clears previous sniper flags even with unchanged authority inventory');
 assert.equal(g.run('sniperEquipped'),false);assert.equal(g.run("selectNativeCoopWeapon('unknown')"),false);
 g.run('beginGrenadeCharge()');assert.equal(g.run('!!grenadeCharge'),true);
 assert.equal(g.run("selectNativeCoopWeapon('pistola')"),true);assert.equal(g.run('grenadeCharge'),null,'switching weapons cancels an unreleased throw');assert.deepEqual(inventory.at(-1),['weapon','pistol']);
 bag.grenades=0;g.run("selectNativeCoopWeapon('granada');nativeCoopSession.state={...nativeCoopSession.state,inventories:nativeCoopSession.state.inventories.map(i=>i.actorId==='a'?{...i,grenades:0}:i)};updateNativeCoop(0)");assert.equal(g.run('grenadeEquipped'),false,'last confirmed grenade restores authority-selected weapon');
 bag.weapon='assault';bag.assault=1;
 g.run("nativeCoopSession.state={...nativeCoopSession.state,inventories:nativeCoopSession.state.inventories.map(i=>i.actorId==='a'?{...i,weapon:'assault',assault:1}:i)};updateNativeCoop(0);K.KeyF=1");
 for(let tick=0;tick<60;tick++){state.tick=tick;g.run('nativeCoopSession.state={...nativeCoopSession.state,tick:controlState.tick};updateNativeCoop(0)');}
 assert.deepEqual(shots.map(s=>s.tick),[0],'held fire sends one immediate command rather than a separate request per shot');assert.equal(g.run('nativeCoopInput().fire'),true,'ongoing fire is included in regular player input');
 const count=shots.length;g.run('paused=true');state.tick=100;g.run('nativeCoopSession.state={...nativeCoopSession.state,tick:controlState.tick};updateNativeCoop(0)');assert.equal(shots.length,count,'pause sends no fire');
 const input=g.run('nativeCoopInput()');assert.equal(input.forward,0);assert.equal(input.interact,false);
 g.run(`paused=false;cv={t:'heli_combat'};`);assert.equal(g.run('nativeCoopFireWeapon()'),'attackCannon');g.run(`cv={t:'heli'};`);assert.equal(g.run('nativeCoopFireWeapon()'),'grenade');g.run(`cv={t:'camio'};`);assert.equal(g.run("nativeCoopCommand('fire')"),false,'closed unarmed vehicles do not send pistol fire');
 const cleanup=g.run(`(()=>{const projectile=new THREE.Mesh(gLight,mW),grenade=createGrenadeModel();world.add(projectile,grenade);nativeCoopSession.projectiles.set('p',projectile);nativeCoopSession.grenades.set('g',grenade);stopNativeCoop();return {projectile:!!projectile.parent,grenade:!!grenade.parent,key:K.KeyF};})()`);
 assert.equal(cleanup.projectile,false);assert.equal(cleanup.grenade,false);assert.equal(cleanup.key,0);assert.equal(g.context.HUNTER_NATIVE_COOP.active(),false);
 console.log('native controls: grenade/weapon parity, charge cancellation, authoritative cadence, pause, mounted profiles and complete session cleanup passed');
})().catch(error=>{console.error(error);process.exitCode=1});
