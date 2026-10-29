#!/usr/bin/env node
'use strict';
// Una actualització delta no pot reprojectar els vehicles i soldats intactes.
// La càmera, la predicció, el company i les animacions continuen cada fotograma.
const assert=require('node:assert/strict');
(async()=>{
  const game=await require('./harness.cjs')();game.start('67');
  const {generateNativeMission,nativeFingerprint}=await import('../server/coop-native.mjs'),
        {restoreRelayMission}=await import('../server/coop-mission.mjs');
  const payload=game.run('captureNativeCoopWorld()'),
        room={id:'incremental',revision:1,seed:67,mapScale:1,difficulty:1,allReady:true,
          expiresAt:Date.now()+86400000,members:[{id:'a',name:'A'},{id:'b',name:'B'}]},
        generated=generateNativeMission(room,payload,await nativeFingerprint(JSON.stringify(payload))),
        mission=restoreRelayMission(generated.record,generated.geometry);
  mission.setStatus('running');
  const state=mission.snapshot();
  assert(state.vehicles.length>=2&&state.combat.targets.length>=2,'Calen entitats per a la regressió');
  game.context.incrementalState=state;
  const first=game.run(`(()=>{
    nativeCoopSession={preparing:false,self:'a',state:incrementalState,
      remotes:new Map(),walls:Wl.slice(),buildings:B.slice(),palms:PL.slice(),
      vehicles:new Map(V.map(v=>[v.saveId,v])),enemies:new Map(E.map(e=>[e.saveId,e])),
      items:new Map(items.map(it=>[it.saveId,it])),projectiles:new Map(),grenades:new Map(),
      seenEffects:new Set(),channel:{},nextFireTick:1000};
    clearKeys();paused=false;worldVisualTick=1000;palmVisualTick=1000;uiTick=0;
    updateNativeCoop(.016);
    const s=nativeCoopSession,rows=s.state.vehicles,
      probeA=s.vehicles.get(rows[0].id),probeB=s.vehicles.get(rows[1].id),
      enemy=s.enemies.get(s.state.combat.targets[0].id),counts={a:0,b:0,enemy:0};
    const watch=(object,key,counter)=>{
      let value=object[key];
      Object.defineProperty(object,key,{configurable:true,enumerable:true,
        get(){return value},set(next){counts[counter]++;value=next;}});
    };
    watch(probeA,'x','a');watch(probeB,'x','b');watch(enemy,'x','enemy');
    const originalInventory=inv,remote=s.nativeRemoteViews.get('b'),
      initialRemoteTarget=remote.target;
    for(let frame=0;frame<20;frame++)updateNativeCoop(.016);
    return {counts:{...counts},inventoryStable:inv===originalInventory,
      remoteTargetStable:s.nativeRemoteViews.get('b').target===initialRemoteTarget,
      remoteModelStable:s.remotes.get('b')===remote.model};
  })()`);
  assert.deepEqual(first.counts,{a:0,b:0,enemy:0},'Cap escriptura autoritativa en 20 fotogrames sense estat nou');
  assert(first.inventoryStable&&first.remoteTargetStable&&first.remoteModelStable,
    'Inventari, càmera del company i vectors reutilitzats entre fotogrames');
  game.context.incrementalNext={
    ...state,tick:state.tick+3,
    vehicles:state.vehicles.map((row,i)=>i===0?{...row,x:row.x+3}:row)
  };
  const second=game.run(`(()=>{
    const s=nativeCoopSession,inventoryBefore=inv;
    s.state=incrementalNext;updateNativeCoop(.016);
    return {sameInventory:inv===inventoryBefore,
      previous:s.appliedVehicleRows.get(incrementalNext.vehicles[1].id)===incrementalNext.vehicles[1],
      changedX:s.vehicles.get(incrementalNext.vehicles[0].id).x,
      unchangedX:s.vehicles.get(incrementalNext.vehicles[1].id).x,
      enemyX:s.enemies.get(incrementalNext.combat.targets[0].id).x};
  })()`);
  assert(second.sameInventory,'Un delta de vehicle no reconstrueix l’inventari');
  assert(second.previous,'El vehicle intacte conserva la referència autoritativa');
  assert.equal(second.changedX,state.vehicles[0].x+3,'El vehicle modificat rep la nova posició');
  assert.equal(second.unchangedX,state.vehicles[1].x);
  assert.equal(second.enemyX,state.combat.targets[0].x,'El soldat intacte conserva la posició');
  const writes=game.run(`(()=>{
    const s=nativeCoopSession,rows=s.state.vehicles,e=s.enemies.get(s.state.combat.targets[0].id);
    let a=0,b=0,enemy=0;for(const [obj,key,cb] of [
      [s.vehicles.get(rows[0].id),'x',()=>a++],
      [s.vehicles.get(rows[1].id),'x',()=>b++],
      [e,'x',()=>enemy++]]){
      const d=Object.getOwnPropertyDescriptor(obj,key),original=d?.set;
      Object.defineProperty(obj,key,{...d,set(x){cb();original.call(this,x);}});
    }
    updateNativeCoop(.016);
    return {a,b,enemy};
  })()`);
  assert.deepEqual(writes,{a:0,b:0,enemy:0},'Cap segona projecció en el següent fotograma');
  console.log('OK coop incremental: 20 fotogrames sense reprojectar; només el vehicle canviat i caches remotes estables');
})().catch(error=>{console.error(error);process.exitCode=1});
