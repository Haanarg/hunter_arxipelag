// Smooth native COOP grenade/C4 presentation. Authoritative server rows own
// collision, landing, damage, detonation and entity lifetime.
// Never reset a flying mesh to a 10Hz snapshot on receipt.
const finite=Number.isFinite;
const valid=r=>r&&typeof r.id==='string'&&
  [r.x,r.y,r.z,r.vx,r.vy,r.vz].every(finite);
const smooth=(a,b,k)=>a+(b-a)*k;
export function createNativeCoopGrenadeVisual(){
 const tracks=new Map(),stats={receives:0,frames:0,active:0,corrections:0,maxCorrectionM:0};
 function receive(rows){
  stats.receives++;
  const ids=new Set();
  for(const row of rows||[]){
   if(!valid(row))continue;
   ids.add(row.id);
   let track=tracks.get(row.id);
   if(!track){
    tracks.set(row.id,{id:row.id,weapon:row.weapon||'grenade',
      x:row.x,y:row.y,z:row.z,vx:row.vx,vy:row.vy,vz:row.vz,
      correction:{x:0,y:0,z:0},elapsed:0,landed:!!row.landed,confirmed:row});
    continue;
   }
   if(track.confirmed===row)continue;
   const error=Math.hypot(row.x-track.x,row.y-track.y,row.z-track.z);
   stats.maxCorrectionM=Math.max(stats.maxCorrectionM,error);
   if(row.landed||Math.hypot(row.vx,row.vy,row.vz)<.01){
    // The server has stopped the grenade on a surface. Stop visual drift.
    track.x=row.x;track.y=row.y;track.z=row.z;
    track.vx=track.vy=track.vz=0;
    track.correction={x:0,y:0,z:0};
    track.landed=true;
   }else if(!track.landed){
    // Preserve the rendered pose; correct slowly so packet reception
    // never creates a visible teleport. Server coordinates remain trusted.
    track.correction.x+=row.x-track.x;
    track.correction.y+=row.y-track.y;
    track.correction.z+=row.z-track.z;
    track.vx=row.vx;track.vy=row.vy;track.vz=row.vz;
    if(error>.01)stats.corrections++;
   }
   track.confirmed=row;track.elapsed=0;
  }
  for(const id of tracks.keys())if(!ids.has(id))tracks.delete(id);
  stats.active=tracks.size;
 }
 function advance(dt,draw,remove){
  const step=Math.max(0,Math.min(.065,finite(dt)?dt:0));
  for(const [id,t] of tracks){
   if(!t.landed&&t.elapsed<.32&&step>0){
    // Same ballistic gravity as server (24 m/s² for native grenades).
    const before=t.vy;t.x+=t.vx*step;t.z+=t.vz*step;
    t.y+=before*step-12*step*step;t.vy-=24*step;
    // Exponential convergence toward latest authoritative trajectory.
    const k=1-Math.exp(-7*step);
    for(const axis of ['x','y','z']){
      const correction=t.correction[axis]*k;
      t[axis]+=correction;t.correction[axis]-=correction;
    }
    t.elapsed+=step;
   }
   draw?.(id,{x:t.x,y:t.y,z:t.z},t.confirmed);
   stats.frames++;
  }
  stats.active=tracks.size;
 }
 return {receive,advance,has:id=>tracks.has(id),reset(){tracks.clear();stats.active=0;},stats};
}
