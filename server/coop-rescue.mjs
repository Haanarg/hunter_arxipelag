// Downed actors and revive timers use authoritative simulation ticks only.
export const BLEED_TICKS=900,REVIVE_TICKS=90,REVIVE_HEALTH=8,REVIVE_IMMUNITY=90;
export function reviveReachable(helper,target,clearLine){return !!(helper&&target&&helper.id!==target.id&&helper.hp>0&&target.hp<=0&&!helper.fall&&!helper.swimming&&!target.fall&&!target.swimming&&Math.hypot(helper.x-target.x,helper.z-target.z)<=3.2&&Math.abs(helper.y-target.y)<2&&clearLine(helper,target));}
export function createRelayRescue(record={}){
 const down=new Map((record.down||[]).map(d=>[d.actorId,structuredClone(d)])),immunity=new Map(record.immunity||[]);
 function observe(players,tick,onDown=()=>{}){for(const p of players){if(p.hp<=0&&!down.has(p.id)){down.set(p.id,{actorId:p.id,expiresAtTick:tick+BLEED_TICKS,progress:0,helperId:null});immunity.delete(p.id);onDown(p.id);}else if(p.hp>0)down.delete(p.id);}for(const [id,until]of immunity)if(tick>=until)immunity.delete(id);}
 function step({before,players,tick,actions,clearLine,hasMedkit,revive,onDown}){
  observe(players,tick,onDown);
  if(!down.size)return {failed:false,hadDown:false};
  if(players.every(p=>p.hp<=0)||[...down.values()].some(d=>tick>=d.expiresAtTick))return {failed:true,hadDown:true};
  for(const d of down.values()){
   const target=players.find(p=>p.id===d.actorId),helper=players.find(p=>p.id!==d.actorId&&p.hp>0),previous=before.find(p=>p.id===helper?.id),input=actions.get(helper?.id);
   const valid=previous&&hasMedkit(helper.id)&&helper.hp>=previous.hp&&input?.interact&&tick-input.tick<=8&&Math.hypot(helper.x-previous.x,helper.z-previous.z)<=.08&&reviveReachable(helper,target,clearLine);
   if(!valid){d.progress=0;d.helperId=null;continue;}
   if(d.helperId!==helper.id)d.progress=0;d.helperId=helper.id;d.progress++;
   if(d.progress>=REVIVE_TICKS&&revive(target.id,REVIVE_HEALTH,helper.id)){down.delete(target.id);immunity.set(target.id,tick+REVIVE_IMMUNITY);return {failed:false,hadDown:true,revivedId:target.id};}
  }return {failed:false,hadDown:true};
 }
 return {observe,step,canDamage:(id,tick)=>tick>=(immunity.get(id)??-Infinity),pause(){for(const d of down.values()){d.progress=0;d.helperId=null;}},snapshot(tick){return {down:[...down.values()].map(d=>({...d,remaining:Math.max(0,(d.expiresAtTick-tick)/30)})),immune:[...immunity].map(([actorId,untilTick])=>({actorId,untilTick}))};},checkpoint(){return {down:structuredClone([...down.values()]),immunity:[...immunity]};}};
}
