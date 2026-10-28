import {createCoopTerrain} from './coop-terrain.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
import {createCanonicalWater} from '../src/canonical-water.mjs';
import {createPlayerSimulation,validatePlayerInput} from '../src/player-simulation.mjs';
import {GAME_VERSION} from '../src/version.mjs';
export const MISSION_VERSION='relay:3';
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
  meta.supplies=[first,other].flatMap((p,i)=>['bullets','grenades','disguise'].map((item,j)=>({id:`supply-${i}-${j}`,item,amount:item==='bullets'?12:1,...point(p)})));
  meta.doors=foundation.baseStructures.walls.flatMap((w,wallIndex)=>w.door&&!w.locked&&!w.alwaysOpen?[{id:w.id,wallIndex,cx:w.cx,cz:w.cz,floor:w.y0+1}]:[]);
  return {geometry:world.snapshot(),record:{meta,phase:'relay',hold:0,status:'paused',checkpoint:{protocol:1,epoch:id,tick:0,players:actors.map(a=>({...a,acknowledged:0,fall:null,swimming:false}))},nextAlarm:Date.now()+100}};
}
export function restoreRelayMission(record,geometry){
  if(record?.meta?.generator!==MISSION_VERSION||record.meta.gameVersion!==GAME_VERSION)throw new Error('La missió és d’una versió anterior. Torneu a iniciar-la.');
  const meta=structuredClone(record.meta),canonical=structuredClone(geometry),physical=structuredClone(geometry),b=meta.bounds,
    doorStates=new Map((record.doors||meta.doors.map(d=>({id:d.id,open:false}))).map(d=>[d.id,!!d.open])),
    cooldowns=new Map((record.doorCooldowns||[]).map(c=>[c.actorId,c.tick])),results=structuredClone(record.commandResults||[]);
  for(const d of meta.doors)physical.walls[d.wallIndex].open=doorStates.get(d.id)??false;
  let world=createStaticWorldAdapter(physical);
  const water=createCanonicalWater((x,z)=>world.heightAt(x,z)),
    bounded={locomotionAt:(...args)=>world.locomotionAt(...args),roofLanding:(...args)=>world.roofLanding(...args),resolveBody(previous,candidate){const p=world.resolveBody(previous,{...candidate,x:clamp(candidate.x,b.x0,b.x1),z:clamp(candidate.z,b.z0,b.z1)});return {...p,x:clamp(p.x,b.x0,b.x1),z:clamp(p.z,b.z0,b.z1)};}},
    sim=createPlayerSimulation({epoch:meta.id,limit:world.limit,world:bounded,vertical:{surfaceAt:water.surfaceAt},checkpoint:record.checkpoint}),actions=new Map();
  let phase=record.phase,hold=record.hold,status=record.status,doorRevision=record.doorRevision??0;
  const inventory=new Map(meta.members.map(m=>[m.id,structuredClone(record.inventories?.find(i=>i.actorId===m.id)||{actorId:m.id,bullets:24,grenades:2,disguise:1,disguised:false})])),claimed=new Set(record.claimedSupplies||[]),inventoryResults=structuredClone(record.inventoryResults||[]);
  const inventories=()=>[...inventory.values()].map(i=>({...i}));
  function inventoryCommand(actorId,message){
    const cached=inventoryResults.find(r=>r.actorId===actorId&&r.commandId===message.commandId);if(cached)return {...cached,duplicate:true};
    const actor=sim.snapshot().players.find(p=>p.id===actorId),bag=inventory.get(actorId);let code='INVALID',ok=false;
    if(actor&&message.epoch===meta.id&&typeof message.commandId==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(message.commandId)){
      if(status!=='running'||!['relay','extract'].includes(phase)||actor.hp<=0||actor.fall||Date.now()>=meta.expiresAt)code='NOT_ACTIVE';
      else if(message.operation==='disguise'&&typeof message.target==='boolean'){
        if(!bag.disguise)code='EMPTY';else{bag.disguised=message.target;ok=true;code='EQUIPPED';}
      }else if(message.operation==='pickup'&&typeof message.target==='string'){
        const supply=meta.supplies.find(s=>s.id===message.target);
        if(!supply)code='UNKNOWN_SUPPLY';else if(claimed.has(supply.id))code='TAKEN';
        else if(distance(actor,supply)>3.2||Math.abs(actor.y-supply.y)>=2)code='TOO_FAR';
        else if(bag[supply.item]+supply.amount>({bullets:120,grenades:8,disguise:1})[supply.item])code='FULL';
        else{bag[supply.item]+=supply.amount;claimed.add(supply.id);ok=true;code='PICKED_UP';}
      }
      const result={actorId,commandId:message.commandId,ok,code};inventoryResults.push(result);if(inventoryResults.length>64)inventoryResults.shift();return {...result};
    }return {actorId,commandId:message.commandId,ok,code};
  }
  const doors=()=>meta.doors.map(d=>({id:d.id,open:doorStates.get(d.id)??false}));
  function snapshot(){return {...sim.snapshot(),missionId:meta.id,phase,hold,status,doorRevision,doors:doors(),inventories:inventories(),claimedSupplies:[...claimed],remaining:Math.max(0,(meta.timeLimitTicks-sim.snapshot().tick)/30)};}
  function doorCommand(actorId,message){
    const previous=results.find(r=>r.actorId===actorId&&r.commandId===message.commandId);if(previous)return {...previous,duplicate:true};
    let code='INVALID',ok=false;
    const state=sim.snapshot(),actor=state.players.find(p=>p.id===actorId),door=meta.doors.find(d=>d.id===message.doorId);
    if(actor&&message.epoch===meta.id&&typeof message.commandId==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(message.commandId)&&typeof message.open==='boolean'){
      if(status!=='running'||!['relay','extract'].includes(phase)||actor.hp<=0||actor.fall||Date.now()>=meta.expiresAt)code='NOT_ACTIVE';
      else if(!door)code='UNKNOWN_DOOR';
      else if(Math.hypot(actor.x-door.cx,actor.z-door.cz)>4.5||Math.abs(actor.y-door.floor)>2)code='TOO_FAR';
      else if(doorStates.get(door.id)===message.open){ok=true;code='UNCHANGED';}
      else if(state.tick-(cooldowns.get(actorId)??-Infinity)<18)code='COOLDOWN';
      else{
        const wall=physical.walls[door.wallIndex],occupied=!message.open&&state.players.some(p=>p.x>wall.x0-.8&&p.x<wall.x1+.8&&p.z>wall.z0-.8&&p.z<wall.z1+.8&&p.y+3.1>wall.y0&&p.y+.15<wall.y1);
        if(occupied)code='OCCUPIED';
        else{
          const updated={...physical,walls:physical.walls.map((w,i)=>i===door.wallIndex?{...w,open:message.open}:w)},next=createStaticWorldAdapter(updated);
          physical.walls=updated.walls;world=next;doorStates.set(door.id,message.open);cooldowns.set(actorId,state.tick);doorRevision++;ok=true;code=message.open?'OPENED':'CLOSED';
        }
      }
    }
    const result={actorId,commandId:message.commandId,doorId:message.doorId,ok,code,revision:doorRevision};
    if(actor&&typeof message.commandId==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(message.commandId)){results.push(result);if(results.length>32)results.shift();}
    return {...result};
  }
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
  return {meta,geometry:canonical,accept,step,snapshot,doorCommand,inventoryCommand,setStatus(value){status=value;if(value!=='running'){actions.clear();sim.clearInputs();if(['relay','extract'].includes(phase))hold=0;}},
    checkpoint(nextAlarm){return {meta:structuredClone(meta),phase,hold,status,checkpoint:sim.snapshot(),nextAlarm,inventories:inventories(),claimedSupplies:[...claimed],inventoryResults:structuredClone(inventoryResults),doors:doors(),doorRevision,doorCooldowns:[...cooldowns].map(([actorId,tick])=>({actorId,tick})),commandResults:structuredClone(results)};},
    setup(self){return {type:'mission',self,meta:structuredClone(meta),geometry:world.snapshot(),state:snapshot()};}};
}
