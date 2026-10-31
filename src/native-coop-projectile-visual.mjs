// Presentació pura dels projectils COOP. La simulació del Worker conserva
// l'autoritat de danys, col·lisions, aparició i desaparició dels projectils.
// La pose visual no pot saltar cap a una posició de snapshot d'un altre instant.
const MAX_UNCONFIRMED_SECONDS=.35;
const GHOST_SECONDS=.105,MAX_GHOST_SPEED=95;
const MAX_MUZZLE_DIST=18,MAX_PHYSICAL_DEVIATION=1.5;
const finite=Number.isFinite;
const validPoint=p=>!!p&&[p.x,p.y,p.z].every(finite);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const shotSpeeds={pistol:130,assault:130,sniper:470,bazooka:85,
 rifle:70,tank:85,tankette:135,attackCannon:145,boatRocket:85};
const bulletWeapons=new Set(['pistol','assault','sniper']);
const velocityFrom=(from,to,speed)=>{
 const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,
   length=Math.hypot(dx,dy,dz)||1;
 return {vx:dx/length*speed,vy:dy/length*speed,vz:dz/length*speed};
};
const validRow=r=>r&&typeof r.id==='string'&&r.id.length>0&&
 [r.x,r.y,r.z,r.vx,r.vy,r.vz].every(finite);
