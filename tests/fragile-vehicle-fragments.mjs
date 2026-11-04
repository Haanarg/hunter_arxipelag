import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  FRAGILE_VEHICLE_PROFILES,fragileVehicleFragmentMotion,
  stepDebrisParticle
} from '../src/debris-core.mjs';

const types=['bici','barca_rems','windsurf'];
const midpoint=(a,b)=>(a+b)/2;
for(const type of types){
  const profile=FRAGILE_VEHICLE_PROFILES[type];
  assert.ok(profile,'profile exists for '+type);
  assert.ok(profile.maxPieces>=10&&profile.maxPieces<=20,
    type+' has recognizable fragments within performance budget');
  const motion=fragileVehicleFragmentMotion(type,{x:3,y:2,z:2},
    {x:0,y:1,z:0},0,10,midpoint);
  assert.equal(motion.vehiclePart,true);
  assert.equal(motion.fragilePart,true);
  assert.ok(motion.vy>8,'parts fly upward');
  const stopped=fragileVehicleFragmentMotion(type,{x:3,y:2,z:2},
    {x:0,y:1,z:0},0,0,midpoint);
  assert.ok(motion.vx>0&&motion.vz<stopped.vz,
    'outward impulse and inherited forward vehicle momentum');
  assert.ok(motion.life>2,'pieces remain visible long enough to tumble');
  assert.ok(Number.isFinite(motion.rx)&&Number.isFinite(motion.ry));
}
assert.equal(FRAGILE_VEHICLE_PROFILES.bici.waterFloat,0);
assert.ok(FRAGILE_VEHICLE_PROFILES.barca_rems.waterFloat>0);
assert.ok(FRAGILE_VEHICLE_PROFILES.windsurf.waterFloat>0);
assert.throws(()=>fragileVehicleFragmentMotion('tanc',{x:1,z:1},{x:0,z:0}),RangeError);

// Float for a brief moment and then sink, without emitting an explosion.
const afloat=fragileVehicleFragmentMotion('barca_rems',{x:2,y:0,z:1},
  {x:0,y:0,z:0},0,0,midpoint);
afloat.vx=0;afloat.vz=0;afloat.vy=-2;afloat.life=6;
const position={x:2,y:-.2,z:1},rotation={x:0,y:0,z:0};
for(let i=0;i<20;i++)stepDebrisParticle(afloat,position,rotation,1/60,
  ()=>-5,()=>0);
assert.ok(position.y>-.2,'rowboat wreckage floats at the water surface');
for(let i=0;i<140;i++)stepDebrisParticle(afloat,position,rotation,1/60,
  ()=>-5,()=>0);
assert.ok(position.y<-.15,'wreckage ultimately begins to sink');

const combat=readFileSync(new URL('../src/combat.js',import.meta.url),'utf8'),
      game=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8'),
      coop=readFileSync(new URL('../src/coop-world-runtime.js',import.meta.url),'utf8'),
      server=readFileSync(new URL('../server/coop-vehicles.mjs',import.meta.url),'utf8');
const solo= combat.slice(combat.indexOf('function destroyFragileVehicle('),
  combat.indexOf('function explodeVehicle(',combat.indexOf('function destroyFragileVehicle(')));
assert.ok(solo.includes('fragileVehicleDebris(v,yy,forwardSpeed)'));
assert.ok(!solo.includes('\n  boom(')&&!solo.includes('hurtP('),
  'fragile destruction must never have explosive radial damage');
assert.ok(game.includes('src.matrixWorld.decompose(p,q,scale)')&&
  game.includes('new THREE.Mesh(src.geometry,src.material)'),
  'pieces are the actual original model geometry');
assert.ok(game.includes('!o.userData.waterMask'),'water masks never become flying debris');
assert.ok(coop.includes('fragileVehicleDebris(v,row.y,'),
  'both COOP machines display the same visual category');
assert.ok(server.includes("!['bici','barca_rems','windsurf'].includes(v.t)"),
  'server keeps nonexplosive destruction logic');
console.log('Fragile vehicle flying fragments: profiles, water, solo and coop OK');
