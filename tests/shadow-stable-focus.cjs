#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/shadow-cache.js','utf8'),
 core=fs.readFileSync('src/game-core.js','utf8');
const w={};vm.runInNewContext(source,{window:w});
const anchor=w.HUNTER_SHADOW_CACHE.anchorCoordinate;
assert.equal(anchor(-2876.3),-2880);
assert.equal(anchor(-2874.6),-2872);
assert.equal(anchor(-2878.5),-2880);
assert.equal(anchor(-2876.3,0),-2876.3);
assert(core.includes('sun.target.position.set(ren.shadowMap.enabled?anchorCoord(sunFocusX)'));
assert(core.includes("shadowMotionRole:'boat'"));
const map={autoUpdate:true,needsUpdate:false};
const cache=w.HUNTER_SHADOW_CACHE.create({shadowMap:map,maxIdleMs:180});
const node=()=>({position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},
 quaternion:{x:0,y:0,z:0,w:1},scale:{x:1,y:1,z:1}});
const boat=node(),player=node();boat.shadowMotionRole='boat';
const frame=(now,anchorX=0)=>cache.schedule({now,x:anchorX,z:0,nodes:[boat,player]});
assert(frame(0));map.needsUpdate=false;
boat.position.x=.10;
assert.equal(frame(16),false,'minor boat translation is deferred');
boat.position.x=.18;
assert.equal(frame(48),false,'small boat motion remains deferred');
boat.position.x=.25;
assert.equal(frame(80),false,'minor boat update not forced every 48ms');
assert.equal(frame(112),true,'boat refreshes in bounded time');
map.needsUpdate=false;
boat.position.x+=1;
assert.equal(frame(128),true,'significant boat movement immediately refreshes');
map.needsUpdate=false;
player.position.x=.2;
assert.equal(frame(144),true,'player movement remains immediate');
map.needsUpdate=false;
assert.equal(frame(160,8),true,'shadow anchor crossing updates immediately');
assert(cache.stats.motionDeferrals>=3);
console.log('PASS stable shadow focus, minor boat deferral, actor redraw, big boat motion');