function trackFor(row,origin,own=false,ghost=false){
 return {row,origin:{x:origin.x,y:origin.y,z:origin.z},
  vx:row.vx,vy:row.vy,vz:row.vz,
  life:0,sinceReceipt:0,own,ghost,
  serverTick:null,serverRow:null};
}
export function createNativeCoopProjectileVisual(){
 const tracks=new Map(),seenShots=new Set();
 const stats={receives:0,active:0,visualFrames:0,localMuzzleStarts:0,
   corrections:0,maxCorrectionM:0,rejectedCorrections:0,
   maxServerDeviationM:0,shortLivedShots:0,shotEvents:0,
   activeGhosts:0,ignoredStaleShots:0};
 const pruneShots=()=>{
  // Els efectes de combat només conserven els darrers 64 registres.
  // Limitar igualment la memòria de les sessions molt llargues.
  if(seenShots.size>256){
   const ids=[...seenShots];seenShots.clear();
   for(const id of ids.slice(-128))seenShots.add(id);
  }
 };
 function prime(effects=[]){
  for(const effect of effects)if(effect?.kind==='shot'&&Number.isFinite(effect.id))
   seenShots.add(effect.id);
  pruneShots();
 }
 function receive(rows,selfId,muzzle,shots=[],tick=null){
  stats.receives++;
  const valid=Array.isArray(rows)?rows.filter(validRow):[];
  const byId=new Map(valid.map(row=>[row.id,row]));
  const still=new Set();
  // Processem primer els esdeveniments, ja que una bala pot impactar
  // entre dos snapshots i no arribar a figurar mai a projectiles[].
  for(const shot of shots){
   if(shot?.kind!=='shot'||!Number.isFinite(shot.id)||seenShots.has(shot.id))
    continue;
   seenShots.add(shot.id);
   if(typeof shot.projectileId!=='string'||!validPoint(shot.from)||
      !validPoint(shot.to))continue;
   // Una sessió reconnectada no reprodueix dispars antics.
   if(Number.isFinite(tick)&&Number.isFinite(shot.tick)&&
      (shot.tick>tick||tick-shot.tick>9)){stats.ignoredStaleShots++;continue;}
   const id=shot.projectileId;
   if(tracks.has(id))continue;
   const authoritative=byId.get(id);
   const speed=finite(shot.speed)&&shot.speed>0?shot.speed:
    shot.enemy?(shot.weapon==='bazooka'?76:70):
    shotSpeeds[shot.weapon]||130;
   const shotVelocity=velocityFrom(shot.from,shot.to,speed);
   const row=authoritative||{id,actorId:shot.actorId,weapon:shot.weapon,
    ...shot.from,...shotVelocity,splash:shot.weapon==='bazooka'?8:0};
   const own=shot.actorId===selfId&&bulletWeapons.has(shot.weapon);
   const tip=own?muzzle?.(shot.weapon):null;
   // La punta és l'actual del jugador, després de la predicció local.
   // No s'extrapola cap enrere fins a la pose vella del servidor.
   const useMuzzle=own&&validPoint(tip)&&distance(tip,shot.from)<MAX_MUZZLE_DIST;
   const start=useMuzzle?tip:shot.from;
   const t=trackFor(row,start,useMuzzle,!authoritative);
   if(!authoritative){
    // Un tret confirmat que ja ha impactat es representa amb una
    // traça curta, purament visual, sense recrear cap bala amb dany.
    const speed0=Math.hypot(t.vx,t.vy,t.vz);
    if(speed0>MAX_GHOST_SPEED){
     const scale=MAX_GHOST_SPEED/speed0;
     t.vx*=scale;t.vy*=scale;t.vz*=scale;
    }
    stats.shortLivedShots++;
   }
   tracks.set(id,t);still.add(id);
   stats.shotEvents++;
   if(useMuzzle)stats.localMuzzleStarts++;
  }
  pruneShots();
  // Els projectils existents conserven EXACTAMENT el mateix rellotge
  // visual entre estats. Mai no els tornem a enganxar a row.x/y/z.
  for(const row of valid){
   still.add(row.id);
   let t=tracks.get(row.id);
   if(!t){
    // Compatibilitat amb un tret sense event rebut (p.ex. entrada tardana).
    t=trackFor(row,row,false,false);
    tracks.set(row.id,t);
   }
   if(t.row===row){
    // La primera fila també és una mostra autoritativa: comparar amb
    // aquest tick ja a la recepció següent.
    if(!t.serverRow){t.serverRow=row;t.serverTick=finite(tick)?tick:null;}
    continue;
   }
   if(t.serverRow&&Number.isFinite(t.serverTick)&&Number.isFinite(tick)&&
       tick>=t.serverTick){
    const seconds=(tick-t.serverTick)/30,p=t.serverRow;
    const predicted={x:p.x+p.vx*seconds,y:p.y+p.vy*seconds,
      z:p.z+p.vz*seconds};
    const deviation=distance(predicted,row);
    stats.maxServerDeviationM=Math.max(stats.maxServerDeviationM,deviation);
    if(deviation>MAX_PHYSICAL_DEVIATION)stats.rejectedCorrections++;
    else if(deviation>.001){
     stats.corrections++;
     stats.maxCorrectionM=Math.max(stats.maxCorrectionM,deviation);
     // Discontinuïtats menors en trajectòries REMOTES: aplicació
     // limitada, sense tocar els trets del jugador local.
     if(!t.own){
      const ratio=.25;
      t.origin.x+=(row.x-predicted.x)*ratio;
      t.origin.y+=(row.y-predicted.y)*ratio;
      t.origin.z+=(row.z-predicted.z)*ratio;
     }
    }
   }
   t.serverTick=Number.isFinite(tick)?tick:null;
   t.serverRow=row;t.row=row;t.ghost=false;t.sinceReceipt=0;
  }
  for(const [id,t] of tracks)if(!still.has(id)&&!t.ghost)tracks.delete(id);
  stats.active=tracks.size;
  stats.activeGhosts=[...tracks.values()].filter(t=>t.ghost).length;
 }
 function advance(dt,draw,remove){
  const step=Math.max(0,Math.min(.1,finite(dt)?dt:0));
  for(const [id,t] of tracks){
   if(t.ghost&&t.life>=GHOST_SECONDS){
    tracks.delete(id);remove?.(id);continue;
   }
   t.life+=step;t.sinceReceipt+=step;
   if(!t.ghost&&t.sinceReceipt>MAX_UNCONFIRMED_SECONDS){
    // Un tall llarg de xarxa no pot projectar bales infinitament.
    // La trajectòria reprèn el moviment quan arribi un nou estat.
    t.life-=step;
   }
   const pose={x:t.origin.x+t.vx*t.life,y:t.origin.y+t.vy*t.life,
     z:t.origin.z+t.vz*t.life};
   draw(id,pose,t.row);
   stats.visualFrames++;
  }
  stats.active=tracks.size;
  stats.activeGhosts=[...tracks.values()].filter(t=>t.ghost).length;
 }
 return {receive,advance,prime,has:id=>tracks.has(id),
  reset(){tracks.clear();seenShots.clear();stats.active=0;stats.activeGhosts=0;},stats};
}
