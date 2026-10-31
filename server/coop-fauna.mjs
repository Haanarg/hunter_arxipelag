import {SHARED_SHARKS} from '../src/shark-motion-core.mjs';

// Els taurons del joc individual viuen al Worker durant una sessió nativa.
// La visualització només segueix snapshots; mai no decideix mossegades.
export function createNativeFauna({meta,record={},players,world,vehicles,damagePlayer,active=()=>true}){
 const sharks=structuredClone(record.sharks||meta.sharks||[]),events=structuredClone(record.events||[]);
 const positions=()=>players().filter(p=>p.hp>0&&p.swimming&&!p.fall&&!vehicles.mounted(p.id));
 function step(tick){
  if(meta.mode!=='native'||!active())return;
  const swimmers=positions();
  for(const shark of sharks){
   const nearest=swimmers.filter(p=>Math.hypot(p.x-shark.x,p.z-shark.z)<SHARED_SHARKS.LOSE)
     .sort((a,b)=>Math.hypot(a.x-shark.x,a.z-shark.z)-Math.hypot(b.x-shark.x,b.z-shark.z))[0];
   // A més de 145 m cap nedador no cal simular a 30 Hz.
   if(!nearest&&tick%6!==shark.phase%6)continue;
   const dt=nearest?1/30:.2,
    outcome=SHARED_SHARKS.update(shark,dt,nearest||null,(x,z)=>world().heightAt(x,z));
   if(outcome.bite&&nearest?.hp>0&&!vehicles.mounted(nearest.id)){
    if(damagePlayer(nearest.id,SHARED_SHARKS.BITE_DAMAGE)!==false){
     events.push({id:'shark-'+tick+'-'+shark.id,kind:'shark-bite',
      actorId:nearest.id,sharkId:shark.id,tick});
     if(events.length>12)events.shift();
    }
   }
  }
 }
 const snapshot=()=>({sharks:sharks.map(({id,x,z,sharkYaw,dead})=>({id,x,z,
   hd:sharkYaw??0,dead:!!dead})),events:events.slice()});
 const checkpoint=()=>({sharks:structuredClone(sharks),events:structuredClone(events)});
 return {step,snapshot,checkpoint};
}
