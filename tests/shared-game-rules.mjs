import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {vehicleDynamics,advanceVehicle} from '../src/vehicle-dynamics-core.mjs';
import * as combat from '../src/combat-rules.mjs';
const traces=JSON.parse(readFileSync(new URL('./fixtures/vehicle-drive-traces.json',import.meta.url)));
for(const type of Object.keys(traces)){
 const v={t:type,v:0,hd:.2},samples=[];
 for(let n=0;n<240;n++){const dt=[1/30,1/60,.05][n%3],f=n<80?1:n<130?0:-.7,tr=n%80<40?.6:-.8,input=vehicleDynamics.inputs(v,f,tr,dt);advanceVehicle(v,input.forward,input.turn,dt,.4,{drag:.15});samples.push([v.v,v.hd,v.sideV,v.strafeV,v.yawRate,v.driveInput,v.steerInput].map(x=>Math.round(x*1e9)));}
 assert.equal(createHash('sha256').update(JSON.stringify(samples)).digest('hex'),traces[type],type+': frozen individual trace must remain unchanged');
}
assert.equal(combat.impactDamage(10),0);assert.equal(combat.impactDamage(16),1);assert.equal(combat.impactDamage(100),5);assert.equal(combat.runoverDamage(6),0);assert.equal(combat.runoverDamage(100,5),10);assert.equal(combat.explosionDamage(10,4,8),5);assert.equal(combat.explosionDamage(10,8,8),0);
assert.equal(combat.segmentAabbT(0,1,0,10,1,0,4,6,0,2,-1,1),.4);assert.equal(combat.segmentAabbT(0,3,0,10,3,0,4,6,0,2,-1,1),null);
const state={remaining:0,delay:0},shots=[];let now=0;assert.equal(combat.beginBurst(state,2,()=>true),false);assert.equal(combat.beginBurst(state,3,i=>(shots.push([now,i]),true)),true);for(let i=0;i<5;i++){now++;combat.stepBurst(state,1/30,true,i=>(shots.push([now,i]),true));}assert.deepEqual(shots,[[0,0],[3,1],[5,2]]);assert.equal(state.remaining,0);
const source=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8'),legacy=readFileSync(new URL('../src/vehicle-dynamics.js',import.meta.url),'utf8'),sp=readFileSync(new URL('../src/combat.js',import.meta.url),'utf8');assert.match(source,/HUNTER_SHARED_VEHICLES.advanceVehicle/);assert.doesNotMatch(source,/const dragBase=c.dr/);assert.ok(legacy.length<400,'legacy dynamics file is only a bridge');assert.match(sp,/HUNTER_SHARED_COMBAT.stepBurst/);assert.doesNotMatch(sp,/assaultBurstRemaining/);
console.log('shared rules: 3,840 frozen individual vehicle steps across all 16 profiles, damage/contact formulas and identical fixed-step burst scheduling passed');

const body={x:2,y:5,z:3,vx:4,vy:8,vz:-2};assert.deepEqual(combat.ballisticStep(body,.1),{x:2.4,y:5.56,z:2.8,vy:5.6});assert.equal(body.vy,8,'integration cannot mutate the server or preview input');assert.deepEqual(combat.ballisticStep(body,.1,18),{x:2.4,y:5.62,z:2.8,vy:6.2});
