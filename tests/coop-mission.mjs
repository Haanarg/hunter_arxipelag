import assert from 'node:assert/strict';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
const room=seed=>({id:'test-room',revision:4,seed,mapScale:1,difficulty:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'Primer'},{id:'b',name:'Segon'}]});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
for(const [seed,mapScale] of [[0,1],[1,1],[3,1],[4,1],[67,1],[4294967295,1],[67,2]]){
 const generated=generateRelayMission({...room(seed),mapScale}),mission=restoreRelayMission(generated.record,generated.geometry);mission.setStatus('running');
 let sequence=0,phase='relay',indices=[0,0],resumed=false;
 for(let k=0;k<4000&&mission.snapshot().phase!=='won';k++){
  const state=mission.snapshot();if(state.phase!==phase){phase=state.phase;indices=[0,0];}
  for(let i=0;i<2;i++){
   const p=state.players[i],path=phase==='relay'?mission.meta.routes[i]:[...mission.meta.routes[i]].reverse();
   while(indices[i]<path.length-1&&distance(p,path[indices[i]])<.25)indices[i]++;
   const target=path[indices[i]],dx=target.x-p.x,dz=target.z-p.z,d=Math.max(1,Math.hypot(dx,dz));
   assert.equal(mission.accept(p.id,{protocol:1,epoch:mission.meta.id,sequence:++sequence,input:{forward:-dz/d,turn:0,strafe:dx/d,run:true},interact:distance(p,mission.meta.terminals[i])<3}),true);
  }
  mission.step();
  if(!resumed&&k===60){
   const checkpoint=mission.checkpoint(Date.now()+100),restored=restoreRelayMission(checkpoint,generated.geometry);
   assert.deepEqual(restored.snapshot(),mission.snapshot(),'persistent checkpoint resumes tick, acknowledgements and positions');
   assert.equal(restored.accept('a',{protocol:1,epoch:mission.meta.id,sequence:1,input:{forward:0,turn:0,strafe:0,run:false},interact:false}),false,'replay rejected after restore');resumed=true;
  }
 }
 assert.equal(mission.snapshot().phase,'won','both actors can complete relay and extraction seed '+seed);
 const won=mission.snapshot();mission.step();assert.deepEqual(mission.snapshot(),won,'victory is final');
}
const g=generateRelayMission(room(67)),m=restoreRelayMission(g.record,g.geometry);m.setStatus('running');
assert.equal(m.accept('outsider',{protocol:1,epoch:m.meta.id,sequence:1,input:{forward:0,turn:0,strafe:0,run:false},interact:true}),false);
for(let k=0;k<120;k++){m.accept('a',{protocol:1,epoch:m.meta.id,sequence:k+1,input:{forward:0,turn:0,strafe:0,run:false},interact:true});m.step();}
assert.equal(m.snapshot().hold,0,'holding interact remotely cannot activate terminal');
m.setStatus('paused');const paused=m.snapshot();for(let k=0;k<10;k++)m.step();assert.deepEqual(m.snapshot(),paused);
console.log('relay mission: six seeds and both scales, both actors navigate actual geometry, simultaneous activation, extraction/victory, checkpoint/replay, unauthorized/remote interaction and pause passed');
