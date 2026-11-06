#!/usr/bin/env node
'use strict';
// Boats in sight from helicopters must move at each simulation step; distant
// infantry still sleeps, and visual presentation must not batch visible boats.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=path=>fs.readFileSync(require('node:path').join(root,path),'utf8');
const marine=read('src/marine-patrol.js'),begin=marine.indexOf('function updateMarinePatrol(');
assert(begin>0,'marine patrol function exists');
const env={
  P:{x:0,z:0,y:1},cv:null,VT:{},elapsed:0,swimming:false,playerFall:false,
  cheats:{invisible:false},disg:false,over:false,
  marineAngle:a=>Math.atan2(Math.sin(a),Math.cos(a)),
  MARINE_COURSE_OFFSETS:[0,.27,-.27,.55,-.55,.9,-.9,1.35,-1.35,Math.PI],
  marineSeaClear:()=>true,marineTrafficClear:()=>true,enemyReindex:()=>{},
  marinePickWaypoint:()=>{throw Error('unexpected waypoint change')},
  wy:()=>0,sight:()=>false,weaponAimClear:()=>false,
  syncMarinePatrolCrew:()=>{},aimEnemyBoatCrew:()=>true,marineFire:()=>false,
  hurtP:()=>{throw Error('outside combat')},
  rn:()=>.2,THREE:{Vector3:class{}}
};
const update=new Function('env','with(env){'+marine.slice(begin)+
  'return updateMarinePatrol;}')(env);
const u={
  t:'patrulla_marina',x:1700,z:0,home:{x:1700,z:0},
  hd:0,tx:1700,tz:-420,wt:12,speed:13,yawRate:0,
  marineCourseT:.36,
  marineCourse:{open:true,best:0,x:1700,z:0,hd:0,goalX:1700,goalZ:-420},
  marineSightT:0,mgCd:4,rocketCd:4,marineCrewHp:[10,10],
  o:{position:{y:0,set(x,y,z){this.x=x;this.y=y;this.z=z}},
    rotation:{set(){}}}
};
let lastZ=u.z;
for(let i=0;i<25;i++){
  env.elapsed+=1/60;update(u,1/60);
  assert(u.z<lastZ,'marine cruiser must advance every frame, step '+i);
  assert(Math.abs(u.z-lastZ)<1,'no intermittent distant position jump');
  lastZ=u.z;
}
const core=read('src/game-core.js'),a=core.indexOf('function updateVehicleVisualLod('),
  b=core.indexOf('let runStepTimer=',a);
assert(a>=0&&b>a,'visual vehicle cadence section available');
let calls=0;
const v={t:'llanxa',x:1550,z:0,v:13,o:{visible:true,
  position:{x:1550,y:0,z:0},userData:{}}};
const displayEnv={V:[v],P:{x:0,z:0},cv:null,scopeActive:false,
  currentSniperFocus:()=>null,VT:{llanxa:{m:'w'}},
  LOD_NEAR2:500**2,LOD_MID2:1200**2,
  window:{HUNTER_VEHICLES:{}},
  place:()=>{calls++}};
const updateVisual=new Function('env','with(env){'+core.slice(a,b)+
  'return updateVehicleVisualLod;}')(displayEnv);
for(let i=0;i<12;i++)updateVisual(i/60,1/60);
assert.equal(calls,12,'distant visible boat gets a smooth visual update each step');
v.o.visible=false;
for(let i=0;i<12;i++)updateVisual(i/60,1/60);
assert.equal(calls,12,'invisible boats preserve low-frequency visual work');
console.log('PASS: continuous cruiser simulation, bounded movement, visible boat frames, distant LOD pacing');
