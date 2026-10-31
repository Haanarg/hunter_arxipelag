import {configureOpenWorld} from './coop-open-world.mjs';
import {configureProvingGround} from './coop-proving-ground.mjs';
import {personalWeapons,inventoryCaps,nearestWire} from '../src/weapon-catalog.mjs';
import {createCoopTerrain} from './coop-terrain.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
import {createCanonicalWater} from '../src/canonical-water.mjs';
import {createPlayerSimulation,validatePlayerInput,damageHealth} from '../src/player-simulation.mjs';
import {combatBalance,explosionDamage,closestFenceBlastPoint,wallBlastDamage,roofBlastDamage,countDestroyedSupport} from '../src/combat-rules.mjs';
import {firstSupplyContact} from './coop-inventory.mjs';
import {createRelayVehicles,vehicleClear} from './coop-vehicles.mjs';
import {resolveCoopPlayerVehicleContact} from '../src/coop-vehicle-contacts-core.mjs';
import {createRelayRescue,reviveReachable} from './coop-rescue.mjs';
import {createRelayCombat,traceArena} from './coop-combat.mjs';
import {createNativeOptionals} from './coop-optionals.mjs';
import {createNativeFauna} from './coop-fauna.mjs';
import {GAME_VERSION} from '../src/version.mjs';
import {COOP_CHEAT_KEYS,normalizeCoopCheats,grantCoopCheatItems,moveCoopCheatFly} from '../src/coop-cheats.mjs';
export const MISSION_VERSION='relay:22';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function generateRelayMission(room,{mode='relay'}={}){
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
    actors=room.members.map((m,i)=>({id:m.id,...point(i?second:start),hd:0,hp:combatBalance.player}));
  const parking=reachable.filter(p=>distance(p,start)>6&&distance(p,start)<20&&actors.every(a=>distance(a,p)>4)&&vehicleClear(p,world,bounds)).sort((a,b)=>distance(a,start)-distance(b,start))[0];
  if(!parking)throw new Error('No hi ha aparcament segur per al jeep. Prova una altra llavor.');
  meta.vehicles=[{id:'jeep-1',kind:'jeep',t:'cotxe',...point(parking),hd:0,v:0,seats:[null,null]}];
  meta.targets=[first,other].map((p,i)=>{const q=parents.get(p);return {id:'target-'+i,...point(q),hp:12,ai:true,heading:Math.atan2(-((parents.get(q)||p).x-q.x),-((parents.get(q)||p).z-q.z)),state:'patrol',patrol:[point(q),point(parents.get(q)||p)],patrolIndex:1,lastAttack:-90,seenTicks:0};});
  meta.supplies=[first,other].flatMap((p,i)=>['bullets','grenades','disguise','medkits'].map((item,j)=>({id:`supply-${i}-${j}`,item,amount:item==='bullets'?12:1,...point(p)})));
  meta.doors=foundation.baseStructures.walls.flatMap((w,wallIndex)=>w.door&&!w.locked&&!w.alwaysOpen?[{id:w.id,wallIndex,cx:w.cx,cz:w.cz,floor:w.y0+1}]:[]);
  const generated={geometry:{...world.snapshot(),...structuredClone(foundation.baseStructures)},record:{meta,phase:'relay',hold:0,status:'paused',checkpoint:{protocol:1,epoch:id,tick:0,players:actors.map(a=>({...a,acknowledged:0,fall:null,swimming:false}))},nextAlarm:Date.now()+100}};
  return mode==='world'?configureOpenWorld(generated):mode==='proving'?configureProvingGround(generated):generated;
}
export function restoreRelayMission(record,geometry){
  if(record?.meta?.generator!==MISSION_VERSION||record.meta.gameVersion!==GAME_VERSION)throw new Error('La missió és d’una versió anterior. Torneu a iniciar-la.');
  const cheats=normalizeCoopCheats(record.cheats);
  const meta=structuredClone(record.meta),canonical=structuredClone(geometry),physical=structuredClone(geometry),b=meta.bounds,
    doorStates=new Map((record.doors||meta.doors.map(d=>({id:d.id,open:false}))).map(d=>[d.id,!!d.open])),
    cooldowns=new Map((record.doorCooldowns||[]).map(c=>[c.actorId,c.tick])),results=structuredClone(record.commandResults||[]);
  for(const d of meta.doors)physical.walls[d.wallIndex].open=doorStates.get(d.id)??false;
  const removedWalls=new Set(record.removedWalls||[]);for(const i of removedWalls)if(physical.walls[i])physical.walls[i].open=true;
  const wallHealth=new Map(record.wallHealth||[]),roofHealth=new Map(record.roofHealth||[]),removedRoofs=new Set(record.removedRoofs||[]),brokenWindows=new Set(record.brokenWindows||[]);
  for(const [i,hp] of wallHealth)if(physical.walls[i])physical.walls[i].hp=hp;
  for(const [i,hp] of roofHealth)if(physical.buildings[i])physical.buildings[i].rhp=hp;
  function collapseRoof(index){const building=physical.buildings[index];building.rb=true;building.rhp=0;removedRoofs.add(index);roofHealth.set(index,0);
    if(building.interiorStair)building.interiorStair.destroyed=true;
    physical.walls.forEach((wall,i)=>{if(wall.internalStair&&wall.buildingId===building.id){wall.open=true;wall.hp=0;removedWalls.add(i);wallHealth.set(i,0);}});
    for(const stair of physical.stairs)if(stair.internal&&stair.buildingId===building.id)stair.destroyed=true;
  }
  for(const i of removedRoofs)if(physical.buildings[i])collapseRoof(i);
  // Reconstruct support counters from confirmed destroyed walls after restoring.
  physical.walls.forEach((wall,i)=>{if(removedWalls.has(i)){wall.hp=0;const index=physical.buildings.findIndex(b=>b.id&&b.id===wall.buildingId);if(index>=0&&countDestroyedSupport(physical.buildings[index],wall))collapseRoof(index);}});
  const palmHealth=new Map(record.palmHealth||[]);
  function buildWorld(){const next=createStaticWorldAdapter(physical);next.setPalmHealth(palmHealth);return next;}
  let world=buildWorld();
  function damagePalm(tree,amount){
    const index=world.palmId(tree);if(index===undefined||!Number.isFinite(amount)||amount<=0)return false;
    const hp=palmHealth.get(index)??8;if(hp<=0)return false;
    palmHealth.set(index,damageHealth(hp,amount));world.setPalmHealth(palmHealth);return true;
  }
  function blastPalms(center,damage,radius){
    for(const tree of world.palms()){
      const amount=explosionDamage(damage,Math.hypot(tree.x-center.x,tree.z-center.z),radius);
      if(amount&&traceArena(center,{x:tree.x,y:tree.y+2,z:tree.z},physical,world,{ignoreVegetation:true}).fraction>=1)damagePalm(tree,amount);
    }
  }

  function destroyWall(index){
    const wall=physical.walls[index];if(!wall||removedWalls.has(index))return false;
    const assembly=wall.woodenDoor?[index]:wall.assemblyIds?physical.walls.flatMap((w,i)=>wall.assemblyIds.includes(w.id)?[i]:[]):[index];
      for(const i of assembly){if(removedWalls.has(i))continue;const part=physical.walls[i];part.hp=0;part.open=true;part.playerBlock=false;removedWalls.add(i);wallHealth.set(i,0);
        const owner=physical.buildings.findIndex(b=>b.id&&b.id===part.buildingId);if(owner>=0&&countDestroyedSupport(physical.buildings[owner],part))collapseRoof(owner);
      }
    return true;
  }
  function breakWindow(index,paneIndex){
    const w=physical.walls[index];if(!w?.windowPanes?.[paneIndex]||removedWalls.has(index))return false;
    const id=index+':'+paneIndex;if(brokenWindows.has(id))return false;
    brokenWindows.add(id);return true;
  }
  function damageWall(index,damage){
    const w=physical.walls[index],radioPanel=meta.optional?.radio?.some(r=>r.colliderIndex===index);
    if(!w||!(w.woodenDoor||radioPanel)||w.open||removedWalls.has(index)||!(damage>0))return false;
    w.hp=Math.max(0,Math.ceil(w.hp)-Math.ceil(damage));wallHealth.set(index,w.hp);
    if(w.hp===0){destroyWall(index);world=buildWorld();}
    return true;
  }
  function ramWall(wall){const index=physical.walls.indexOf(wall);if(index<0||!destroyWall(index))return false;world=buildWorld();return true;}
  function blastStructures(center,damage,radius){
    let changed=false;
    for(const [index,wall] of physical.walls.entries()){
      if(wall.barbed)continue;
      const dealt=wallBlastDamage(wall,center.x,center.y,center.z,radius,damage);if(!dealt)continue;
      wall.hp=Math.max(0,Math.ceil(wall.hp)-dealt);wallHealth.set(index,wall.hp);if(wall.hp>0)continue;
      changed=destroyWall(index)||changed;
    }
    for(const [index,building] of physical.buildings.entries()){
      const dealt=roofBlastDamage(building,center.x,center.z,radius,damage);if(!dealt)continue;
      building.rhp=Math.max(0,building.rhp-dealt);roofHealth.set(index,building.rhp);if(building.rhp<=0){collapseRoof(index);changed=true;}
    }
    if(changed)world=buildWorld();
  }
  function cutWire(p){const wall=nearestWire(p,physical.walls);if(!wall)return false;wall.open=true;wall.hp=0;removedWalls.add(physical.walls.indexOf(wall));world=buildWorld();return true;}
  function blastWire(center,damage,radius){
    // Evaluate all candidates against the same geometry before opening any gaps.
    const destroyed=[];
    for(const [index,wall] of physical.walls.entries())if(wall.barbed&&!wall.open){
      const point=closestFenceBlastPoint(wall,center.x,center.y,center.z);
      if(point.distance>=radius||damage<=0)continue;
      if(traceArena(center,point,physical,world,{ignoreBarbed:true}).fraction<1)continue;
      destroyed.push(index);
    }
    for(const index of destroyed){physical.walls[index].open=true;physical.walls[index].hp=0;removedWalls.add(index);}
    if(destroyed.length)world=buildWorld();
  }
  // Inèrcia de l'actor quan salta d'un vehicle en marxa (15 ticks).
  const exitImpulses=new Map(record.exitImpulses||[]);
  function carryExitMomentum(actor,input){
    const impulse=exitImpulses.get(actor.id);
    if(!impulse||actor.hp<=0||actor.fall){exitImpulses.delete(actor.id);return null;}
    const speed=impulse.ticks/15,dx=impulse.vx*speed/30,dz=impulse.vz*speed/30;
    const controlX=(-Math.sin(actor.hd)*(input.forward||0)+Math.cos(actor.hd)*(input.strafe||0))*12/30;
    const controlZ=(-Math.cos(actor.hd)*(input.forward||0)-Math.sin(actor.hd)*(input.strafe||0))*12/30;
    const next=bounded.resolveBody(actor,{...actor,x:actor.x+dx+controlX,z:actor.z+dz+controlZ,hd:actor.hd+(input.turn||0)*2.2/30});
    const support=world.locomotionAt(next.x,next.z,actor.y);
    if(support.drop||support.floor<-.5){exitImpulses.delete(actor.id);return null;}
    if(--impulse.ticks<=0)exitImpulses.delete(actor.id);
    return {...next,y:support.floor+.06,hp:actor.hp,swimming:false,fall:null};
  }
  const water=createCanonicalWater((x,z)=>world.heightAt(x,z)),
    bounded={locomotionAt:(...args)=>world.locomotionAt(...args),roofLanding:(...args)=>world.roofLanding(...args),resolveBody(previous,candidate){const p=world.resolveBody(previous,{...candidate,x:clamp(candidate.x,b.x0,b.x1),z:clamp(candidate.z,b.z0,b.z1)}),hit=resolveCoopPlayerVehicleContact(previous,p,vehicles.live(),previous.id);return {...hit,x:clamp(hit.x,b.x0,b.x1),z:clamp(hit.z,b.z0,b.z1)};}},
    sim=createPlayerSimulation({epoch:meta.id,limit:world.limit,world:bounded,
      vertical:{surfaceAt:water.surfaceAt,maxHealth:combatBalance.player},
      checkpoint:record.checkpoint,immune:()=>cheats.immune,
      movement:(actor,input)=>vehicles.position(actor)||carryExitMomentum(actor,input)||
        (cheats.fly?moveCoopCheatFly(actor,input,{limit:world.limit,heightAt:(x,z)=>world.heightAt(x,z)}):null)}),actions=new Map();
  let phase=record.phase,hold=record.hold,status=record.status,doorRevision=record.doorRevision??0;
  const inventory=new Map(meta.members.map(m=>[m.id,{actorId:m.id,bullets:24,grenades:2,disguise:1,medkits:1,assault:1,sniper:0,sniperAmmo:0,bazooka:0,c4:0,cutters:0,parachute:0,weapon:'pistol',disguised:false,...structuredClone(record.inventories?.find(i=>i.actorId===m.id)||{})}])),claimed=new Set(record.claimedSupplies||[]),inventoryResults=structuredClone(record.inventoryResults||[]);
  const loose=new Map((record.droppedSupplies||[]).map(s=>[s.id,structuredClone(s)]));let dropSequence=record.dropSequence||0;
  const capacities=meta.mode==='native'?Object.fromEntries(Object.keys(inventoryCaps).map(k=>[k,1000000])):inventoryCaps;
  const supplies=()=>[...meta.supplies.filter(s=>!claimed.has(s.id)),...loose.values()].map(s=>({...s}));
  const inventories=()=>[...inventory.values()].map(i=>({...i}));
  function refillCheats(){
    if(!cheats.items)return;
    for(const bag of inventory.values())grantCoopCheatItems(bag);
    for(const vehicle of vehicles.live())
      if(Number.isFinite(vehicle.rockets))vehicle.rockets=Math.max(9999,vehicle.rockets);
  }
  function cheatCommand(actorId,key,enabled){
    if(meta.mode!=='native'||meta.members[0]?.id!==actorId||
      status!=='running'||!COOP_CHEAT_KEYS.includes(key)||
      typeof enabled!=='boolean')return {ok:false,code:'HOST_ONLY'};
    cheats[key]=enabled;refillCheats();
    return {ok:true,code:'CHEAT_UPDATED',cheat:key,enabled};
  }
  function inventoryCommand(actorId,message){
    const cached=inventoryResults.find(r=>r.actorId===actorId&&r.commandId===message.commandId);if(cached)return {...cached,duplicate:true};
    const actor=sim.snapshot().players.find(p=>p.id===actorId),bag=inventory.get(actorId);let code='INVALID',ok=false;
    if(actor&&message.epoch===meta.id&&typeof message.commandId==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(message.commandId)){
      if(status!=='running'||!['relay','extract'].includes(phase)||actor.hp<=0||actor.fall||actor.swimming||Date.now()>=meta.expiresAt)code='NOT_ACTIVE';
      else if(vehicles.mounted(actorId))code='SEATED';
      else if(message.operation==='use'&&message.target==='medkits'){if(!bag.medkits||!sim.heal(actorId,combatBalance.medkit))code='EMPTY';else{bag.medkits--;ok=true;code='HEALED';}}
      else if(message.operation==='weapon'&&personalWeapons.includes(message.target)){if(!['pistol','knife'].includes(message.target)&&!bag[message.target])code='EMPTY';else{bag.weapon=message.target;combat.cancel(actorId);ok=true;code='SELECTED';}}
      else if(message.operation==='disguise'&&typeof message.target==='boolean'){
        if(!bag.disguise)code='EMPTY';else{bag.disguised=message.target;ok=true;code='EQUIPPED';}
      }else if(message.operation==='drop'&&Object.hasOwn(capacities,message.target)){
        const item=message.target,amount=Math.min(bag[item],item==='bullets'?12:1);
        if(!amount)code='EMPTY';else if(loose.size>=128)code='GROUND_FULL';
        else{const supply={id:`drop-${++dropSequence}`,item,amount,x:actor.x,y:actor.y,z:actor.z,blockedOwner:actorId};loose.set(supply.id,supply);bag[item]-=amount;if(item==='disguise')bag.disguised=false;if(item===bag.weapon&&!bag[item]||item==='sniperAmmo'&&bag.weapon==='sniper'&&!bag.sniperAmmo){bag.weapon='pistol';combat.cancel(actorId);}ok=true;code='DROPPED';}
      }

      const result={actorId,commandId:message.commandId,ok,code};inventoryResults.push(result);if(inventoryResults.length>64)inventoryResults.shift();return {...result};
    }return {actorId,commandId:message.commandId,ok,code};
  }
  const vehicles=createRelayVehicles({onBarrier:ramWall,onPalm:tree=>damagePalm(tree,8),geometry:()=>physical,onImpact:(id,amount,tick)=>combat.impactVehicle(id,amount,tick),onTravel:(v,from,tick)=>combat.runover(v,from,tick),meta,record:record.vehicles,world:()=>world,water,players:()=>sim.snapshot().players,active:()=>status==='running'&&['relay','extract'].includes(phase)&&Date.now()<meta.expiresAt,hasParachute:id=>(inventory.get(id)?.parachute||0)>0,onBoard:id=>{inventory.get(id).disguised=false;combat.cancel(id);actions.delete(id);}});
  const rescue=createRelayRescue(record.rescue);
  const fauna=createNativeFauna({meta,record:record.fauna,
    players:()=>sim.snapshot().players,world:()=>world,vehicles,
    damagePlayer:(id,dmg)=>cheats.immune?false:sim.damage(id,dmg),
    active:()=>status==='running'&&['relay','extract'].includes(phase)&&Date.now()<meta.expiresAt});
  const optionals=createNativeOptionals({meta,record:record.optionals,
    world:()=>world,geometry:()=>physical,players:()=>sim.snapshot().players,vehicles,
    canSee:(from,to,ignoreWall=null)=>traceArena(from,to,physical,world,
      {wallCandidates:ignoreWall==null?null:physical.walls.map((_,i)=>i).filter(i=>i!==ignoreWall),
       ignoreBarbed:true,ignoreVegetation:true}).fraction>=.999,
    active:()=>status==='running'&&['relay','extract'].includes(phase)&&Date.now()<meta.expiresAt});
  // Un soldat pot obrir una porta de fusta practicable si el camí
  // al darrer contacte passa pel seu llindar; tots dos jugadors veuen
  // la mateixa porta oberta. Cap porta bloquejada no s'obre sola.
  function enemyOpenDoor(unit,goal){
    if(meta.mode!=='native'||!goal)return false;
    const dx=goal.x-unit.x,dz=goal.z-unit.z,len2=dx*dx+dz*dz;
    if(len2<.01)return false;
    const choice=meta.doors.filter(d=>!doorStates.get(d.id)&&!removedWalls.has(d.wallIndex))
      .map(d=>{
        const distance=Math.hypot(unit.x-d.cx,unit.z-d.cz),
          projection=Math.max(0,Math.min(1,((d.cx-unit.x)*dx+(d.cz-unit.z)*dz)/len2)),
          corridor=Math.hypot(unit.x+dx*projection-d.cx,unit.z+dz*projection-d.cz);
        return {d,distance,corridor,projection};
      })
      .filter(c=>c.distance<4.6&&c.corridor<1.75&&c.projection<.85)
      .sort((a,b)=>a.distance-b.distance)[0];
    if(!choice)return false;
    const d=choice.d,wall=physical.walls[d.wallIndex];
    if(!wall||wall.locked||wall.alwaysOpen||wall.open)return false;
    // Un jugador que passa pel llindar impedeix que la IA li tanqui
    // la porta, però obrir-la no suposa cap perill de col·lisió.
    physical.walls[d.wallIndex]={...wall,open:true};
    doorStates.set(d.id,true);world=buildWorld();doorRevision++;
    return true;
  }
  const combat=createRelayCombat({openEnemyDoor:enemyOpenDoor,
    onEnemyAlert:(unit,actor,tick,targets)=>optionals.warn(unit,actor,tick,targets),
    civilianTargets:()=>optionals.civilians(),damageCivilian:(id,dmg,tick)=>optionals.damage(id,dmg,tick),
    meta,record:record.combat,vehicles,waterSurface:(x,z,time)=>water.surfaceAt(x,z,time),cutWire,blastWire,blastStructures,damagePalm,blastPalms,breakWindow,damageWall,windowAvailable:(index,paneIndex)=>!brokenWindows.has(index+':'+paneIndex),
    canAttack:()=>true,inventory,players:()=>sim.snapshot().players,
    visiblePlayers:()=>cheats.invisible?[]:sim.snapshot().players,
    damagePlayer:(id,amount)=>cheats.immune?false:
      rescue.canDamage(id,sim.snapshot().tick)?sim.damage(id,amount):false,geometry:()=>physical,world:()=>world,active:()=>status==='running'&&['relay','extract'].includes(phase)&&Date.now()<meta.expiresAt});
  const doors=()=>meta.doors.map(d=>({id:d.id,open:removedWalls.has(d.wallIndex)||(doorStates.get(d.id)??false),destroyed:removedWalls.has(d.wallIndex)}));
  const reviveLine=(a,b)=>!vehicles.mounted(a.id)&&!vehicles.mounted(b.id)&&traceArena({x:a.x,y:a.y+1.5,z:a.z},{x:b.x,y:b.y+.75,z:b.z},physical,world).fraction>=1;
  function snapshot(){const state=sim.snapshot(),help=rescue.snapshot(state.tick);help.down=help.down.map(d=>({...d,helpers:state.players.filter(p=>reviveReachable(p,state.players.find(p=>p.id===d.actorId),reviveLine)).map(p=>p.id)}));return {...state,removedWalls:[...removedWalls],removedRoofs:[...removedRoofs],brokenWindows:[...brokenWindows],palmHealth:[...palmHealth],vehicles:vehicles.snapshot(),rescue:help,combat:combat.snapshot(),...(meta.mode==='native'&&meta.optional?{optionals:optionals.snapshot()}:{}),...(meta.mode==='native'&&meta.sharks?{fauna:fauna.snapshot()}:{}),missionId:meta.id,phase,hold,status,doorRevision,doors:doors(),inventories:inventories(),supplies:supplies(),claimedSupplies:[...claimed],cheats:{...cheats},remaining:Math.max(0,(meta.timeLimitTicks-state.tick)/30)};}

  function doorCommand(actorId,message){
    const previous=results.find(r=>r.actorId===actorId&&r.commandId===message.commandId);if(previous)return {...previous,duplicate:true};
    let code='INVALID',ok=false;
    const state=sim.snapshot(),actor=state.players.find(p=>p.id===actorId),door=meta.doors.find(d=>d.id===message.doorId);
    if(actor&&message.epoch===meta.id&&typeof message.commandId==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(message.commandId)&&typeof message.open==='boolean'){
      if(status!=='running'||!['relay','extract'].includes(phase)||actor.hp<=0||actor.fall||vehicles.mounted(actorId)||Date.now()>=meta.expiresAt)code='NOT_ACTIVE';
      else if(!door)code='UNKNOWN_DOOR';
      else if(removedWalls.has(door.wallIndex))code='DESTROYED';
      else if(Math.hypot(actor.x-door.cx,actor.z-door.cz)>4.5||Math.abs(actor.y-door.floor)>2)code='TOO_FAR';
      else if(doorStates.get(door.id)===message.open){ok=true;code='UNCHANGED';}
      else if(state.tick-(cooldowns.get(actorId)??-Infinity)<18)code='COOLDOWN';
      else{
        const wall=physical.walls[door.wallIndex],occupied=!message.open&&(vehicles.live().some(v=>v.x>wall.x0-1.8&&v.x<wall.x1+1.8&&v.z>wall.z0-1.8&&v.z<wall.z1+1.8&&v.y+2>wall.y0&&v.y<wall.y1)||state.players.some(p=>p.x>wall.x0-.8&&p.x<wall.x1+.8&&p.z>wall.z0-.8&&p.z<wall.z1+.8&&p.y+3.1>wall.y0&&p.y+.15<wall.y1));
        if(occupied)code='OCCUPIED';
        else{
          const updated={...physical,walls:physical.walls.map((w,i)=>i===door.wallIndex?{...w,open:message.open}:w)},next=createStaticWorldAdapter(updated);
          next.setPalmHealth(palmHealth);physical.walls=updated.walls;world=next;doorStates.set(door.id,message.open);cooldowns.set(actorId,state.tick);doorRevision++;ok=true;code=message.open?'OPENED':'CLOSED';
        }
      }
    }
    const result={actorId,commandId:message.commandId,doorId:message.doorId,ok,code,revision:doorRevision};
    if(actor&&typeof message.commandId==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(message.commandId)){results.push(result);if(results.length>32)results.shift();}
    return {...result};
  }
  function accept(id,message){
    if(status!=='running'||Date.now()>=meta.expiresAt||!sim.snapshot().players.some(p=>p.id===id)||!['relay','extract'].includes(phase)||message.epoch!==meta.id||typeof message.interact!=='boolean'||!validatePlayerInput(message.input)||!sim.accept(id,message))return false;
    const living=sim.snapshot().players.find(p=>p.id===id)?.hp>0;
    if(living)vehicles.accept(id,message.input,sim.snapshot().tick);
    actions.set(id,{interact:living&&message.interact&&!vehicles.mounted(id),fire:living&&message.input.fire===true,tick:sim.snapshot().tick});return true;
  }
  function step(snapshotResult=true){
    const result=()=>snapshotResult?snapshot():undefined;
    if(status!=='running'||!['relay','extract'].includes(phase))return result();
    refillCheats();
    const before=sim.snapshot();vehicles.step(before.tick+1);const state=sim.step(),near=(p,q)=>p.hp>0&&!p.fall&&!vehicles.mounted(p.id)&&distance(p,q)<=3.2&&Math.abs(p.y-q.y)<2;
    if(state.tick>=meta.timeLimitTicks){phase='failed';hold=0;combat.finish();return result();}
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
      if(candidates.length){inventory.get(candidates[0].p.id)[supply.item]+=supply.amount;if(meta.mode==='native'&&supply.item==='sniper')inventory.get(candidates[0].p.id).sniperAmmo+=6;if(loose.has(supply.id))loose.delete(supply.id);else claimed.add(supply.id);}
    }
    if(meta.mode==='native')for(const player of state.players){const action=actions.get(player.id);if(action?.fire&&state.tick-action.tick<=8)combat.hold(player.id,state.tick);}
    combat.step(state.tick);refillCheats();state.players=sim.snapshot().players;
    optionals.step(state.tick,combat.liveTargets(),state.players);
    fauna.step(state.tick);
    const helping=rescue.step({before:before.players,players:state.players,tick:state.tick,actions,
      clearLine:reviveLine,
      hasMedkit:id=>inventory.get(id)?.medkits>0,revive:(id,health,helper)=>{const bag=inventory.get(helper);if(!bag||!(bag.medkits>0)||!sim.revive(id,health))return false;bag.medkits--;return true;},onDown:id=>{inventory.get(id).disguised=false;actions.delete(id);}});
    if(helping.hadDown){hold=0;if(helping.revivedId)actions.delete(helping.revivedId);if(helping.failed){phase='failed';combat.finish();}return result();}

    if(meta.mode==='native'&&combat.hasDeadGeneral()){phase='won';combat.finish();return result();}
    if(['proving','world','native'].includes(meta.mode))return result();
    if(phase==='relay'){
      const both=meta.members.every((m,i)=>{const p=state.players.find(p=>p.id===m.id),a=actions.get(m.id);return a?.interact&&state.tick-a.tick<=8&&near(p,meta.terminals[i]);});
      hold=both?hold+1:0;if(hold>=90){phase='extract';hold=0;}
    }else{hold=state.players.every(p=>near(p,meta.extraction))?hold+1:0;if(hold>=60){phase='won';hold=60;}}
    if(phase==='won')combat.finish();
    return result();
  }
  return {meta,geometry:canonical,accept,step,snapshot,progress:()=>({phase,status}),vehicleCommand(actorId,message){const r=vehicles.command(actorId,message);if(r.exit){const old=vehicles.snapshot().find(v=>v.id===message.vehicleId);
       if(old&&Math.abs(old.v)>3&&meta.mode==='native'){
         const forward=-Math.sin(old.hd),depth=-Math.cos(old.hd),lateral=Math.sign((r.exit.x-old.x)*Math.cos(old.hd)-(r.exit.z-old.z)*Math.sin(old.hd))||1;
         const carry=Math.sign(old.v)*Math.min(old.t==='camio'?11:28,Math.abs(old.v)*(old.t==='camio'?.3:.72));
         exitImpulses.set(actorId,{vx:forward*carry+Math.cos(old.hd)*lateral*(old.t==='camio'?8:1.4),
            vz:depth*carry-Math.sin(old.hd)*lateral*(old.t==='camio'?8:1.4),ticks:15});
       }
       if(r.exit.fall){
         // El servidor, no el navegador, inicia la caiguda 3D validada.
         sim.eject(actorId,r.exit,r.exit.fall);
         delete r.exit;
       }else{sim.place(actorId,r.exit);delete r.exit;}
       }else if(r.ok&&r.code==='ENTERED'&&!r.duplicate){exitImpulses.delete(actorId);const p=sim.snapshot().players.find(p=>p.id===actorId);sim.place(actorId,vehicles.position(p));}return r;},doorCommand,inventoryCommand,cheatCommand,
    optionalCommand(actorId,message){return optionals.command(actorId,message,sim.snapshot().tick);},
    combatCommand(actorId,message){return combat.command(actorId,message,sim.snapshot().tick);},setStatus(value){status=value;if(value!=='running'){actions.clear();sim.clearInputs();vehicles.pause();combat.pause();rescue.pause();if(['relay','extract'].includes(phase))hold=0;}},
    checkpoint(nextAlarm){return {meta:structuredClone(meta),exitImpulses:[...exitImpulses].map(([id,impulse])=>[id,{...impulse}]),wallHealth:[...wallHealth],roofHealth:[...roofHealth],removedWalls:[...removedWalls],removedRoofs:[...removedRoofs],brokenWindows:[...brokenWindows],palmHealth:[...palmHealth],phase,hold,status,checkpoint:sim.snapshot(),rescue:rescue.checkpoint(),vehicles:vehicles.checkpoint(),combat:combat.checkpoint(),...(meta.mode==='native'&&meta.optional?{optionals:optionals.checkpoint()}:{}),...(meta.mode==='native'&&meta.sharks?{fauna:fauna.checkpoint()}:{}),nextAlarm,cheats:{...cheats},inventories:inventories(),droppedSupplies:[...loose.values()].map(s=>({...s})),dropSequence,claimedSupplies:[...claimed],inventoryResults:structuredClone(inventoryResults),doors:doors(),doorRevision,doorCooldowns:[...cooldowns].map(([actorId,tick])=>({actorId,tick})),commandResults:structuredClone(results)};},
    setup(self){return {type:'mission',self,meta:structuredClone(meta),geometry:structuredClone(physical),state:snapshot()};}};
}
