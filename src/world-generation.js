const countVehicles=(type,sector=null)=>{let count=0;for(const v of V)if(v.t===type&&sectorMatches(v.x,v.z,sector))count++;return count};
// The planner does not draw from R(): normal play, progressive loading and seed
// searches reserve the same camp before any optional coast/civil/military site.
function prisonCampFootprint(layout){
  const padHalfWidth=layout.size[0]/2+4,padHalfDepth=layout.size[1]/2+4,
    escapeEnd=Math.max(...layout.escapeRoute.map(p=>p[1]))+12,blend=18;
  return {minX:-padHalfWidth-blend,maxX:padHalfWidth+blend,
    minZ:-padHalfDepth-blend,maxZ:Math.max(padHalfDepth,escapeEnd)+blend,
    padHalfWidth,padHalfDepth,escapeEnd,blend};
}
function prisonCampSegmentDistance(x,z,a,b){
  const dx=b.x-a.x,dz=b.z-a.z,
    t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
}
function* surveyPrisonCampSiteSteps(layout,x,z,{heightAt,halfSize,siteClear}){
  const bounds=prisonCampFootprint(layout);
  // All earthworks, including their blend and evacuation runout, stay inside
  // the playable terrain. Sampling the full envelope excludes sea terraces.
  if(x+bounds.minX<=-halfSize+120||x+bounds.maxX>=halfSize-120||
     z+bounds.minZ<=-halfSize+120||z+bounds.maxZ>=halfSize-120||!siteClear({x,z}))return null;
  const height=heightAt(x,z);if(!Number.isFinite(height)||height<.5)return null;
  let low=height,high=height,samples=1;
  const nx=Math.ceil((bounds.maxX-bounds.minX)/8),nz=Math.ceil((bounds.maxZ-bounds.minZ)/8);
  for(let ix=0;ix<=nx;ix++)for(let iz=0;iz<=nz;iz++){
    if(samples%64===0)yield {stage:'Comprovant terreny del camp',completed:null,total:null};
    const h=heightAt(x+bounds.minX+(bounds.maxX-bounds.minX)*ix/nx,
      z+bounds.minZ+(bounds.maxZ-bounds.minZ)*iz/nz);samples++;
    if(!Number.isFinite(h)||h<.5)return null;
    low=Math.min(low,h);high=Math.max(high,h);
  }
  return {site:{x,z,h:height},terrain:{minHeight:low,maxHeight:high,samples,spacing:8,bounds}};
}
function* planPrisonCampSteps(layout,{islandList,baseIsland,hqIsland,heightAt,halfSize,siteClear,createSupportIsland}){
  if(!layout||!layout.fixedOrientation||!layout.escapeRoute?.length)
    throw new Error('Invariant del camp: manca un disseny de presoners vàlid');
  const primary=islandList.filter(i=>i!==baseIsland&&i!==hqIsland).slice()
    .sort((a,b)=>b.r-a.r||a.x-b.x||a.z-b.z),ordered=[...primary,baseIsland,hqIsland];
  let candidates=0,terrace=null;
  for(const island of ordered){
    for(let ring=0;ring<=8;ring++){
      const count=ring?32:1,distance=ring*Math.max(20,island.r*.085);
      for(let point=0;point<count;point++){
        yield {stage:'Cercant camp de presoners',completed:null,total:null};candidates++;
        const angle=point*Math.PI*2/count,
          surveyed=yield* surveyPrisonCampSiteSteps(layout,island.x+Math.cos(angle)*distance,
            island.z+Math.sin(angle)*distance,{heightAt,halfSize,siteClear});
        if(!surveyed)continue;
        const result={...surveyed,island,candidates,placement:'natural'},
          relief=surveyed.terrain.maxHeight-surveyed.terrain.minHeight;
        if(relief<=28)return result;
        // A steep but completely dry site is still usable: grade a terrace
        // instead of silently omitting the camp when no naturally flat site fits.
        if(!terrace||relief<terrace.terrain.maxHeight-terrace.terrain.minHeight)terrace=result;
      }
    }
  }
  if(terrace){terrace.site.h=Math.max(3,(terrace.terrain.minHeight+terrace.terrain.maxHeight)/2);
    return {...terrace,candidates,placement:'terrace'};}
  // Structural last resort, independent of natural terrain candidates. The
  // caller validates the origin's separation before extending the island set.
  const island=createSupportIsland(),site={x:island.x,z:island.z,h:Math.max(3,heightAt(island.x,island.z))};
  if(!Number.isFinite(site.h)||!siteClear(site))throw new Error('Invariant del camp: illa de reserva ocupada o altura invàlida');
  return {site,island,candidates,placement:'support-island',terrain:{bounds:prisonCampFootprint(layout)}};
}
const PIER_DECK_Y=2.4; // 20 cm sobre el màxim de les ones, més proper al nivell de terra. // Cota de coberta per sobre del màxim d'onatge (2.2 m).
// Validació final contra TOTS els vehicles: també els afegits després dels molls.
function jetSkiSpotClear(q,ignore=null){
  const box=vehicleBox({t:'moto_aquatica',...q});box.w+=2;box.d+=2;
  const r=Math.hypot(box.w,box.d)/2;
  if(Math.abs(q.x)>H-r-5||Math.abs(q.z)>H-r-5||hAt(q.x,q.z)>-1.2)return false;
  if(B.some(b=>Math.abs(q.x-b.x)<b.hw+r&&Math.abs(q.z-b.z)<b.hd+r))return false;
  return !V.some(v=>v!==ignore&&obbOverlap(box,vehicleBox(v)))&&!E.some(v=>['jeep','tanqueta','tanc'].includes(v.t)&&obbOverlap(box,vehicleBox(v)));
}
// Recorre la corba de profunditat en passos curts: 100 m de costa, no una recta mar endins.
function* shiftJetSkiAlongCoast(origin,ignore,sector=null){let checkpointUnits=0;
  const depth=Math.max(-3,Math.min(-1.8,hAt(origin.x,origin.z)));
  for(const side of[1,-1]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    let x=origin.x,z=origin.z,walked=0;
    for(let step=0;step<80;step++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      const gx=hAt(x+2,z)-hAt(x-2,z),gz=hAt(x,z+2)-hAt(x,z-2),len=Math.hypot(gx,gz);
      if(len<1e-5)break;
      x+=side*(-gz/len)*5;z+=side*(gx/len)*5;walked+=5;
      for(let j=0;j<8;j++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
        const error=hAt(x,z)-depth;if(Math.abs(error)<.12)break;
        const dx=(hAt(x+1,z)-hAt(x-1,z))/2,dz=(hAt(x,z+1)-hAt(x,z-1))/2,den=dx*dx+dz*dz;
        if(den<1e-6)break;
        const k=Math.max(-3,Math.min(3,error/Math.sqrt(den)))/Math.sqrt(den);x-=dx*k;z-=dz*k;
      }
      const q={x,z,hd:origin.hd};
      if(walked%100===0&&sectorMatches(x,z,sector)&&Math.abs(hAt(x,z)-depth)<.3&&jetSkiSpotClear(q,ignore))return {...q,coastShift:walked};
    }
  }
  return null;
}
function* findJetSkiCoastSpot(ignore=null,sector=null){let checkpointUnits=0;
  for(const island of islands.filter(i=>sectorMatches(i.x,i.z,sector))){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    for(let n=0;n<64;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      const a=n*Math.PI/32,ux=Math.cos(a),uz=Math.sin(a);let landD=null;
      for(let d=0;d<island.r*1.6;d+=10){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
        const h=hAt(island.x+ux*d,island.z+uz*d);
        if(h>0){landD=d;continue}
        if(landD===null||h> -2.5)continue;
        let lo=landD,hi=d;
        for(let k=0;k<15;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const mid=(lo+hi)/2;if(hAt(island.x+ux*mid,island.z+uz*mid)>-2.5)lo=mid;else hi=mid}
        const q={x:island.x+ux*hi,z:island.z+uz*hi,hd:Math.atan2(ux,uz)};
        if(sectorMatches(q.x,q.z,sector)&&jetSkiSpotClear(q,ignore))return q;
        break;
      }
    }
  }
  return null;
}
function* ensureJetSkis(add,sector=null){let checkpointUnits=0;
  for(const v of V.filter(v=>v.t==='moto_aquatica'&&sectorMatches(v.x,v.z,sector))){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    if(jetSkiSpotClear(v,v))continue;
    const q=(yield* shiftJetSkiAlongCoast(v,v,sector))||(yield* findJetSkiCoastSpot(v,sector));
    if(!q)throw new Error('No s’ha trobat una costa lliure per a la moto aquàtica');
    Object.assign(v,q,{coastal:true});
  }
  while(countVehicles('moto_aquatica',sector)<4){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const q=(yield* findJetSkiCoastSpot(null,sector));
    if(!q)throw new Error('No s’han pogut situar quatre motos aquàtiques sense solapaments');
    add('moto_aquatica',q.x,q.z,q.hd,{coastal:true,guaranteed:true});
  }
}

