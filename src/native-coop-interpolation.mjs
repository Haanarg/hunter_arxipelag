// Suavització visual dels actors i vehicles remots: sense alterar el servidor,
// la física, els impactes, els inventaris ni la predicció del pilot local.
// Les arribades de snapshots són irregulars: cal preservar la pose presentada
// en rebre un estat, no reiniciar la interpolació al punt de partida vell.
// Entre paquets normals hi ha ~3 ticks; amb Wi-Fi irregular s'han
// observat 23 ticks (~774 ms). No confondre un tall breu amb un teleport.
const RATE=30,MAX_GAP_TICKS=60,TELEPORT_METRES=24,MAX_RECOVERY_METRES=90;
const SMOOTH_SECONDS=.068,MAX_FORECAST_SECONDS=.12,SETTLE_METRES=.012;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const poseOf=o=>({x:o.x,y:finite(o.y)?o.y:0,z:o.z,
 hd:finite(o.hd)?o.hd:0,...(finite(o.alt)?{alt:o.alt}:{})});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z,(a.y||0)-(b.y||0));
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const angle=(a,b,t)=>a+wrapAngle(b-a)*t;
const lerp=(a,b,t)=>a+(b-a)*t;
const poseChanged=(a,b)=>a.x!==b.x||a.y!==b.y||a.z!==b.z||
 a.hd!==b.hd||a.alt!==b.alt;
