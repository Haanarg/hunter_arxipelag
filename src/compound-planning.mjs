// Placement/pad plan only. Instantiation of walls, buildings and entities is a
// separate stage and may consume more random values before the next layout.
const finite=Number.isFinite;
export function compoundPoint(q,angle=0,mirror=1){
  if(![q.x,q.z,angle].every(finite)||![1,-1].includes(mirror))throw new RangeError('Invalid compound transform');
  const c=Math.round(Math.cos(angle)),s=Math.round(Math.sin(angle));
  return (x,z)=>[q.x+x*mirror*c-z*s,q.z+x*mirror*s+z*c];
}
export function planCompound(layout,q,{random,rawHeightAt}){
  if(!layout||typeof layout.id!=='string'||!Array.isArray(layout.size)||layout.size.length!==2||!layout.size.every(v=>finite(v)&&v>0)||![q.x,q.z].every(finite)||typeof random!=='function'||typeof rawHeightAt!=='function')throw new RangeError('Invalid compound planning input');
  const isPort=layout.id==='port',coastal=isPort||!!layout.waterfront,
    angle=layout.fixedOrientation?(q.angle||0):['base','hq'].includes(layout.id)?0:coastal?q.angle:Math.floor(random()*4)*Math.PI/2,
    mirror=1,tr=compoundPoint(q,angle,mirror),shore=layout.waterfront?.shore??8,
    landDepth=coastal?shore+layout.size[1]/2-5:layout.size[1]+8,
    center=tr(0,coastal?-layout.size[1]/2+landDepth/2:0),height=coastal?.86:q.h??rawHeightAt(q.x,q.z);
  if(!finite(height)||!finite(landDepth)||landDepth<=0)throw new RangeError('Invalid compound pad');
  return {id:layout.id,layoutId:layout.layoutId||layout.id,variant:layout.variant||1,x:q.x,z:q.z,angle,mirror,
    r:Math.hypot(...layout.size)/2+20,isPort,coastal,landDepth,center,height,
    level:{x:center[0],z:center[1],hw:(layout.size[0]+8)/2,hd:landDepth/2,y:height,rot:angle,c:Math.cos(angle),s:Math.sin(angle),blend:coastal?3:18},
    entrances:layout.entrances.map(p=>tr(...p)),patrol:layout.patrol.map(p=>tr(...p)),
    routes:layout.routes.map(r=>({width:r.width,points:r.points.map(p=>tr(...p))})),
    buildings:layout.buildings.map(spec=>{const [x,z]=tr(spec.x,spec.z);return {...structuredClone(spec),x,z,angle:angle-(spec.rotationY||0)};})};
}

// Registre de reserves d'espai, sense escenes ni generador de nombres aleatoris.
// Manté les referències mutables, el cache de radis i l'ordre d'acceptació.
export function createSiteRegistry({
  layouts,layoutRadius,initialCenters,MapConstructor=Map
}){
const COMPOUND_RADII=Object.freeze({
  avancada:84,
  garatge:95,
  heliport:102,
  polvori:98,
  comunicacions:95,
  port:90
});
const COMPOUND_GAP=34;
// Reserva explícita de la base i de l'HQ: encara que dues illes generades se solapin
// físicament, cap compound podrà entrar dins aquests perímetres.
const compoundCenters=initialCenters;
const typeId=t=>({avancada:'outpost',garatge:'hangar'}[t]||t);
const compoundRadiusCache=new MapConstructor();
const compoundRadius=type=>{
  if(!compoundRadiusCache.has(type))compoundRadiusCache.set(type,
    Math.max(COMPOUND_RADII[type]||58,...layouts.filter(l=>l.type===typeId(type)).map(layoutRadius)));
  return compoundRadiusCache.get(type);
};
const compoundSiteClear=(type,q,minCenter=0)=>{
  const r=compoundRadius(type);
  return compoundCenters.every(c=>{
    const d=Math.hypot(q.x-c.x,q.z-c.z);
    return d>Math.max(minCenter,r+c.r+COMPOUND_GAP)
  })
};
const registerCompound=(type,q)=>compoundCenters.push({x:q.x,z:q.z,r:compoundRadius(type),type});

return {centers:compoundCenters,gap:COMPOUND_GAP,
  radius:compoundRadius,isClear:compoundSiteClear,register:registerCompound};
}

// Reserva progressiva d'emplaçaments, sense construir geometria.
// landSteps i compound són generadors injectats: es preserven
// literalment l'ordre dels yields, la prioritat d'illes i els intents.
export function createReservationPlanner({
  candidateIslands,usedSpecialIslands,sectorMatches,landSteps,
  compoundSiteClear,compound
}){
const reserveCompound=function* (type,min=180,sector=null){let checkpointUnits=0;for(const i of candidateIslands.filter(i=>sectorMatches(i.x,i.z,sector))){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};if(usedSpecialIslands.has(i))continue;for(let n=0;n<18;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const q=(yield* landSteps(i,850,1));if(q&&sectorMatches(q.x,q.z,sector)&&compoundSiteClear(type,q,min)){q.r=i.r;if((yield* compound(type,q))){usedSpecialIslands.add(i);return q}}}}return null};
const forceReserve=function* (type,min,sector=null){let checkpointUnits=0;
  let q=(yield* reserveCompound(type,min,sector))||(yield* reserveCompound(type,110,sector));if(q)return q;
  // Fallback exhaustiu, però mai saltant-se la zona de seguretat.
  for(const i of candidateIslands.filter(i=>sectorMatches(i.x,i.z,sector))){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    if(usedSpecialIslands.has(i))continue;
    for(let n=0;n<48;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      const c=(yield* landSteps(i,1800,1));if(!c||!sectorMatches(c.x,c.z,sector)||!compoundSiteClear(type,c,95))continue;
      c.r=i.r;if((yield* compound(type,c))){usedSpecialIslands.add(i);return c}
    }
  }
  return null
};

return {reserveCompound,forceReserve};
}
