import {createCoopTerrain} from './coop-terrain.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
import {createCanonicalWater} from '../src/canonical-water.mjs';
import {createPlayerSimulation,validatePlayerInput} from '../src/player-simulation.mjs';
import {GAME_VERSION} from '../src/version.mjs';
export const MISSION_VERSION='relay:1';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function generateRelayMission(room){
  if(room.members.length!==2||!room.allReady)throw new Error('Calen dos jugadors preparats.');
  const terrain=createCoopTerrain({seed:room.seed,mapScale:room.mapScale}),foundation=terrain.snapshot(),pad=foundation.basePlan.level,world=terrain.world,
    bounds={x0:pad.x-Math.min(pad.hw-2,60),x1:pad.x+Math.min(pad.hw-2,60),z0:pad.z-Math.min(pad.hd-2,55),z1:pad.z+Math.min(pad.hd-2,55)},cells=[];
  // All mission points are on the already completed flat pad, outside houses.
  for(let x=pad.x-40;x<=pad.x+40;x+=4)for(let z=pad.z-36;z<=pad.z+36;z+=4){
    if(x<bounds.x0+2||x>bounds.x1-2||z<bounds.z0+2||z>bounds.z1-2)continue;
    const p={x,z,y:pad.y+.06,hd:0},s=world.locomotionAt(x,z,p.y),q=world.resolveBody(p,p);
    if(!s.interior&&distance(p,q)<1e-6&&Math.abs(s.floor-pad.y)<.1)cells.push(p);
  }
  cells.sort((a,b)=>distance(a,pad)-distance(b,pad));const start=cells[0];if(!start)throw new Error('No hi ha espai segur per a la missió.');
  const reachable=[start],seen=new Set([start]),parents=new Map();
  for(let i=0;i<reachable.length;i++)for(const next of cells){
    if(seen.has(next)||Math.abs(distance(reachable[i],next)-4)>.01)continue;
    let clear=true;
    for(let k=1;k<=8;k++){const q={...start,x:reachable[i].x+(next.x-reachable[i].x)*k/8,z:reachable[i].z+(next.z-reachable[i].z)*k/8},p=world.resolveBody(q,q);if(distance(p,q)>1e-6){clear=false;break;}}
    if(clear){seen.add(next);parents.set(next,reachable[i]);reachable.push(next);}
  }
  const second=reachable.find(p=>distance(p,start)>=3.9&&distance(p,start)<=6);
  const far=reachable.filter(p=>distance(p,start)>10).sort((a,b)=>distance(b,start)-distance(a,start)),first=far[0],other=far.find(p=>first&&distance(p,first)>16);
  if(!second||!first||!other)throw new Error('No s’han pogut validar els recorreguts de la missió. Prova una altra llavor.');
  const point=p=>({x:p.x,z:p.z,y:p.y}),route=p=>{const path=[];while(p){path.unshift(point(p));p=parents.get(p);}return path;},id=crypto.randomUUID(),meta={version:1,generator:MISSION_VERSION,gameVersion:GAME_VERSION,id,roomId:room.id,revision:room.revision,seed:room.seed,mapScale:room.mapScale,
    difficulty:room.difficulty??1,timeLimitTicks:Math.round(27000/(room.difficulty??1)),createdAt:Date.now(),expiresAt:Math.min(room.expiresAt,Date.now()+30*60*1000),bounds,floor:pad.y,
    members:room.members.map(m=>({id:m.id,name:m.name})),terminals:[point(first),point(other)],routes:[route(first),route(other)],extraction:point(start)},
    actors=room.members.map((m,i)=>({id:m.id,...point(i?second:start),hd:0,hp:20}));
  return {geometry:world.snapshot(),record:{meta,phase:'relay',hold:0,status:'paused',checkpoint:{protocol:1,epoch:id,tick:0,players:actors.map(a=>({...a,acknowledged:0,fall:null,swimming:false}))},nextAlarm:Date.now()+100}};
}
export function restoreRelayMission(record,geometry){
  if(record?.meta?.generator!==MISSION_VERSION||record.meta.gameVersion!==GAME_VERSION)throw new Error('La missió és d’una versió anterior. Torneu a iniciar-la.');
  const meta=structuredClone(record.meta),world=createStaticWorldAdapter(geometry),water=createCanonicalWater(world.heightAt),b=meta.bounds,
    bounded={...world,resolveBody(previous,candidate){const p=world.resolveBody(previous,{...candidate,x:clamp(candidate.x,b.x0,b.x1),z:clamp(candidate.z,b.z0,b.z1)});return {...p,x:clamp(p.x,b.x0,b.x1),z:clamp(p.z,b.z0,b.z1)};}},
    sim=createPlayerSimulation({epoch:meta.id,limit:world.limit,world:bounded,vertical:{surfaceAt:water.surfaceAt},checkpoint:record.checkpoint}),actions=new Map();
  let phase=record.phase,hold=record.hold,status=record.status;
  function snapshot(){return {...sim.snapshot(),missionId:meta.id,phase,hold,status,remaining:Math.max(0,(meta.timeLimitTicks-sim.snapshot().tick)/30)};}
  function accept(id,message){
    if(!['relay','extract'].includes(phase)||message.epoch!==meta.id||typeof message.interact!=='boolean'||!validatePlayerInput(message.input)||!sim.accept(id,message))return false;
    actions.set(id,{interact:message.interact,tick:sim.snapshot().tick});return true;
  }
  function step(){
    if(status!=='running'||!['relay','extract'].includes(phase))return snapshot();
    const state=sim.step(),near=(p,q)=>p.hp>0&&!p.fall&&distance(p,q)<=3.2&&Math.abs(p.y-q.y)<2;
    if(state.players.some(p=>p.hp<=0)||state.tick>=meta.timeLimitTicks){phase='failed';hold=0;return snapshot();}
    if(phase==='relay'){
      const both=meta.members.every((m,i)=>{const p=state.players.find(p=>p.id===m.id),a=actions.get(m.id);return a?.interact&&state.tick-a.tick<=8&&near(p,meta.terminals[i]);});
      hold=both?hold+1:0;if(hold>=90){phase='extract';hold=0;}
    }else{hold=state.players.every(p=>near(p,meta.extraction))?hold+1:0;if(hold>=60){phase='won';hold=60;}}
    return snapshot();
  }
  return {meta,geometry,accept,step,snapshot,setStatus(value){status=value;if(value!=='running'){actions.clear();sim.clearInputs();if(['relay','extract'].includes(phase))hold=0;}},
    checkpoint(nextAlarm){return {meta,phase,hold,status,checkpoint:sim.snapshot(),nextAlarm};},
    setup(self){return {type:'mission',self,meta,geometry,state:snapshot()};}};
}