// Compatibility extraction: shared state remains in game-core.js.
// Both APIs execute these exact operations in the exact RNG order. Checkpoints
// describe completed bounded work; searches deliberately have no guessed percent.
// Atomic limits: one building/vehicle model, one terrain tile normal/skirt pass,
// one instanced sector bound, one static material batch allocation and one native
// sort remain indivisible. Sampling/search/rasterisation loops yield within them.
function drainBuildSteps(steps){let next;while(!(next=steps.next()).done){}return next.value}
let generationDrainActive=false;
function build(){
  if(generationDrainActive)throw new Error('Ja hi ha una generació en curs');
  generationDrainActive=true;
  try{return drainBuildSteps(buildSteps())}finally{generationDrainActive=false}
}
function generationAbortError(){const error=new Error('Generació cancel·lada');error.name='AbortError';return error}
let generationYieldChannel=null;
function scheduleGenerationTurn(){
  if(typeof window.scheduler?.yield==='function')return window.scheduler.yield();
  // Reuse one task channel; nested setTimeout can otherwise add a 4 ms clamp
  // to each of the hundreds of useful chunks. No per-chunk rAF is needed.
  if(typeof MessageChannel==='function'){
    if(!generationYieldChannel){
      const channel=new MessageChannel(),queue=[];
      channel.port1.onmessage=()=>queue.shift()?.();
      generationYieldChannel={channel,queue};
    }
    return new Promise(resolve=>{generationYieldChannel.queue.push(resolve);generationYieldChannel.channel.port2.postMessage(0)});
  }
  return new Promise(resolve=>setTimeout(resolve,0));
}
// 6 ms is a cooperative target, not a hard deadline: constructors/native array
// operations cannot be preempted. Measured maxStepMs/maxTurnMs expose overshoots.
async function buildProgressively({iterator=null,onProgress=()=>{},schedule=window.HUNTER_GENERATION_SCHEDULE||scheduleGenerationTurn,signal,budgetMs=6,maxSteps=32}={}){
  if(generationDrainActive)throw new Error('Ja hi ha una generació en curs');
  generationDrainActive=true;
  const steps=iterator||buildSteps(),state={status:'generating',stage:'Preparant el món',completed:0,total:null,steps:0,yields:0,maxStepMs:0,maxStepStage:null,maxTurnMs:0,error:null};
  window.HUNTER_GENERATION_STATE=state;
  const check=()=>{if(signal?.aborted)throw generationAbortError()};
  const publish=checkpoint=>{Object.assign(state,{unit:null},checkpoint);onProgress({...state})};
  const pause=async()=>{
    check();state.yields++;
    // An abort also releases a custom scheduler that has not resolved yet. Late
    // callbacks only settle an abandoned Promise, never resume the iterator.
    let abort;
    const cancelled=new Promise((_,reject)=>{abort=()=>reject(generationAbortError());signal?.addEventListener?.('abort',abort,{once:true})});
    try{await Promise.race([Promise.resolve().then(()=>schedule({...state})),cancelled]);check()}
    finally{signal?.removeEventListener?.('abort',abort)}
  };
  try{
    publish({});await pause();
    for(;;){
      check();const turnStart=performance.now();let count=0,next;
      do{
        check();const before=performance.now(),previousStage=state.stage;next=steps.next();
        const stepMs=performance.now()-before;
        if(stepMs>state.maxStepMs){state.maxStepMs=stepMs;state.maxStepStage=previousStage}
        state.steps++;
        if(next.done){state.maxTurnMs=Math.max(state.maxTurnMs,performance.now()-turnStart);publish({status:'complete',stage:'Món preparat',completed:1,total:1});return next.value}
        publish(next.value||{});
      }while(++count<Math.max(1,maxSteps)&&performance.now()-turnStart<Math.max(1,budgetMs));
      state.maxTurnMs=Math.max(state.maxTurnMs,performance.now()-turnStart);
      await pause();
    }
  }catch(error){
    publish({status:error.name==='AbortError'?'cancelled':'error',error:error.message});throw error;
  }finally{try{steps.return()}finally{generationDrainActive=false}}
}
function* buildSteps(){if(!seedSearchMode){operationRegistry=null;activeOperation=null;}let checkpointUnits=0;resetOptionalSystems();resetSimulationClock(null);resetCameraState();cameraBasement=null;clearVictoryCinematic();clearDeathCinematic();window.HUNTER_ENEMY_LOD.reset();window.HUNTER_STEALTH.clear();window.HUNTER_STEALTH_DEBUG.reset();playerCrouched=false;stealthStepTimer=0;const requestedPalmDisable=!!document.getElementById('disablePalms')?.checked;palmsDisabled=false;cancelGrenadeCharge();clearBulletImpacts();removeParachuteVisual();const buildStarted=performance.now(),buildStages={},buildCounters={landAttempts:0,landCandidates:0},markBuildStage=(()=>{let last=buildStarted;return name=>{const now=performance.now();buildStages[name]=Math.round((now-last)*100)/100;last=now}})();movementFx.reset();if(terrainStream)terrainStream.dispose();terrainStream=null;seedCompounds=[];elapsed=0;water.update(0);joystick.reset();compoundClear=[];terrainLevels=[];terrainLevelGrid.clear();if(seedSearchMode){
  // Un únic món lògic reutilitzable: res de desmuntar geometries o
  // afegir/eliminar escenes per cada llavor.
  if(!seedScratchWorld)seedScratchWorld=new THREE.Group();
  seedScratchWorld.clear();world=seedScratchWorld;
}else{
  if(world){scene.remove(world);yield* window.HUNTER_RESOURCES.disposeSteps(world)}
  world=new THREE.Group();scene.add(world);
}
world.userData={compounds:[],airObstacles:[]};B=[];stairs=[];piers=[];swimming=false;intelMarks=[];hqMapKnown=false;hqIntelStage=0;hqIntelSites=[];hqDiscardIndex=-1;hqIntelEliminationOrder=[];hqIntelSectors.clear();hqIntelDiscarded.clear();knownVehicleSectors.heli.clear();knownVehicleSectors.tanc.clear();playerEject=null;playerFall=null;riderSystem.reset();pl.rotation.x=0;pl.userData.firePose=0;Wl=[];Dr=[];items=[];inv={};bazookaEquipped=false;grenadeEquipped=false;cisallaEquipped=false;pl.userData.cisallaCut=0;sniperEquipped=false;sniperAmmo=0;setSniperScope(false);pl.userData.sniper.visible=false;pl.userData.bazooka.visible=false;pl.userData.grenade.visible=false;pl.userData.grenadeThrow=0;pl.userData.grenadeReleased=false;pl.userData.grenadePending=null;waypoint=null;E=[];Pj=[];DEAD=[];DB.length=0;WA.length=0;TG.clear();bombs=[];grenades=[];fx=[];logb=[];hp=window.HUNTER_COMBAT_BALANCE.player;ammo=16;fcd=0;kills=0;over=0;endEl.style.display='none';setDis(false);let pa,pb;
activeBunker=null;
{const base=requestedSeed==null?Math.floor(Math.random()*0xffffffff)>>>0:requestedSeed>>>0;let tries=0;do{if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};seed=(base+Math.imul(tries++,0x9e3779b1))>>>0;genIslands();pa=(yield* landSteps(A,2000));pb=(yield* landSteps(Bi,2000))}while((!pa||!pb)&&tries<8);if(!pa||!pb)throw new Error('No s’ha pogut generar un mapa vàlid amb aquesta llavor')}
markBuildStage('islandsAndBasePositions');
yield {stage:'Illes i emplaçaments inicials',completed:1,total:1};
const cols=[0xd8b48a,0xc9a27a,0xb8c4c9,0xd9c9a0],compoundVehicles=[],heliportSites=[],staticDecorRoots=[],pathRoutes=[];
const activeSectors=MAP_SCALE===2?[0,1,2,3]:[null];
const islandsInSector=sector=>islands.filter(i=>sectorMatches(i.x,i.z,sector));

