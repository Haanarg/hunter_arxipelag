'use strict';
const assert=require('node:assert/strict');
const {captureMissionData,validateMission}=require('../tools/mission-viability.cjs');
(async()=>{
  const game=await require('./harness.cjs')();
  game.run("seedSearchMode=true;seedSearchCategoryEl.value='vehicle'");game.start('67');
  const data=captureMissionData(game),report=options=>validateMission({...data,...options}),
    has=(r,code,severity='error')=>r.issues.some(i=>i.code===code&&i.severity===severity),
    baseline=report();
  assert.equal(baseline.ok,true,'The real reference world satisfies the contract');
  const hq=data.compounds.find(c=>c.id==='hq'),b=hq.general.basement;

  const malformed=report({compounds:[{id:'hq'},data.compounds.find(c=>c.id==='base')]});
  assert(has(malformed,'general.invalid'),'Malformed HQ records produce an issue, not an exception');
  assert(has(report({enemies:data.enemies.filter(e=>e!==hq.general)}),'general.invalid'),
    'An unregistered general does not count as a live mission target');
  assert(has(report({seed:(data.seed+1)>>>0}),'seed.changed'),'A substituted seed must be visible');

  // Geometry skipping is explicit, not a completion claim.
  const noGeometry=validateMission(data,{geometry:false});
  assert.equal(noGeometry.geometricAccess,'not-run');
  assert(noGeometry.limits.some(s=>s.includes('skipped')));
  assert(!noGeometry.checks.some(c=>c.id==='bunker.local-access'));
  assert.equal(noGeometry.checks.find(c=>c.id==='intel.mapa').supported,null);

  // Maps still exist in the object list, but all HQ maps are physically inside
  // a forbidden hangar. Deliberately stale metadata must not hide that fact.
  const hangar=data.buildings.find(b=>b.hangar),forbidden=report({items:data.items.map(it=>it.t!=='mapa'?it:
    {...it,x:hangar.x,z:hangar.z,y:hangar.fy+1.3,building:null,compound:null})});
  assert(has(forbidden,'intel.unavailable'));
  assert.equal(forbidden.checks.find(c=>c.id==='intel.mapa').permitted,0);
  const noOptionalIntel=report({items:data.items.filter(it=>it.t!=='mapa_heli'&&it.t!=='mapa_tanc')});
  assert(has(noOptionalIntel,'intel.unavailable','warning'));
  assert.equal(noOptionalIntel.ok,true,'Helicopter and tank maps are optional mission coverage');

  const ps=data.coast.points,mid=ps[Math.floor(ps.length/2)],floor=data.groundAt(mid.x,mid.z,mid.y),
    obstacle={x0:mid.x-2,x1:mid.x+2,z0:mid.z-2,z1:mid.z+2,y0:floor-1,y1:floor+5,open:false,door:false};
  assert(has(report({walls:[...data.walls,obstacle]}),'coast.blocked'),
    'A route object with a solid obstacle is not a traversable corridor');
  assert(has(report({coast:{...data.coast,dock:{x:0,z:0}}}),'coast.disconnected'));
  assert(has(report({coast:{unavailable:true}}),'coast.unavailable','warning'),
    'A missing supplied coast route is explicit; alternate routes are not inferred');

  const brokenGate=report({doors:data.doors.filter(d=>d!==b.door)});
  assert(has(brokenGate,'bunker.gate-invalid'),'An inert door object cannot stand in for an active gate');
  const necessaryDoor=b.basement.doors.filter(d=>Math.abs(d.cx-(b.x-7.5))<.1)
    .sort((a,c)=>Math.abs(a.cz-hq.general.z)-Math.abs(c.cz-hq.general.z))[0];
  assert(has(report({doors:data.doors.filter(d=>d!==necessaryDoor)}),'bunker.access-blocked'),
    'A necessary interior door missing from the active mechanism remains a solid obstruction');
  const duration=b.door.openDuration;
  try{b.door.openDuration=0;assert(has(report(),'bunker.gate-invalid'))}
  finally{b.door.openDuration=duration}
  // Keep the target, walls and item counts intact, but remove the only descending
  // floor. A two-dimensional object/count check would falsely accept this world.
  const st=b.basement.stair,missingStair=report({groundAt:(x,z,previous)=>{
    const p=data.toLocal(b,x,z);
    if(Math.abs(p.x-st.x)<=st.width/2&&p.z>=Math.min(st.zTop,st.zBottom)&&p.z<=Math.max(st.zTop,st.zBottom))return b.fy+.22;
    return data.groundAt(x,z,previous);
  }});
  assert(has(missingStair,'bunker.access-blocked'),'No cellar route without descending support');
  const target=hq.general,solidTarget={x0:target.x-2,x1:target.x+2,z0:target.z-2,z1:target.z+2,
    y0:target.gy-1,y1:target.gy+5,open:false,door:false};
  assert(has(report({walls:[...data.walls,solidTarget]}),'bunker.access-blocked'),
    'A general sealed inside a solid obstruction is not accessible');

  assert(has(report({vehicles:[{t:'barca_rems',x:data.base.x,z:data.base.z}]}),'transport.unavailable'),
    'A watercraft object on dry land does not satisfy transport support');
  const noPorts=report({compounds:data.compounds.filter(c=>c.id!=='port')});
  assert.equal(noPorts.ok,true,'Military port coverage is not a mission prerequisite');
  assert(has(noPorts,'coverage.compound-missing','warning'));

  game.run('globalThis.missionSavedR=R;R=mul(8192)');
  validateMission(captureMissionData(game));
  assert.equal(game.run('R()'),game.run('mul(8192)()'),'Diagnostics do not consume seeded randomness');
  game.run('R=missionSavedR');
  console.log('PASS: real-world fault injection for objective, seed identity, intel legality, coast walls/endpoints, dynamic gate registration, stair support, sealed target and transport surface; explicit reduced scope.');
})().catch(e=>{console.error(e);process.exitCode=1});
