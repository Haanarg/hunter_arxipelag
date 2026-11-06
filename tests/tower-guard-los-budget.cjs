#!/usr/bin/env node
'use strict';
// Les torres no han de traçar visió per tot el mapa quan el jugador
// és fora del radi/con; conservam alertes compartides i trets reals.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
  const rules=await import(pathToFileURL(path.join(__dirname,'../src/tower-model.mjs')).href);
  const source=fs.readFileSync(path.join(__dirname,'../src/enemy-ai.js'),'utf8');
  const start=source.indexOf('function towerGuardTick(u,dt){');
  const end=source.indexOf('const ENEMY_AI_DISTANCE=',start);
  assert(start>0&&end>start,'extract original guard logic');
  const counters={aiTowerSightMs:0,aiTowerSightChecks:0,aiTowerSightSkipped:0};
  let rays=0,shots=0,time=0;
  const env={
    window:{HUNTER_TOWER_MODEL:rules,HUNTER_ENEMY_ACCURACY:{direction:()=>[0,0,-1]}},
    performanceStatsVisible:true,perfHotspots:counters,
    performance:{now:()=>++time},
    P:{x:0,y:0,z:-500},cv:null,playerCrouched:false,elapsed:12,
    cheats:{invisible:false},over:0,disg:false,
    weaponAimClear:()=>{rays++;return true},
    enemyFriendlyVehicleInFireLane:()=>false,
    shoot:()=>{shots++},
    hurtE:()=>{throw Error('unexpected fatal guard update')},
    animateEnemyInfantry:()=>{},
    DIF:1,rn:()=>.5,mS:{},mW:{},SMALL_ARMS_SCALE:1,
    Math
  };
  const tick=new Function('env','with(env){'+source.slice(start,end)+
    'return towerGuardTick;}')(env);
  const guard=()=>({
    t:'soldat',towerGuard:true,
    towerHost:{hp:10,dead:false,destroyed:false,towerAlertUntil:0},
    x:0,z:0,gy:9,rng:rules.TOWER_GUARD_RANGE,hd:0,
    cd:2,rate:1.1,alert:0,senseT:0,hp:10,
    o:{position:{set(x,y,z){this.x=x;this.y=y;this.z=z}},rotation:{y:0}}
  });
  let u=guard();tick(u,.05);
  assert.equal(rays,0,'500m guard must skip long-distance line of sight');
  assert.equal(u.canSee,false);
  env.P.z=45;u=guard();tick(u,.05);
  assert.equal(rays,0,'guard must not raycast out of vision cone');
  env.P.z=-65;u=guard();tick(u,.05);
  assert.equal(rays,1,'nearby target inside the cone requires real LOS');
  assert.equal(u.canSee,true);
  assert(u.towerHost.towerAlertUntil>env.elapsed,'spotted target warns tower mate');
  env.P.x=65;env.P.z=0;u=guard();
  u.towerHost.towerAlertUntil=env.elapsed+1;
  tick(u,.05);
  assert.equal(rays,2,'alerted teammate checks LOS outside own cone');
  assert.equal(u.canSee,true);
  env.P.x=0;env.P.z=-500;u=guard();
  u.towerHost.towerAlertUntil=env.elapsed+1;
  tick(u,.05);
  assert.equal(rays,2,'shared alert cannot trigger LOS outside weapon range');
  env.P.z=-65;env.cheats.invisible=true;u=guard();tick(u,.05);
  assert.equal(rays,2,'invisibility disables raycasts');
  env.cheats.invisible=false;
  u=guard();u.cd=0;tick(u,.05);
  assert.equal(shots,1,'ready guard still fires with verified LOS');
  assert.equal(rays,4,'detection and muzzle LOS remain separately verified');
  assert.equal(u.cd,u.rate,'rifle ROF remains unchanged');
  assert.equal(counters.aiTowerSightChecks,3);
  assert.equal(counters.aiTowerSightSkipped,4);
  assert(counters.aiTowerSightMs>0,'sight CPU cost is measured');
  console.log('PASS tower visibility range/cone skips, shared alerts, live LOS, rifle fire');
})().catch(e=>{console.error(e);process.exitCode=1});