// Camins, molls i decoració dels compounds: malles per sectors i material,
// mantenint intactes les dades de física, construccions i saqueig.
const batchStaticDecor=function* (){let checkpointUnits=0;
  const CHUNK=160,groups=new Map(),materialMap=new Map();
  world.updateWorldMatrix(true,false);
  let originals=0,batches=0,vertices=0;
  for(const root of staticDecorRoots){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    if(!root.parent)continue;
    root.updateMatrixWorld(true);
    yield {stage:'Agrupant decoració',completed:originals,total:null,unit:'malles'};
    root.traverse(mesh=>{
      if(!mesh.isMesh||mesh.isInstancedMesh||!mesh.geometry?.attributes.position)return;
      const mat=mesh.material;
      if(!mat?.color||Array.isArray(mat))return;
      const center=mesh.getWorldPosition(new THREE.Vector3()),
            cx=Math.floor(center.x/CHUNK),cz=Math.floor(center.z/CHUNK);
      const signature=[mat.type,mat.roughness??0,mat.metalness??0,mat.opacity??1,
        mat.transparent?1:0,mat.side,mat.flatShading?1:0,mat.polygonOffset?1:0,mat.polygonOffsetFactor,mat.polygonOffsetUnits].join(':');
      const key=cx+','+cz+'|'+signature;
      let group=groups.get(key);
      if(!group){group={cx,cz,mat,signature,meshes:[]};groups.set(key,group)}
      group.meshes.push(mesh);originals++;
    });
  }
  const transform=new THREE.Matrix4(),geometries=[];
  for(const group of groups.values()){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const x=(group.cx+.5)*CHUNK,z=(group.cz+.5)*CHUNK,
          pieces=[],sizes=[];let total=0;
    try{
    for(const mesh of group.meshes){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      yield {stage:'Agrupant decoració',completed:batches,total:groups.size,unit:'grups'};
      transform.makeTranslation(-x,0,-z).multiply(mesh.matrixWorld);
      const copy=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      copy.applyMatrix4(transform);
      const n=copy.attributes.position.count,color=new Float32Array(n*3);
      pieces.push(copy);sizes.push(n);total+=n;
      for(let k=0;k<n;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
        if(k%256===0)yield {stage:'Colors de decoració',completed:k,total:n,unit:'vèrtexs'};
        color[k*3]=mesh.material.color.r;
        color[k*3+1]=mesh.material.color.g;
        color[k*3+2]=mesh.material.color.b;
      }
      copy.setAttribute('color',new THREE.BufferAttribute(color,3));
    }
    const geom=new THREE.BufferGeometry();
    for(const [attribute,width] of [['position',3],['normal',3],['uv',2],['color',3]]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      const data=new Float32Array(total*width);let offset=0;
      for(let k=0;k<pieces.length;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
        const src=pieces[k].getAttribute(attribute);
        if(src)data.set(src.array,offset);
        offset+=sizes[k]*width;
      }
      geom.setAttribute(attribute,new THREE.BufferAttribute(data,width));
    }
    geom.computeBoundingSphere();
    // El mateix material per perfil en tots els sectors. Mateixes cares,
    // colors i abast visual, però menys canvis d'estat de Three.js.
    let mat=materialMap.get(group.signature);
    if(!mat){
      mat=group.mat.clone();mat.color.setHex(0xffffff);
      mat.vertexColors=true;mat.needsUpdate=true;
      materialMap.set(group.signature,mat);
    }
    const mesh=new THREE.Mesh(geom,mat);
    mesh.name='hunter-static-decor-batch';
    mesh.position.set(x,0,z);mesh.castShadow=false;
    world.add(mesh);
    batches++;vertices+=total;
    }finally{for(const g of pieces){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};g.dispose()}}
  }
  const disposed=new Set(),materials=new Set();
  for(const root of staticDecorRoots){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    yield {stage:'Netejant decoració original',completed:null,total:null};
    root.traverse(o=>{
      if(o.geometry&&!disposed.has(o.geometry)){disposed.add(o.geometry);o.geometry.dispose()}
      if(o.material){
        for(const mat of Array.isArray(o.material)?o.material:[o.material])materials.add(mat);
      }
    });
    root.parent?.remove(root);
  }
  for(const mat of materials){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};mat.dispose();}
  staticDecorRoots.length=0;
  const result={originalMeshes:originals,batchedMeshes:batches,
    drawCallsSaved:originals-batches,sharedMaterials:materialMap.size,vertices};
  window.HUNTER_STATIC_BATCH_STATS=result;
  return result;
};
const addVillageWell=g=>{
  const outer=new THREE.Mesh(
    new THREE.CylinderGeometry(1.7,1.8,1.75,24,1,true),
    M(0x858976,'masonry'));
  outer.position.y=.875;g.add(outer);
  // La cara interior necessita normals cap endins: el cilindre original
  // era visible només des de fora i semblava buit/invisible des de dalt.
  const lining=M(0x444b43,'masonry').clone();
  lining.side=THREE.BackSide;
  const inner=new THREE.Mesh(
    new THREE.CylinderGeometry(1.08,1.04,1.72,24,1,true),lining);
  inner.position.y=.88;g.add(inner);
  // L'anella cobreix el gruix de la pedra; la superfície fosca queda
  // molt més avall, però per sobre del terreny perquè no l'oculti el LOD.
  const rim=new THREE.Mesh(
    new THREE.RingGeometry(1.06,1.72,24),M(0x9d9b84,'masonry'));
  rim.rotation.x=-Math.PI/2;rim.position.y=1.76;g.add(rim);
  const water=new THREE.Mesh(
    new THREE.CircleGeometry(1.035,24),M(0x142c33,'paint'));
  water.rotation.x=-Math.PI/2;water.position.y=.22;g.add(water);
  const innerShadow=new THREE.Mesh(
    new THREE.RingGeometry(.78,1.035,24),M(0x1e2828,'masonry'));
  innerShadow.rotation.x=-Math.PI/2;innerShadow.position.y=.235;g.add(innerShadow);
};
const compoundProp=(kind,x,z,rot=0)=>{
  // Fixed physical pieces must exist even when graphics are disabled.
  // Wells are annular, leaving the visual hollow centre unblocked.
  // Benches use one narrow rotated footprint, not an oversized circle.
  const y=Math.max(.05,hAt(x,z)),
    collide=(cx,cz,w,d,height)=>{
      const cs=Math.cos(rot),sn=Math.sin(rot),
        px=x+cx*cs+cz*sn,pz=z-cx*sn+cz*cs,
        hw=(Math.abs(cs)*w+Math.abs(sn)*d)/2,
        hd=(Math.abs(sn)*w+Math.abs(cs)*d)/2;
      Wl.push({x0:px-hw,x1:px+hw,z0:pz-hd,z1:pz+hd,
        cx:px,cz:pz,y0:y-.12,y1:y+height,
        hp:Infinity,open:false,door:false,rammable:false,
        civicFurniture:kind});
      wallGridCount=-1;
    };
  if(kind==='bench')collide(0,0,3.95,1.12,1.2);
  if(kind==='well'){
    // Narrow stone sections round the hollow mouth; twelve segments
    // approximate the 1.06–1.8m physical ring, leaving the centre open.
    for(let i=0;i<12;i++){
      const t=(i+.5)*Math.PI/6;
      collide(Math.cos(t)*1.46,Math.sin(t)*1.46,
        Math.abs(Math.sin(t))*.63+.32,
        Math.abs(Math.cos(t))*.63+.32,1.85);
    }
  }
  if(seedSearchMode)return null;
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;
  if(kind==='bench'){bx(g,4,.25,1.2,0x806447,0,.9,0);for(const x of[-1.4,1.4])bx(g,.2,.8,1,0x485249,x,.4,0)}
  else if(kind==='well')addVillageWell(g);
  else if(kind==='lifebuoy'){const m=new THREE.Mesh(new THREE.TorusGeometry(.6,.15,6,16),M(0xe57846,'paint'));m.position.y=1.5;g.add(m);bx(g,.12,2.3,.12,0x5b6050,0,1.15,0)}
  else if(kind==='crate'){bx(g,1.2,.9,1,0x7b5a35,0,.45,0,'paint');bx(g,1.26,.1,1.06,0x3f3021,0,.2,0,'metal');bx(g,.1,.95,1.08,0x3f3021,0,.48,0,'metal')}
  else if(kind==='barrel'){const body=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.9,10),M(0x53616a,'metal'));body.position.y=.45;g.add(body);for(const y0 of[.12,.78]){const ring=new THREE.Mesh(new THREE.CylinderGeometry(.44,.44,.08,10),M(0x2e3438,'metal'));ring.position.y=y0;g.add(ring)}}
  else if(kind==='barrier'){bx(g,2.4,.72,.5,0x9a8c72,0,.36,0,'masonry');for(const x0 of[-.9,.9])bx(g,.28,.28,.8,0x5d5548,x0,.14,0,'masonry')}
  else if(kind==='ammo'){bx(g,1.5,.75,1.1,0x5f6846,0,.38,0,'paint');bx(g,1.55,.12,1.15,0x30352c,0,.78,0,'metal');bx(g,.12,.8,1.18,0x30352c,0,.38,0,'metal')}
  else if(kind==='bollard'){const post=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.85,10),M(0x4b5154,'metal'));post.position.y=.42;g.add(post);const base=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.1,10),M(0x2f3437,'metal'));base.position.y=.08;g.add(base)}
  else if(kind==='sign'){bx(g,.12,7.4,.12,0x454b4f,0,3.7,0,'metal');const fg=new THREE.Group();fg.position.set(0,6.55,0);g.add(fg);bx(fg,2.5,1.25,.06,0xb32626,1.22,0,0,'paint');const tip=new THREE.Mesh(new THREE.ConeGeometry(.16,.42,8),M(0xd1bd72,'metal'));tip.position.set(0,7.58,0);g.add(tip)}
  else if(kind==='sandbag'){for(const xx of[-.8,0,.8])bx(g,.72,.38,.48,0x9b8a68,xx,.2,0,'masonry');for(const xx of[-.4,.4])bx(g,.72,.38,.48,0xa39372,xx,.52,0,'masonry')}
  else if(kind==='fuel'){const tank=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,2.2,12),M(0x69706f,'metal'));tank.rotation.z=Math.PI/2;tank.position.y=.9;g.add(tank);for(const xx of[-.82,.82])bx(g,.12,1.15,.9,0x414647,xx,.62,0,'metal')}
  else if(kind==='lamp'){bx(g,.14,4.2,.14,0x454b4f,0,2.1,0,'metal');bx(g,.7,.22,.45,0xe7d68a,0,4.15,0,'paint')}
  else if(kind==='generator'){bx(g,7,.4,4.5,0x6d7369,0,.2,0,'metal');bx(g,5,2.5,3,0x57694f,0,1.65,0,'metal');for(let k=-2;k<=2;k++)bx(g,.12,1.6,.06,0x29383a,k*.55,1.75,1.53,'metal');bx(g,.25,3,.25,0x41484b,1.5,3.05,-.7,'metal')}
  else if(kind==='net'){for(const xx of[-1.2,1.2])bx(g,.12,2.1,.12,0x4d5356,xx,1.05,0,'metal');for(let yy=.45;yy<2;yy+=.42)bx(g,2.5,.035,.035,0x5b6062,0,yy,0,'metal');for(let xx=-1.05;xx<=1.05;xx+=.42)bx(g,.035,1.65,.035,0x5b6062,xx,1.2,0,'metal')}
  world.add(g);staticDecorRoots.push(g);return g
};
const compoundPad=(x,z,w,d,c=0x77736c)=>{
  if(seedSearchMode){compoundClear.push({x,z,r:Math.hypot(w,d)*.55});return {rotation:{y:0}}}
  const material=M(c,'masonry').clone();material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;
  const geometry=new THREE.PlaneGeometry(w,d);geometry.rotateX(-Math.PI/2);
  const o=new THREE.Mesh(geometry,material);o.position.set(x,hAt(x,z)+.06,z);world.add(o);staticDecorRoots.push(o);compoundClear.push({x,z,r:Math.hypot(w,d)*.55});return o;
};
const landingPad=(x,z,size=30,rot=0)=>{
  if(seedSearchMode){compoundClear.push({x,z,r:size*.72});return {rotation:{y:rot}}}
  const y=hAt(x,z)+.025,g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;
  const base=new THREE.Mesh(new THREE.BoxGeometry(size,.12,size),M(0x666b6d,'masonry'));g.add(base);
  const w=Math.max(1.1,size*.07),L=size*.45;bx(g,w,.035,L,0xf2f2e9,-L*.28,.09,0,'paint');bx(g,w,.035,L,0xf2f2e9,L*.28,.09,0,'paint');bx(g,L*.62,.035,w,0xf2f2e9,0,.09,0,'paint');
  world.add(g);staticDecorRoots.push(g);compoundClear.push({x,z,r:size*.72});return g
};
const compoundPath=(points,width=4,color=0x8a795e)=>{
  pathRoutes.push({points,width,color});
  const curve=window.HUNTER_COMPOUND_PATHS.smoothPath(points,width);
  for(let i=1;i<curve.length;i++){const a=curve[i-1],b=curve[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3));for(let k=0;k<=n;k++){const t=k/n;compoundClear.push({x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,r:width*.8+2})}}
};
const compoundPier=(x1,z1,x2,z2,width=4.2,accessRamp=true)=>{
  const dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz);if(L<2)return;
  const ux=dx/L,uz=dz/L,px=-uz,pz=ux,n=Math.max(1,Math.ceil(L/5));
  // Només el tram longitudinal que arrenca de la costa té rampa.
  // Els caps transversals de les T són plataformes, mai rampes de 34 m d'ample.
  let ramp=null;
  if(accessRamp&&L>width){
    let rampLength=12,rampGround=null;
    // Allargar la rampa si els primers 12 m encara són dins l'aigua.
    for(let d=12;d<=40;d+=2){
      const shoreH=hAt(x1-ux*d,z1-uz*d);
      if(shoreH>.25){rampLength=d;rampGround=shoreH+.08;break}
    }
    if(rampGround!==null){
      ramp={x:x1,z:z1,nx:-ux,nz:-uz,length:rampLength,
        width:width-.25,bottom:rampGround,top:PIER_DECK_Y,ramp:true,pierAccess:true};
      stairs.push(ramp);
    }
  }
  if(seedSearchMode){
    for(let i=0;i<n;i++){
      const m=(i+.5)/n,seg=L/n,mx=x1+dx*m,mz=z1+dz*m;
      piers.push({x:mx,z:mz,ux,uz,px,pz,length:seg+.12,width,y:PIER_DECK_Y});
      compoundClear.push({x:mx,z:mz,r:width*.8+1.5});
    }
    return;
  }
  if(ramp){
    const rampMidX=x1-ux*ramp.length/2,rampMidZ=z1-uz*ramp.length/2,
          rise=ramp.top-ramp.bottom,
          rampMesh=new THREE.Mesh(new THREE.BoxGeometry(ramp.width,.22,Math.hypot(ramp.length,rise)),
            M(0x957858,'paint'));
    rampMesh.position.set(rampMidX,(ramp.bottom+ramp.top)/2-.11,rampMidZ);
    // Evitar roll en rampes diagonals: yaw més inclinació longitudinal.
    rampMesh.rotation.set(-Math.atan2(rise,ramp.length),Math.atan2(ux,uz),0,'YXZ');
    world.add(rampMesh);staticDecorRoots.push(rampMesh);
  }
  const yaw=Math.atan2(dx,dz);
  for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n,m=(a+b)/2,seg=L/n,mx=x1+dx*m,mz=z1+dz*m,y=PIER_DECK_Y-.14;
    const deck=new THREE.Mesh(new THREE.BoxGeometry(width,.28,seg+.12),M(0x816346,'paint'));deck.position.set(mx,y,mz);deck.rotation.y=yaw;world.add(deck);staticDecorRoots.push(deck);piers.push({x:mx,z:mz,ux,uz,px,pz,length:seg+.12,width,y:y+.14});
    // Els pilons decoratius no bloquegen la circulació; no hi ha
    // barana contínua en les unions en T ni als costats del pantalà.
    for(const side of[-1,1]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,3.35,8),M(0x48433e,'metal'));post.position.set(mx+px*side*(width*.44),PIER_DECK_Y-1.15,mz+pz*side*(width*.44));world.add(post);staticDecorRoots.push(post)}
    compoundClear.push({x:mx,z:mz,r:width*.8+1.5})
  }
  for(const side of[-1,1]){const b=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,.9,8),M(0x3e4447,'metal'));b.position.set(x2+px*side*(width*.35),PIER_DECK_Y+.26,z2+pz*side*(width*.35));world.add(b);staticDecorRoots.push(b)}
};
const findPortWater=function* (q){let checkpointUnits=0;for(let a=0;a<32;a++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const aa=a*Math.PI/16;for(let d=28;d<Math.max(100,q.r||180);d+=8){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const wx=q.x+Math.cos(aa)*d,wz=q.z+Math.sin(aa)*d;if(rawHAt(wx,wz)<-3&&rawHAt(wx+Math.cos(aa)*12,wz+Math.sin(aa)*12)<-3)return{x:wx,z:wz,hd:Math.atan2(-Math.cos(aa),-Math.sin(aa)),aa}}}return null};
const findPortSite=function* (island,tries=18){let checkpointUnits=0;for(let n=0;n<tries;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const q=(yield* landSteps(island,700,1));if(!q)continue;q.r=island.r;const portBest=(yield* findPortWater(q));if(portBest)return{...q,portBest}}return null};
const makeStandalonePier=function* (q){let checkpointUnits=0;const best=q.portBest||(yield* findPortWater(q));if(!best)return false;const dx=best.x-q.x,dz=best.z-q.z,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L;let shore=null;for(let d=3;d<L;d+=2.5){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const sx=q.x+ux*d,sz=q.z+uz*d;if(rawHAt(sx,sz)<.35){shore={x:sx-ux*1.8,z:sz-uz*1.8};break}}if(!shore)return false;const pierLen=Math.min(34,Math.max(14,L-5)),end={x:shore.x+ux*pierLen,z:shore.z+uz*pierLen};compoundPier(shore.x,shore.z,end.x,end.z,3.6);for(const side of[-1,1]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const px=-uz,pz=ux;compoundProp('bollard',end.x+px*side*1.1,end.z+pz*side*1.1,0)}compoundClear.push({x:q.x,z:q.z,r:18});return true};
const phase3Options={pad:compoundPad,path:compoundPath,pier:compoundPier,prop:compoundProp,vehicles:compoundVehicles,heliportSites,rocketAssigned:false};
const baseCompound=(yield* buildApprovedCompoundSteps(window.HUNTER_CHOOSE_COMPOUND('base',R),pa,phase3Options));
const hqCompound=(yield* buildApprovedCompoundSteps(window.HUNTER_CHOOSE_COMPOUND('hq',R),pb,phase3Options));
markBuildStage('initialCompounds');
yield {stage:'Base i quarter general',completed:1,total:1};
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
const compoundCenters=[
  {x:pa.x,z:pa.z,r:baseCompound.r,type:'base'},
  {x:pb.x,z:pb.z,r:hqCompound.r,type:'hq'}
];
const typeId=t=>({avancada:'outpost',garatge:'hangar'}[t]||t);
const compoundRadiusCache=new Map();
const compoundRadius=type=>{
  if(!compoundRadiusCache.has(type))compoundRadiusCache.set(type,
    Math.max(COMPOUND_RADII[type]||58,...window.HUNTER_RUNTIME_LAYOUTS.filter(l=>l.type===typeId(type)).map(layoutRadius)));
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
// Reserve the rescue opportunity first. Its existence is a world invariant,
// while entering it and rescuing the prisoners remain optional for the player.
const civilOptions={pad:compoundPad,path:compoundPath,pier:compoundPier,prop:compoundProp,vehicles:compoundVehicles,heliportSites,rocketAssigned:true};
const prisonLayout=window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.type==='prison-camp');
if(!prisonLayout)throw new Error('Invariant del camp: manca el disseny del camp de presoners');
const prisonPlan=yield* planPrisonCampSteps(prisonLayout,{
  islandList:islands,baseIsland:A,hqIsland:Bi,heightAt:rawHAt,halfSize:H,
  siteClear:q=>compoundSiteClear('prison-camp',q),
  createSupportIsland:()=>{
    const radius=320,influence=radius*2;
    // genIslands puts A/Bi >= 1414 m from the origin on scale 1, and
    // landSteps moves <= 510 m. Their closest possible site is > 904 m.
    // 640 m of island influence + the largest current HQ reserve + 34 m
    // remains below that distance. Check the actual data for future layouts.
    if(H<=influence+120||compoundCenters.some(c=>Math.hypot(c.x,c.z)<=influence+c.r+COMPOUND_GAP))
      throw new Error('Invariant del camp: l’origen no permet una illa de reserva separada de la base i del quarter general');
    const island={x:0,z:0,r:radius,peakX:0,peakZ:0,prisonCampSupport:true};
    islands.push(island);rebuildIslandGrid();return island;
  }
});
const prisonCamp=yield* buildApprovedCompoundSteps(prisonLayout,prisonPlan.site,civilOptions);
prisonCamp.islandIndex=islands.indexOf(prisonPlan.island);
prisonCamp.fallbackIsland=prisonPlan.island===A?'base':prisonPlan.island===Bi?'hq':null;
prisonCamp.placement=prisonPlan.placement;prisonCamp.terrainSurvey=prisonPlan.terrain;
const prisonBounds=prisonCampFootprint(prisonLayout),prisonTr=compoundTransform(prisonCamp,prisonCamp.angle),
  prisonEscape=prisonLayout.escapeRoute.map(p=>{const q=prisonTr(...p);return{x:q[0],z:q[1]}}),
  escapeEnd=prisonTr(0,prisonBounds.escapeEnd);
