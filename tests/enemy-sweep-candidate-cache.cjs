#!/usr/bin/env node
'use strict';
// Collision candidate caching must return the same result as querying every sample.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/enemy-navigation.js'),'utf8');
const start=source.indexOf('function enemySolidAt('),end=source.indexOf('function enemyMoveClear(',start);
assert(start>=0&&end>start);
const sample=source.slice(start,end);
const walls=[
 {x0:8,x1:9,z0:-3,z1:3,y0:0,y1:10,open:false},
 {x0:22,x1:23,z0:5,z1:9,y0:0,y1:10,open:false}
],cars=[{x:17,z:1,hd:0,w:3,d:6,y:3,gy:3}],
soldiers=[{t:'soldat',x:12,z:4,gy:3}];
const counts={walls:0,vehicles:0,enemies:0};
const env={
 performanceStatsVisible:false,perfHotspots:{},performance:{now:()=>0},
 enemyIsVehicle:u=>u.t==='jeep',enemyRouteRadius:u=>u.t==='jeep'?2:1.2,
 enemyBodyRadius:()=>1.05,enemyGroundAt:()=>3,H:1000,
 treeHit:(x,z)=>x>30&&x<31&&Math.abs(z)<1,
 wallCandidates(x,z,r){counts.walls++;return walls.filter(w=>
  Math.abs((w.x0+w.x1)/2-x)<=r+(w.x1-w.x0)/2+1&&
  Math.abs((w.z0+w.z1)/2-z)<=r+(w.z1-w.z0)/2+1)},
 vehicleCandidatesAt(x,z,r){counts.vehicles++;return cars.filter(v=>
  Math.abs(v.x-x)<=r+4&&Math.abs(v.z-z)<=r+4)},
 enemyCandidatesAt(x,z,r){counts.enemies++;return soldiers.filter(v=>
  Math.abs(v.x-x)<=r+1&&Math.abs(v.z-z)<=r+1)},
 vehicleY:v=>v.y??v.gy??3,
 vehicleBox:(v,x=v.x,z=v.z,hd=v.hd)=>({x,z,hd,w:v.w||2,d:v.d||4}),
 circleVehicleOverlap:(x,z,r,v)=>Math.hypot(x-v.x,z-v.z)<r+2,
 obbOverlap:(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)<(a.w+b.w)/2,
 enemyWallBox:w=>({x:(w.x0+w.x1)/2,z:(w.z0+w.z1)/2,
   w:w.x1-w.x0,d:w.z1-w.z0}),
 wrapAngle:a=>Math.atan2(Math.sin(a),Math.cos(a)),Math
};
const {enemySweep,enemySolidAt,enemyBodiesClear}=new Function('env',
 'with(env){'+sample+'return {enemySweep,enemySolidAt,enemyBodiesClear};}')(env);
function reference(u,ax,az,bx,bz,fromHd,toHd,dynamic,route){
 const angle=env.enemyIsVehicle(u)?env.wrapAngle(toHd-fromHd):0;
 const n=Math.max(1,Math.ceil(
   (Math.hypot(bx-ax,bz-az)+Math.abs(angle)*env.enemyRouteRadius(u))/(route?1.2:.45)));
 for(let i=0;i<=n;i++){
  const t=i/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t,hd=fromHd+angle*t;
  if(!enemySolidAt(u,x,z,hd,route)||(dynamic&&!enemyBodiesClear(u,x,z,hd)))
   return false;
 }
 return true;
}
let seed=4627;
const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(let i=0;i<1500;i++){
 const u={t:i%4===0?'jeep':'soldat',gy:3,x:0,z:0},
   ax=rand()*30-5,az=rand()*20-10,bx=ax+(rand()-.5)*55,
   bz=az+(rand()-.5)*23,fromHd=rand()*6.28,toHd=rand()*6.28,
   dynamic=i%3!==0,route=i%5===0;
 const expected=reference(u,ax,az,bx,bz,fromHd,toHd,dynamic,route);
 const actual=enemySweep(u,ax,az,bx,bz,fromHd,toHd,dynamic,route);
 assert.equal(actual,expected,'same blocked/clear result for sample '+i);
}
counts.walls=counts.vehicles=counts.enemies=0;
const u={t:'soldat',gy:3,x:60,z:60,hd:0};
assert(reference(u,60,60,82,60,0,0,true,false),'unobstructed reference');
const previous={...counts};
counts.walls=counts.vehicles=counts.enemies=0;
assert(enemySweep(u,60,60,82,60,0,0,true,false),'unobstructed cached');
assert(counts.walls<previous.walls/4,'static grid calls reduced');
assert(counts.vehicles<previous.vehicles/4,'vehicle grid calls reduced');
assert(counts.enemies<previous.enemies/4,'enemy grid calls reduced');
console.log('PASS: 1500 exact sweep equivalence cases and reduced spatial grid scans');
