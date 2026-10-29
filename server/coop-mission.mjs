import {createCoopTerrain} from './coop-terrain.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
import {createCanonicalWater} from '../src/canonical-water.mjs';
import {createPlayerSimulation,validatePlayerInput} from '../src/player-simulation.mjs';
import {firstSupplyContact} from './coop-inventory.mjs';
import {createRelayVehicles,vehicleClear} from './coop-vehicles.mjs';
import {createRelayRescue,reviveReachable} from './coop-rescue.mjs';
import {createRelayCombat,traceArena} from './coop-combat.mjs';
import {GAME_VERSION} from '../src/version.mjs';
export const MISSION_VERSION='relay:13';
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
  const parking=reachable.filter(p=>distance(p,start)>6&&distance(p,start)<20&&actors.every(a=>distance(a,p)>4)&&vehicleClear(p,world,bounds)).sort((a,b)=>distance(a,start)-distance(b,start))[0];
  if(!parking)throw new Error('No hi ha aparcament segur per al jeep. Prova una altra llavor.');
  meta.vehicles=[{id:'jeep-1',kind:'jeep',t:'cotxe',...point(parking),hd:0,v:0,seats:[null,null]}];
  meta.targets=[first,other].map((p,i)=>{const q=parents.get(p);return {id:'target-'+i,...point(q),hp:12,ai:true,heading:Math.atan2(-((parents.get(q)||p).x-q.x),-((parents.get(q)||p).z-q.z)),state:'patrol',patrol:[point(q),point(parents.get(q)||p)],patrolIndex:1,lastAttack:-90,seenTicks:0};});
  meta.supplies=[first,other].flatMap((p,i)=>['bullets','grenades','disguise','medkits'].map((item,j)=>({id:`supply-${i}-${j}`,item,amount:item==='bullets'?12:1,...point(p)})));
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
    sim=createPlayerSimulation({epoch:meta.id,limit:world.limit,world:bounded,vertical:{surfaceAt:water.surfaceAt},checkpoint:record.checkpoint,movement:actor=>vehicles.position(actor)}),actions=new Map();
  let phase=record.phase,hold=record.hold,status=record.status,doorRevision=record.doorRevision??0;
  const inventory=new Map(meta.members.map(m=>[m.id,{actorId:m.id,bullets:24,grenades:2,disguise:1,medkits:1,assault:1,weapon:'pistol',disguised:false,...structuredClone(record.inventories?.find(i=>i.actorId===m.id)||{})}])),claimed=new Set(record.claimedSupplies||[]),inventoryResults=structuredClone(record.inventoryResults||[]);
  const loose=new Map((record.droppedSupplies||[]).map(s=>[s.id,structuredClone(s)]));let dropSequence=record.dropSequence||0;
  const capacities={bullets:120,grenades:8,disguise:1,medkits:3,assault:1};
  const supplies=()=>[...meta.supplies.filter(s=>!claimed.has(s.id)),...loose.values()].map(s=>({...s}));
  const inventories=()=>[...inventory.values()].map(i=>({...i}));
  function inventoryCommand(actorId,message){
    const cached=inventoryResults.find(r=>r.actorId===actorId&&r.commandId===message.commandId);if(cached)return {...cached,duplicate:true};
    const actor=sim.snapshot().players.find(p=>p.id===actorId),bag=inventory.get(actorId);let code='INVALID',ok=false;
    if(actor&&message.epoch===meta.id&&typeof message.commandId==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(message.commandId)){
      if(status!=='running'||!['relay','extract'].includes(phase)||actor.hp<=0||actor.fall||actor.swimming||Date.now()>=meta.expiresAt)code='NOT_ACTIVE';
      else if(vehicles.mounted(actorId))code='SEATED';
      else if(message.operation==='weapon'&&['pistol','assault'].includes(message.target)){if(message.target==='assault'&&!bag.assault)code='EMPTY';else{bag.weapon=message.target;combat.cancel(actorId);ok=true;code='SELECTED';}}
      else if(message.operation==='disguise'&&typeof message.target==='boolean'){
        if(!bag.disguise)code='EMPTY';else{bag.disguised=message.target;ok=true;code='EQUIPPED';}
      }else if(message.operation==='drop'&&Object.hasOwn(capacities,message.target)){
        const item=message.target,amount=Math.min(bag[item],item==='bullets'?12:1);
        if(!amount)code='EMPTY';else if(loose.size>=128)code='GROUND_FULL';
        else{const supply={id:`drop-${++dropSequence}`,item,amount,x:actor.x,y:actor.y,z:actor.z,blockedOwner:actorId};loose.set(supply.id,supply);bag[item]-=amount;if(item==='disguise')bag.disguised=false;if(item==='assault'){bag.weapon='pistol';combat.cancel(actorId);}ok=true;code='DROPPED';}
      }

      const result={actorId,commandId:message.commandId,ok,code};inventoryResults.push(result);if(inventoryResults.length>64)inventoryResults.shift();return {...result};
    }return {actorId,commandId:message.commandId,ok,code};
  }
  const vehicles=createRelayVehicles({meta,record:record.vehicles,world:()=>world,players:()=>sim.snapshot().players,active:()=>status==='running'&&['relay','extract'].includes(phase)&&Date.now()<meta.expiresAt,onBoard:id=>{inventory.get(id).disguised=false;combat.cancel(id);actions.delete(id);}});
  const rescue=createRelayRescue(record.rescue);
  const combat=createRelayCombat({meta,record:record.combat,canAttack:id=>!vehicles.mounted(id),inventory,players:()=>sim.snapshot().players,damagePlayer:(id,amount)=>rescue.canDamage(id,sim.snapshot().tick)?sim.damage(id,amount):false,geometry:()=>physical,world:()=>world,active:()=>status==='running'&&['relay','extract'].includes(phase)&&Date.now()<meta.expiresAt});
  const doors=()=>meta.doors.map(d=>({id:d.id,open:doorStates.get(d.id)??false}));
  const reviveLine=(a,b)=>!vehicles.mounted(a.id)&&!vehicles.mounted(b.id)&&traceArena({x:a.x,y:a.y+1.5,z:a.z},{x:b.x,y:b.y+.75,z:b.z},physical,world).fraction>=1;
  function snapshot(){const state=sim.snapshot(),help=rescue.snapshot(state.tick);help.down=help.down.map(d=>({...d,helpers:state.players.filter(p=>reviveReachable(p,state.players.find(p=>p.id===d.actorId),reviveLine)).map(p=>p.id)}));return {...state,vehicles:vehicles.snapshot(),rescue:help,combat:combat.snapshot(),missionId:meta.id,phase,hold,status,doorRevision,doors:doors(),inventories:inventories(),supplies:supplies(),claimedSupplies:[...claimed],remaining:Math.max(0,(meta.timeLimitTicks-state.tick)/30)};}

  function doorCommand(actorId,message){
    const previous=results.find(r=>r.actorId===actorId&&r.commandId===message.commandId);if(previous)return {...previous,duplicate:true};
    let code='INVALID',ok=false;
    const state=sim.snapshot(),actor=state.players.find(p=>p.id===actorId),door=meta.doors.find(d=>d.id===message.doorId);
    if(actor&&message.epoch===meta.id&&typeof message.commandId==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(message.commandId)&&typeof message.open==='boolean'){
      if(status!=='running'||!['relay','extract'].includes(phase)||actor.hp<=0||actor.fall||vehicles.mounted(actorId)||Date.now()>=meta.expiresAt)code='NOT_ACTIVE';
      else if(!door)code='UNKNOWN_DOOR';
      else if(Math.hypot(actor.x-door.cx,actor.z-door.cz)>4.5||Math.abs(actor.y-door.floor)>2)code='TOO_FAR';
      else if(doorStates.get(door.id)===message.open){ok=true;code='UNCHANGED';}
      else if(state.tick-(cooldowns.get(actorId)??-Infinity)<18)code='COOLDOWN';
      else{
        const wall=physical.walls[door.wallIndex],occupied=!message.open&&(vehicles.snapshot().some(v=>v.x>wall.x0-1.8&&v.x<wall.x1+1.8&&v.z>wall.z0-1.8&&v.z<wall.z1+1.8&&v.y+2>wall.y0&&v.y<wall.y1)||state.players.some(p=>p.x>wall.x0-.8&&p.x<wall.x1+.8&&p.z>wall.z0-.8&&p.z<wall.z1+.8&&p.y+3.1>wall.y0&&p.y+.15<wall.y1));
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
    if(status!=='running'||Date.now()>=meta.expiresAt||sim.snapshot().players.find(p=>p.id===id)?.hp<=0||!['relay','extract'].includes(phase)||message.epoch!==meta.id||typeof message.interact!=='boolean'||!validatePlayerInput(message.input)||!sim.accept(id,message))return false;
    vehicles.accept(id,message.input,sim.snapshot().tick);
    actions.set(id,{interact:message.interact&&!vehicles.mounted(id),tick:sim.snapshot().tick});return true;
  }
  function step(){
    if(status!=='running'||!['relay','extract'].includes(phase))return snapshot();
    const before=sim.snapshot();vehicles.step(before.tick+1);const state=sim.step(),near=(p,q)=>p.hp>0&&!p.fall&&!vehicles.mounted(p.id)&&distance(p,q)<=3.2&&Math.abs(p.y-q.y)<2;
    if(state.tick>=meta.timeLimitTicks){phase='failed';hold=0;combat.finish();return snapshot();}
    // All contacts in a tick compete by first intersection time; exact ties use roster order.
    for(const supply of supplies()){
      if(supply.blockedOwner){const owner=state.players.find(p=>p.id===supply.blockedOwner);if(!owner||distance(owner,supply)>1.8||Math.abs(owner.y-supply.y)>2){delete loose.get(supply.id).blockedOwner;delete supply.blockedOwner;}}
      const candidates=state.players.flatMap((p,index)=>{
        const bag=inventory.get(p.id);if(p.hp<=0||p.fall||p.swimming||vehicles.mounted(p.id)||p.id===supply.blockedOwner||bag[supply.item]+supply.amount>capacities[supply.item])return [];
        const previous=before.players.find(a=>a.id===p.id),t=firstSupplyContact(previous,p,supply);if(t===null)return [];
        const contact={...p,x:previous.x+(p.x-previous.x)*t,z:previous.z+(p.z-previous.z)*t,y:previous.y+(p.y-previous.y)*t};
        // Body sweep blocks collecting through a closed door or thin wall.
        let from=contact;const count=Math.max(1,Math.ceil(distance(contact,supply)/.25));
        for(let k=1;k<=count;k++){const q={...contact,x:contact.x+(supply.x-contact.x)*k/count,z:contact.z+(supply.z-contact.z)*k/count},resolved=world.resolveBody(from,q);if(distance(q,resolved)>1e-5)return [];from=q;}
        return [{p,index,t}];
      }).sort((a,b)=>a.t-b.t||a.index-b.index);
      if(candidates.length){inventory.get(candidates[0].p.id)[supply.item]+=supply.amount;if(loose.has(supply.id))loose.delete(supply.id);else claimed.add(supply.id);}
    }
    combat.step(state.tick);state.players=sim.snapshot().players;
    const helping=rescue.step({before:before.players,players:state.players,tick:state.tick,actions,
      clearLine:reviveLine,
      hasMedkit:id=>inventory.get(id)?.medkits>0,revive:(id,health,helper)=>{const bag=inventory.get(helper);if(!bag||!(bag.medkits>0)||!sim.revive(id,health))return false;bag.medkits--;return true;},onDown:id=>{inventory.get(id).disguised=false;actions.delete(id);}});
    if(helping.hadDown){hold=0;if(helping.revivedId)actions.delete(helping.revivedId);if(helping.failed){phase='failed';combat.finish();}return snapshot();}

    if(phase==='relay'){
      const both=meta.members.every((m,i)=>{const p=state.players.find(p=>p.id===m.id),a=actions.get(m.id);return a?.interact&&state.tick-a.tick<=8&&near(p,meta.terminals[i]);});
      hold=both?hold+1:0;if(hold>=90){phase='extract';hold=0;}
    }else{hold=state.players.every(p=>near(p,meta.extraction))?hold+1:0;if(hold>=60){phase='won';hold=60;}}
    if(phase==='won')combat.finish();
    return snapshot();
  }
  return {meta,geometry:canonical,accept,step,snapshot,vehicleCommand(actorId,message){const r=vehicles.command(actorId,message);if(r.exit){sim.place(actorId,r.exit);delete r.exit;}else if(r.ok&&r.code==='ENTERED'&&!r.duplicate){const p=sim.snapshot().players.find(p=>p.id===actorId);sim.place(actorId,vehicles.position(p));}return r;},doorCommand,inventoryCommand,combatCommand(actorId,message){return combat.command(actorId,message,sim.snapshot().tick);},setStatus(value){status=value;if(value!=='running'){actions.clear();sim.clearInputs();vehicles.pause();combat.pause();rescue.pause();if(['relay','extract'].includes(phase))hold=0;}},
    checkpoint(nextAlarm){return {meta:structuredClone(meta),phase,hold,status,checkpoint:sim.snapshot(),rescue:rescue.checkpoint(),vehicles:vehicles.checkpoint(),combat:combat.checkpoint(),nextAlarm,inventories:inventories(),droppedSupplies:[...loose.values()].map(s=>({...s})),dropSequence,claimedSupplies:[...claimed],inventoryResults:structuredClone(inventoryResults),doors:doors(),doorRevision,doorCooldowns:[...cooldowns].map(([actorId,tick])=>({actorId,tick})),commandResults:structuredClone(results)};},
    setup(self){return {type:'mission',self,meta:structuredClone(meta),geometry:world.snapshot(),state:snapshot()};}};
}
