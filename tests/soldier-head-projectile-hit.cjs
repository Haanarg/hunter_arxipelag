#!/usr/bin/env node
'use strict';
// Regressió: la retícula vermella pot seleccionar el punt alt del soldat,
// però abans les bales travessaven aquell punt sense danyar l'enemic.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const combat=fs.readFileSync(path.join(root,'src/combat.js'),'utf8');
const shared=fs.readFileSync(path.join(root,'src/combat-rules.mjs'),'utf8');
const start=shared.indexOf('export function segmentSphereT(');
const end=shared.indexOf('export function inView(',start);
assert(start>=0&&end>start);
const segmentSphereT=new Function(shared.slice(start,end)
  .replace(/^export /gm,'')+'return segmentSphereT;')();
const begin=combat.indexOf('function enemyAimCenterY(');
const finish=combat.indexOf('function weaponAimClear(',begin);
assert(begin>=0&&finish>begin);
const contact=new Function('segmentSphereT',combat.slice(begin,finish)+
  'return {contact:enemyProjectileContactT,center:enemyAimCenterY,radius:enemyAimHitRadius};')(segmentSphereT);
const soldier={t:'soldat',x:0,z:-8,gy:0,o:{position:{y:0}}};
const old=(v,from,to)=>segmentSphereT(from.x,from.y,from.z,to.x,to.y,to.z,
  v.x,contact.center(v),v.z,contact.radius(v));
const hit=(v,from,to)=>contact.contact(from.x,from.y,from.z,to.x,to.y,to.z,v);
const origin={x:0,y:1.5,z:0},headTarget={x:0,y:2.35,z:-8};
assert.equal(old(soldier,origin,headTarget),null,
  'reproduces headshot missing narrow torso sphere');
assert(hit(soldier,origin,headTarget)!=null,
  'red-reticle head target receives pistol projectile contact');
assert(hit(soldier,origin,{x:0,y:1.5,z:-8})!=null,
  'torso target remains hittable');
assert.equal(hit(soldier,origin,{x:1.5,y:2.35,z:-8}),null,
  'small head collision must not enlarge entire distant hitbox');
const general={...soldier,t:'general'};
assert(hit(general,origin,headTarget)!=null,'general high aim target hits');
const guard={...soldier,towerGuard:true};
assert(hit(guard,{x:0,y:2.3,z:0},{x:0,y:2.9,z:-8})!=null,
  'tower guard high aim target hits');
const vehicle={t:'jeep',x:0,z:-8,r:1,gy:0,o:{position:{y:0}}};
assert.equal(hit(vehicle,origin,headTarget),old(vehicle,origin,headTarget),
  'non-person hitboxes unchanged');
assert(combat.includes('enemyProjectileContactT(ox,oy,oz,tx,ty,tz,e)'),
  'sniper reticle uses matching head collider');
assert(combat.includes("enemyProjectileContactT(x0,y0,z0,x1,y1,z1,u),'enemy',u"),
  'real pistol/assault/sniper projectile collision uses matching head collider');
console.log('PASS pistol red-reticle upper aim, torso, general, tower guards, sniper, narrow hitboxes');
