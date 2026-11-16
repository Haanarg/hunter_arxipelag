// Adapter for the current single-player simulation. Network transport is deliberately absent.
const OPERATION_GENERATOR_VERSION='world:0.6.2',OPERATION_ADAPTER_VERSION=1;
let operationRegistry=null,activeOperation=null,operationBusy=false;
const operationClone=value=>JSON.parse(JSON.stringify(value));
const operationNested=['waterIngress','waterJump','home','patrol','navPath','navGoal','tacticGoal','defenseTarget','blastImpulse'];
const operationTransient=new Set(['o','m','roof','wm','dm','owner','building','carrier','door','rig','arms','legs','head','resources','saveId','navRadiusType']);
function operationScalars(value){
  const state={},infinite=[];
  for(const [key,v]of Object.entries(value)){
    if(key.startsWith('_')||operationTransient.has(key))continue;
    if(typeof v==='number'){if(Number.isFinite(v))state[key]=v;else if(v===Infinity||v===-Infinity)infinite.push([key,v>0?1:-1]);}
    else if(typeof v==='string'||typeof v==='boolean'||v===null)state[key]=v;
  }
  return {state,infinite};
}
function operationTransform(o){return o?{position:o.position.toArray(),rotation:[o.rotation.x,o.rotation.y,o.rotation.z],scale:o.scale.toArray()}:null}
function operationSetTransform(o,t){if(o&&t){o.position.fromArray(t.position);o.rotation.set(...t.rotation);o.scale.fromArray(t.scale)}}
function operationReleaseSeries(version){
  const m=/^(\d+)\.(\d+)\.\d+$/.exec(version);
  return m?m[1]+'.'+m[2]:null;
}
function operationIdentity(kind,state,nested={},legacy=false){
  if(kind==='fauna'||kind==='bomb')return null;
  const position=kind==='walls'?[state.x0,state.x1,state.y0,state.y1,state.z0,state.z1]:
    kind==='enemies'&&legacy?[nested.home?.x,nested.home?.z]:[state.x,state.z];
  if(!position.every(Number.isFinite))return null;
  return JSON.stringify([kind,state.t??null,state.kind??null,...position.map(n=>Math.round(n*1000)/1000)]);
}
function operationRecoveryPairs(saved,current,exact=false){
  const key=(record,old)=>record.identity??operationIdentity(record.kind,record.state,record.nested,old);
  const buckets=(records,old)=>{
    const map=new Map();
    for(const record of records){const k=key(record,old);if(k===null)continue;const list=map.get(k)||[];list.push(record);map.set(k,list);}
    return map;
  };
  const prior=buckets(saved,true),next=buckets(current,false),byId=new Map(saved.map(r=>[r.id,r]));
  const result=new Map(),used=new Set();
  for(const row of current){
    const k=key(row,false),same=byId.get(row.id);
    let match=null;
    if(exact&&row.kind!=='fauna'&&same&&same.kind===row.kind&&same.state.t===row.state.t&&same.state.kind===row.state.kind)match=same;
    else if(k!==null&&next.get(k)?.length===1&&prior.get(k)?.length===1)match=prior.get(k)[0];
    if(match&&!used.has(match.id)){used.add(match.id);result.set(row.id,match);}
  }
  return result;
}
function prepareOperationRegistry(){
  const groups={vehicles:V.slice(),enemies:E.slice(),items:items.slice(),buildings:B.slice(),walls:Wl.slice(),palms:PL.slice(),fauna:fa.slice()},byId=new Map(),identities=new Map();
  let fingerprint=2166136261;
  for(const [kind,entries]of Object.entries(groups))entries.forEach((entity,index)=>{
    const collection=['vehicles','enemies','items'].includes(kind)?kind:'structures';
    entity.saveId=collection+':'+kind+':'+index;byId.set(entity.saveId,entity);
    identities.set(entity.saveId,operationIdentity(kind,entity));
    // Fauna uses cosmetic random placement; generation identity belongs to fixed world entities.
    const token=kind+':'+index+':'+(entity.t||entity.kind||'')+':'+(kind==='fauna'?'':JSON.stringify([entity.x??entity.cx,entity.z??entity.cz,entity.y0]));
    for(let i=0;i<token.length;i++){fingerprint^=token.charCodeAt(i);fingerprint=Math.imul(fingerprint,16777619)}
  });
  operationRegistry={groups,byId,identities,fingerprint:(fingerprint>>>0).toString(16)};
  activeOperation=null;initializeOperationRun();operationAutosave?.reset();
}
function operationRecord(kind,entity){
  const record={id:entity.saveId,kind,identity:operationRegistry.identities.get(entity.saveId)??null,...operationScalars(entity),transform:operationTransform(entity.o||entity.m)};
  // Els soldats embarcats tenen transformació LOCAL al cotxe.
  // El desament guarda una sortida segura a peu: la missió es reprendrà
  // amb el soldat al costat del cotxe, sense cap referència circular a V.
  if(kind==='enemies'&&entity.enemyVehicleClaim){
    const claim=entity.enemyVehicleClaim,v=claim.vehicle;
    if(v&&!v.destroyed&&claim.phase!=='approach'){
      const p=window.HUNTER_ENEMY_REQUISITION.vehicleSeatPosition(v,claim.seat);
      record.state.x=p.x;record.state.z=p.z;
      record.state.gy=hAt(p.x,p.z);record.state.aiMode='search';
      record.state.canSee=false;
      record.transform={position:[p.x,record.state.gy,p.z],
        rotation:[0,v.hd,0],scale:[1,1,1]};
    }
  }
  const active={vehicles:V,enemies:E,items,walls:Wl,fauna:fa};
  if(active[kind])record.active=active[kind].includes(entity);
  record.nested={};
  for(const key of operationNested)if(entity[key]!=null){
    try{const value=operationClone(entity[key]);
      // Nested fields are authored point/path data, never scene or entity references.
      if(JSON.stringify(value).length>=200000)throw new Error('Camp massa gran');record.nested[key]=value;
    }catch(_){throw new Error('No s’ha pogut capturar l’estat de '+kind+'.');}
  }
  if(kind==='vehicles')record.carrierId=entity.carrier?.saveId||null;
  if(kind==='items')record.buildingId=entity.building?.saveId||null;
  if(kind==='buildings')record.stairDestroyed=!!entity.interiorStair?.destroyed;
  return record;
}
function captureOperation(name){
  if(nativeCoopSession)throw Error('La sessió cooperativa es conserva al servidor.');
  if(!started||over||generationPromise||seedSearchMode||!operationRegistry)throw new Error('No hi ha una operació activa per desar.');
  // Transitional player poses contain live animation references. Wait until a stable simulation state.
  if(playerFall||playerEject||grenades.length||pl.userData.grenadePending)throw new Error('Espera que acabi la caiguda o el llançament abans de desar.');
  const api=window.HUNTER_SAVES;
  const snapshot=activeOperation?operationClone(activeOperation):api.createOperation({
    name:name||'Operació '+(seed>>>0),gameVersion:window.HUNTER_VERSION||'0.6.6',
    generatorVersion:OPERATION_GENERATOR_VERSION,seed:seed>>>0,mapScale:MAP_SCALE});
  if(name)snapshot.name=name.trim();
  snapshot.gameVersion=window.HUNTER_VERSION||snapshot.gameVersion;
  snapshot.world.time=elapsed;
  for(const kind of api.ENTITY_KINDS)snapshot.world.entities[kind]=[];
  for(const [kind,entries]of Object.entries(operationRegistry.groups)){
    const collection=['vehicles','enemies','items'].includes(kind)?kind:'structures';
    snapshot.world.entities[collection].push(...entries.map(entity=>operationRecord(kind,entity)));
  }
  snapshot.world.entities.explosives=bombs.map((b,i)=>({id:'explosives:planted:'+i,kind:'bomb',...operationScalars(b),transform:operationTransform(b.o)}));
  snapshot.participants.local={accountId:null,state:{...operationScalars(P).state,
    vehicleSeat:cv?{vehicleId:cv.saveId,seat:0}:null,hp,ammo,inventory:operationClone(inv),
    disguised:disg,bazookaEquipped,grenadeEquipped,cisallaEquipped,sniperEquipped,knifeEquipped,sniperAmmo,bazookaAmmo,
    crouched:playerCrouched,swimming,cooldown:fcd,flightY:cheatFlightY,cheats:{...cheats},
    view:{position:cam.position.toArray(),quaternion:cam.quaternion.toArray(),zoom}},stats:{kills}};
  snapshot.stats={kills};
  snapshot.world.runtime={adapterVersion:OPERATION_ADAPTER_VERSION,vehicleHealthVersion:2,fingerprint:operationRegistry.fingerprint,
    journal:currentRun(),difficulty:DIF,rng:R.getState(),hqMapKnown,hqIntelStage,hqDiscardIndex,
    hqIntelSectors:[...hqIntelSectors],hqIntelDiscarded:[...hqIntelDiscarded],
    knownVehicleSectors:{heli:[...knownVehicleSectors.heli],tanc:[...knownVehicleSectors.tanc]},
    intelMarks:intelMarks.map(m=>({kind:m.kind,label:m.label,refId:m.ref?.saveId||null})),
    waypoint:waypoint?{...waypoint}:null,log:operationClone(logb),
    prisoners:prisonerSystem.exportSave(),radio:radioRelay.exportSave()};
  return api.validateSnapshot(snapshot);
}
function validateOperationRuntime(snapshot,matchWorld=false){
  window.HUNTER_SAVES.validateSnapshot(snapshot,{generatorVersion:OPERATION_GENERATOR_VERSION});
  const r=snapshot.world.runtime,p=snapshot.participants.local;
  if(r?.journal)window.HUNTER_JOURNAL.validateRun(r.journal);
  if(!r||r.adapterVersion!==OPERATION_ADAPTER_VERSION||!p||Object.keys(snapshot.participants).length!==1||
    ![.6,1,1.5].includes(r.difficulty)||!Number.isInteger(r.rng)||!p.state.inventory||
    !Number.isFinite(p.state.hp)||p.state.hp<=0||!Number.isFinite(p.state.x)||!Number.isFinite(p.state.y)||!Number.isFinite(p.state.z))
    throw new Error('Desament incomplet o incompatible amb aquesta versió.');
  if(!Number.isFinite(p.state.hd)||p.state.hp>COMBAT_BALANCE.player||!Number.isInteger(p.state.ammo)||p.state.ammo<0||
    !Number.isInteger(snapshot.stats.kills)||snapshot.stats.kills<0||
    Object.entries(p.state.inventory).some(([key,count])=>!IT[key]||!Number.isInteger(count)||count<=0)||
    ![r.hqIntelSectors,r.hqIntelDiscarded,r.knownVehicleSectors?.heli,r.knownVehicleSectors?.tanc,r.intelMarks,r.log].every(Array.isArray)||
    !p.state.view||!Array.isArray(p.state.view.position)||p.state.view.position.length!==3||!p.state.view.position.every(Number.isFinite)||
    !Array.isArray(p.state.view.quaternion)||p.state.view.quaternion.length!==4||!p.state.view.quaternion.every(Number.isFinite)||
    !Number.isFinite(p.state.view.zoom)||!Number.isFinite(p.state.cooldown)||p.state.cooldown<0)
    throw new Error('Dades de jugador o intel·ligència invàlides.');
  const collectionKinds={vehicles:['vehicles'],enemies:['enemies'],civilians:[],structures:['walls','buildings','palms','fauna'],items:['items'],explosives:['bomb']};
  for(const [collection,entries]of Object.entries(snapshot.world.entities)){
    if(!collectionKinds[collection]||!Array.isArray(entries)||entries.some(e=>!collectionKinds[collection].includes(e.kind)))
      throw new Error('Col·lecció d’entitats incompatible.');
  }
  const records=Object.values(snapshot.world.entities).flat(),seen=new Set();
  for(const record of records){
    if(!record.state||Array.isArray(record.state)||!record.kind||!Array.isArray(record.infinite)||
      Object.values(record.state).some(value=>value!==null&&!['number','string','boolean'].includes(typeof value)))
      throw new Error('Estat d’entitat incomplet.');
    if(record.kind==='vehicles'&&!Object.hasOwn(VT,record.state.t)||record.kind==='enemies'&&!Object.hasOwn(EC,record.state.t)||record.kind==='items'&&!Object.hasOwn(IT,record.state.t))
      throw new Error('Tipus d’entitat desconegut.');
    if(record.infinite.some(pair=>!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||![1,-1].includes(pair[1])||['x','y','z','life','alt','hd'].includes(pair[0])||pair[0]==='hp'&&record.kind!=='walls'))
      throw new Error('Valor numèric d’entitat invàlid.');
    if(['vehicles','enemies','items','walls','fauna'].includes(record.kind)&&typeof record.active!=='boolean')throw new Error('Presència d’entitat invàlida.');
    const coordinates=record.kind==='walls'?['x0','x1','y0','y1','z0','z1']:record.kind==='bomb'?['x','y','z']:['x','z'];
    if(!coordinates.every(k=>Number.isFinite(record.state[k])))throw new Error('Coordenades d’entitat invàlides.');
    if(record.nested&&Object.keys(record.nested).some(key=>!operationNested.includes(key)))throw new Error('Camp compost desconegut.');
    for(const key of [...Object.keys(record.state),...record.infinite.map(pair=>pair[0])])
      if(operationTransient.has(key)||key.startsWith('_'))throw new Error('Camp d’entitat no admès.');
    if(record.transform&&!['position','rotation','scale'].every(k=>Array.isArray(record.transform[k])&&record.transform[k].length===3&&record.transform[k].every(Number.isFinite)))
      throw new Error('Transformació d’entitat invàlida.');
    if(record.kind==='bomb'){if(!(record.state.t>0)||!['x','y','z'].every(k=>Number.isFinite(record.state[k])))throw new Error('Explosiu invàlid.');continue;}
    if(matchWorld){
      const expected=operationRegistry.groups[record.kind];
      if(!expected||!operationRegistry.byId.has(record.id)||!expected.includes(operationRegistry.byId.get(record.id)))throw new Error('El món generat no correspon al desament.');
      const entity=operationRegistry.byId.get(record.id);
      if(entity.t!==record.state.t||entity.kind!==record.state.kind)throw new Error('La identitat d’una entitat ha canviat.');
      for(const key of [...Object.keys(record.state),...record.infinite.map(pair=>pair[0])]){
        const clearingPath=operationNested.includes(key)&&record.state[key]===null;
        if(entity[key]!==null&&typeof entity[key]==='object'&&!clearingPath)
          throw new Error('El desament intenta substituir una referència del món.');
      }
      seen.add(record.id);
    }
  }
  if(matchWorld&&(r.fingerprint!==operationRegistry.fingerprint||seen.size!==operationRegistry.byId.size))throw new Error('El món generat no correspon al desament.');
  if(matchWorld)for(const record of snapshot.world.entities.vehicles)if(record.carrierId){
    const carrier=operationRegistry.byId.get(record.carrierId);
    if(!carrier||carrier.t!=='ferry'||!snapshot.world.entities.vehicles.some(v=>v.id===record.carrierId&&v.active))throw new Error('Transport sobre ferri invàlid.');
  }
  if(matchWorld&&p.state.vehicleSeat&&!snapshot.world.entities.vehicles.some(v=>v.id===p.state.vehicleSeat.vehicleId&&v.active&&v.state.life>0))
    throw new Error('El vehicle del jugador ja no existeix.');
}
// Recovery never mutates the source snapshot or transfers a state by ordinal
// when the regenerated world has changed. Only a unique spawn signature is matched.
function validateOperationRecovery(snapshot){
  window.HUNTER_SAVES.validateSnapshot(snapshot,{generatorVersion:OPERATION_GENERATOR_VERSION});
  const series=operationReleaseSeries(snapshot.gameVersion);
  if(!series||series!==operationReleaseSeries(window.HUNTER_VERSION)||
     snapshot.world.runtime?.adapterVersion!==OPERATION_ADAPTER_VERSION)
    throw new Error('No es pot recuperar aquesta partida: salt de versió major o format incompatible.');
  const r=snapshot.world.runtime,p=snapshot.participants.local?.state;
  if(Object.keys(snapshot.participants).length!==1||!p||![.6,1,1.5].includes(r.difficulty)||
     !p.inventory||typeof p.inventory!=='object'||Array.isArray(p.inventory)||
     ![p.x,p.y,p.z,p.hd,p.hp].every(Number.isFinite)||p.hp<=0||
     !Number.isInteger(p.ammo)||p.ammo<0||!Number.isInteger(snapshot.stats.kills)||snapshot.stats.kills<0)
    throw new Error('L’estat del jugador no es pot recuperar de forma segura.');
}
function reconcileOperationSnapshot(source){
  validateOperationRecovery(source);
  const snapshot=operationClone(source),r=snapshot.world.runtime,p=snapshot.participants.local.state;
  const saved=Object.values(source.world.entities).flat().filter(e=>e.kind!=='bomb'&&e.state);
  const current=[];
  for(const [kind,entries] of Object.entries(operationRegistry.groups))
    for(const entity of entries)current.push(operationRecord(kind,entity));
  const exact=r.fingerprint===operationRegistry.fingerprint;
  const pairs=operationRecoveryPairs(saved,current,exact),remap=new Map();
  for(const [id,prior] of pairs)remap.set(prior.id,id);
  // Keep new geometry, collision dimensions, model scales and default AI paths.
  const fields={
    vehicles:['x','z','hd','v','alt','life','destroyed','rockets','smokeT'],
    enemies:['x','z','gy','hd','hp','life','destroyed','cd','alert','wt','tx','tz'],
    items:[],buildings:['rb'],walls:['hp','open','openProgress','desiredOpen'],palms:['alive'],fauna:[]
  };
  const byId=new Map(current.map(row=>[row.id,row]));
  for(const row of current){
    const prior=pairs.get(row.id);if(!prior)continue;
    if(typeof prior.active==='boolean'&&typeof row.active==='boolean')row.active=prior.active;
    for(const key of fields[row.kind]||[]){
      const value=prior.state[key],actual=operationRegistry.byId.get(row.id)[key];
      if(value!==undefined&&(value===null||['number','string','boolean'].includes(typeof value))&&
         (actual===null||typeof actual!=='object')){
        row.state[key]=value;row.infinite=row.infinite.filter(pair=>pair[0]!==key);
      }
    }
    if(row.kind==='vehicles'){
      const max=VT[row.state.t]?.life;
      if(Number.isFinite(max)&&Number.isFinite(row.state.life))
        row.state.life=Math.min(max,Math.max(0,row.state.life*((r.vehicleHealthVersion||1)<2?2:1)));
    }
    if(row.kind==='buildings')row.stairDestroyed=!!prior.stairDestroyed;
    if(['vehicles','enemies'].includes(row.kind)&&row.transform&&prior.transform&&
        ['position','rotation'].every(k=>Array.isArray(prior.transform[k])&&prior.transform[k].length===3&&prior.transform[k].every(Number.isFinite))){
      row.transform.position=prior.transform.position.slice();row.transform.rotation=prior.transform.rotation.slice();
    }
  }
  for(const row of current)if(row.kind==='vehicles'){
    const carrier=byId.get(remap.get(pairs.get(row.id)?.carrierId));
    row.carrierId=carrier?.active&&carrier.state.t==='ferry'?carrier.id:null;
  }
  for(const collection of Object.keys(snapshot.world.entities))snapshot.world.entities[collection]=[];
  for(const row of current){
    const collection=['vehicles','enemies','items'].includes(row.kind)?row.kind:'structures';
    snapshot.world.entities[collection].push(row);
  }
  // Planted explosives can only be safely replayed in an unchanged world.
  if(exact)snapshot.world.entities.explosives=operationClone(source.world.entities.explosives);
  const seat=byId.get(remap.get(p.vehicleSeat?.vehicleId)),lostSeat=!!p.vehicleSeat&&!(seat?.active&&seat.state.life>0);
  p.vehicleSeat=seat?.active&&seat.state.life>0?{vehicleId:seat.id,seat:p.vehicleSeat.seat}:null;
  p.hp=Math.min(p.hp,COMBAT_BALANCE.player);
  p.inventory=Object.fromEntries(Object.entries(p.inventory).filter(([k,n])=>Object.hasOwn(IT,k)&&Number.isInteger(n)&&n>0));
  for(const [flag,item] of [['bazookaEquipped','bazooka'],['sniperEquipped','sniper'],['grenadeEquipped','grenade'],['cisallaEquipped','cisalla'],['knifeEquipped','knife']])
    if(!Object.hasOwn(IT,item))p[flag]=false;
  // A lost vehicle or newly blocked position returns the player to the safe
  // generated starting point, not a possibly submerged or enclosed location.
  const blocked=!p.vehicleSeat&&wallCandidates(p.x,p.z,.4).some(w=>!w.open&&w.playerBlock!==false&&
    p.x>w.x0-.35&&p.x<w.x1+.35&&p.z>w.z0-.35&&p.z<w.z1+.35&&p.y<w.y1&&p.y+1.5>w.y0);
  const relocate=lostSeat||blocked||Math.abs(p.x)>=H||Math.abs(p.z)>=H;
  if(relocate){
    const delta=[P.x-p.x,P.y-p.y,P.z-p.z];
    p.x=P.x;p.y=P.y;p.z=P.z;p.hd=P.hd;p.swimming=false;p.flightY=null;
    if(Array.isArray(p.view?.position))p.view.position=p.view.position.map((n,i)=>n+delta[i]);
  }
  // Optional missions are restored only if their own validator recognises the
  // regenerated entities; otherwise retain their freshly generated state.
  const optionalReset=[];
  if(r.prisoners?.repair)r.prisoners.repair.vehicleId=remap.get(r.prisoners.repair.vehicleId)||null;
  try{prisonerSystem.validateSave(r.prisoners);}catch(_){r.prisoners=prisonerSystem.exportSave();optionalReset.push('presoners');}
  if(Array.isArray(r.radio?.leases))r.radio.leases=r.radio.leases.flatMap(l=>{
    const enemyId=remap.get(l.enemyId);return enemyId?[{...l,enemyId}]:[];
  });
  try{radioRelay.validateSave(r.radio,operationRegistry.byId);}catch(_){r.radio=radioRelay.exportSave();optionalReset.push('ràdio');}
  if(Array.isArray(r.intelMarks))r.intelMarks=r.intelMarks.flatMap(m=>{
    const refId=remap.get(m.refId);return refId?[{...m,refId}]:[];
  });
  r.fingerprint=operationRegistry.fingerprint;r.vehicleHealthVersion=2;
  snapshot.gameVersion=window.HUNTER_VERSION;
  snapshot.operationId=window.HUNTER_SAVES.newOperationId();snapshot.revision=0;
  snapshot.createdAt=snapshot.updatedAt=Date.now();
  snapshot.name=(source.name.slice(0,85)+' (recuperada)');
  const report={matched:pairs.size,unmatched:saved.length-pairs.size,newEntities:current.length-pairs.size,relocated:relocate,optionalReset};
  validateOperationRuntime(snapshot,true);
  return {snapshot,report};
}
function applyOperationSnapshot(snapshot){
  validateOperationRuntime(snapshot,true);
  const r=snapshot.world.runtime,p=snapshot.participants.local.state;
  const records=Object.values(snapshot.world.entities).flat();
  // Validate the optional systems before touching any generated entities.
  prisonerSystem.validateSave(r.prisoners);radioRelay.validateSave(r.radio,operationRegistry.byId);
  for(const record of records){
    if(record.kind==='bomb')continue;
    const entity=operationRegistry.byId.get(record.id);
    Object.assign(entity,record.state);
    if(record.kind==='vehicles'&&(r.vehicleHealthVersion||1)<2){
      // Desaments anteriors: es duplica també la vida que els quedava.
      // El marcador de versió impedeix tornar-la a duplicar en reobrir.
      const newMax=VT[entity.t]?.life;
      if(newMax&&Number.isFinite(entity.life))
        entity.life=Math.min(newMax,Math.max(0,Math.ceil(entity.life*2)));
    }
    for(const [key,sign]of record.infinite)entity[key]=sign>0?Infinity:-Infinity;
    for(const [key,value]of Object.entries(record.nested||{})){
      if(!operationNested.includes(key))throw new Error('Camp compost desconegut.');
      entity[key]=operationClone(value);
    }
    operationSetTransform(entity.o||entity.m,record.transform);
  }
  const active=kind=>snapshot.world.entities[kind].filter(e=>e.active).map(e=>operationRegistry.byId.get(e.id));
  V=active('vehicles');E=active('enemies');items=active('items');
  fa=records.filter(e=>e.kind==='fauna'&&e.active).map(e=>operationRegistry.byId.get(e.id));
  Wl=records.filter(e=>e.kind==='walls'&&e.active).map(e=>operationRegistry.byId.get(e.id));
  Dr=Dr.filter(d=>Wl.includes(d));
  for(const record of records){
    if(record.kind==='bomb')continue;
    const entity=operationRegistry.byId.get(record.id);
    if(['vehicles','enemies','items','fauna'].includes(record.kind)&&!record.active){
      world.remove(entity.o);if(record.kind==='enemies')for(const leg of entity.towerLegColliders||[])Wl=Wl.filter(w=>w!==leg);
    }
    if(record.kind==='vehicles')entity.carrier=record.carrierId?operationRegistry.byId.get(record.carrierId):null;
    if(record.kind==='walls'&&!record.active){
      if(entity.civicFurniture)collapseCivicProp(entity,false);
      if(entity.porchSupports)collapsePorch(entity.owner,false);
      for(const mesh of [entity.m,...(entity.parts||[]),...(entity.timberTrim||[])])if(mesh)mesh.visible=false;
      if(entity.owner?.door===entity)entity.owner.door=null;
    }
    if(record.kind==='walls'&&entity.door&&record.active&&entity.m){
      if(!Object.hasOwn(record.state,'desiredOpen'))entity.desiredOpen=!!entity.alwaysOpen||!!entity.open||(entity.openProgress||0)>0;
      if(entity.bunkerGate||entity.bunkerInteriorDoor){
        if(entity.openProgress==null)entity.openProgress=entity.open?1:0;
        applyBunkerDoorPose(entity);
      }else entity.m.visible=!entity.open;
    }
    if(record.kind==='buildings'){
      if(entity.rb){entity.roof.visible=false;if(entity.upperFloor)entity.upperFloor.visible=false;for(const mesh of entity.extraRoofs||[])mesh.visible=false;}
      if(record.stairDestroyed||entity.rb&&entity.upperFloor)destroyInteriorStair(entity);
    }
    if(record.kind==='palms'&&!entity.alive){
      // remove() updates the InstancedMesh; restoring only alive=false would leave a visible trunk.
      const bucket=TG.get(entity.k),index=bucket?.indexOf(entity);if(index>=0)bucket.splice(index,1);
      PM.remove?.(entity.i,ZM);
    }
  }
  bombs=snapshot.world.entities.explosives.map(record=>{
    const state=record.state,o=window.HUNTER_EXPLOSIVE_VISUALS.create(THREE,true,Math.ceil(state.t));world.add(o);
    operationSetTransform(o,record.transform);return {...state,o};
  });
  prisonerSystem.importSave(r.prisoners,V);radioRelay.importSave(r.radio,operationRegistry.byId);
  Object.assign(P,{x:p.x,y:p.y,z:p.z,hd:p.hd});hp=p.hp;ammo=p.ammo;inv=operationClone(p.inventory);kills=snapshot.stats.kills;
  cv=p.vehicleSeat?operationRegistry.byId.get(p.vehicleSeat.vehicleId):null;
  if(cv&&!V.includes(cv))throw new Error('El vehicle del jugador ja no existeix.');
  bazookaEquipped=p.bazookaEquipped;grenadeEquipped=p.grenadeEquipped;cisallaEquipped=p.cisallaEquipped;
  sniperEquipped=p.sniperEquipped;knifeEquipped=p.knifeEquipped;sniperAmmo=p.sniperAmmo;
  // Desaments antics: inv.bazooka era la reserva de coets; ara només indica la possessió.
  bazookaAmmo=Number.isInteger(p.bazookaAmmo)?p.bazookaAmmo:Math.max(0,inv.bazooka||0);
  if(!Number.isInteger(p.bazookaAmmo)&&inv.bazooka>0)inv.bazooka=1;
  playerCrouched=p.crouched;swimming=p.swimming;fcd=p.cooldown;cheatFlightY=p.flightY;setDis(p.disguised);Object.assign(cheats,p.cheats);
  elapsed=snapshot.world.time;DIF=r.difficulty;R.setState(r.rng);water.update(elapsed);
  hqMapKnown=r.hqMapKnown;hqIntelStage=r.hqIntelStage;hqDiscardIndex=r.hqDiscardIndex;
  for(const [set,values]of [[hqIntelSectors,r.hqIntelSectors],[hqIntelDiscarded,r.hqIntelDiscarded],
    [knownVehicleSectors.heli,r.knownVehicleSectors.heli],[knownVehicleSectors.tanc,r.knownVehicleSectors.tanc]]){set.clear();for(const value of values)set.add(value);}
  intelMarks=r.intelMarks.map(m=>({kind:m.kind,label:m.label,ref:operationRegistry.byId.get(m.refId)})).filter(m=>m.ref&&V.includes(m.ref));
  logb=operationClone(r.log);waypoint=r.waypoint?{...r.waypoint}:null;
  for(const collection of [Pj,grenades,fx,DB])for(const e of collection)if(e.o||e.m)world.remove(e.o||e.m);
  Pj=[];grenades=[];fx=[];DEAD=[];DB.length=WA.length=HR.length=0;
  clearBulletImpacts();window.HUNTER_STEALTH.clear();clearKeys();setSniperScope(false);
  wallGridCount=-1;vehicleGridVSource=null;vehicleGridESource=null;
  pl.position.set(P.x,P.y,P.z);pl.rotation.y=P.hd;
  pl.visible=!cv;poseRider(cv,0);
  cam.position.fromArray(p.view.position);cam.quaternion.fromArray(p.view.quaternion);zoom=p.view.zoom;
  ib=cv?null:buildingCandidates(P.x,P.z).find(b=>Math.abs(P.x-b.x)<b.w/2&&Math.abs(P.z-b.z)<b.d/2&&P.y<(solidRoofAt(b,P.x,P.z)?.bottom??b.fy+b.h+.1))||null;
  updateDistanceVisibility();
  if(ib)hideCameraObstructions(ib,{x:P.x,y:P.y+1.65,z:P.z},!!ib.basement&&P.y<ib.fy-1);
  activeOperation=operationClone(snapshot);initializeOperationRun(snapshot);operationAutosave?.reset({saved:snapshot.world.time});paused=true;audioPause();mini();resetSimulationClock();
}
