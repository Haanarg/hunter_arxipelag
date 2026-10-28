import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {stepAirborne,fallLandingDamage,waterSupport,sweptRoofLanding} from '../src/player-simulation.mjs';
const require=createRequire(import.meta.url),legacy=require('./fixtures/player-vertical-v0612.cjs');
let steps=0;
for(const parachute of [false,true])for(const dt of [1/120,1/60,1/30])for(const hd of [0,.8,Math.PI]){
  let p={x:19,z:-19,hd},fall={y:120,vy:2,vx:12,vz:-10,t:0,leanF:0,leanS:0,parachute,startHeight:120},oldP={...p},oldFall={...fall};
  for(let k=0;k<360;k++){
    const input={forward:Math.sin(k*.1),strafe:Math.cos(k*.1)},before=JSON.stringify({p,fall});
    const actual=stepAirborne(p,fall,input,dt,20),expected=legacy.air(oldP,oldFall,input.forward,input.strafe,dt,20);
    assert.equal(JSON.stringify({p,fall}),before,'pure step leaves inputs unchanged');
    assert.deepEqual(actual,expected,'entire trajectory matches pre-extraction equations');
    p={...p,x:actual.x,z:actual.z};fall=actual.fall;steps++;
    if(parachute)assert.ok(fall.vy>=-4.8);
    assert.ok(Math.abs(p.x)<=20&&Math.abs(p.z)<=20);
  }
}
for(const startHeight of [0,4,5,20,120,500])for(const vy of [2,0,-4.8,-12,-30,-100])for(const water of [false,true])for(const parachute of [false,true]){
  const fall={startHeight,vy,parachute};assert.equal(fallLandingDamage(fall,{water,maxHealth:20}),legacy.damage(fall,water,20));
}
assert.equal(fallLandingDamage({startHeight:500,vy:-100,parachute:false},{maxHealth:20}),20);
for(const floor of [-10,-2.100001,-2.1,-2.099999,0,10])for(let mask=0;mask<32;mask++){
  const context={floor,surface:0,interior:!!(mask&1),basement:!!(mask&2),flight:!!(mask&4),vehicle:!!(mask&8),falling:!!(mask&16)};
  assert.deepEqual(waterSupport(context),legacy.water(context));
}
assert.deepEqual(waterSupport({floor:-20,surface:3,basement:true}),{swimming:false,y:-19.94},'sea never lifts actor out of basement');
const buildings=[{top:10,x:0},{top:15,x:2}],world={buildingCandidates:x=>buildings.filter(b=>Math.abs(x-b.x)<1),solidRoofAt:b=>b};
for(const x of [-4,0,2,4])for(const y of [9,10,12,16,20])for(const endY of [0,9,10,15,21]){
  const from={x,z:0,y},to={x:x+3,z:0,y:endY};assert.equal(sweptRoofLanding(from,to,world),legacy.roof(from,to,world));
}
assert.equal(sweptRoofLanding({x:0,z:0,y:20},{x:0,z:0,y:12},world),null,'no landing before feet reach roof');
assert.equal(sweptRoofLanding({x:0,z:0,y:11},{x:0,z:0,y:9},world),10);
const base={y:20,vy:0,vx:0,vz:0,t:0,leanF:0,leanS:0,parachute:false};
for(const dt of [NaN,-1,1.1])assert.throws(()=>stepAirborne({x:0,z:0,hd:0},base,{forward:0,strafe:0},dt,20));
assert.throws(()=>stepAirborne({x:0,z:0,hd:0},{...base,vy:Infinity},{forward:0,strafe:0},1/30,20));
assert.throws(()=>waterSupport({floor:NaN,surface:0}));
assert.throws(()=>sweptRoofLanding({x:0,z:0,y:2},{x:20000,z:0,y:1},world),/limit/);
// The same renderer-free code executes inside Cloudflare's native runtime.
const {build}=await import('esbuild'),{Miniflare}=await import('miniflare');
const compiled=await build({stdin:{contents:`import {stepAirborne,fallLandingDamage,waterSupport} from './src/player-simulation.mjs';
export default {fetch(){let p={x:0,z:0,hd:.8},fall={y:100,vy:0,vx:12,vz:4,t:0,leanF:0,leanS:0,startHeight:100,parachute:true};
for(let k=0;k<300;k++){const n=stepAirborne(p,fall,{forward:1,strafe:0},1/30,200);p={...p,x:n.x,z:n.z};fall=n.fall;}
return Response.json({p,fall,damage:fallLandingDamage(fall,{maxHealth:20}),support:waterSupport({floor:-10,surface:0})});}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser'});
const mf=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-08-06'});
try{
  const response=await mf.dispatchFetch('http://localhost/');assert.equal(response.status,200);
  const actual=await response.json();let p={x:0,z:0,hd:.8},fall={...base,y:100,vx:12,vz:4,startHeight:100,parachute:true};
  for(let k=0;k<300;k++){const n=stepAirborne(p,fall,{forward:1,strafe:0},1/30,200);p={...p,x:n.x,z:n.z};fall=n.fall;}
  for(const key of ['x','z','hd'])assert.ok(Math.abs(actual.p[key]-p[key])<1e-9);
  for(const key of ['y','vy','vx','vz','t','leanF','leanS'])assert.ok(Math.abs(actual.fall[key]-fall[key])<1e-9);
  assert.equal(actual.damage,0);assert.deepEqual(actual.support,{swimming:true,y:-2.1});
}finally{await mf.dispose();}
console.log(`vertical physics: ${steps} legacy trajectory steps, damage, water/basement, roof sweeps, bounds and native workerd passed`);
