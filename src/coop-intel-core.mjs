// Recollida compartida de les cartes originals: HQ + helicòpters/tancs.
// El servidor és l'únic que pot avançar l'etapa, sense duplicar mapes
// ni revelar emplaçaments que un jugador encara no ha investigat.
export function createCoopIntel({meta,record={}}){
 const spec=meta.intel,enabled=meta.mode==='native'&&!!spec;
 let stage=record.stage||0,confirmed=!!record.confirmed;
 const sectors=new Set(record.sectors||[]),discarded=new Set(record.discarded||[]),
   knownHeli=new Set(record.knownHeli||[]),knownTank=new Set(record.knownTank||[]);
 let revision=record.revision||0,description=record.description||null;
 const sector=(x,z)=>(x>=0?1:0)+(z>=0?2:0);
 const candidates=spec?.sites||[];
 function pickup(kind,x,z){
   if(!enabled||!['mapa','mapa_heli','mapa_tanc'].includes(kind))return false;
   const quadrant=meta.mapScale===2?sector(x,z):0;
   if(kind==='mapa'){
     if(confirmed)return true;
     if(meta.mapScale===2){
       if(sectors.has(quadrant))return true;
       sectors.add(quadrant);stage=sectors.size;
       if(stage===2||stage===3)
         for(const i of (spec.eliminationOrder||[]).slice((stage-2)*3,(stage-1)*3))discarded.add(i);
       if(stage>=4){confirmed=true;description='HQ enemic localitzat amb exactitud.';}
       else description=stage===1?'Nou possibles emplaçaments del HQ marcats al mapa.':
         'Intel·ligència compartida: '+(9-discarded.size)+' possibles emplaçaments.';
     }else{
       stage=Math.min(3,stage+1);confirmed=stage>=3;
       if(stage===2)discarded.add(candidates.findIndex(c=>!c.real));
       description=confirmed?'HQ enemic localitzat amb exactitud.':
         stage===1?'Tres possibles emplaçaments del HQ marcats al mapa.':
         'Un emplaçament descartat; en queden dos.';
     }
   }else{
     const known=kind==='mapa_heli'?knownHeli:knownTank;
     if(meta.mapScale===2)known.add(quadrant);
     else for(let i=0;i<4;i++)known.add(i);
     description='Mapa de '+(kind==='mapa_heli'?'helicòpters':'tancs')+' compartit.';
   }
   revision++;return true;
 }
 function revealAll(){
   if(!enabled)return;
   stage=meta.mapScale===2?4:3;confirmed=true;
   for(let i=0;i<4;i++){sectors.add(i);knownHeli.add(i);knownTank.add(i);}
   revision++;description='Intel·ligència compartida: tots els sectors revelats.';
 }
 function snapshot(){
   if(!enabled)return null;
   const knownVehicles=[...(meta.vehicles||[]),...(meta.targets||[])].filter(v=>{
     const known=v.t==='heli'||v.t==='heli_combat'?knownHeli:
       v.t==='tanc'?knownTank:null;
     return known?.has(sector(v.x,v.z));
   }).map(v=>({id:v.id,t:v.t,x:v.x,z:v.z}));
   return {stage,confirmed,revision,description,investigated:sectors.size,
     discarded:[...discarded],candidates:stage>0&&!confirmed?
       candidates.map((p,i)=>({x:p.x,z:p.z,discarded:discarded.has(i)})):[],
     knownVehicles,heliSectors:[...knownHeli],tankSectors:[...knownTank]};
 }
 function checkpoint(){return {stage,confirmed,revision,description,sectors:[...sectors],
   discarded:[...discarded],knownHeli:[...knownHeli],knownTank:[...knownTank]};}
 return {pickup,revealAll,snapshot,checkpoint};
}
