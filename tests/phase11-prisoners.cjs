#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
(async()=>{
 const THREE=await import('../vendor/three-r186.module.mjs');
 const safeMath=Object.create(Math);safeMath.random=()=>{throw new Error('NPCs must not consume gameplay/ambient RNG')};
 const context=vm.createContext({window:{},Math:safeMath});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/prisoners.js'),'utf8'),context);
 const factory=context.window.HUNTER_PRISONERS;
 const layout={prisoners:[
  ...[-8,-3,3,8].map((x,i)=>({id:'farmer-'+(i+1),role:'farmer',x,z:-6})),
  {id:'mechanic-1',role:'mechanic',x:0,z:3}],
  rescuePoint:{x:0,z:8},mechanicStation:{x:33,z:16},escapeRoute:[[0,8],[0,30],[0,62],[0,86]]};
 function fixture(options={}){
  let clear=true,move=true,water=false;
  const messages=[],sounds=[],world=new THREE.Group(),camp={x:0,z:0,angle:0,layout},
   player={x:0,y:3,z:8,hd:0},ctx={player,vehicle:null,vehicles:[],enemies:[],active:true},
   api=factory.create({THREE,heightAt:()=>water?-1:3,canMove:()=>move,clearLine:()=>clear,
    vehicleRadius:t=>t==='ferry'?30:4,vehicleName:v=>v.t==='camio'?'Camió':v.t,
    notify:t=>messages.push(t),sound:(...args)=>sounds.push(args)});
  api.configure({world,camp,...options});
  const tick=(seconds=1)=>{for(let t=0;t<seconds-1e-9;t+=.25)api.update(Math.min(.25,seconds-t),ctx)};
  const mech=()=>api.entities.find(u=>u.role==='mechanic');
  const vehicle=(overrides={})=>{
   const v={t:'camio',x:36,z:16,v:0,life:4,maxLife:10,ammo:7,rockets:2,
    o:new THREE.Object3D(),...overrides};v.o.position.set(v.x,3,v.z);ctx.vehicles.push(v);return v;
  };
  function release(){api.update(0,ctx);const action=api.getAction(ctx);assert.equal(action?.kind,'rescue');assert.equal(api.interact(action,ctx),true)}
  function ready(){release();tick(40);assert.equal(mech().state,'ready');player.x=33;player.z=16}
  return{api,ctx,world,camp,player,messages,sounds,tick,mech,vehicle,release,ready,
   setClear:v=>clear=v,setMove:v=>move=v,setWater:v=>water=v};
 }

 // Adult civilians match the real upright protagonist, with grounded captive poses.
 {
  const game=await require('./harness.cjs')();
  const playerHeight=game.run(`(()=>{
   const player=window.HUNTER_CHARACTERS.createPlayer(THREE,{box:bx});
   player.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(player);
   return box.max.y-box.min.y;
  })()`);
  const f=fixture(),bounds=u=>{u.o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(u.o)};
  const standing=f.api.entities.filter(u=>u.pose==='standing'),seated=f.api.entities.filter(u=>u.pose==='seated');
  assert.equal(standing.length,3,'two farmers and the mechanic stand');
  assert.equal(seated.length,2,'two farmers sit on the ground');
  const check=u=>{
   const box=bounds(u),actualHeight=box.max.y-box.min.y;
   assert(Math.abs(box.min.y-u.y)<1e-6,u.id+' rests on terrain');
   assert(Math.abs(actualHeight-u.height)<1e-5,u.id+' projectile height follows posed geometry');
   for(const extent of[box.min.x-u.x,box.max.x-u.x,box.min.z-u.z,box.max.z-u.z])
    assert(Math.abs(extent)<=u.radius+1e-5,u.id+' projectile footprint contains the model');
   if(u.pose==='standing')assert(Math.abs(actualHeight-playerHeight)<1e-4,u.id+' is as tall as the actual protagonist');
   else assert(actualHeight<playerHeight*.7,u.id+' is visibly sitting rather than scaled down');
  };
  f.api.entities.forEach(check);f.tick(5);f.api.entities.forEach(check);
  assert.equal(f.mech().pose,'standing','mechanic waits upright');
  f.release();assert(f.api.entities.every(u=>u.pose==='standing'),'all captives stand before walking');
  f.api.entities.forEach(check);f.tick(40);f.api.entities.forEach(check);f.api.reset();
 }

 // The physical pen opens only on a successful rescue, before any escape motion.
 {
  const {prisonCampLayout}=await import('../src/prison-camp-layout.mjs');
  const f=fixture();f.camp.layout=prisonCampLayout;let opens=0;
  f.camp.prisonGate={opened:false,colliders:[{open:false,hp:4}],open(){
   assert(f.api.entities.every(u=>u.state==='captive'&&!u.path.length),'gate opens while prisoners remain inside');
   opens++;this.opened=true;this.colliders[0].open=true;this.colliders[0].hp=0;
  }};
  f.api.configure({world:f.world,camp:f.camp});
  f.player.x=prisonCampLayout.rescuePoint.x;f.player.z=prisonCampLayout.rescuePoint.z;
  f.ctx.enemies=[{t:'soldat',x:0,y:3,z:28,hp:4,canSee:true}];
  f.release();assert.equal(opens,0,'near combat cannot unlock the inner gate');
  assert.equal(f.api.snapshot().released,false);
  f.ctx.enemies=[];f.release();assert.equal(opens,1);
  assert.equal(f.camp.prisonGate.opened,true);assert.equal(f.camp.prisonGate.colliders[0].open,true);
  const mechanic=f.mech();
  assert.deepEqual(mechanic.path.map(p=>[p.x,p.z]),prisonCampLayout.mechanicRoute,
   'mechanic follows the authored route through the inner gate, then around the fence');
  f.tick(40);assert.equal(mechanic.state,'ready');
  assert(f.api.entities.filter(u=>u.role==='farmer').every(u=>u.state==='rescued'));
  f.api.update(0,f.ctx);assert.equal(opens,1,'gate opening cannot replay during later frames');f.api.reset();
 }

 // Discovery is a real observation, never a map-wide quest reveal.
 {
  const f=fixture();assert.equal(f.api.entities.length,5);assert.equal(f.world.children.length,5);
  assert(f.api.entities.every(u=>u.o.visible===false),'models begin hidden until a real observer update');
  assert.equal(f.api.markers().length,0);assert.equal(f.api.getAction(f.ctx),null);
  f.setClear(false);f.tick();assert.equal(f.api.snapshot().discovered,false);
  f.setClear(true);f.player.x=300;f.tick();assert.equal(f.api.snapshot().discovered,false);
  f.player.x=0;f.ctx.active=false;f.tick();assert.equal(f.api.snapshot().discovered,false);
  f.ctx.active=true;f.tick();assert.equal(f.api.snapshot().discovered,true);
  assert.equal(f.api.markers()[0].kind,'prison');
  assert(f.api.entities.every(u=>u.t==='civilian'&&u.friendly&&u.hp===4&&!u.destroyed));
  assert(f.api.entities.filter(u=>u.role==='farmer').every(u=>u.o.children.length>0));
  assert(f.mech().o.name.includes('mechanic'));
  f.api.reset();assert.equal(f.world.children.length,0);assert.equal(f.api.entities.length,0);
 }

 // Rendering range is three-dimensional and independent of prisoner simulation/death.
 {
  const f=fixture(),u=f.mech();f.api.update(0,f.ctx);assert.equal(u.o.visible,true);
  f.player.x=500;f.api.update(0,f.ctx);assert.equal(u.o.visible,false);
  assert.equal(u.state,'captive');assert.equal(u.hp,4,'culling does not change NPC state');
  f.ctx.visualRange=3500;f.api.update(0,f.ctx);assert.equal(u.o.visible,true,'scope may restore distant full models');
  f.ctx.visualRange=400;f.player.x=0;f.player.y=500;f.api.update(0,f.ctx);
  assert.equal(u.o.visible,false,'vertical distance participates in culling');
  f.player.y=3;f.api.hurt(u,4);const pose=u.o.rotation.x;f.api.update(0,f.ctx);
  assert.equal(u.o.visible,true);assert.equal(u.state,'dead');assert.equal(u.o.rotation.x,pose);
  f.player.x=500;f.api.update(0,f.ctx);assert.equal(u.o.visible,false,'corpses share the same culling');
  f.ctx.visualRange=3500;f.api.update(0,f.ctx);assert.equal(u.o.visible,true);assert.equal(u.o.rotation.x,pose);
  f.api.reset();
 }

 // The group can be freed by stealth; it does not require killing every guard.
 {
  const f=fixture();f.tick();
  const guard={t:'soldat',x:1,y:3,z:10,hp:4,canSee:true};f.ctx.enemies=[guard];
  const action=f.api.getAction(f.ctx);assert.equal(f.api.interact(action,f.ctx),true);
  assert.equal(f.api.snapshot().released,false,'close combat blocks the release');
  guard.x=100;guard.canSee=false;f.release();
  assert.equal(f.api.snapshot().released,true);
  assert.equal(f.api.getAction(f.ctx),null,'no repair before the mechanic reaches his station');
  assert(f.api.entities.filter(u=>u.role==='farmer').every(u=>u.state==='evacuating'));
  f.tick(40);
  assert(f.api.entities.filter(u=>u.role==='farmer').every(u=>u.state==='rescued'&&u.z>85));
  assert.equal(f.mech().state,'ready');assert(Math.hypot(f.mech().x-33,f.mech().z-16)<.2);
  assert.equal(f.api.markers()[0].kind,'mechanic');f.api.reset();
 }

 // Geometry and RNG are reproducible under quarter-turn placement.
 {
  const f=fixture({logicalOnly:true});f.camp.x=100;f.camp.z=200;f.camp.angle=Math.PI/2;
  f.api.configure({world:f.world,camp:f.camp,logicalOnly:true});
  const m=f.mech();assert.equal(m.x,97);assert.equal(m.z,200);assert.equal(m.o,null);
  assert.equal(f.world.children.length,0);
  const extra={...layout,prisoners:[...layout.prisoners,{id:'mechanic-2',role:'mechanic',x:0,z:0}]};
  f.api.configure({world:f.world,camp:{...f.camp,layout:extra},logicalOnly:true});
  assert.equal(f.api.entities.filter(u=>u.role==='mechanic').length,1,'one mechanic per operation');
  f.api.reset();
 }

 // Rescue movement obeys the collision service: no teleport or wall crossing.
 {
  const f=fixture();f.setMove(false);f.release();const first=f.api.snapshot().entities;
  f.tick(30);const next=f.api.snapshot().entities;
  for(let i=0;i<first.length;i++){assert.equal(next[i].x,first[i].x);assert.equal(next[i].z,first[i].z)}
  assert.equal(f.mech().state,'to-station');f.setMove(true);f.tick(40);
  assert.equal(f.mech().state,'ready');f.api.reset();
 }

 // Only a freed, living mechanic performs an explicit, timed local repair.
 {
  const f=fixture(),v=f.vehicle();f.player.x=33;f.player.z=16;f.tick(10);assert.equal(v.life,4);
  f.player.x=0;f.player.z=8;f.ready();f.tick(10);assert.equal(v.life,4,'proximity alone never heals');
  const action=f.api.getAction(f.ctx);assert.equal(action.kind,'repair');assert.equal(action.label,'Reparar Camió');
  assert.equal(f.api.interact(action,f.ctx),true);f.tick(5.5);assert.equal(v.life,4,'repair is atomic at completion');
  assert(f.api.getAction(f.ctx).label.includes('%'));f.tick(.5);assert.equal(v.life,10);
  assert.equal(v.ammo,7);assert.equal(v.rockets,2,'repair is not ammunition resupply');
  assert.equal(f.api.snapshot().repair,null);
  v.life=0;assert.notEqual(f.api.getAction(f.ctx)?.kind,'repair','cannot resurrect a destroyed hull');
  f.api.reset();
 }

 // Interruptions cannot complete the old work later or at a distance.
 for(const [name,interrupt] of [
  ['motion',f=>{f.ctx.vehicles[0].v=2}],
  ['new vehicle damage',f=>{f.ctx.vehicles[0].life--}],
  ['removed vehicle',f=>{f.ctx.vehicles=[]}],
  ['destroyed vehicle',f=>{f.ctx.vehicles[0].destroyed=true}],
  ['player leaves',f=>{f.player.x=300}],
  ['wall',f=>f.setClear(false)],
  ['near combat',f=>{f.ctx.enemies=[{t:'soldat',x:33,y:3,z:18,hp:4,canSee:true}]}],
  ['pause',f=>{f.ctx.active=false}],
  ['cannot interact while swimming/falling',f=>{f.ctx.canInteract=false}],
  ['mechanic wounded',f=>{f.api.hurt(f.mech(),.1)}]
 ]){
  const f=fixture();f.ready();const v=f.vehicle();f.api.interact(f.api.getAction(f.ctx),f.ctx);f.tick(2);
  interrupt(f);f.tick(.25);assert.equal(f.api.snapshot().repair,null,name+' cancels repair');
  f.tick(10);assert(v.life<10,name+' cannot replay the abandoned repair');f.api.reset();
 }

 // Voluntary follow positions the repair service; it is not a compulsory escort.
 {
  const f=fixture();f.ready();let action=f.api.getAction(f.ctx);
  assert.equal(action.kind,'mechanicFollow');assert.match(action.label,/segueix/);
  f.api.interact(action,f.ctx);assert.equal(f.mech().following,true);
  f.player.z=0;f.tick(3);assert(f.mech().z<16,'mechanic follows the player on foot');
  f.setMove(false);const point={x:f.mech().x,z:f.mech().z};f.player.z=-40;f.tick(10);
  assert.equal(f.mech().x,point.x);assert.equal(f.mech().z,point.z);
  assert.equal(f.messages.filter(t=>t.includes('no pot passar')).length,1,'blocked following gives one useful message');
  f.setMove(true);f.setWater(true);f.tick(3);assert.equal(f.mech().z,point.z,'no swimming or teleporting across water');
  f.setWater(false);f.tick(2);assert(f.mech().z<point.z);
  f.player.x=f.mech().x;f.player.z=f.mech().z;action=f.api.getAction(f.ctx);
  assert.equal(action.kind,'mechanicFollow');assert.match(action.label,/espera/);
  f.api.interact(action,f.ctx);f.player.z-=40;const stopped=f.mech().z;f.tick(4);assert.equal(f.mech().z,stopped);
  f.api.reset();
 }

 // Swimming/falling disables interactions, not the ongoing evacuation simulation.
 {
  const f=fixture();f.release();f.ctx.canInteract=false;f.tick(40);
  assert(f.api.entities.filter(u=>u.role==='farmer').every(u=>u.state==='rescued'));
  assert.equal(f.mech().state,'ready');assert.equal(f.api.getAction(f.ctx),null);
  f.player.x=33;f.player.z=16;const v=f.vehicle();f.ctx.canInteract=true;
  const action=f.api.getAction(f.ctx);assert.equal(action.kind,'repair');
  f.ctx.canInteract=false;assert.equal(f.api.interact(action,f.ctx),false);f.tick(10);assert.equal(v.life,4);
  f.api.reset();
 }

 // Large boats are local, flying helicopters are not eligible, and fresh worlds reject stale actions.
 {
  const f=fixture();f.ready();const v=f.vehicle({t:'ferry',x:60,z:16});
  assert.equal(f.api.getAction(f.ctx)?.kind,'repair');v.x=90;
  assert.notEqual(f.api.getAction(f.ctx)?.kind,'repair','the service radius remains bounded for large hulls');
  v.t='heli';v.x=35;v.alt=30;assert.notEqual(f.api.getAction(f.ctx)?.kind,'repair','current aircraft altitude participates');
  v.alt=3;assert.equal(f.api.getAction(f.ctx)?.kind,'repair');
  f.ctx.vehicle=v;v.alt=50;assert.notEqual(f.api.getAction(f.ctx)?.kind,'repair','pilot context uses current altitude despite a ground-level visual node');
  v.alt=3;f.ctx.vehicle=null;
  const action=f.api.getAction(f.ctx);f.api.configure({world:f.world,camp:f.camp});
  assert.equal(f.api.interact(action,f.ctx),false,'a stale action cannot affect the new operation');f.api.reset();
 }
 {
  const f=fixture();f.ready();const v=f.vehicle();
  assert.equal(f.api.hurt(f.mech(),2.2),3,'civilian damage uses the same positive-ceil integer policy');
  assert.equal(f.mech().hp,1);f.api.hurt(f.mech(),1);
  assert.equal(f.mech().state,'dead');assert.equal(f.api.markers().length,0);
  f.tick(20);assert.equal(v.life,4);assert.equal(f.api.getAction(f.ctx),null);
  assert.equal(f.api.snapshot().released,true,'loss of repair does not undo the rescue or principal mission');
  f.api.reset();
 }
 console.log('OK presoners: escala adulta/postures a terra/hitbox, porta interior, descoberta/LOS, rescat opcional, camins sense teleports, mecànic únic, reparació local6s, interrupcions, seguiment/aigua, dany enter i reset');
})().catch(error=>{console.error(error);process.exitCode=1});
