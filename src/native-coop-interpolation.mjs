// Presentació remota del cooperatiu natiu. Només visual: mai física ni autoritat.
// Un interval de snapshot de retard dóna temps a interpolar entre dos estats reals.
const RATE=30,MAX_GAP_TICKS=12,TELEPORT_METRES=24;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const poseOf=o=>({
 x:o.x,y:finite(o.y)?o.y:0,z:o.z,hd:finite(o.hd)?o.hd:0,
 ...(finite(o.alt)?{alt:o.alt}:{})
});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z,(a.y||0)-(b.y||0));
const angle=(a,b,t)=>{
 let diff=(b-a+Math.PI)%(Math.PI*2);
 if(diff<0)diff+=Math.PI*2;
 return a+(diff-Math.PI)*t;
};
const lerp=(a,b,t)=>a+(b-a)*t;
function interpolate(before,after,alpha,out){
 out.x=lerp(before.x,after.x,alpha);
 out.y=lerp(before.y,after.y,alpha);
 out.z=lerp(before.z,after.z,alpha);
 out.hd=angle(before.hd,after.hd,alpha);
 if(finite(after.alt))out.alt=finite(before.alt)?lerp(before.alt,after.alt,alpha):after.alt;
 return out;
}
const poseChanged=(a,b)=>a.x!==b.x||a.z!==b.z||a.y!==b.y||a.hd!==b.hd||a.alt!==b.alt;
const safe=(a,b)=>a&&b&&finite(a.x)&&finite(a.z)&&finite(b.x)&&finite(b.z)&&
  distance(a,b)<=TELEPORT_METRES;
const occupied=(vehicles,id)=>{
 for(const vehicle of vehicles||[])
  if(vehicle.seats?.includes(id))return vehicle.id;
 return null;
};
export function createNativeCoopInterpolation(){
 let previous=null,current=null,cursor=null,self=null,vehiclePairs=[],players=new Map();
 const stats={samples:0,receives:0,teleports:0,resets:0,activeVehicles:0,clampedFrames:0};
 function reset(){
  previous=null;current=null;cursor=null;self=null;vehiclePairs=[];players.clear();
  stats.activeVehicles=0;stats.resets++;
 }
 function receive(state,localId){
  if(!state||!Number.isInteger(state.tick)){reset();return}
  const hasPrevious=current&&current.missionId===state.missionId&&
    current.status==='running'&&state.status==='running'&&
    state.tick>current.tick&&state.tick-current.tick<=MAX_GAP_TICKS&&
    localId===self;
  if(!hasPrevious){
   if(current)stats.resets++;
   previous=null;current=state;self=localId;cursor=state.tick;
   vehiclePairs=[];players.clear();stats.activeVehicles=0;stats.receives++;
   return;
  }
  previous=current;current=state;self=localId;
  // En un salt de xarxa no acumulem un retard il·limitat.
  if(cursor<previous.tick-2)cursor=previous.tick;
  const oldVehicles=new Map(previous.vehicles.map(row=>[row.id,row]));
  vehiclePairs=[];
  for(const row of state.vehicles){
   const before=oldVehicles.get(row.id);
   if(row.destroyed||!before||before.destroyed||!poseChanged(before,row))continue;
   const valid=safe(before,row);
   if(!valid){stats.teleports++;continue}
   vehiclePairs.push({id:row.id,from:poseOf(before),to:poseOf(row),pose:poseOf(before)});
  }
  const oldPlayers=new Map(previous.players.map(p=>[p.id,p]));
  players.clear();
  for(const player of state.players){
   if(player.id===self)continue;
   const before=oldPlayers.get(player.id);
   const compatible=before&&before.hp>0&&player.hp>0&&
     occupied(previous.vehicles,player.id)===occupied(state.vehicles,player.id);
   if(compatible&&safe(before,player))
     players.set(player.id,{from:poseOf(before),to:poseOf(player),pose:poseOf(before)});
   else if(before&&!safe(before,player))stats.teleports++;
  }
  stats.activeVehicles=vehiclePairs.length;stats.receives++;
 }
 function advance(dt,running=true){
  if(!current)return 1;
  if(running&&previous){
   cursor=Math.min(current.tick,cursor+Math.max(0,Math.min(.1,dt))*RATE);
   if(cursor>=current.tick)stats.clampedFrames++;
  }
  return previous?Math.max(0,Math.min(1,(cursor-previous.tick)/(current.tick-previous.tick))):1;
 }
 function actor(id,alpha=1){
  const pair=players.get(id);
  if(!pair)return null;
  stats.samples++;
  return interpolate(pair.from,pair.to,alpha,pair.pose);
 }
 function movingVehicles(alpha=1){
  for(const pair of vehiclePairs)interpolate(pair.from,pair.to,alpha,pair.pose);
  stats.samples+=vehiclePairs.length;
  return vehiclePairs;
 }
 return {receive,advance,actor,movingVehicles,reset,stats};
}
