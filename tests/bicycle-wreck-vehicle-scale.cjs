#!/usr/bin/env node
'use strict';
// Regression: bicycles become non-explosive wrecks, and scale preview uses the real factory.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const combat=read('src/combat.js'),core=read('src/game-core.js');
const html=read('vehicle-mides-proves.html');
const code=combat.slice(combat.indexOf('function destroyBicycle(v)'),combat.indexOf('// Regla única: qualsevol mal positiu'));
assert(code.startsWith('function destroyBicycle(v)'));
let blasts=0,fragments=0,playerDamage=0,removed=0;
const env={
 window:{HUNTER_COMBAT_BALANCE:{}},
 THREE:{Box3:class{setFromObject(){return{min:{y:0}}}}},
 cv:null,P:{x:0,y:0,z:0,hd:0},playerEject:null,V:[],intelMarks:[],
 VT:{bici:{life:1,m:'l'},moto:{life:2,m:'l'}},
 cheats:{immune:false},
 resetCameraState(){},groundAt:()=>0,hAt:()=>0,rn:()=>1,
 vehicleDebris(){fragments++},world:{remove(){removed++}},
 boom(){blasts++},hurtP(){playerDamage++},ejectFromHelicopter(){},
 wholeDamage:Math.ceil,confirmCombatDamage(){},combatFeedback:null
};
const {damageVehicle}=new Function('env','with(env){'+code+'return {damageVehicle};}')(env);
const vehicle=type=>({
 t:type,x:0,z:0,hd:0,life:type==='bici'?1:2,
 o:{position:{y:0},rotation:{z:0},updateMatrixWorld(){}}
});
const ridden=vehicle('bici');env.V=[ridden];env.cv=ridden;
damageVehicle(ridden,1,1,'impact');
assert(ridden.destroyed&&ridden.life===0&&env.V.length===0);
assert.equal(env.cv,null);assert.equal(env.playerEject.kind,'bicycle');
assert.equal(env.playerEject.vx,0);assert.equal(env.playerEject.vz,0);
assert.equal(blasts,0);assert.equal(playerDamage,0);assert.equal(fragments,0);
assert.equal(removed,0,'wreck remains on site');
const parked=vehicle('bici');env.V=[parked];damageVehicle(parked,1,1,'impact');
assert(parked.destroyed);assert.equal(blasts,0);
const motorbike=vehicle('moto');env.V=[motorbike];damageVehicle(motorbike,2,1,'impact');
assert(motorbike.destroyed);assert.equal(blasts,1);assert.equal(fragments,1);
assert.equal(removed,1);
assert(core.includes("playerEject.kind==='bicycle'"),'short non-airborne animation');
const matches=[...html.matchAll(/\{id:'([^']+)',name:'[^']+',row:'(terra|mar|aire)'\}/g)];
const types=['bici','moto','cotxe_civil','cotxe','camio','tanqueta','tanc',
 'windsurf','barca_rems','moto_aquatica','llanxa','llanxa_coets','hover','ferry',
 'heli','heli_combat'];
assert.deepEqual(matches.map(x=>x[1]),types);
assert(html.includes('HUNTER_VEHICLES.createFactory'),'real vehicle factory');
assert(html.includes('HUNTER_CHARACTERS.createPlayer'),'actual player');
assert(html.includes('prepareHumveeD31Runtime'),'approved Humvee procedural');
assert(html.includes('createCivilianCarModel'),'approved civilian model');
assert(html.includes('createTruckModel'),'approved truck model');
assert(html.includes('new THREE.GridHelper(320,320'),'real one-metre grid');
console.log('PASS: bicycle wrecks without blasts; all 16 official vehicle models with player scale.');
