'use strict';
const assert=require('node:assert/strict');
const {captureMissionData,validateMission}=require('../tools/mission-viability.cjs');

// Every matrix cell uses the full logical build. The compound/item search
// categories return before vehicles, HQ state and final terrain are ready.
const parseList=(name,fallback)=>process.env[name]?.split(',').map(s=>s.trim()).filter(Boolean)||fallback;
const seeds=parseList('MISSION_SEEDS',['67','12345','2026','91284']),
  scales=parseList('MISSION_SCALES',['1','2']).map(Number);
assert(seeds.length>0&&seeds.length<=16,'Use 1–16 seeds per bounded run');
assert(scales.length>0&&scales.length<=2&&scales.every(n=>n===1||n===2),'Only map scales 1 and 2 are supported');
const full=process.env.MISSION_FULL==='1';

// Follow the validator's witness with the actual floor, wallPush and dynamic
// updateDoors logic. Closed doors must open through their normal mechanisms;
// the probe never changes wall/open/locked flags or ignores collisions.
function replayBunkerAccess(game,path){
  game.context.missionProbePath=path;
  return game.run(`(()=>{
    const b=world.userData.compounds.find(c=>c.id==='hq').general.basement,
      first=missionProbePath[0],opened=new Set();
    cv=null;P.x=first.x;P.z=first.z;P.y=groundAt(first.x,first.z,first.y);
    let samples=0,waited=0;
    for(let i=1;i<missionProbePath.length;i++){
      const a={x:P.x,z:P.z},end=missionProbePath[i],n=Math.max(1,Math.ceil(Math.hypot(end.x-a.x,end.z-a.z)/.35));
      for(let k=1;k<=n;k++){
        const old={x:P.x,z:P.z,y:P.y},x=a.x+(end.x-a.x)*k/n,z=a.z+(end.z-a.z)*k/n;
        let clear=false;
        for(let wait=0;wait<=110;wait++){
          updateDoors(.1);
          for(const d of Dr)if(d.open&&(d.bunkerGate||d.bunkerInteriorDoor))opened.add(d);
          P.x=x;P.z=z;wallPush();
          if(Math.hypot(P.x-x,P.z-z)<1e-7){clear=true;break}
          P.x=old.x;P.z=old.z;P.y=old.y;waited+=.1;
        }
        if(!clear)return{ok:false,reason:'wall or unopened door',at:{x,z,y:P.y},samples};
        const y=groundAt(P.x,P.z,P.y);
        if(!Number.isFinite(y)||Math.abs(y-old.y)>.45)return{ok:false,reason:'floor discontinuity',at:{x,z,y},samples};
        P.y=y;samples++;
      }
    }
    const g=world.userData.compounds.find(c=>c.id==='hq').general;
    return{ok:Math.hypot(P.x-g.x,P.z-g.z)<.1&&Math.abs(P.y-g.gy)<.1,
      samples,waited:Math.round(waited*10)/10,openedGate:opened.has(b.door),
      openedInterior:[...opened].filter(d=>d.bunkerInteriorDoor).length};
  })()`);
}

(async()=>{
  const game=await require('./harness.cjs')();
  game.run(`seedSearchMode=${!full};seedSearchCategoryEl.value='vehicle'`);
  const reports=[];
  for(const scale of scales)for(const seed of seeds){
    const started=Date.now();game.start(seed,scale);
    const data=captureMissionData(game),before=game.run('JSON.stringify({seed,P,doors:Dr.map(d=>[d.open,d.openProgress])})'),
      report=validateMission(data),after=game.run('JSON.stringify({seed,P,doors:Dr.map(d=>[d.open,d.openProgress])})');
    assert.equal(after,before,'Offline validation must not move the player or change doors/seed');
    const access=report.checks.find(c=>c.id==='bunker.local-access'),
      replay=access?.path?replayBunkerAccess(game,access.path):{ok:false,reason:'no access witness'};
    reports.push(report);
    console.log(JSON.stringify({seed,scale,mode:full?'full':'logical',ms:Date.now()-started,
      ok:report.ok,replay,issues:report.issues,
      checks:report.checks.map(({path,...c})=>({...c,...(path?{waypoints:path.length}:{})}))}));
    assert.equal(report.ok,true,seed+'/'+scale+': '+report.issues.filter(i=>i.severity==='error').map(i=>i.code).join(', '));
    assert.equal(replay.ok,true,seed+'/'+scale+': '+JSON.stringify(replay));
    assert.equal(replay.openedGate,true,'The gate must open normally');
    assert(replay.openedInterior>=2,'The walking route must use normal basement doors');
  }
  console.log('PASS: '+reports.length+' bounded mission prerequisite/access cases; no global completion claim.');
})().catch(e=>{console.error(e);process.exitCode=1});