const sameSeat=(vehicles,id)=>{
 for(const v of vehicles||[])if(v.seats?.includes(id))return v.id;
 return null;
};
function safe(before,after,seconds,maxSpeed){
 if(!before||!after||!finite(before.x)||!finite(before.z)||
    !finite(after.x)||!finite(after.z))return false;
 // Després d'un paquet tardà un helicòpter pot haver avançat 40–50 m
 // legítimament. La tolerància creix amb el temps i la velocitat real,
 // però queda acotada per no interpolar grans teletransports.
 const reportedSpeed=Math.max(Math.abs(before.v||0),Math.abs(after.v||0));
 const travelSpeed=maxSpeed===15?15:Math.min(maxSpeed,reportedSpeed*1.6);
 const allowed=Math.min(MAX_RECOVERY_METRES,
   Math.max(TELEPORT_METRES,4+seconds*travelSpeed*1.35));
 return distance(before,after)<=allowed;
}
function velocity(before,after,seconds,maxSpeed){
 const inv=1/Math.max(1/RATE,seconds);
 let vx=(after.x-before.x)*inv,vy=(after.y-before.y)*inv,
     vz=(after.z-before.z)*inv;
 const speed=Math.hypot(vx,vy,vz);
 if(speed>maxSpeed){const ratio=maxSpeed/speed;vx*=ratio;vy*=ratio;vz*=ratio}
 return {x:vx,y:vy,z:vz,hd:Math.max(-4.5,Math.min(4.5,wrapAngle(after.hd-before.hd)*inv)),
  alt:finite(after.alt)&&finite(before.alt)?Math.max(-35,Math.min(35,(after.alt-before.alt)*inv)):0};
}
function makeTrack(before,after,dt,maxSpeed){
 const from=poseOf(before),to=poseOf(after);
 return {from,to,pose:{...from},speed:velocity(from,to,dt,maxSpeed),maxSpeed,age:0};
}
function updateTrack(track,before,after,dt,maxSpeed){
 track.from=poseOf(before);track.to=poseOf(after);
 track.speed=velocity(track.from,track.to,dt,maxSpeed);
 track.maxSpeed=maxSpeed;track.age=0;
 // No modificam track.pose aquí: el fotograma anterior és l'ancoratge
 // visual continu, fins i tot si el paquet arriba abans d'acabar l'interval.
}
function animateTrack(track,dt){
 const t=1-Math.exp(-dt/SMOOTH_SECONDS),p=track.pose,q=track.to,s=track.speed;
 const ahead=Math.min(MAX_FORECAST_SECONDS,track.age);
 let dx=(q.x+s.x*ahead-p.x)*t,dy=(q.y+s.y*ahead-p.y)*t,
     dz=(q.z+s.z*ahead-p.z)*t;
 // Una correcció després d'un paquet tardà no pot convertir-se en
 // un salt de desenes de metres entre dos fotogrames de 60 FPS.
 const move=Math.hypot(dx,dy,dz),limit=track.maxSpeed*1.25*dt;
 if(move>limit&&limit>0){
   const scale=limit/move;dx*=scale;dy*=scale;dz*=scale;
 }
 p.x+=dx;p.y+=dy;p.z+=dz;
 p.hd=angle(p.hd,q.hd+s.hd*ahead,t);
 if(finite(q.alt))p.alt=lerp(finite(p.alt)?p.alt:q.alt,q.alt+s.alt*ahead,t);
 
}
export function createNativeCoopInterpolation(){
 let current=null,self=null,vehicles=new Map(),players=new Map(),vehicleOutput=[];
 const stats={samples:0,receives:0,teleports:0,resets:0,activeVehicles:0,
  clampedFrames:0,forecastFrames:0,activePlayers:0,
  longGapReceives:0,maxTickGap:0,gapResets:0};
 function reset(){current=null;self=null;vehicles.clear();players.clear();vehicleOutput=[];
  stats.activeVehicles=0;stats.activePlayers=0;stats.resets++;}
 function receive(state,localId){
  if(!state||!Number.isInteger(state.tick)){reset();return}
  const old=current,same=old&&old.missionId===state.missionId&&
   old.status==='running'&&state.status==='running'&&self===localId;
  const tickGap=same?state.tick-old.tick:0;
  if(tickGap>0){
   stats.maxTickGap=Math.max(stats.maxTickGap,tickGap);
   if(tickGap>12)stats.longGapReceives++;
   if(tickGap>MAX_GAP_TICKS)stats.gapResets++;
  }
  const newer=!!same&&tickGap>0&&tickGap<=MAX_GAP_TICKS;
  const sameTick=!!same&&tickGap===0;
  if(!newer&&!sameTick){
   if(old)stats.resets++;
   current=state;self=localId;vehicles.clear();players.clear();vehicleOutput=[];
   stats.activeVehicles=0;stats.activePlayers=0;stats.receives++;return;
  }
  current=state;self=localId;
  // Dues actualitzacions al mateix tick només modifiquen el que és nou;
  // les trajectòries visuals no perden els fotogrames ja presentats.
  const dt=Math.max(1/RATE,(state.tick-old.tick)/RATE);
  const oldVehicles=new Map(old.vehicles.map(row=>[row.id,row]));
  const liveVehicles=new Set();
  for(const row of state.vehicles){
   const before=oldVehicles.get(row.id),id=row.id,track=vehicles.get(id);
   if(row.destroyed||before?.destroyed||!safe(before,row,dt,80)){
    if(before&&poseChanged(before,row))stats.teleports++;
    vehicles.delete(id);continue;
   }
   if(poseChanged(before,row)){
    if(track)updateTrack(track,before,row,dt,80);
    else vehicles.set(id,makeTrack(before,row,dt,80));
   }else if(track&&newer){
    // Frenada: eliminar la predicció, però completar suaument la correcció.
    track.to=poseOf(row);track.speed={x:0,y:0,z:0,hd:0,alt:0};track.age=0;
   }
   liveVehicles.add(id);
  }
  for(const id of vehicles.keys())if(!liveVehicles.has(id))vehicles.delete(id);
  const oldPlayers=new Map(old.players.map(p=>[p.id,p]));
  const livePlayers=new Set();
  for(const row of state.players){
   if(row.id===localId)continue;
   const before=oldPlayers.get(row.id),id=row.id,track=players.get(id);
   const compatible=!!before&&before.hp>0&&row.hp>0&&
    sameSeat(old.vehicles,id)===sameSeat(state.vehicles,id);
   if(!compatible||!safe(before,row,dt,15)){
    if(before&&poseChanged(before,row)&&!safe(before,row,dt,15))stats.teleports++;
    players.delete(id);continue;
   }
   if(poseChanged(before,row)){
    if(track)updateTrack(track,before,row,dt,15);
    else players.set(id,makeTrack(before,row,dt,15));
   }else if(track&&newer){
    track.to=poseOf(row);track.speed={x:0,y:0,z:0,hd:0,alt:0};track.age=0;
   }
   livePlayers.add(id);
  }
  for(const id of players.keys())if(!livePlayers.has(id))players.delete(id);
  stats.activeVehicles=vehicles.size;stats.activePlayers=players.size;
  // Només reconstruir la llista de render quan entra un estat nou,
  // mai en el bucle de 60 FPS.
  vehicleOutput=[...vehicles].map(([id,track])=>({id,pose:track.pose}));
  stats.receives++;
 }
 function advance(dt,running=true){
  if(!current||!running)return 1;
  const step=Math.max(0,Math.min(.1,dt));
  let forecasted=false,clamped=false,pruned=false;
  const stationary=track=>track.age>.22&&
   track.speed.x===0&&track.speed.y===0&&track.speed.z===0&&
   track.speed.hd===0&&track.speed.alt===0&&
   distance(track.pose,track.to)<SETTLE_METRES&&
   Math.abs(wrapAngle(track.pose.hd-track.to.hd))<.012;
  for(const [id,track] of vehicles){
   track.age+=step;
   if(track.age>MAX_FORECAST_SECONDS)clamped=true;
   if(track.age>0)forecasted=true;
   animateTrack(track,step);
   if(stationary(track)){vehicles.delete(id);pruned=true}
  }
  for(const [id,track] of players){
   track.age+=step;
   if(track.age>MAX_FORECAST_SECONDS)clamped=true;
   if(track.age>0)forecasted=true;
   animateTrack(track,step);
   if(stationary(track))players.delete(id);
  }
  if(pruned)vehicleOutput=[...vehicles].map(([id,track])=>({id,pose:track.pose}));
  stats.activeVehicles=vehicles.size;stats.activePlayers=players.size;
  if(forecasted)stats.forecastFrames++;
  // Després de 120 ms sense dades la velocitat extrapolada queda limitada.
  if(clamped)stats.clampedFrames++;
  return 1;
 }
 function actor(id){
  const track=players.get(id);
  if(!track)return null;
  stats.samples++;return track.pose;
 }
 function movingVehicles(){
  stats.samples+=vehicleOutput.length;
  return vehicleOutput;
 }
 return {receive,advance,actor,movingVehicles,reset,stats};
}
