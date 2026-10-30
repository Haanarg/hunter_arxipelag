// Suavització visual dels actors i vehicles remots: sense alterar el servidor,
// la física, els impactes, els inventaris ni la predicció del pilot local.
// Les arribades de snapshots són irregulars: cal preservar la pose presentada
// en rebre un estat, no reiniciar la interpolació al punt de partida vell.
// Entre paquets normals hi ha ~3 ticks; amb Wi-Fi irregular s'han
// observat 23 ticks (~774 ms). No confondre un tall breu amb un teleport.
const RATE=30,MAX_GAP_TICKS=60,TELEPORT_METRES=24,MAX_RECOVERY_METRES=90;
const MAX_FORECAST_SECONDS=.12,SETTLE_METRES=.012;
const BASE_DELAY_SECONDS=.15,MAX_DELAY_SECONDS=.20,MAX_TRACK_FRAMES=12;
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
// Cada trajectòria conserva snapshots autoritatius identificats pel tick del
// servidor. El rellotge de render és COMÚ a tots els remots; el pilot local
// no passa mai per aquest buffer.
function makeTrack(before,after,dt,maxSpeed,previousTick,currentTick){
 const from=poseOf(before),to=poseOf(after);
 return {frames:[{tick:previousTick,pose:from},{tick:currentTick,pose:to}],
   to,pose:{...from},speed:velocity(from,to,dt,maxSpeed),
   maxSpeed,age:0,stillTicks:0};
}
function updateTrack(track,before,after,dt,maxSpeed,previousTick,currentTick,changed){
 const latest=poseOf(after),frames=track.frames;
 if(frames[frames.length-1]?.tick===currentTick)
   frames[frames.length-1]={tick:currentTick,pose:latest};
 else if(currentTick>frames[frames.length-1].tick)
   frames.push({tick:currentTick,pose:latest});
 while(frames.length>MAX_TRACK_FRAMES)frames.shift();
 const prior=frames[frames.length-2];
 track.to=latest;track.maxSpeed=maxSpeed;
 track.speed=changed&&prior?
   velocity(prior.pose,latest,(currentTick-prior.tick)/RATE,maxSpeed):
   {x:0,y:0,z:0,hd:0,alt:0};
 track.stillTicks=changed?0:track.stillTicks+Math.max(0,currentTick-previousTick);
 track.age=0;
 // track.pose no es toca: la recepció no pot provocar un salt visual.
}
function interpolatePose(a,b,t){
 return {x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t),
   hd:angle(a.hd,b.hd,t),
   ...(finite(b.alt)?{alt:lerp(finite(a.alt)?a.alt:b.alt,b.alt,t)}:{})};
}
function sampleTrack(track,tick){
 const frames=track.frames,first=frames[0],last=frames[frames.length-1];
 if(tick<=first.tick)return {target:first.pose,mode:'waiting'};
 for(let i=1;i<frames.length;i++){
   if(tick<=frames[i].tick){
     const before=frames[i-1],after=frames[i],
       alpha=Math.max(0,Math.min(1,(tick-before.tick)/(after.tick-before.tick||1)));
     return {target:interpolatePose(before.pose,after.pose,alpha),mode:'interpolated'};
   }
 }
 // Extrapolació només si el rellotge ja ha superat el tick autoritatiu.
 const unbounded=Math.max(0,(tick-last.tick)/RATE),
   ahead=Math.min(MAX_FORECAST_SECONDS,unbounded),s=track.speed,q=last.pose;
 return {target:{x:q.x+s.x*ahead,y:q.y+s.y*ahead,z:q.z+s.z*ahead,
   hd:q.hd+s.hd*ahead,...(finite(q.alt)?{alt:q.alt+s.alt*ahead}:{})},
   mode:unbounded>=MAX_FORECAST_SECONDS-1e-6?'clamped':'extrapolated'};
}
function animateTrack(track,step,tick){
 const sample=sampleTrack(track,tick),q=sample.target,p=track.pose;
 let dx=q.x-p.x,dy=q.y-p.y,dz=q.z-p.z;
 // Absorbeix correccions tardanes a velocitat plausible, no amb un salt
 // de desenes de metres. El destí és la interpolació temporal, no
 // l'últim snapshot (que faria avançar els remots a batzegades).
 const moved=Math.hypot(dx,dy,dz),limit=track.maxSpeed*1.5*step;
 if(moved>limit&&limit>0){
   const ratio=limit/moved;dx*=ratio;dy*=ratio;dz*=ratio;
 }
 if(step>0){p.x+=dx;p.y+=dy;p.z+=dz;
   const angular=Math.min(1,step/.06);
   p.hd=angle(p.hd,q.hd,angular);
   if(finite(q.alt))p.alt=lerp(finite(p.alt)?p.alt:q.alt,q.alt,angular);
 }
 return sample.mode;
}
export function createNativeCoopInterpolation(){
 let current=null,self=null,vehicles=new Map(),players=new Map(),vehicleOutput=[];
 let elapsed=0,lastArrival=null,renderTick=null,jitterSeconds=0,delayTicks=BASE_DELAY_SECONDS*RATE;
 const stats={samples:0,receives:0,teleports:0,resets:0,activeVehicles:0,
   clampedFrames:0,forecastFrames:0,activePlayers:0,
   longGapReceives:0,maxTickGap:0,gapResets:0,
   bufferDelayMs:BASE_DELAY_SECONDS*1000,interpolatedFrames:0,
   extrapolatedFrames:0,bufferUnderruns:0};
 function clearTracks(){vehicles.clear();players.clear();vehicleOutput=[];
   renderTick=null;lastArrival=null;jitterSeconds=0;delayTicks=BASE_DELAY_SECONDS*RATE;
   stats.activeVehicles=0;stats.activePlayers=0;stats.bufferDelayMs=150;}
 function reset(){current=null;self=null;clearTracks();stats.resets++;}
 function receive(state,localId){
   if(!state||!Number.isInteger(state.tick)){reset();return;}
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
     current=state;self=localId;clearTracks();stats.receives++;return;
   }
   // Mesuram la variació respecte del temps avançat al bucle de render,
   // no respecte de Date.now() (que no és el rellotge del servidor).
   if(newer){
     if(lastArrival!==null){
       const deviation=Math.abs((elapsed-lastArrival)-tickGap/RATE);
       jitterSeconds=jitterSeconds*.85+Math.min(.15,deviation)*.15;
     }
     lastArrival=elapsed;
     delayTicks=Math.min(MAX_DELAY_SECONDS,
       BASE_DELAY_SECONDS+2*jitterSeconds)*RATE;
     stats.bufferDelayMs=Math.round(delayTicks/RATE*1000);
   }
   current=state;self=localId;
   const dt=Math.max(1/RATE,tickGap/RATE);
   const oldVehicles=new Map(old.vehicles.map(row=>[row.id,row]));
   const liveVehicles=new Set();
   for(const row of state.vehicles){
     const before=oldVehicles.get(row.id),id=row.id,track=vehicles.get(id);
     if(row.destroyed||before?.destroyed||!safe(before,row,dt,80)){
       if(before&&poseChanged(before,row)&&!row.destroyed)stats.teleports++;
       vehicles.delete(id);continue;
     }
     const changed=poseChanged(before,row);
     if(changed){
       if(track)updateTrack(track,before,row,dt,80,old.tick,state.tick,true);
       else vehicles.set(id,makeTrack(before,row,dt,80,old.tick,state.tick));
     }else if(track&&newer)updateTrack(track,before,row,dt,80,old.tick,state.tick,false);
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
     const changed=poseChanged(before,row);
     if(changed){
       if(track)updateTrack(track,before,row,dt,15,old.tick,state.tick,true);
       else players.set(id,makeTrack(before,row,dt,15,old.tick,state.tick));
     }else if(track&&newer)updateTrack(track,before,row,dt,15,old.tick,state.tick,false);
     livePlayers.add(id);
   }
   for(const id of players.keys())if(!livePlayers.has(id))players.delete(id);
   if(renderTick===null&&(players.size||vehicles.size))renderTick=old.tick;
   stats.activeVehicles=vehicles.size;stats.activePlayers=players.size;
   vehicleOutput=[...vehicles].map(([id,track])=>({id,pose:track.pose}));
   stats.receives++;
 }
 function advance(dt,running=true){
   if(!current||!running)return 1;
   const step=Math.max(0,Math.min(.1,dt));elapsed+=step;
   if(renderTick===null)return 1;
   const targetTick=current.tick-delayTicks,
     error=targetTick-renderTick;
   // Ajust suau de la velocitat del rellotge (mai recula la pose).
   const rate=Math.max(.72,Math.min(1.08,1+error*.12));
   renderTick=Math.min(current.tick+MAX_FORECAST_SECONDS*RATE,
     renderTick+step*RATE*rate);
   let buffered=false,forecasted=false,clamped=false,pruned=false;
   for(const [id,track] of vehicles){
     track.age+=step;
     const mode=animateTrack(track,step,renderTick);
     if(mode==='interpolated')buffered=true;
     if(mode==='extrapolated'||mode==='clamped')forecasted=true;
     if(mode==='clamped')clamped=true;
     if((track.stillTicks>=6||track.age>.22)&&
       track.speed.x===0&&track.speed.y===0&&track.speed.z===0&&
       distance(track.pose,track.to)<SETTLE_METRES&&
       Math.abs(wrapAngle(track.pose.hd-track.to.hd))<.012){
       vehicles.delete(id);pruned=true;
     }
   }
   for(const [id,track] of players){
     track.age+=step;
     const mode=animateTrack(track,step,renderTick);
     if(mode==='interpolated')buffered=true;
     if(mode==='extrapolated'||mode==='clamped')forecasted=true;
     if(mode==='clamped')clamped=true;
     if((track.stillTicks>=6||track.age>.22)&&
       track.speed.x===0&&track.speed.y===0&&track.speed.z===0&&
       distance(track.pose,track.to)<SETTLE_METRES&&
       Math.abs(wrapAngle(track.pose.hd-track.to.hd))<.012)
       players.delete(id);
   }
   if(pruned)vehicleOutput=[...vehicles].map(([id,track])=>({id,pose:track.pose}));
   if(buffered)stats.interpolatedFrames++;
   if(forecasted){stats.forecastFrames++;stats.extrapolatedFrames++;stats.bufferUnderruns++;}
   if(clamped)stats.clampedFrames++;
   stats.activeVehicles=vehicles.size;stats.activePlayers=players.size;
   if(!vehicles.size&&!players.size)renderTick=null;
   return 1;
 }
 function actor(id){const track=players.get(id);if(!track)return null;
   stats.samples++;return track.pose;}
 function movingVehicles(){stats.samples+=vehicleOutput.length;return vehicleOutput;}
 return {receive,advance,actor,movingVehicles,reset,stats};
}