// The standard pad ends at z=69. Level the complete evacuation, including all
// farmer lanes and a runout, to avoid the old final 17 m becoming a cliff.
addLevelArea(prisonCamp.x,prisonCamp.z+(prisonBounds.padHalfDepth+prisonBounds.escapeEnd)/2,
  28,prisonBounds.escapeEnd-prisonBounds.padHalfDepth,prisonPlan.site.h,0,18);
for(const p of [...prisonEscape,{x:escapeEnd[0],z:escapeEnd[1]}])compoundClear.push({x:p.x,z:p.z,r:14});
const mechanicSpec=prisonLayout.prisoners.find(p=>p.role==='mechanic'),
  mechanicPoints=[[mechanicSpec.x,mechanicSpec.z],...(prisonLayout.mechanicRoute||[
    [prisonLayout.rescuePoint.x,prisonLayout.rescuePoint.z],
    [prisonLayout.mechanicStation.x,prisonLayout.mechanicStation.z]
  ])].map(p=>{const q=prisonTr(...p);return{x:q[0],z:q[1]}});
const prisonCorridors=[];
for(const [points,width]of[[[...prisonEscape,{x:escapeEnd[0],z:escapeEnd[1]}],6],[mechanicPoints,2]])
  for(let i=1;i<points.length;i++)prisonCorridors.push({a:points[i-1],b:points[i],width});
const prisonCampCorridorClear=(x,z,padding=0)=>prisonCorridors.every(c=>prisonCampSegmentDistance(x,z,c.a,c.b)>c.width+padding);
const prisonCampRoadClear=points=>{
  for(let i=1;i<points.length;i++)if(prisonCampSegmentDistance(prisonCamp.x,prisonCamp.z,points[i-1],points[i])<=prisonCamp.r+18)return false;
  return true;
};
registerCompound('prison-camp',prisonPlan.site);
world.userData.prisonCamp=prisonCamp;
world.userData.prisonCampReservation={x:prisonCamp.x,z:prisonCamp.z,r:prisonCamp.r,
  corridors:prisonCorridors.map(c=>({...c,a:{...c.a},b:{...c.b}}))};
buildCounters.prisonCampCandidates=prisonPlan.candidates;buildCounters.prisonCamps=1;
markBuildStage('prisonCamp');
yield {stage:'Camp de presoners',completed:1,total:1};
// Mateixa validació espacial que findRedesignedPort, però abandona
// cada emplaçament a la primera comprovació impossible. És només un
// filtre: la funció original encara confirma els ports acceptats.
const portSiteFeasible=function* (q){let checkpointUnits=0;
  for(let turn=0;turn<4;turn++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const angle=turn*Math.PI/2,point=compoundTransform(q,angle);
    for(let d=16;d<Math.max(180,(q.r||180)*1.4);d+=8){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      const [x,z]=point(0,d);if(rawHAt(x,z)>.3)continue;
      for(const offset of[-8,0,8]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
        const [cx,cz]=point(0,d+offset),site={x:cx,z:cz,h:.86,angle,r:q.r},
              tr=compoundTransform(site,angle);
        if(Math.abs(cx)>H-100||Math.abs(cz)>H-100)continue;
        let valid=true;
        for(const lx of[-52,-26,0,26,52]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
          for(const lz of[-60,-35,-10]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
            const p=tr(lx,lz);
            if(rawHAt(...p)<.1){valid=false;break}
          }
          if(!valid)break
        }
        if(!valid)continue;
        coastTest:for(const [lx,lz] of[[-13,31],[15,26],[35,34]])
          {if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};for(const dx of[-7,0,7]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};for(let dz=-16;dz<=52;dz+=4){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
            const p=tr(lx+dx,lz+dz);
            if(rawHAt(...p)>-2.2){valid=false;break coastTest}
          }}}
        if(valid)return true;
      }
      if(rawHAt(x,z)<-15)break;
    }
  }
  return false;
};
const compound=function* (type,q){let checkpointUnits=0;
  const approvedId={avancada:'outpost',garatge:'hangar',port:'port',heliport:'heliport',polvori:'polvori',comunicacions:'comunicacions'}[type];
  if(approvedId){
    if(type==='port'&&!q.portPrepared){if(!(yield* portSiteFeasible(q)))return false;q=(yield* findRedesignedPortSteps(q));if(!q)return false}
    if(!compoundSiteClear(type,q,0))return false;
    let layout=window.HUNTER_CHOOSE_COMPOUND(approvedId,R);
    if(type==='port'&&!coastalLayoutFits(layout,q)){layout=window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.type==='port'&&l.variant===1);if(!coastalLayoutFits(layout,q))return false;}
    if(type!=='port'){const r=Math.max(...layout.size)/2;for(const dx of[-r,0,r]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};for(const dz of[-r,0,r]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};if(rawHAt(q.x+dx,q.z+dz)<.1)return false;}}}
    (yield* buildApprovedCompoundSteps(layout,q,{pad:compoundPad,path:compoundPath,pier:compoundPier,prop:compoundProp,vehicles:compoundVehicles,heliportSites,rocketAssigned:compoundVehicles.some(v=>v.t==='llanxa_coets')}));
    registerCompound(type,q);return true;
  }
  return false;
};
const usedPortIslands=new Set();
const candidateIslands=islands.filter(i=>i!==A&&i!==Bi).slice().sort(()=>R()-.5),usedSpecialIslands=new Set();
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
const dockLayout=window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.id==='civil-dock'),terminalLayout=window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.id==='ferry-terminal');
const terminalRecords=[];
let connection=null;
const exit=baseCompound.entrances[0],roadStart={x:exit[0],z:exit[1]};
const initialDock=(yield* findCoastalLayoutSteps(dockLayout,{...A},function*(q){let checkpointUnits=0;
 if(!compoundSiteClear('civil-dock',q))return false;
 const end=compoundTransform(q,q.angle)(0,-dockLayout.size[1]/2),points=(yield* solveCoastRoadSteps(roadStart,{x:end[0],z:end[1]}));
 if(!points||!prisonCampRoadClear(points))return false;connection=points;return true;
}));
if(initialDock){const c=(yield* buildApprovedCompoundSteps(dockLayout,initialDock,civilOptions));registerCompound('civil-dock',initialDock);(yield* buildCoastRoadSteps(connection,compoundPath));world.userData.baseCoast.dockId=c.layoutId;world.userData.baseCoast.dock={x:c.x,z:c.z};}
else world.userData.baseCoast={unavailable:true,reason:'No walkable coastal corridor for this base site'};
for(const sector of activeSectors){
  let built=0;
  for(const island of islandsInSector(sector).filter(i=>i!==Bi).sort((a,b)=>b.r-a.r)){
    if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    if(built>=2)break;
    const site=(yield* findCoastalLayoutSteps(terminalLayout,island,q=>sectorMatches(q.x,q.z,sector)&&compoundSiteClear('ferry-terminal',q)));
    if(!site)continue;
    const c=(yield* buildApprovedCompoundSteps(terminalLayout,site,civilOptions));
    c.islandIndex=islands.indexOf(island);terminalRecords.push(c);registerCompound('ferry-terminal',site);built++;
  }
}
for(const sector of activeSectors){
  let villages=0,civilDocks=initialDock&&sectorMatches(initialDock.x,initialDock.z,sector)?1:0;
  for(const island of candidateIslands.filter(i=>sectorMatches(i.x,i.z,sector))){
    if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    if(villages<2){
      const types=['hut-settlement-small','hut-settlement','hut-settlement-large'],chosen=types[Math.floor(R()*3)],l=window.HUNTER_RUNTIME_LAYOUTS.find(l=>l.id===chosen);
      for(let tries=0;tries<6;tries++){
        if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
        const q=(yield* landSteps(island,250,1));if(!q||!sectorMatches(q.x,q.z,sector)||!compoundSiteClear(l.id,q))continue;
        const r=Math.max(...l.size)/2;
        if([-r,0,r].some(dx=>[-r,0,r].some(dz=>rawHAt(q.x+dx,q.z+dz)<.3)))continue;
        (yield* buildApprovedCompoundSteps(l,q,civilOptions));registerCompound(l.id,q);villages++;break;
      }
    }
    if(civilDocks<2){
      const q=(yield* findCoastalLayoutSteps(dockLayout,island,p=>sectorMatches(p.x,p.z,sector)&&compoundSiteClear('civil-dock',p)));
      if(q){(yield* buildApprovedCompoundSteps(dockLayout,q,civilOptions));registerCompound('civil-dock',q);civilDocks++;}
    }
    if(villages>=2&&civilDocks>=2)break;
  }
}
markBuildStage('civilCompoundsAndCoast');
yield {stage:'Poblats i costa',completed:1,total:1};
for(const sector of activeSectors){
  (yield* forceReserve('garatge',190,sector));
  (yield* forceReserve('avancada',180,sector));
  (yield* forceReserve('polvori',190,sector));
  (yield* forceReserve('comunicacions',190,sector));
}
const reserveHeliportFallback=function* (sector=null){let checkpointUnits=0;
  const all=islands.filter(i=>i!==Bi&&sectorMatches(i.x,i.z,sector)).slice().sort(()=>R()-.5);
  for(const i of all){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    for(let n=0;n<28;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      const q=(yield* landSteps(i,1200,1));if(!q||!sectorMatches(q.x,q.z,sector))continue;
      if(Math.hypot(q.x-pb.x,q.z-pb.z)<260||Math.hypot(q.x-pa.x,q.z-pa.z)<120)continue;
      if(!compoundSiteClear('heliport',q,120))continue;
      q.r=i.r;if((yield* compound('heliport',q)))return q;
    }
  }
  return null;
};
let heliportsMade=0;
for(const sector of activeSectors)for(let n=0;n<2;n++){
  if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
  const q=(yield* forceReserve('heliport',n?160:210,sector))||(yield* reserveHeliportFallback(sector));
  if(q)heliportsMade++;
}
markBuildStage('militaryCompounds');
yield {stage:'Complexos militars',completed:1,total:1};
let guaranteedPorts=0,fastPortCandidates=0,fastPortAccepted=0;
for(const sector of activeSectors){
  const pool=candidateIslands.filter(i=>sectorMatches(i.x,i.z,sector));
  let made=0;
  for(const i of pool){
    if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    if(made>=2)break;if(usedSpecialIslands.has(i))continue;
    const r=i.r*.24,anchors=[[i.x,i.z],[i.x+r,i.z],[i.x-r,i.z],[i.x,i.z+r],[i.x,i.z-r]];
    for(const [x,z] of anchors){
      if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      fastPortCandidates++;
      const site=(yield* findRedesignedPortSteps({x,z,r:i.r}));
      if(!site||!sectorMatches(site.x,site.z,sector)||!compoundSiteClear('port',site,180))continue;
      if((yield* compound('port',{...site,portPrepared:true}))){
        usedPortIslands.add(i);made++;guaranteedPorts++;fastPortAccepted++;break;
      }
    }
  }
  for(const i of pool){
    if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    if(made>=2)break;if(usedSpecialIslands.has(i)||usedPortIslands.has(i))continue;
    for(let attempt=0;attempt<4;attempt++){
      const q=(yield* findPortSite(i,6));
      if(!q||!sectorMatches(q.x,q.z,sector)||!compoundSiteClear('port',q,180))continue;
      if((yield* compound('port',q))){usedPortIslands.add(i);made++;guaranteedPorts++;break;}
    }
  }
  if(made<2)for(const i of pool){
    if(made>=2)break;
    if(usedSpecialIslands.has(i)||usedPortIslands.has(i))continue;
    const q=(yield* findPortSite(i,32));
    if(q&&sectorMatches(q.x,q.z,sector)&&compoundSiteClear('port',q,110)&&(yield* compound('port',q))){
      usedPortIslands.add(i);made++;guaranteedPorts++;
    }
  }
}
buildCounters.guaranteedPorts=guaranteedPorts;
buildCounters.fastPortCandidates=fastPortCandidates;
buildCounters.fastPortAccepted=fastPortAccepted;
markBuildStage('guaranteedPorts');
yield {stage:'Ports',completed:1,total:1};
for(const i of islands){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};if(i===A||i===Bi||usedPortIslands.has(i)||usedSpecialIslands.has(i))continue;const roll=R();let type=roll<.25?'avancada':roll<.5?'garatge':roll<.72?'polvori':roll<.86?'comunicacions':'port',q=null;
for(let n=0;n<10&&!q;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const c=(yield* landSteps(i,700,1));if(c&&compoundSiteClear(type,c,150))q=c}if(!q)continue;q.r=i.r;
if(type==='port'){const pq=(yield* findPortSite(i,14));if(pq&&compoundSiteClear('port',pq,150)){q=pq}else type=R()<.5?'avancada':'polvori'}
(yield* compound(type,q));
if(i.r>520&&R()<.22){const type2=R()<.6?'garatge':'avancada';let q2=null;for(let n=0;n<14&&!q2;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const c=(yield* landSteps(i,800,1));if(c&&Math.hypot(c.x-q.x,c.z-q.z)>190&&compoundSiteClear(type2,c,150))q2=c}if(q2){q2.r=i.r;(yield* compound(type2,q2))}}};
markBuildStage('remainingCompounds');
yield {stage:'Assentaments',completed:1,total:1};
let standalonePiers=0;
for(const sector of activeSectors){
  let made=0,target=3+Math.floor(R()*3);
  for(const i of candidateIslands.filter(i=>sectorMatches(i.x,i.z,sector))){
    if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    if(made>=target)break;if(usedPortIslands.has(i))continue;
    const q=(yield* findPortSite(i,12));
    if(!q||!sectorMatches(q.x,q.z,sector)||!compoundSiteClear('port',q,110)||
       compoundClear.some(c=>Math.hypot(q.x-c.x,q.z-c.z)<80))continue;
    if((yield* makeStandalonePier(q))){made++;standalonePiers++;}
  }
}
markBuildStage('civilianPiers');
yield {stage:'Molls',completed:1,total:1};
if(seedSearchMode&&seedSearchCategoryEl.value==='compound'){
  seedCompounds=compoundCenters.map(c=>({type:c.type,x:c.x,z:c.z}));
  P.base={x:pa.x,z:pa.z};return;
}
const terrainStarted=performance.now();
// La cerca comprova exactament el mateix món determinista, però no necessita
// renderitzar terra, preparar GPU ni calcular el fons marí a cada candidat.
const terrain=seedSearchMode?null:yield* window.HUNTER_TERRAIN.createSteps(THREE,{size:S,segments:SEG,heightAt:hAt,material:MAT.terrain(),parent:world,startX:pa.x,startZ:pa.z,lowQuality:!visualQuality.shadows,quality:qualityName,shadows:visualQuality.shadows,
  cutouts:activeBunker?[{x:activeBunker.x,z:activeBunker.z,angle:activeBunker.angle??-(activeBunker.o?.rotation.y??0),halfWidth:20,halfDepth:17}]:[]});
