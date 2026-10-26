
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const w={};vm.runInNewContext(fs.readFileSync('src/shadow-cache.js','utf8'),{window:w});
const map={autoUpdate:true,needsUpdate:false};
const scheduler=w.HUNTER_SHADOW_CACHE.create({shadowMap:map,maxIdleMs:180});
const node=()=>({position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},
  quaternion:{x:0,y:0,z:0,w:1},scale:{x:1,y:1,z:1}});
const a=node(),b=node();
const f=(now,extra={})=>scheduler.schedule({now,x:10,z:20,nodes:[a,b],...extra});
assert.equal(map.autoUpdate,false);
assert.equal(f(0),true,'first frame must draw shadows');
map.needsUpdate=false;assert.equal(f(16),false,'identical frame must reuse shadows');
assert.equal(map.needsUpdate,false);
a.position.x=.2;assert.equal(f(32),true,'moving actor triggers refresh');
map.needsUpdate=false;b.rotation.y=.15;
assert.equal(f(48),true,'moving articulated parts trigger refresh');
map.needsUpdate=false;b.quaternion.y=.2;
assert.equal(f(55),true,'quaternion animation triggers refresh');
map.needsUpdate=false;assert.equal(f(60,{x:11}),true,'sun anchor follows player');
map.needsUpdate=false;assert.equal(f(70,{x:11}),false);
map.needsUpdate=false;assert.equal(f(270,{x:11}),true,'periodic refresh catches static-world changes');
map.needsUpdate=false;assert.equal(f(280,{enabled:false}),false,'disabled shadow maps are idle');
scheduler.invalidate();assert.equal(map.needsUpdate,true);
assert.equal(f(290,{x:11}),true,'enabling shadows must draw even when nothing moved');
map.needsUpdate=false;
assert.equal(f(305,{x:11,nodes:[a]}),true,'new candidate set must redraw');
assert(scheduler.stats.reuses>=2);assert(scheduler.stats.redraws>=6);
assert(scheduler.stats.reasons.forçat>=1,'reason for forced redraw');
assert(scheduler.stats.reasons['moviment gran']>=1,'significant movement traced');
assert.equal(typeof scheduler.stats.lastReason,'string');
const smallMap={autoUpdate:true,needsUpdate:false};
const slow=w.HUNTER_SHADOW_CACHE.create({shadowMap:smallMap,
  maxIdleMs:180,motionEpsilon:.02,majorMotion:.12,minorRefreshMs:48,
  labelNode:()=> 'jugador / braç'});
const limb=node();
assert(slow.schedule({now:0,x:0,z:0,nodes:[limb]}));
smallMap.needsUpdate=false;limb.position.x=.04;
assert.equal(slow.schedule({now:16,x:0,z:0,nodes:[limb]}),false,'minor pose delayed');
assert.equal(slow.schedule({now:48,x:0,z:0,nodes:[limb]}),true,'small motion eventually refreshed');
assert.equal(slow.stats.culprits['jugador / braç'],1,'culprit identified');
assert.equal(slow.stats.motionDeferrals,1);
console.log('OK: shadow-map caching, pose changes, periodic safety and invalidation');
