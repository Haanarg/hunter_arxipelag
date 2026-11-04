// Progrés dels mapes HQ / vehicles: lògica original extreta de game-core.js.
// Opera sobre un estat temporal injectat; els Set i les referències als
// vehicles es conserven. No genera cap llavor ni modifica la serialització.
// El caller fa l'autodesament abans de cridar-nos, com al codi original.
// Estat transitori per pickup: les col·leccions i els objectes són els
// mateixos que fan servir el minimapa, la generació i els desaments.
export function resolveMapPickup(state,kind,allSectors=false,pickupSector=null){
  if(kind==='mapa'){
    if(state.hqMapKnown)return 'El HQ enemic ja està localitzat.';
    if(state.mapScale===2){
      // Each quadrant provides only one independent piece of HQ intelligence.
      const sector=pickupSector??state.mapSector(state.player.x,state.player.z);
      if(state.hqIntelSectors.has(sector))
        return 'Aquest quadrant ja ha aportat informació sobre l’HQ. Cerca un mapa en un altre quadrant.';
      state.hqIntelSectors.add(sector);
      state.hqIntelStage=state.hqIntelSectors.size;
      if(state.hqIntelStage===1)return 'Nou possibles emplaçaments de l’HQ marcats al mapa.';
      if(state.hqIntelStage===2||state.hqIntelStage===3){
        const from=(state.hqIntelStage-2)*3;
        for(const index of state.hqIntelEliminationOrder.slice(from,from+3))
          state.hqIntelDiscarded.add(index);
        return 'Intel·ligència d’un quadrant nou: tres emplaçaments descartats. En queden '+
          (9-state.hqIntelDiscarded.size)+' de possibles.';
      }
      state.hqMapKnown=true;
      return 'Quart quadrant investigat: HQ enemic localitzat amb exactitud!';
    }
    // Small-map progression remains unchanged.
    if(state.hqIntelStage>=3)return 'El HQ enemic ja està localitzat.';
    state.hqIntelStage++;
    if(state.hqIntelStage===1)return 'Tres possibles emplaçaments del HQ marcats amb interrogants.';
    if(state.hqIntelStage===2)return 'Un dels tres emplaçaments descartat: queden dos interrogants.';
    state.hqMapKnown=true;
    return 'Tercer mapa: HQ enemic localitzat amb exactitud!';
  }
  const isHeli=kind==='mapa_heli',isTank=kind==='mapa_tanc';
  if(!isHeli&&!isTank)return null;
  const markKind=isHeli?'heli':'tanc',sector=state.mapScale===2&&!allSectors?state.mapSector(state.player.x,state.player.z):null,
    targets=(isHeli?state.vehicles.filter(v=>v.t==='heli'||v.t==='heli_combat'):
      [...state.vehicles.filter(v=>v.t==='tanc'),...state.enemies.filter(e=>e.t==='tanc')])
      .filter(v=>!v.destroyed&&state.sectorMatches(v.x,v.z,sector));
  if(sector==null){
    state.knownVehicleSectors[markKind].clear();
    for(let i=0;i<4;i++)state.knownVehicleSectors[markKind].add(i);
    state.intelMarks=state.intelMarks.filter(m=>m.kind!==markKind);
  }else{
    state.knownVehicleSectors[markKind].add(sector);
    state.intelMarks=state.intelMarks.filter(m=>m.kind!==markKind||!state.sectorMatches(m.ref?.x??m.x,m.ref?.z??m.z,sector));
  }
  targets.forEach((v,i)=>state.intelMarks.push({
    kind:markKind,ref:v,
    label:(isHeli?(v.t==='heli_combat'?'Helicòpter de combat ':'Helicòpter '):'Tanc ')+(i+1)
  }));
  return 'Mapa actualitzat: '+targets.length+' '+(isHeli?'helicòpters':'tancs')+
    (sector===null?' localitzats.':' localitzats en aquest quadrant.');
}

export function hqClueMarkers({mapScale,stage,confirmed,sites,discarded,discardIndex}){
  return stage>0&&!confirmed?sites.map((p,i)=>({...p,discarded:
    mapScale===2?discarded.has(i):stage>=2&&i===discardIndex})):[];
}

export function hqIntelStatus({mapScale,stage,confirmed,sites,sectors,discarded}){
  return {stage,investigated:sectors.size,remaining:confirmed?1:
    sites.length-(mapScale===2?discarded.size:(stage>=2?1:0)),confirmed};
}