if(terrain){terrainStream=terrain;world.add(terrain.mesh,window.HUNTER_TERRAIN.createBorder(THREE,{size:S,halfSize:H}))}
const initialTerrainMs=performance.now()-terrainStarted;
markBuildStage('terrain');
yield {stage:'Terreny inicial',completed:1,total:1};
const seabedStarted=performance.now();
if(!seedSearchMode)yield* water.setWorldSizeSteps(S);
const seabedMs=performance.now()-seabedStarted,vegetationStarted=performance.now();
markBuildStage('seabed');
yield {stage:'Fons marí',completed:1,total:1};
(yield* vegetateSteps(pa));if(seedSearchMode)fa=[];else (yield* spawnFaunaSteps());
const vegetationMs=performance.now()-vegetationStarted;
markBuildStage('vegetationAndFauna');
yield {stage:'Vegetació i fauna',completed:1,total:1};HQ={x:hqCompound.buildings[0].x,z:hqCompound.buildings[0].z};
// Small maps keep three HQ candidates. Large maps use nine: three grounded
// locations in each non-starting quadrant, including the actual HQ.
// No draws from the shared R() sequence: same world seed, same geography.
const startingSector=mapSector(pa.x,pa.z),actualSector=mapSector(HQ.x,HQ.z);
const eligibleHQSites=sector=>{
  const complexes=world.userData.compounds.filter(c=>c.id!=='hq'&&c.id!=='base'&&
    !c.layout?.friendly&&!c.layout?.civilian&&sectorMatches(c.x,c.z,sector))
    .map(c=>({x:c.x,z:c.z}));
  const land=[];
  for(const island of islandsInSector(sector).slice().sort((a,b)=>b.r-a.r)){
    land.push({x:island.x,z:island.z});
    if(Number.isFinite(island.peakX)&&Number.isFinite(island.peakZ))
      land.push({x:island.peakX,z:island.peakZ});
    for(const distance of [.28,.52,.72])for(let n=0;n<12;n++){
      const angle=(n*2*Math.PI/12)+(seed%31)*.017,
        x=island.x+Math.cos(angle)*island.r*distance,
        z=island.z+Math.sin(angle)*island.r*distance;
      land.push({x,z});
    }
  }
  return [...complexes,...land].filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&
    sectorMatches(p.x,p.z,sector)&&hAt(p.x,p.z)>1.2&&
    Math.hypot(p.x-pa.x,p.z-pa.z)>240&&Math.hypot(p.x-HQ.x,p.z-HQ.z)>210);
};
const pickHQDecoy=(sector,others=[])=>{
  const pool=eligibleHQSites(sector);
  // Prefer positions with the footprint of a military complex and large gaps
  // between clues; relax gaps only when an unusual seed has little dry land.
  for(const separation of [360,250,160,75]){
    const q=pool.find(p=>others.every(other=>Math.hypot(p.x-other.x,p.z-other.z)>separation));
    if(q)return{x:q.x,z:q.z};
  }
  return null;
};
const hqPositions=[];
if(MAP_SCALE===2){
  for(const sector of [0,1,2,3].filter(n=>n!==startingSector)){
    const group=sector===actualSector?[{x:HQ.x,z:HQ.z,real:true}]:[];
    while(group.length<3){
      const q=pickHQDecoy(sector,[...hqPositions,...group]);
      if(!q)throw new Error('No hi ha prou emplaçaments vàlids per als nou indicis del HQ');
      group.push({...q,real:false});
    }
    hqPositions.push(...group);
  }
}else{
  hqPositions.push({x:HQ.x,z:HQ.z,real:true});
  for(let i=0;i<2;i++){
    const q=pickHQDecoy(null,hqPositions);
    if(!q)throw new Error('No hi ha prou emplaçaments vàlids per als indicis del HQ');
    hqPositions.push({...q,real:false});
  }
}
// Shuffle the clues and the elimination order independently of live AI RNG.
// Exactly six distinct false locations are ruled out, never the true HQ.
const clueRandom=mul((seed^0x5af17e32)>>>0);
for(let i=hqPositions.length-1;i>0;i--){
  const j=Math.floor(clueRandom()*(i+1));
  [hqPositions[i],hqPositions[j]]=[hqPositions[j],hqPositions[i]];
}
hqIntelSites=hqPositions;
hqDiscardIndex=hqIntelSites.findIndex(p=>!p.real);
hqIntelEliminationOrder=hqIntelSites.map((p,i)=>p.real?-1:i).filter(i=>i>=0);
for(let i=hqIntelEliminationOrder.length-1;i>0;i--){
  const j=Math.floor(clueRandom()*(i+1));
  [hqIntelEliminationOrder[i],hqIntelEliminationOrder[j]]=
    [hqIntelEliminationOrder[j],hqIntelEliminationOrder[i]];
}
world.userData.hqIntelCandidates=hqIntelSites.map(p=>({x:p.x,z:p.z,real:p.real}));
world.userData.hqSector=actualSector;
const rb=B.slice(6);
const hq=B[3],gl=(x,z)=>hAt(x,z)>.5&&!treeHit(x,z,2)&&!Wl.some(w=>x>w.x0-2&&x<w.x1+2&&z>w.z0-2&&z<w.z1+2);
const sp2=(t,cx,cz,r0,r1)=>{for(let k=0;k<12;k++){const a=rr(0,6.28),d=rr(r0,r1),x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;if(gl(x,z)&&!world.userData.compounds.some(c=>c.layout.civilian&&Math.hypot(x-c.x,z-c.z)<c.r))return mkEn(t,x,z)}return null};
for(const i of islands){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};if(i===A||i===Bi||R()<.5)continue;const q=(yield* landSteps(i,60));if(!q)continue;for(let k=0;k<1+(R()<.4);k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};sp2('soldat',q.x,q.z,0,10);}if(R()<.25)sp2('torre',q.x,q.z,5,12)};
for(const b of rb){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
  // Civilian houses were already resolved once each while building the
  // settlement; the military random-loot loop must never add to them.
  if(b.civilian)continue;
  const n=R()<.25?0:R()<.6?1:2;
  const pool=['arma','arma','med','expl','granada','granada','disf','mapa','bazooka','franctirador','paracaigudes']
    .filter(t=>lootAllowed(t,b));
  for(let k=0;k<n&&pool.length;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const kind=pool[Math.floor(R()*pool.length)];
    addIt(kind,b);
  }
};
addIt('arma',B[0]);addIt('expl',B[1]);
// El complex inicial ja sol tenir una farmaciola fixa al seu disseny.
// No duplicar-la a les habitacions: màxim una a tota la base.
if(!items.some(it=>it.t==='med'&&it.compound==='base')){
  const firstBaseBuilding=B.find(b=>b.compound==='base'&&!b.hangar);
  if(firstBaseBuilding)addIt('med',firstBaseBuilding);
}
// Les recollides garantides s'han de buscar entre edificis que realment
// acceptin aquell tipus d'objecte: no perdre mapes per haver triat polvorins.
const lootBuildings=t=>rb.filter(b=>!b.civilian&&lootAllowed(t,b));
const sniperSites=lootBuildings('franctirador');
addIt('franctirador',sniperSites[Math.floor(R()*sniperSites.length)]||B[2]);
// Large maps require at least one reachable HQ document in every quadrant.
// Keep other map types distributed by sector, and respect the three-item
// capacity of each building rather than discarding a failed placement.
for(const sector of activeSectors){
  for(const [type,count] of [['mapa',3],['mapa_heli',2],['mapa_tanc',2]]){
    if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const buildings=lootBuildings(type).filter(b=>sectorMatches(b.x,b.z,sector))
      .sort(()=>R()-.5);
    let placed=0;
    for(const b of buildings){
      if(placed>=count)break;
      if(addIt(type,b))placed++;
    }
    // Some random seeds leave every military building full of earlier loot.
    // A sector must still contain a map if its evidence is needed to solve HQ.
    if(type==='mapa'&&MAP_SCALE===2&&!placed){
      for(const b of B.filter(b=>!b.civilian&&!b.hangar&&lootAllowed(type,b)&&
        sectorMatches(b.x,b.z,sector))){
        if(addIt(type,b)){placed++;break;}
      }
      if(!placed)for(const island of islandsInSector(sector)){
        if(placed)break;
        for(let attempt=0;attempt<8;attempt++){
          if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
          const q=(yield* landSteps(island,120,1));
          if(q&&sectorMatches(q.x,q.z,sector)&&addItemAt('mapa',q.x,q.z)){placed++;break;}
        }
      }
    }
  }
}
markBuildStage('enemiesAndLoot');
yield {stage:'Guàrdies i equipament',completed:1,total:1};
if(seedSearchMode&&seedSearchCategoryEl.value==='item'){
  P.base={x:pa.x,z:pa.z};return;
}
P.x=baseCompound.spawn?.x??pa.x;P.z=baseCompound.spawn?.z??pa.z+20;P.hd=0;P.base={x:pa.x,z:pa.z};V=[];cv=null;mm=null;
const add=(t,x,z,a,meta={})=>{
  // Els colors són part de l'estat generat per llavor, no una aleatorietat
  // del renderitzador. La cerca de llavors consumeix les mateixes tirades.
  const civilian=t==='cotxe_civil',bicycle=t==='bici',
    jetski=t==='moto_aquatica',windsurf=t==='windsurf',
    colors=window.HUNTER_CIVILIAN_CARS,
    palette=jetski||windsurf?colors.jetskiColors:colors.colors;
  // Every windsurf gets the same vivid palette as the jet skis, but the
  // start hue is determined by the island seed's base position and each
  // successive windsurf advances by one hue. Crucially, this uses NO
  // additional R() calls, preserving all existing world-generation seeds.
  const windsurfStart=(
    Math.imul(Math.floor(pa.x*10),73856093)^
    Math.imul(Math.floor(pa.z*10),19349663)
  )>>>0;
  const windsurfOrdinal=windsurf?V.reduce((n,v)=>n+(v.t==='windsurf'),0):0;
  const color=windsurf?palette[(windsurfStart%palette.length+windsurfOrdinal)%palette.length].hex:
    (civilian||bicycle||jetski)?palette[Math.floor(R()*palette.length)].hex:undefined;
  // Conservam la tirada de la llavor antiga, però tots els cotxes civils
  // fan servir el model C1A seleccionat (variant 0).
  if(civilian)R();
  const variant=civilian?0:undefined;
  const appearance={color:meta.color??color,variant:meta.variant??variant};
  const o=seedSearchMode?seedVehicleStub(t):mkV(t,appearance),c=VT[t],
    surface=Math.max(0,hAt(x,z));
  const v={t,x,z,hd:a||0,v:0,alt:c.m==='a'?helicopterLandedAltitude({o},surface):surface+.8,
    o,maxLife:c.life??1,life:c.life??1,smokeT:0,...meta};
  if(civilian||bicycle||jetski||windsurf)v.color=appearance.color;
  if(civilian)v.variant=appearance.variant;
  if(t==='heli_combat')v.rockets=6;
  if(t==='llanxa_coets')v.rockets=Infinity;
  if(!seedSearchMode)world.add(o);
  V.push(v);return v;
};
// Cap tanc neutral dins del HQ: els tancs pilotables apareixen
// distribuïts per l'arxipèlag, lluny de la base enemiga.

