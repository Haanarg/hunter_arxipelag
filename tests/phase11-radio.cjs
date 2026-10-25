'use strict';
// Stateful radio behavior with real Three geometry; no WebGL or random game state.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
  const T=await import('../vendor/three-r186.module.mjs'),context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'src/radio-relay.js'),'utf8'),context);
  const factory=context.window.HUNTER_RADIO_RELAY;
  const {runtimeLayouts}=await import('../src/compound-runtime-layouts.mjs');
  let blocked=false,notifications=[],sounds=[],alerts=[],released=[];
  const colliders=new Set();
  const radio=factory.create({THREE:T,heightAt:()=>3,clearLine:()=>!blocked,
    notify:t=>notifications.push(t),sound:(...args)=>sounds.push(args),
    onAlert:(u,p)=>{alerts.push({unit:u,position:p});u.lastSeenX=p.x;u.lastSeenY=p.y;u.lastSeenZ=p.z;u.aiMode='investigate'},
    onRelease:(u,p)=>released.push({unit:u,position:p}),
    registerCollider:c=>colliders.add(c),unregisterCollider:c=>colliders.delete(c)});
  const unit=(x,z,extra={})=>({t:'soldat',x,z,hp:8,canSee:false,canShoot:false,aiMode:'patrol',o:{position:{y:3}},...extra});
  const layout=runtimeLayouts.find(l=>l.type==='comunicacions'&&l.variant===1);
  function fresh({logicalOnly=false,angle=0,extraSources=false}={}){
    notifications=[];sounds=[];alerts=[];released=[];blocked=false;
    const world=new T.Group(),witness=unit(0,0,{canSee:true}),guardA=unit(2000,100),guardB=unit(2010,100),
      elite=unit(2000,110,{elite:true}),basement=unit(2000,111,{basement:{}}),other=unit(2000,-100),
      hq={id:'hq',layoutId:'hq-v1',x:2000,z:0,r:130,layout:{friendly:false},entrances:[[2000,125]],
        soldiers:[guardA,guardB,elite,basement,other]},
      source={id:'comunicacions',layoutId:'comunicacions-v1',x:0,z:0,r:100,angle,
        layout,antennaFooting:{hp:24},soldiers:[witness]},
      witness2=unit(500,0,{canSee:true}),source2={...source,x:500,soldiers:[witness2],antennaFooting:{hp:24}},
      compounds=[source,hq,...(extraSources?[source2]:[])],enemies=[witness,guardA,guardB,elite,basement,other,witness2],
      player={x:-500,y:3,z:-500},ctx={player,vehicle:null,enemies,active:true};
    assert.equal(radio.configure({world,compounds,logicalOnly}),extraSources?2:1);
    return {world,witness,guardA,guardB,elite,basement,other,source,source2,witness2,hq,player,ctx};
  }

  // A relay is hidden until the real player can see it nearby, and is reachable on foot.
  let f=fresh(),p=radio.snapshot().relays[0];
  assert.equal(radio.markers().length,0);assert.equal(radio.getAction(f.ctx),null);
  assert.equal(colliders.size,1,'panel is a real destructible collider');
  radio.update(0,{...f.ctx,vehicle:{t:'heli',x:p.x,z:p.z,alt:300,o:{position:{y:300}}}});
  assert.equal(radio.markers().length,0,'high aircraft cannot discover at ground height');
  radio.update(0,{...f.ctx,vehicle:{t:'heli',x:p.x,z:p.z,alt:900,o:{position:{y:900}}}});
  assert.equal(f.world.getObjectByName('radio-relay-panel').visible,false,'distant control is culled');
  radio.update(0,{...f.ctx,vehicle:{t:'heli',x:p.x,z:p.z,alt:900},visualRange:3500});
  assert.equal(f.world.getObjectByName('radio-relay-panel').visible,true,'scope visual range is honored');
  Object.assign(f.player,{x:p.x,y:p.y,z:p.z+2});blocked=true;
  radio.update(.1,f.ctx);assert.equal(radio.markers().length,0);assert.equal(radio.getAction(f.ctx),null);
  blocked=false;f.player.y=p.y+8;assert.equal(radio.getAction(f.ctx),null,'different storey cannot sabotage');
  f.player.y=p.y;f.ctx.vehicle={...f.player};assert.equal(radio.getAction(f.ctx),null,'not while driving');
  f.ctx.vehicle=null;f.ctx.active=false;assert.equal(radio.getAction(f.ctx),null);
  radio.update(5,f.ctx);assert.equal(radio.snapshot().time,.1,'pause does not advance cooldown');
  f.ctx.active=true;radio.update(.1,f.ctx);
  assert.equal(radio.markers().length,1);assert.equal(radio.markers()[0].state,'active');
  const action=radio.getAction(f.ctx);assert.equal(action.kind,'sabotage');
  assert.equal(radio.interact(action,{...f.ctx,player:{...f.player,x:p.x+12}}),false,'stale distance is revalidated');
  assert.equal(radio.interact(action,f.ctx),true);assert.equal(sounds.length,1);
  assert.equal(radio.snapshot().relays[0].operational,false);
  assert.equal(radio.markers()[0].state,'disabled');
  assert.equal(radio.interact(action,f.ctx),false,'repeat sabotage is idempotent');
  assert.equal(radio.warn(f.witness,{x:40,z:40},3,f.ctx),0,'disabled relay cannot transmit');
  const panel=f.world.getObjectByName('radio-relay-panel');
  assert.ok(panel.getObjectByName('radio-relay-disabled').visible,'disabled state has a visible model');

  // Only an actual, living witness in this sector may send one immutable report.
  f=fresh({extraSources:true});
  const target={x:42,z:-22};
  f.witness.canSee=false;
  assert.equal(radio.warn(f.witness,target,3,f.ctx),0,'hearing or suspicion is not visual confirmation');
  f.witness.canSee=true;f.witness.hp=0;
  assert.equal(radio.warn(f.witness,target,3,f.ctx),0,'dead witness');f.witness.hp=8;
  assert.equal(radio.warn(f.witness,target,NaN,f.ctx),0,'invalid report height');
  assert.equal(radio.warn(f.witness,target,3,{...f.ctx,active:false}),0,'no background transmissions');
  assert.equal(radio.warn(f.witness,target,3,{...f.ctx,enemies:[]}),0,'old-world witness is rejected');
  const outsider=unit(0,0,{canSee:true});f.ctx.enemies.push(outsider);
  assert.equal(radio.warn(outsider,target,3,f.ctx),0,'unassigned soldiers do not get a radio');
  f.witness.x=500;
  assert.equal(radio.warn(f.witness,target,3,f.ctx),0,'portable radio coverage remains bounded');f.witness.x=0;
  assert.equal(radio.warn(f.witness,target,3,f.ctx),2);
  assert.equal(alerts.length,2);assert.equal(radio.snapshot().activeDefenders,2);
  assert.ok(alerts.every(a=>a.unit===f.guardA||a.unit===f.guardB),'fixed exterior group; no elite or general');
  assert.ok(alerts.every(a=>a.position.defensive&&Math.hypot(a.position.x-2000,a.position.z)<145),
    'distant reports defend the local HQ gate instead of marching through the sea');
  assert.ok(Math.hypot(alerts[0].position.x-alerts[1].position.x,alerts[0].position.z-alerts[1].position.z)>=9.9,
    'defenders receive separate destinations');
  assert.ok(alerts.every(a=>a.unit.canSee===false&&a.unit.canShoot===false),'radio never grants line of sight or fire');
  assert.equal(radio.warn(f.witness,target,3,f.ctx),0,'same-relay cooldown');
  assert.equal(radio.warn(f.witness2,target,3,f.ctx),0,'other relay cannot select more guards or repeat the same dispatch');
  assert.equal(alerts.length,2);
  target.x=999;target.z=999;
  const remembered=radio.snapshot().relays[0].lastReport;
  assert.equal(remembered.x,42);assert.equal(remembered.z,-22);
  remembered.x=1234;assert.equal(radio.snapshot().relays[0].lastReport.x,42,'snapshot cannot mutate retained intelligence');
  assert.equal(alerts[0].position.report.x,42,'recipient gets copied report');
  const originalGoal={x:f.guardA.lastSeenX,z:f.guardA.lastSeenZ};
  f.source.antennaFooting.hp=0;radio.update(.1,f.ctx);
  assert.equal(radio.snapshot().relays[0].disabledReason,'destroyed');
  assert.equal(radio.snapshot().activeDefenders,2,'sabotage cannot erase already transmitted information');
  assert.deepEqual({x:f.guardA.lastSeenX,z:f.guardA.lastSeenZ},originalGoal);
  assert.equal(radio.warn(f.witness,target,3,f.ctx),0);
  radio.update(29,f.ctx);assert.equal(released.length,0);
  f.guardB.canSee=true;radio.update(1,f.ctx);
  assert.equal(released.length,1,'lease completion does not cancel new visual combat');
  assert.equal(released[0].unit,f.guardA);
  assert.equal(radio.snapshot().activeDefenders,0);
  assert.equal(radio.warn(f.witness2,{x:60,z:40},3,f.ctx),1,'same finite surviving non-combat group can respond again later');
  assert.ok(alerts.every(a=>a.unit!==f.other),'additional soldiers never join by repeated alarm');

  // Reports already inside the HQ may be investigated directly; death never creates replacements.
  f=fresh();f.guardB.hp=0;
  assert.equal(radio.warn(f.witness,{x:2000,z:100},3,f.ctx),1);
  assert.equal(alerts[0].position.defensive,false);
  assert.ok(Math.hypot(alerts[0].position.x-2000,alerts[0].position.z-100)<4);
  assert.ok(alerts.every(a=>a.unit!==f.other));

  // Reset releases all owned geometry/materials and rejects old action object references.
  f=fresh();p=radio.snapshot().relays[0];Object.assign(f.player,{x:p.x,y:p.y,z:p.z+2});
  const old=radio.getAction(f.ctx),oldNodes=f.world.children.slice();let disposed=0;
  for(const node of oldNodes)node.traverse(o=>{
    if(o.geometry)o.geometry.addEventListener('dispose',()=>disposed++);
  });
  radio.reset();assert.equal(f.world.children.length,0);assert.equal(colliders.size,0);assert.ok(disposed>=7);
  assert.equal(radio.snapshot().relays.length,0);assert.equal(radio.markers().length,0);
  assert.equal(radio.snapshot().activeDefenders,0);assert.equal(radio.interact(old,f.ctx),false);
  f=fresh({logicalOnly:true});assert.equal(f.world.children.length,0,'logical generation allocates no visual nodes');
  assert.equal(colliders.size,1,'logical generation retains panel physics');
  [...colliders][0].hp=0;radio.update(0,f.ctx);
  assert.equal(radio.snapshot().relays[0].disabledReason,'destroyed','direct panel destruction works without a tower');

  // Every current communications variant and cardinal rotation leaves the control outside solid shells/plinth.
  for(const l of runtimeLayouts.filter(l=>l.type==='comunicacions'))for(const angle of[0,Math.PI/2,Math.PI,Math.PI*1.5]){
    const world=new T.Group(),source={id:'comunicacions',x:120,z:-80,r:110,angle,layout:l,
      antennaFooting:{hp:24},soldiers:[]};
    assert.equal(radio.configure({world,compounds:[source],logicalOnly:true}),1,l.layoutId+' has a control');
    const pos=radio.snapshot().relays[0],local=pos.local,r=l.antenna?4*(l.antenna.scale||1):0;
    if(l.antenna)assert.ok(Math.abs(local.x-l.antenna.x)>=r+1.35||Math.abs(local.z-l.antenna.z)>=r+1.35,l.layoutId+' plinth clearance');
    assert.ok(Math.abs(local.x)<l.size[0]/2-2&&Math.abs(local.z)<l.size[1]/2-2);
    for(const b of l.buildings){
      const turn=Math.abs(Math.round(Math.sin(b.rotationY||0))),w=turn?b.d:b.w,d=turn?b.w:b.d;
      assert.ok(Math.abs(local.x-b.x)>=w/2+1.35||Math.abs(local.z-b.z)>=d/2+1.35,l.layoutId+' building clearance');
    }
    const ctx={active:true,player:{x:pos.x,y:pos.y,z:pos.z+2},vehicle:null,enemies:[]};
    assert.equal(radio.getAction(ctx)?.kind,'sabotage',l.layoutId+' reachable at '+angle);
  }
  radio.reset();
  // Native integration: the panel participates in real world wall damage and E ignores only its own shell.
  const game=await require('./harness.cjs')(),run=game.run;
  run(`
    globalThis.radioIntegrationFresh=()=>{
      resetOptionalSystems();clearDeathCinematic();clearVictoryCinematic();
      if(world)scene.remove(world);world=new THREE.Group();scene.add(world);
      world.userData={compounds:[],airObstacles:[]};seed=67;R=mul(seed);hAt=()=>3;
      seedSearchMode=true;started=1;paused=false;over=0;simulationFocused=true;document.hidden=false;
      generationPromise=null;P.x=500;P.y=3;P.z=500;P.hd=0;cv=null;ib=null;
      playerFall=null;playerEject=null;swimming=false;scopeActive=false;hp=20;cheats.immune=false;
      B=[];Wl=[];Dr=[];stairs=[];piers=[];E=[];V=[];Pj=[];bombs=[];grenades=[];fx=[];DEAD=[];
      DB.length=0;WA.length=0;TG.clear();items=[];STEALTH.clear();
      const source={id:'comunicacions',x:0,z:0,r:100,angle:0,
        layout:window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.type==='comunicacions'&&l.variant===3),soldiers:[]},
        hq={id:'hq',x:2000,z:0,r:130,layout:{friendly:false},entrances:[[2000,125]],soldiers:[]};
      source.soldiers.push(mkEn('soldat',0,0,3));
      hq.soldiers.push(mkEn('soldat',1990,100,3),mkEn('soldat',2010,100,3));
      source.soldiers[0].canSee=true;
      world.userData.compounds=[source,hq];configureOptionalWorld();rebuildVehicleGrid();
      return source;
    };
  `);
  const native=run(`(()=>{
    const source=radioIntegrationFresh(),panel=radioRelay.snapshot().relays[0],
      wall=Wl.find(w=>w.owner?.kind==='radio-relay');
    if(!wall)throw Error('Radio panel has no native collider');
    P.x=panel.x;P.y=panel.y;P.z=panel.z+2;
    const action=getOptionalAction(),before=E.length,
      cover={x0:panel.x-2,x1:panel.x+2,z0:panel.z+.9,z1:panel.z+1.1,
        y0:panel.y,y1:panel.y+4,hp:100,open:false,m:new THREE.Group()};
    Wl.push(cover);wallGridCount=-1;
    const otherWallBlocks=!getOptionalAction();Wl.splice(Wl.indexOf(cover),1);wallGridCount=-1;
    act('KeyE');const sabotaged=!radioRelay.snapshot().relays[0].operational;
    radioIntegrationFresh();const live=radioRelay.snapshot().relays[0];
    P.x=500;P.z=500;boom(live.x,live.y+1.5,live.z,6,10,'p');
    updateOptionalSystems(.05,true);
    const destroyed=radioRelay.snapshot().relays[0],removed=!Wl.some(w=>w.owner?.kind==='radio-relay');
    const witness=radioIntegrationFresh().soldiers[0];
    soldierWarnNeighbors(witness,{x:42,z:-22},3);
    const localShout=STEALTH.events().some(e=>e.kind==='alert'),report=radioRelay.snapshot();
    const recipients=E.slice(1).map(u=>({mode:u.aiMode,canSee:u.canSee,canShoot:u.canShoot,
      x:u.lastSeenX,y:u.lastSeenY,z:u.lastSeenZ}));
    return {kind:action?.kind,otherWallBlocks,sabotaged,before,after:E.length,destroyed:destroyed.operational===false,
      reason:destroyed.disabledReason,removed,localShout,dispatches:report.relays[0].dispatches,recipients};
  })()`);
  assert.equal(native.kind,'sabotage','real E LOS is not blocked by the control itself');
  assert.equal(native.otherWallBlocks,true,'ignoring the own collider never bypasses another solid wall');
  assert.equal(native.sabotaged,true);assert.equal(native.before,native.after,'no enemies are spawned');
  assert.equal(native.destroyed,true);assert.equal(native.reason,'destroyed');
  assert.equal(native.removed,true,'real explosion removes the panel collider');
  assert.equal(native.localShout,true,'radio preserves native local hearing');
  assert.equal(native.dispatches,2,'actual soldier warning relays to two HQ guards');
  assert.ok(native.recipients.every(u=>u.mode==='investigate'&&!u.canSee&&!u.canShoot),
    'root integration never grants fire or visual contact from radio');
  assert.ok(native.recipients.every(u=>Math.hypot(u.x-2000,u.z)<145),'defense remains near HQ');
  console.log('OK radio: discovery/LOS/action, sabotage and destruction, real witness, copied reports, finite HQ defenders, cooldown/reset and all layout rotations');
})().catch(error=>{console.error(error);process.exitCode=1});
