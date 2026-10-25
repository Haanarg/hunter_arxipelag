'use strict';
// Regressions for GitHub bugs #2–#5: real pure functions with minimal CPU stubs.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const core=source('src/game-core.js'),combat=source('src/combat.js'),
      rag=source('src/ragdoll-lite.js'),world=source('src/world-generation.js'),
      compound=source('src/compound-generation.js'),
      runtime=source('src/compound-building-runtime.js');
const vec=(x=0,y=0,z=0)=>({x,y,z,set(x,y,z){this.x=x;this.y=y;this.z=z}});
// #3: the exact ragdoll used by both the player and enemy commandos.
const parts={};
for(const k of ['al','ar','ael','aer','ll','lr','lkl','lkr','head'])
  parts[k]={position:vec(k==='al'?-.57:k==='ar'?.57:0),rotation:vec()};
const ragdoll=new Function('window',rag+';return window.HUNTER_RAGDOLL;')({});
const state=ragdoll.make({userData:parts},{blast:true,impulse:{vy:23},seed:17});
for(let i=0;i<250;i++){
  ragdoll.update(state,.016,{airborne:i<150,grounded:i>=150});
  assert.equal(parts.al.position.x,-.57,'left arm fixed to shoulder');
  assert.equal(parts.ar.position.x,.57,'right arm fixed to shoulder');
}
assert(parts.al.rotation.z<.6,'arms still articulate during flight and landing');
ragdoll.reset(state);

// #2: explicit height and azimuth regression, not a string-only check.
assert(combat.includes('BAZOOKA_AIM_RANGE=185,BAZOOKA_AIM_CONE=.82'));
const s=combat.indexOf('function autoAimWeaponShot('),e=combat.indexOf('// La retícula i el míssil',s);
const target={t:'soldat',x:50,z:-80,gy:80,hp:4,o:{position:{y:80}}};
const aim=new Function('E','weaponTargetPriority','weaponAimClear','hAt',
  'VS','bazookaInterceptPoint','marineHullTargetY',
  combat.slice(s,e)+'return autoAimWeaponShot;')(
    [target],()=>1,()=>true,()=>0,{llanxa:1},()=>{},()=>{});
const focus={},dir=aim(0,2,0,0,0,-1,185,.82,'heavy',focus);
assert.equal(focus.target,target,'high distant target acquired');
assert(dir[1]>.6,'bazooka actually aims upward');
const old={};aim(0,2,0,0,0,-1,105,.94,'heavy',old);
assert.equal(old.target,null,'previous narrow/short acquisition misses target');
assert.match(combat,/BAZOOKA_AIM_RANGE,BAZOOKA_AIM_CONE,'heavy',null/);

// #4: isolate exact damage functions; military and civilian construction diverge.
assert.match(compound,/civilianHut:!!layout.civilian&&!!spec.wood/);
assert.match(runtime,/wall\.timberTrim/);
const damage=core.slice(core.indexOf('function demolishCivilianHut('),core.indexOf('function mkB('));
const env={Wl:[],Dr:[],wallGridCount:0,COMBAT_BALANCE:{weapons:{bazooka:8}},
  wholeDamage:v=>Math.ceil(v),
  wallBreak(w){w.m.visible=false;for(const trim of w.timberTrim||[])trim.visible=false},
  roofBreak(b){b.rb=true},checkRoofSupport:()=>{},destroyInteriorStair:()=>{},snd:()=>{}};
const {dmgW}=new Function('env','with(env){'+damage+'return {dmgW};}')(env);
const hut={civilianHut:true},ribs=[{visible:true},{visible:true}],
  wall=()=>({owner:hut,hp:4,m:{visible:true},timberTrim:ribs,
   x0:0,x1:1,z0:0,z1:1,y0:0,y1:5});
const pieces=[wall(),wall(),wall()];env.Wl.push(...pieces);
dmgW(pieces[0],2);assert.equal(pieces[0].hp,2);
dmgW(pieces[0],2);assert.equal(pieces[0].hp,0);
assert.equal(pieces[0].m.visible,false);
const remaining=pieces[1];
dmgW(remaining,8);
assert(hut.hutCollapsed&&hut.rb,'one bazooka collapses the entire hut');
assert.equal(env.Wl.length,0);
assert(ribs.every(m=>!m.visible),'wood trim hidden with walls');
const military={civilianHut:false},
  militaryWall={owner:military,hp:12,m:{visible:true},
   x0:0,x1:1,z0:0,z1:1,y0:0,y1:5};
env.Wl.push(militaryWall);dmgW(militaryWall,8);
assert.equal(militaryWall.hp,4,'military wall retains existing resistance');

// #5: call the actual world generator factory in logical mode.
// No WebGL required; collision registration must not depend on graphics.
const propSource=world.slice(world.indexOf('const compoundProp='),
  world.indexOf('const compoundPad=',world.indexOf('const compoundProp=')));
const propWorld={Wl:[],wallGridCount:0,seedSearchMode:true,hAt:()=>2,Math};
const prop=new Function('env','with(env){'+propSource+'return compoundProp;}')(propWorld);
prop('bench',20,30,Math.PI/2);
assert.equal(propWorld.Wl.length,1);
const bench=propWorld.Wl[0];
assert(bench.z1-bench.z0>bench.x1-bench.x0,'bench collider rotates with bench');
propWorld.Wl.length=0;prop('well',0,0);
assert.equal(propWorld.Wl.length,12);
const intersects=(x,z)=>propWorld.Wl.some(w=>w.x0<=x&&x<=w.x1&&w.z0<=z&&z<=w.z1);
assert(!intersects(0,0),'centre of well remains hollow');
assert(intersects(1.6,0)&&intersects(-1.6,0),'stone ring blocks movement');
console.log('PASS bugs #2–#5: high bazooka aim, attached arms, weak destructible huts, wells and benches');
