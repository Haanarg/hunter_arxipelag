'use strict';
// The real game's logical build, not a miniature island generator.
// This audit does not prove full gameplay or two-device cooperative parity.
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {captureMissionData,validateMission}=require('../tools/mission-viability.cjs');
const createGame=require('./harness.cjs');
const defaults=['1','67','148','2026','12345','2407759483'];
const seeds=process.env.WORLD_MATRIX_SEEDS
 ?process.env.WORLD_MATRIX_SEEDS.split(',').map(s=>s.trim()).filter(Boolean)
 :defaults;
assert(seeds.length>=1&&seeds.length<=16,'Keep matrix to 1–16 seeds per run');
assert(seeds.every(s=>/^\d+$/.test(s)&&BigInt(s)<=4294967295n),
 'Seeds must be unsigned 32-bit integers');
const digest=s=>createHash('sha256').update(s).digest('hex');
(async()=>{
 const game=await createGame();
 game.run("seedSearchMode=true;seedSearchCategoryEl.value='vehicle'");
 const fingerprints=new Map();let cases=0;
 function generate(seed,scale,checkMission){
  game.start(seed,scale);
  const data=captureMissionData(game);
  const snapshot=game.run(`JSON.stringify({
   requestedSeed,seed:seed>>>0,scale:MAP_SCALE,halfSize:H,
   base:P.base,spawn:[P.x,P.y,P.z],
   compounds:world.userData.compounds.map(c=>[c.id,c.x,c.z,c.r,c.placement]),
   reservation:world.userData.prisonCampReservation,
   routes:world.userData.paths.map(p=>[p.width,p.color,p.points]),
   coast:world.userData.baseCoast,
   vehicles:V.map(v=>[v.t,v.x,v.z,v.hd]),
   items:items.map(it=>[it.t,it.x,it.z,it.y]),
   enemies:E.map(e=>[e.t,e.x,e.z]),
   randPosition:R()
  })`);
  const state=JSON.parse(snapshot);
  assert.equal(state.seed,Number(seed)>>>0,'seed preserved');
  assert.equal(Number(state.requestedSeed)>>>0,state.seed,'requested seed preserved');
  assert.equal(state.scale,scale,'correct map size');
  assert.equal(state.halfSize,2400*scale,'world bounds match map scale');
  assert(state.base&&Number.isFinite(state.base.x)&&Number.isFinite(state.base.z));
  assert(state.compounds.length>3,'compound generation completed');
  for(const id of ['base','hq','prison-camp']){
   assert.equal(state.compounds.filter(c=>c[0]===id).length,1,
    'exactly one mandatory '+id+' in '+seed+'/'+scale);
  }
  const reservation=state.reservation;
  assert(reservation&&reservation.r>0,'prison camp reservation exists');
  for(const c of state.compounds)
   assert(Number.isFinite(c[1])&&Number.isFinite(c[2])&&
    Math.abs(c[1])<state.halfSize&&Math.abs(c[2])<state.halfSize,
    'compound inside playable area: '+JSON.stringify(c));
  for(const [width,color,points] of state.routes){
   assert(Number.isFinite(width)&&width>0&&Array.isArray(points),'valid path metadata');
   for(const point of points)assert(Array.isArray(point)&&point.length===2&&
     point.every(Number.isFinite),'finite road coordinate');
  }
  for(const v of state.vehicles)assert(Number.isFinite(v[1])&&Number.isFinite(v[2]),
    'finite vehicle position '+JSON.stringify(v));
  // Capture one explicit RNG continuation value, matching it on replay.
  const hash=digest(snapshot);
  if(checkMission){
   const before=game.run("JSON.stringify([seed,P.x,P.z,Dr.map(d=>[d.open,d.openProgress])])");
   const report=validateMission(data);
   const after=game.run("JSON.stringify([seed,P.x,P.z,Dr.map(d=>[d.open,d.openProgress])])");
   assert.equal(after,before,'mission audit must not change the running world');
   const errors=report.issues.filter(issue=>issue.severity==='error');
   if(errors.some(e=>e.code==='coast.blocked')){
    const blocked=errors.find(e=>e.code==='coast.blocked');
    game.context.auditBlockedCoastPoint=blocked.at;
    const detail=game.run(`(()=>{
     const p=auditBlockedCoastPoint,nearWall=(w)=>p&&
       p.x>w.x0-4&&p.x<w.x1+4&&p.z>w.z0-4&&p.z<w.z1+4,
       road=world.userData.baseCoast?.points||[];
     return {
       at:p,nearbyWalls:Wl.map((w,i)=>({w,i})).filter(o=>nearWall(o.w)).slice(0,24).map(({w,i})=>({
         i,x0:w.x0,x1:w.x1,z0:w.z0,z1:w.z1,y0:w.y0,y1:w.y1,
         door:w.door,open:w.open,playerBlock:w.playerBlock,rammable:w.rammable,
         owner:w.owner?.compound||w.owner?.layoutBuilding||w.owner?.kind||null
       })),
       nearbyBuildings:B.filter(b=>Math.hypot(b.x-p.x,b.z-p.z)<100).slice(0,16).map(b=>({
         x:b.x,z:b.z,w:b.w,d:b.d,kind:b.kind,compound:b.compound?.type||b.compound?.id
       })),
       nearbyCompounds:world.userData.compounds.filter(c=>Math.hypot(c.x-p.x,c.z-p.z)<180).map(c=>({
         type:c.id,x:c.x,z:c.z,r:c.r
       })),
       nearestRoad:road.map((q,i)=>({i,d:Math.hypot(q.x-p.x,q.z-p.z),x:q.x,z:q.z,y:q.y}))
        .sort((a,b)=>a.d-b.d).slice(0,5)
     };
    })()`);
    console.error('COAST BLOCKED DIAGNOSTIC '+JSON.stringify(detail));
   }
   assert.equal(report.ok,true,'world '+seed+'/'+scale+' invalid: '+JSON.stringify(errors));
   assert(report.checks.some(c=>c.id==='bunker.local-access'&&c.status==='pass'),
     'HQ bunker locally walkable');
   assert(report.checks.some(c=>c.id==='transport.surface'&&c.status==='pass'),
     'at least one watercraft or helicopter on suitable terrain');
   const warnings=report.issues.filter(issue=>issue.severity==='warning').map(issue=>issue.code);
   cases++;
   console.log('PASS logical world '+seed+'/'+scale+
     ' compounds='+state.compounds.length+' routes='+state.routes.length+
     ' vehicles='+state.vehicles.length+' warnings='+JSON.stringify(warnings)+
     ' fingerprint='+hash.slice(0,16));
  }
  return hash;
 }
 for(const scale of [1,2])for(const seed of seeds)
  fingerprints.set(seed+'/'+scale,generate(seed,scale,true));
 // Rebuild selected seeds after intervening missions, testing that a mission
 // reset restores site registries, plans, vehicles and RNG deterministically.
 for(const [seed,scale] of [[seeds[0],1],[seeds.at(-1),2]]){
  const key=seed+'/'+scale;
  assert.equal(generate(seed,scale,false),fingerprints.get(key),
   'deterministic restart after another mission: '+key);
 }
 console.log('PASS phase4 world matrix: '+cases+' complete logical builds, '+
  '2 post-restart deterministic replays, '+seeds.length+' varied seeds, 2 sizes');
})().catch(e=>{console.error(e);process.exitCode=1});