const near=function* (r,t){let checkpointUnits=0;for(let k=0;k<80;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const x=pa.x+rr(-r,r),z=pa.z+rr(-r,r),h=hAt(x,z);if(prisonCampCorridorClear(x,z,vehicleRadius(t)+2)&&h>1.5&&slope(x,z,h)<2.5&&!B.some(b=>Math.abs(x-b.x)<b.hw+vehicleRadius(t)&&Math.abs(z-b.z)<b.hd+vehicleRadius(t))&&!treeHit(x,z,vehicleRadius(t))&&!V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(t)+vehicleRadius(v.t)+2))return[x,z]}return[pa.x+30,pa.z+30]};
for(const t of ['moto']){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const q=(yield* near(90,t));add(t,q[0],q[1],rr(0,6.28))};
const shores=[];for(let a=0;a<360;a+=12){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};for(let d=10;d<700;d+=10){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const x=pa.x+Math.cos(a*.01745)*d,z=pa.z+Math.sin(a*.01745)*d;if(Math.abs(x)>H-60||Math.abs(z)>H-60)break;if(hAt(x,z)<-2){shores.push({d,x,z,a:a*.01745});break}}}
shores.sort((a,b)=>a.d-b.d);
const launchSpot=shores[0]?{x:shores[0].x,z:shores[0].z,a:shores[0].a}:null;
// Ferris globals: busquem una costa vàlida a qualsevol illa i en triem dues de ben separades.
const ferrySpotForIsland=function* (island,islandIndex){let checkpointUnits=0;
  const start=R()*Math.PI*2;
  for(let n=0;n<36;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const a=start+n*Math.PI*2/36,ux=Math.cos(a),uz=Math.sin(a);
    let touchedLand=false;
    for(let d=Math.max(24,island.r*.22);d<island.r*1.5;d+=8){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      const sx=island.x+ux*d,sz=island.z+uz*d,h=hAt(sx,sz);
      if(h>.2){touchedLand=true;continue}
      if(!touchedLand)continue;
      if(h<-1.7){
        const x=sx+ux*14,z=sz+uz*14;
        if(Math.abs(x)>H-28||Math.abs(z)>H-28||hAt(x,z)>-1.25)break;
        return{x,z,hd:Math.atan2(island.x-x,island.z-z),islandIndex,islandX:island.x,islandZ:island.z}
      }
      if(h<-5)break
    }
  }
  return null
};
const ferryCandidates=[];
for(let islandIndex=0;islandIndex<islands.length;islandIndex++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
  const q=(yield* ferrySpotForIsland(islands[islandIndex],islandIndex));
  if(q)ferryCandidates.push(q)
}
// Two ferries per sector, primarily at its own terminals, never at the expense
// of other quadrants. The small map follows the same two-ferry rule.
const ferrySpots=[];
for(const sector of activeSectors){
  const options=terminalRecords.filter(c=>sectorMatches(c.x,c.z,sector)).map(c=>{
    const v=c.vehicles.find(v=>v.t==='ferry'),island=islands[c.islandIndex];
    return v?{...v,islandIndex:c.islandIndex,islandX:island.x,islandZ:island.z,terminal:c}:null;
  }).filter(Boolean);
  const selected=options.slice(0,2);
  const spare=ferryCandidates.filter(q=>sectorMatches(q.x,q.z,sector));
  for(const q of spare){
    if(selected.length>=2)break;
    if(selected.some(f=>f.islandIndex===q.islandIndex))continue;
    selected.push(q);
  }
  for(const q of selected)ferrySpots.push(q);
}
markBuildStage('ferrySiteSearch');
yield {stage:'Terminals dels ferris',completed:1,total:1};
ferrySpots.forEach(q=>{const f=add('ferry',q.x,q.z,q.hd,{coastal:true,guaranteed:true,ferryIslandIndex:q.islandIndex,ferryIslandX:q.islandX,ferryIslandZ:q.islandZ});if(q.terminal){q.terminal.ferry=f;createTerminalRamp(q.terminal,f)}});
// La llanxa inicial comparteix sovint el millor punt de costa amb un ferry.
// Si hi ha solapament, la desplacem 100 m seguint la costa (tangent local), no mar endins.
if(launchSpot){
  let lx=launchSpot.x,lz=launchSpot.z;
  const overlapsFerry=()=>ferrySpots.some(f=>Math.hypot(lx-f.x,lz-f.z)<vehicleRadius('ferry')+vehicleRadius('llanxa')+6);
  if(overlapsFerry()){
    const tx=-Math.sin(launchSpot.a),tz=Math.cos(launchSpot.a);
    const candidates=[
      {x:launchSpot.x+tx*100,z:launchSpot.z+tz*100},
      {x:launchSpot.x-tx*100,z:launchSpot.z-tz*100}
    ];
    const valid=q=>Math.abs(q.x)<H-vehicleRadius('llanxa')-5&&Math.abs(q.z)<H-vehicleRadius('llanxa')-5&&hAt(q.x,q.z)<-1.2;
    const best=candidates.find(valid)||candidates[0];
    lx=best.x;lz=best.z;
  }
  add('llanxa',lx,lz,rr(0,6.28));
}
const clearVehicle=(t,x,z)=>prisonCampCorridorClear(x,z,vehicleRadius(t)+2)&&Math.abs(x)<H-vehicleRadius(t)-5&&Math.abs(z)<H-vehicleRadius(t)-5&&!treeHit(x,z,vehicleRadius(t))&&!V.some(v=>Math.hypot(x-v.x,z-v.z)<vehicleRadius(t)+vehicleRadius(v.t)+5);
// Dos tancs pilotables dins d'hangars per mapa. A la resta, variants
// més lleugeres; conservam les posicions i les portes existents.
const hangarTanks=new Map();let alternateHangar=0;
for(const v of compoundVehicles){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
  if(!v.insideHangar||v.t!=='tanc')continue;
  const sector=MAP_SCALE===2?mapSector(v.x,v.z):0,placed=hangarTanks.get(sector)||0;
  if(placed<2){hangarTanks.set(sector,placed+1);continue}
  v.t=(alternateHangar++%2===0)?'tanqueta':'camio';
}
for(const v of compoundVehicles){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};if(v.t==='ferry')continue;if(VT[v.t]?.m==='w'||VT[v.t]?.m==='wl'){if(hAt(v.x,v.z)<-2&&!V.some(o=>obbOverlap(vehicleBox(v),vehicleBox(o))))add(v.t,v.x,v.z,v.hd,v);continue;}
  const r=vehicleRadius(v.t),buildingClear=v.insideHangar?true:!B.some(b=>Math.abs(v.x-b.x)<b.hw+r&&Math.abs(v.z-b.z)<b.hd+r),clear=!treeHit(v.x,v.z,r*.7)&&buildingClear&&!V.some(o=>Math.hypot(v.x-o.x,v.z-o.z)<r+vehicleRadius(o.t)+3);
  if(clear||v.insideHangar)add(v.t,v.x,v.z,v.hd,v)
};
const coastalWaterTypes=['barca_rems','windsurf','moto_aquatica','llanxa'];
const pickCoastalWaterType=()=>{const q=R();return q<.4?'barca_rems':q<.72?'windsurf':q<.88?'moto_aquatica':'llanxa'};
const beachedWaterSpot=function* (island,t){let checkpointUnits=0;
  const r=vehicleRadius(t),start=R()*Math.PI*2;
  for(let n=0;n<32;n++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const a=start+n*Math.PI*2/32,ux=Math.cos(a),uz=Math.sin(a);
    let wasLand=false;
    for(let d=Math.max(18,island.r*.18);d<island.r*1.35;d+=5){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      const x=island.x+ux*d,z=island.z+uz*d,h=hAt(x,z);
      if(h>.15){wasLand=true;continue}
      if(!wasLand)continue;
      if(t==='windsurf'&&h<=.15){
        // A parked windsurf is genuinely on the sandy shore, not 1–3 m
        // underwater as the other shore boats can be. Binary-search the
        // land/sea crossing so the fallen mast lies over dry beach.
        let lo=d-5,hi=d;
        for(let step=0;step<11;step++){
          const mid=(lo+hi)/2;
          if(hAt(island.x+ux*mid,island.z+uz*mid)>.32)lo=mid;
          else hi=mid;
        }
        const beachD=(lo+hi)/2,x=island.x+ux*beachD,z=island.z+uz*beachD,
          surface=hAt(x,z);
        if(surface>-.05&&surface<.8&&
           Math.abs(x)<H-r-5&&Math.abs(z)<H-r-5&&
           !V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(v.t)+r+4)&&
           !B.some(b=>Math.abs(x-b.x)<b.hw+r+3&&Math.abs(z-b.z)<b.hd+r+3)){
          return {x,z,hd:Math.atan2(ux,uz)+rn(-.18,.18)};
        }
      }
      if(h<-1.25&&h>-3.15){
        const clear=Math.abs(x)<H-r-5&&Math.abs(z)<H-r-5&&!V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(v.t)+r+4)&&!B.some(b=>Math.abs(x-b.x)<b.hw+r+3&&Math.abs(z-b.z)<b.hd+r+3);
        if(clear){
          // Proa aproximadament cap a terra: aparença de vehicle encallat/varat a la riba.
          const hd=Math.atan2(ux,uz)+rn(-.18,.18);
          return{x,z,hd};
        }
      }
      if(h<-3.15)break;
    }
  }
  return null
};
let beachedWaterCount=0;
for(const island of islands){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
  if(R()>=.75)continue;
  const t=pickCoastalWaterType(),q=(yield* beachedWaterSpot(island,t));
  if(q){add(t,q.x,q.z,q.hd,{beached:true,coastal:true});beachedWaterCount++}
};

