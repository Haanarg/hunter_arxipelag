#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const combat=fs.readFileSync('src/combat.js','utf8'),
      vehicles=fs.readFileSync('src/vehicles.js','utf8');
const from=combat.indexOf('// Les armes pesades prioritzen riscos immediats:'),
      end=combat.indexOf('// La retícula i el míssil',from);
assert(from>=0&&end>from,'find the actual targeting implementation');
const ctx={
  E:[],walls:[],vehicles:[],buildings:[],cv:null,
  hAt:()=>0,bunkerProjectileSurface:()=>0,
  wallCandidates:()=>ctx.walls,vehicleCandidatesAt:()=>ctx.vehicles,
  buildingCandidates:()=>ctx.buildings,vehicleRadius:()=>4,
  segmentAabbT:()=>null,hangarRoofSegmentT:()=>null,
  VS:{llanxa:1.95},Math
};
vm.runInNewContext(combat.slice(from,end)+
 '\nthis.aim=autoAimWeaponShot;this.priority=weaponTargetPriority;'+
 'this.cabin=enemyAimCenterY;this.radius=enemyAimHitRadius;',ctx);
const soldier=(x,z,other={})=>({t:'soldat',hp:4,x,z,r:2,o:{position:{y:0}},...other});
const tower={t:'torre',hp:24,x:0,z:-65,r:3,o:{position:{y:0}}},
      rifle=soldier(0,-15),rocket=soldier(0,-75,{rocketSoldier:true}),
      tank={t:'tanc',hp:12,x:0,z:-22,o:{position:{y:0}}},
      boat={t:'patrulla_marina',hp:8,x:0,z:-85,hd:0,speed:0,o:{position:{y:0}}};
const acquire=(cone=.68,vertical=.9,shotClass='heavy')=>{
  const focus={};
  const dir=ctx.aim(0,1.9,0,0,.01,-1,185,cone,shotClass,focus,0,vertical);
  return {focus,dir};
};
ctx.E=[rifle,tower,tank];
let result=acquire();assert.strictEqual(result.focus.target,tower);
assert.equal(result.focus.kind,'enemy');
assert(Math.abs(result.focus.point.y-9.15)<1e-8,'watchtower cabin center used');
assert.equal(ctx.radius(tower),2.05);
ctx.E=[rifle,rocket,tank];assert.strictEqual(acquire().focus.target,rocket);
ctx.E=[rifle,tank];assert.strictEqual(acquire().focus.target,rifle);
ctx.E=[boat,rifle];assert.strictEqual(acquire().focus.target,boat);
ctx.E=[soldier(36,-42,{rocketSoldier:true})];
assert.equal(acquire().focus.kind,'enemy','wide horizontal cone selects dangerous soldier');
assert.equal(acquire(.97).focus.target,null,'old narrow cone misses angled enemy');
ctx.E=[tower];tower.z=-12;
assert.strictEqual(acquire().focus.target,tower,'nearby high cabin inside vertical cone');
assert.equal(acquire(.68,.1).focus.target,null,'vertical cone excludes steep targets');
tower.z=-65;ctx.E=[];
const fence={barbed:true,open:false,hp:8,ax:-3,az:-20,bx:3,bz:-20,
  cx:0,cz:-20,x0:-3.24,x1:3.24,z0:-20.24,z1:-19.76,y0:0,y1:5};
ctx.walls=[fence];
assert.strictEqual(acquire().focus.target,fence,'fence used as fallback');
assert.equal(acquire().focus.kind,'fence');
ctx.walls=[];
const vehicle={t:'camio',x:0,z:-40,o:{position:{y:0}},destroyed:false};
ctx.vehicles=[vehicle];
assert.strictEqual(acquire().focus.target,vehicle,'empty vehicle fallback');
ctx.vehicles=[];
const building={x:0,z:-60,w:15,d:18,h:8,fy:0,rhp:20,rb:0};
ctx.buildings=[building];
assert.strictEqual(acquire().focus.target,building,'building fallback');
ctx.E=[rifle];
assert.strictEqual(acquire().focus.target,rifle,'military wins over infrastructure');
const a=combat.indexOf('function closestFenceBlastPoint('),
      b=combat.indexOf('function boom(',a);
assert(a>=0&&b>a);
vm.runInNewContext(combat.slice(a,b)+';this.closest=closestFenceBlastPoint;',ctx);
assert(ctx.closest(fence,3.3,2,-20).distance<.31,
  'blast close to one end hits fence despite distant midpoint');
assert(ctx.closest(fence,3.3,8,-20).distance>3,
  'a blast far above the segment must not remove the fence');
assert(combat.includes('if(near.distance<r&&!blastOccluded('));
assert(combat.includes('dmgW(w,w.hp)'),'blast removes all remaining barbed HP');
assert(!combat.includes("e.t==='torre'?4.5"),'legacy tower center removed');
assert(vehicles.includes('g.userData.turretMaxPitch=.72'));
assert(vehicles.includes('rig.turretMaxPitch??.43'));
console.log('OK heavy targeting: priority, wide 3D cones, cabin, fallback, tank elevation and explosive fences');
