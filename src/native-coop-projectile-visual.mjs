// Projecció EXCLUSIVAMENT gràfica dels projectils rebuts pel COOP.
// El servidor continua decidint trajectòries, col·lisions i impactes.
// Entre snapshots de ~10 Hz les malles avancen a la freqüència de la
// pantalla; les correccions petites no han de fer-les saltar enrere.
const MAX_FORECAST=.18,DECAY_SECONDS=.095;
const finite=Number.isFinite;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function createNativeCoopProjectileVisual(){
 const tracks=new Map(),stats={receives:0,active:0,visualFrames:0,
   localMuzzleStarts:0,corrections:0,maxCorrectionM:0};
 const projected=(t,seconds)=>({
  x:t.row.x+t.row.vx*seconds+t.offset.x*Math.exp(-seconds/DECAY_SECONDS),
  y:t.row.y+t.row.vy*seconds+t.offset.y*Math.exp(-seconds/DECAY_SECONDS),
  z:t.row.z+t.row.vz*seconds+t.offset.z*Math.exp(-seconds/DECAY_SECONDS)
 });
 function receive(rows,selfId,muzzle){
  stats.receives++;
  const seen=new Set();
  for(const row of rows||[]){
   if(!row||typeof row.id!=='string'||![row.x,row.y,row.z,row.vx,row.vy,row.vz].every(finite))continue;
   seen.add(row.id);
   const previous=tracks.get(row.id);
   if(previous?.row===row)continue;
   let prior=null;
   if(previous)prior=projected(previous,previous.age);
   else if(row.actorId===selfId&&['pistol','assault','sniper'].includes(row.weapon)){
    const tip=muzzle?.(row.weapon);
    // Una bala pot haver recorregut >10 m quan arriba el primer estat.
    // No enganxar a l'arma un projectil disparat des d'un vehicle llunyà.
    if(tip&&[tip.x,tip.y,tip.z].every(finite)&&dist(tip,row)<42){
     const dx=row.x-tip.x,dy=row.y-tip.y,dz=row.z-tip.z;
     if(dx*row.vx+dy*row.vy+dz*row.vz>=-3){
      prior=tip;stats.localMuzzleStarts++;
     }
    }
   }
   const offset=prior?{x:prior.x-row.x,y:prior.y-row.y,z:prior.z-row.z}:
    {x:0,y:0,z:0};
   if(previous&&dist(prior,row)>.001){
    stats.corrections++;
    stats.maxCorrectionM=Math.max(stats.maxCorrectionM,dist(prior,row));
   }
   tracks.set(row.id,{row,offset,age:0});
  }
  for(const id of tracks.keys())if(!seen.has(id))tracks.delete(id);
  stats.active=tracks.size;
 }
 // Callback rep un id, pose i referència a la fila real. L'efecte
 // gràfic NO escriu mai dins la fila del servidor.
 function advance(dt,draw){
  const step=Math.min(.1,Math.max(0,finite(dt)?dt:0));
  for(const [id,t] of tracks){
   t.age=Math.min(MAX_FORECAST,t.age+step);
   draw(id,projected(t,t.age),t.row);
   stats.visualFrames++;
  }
 }
 return {receive,advance,reset(){tracks.clear();stats.active=0;},stats};
}