markBuildStage('coastalVehicles');
yield {stage:'Embarcacions de costa',completed:1,total:1};
heliportSites.forEach((p,i)=>{
  const desired=p.type||(i===1?'heli_combat':'heli');
  // Una plaça ocupada per l'altre tipus d'helicòpter també és ocupada:
  // altrament dues cabines queden superposades i només una és accessible.
  if(clearVehicle(desired,p.x,p.z))add(desired,p.x,p.z,p.hd,{heliport:true,military:true,guaranteed:true});
});
if(heliportSites.length){
  const addClearHeliAtPort=(t,preferred)=>{
    for(let i=0;i<heliportSites.length;i++){
      const p=heliportSites[(preferred+i)%heliportSites.length];
      for(const [d,turn]of[[0,0],[22,Math.PI/2],[22,-Math.PI/2],[30,Math.PI/4],[30,-Math.PI/4],[36,Math.PI]]){
        const a=p.hd+turn,x=p.x+Math.sin(a)*d,z=p.z+Math.cos(a)*d,
              r=vehicleRadius(t);
        if(!clearVehicle(t,x,z)||hAt(x,z)<=1.2||slope(x,z,hAt(x,z))>=3||
           B.some(b=>Math.abs(x-b.x)<b.hw+r&&Math.abs(z-b.z)<b.hd+r))continue;
        add(t,x,z,p.hd,{heliport:true,military:true,guaranteed:true});return true;
      }
    }
    return false;
  };
  if(!V.some(v=>v.t==='heli'))addClearHeliAtPort('heli',0);
  if(!V.some(v=>v.t==='heli_combat'))addClearHeliAtPort('heli_combat',Math.min(1,heliportSites.length-1));
}
const protectedVehicleSpot=t=>{const r=vehicleRadius(t),ok=(x,z)=>prisonCampCorridorClear(x,z,r+2)&&hAt(x,z)>1.2&&slope(x,z,hAt(x,z))<3&&!treeHit(x,z,r*.7)&&!B.some(b=>Math.abs(x-b.x)<b.hw+r&&Math.abs(z-b.z)<b.hd+r)&&!V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(v.t)+r+3);for(let k=0;k<240;k++){const a=rr(0,Math.PI*2),d=rr(30,58),x=pb.x+Math.cos(a)*d,z=pb.z+Math.sin(a)*d;if(ok(x,z))return{x,z,hd:a+Math.PI}}return null};
const distributedMilitarySpot=function* (t,sector=null){let checkpointUnits=0;const r=vehicleRadius(t),pool=islands.filter(i=>i!==Bi&&sectorMatches(i.x,i.z,sector)).slice().sort(()=>R()-.5),ok=(x,z)=>prisonCampCorridorClear(x,z,r+2)&&Math.hypot(x-pb.x,z-pb.z)>220&&hAt(x,z)>1.2&&slope(x,z,hAt(x,z))<3&&!treeHit(x,z,r*.7)&&!B.some(b=>Math.abs(x-b.x)<b.hw+r&&Math.abs(z-b.z)<b.hd+r)&&!V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(v.t)+r+3);for(const i of pool){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};for(let k=0;k<50;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const q=(yield* landSteps(i,900,1));if(q&&sectorMatches(q.x,q.z,sector)&&ok(q.x,q.z))return{x:q.x,z:q.z,hd:rr(0,Math.PI*2)}}}return null};
const militaryCompoundSpot=function* (t,sector=null){let checkpointUnits=0;
  const r=vehicleRadius(t),sites=world.userData.compounds.filter(c=>
    !c.layout?.friendly&&!c.layout?.civilian&&c.id!=='base'&&c.id!=='port'&&sectorMatches(c.x,c.z,sector));
  for(const site of sites.slice().sort(()=>R()-.5)){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};for(let k=0;k<75;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const a=rr(0,Math.PI*2),d=site.r+rr(8,65),x=site.x+Math.cos(a)*d,z=site.z+Math.sin(a)*d;
    if(!sectorMatches(x,z,sector)||!prisonCampCorridorClear(x,z,r+2)||Math.abs(x)>=H-r-8||Math.abs(z)>=H-r-8||hAt(x,z)<1.2||
       slope(x,z,hAt(x,z))>=3||treeHit(x,z,r*.7)||
       B.some(b=>Math.abs(x-b.x)<b.hw+r&&Math.abs(z-b.z)<b.hd+r)||
       V.some(v=>Math.hypot(x-v.x,z-v.z)<vehicleRadius(v.t)+r+3))continue;
    return{x,z,hd:a+Math.PI};
  }}
  return null;
};
const hardLandVehicleSpot=function* (t,sector=null){let checkpointUnits=0;const r=vehicleRadius(t),ok=(x,z)=>sectorMatches(x,z,sector)&&prisonCampCorridorClear(x,z,r+2)&&Math.abs(x)<H-r-8&&Math.abs(z)<H-r-8&&Math.hypot(x-pb.x,z-pb.z)>220&&hAt(x,z)>1.2&&slope(x,z,hAt(x,z))<4&&!treeHit(x,z,r*.65)&&!B.some(b=>Math.abs(x-b.x)<b.hw+r&&Math.abs(z-b.z)<b.hd+r)&&!V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(v.t)+r+4);for(let k=0;k<1600;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const x=rr(-H+r+10,H-r-10),z=rr(-H+r+10,H-r-10);if(ok(x,z))return{x,z,hd:rr(0,Math.PI*2)}}for(let k=0;k<72;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const a=k*Math.PI/36,d=110+(k%4)*20,x=pa.x+Math.cos(a)*d,z=pa.z+Math.sin(a)*d;if(ok(x,z))return{x,z,hd:a+Math.PI}}return null};
const waterVehicleSpot=function* (t,sector=null){let checkpointUnits=0;const r=vehicleRadius(t),pool=islands.filter(i=>sectorMatches(i.x,i.z,sector)).slice().sort(()=>R()-.5);for(const i of pool){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};for(let tries=0;tries<3;tries++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const q=(yield* findPortSite(i,18));if(!q||!q.portBest)continue;const a=q.portBest.aa,px=-Math.sin(a),pz=Math.cos(a);for(const side of[-1,1]){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const x=q.portBest.x+px*side*(r+4),z=q.portBest.z+pz*side*(r+4);if(sectorMatches(x,z,sector)&&hAt(x,z)<-2&&!V.some(v=>Math.hypot(v.x-x,v.z-z)<vehicleRadius(v.t)+r+3))return{x,z,hd:q.portBest.hd}}}}return null};
const ensureVehicleType=function* (t,sector=null){
  if(V.some(v=>v.t===t&&sectorMatches(v.x,v.z,sector)&&(t!=='heli'||!v.heliport)))return;
  let q=null,c=VT[t];
  if(c.m==='w'||c.m==='wl')q=(yield* waterVehicleSpot(t,sector));
  else if(t==='tanqueta')q=(yield* militaryCompoundSpot(t,sector))||(yield* hardLandVehicleSpot(t,sector));
  else if(['heli','heli_combat','tanc','camio'].includes(t))q=(yield* distributedMilitarySpot(t,sector))||(yield* hardLandVehicleSpot(t,sector));
  else if(sector!=null)q=(yield* hardLandVehicleSpot(t,sector));
  else{const p=(yield* near(120,t));q={x:p[0],z:p[1],hd:rr(0,Math.PI*2)};}
  if(q)add(t,q.x,q.z,q.hd);
};
for(const sector of activeSectors)for(const type of ['llanxa','moto_aquatica','barca_rems','windsurf','hover','cotxe','moto','bici','camio','tanqueta','tanc','heli','heli_combat']){
  if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
  (yield* ensureVehicleType(type,sector));
}
// Dues llanxes llançacoets per mapa. Prioritzam cales i ports propers
// a complexos militars; només si no hi ha aigua apta usam una altra costa.
for(const sector of activeSectors)V.filter(v=>v.t==='llanxa_coets'&&sectorMatches(v.x,v.z,sector)).slice(2).forEach(v=>{const i=V.indexOf(v);if(i>=0)V.splice(i,1);world.remove(v.o)});
const militaryRocketBoatSpot=function* (sector=null){let checkpointUnits=0;
  const r=vehicleRadius('llanxa_coets'),sites=world.userData.compounds.filter(c=>
    !c.layout?.friendly&&!c.layout?.civilian&&c.id!=='base'&&sectorMatches(c.x,c.z,sector));
  sites.sort((a,b)=>Number(!!b.layout?.waterfront)-Number(!!a.layout?.waterfront));
  for(const site of sites){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};for(let k=0;k<32;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const a=k*Math.PI/16+R()*.12,d0=Math.max(16,site.r*.5);
    for(let d=d0;d<Math.min(210,site.r+130);d+=6){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      const x=site.x+Math.cos(a)*d,z=site.z+Math.sin(a)*d;
      if(Math.abs(x)>H-r-8||Math.abs(z)>H-r-8)break;
      if(!sectorMatches(x,z,sector)||hAt(x,z)>-2)continue;
      const bx=x+Math.cos(a)*12,bz=z+Math.sin(a)*12;
      if(hAt(bx,bz)>-1.5)continue;
      if(V.some(v=>Math.hypot(x-v.x,z-v.z)<r+vehicleRadius(v.t)+5))continue;
      return{x,z,hd:Math.atan2(-Math.cos(a),-Math.sin(a))};
    }
  }}
  return null;
};
for(const sector of activeSectors){
  let rocketBoatAttempts=0;
  while(countVehicles('llanxa_coets',sector)<2&&rocketBoatAttempts++<8){
    if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const q=(yield* militaryRocketBoatSpot(sector))||(yield* waterVehicleSpot('llanxa_coets',sector));
    if(!q)break;
    add('llanxa_coets',q.x,q.z,q.hd,{military:true,guaranteed:true});
  }
}
const ensureVehicleCount=function* (t,min,sector=null){
  let guard=0;
  while(countVehicles(t,sector)<min&&guard++<20){
    if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const q=(yield* distributedMilitarySpot(t,sector))||(yield* hardLandVehicleSpot(t,sector));
    if(!q)break;
    add(t,q.x,q.z,q.hd,{military:true,guaranteed:true});
  }
};
const ensureDistributedCount=function* (t,min,sector=null){
  let guard=0;
  while(countVehicles(t,sector)<min&&guard++<20){
    if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const q=t==='tanqueta'?(yield* militaryCompoundSpot(t,sector)):(yield* distributedMilitarySpot(t,sector))||(yield* hardLandVehicleSpot(t,sector));
    if(!q)break;
    add(t,q.x,q.z,q.hd,{military:true,guaranteed:true});
  }
};
for(const sector of activeSectors){
  (yield* ensureVehicleCount('tanc',2,sector));
  (yield* ensureDistributedCount('heli',2,sector));
  (yield* ensureDistributedCount('heli_combat',1,sector));
  (yield* ensureDistributedCount('tanqueta',2,sector));
}
for(const i of islands){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};if(i!==A&&R()<.65){const t=['cotxe','moto','bici'][Math.floor(R()*3)];for(let tries=0;tries<12;tries++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};const q=(yield* landSteps(i,80));if(q&&clearVehicle(t,q.x,q.z)){add(t,q.x,q.z,rr(0,6.28));break}}}};

