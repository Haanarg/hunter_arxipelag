import {CONFIG,SOLDIER,soldierView,recognizeSoldier,heardPosition} from '../src/enemy-perception-core.mjs';
// Per-actor observations prevent one player's suspicion from identifying the other.
// This adapter supplies canonical positions/LOS to the original pure perception rules.
export function senseNativeSoldier(unit,{players,inventory,mounted,world,visibleAim,tick}){
 const previouslyVisible=!!unit.canSee;
 unit.nextSenseTick??=unit.sensePhaseTicks||0;
 if(tick>=unit.nextSenseTick){
  unit.nextSenseTick=tick+Math.round(SOLDIER.senseSeconds*30);unit.observations??={};
  const contacts=[];const observer={x:unit.x,y:unit.y,z:unit.z,heading:unit.heading||0,elite:!!unit.elite},guardLevel=world.locomotionAt(unit.x,unit.z,unit.y);
  for(const actor of players){
   const observation=unit.observations[actor.id]??={recognition:0,confirmed:false},vehicle=mounted(actor.id),crouched=!!actor.crouched&&!vehicle,
    level=world.locomotionAt(actor.x,actor.z,actor.y),sameBasement=!!guardLevel.basement&&!!level.basement&&Math.abs(actor.y-unit.y)<4.4,
    acrossFloor=(guardLevel.basement||level.basement)&&Math.abs(actor.y-unit.y)>4.4,
    distance=Math.hypot(actor.x-unit.x,actor.z-unit.z);
   const direction=actor.hp>0&&!acrossFloor&&soldierView(observer,actor,{crouched,disguised:!!inventory.get(actor.id)?.disguised,inVehicle:!!vehicle,sameBasement}),
    aim=direction?visibleAim(unit,actor,{vehicle,crouched}):null,raw=!!aim;
   observation.recognition=recognizeSoldier(observation.recognition,raw,distance,crouched);
   observation.confirmed=raw&&observation.recognition>=.45;
   if(raw)contacts.push({actor,distance,aim,confirmed:observation.confirmed});
  }
  const confirmed=contacts.filter(c=>c.confirmed).sort((a,b)=>a.distance-b.distance||a.actor.id.localeCompare(b.actor.id)),
   selected=confirmed.find(c=>c.actor.id===unit.focus)||confirmed[0];
  unit.canSee=!!selected;
  if(selected){unit.focus=selected.actor.id;unit.lastSeenTick=tick;unit.lastKnown={x:selected.actor.x,y:selected.actor.y,z:selected.actor.z};unit.state='attack';unit.aim=selected.aim;}
  else{
   unit.aim=null;
   if(contacts.length){const contact=contacts.sort((a,b)=>a.distance-b.distance||a.actor.id.localeCompare(b.actor.id))[0];unit.state='suspicious';unit.lastKnown={x:contact.actor.x,y:contact.actor.y,z:contact.actor.z};unit.investigateUntil=tick+CONFIG.investigateSeconds*30;}
   else if(unit.lastKnown&&(tick-(unit.lastSeenTick??-Infinity)<SOLDIER.memorySeconds*30||tick<(unit.investigateUntil??0)))unit.state='search';
   else{unit.state='patrol';unit.focus=null;}
  }
 }
 if(unit.canSee){const actor=players.find(p=>p.id===unit.focus&&p.hp>0);if(actor)return {actor,acquired:!previouslyVisible};unit.canSee=false;unit.state='search';}
 if(unit.state==='search'&&unit.lastKnown){const center=Math.atan2(unit.x-unit.lastKnown.x,unit.z-unit.lastKnown.z);unit.heading=center+Math.sin((tick-(unit.lastSeenTick??tick))/270*Math.PI*2)*Math.PI/3;}
 return null;
}

export function hearNativeSoldier(unit,noise,tick){
 if(unit.hp<=0||unit.canSee||Math.hypot(unit.x-noise.x,unit.z-noise.z)>noise.radius)return false;
 unit.lastKnown=heardPosition(unit,noise);unit.state='search';
 unit.investigateUntil=tick+Math.ceil((CONFIG.investigateSeconds+Math.hypot(unit.x-noise.x,unit.z-noise.z)/Math.max(1,(unit.sp??7)*.65))*30);
 unit.heading=Math.atan2(unit.x-unit.lastKnown.x,unit.z-unit.lastKnown.z);return true;
}