markBuildStage('guaranteedVehicles');
yield {stage:'Vehicles distribuïts',completed:1,total:1};
// Cotxes civils: aparcats fora dels edificis dels assentaments i les
// terminals de ferri; alguns queden abandonats a l'interior de les illes.
const civilianVehicleClear=(x,z,heading=0)=>{
  const type='cotxe_civil',r=vehicleRadius(type)+1.2;
  if(Math.abs(x)>H-r-5||Math.abs(z)>H-r-5)return false;
  const h=hAt(x,z);
  if(h<1.4||slope(x,z,h)>3.7)return false;
  if(!clearVehicle(type,x,z)||treeHit(x,z,r*.83))return false;
  if(B.some(b=>Math.abs(x-b.x)<b.hw+r&&Math.abs(z-b.z)<b.hd+r))return false;
  if(wallCandidates(x,z,r+2).some(w=>!w.open&&
    x>w.x0-r&&x<w.x1+r&&z>w.z0-r&&z<w.z1+r))return false;
  return true;
};
let civilianNearSites=0,civilianAbandoned=0;
for(const site of compoundCenters.filter(c=>c.type.startsWith('hut-settlement')||c.type==='ferry-terminal')){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
  const count=site.type==='ferry-terminal'?2:1+(R()<.32?1:0),
    offset=R()*Math.PI*2;
  for(let k=0;k<count;k++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    let placed=false;
    // Cercam primer places al costat de les cases, no al perímetre
    // del poblat. Només ampliam el radi si no hi ha cap lloc lliure.
    const isVillage=site.type.startsWith('hut-settlement');
    const radii=isVillage?[10,14,18,23,29,36,44,54]:[18,24,32,42,54];
    for(const distance of radii){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
      if(placed)break;
      for(let a=0;a<24;a++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
        const angle=offset+(a%24)*Math.PI/12+(k*Math.PI*.65),
          x=site.x+Math.cos(angle)*distance,
          z=site.z+Math.sin(angle)*distance;
        if(!civilianVehicleClear(x,z))continue;
        add('cotxe_civil',x,z,angle+Math.PI/2,{civilian:true,parkedAt:site.type});
        civilianNearSites++;placed=true;break;
      }
    }
    if(!placed)break;
  }
}
for(const island of islands){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
  if(island===Bi||island===A||R()>.56)continue;
  for(let attempt=0;attempt<26;attempt++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
    const q=(yield* landSteps(island,160,1));
    if(!q||!civilianVehicleClear(q.x,q.z))continue;
    // L'abandonat no queda enganxat a una altra construcció civil.
    if(compoundCenters.some(c=>
      Math.hypot(q.x-c.x,q.z-c.z)<c.r+26))continue;
    add('cotxe_civil',q.x,q.z,rr(0,Math.PI*2),{civilian:true,abandoned:true});
    civilianAbandoned++;break;
  }
}
world.userData.civilianCars={nearSites:civilianNearSites,abandoned:civilianAbandoned,
  total:civilianNearSites+civilianAbandoned};
markBuildStage('civilianCars');
yield {stage:'Vehicles civils',completed:1,total:1};

for(const sector of activeSectors)(yield* ensureJetSkis(add,sector));
markBuildStage('jetSkis');
yield {stage:'Motos aquàtiques',completed:1,total:1};
// Cotxes militars amb conductor i tirador, com els que custodien la base.
// La ruta connecta accessos reals de dos complexos de la mateixa illa gran.
// Els punts de la carretera resolta eviten que la IA intenti creuar el mar.
function* spawnLandCarPatrols(){let checkpointUnits=0;
 const large=islands.filter(i=>i.r>=800).sort((a,b)=>b.r-a.r);
 const sites=world.userData.compounds.filter(c=>!c.layout?.friendly&&c.id!=='base'&&c.id!=='hq'&&c.id!=='prison-camp');
 const usedRoutes=new Set();
 const routeKey=(a,b)=>[sites.indexOf(a.c),sites.indexOf(b.c)].sort((x,y)=>x-y).join(':');
 const carR=Math.hypot(...VHB.cotxe.map(n=>n*VS.cotxe))/2+.8;
 const clear=(x,z)=>prisonCampCorridorClear(x,z,carR+2)&&Math.abs(x)<H-carR-5&&Math.abs(z)<H-carR-5&&
   hAt(x,z)>1.2&&slope(x,z,hAt(x,z))<5&&!treeHit(x,z,carR)&&
   !wallCandidates(x,z,carR).some(w=>!w.open&&w.playerBlock!==false&&
     x>w.x0-carR&&x<w.x1+carR&&z>w.z0-carR&&z<w.z1+carR)&&
   !B.some(b=>Math.abs(x-b.x)<b.hw+carR&&Math.abs(z-b.z)<b.hd+carR);
 const access=c=>{
   for(const [ex,ez]of c.entrances){
     const dx=ex-c.x,dz=ez-c.z,len=Math.hypot(dx,dz)||1;
     for(const step of[12,20,30,42,55]){
       const x=ex+dx/len*step,z=ez+dz/len*step;
       if(clear(x,z))return{x,z}
     }
   }
   for(let n=0;n<20;n++){
     const a=n*Math.PI/10,x=c.x+Math.cos(a)*(c.r+24),z=c.z+Math.sin(a)*(c.r+24);
     if(clear(x,z))return{x,z}
   }
   return null
 };
 let spawned=0;
 for(const island of large){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
   const eligible=sites.filter(c=>Math.hypot(c.x-island.x,c.z-island.z)<island.r*1.02)
     .map(c=>({c,p:access(c)})).filter(o=>o.p);
   if(eligible.length<2)continue;
   // Triam els complexos més propers amb un corredor transitable per terra.
   // El navegador d'enemics esquiva els arbres i els obstacles puntuals.
   const pairs=[];for(let a=0;a<eligible.length;a++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};for(let b=a+1;b<eligible.length;b++){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
     const p=eligible[a].p,q=eligible[b].p;
     pairs.push({a:eligible[a],b:eligible[b],distance:Math.hypot(p.x-q.x,p.z-q.z)})
   }}
   // Prioritat als dos complexos militars; si només n'hi ha un a l'illa,
   // la patrulla també pot connectar-lo amb un port o un nucli civil.
   pairs.sort((a,b)=>Number(usedRoutes.has(routeKey(a.a,a.b)))-Number(usedRoutes.has(routeKey(b.a,b.b)))||
       Number(!!a.a.c.layout?.civilian)+Number(!!a.b.c.layout?.civilian)-
       Number(!!b.a.c.layout?.civilian)-Number(!!b.b.c.layout?.civilian)||a.distance-b.distance);
   const drySegment=(a,b)=>{
     if(prisonCampSegmentDistance(prisonCamp.x,prisonCamp.z,a,b)<=prisonCamp.r+12)return false;
     const length=Math.hypot(a.x-b.x,a.z-b.z),n=Math.ceil(length/7);
     for(let k=0;k<=n;k++){
       const t=k/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
       if(hAt(x,z)<.9||hAt(x+4,z)<.1||hAt(x-4,z)<.1||
          hAt(x,z+4)<.1||hAt(x,z-4)<.1)return false
     }
     return true
   };
   const routeBetween=(a,b)=>{
     const peak={x:island.peakX,z:island.peakZ},center={x:island.x,z:island.z},
       opts=[[],[center],[peak],
         [{x:center.x+island.r*.22,z:center.z}],
         [{x:center.x-island.r*.22,z:center.z}],
         [{x:center.x,z:center.z+island.r*.22}],
         [{x:center.x,z:center.z-island.r*.22}]];
     for(const middle of opts){
       const nodes=[a,...middle,b];if(!nodes.slice(1).every((p,i)=>drySegment(nodes[i],p)))continue;
       const road=[a];for(let j=1;j<nodes.length;j++){
         const from=nodes[j-1],to=nodes[j],steps=Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/24);
         for(let k=1;k<=steps;k++)road.push({x:from.x+(to.x-from.x)*k/steps,z:from.z+(to.z-from.z)*k/steps})
       }
       return road
     }
     return null
   };
   for(const pair of pairs){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};
     const key=routeKey(pair.a,pair.b),sameRoute=usedRoutes.has(key),
       road=routeBetween(pair.a.p,pair.b.p);
     if(!road||road.length<2)continue;
     if(sameRoute)road.reverse(); // Mai no superposam els dos cotxes al punt de sortida.
     const points=road.map(p=>[p.x,p.z]),start=points[0],next=points[1],
       heading=Math.atan2(start[0]-next[0],start[1]-next[1]);
     if(!clear(start[0],start[1]))continue;
     const car=mkEn('jeep',start[0],start[1]);car.hd=heading;
     // Anada i tornada: cap salt instantani del darrer waypoint al primer.
     setPatrol(car,[...points,...points.slice(1,-1).reverse()],false);
     car.interCompoundPatrol=true;car.patrolIslandIndex=islands.indexOf(island);
     car.patrolComplexes=[pair.a.c.id,pair.b.c.id];car.patrolEnds=[pair.a.p,pair.b.p];
     if(!sameRoute)pathRoutes.push({points,width:8,color:0x776b51});
     usedRoutes.add(key);spawned++;break
   }
 }
 return spawned
}
const landCarPatrolCount=(yield* spawnLandCarPatrols());
markBuildStage('landCarPatrols');
yield {stage:'Patrulles terrestres',completed:1,total:1};
// Mateix recompte i posicions per llavor al joc i al cercador de llavors.
// El cercador desa coordenades sense crear models ni IA.
yield* spawnMarinePatrolsSteps();
// Auditable per-sector totals: if terrain prevents a quota from being met,
// diagnostics retain the deficit rather than silently claiming success.
const sectorQuota=[['tanc',2],['tanqueta',2],['heli',2],['heli_combat',1],
  ['llanxa_coets',2],['ferry',2],['moto_aquatica',4]];
world.userData.quadrantPopulation=activeSectors.map(sector=>{
  const vehicles=Object.fromEntries(sectorQuota.map(([type])=>[type,countVehicles(type,sector)]));
  const compounds=Object.fromEntries(['outpost','hangar','polvori','comunicacions','port','heliport',
    'ferry-terminal','hut-settlement','hut-settlement-small','hut-settlement-large']
    .map(type=>[type,world.userData.compounds.filter(c=>c.id===type&&sectorMatches(c.x,c.z,sector)).length]));
  return {sector:sector==null?mapSector(pa.x,pa.z):sector,vehicles,compounds,
    missing:sectorQuota.filter(([type,target])=>vehicles[type]<target).map(([type,target])=>({type,target,actual:vehicles[type]}))};
});
markBuildStage('marinePatrols');
yield {stage:'Patrulles navals',completed:1,total:1};
P.y=Math.max(0,hAt(P.x,P.z));pl.position.set(P.x,P.y,P.z);if(!seedSearchMode){for(const v of V){if((++checkpointUnits%64)===0)yield {stage:'Cercant i construint el món',completed:null,total:null};place(v,0,0,0);yield {stage:'Situant vehicles',completed:null,total:null};}updateTerminalRamps();yield* prepareEnemyNavigationSteps();}world.userData.paths=pathRoutes;if(!seedSearchMode){const roads=(yield* window.HUNTER_COMPOUND_PATHS.createPathNetworkSteps(THREE,{parent:world,routes:pathRoutes,heightAt:(x,z)=>Math.max(hAt(x,z),terrainStream?.visibleHeightAt(x,z)??-Infinity),heightVersion:(x,z)=>terrainStream?.surfaceVersionAt(x,z)??-1,
  heightRevision:()=>terrainStream?.surfaceRevision??0,
  measure:()=>performanceStatsVisible}));world.add(roads);
  world.userData.pathStats=roads.userData.pathStats;
  world.userData.pathRenderStats=roads.userData.pathRenderStats;}const staticBatchStats=seedSearchMode?null:(yield* batchStaticDecor());if(!seedSearchMode&&visualQuality.shadows)yield* prepareShadowCastersSteps();else shadowCandidates.length=0;cam.position.set(P.x+28,P.y+30,P.z+45);cam.lookAt(P.x,P.y+2,P.z);
markBuildStage('finalizationAndBatching');
yield {stage:'Comprovacions finals',completed:1,total:1};
seedCompounds=compoundCenters.map(c=>({type:c.type,x:c.x,z:c.z}));
window.HUNTER_BUILD_STATS={totalMs:performance.now()-buildStarted,stages:buildStages,portSearch:buildCounters,initialTerrainMs,seabedMs,vegetationMs,seabedSamples:seedSearchMode?0:water.seabedStats.lastSamples,terrainTiles:terrain?.stats||null,palms:PM.stats,landCarPatrols:landCarPatrolCount,staticBatches:staticBatchStats};
if(!seedSearchMode){
  setPalmsDisabled(requestedPalmDisable);
  setWaterDisabled(!!document.getElementById('disableWater')?.checked);
  setShadowsDisabled(!!document.getElementById('disableShadows')?.checked);
}
if(!seedSearchMode){yield* prepareVisibilitySystemSteps();waterUpgradePending=true;}
if(window.HUNTER_PERF_DEBUG)console.info('Hunter · generació',window.HUNTER_BUILD_STATS);
resetSimulationClock();
}



function buildSeedData(){
  // Fa servir EXACTAMENT les funcions de distribució de la partida.
  // En mode lògic, cap model s'afegeix a l'escena i només se'n retornen
  // els registres consultables pel cercador.
  if(!seedSearchMode)throw new Error('buildSeedData requereix mode cerca');
  build();
  return {seed,base:P.base,vehicles:V,items,compounds:seedCompounds,
    enemies:world.userData.marinePatrolPositions||[]};
}

