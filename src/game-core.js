window.addEventListener("error",e=>{const p=document.getElementById("ini");if(p&&p.style.display!=="none"){const esc=v=>String(v||"").replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c])),m=(e&&e.message)?e.message:"Error desconegut",where=e&&e.filename?(e.filename.split("/").pop()+":"+e.lineno+":"+e.colno):"",stack=e&&e.error&&e.error.stack?e.error.stack:"";p.innerHTML="<h1>No s’ha pogut iniciar el joc</h1><p style=\"max-width:560px\">Error d’arrencada: <b>"+esc(m)+"</b></p>"+(where?"<p><b>"+esc(where)+"</b></p>":"")+(stack?"<pre style=\"max-width:90vw;white-space:pre-wrap;text-align:left;font-size:11px;opacity:.8\">"+esc(stack)+"</pre>":"")+"<p style=\"opacity:.8\">Envia una captura d’aquest missatge si persisteix.</p>"}});
let generationPromise=null,generationCancel=null;
let terrainStream=null,seedSearchMode=false,seedCompounds=[],seedScratchWorld=null;
const requiredModules=['HUNTER_VISUAL_CONFIG','HUNTER_MATERIALS','HUNTER_PALETTE','HUNTER_WATER','HUNTER_RENDERING','HUNTER_WATER_SYSTEM','HUNTER_WAVES','HUNTER_TERRAIN','HUNTER_VEHICLES','HUNTER_VEHICLE_DYNAMICS','HUNTER_JOYSTICK','HUNTER_RIDER','HUNTER_VEGETATION','HUNTER_BUILDINGS','HUNTER_CHARACTERS','HUNTER_FAUNA','HUNTER_MINIMAP','HUNTER_UI','HUNTER_SEED_SEARCH','HUNTER_CAMERA_CONTROLS','HUNTER_SPATIAL_GRID','HUNTER_FRAME_DIAGNOSTICS','HUNTER_FRAME_TICK','HUNTER_START_LIFECYCLE','HUNTER_GAME_STATE','HUNTER_GAME_CATALOG','HUNTER_GAME_INTEL','HUNTER_PLAYER_INPUT','HUNTER_SIMULATION_CLOCK','HUNTER_STEALTH_FEEDBACK','HUNTER_PRISONERS','HUNTER_RADIO_RELAY'];
const missingModules=requiredModules.filter(name=>!window[name]);if(missingModules.length)throw new Error('Mòduls Hunter absents: '+missingModules.join(', '));
const missingSystems=Object.entries({generation:typeof build,combat:typeof fire,enemies:typeof updEn,audio:typeof initAudio}).filter(([,type])=>type!=='function').map(([name])=>name);if(missingSystems.length)throw new Error('Sistemes Hunter absents: '+missingSystems.join(', '));
// La mida escollida a la portada ja és coneguda quan s'inicialitza el motor.
 // Crear l'aigua directament amb aquesta mida evita reservar i destruir
 // una malla de centenars de milers de vèrtexs al primer build().
 let MAP_SCALE=+(document.querySelector('input[name="mapSize"]:checked')?.value||1),S=4800*MAP_SCALE,H=S/2;
 const SEG=400,vividCache=new Map(),vivid=c=>{
   let k=vividCache.get(c);
   if(!k){k=new THREE.Color(c);const h={};k.getHSL(h,THREE.SRGBColorSpace);
     k.setHSL(h.h,Math.min(1,h.s*1.5),h.l,THREE.SRGBColorSpace);vividCache.set(c,k)}
   return k
 };
const materialProfile=(name='organic')=>window.HUNTER_MATERIALS[name]||window.HUNTER_MATERIALS.organic;
const sharedMaterials=new Map();
const M=(c,profile='organic')=>{
  const key=c+':'+profile;
  if(!sharedMaterials.has(key))sharedMaterials.set(key,window.HUNTER_RESOURCES.retain(
    new THREE.MeshStandardMaterial({color:vivid(c),flatShading:true,...materialProfile(profile)})));
  return sharedMaterials.get(key);
};
const MAT={
 terrain:()=>{
   const mat=new THREE.MeshLambertMaterial({
     vertexColors:true,flatShading:!highTerrainTexture,
     ...(highTerrainTexture?{map:highTerrainTexture}:{})
   });
   if(terrainTextureTask&&!highTerrainTexture){
     mat.userData.requiresDetailUV=true;
     awaitingTerrainMaterials.push(mat);
   }
   return mat;
 },
 painted:c=>M(c,'paint'),metal:c=>M(c,'metal'),rubber:c=>M(c,'rubber'),glass:c=>M(c,'glass'),masonry:c=>M(c,'masonry')
};
let seed,R,islands,A,Bi,world,B=[],requestedSeed=null,activeBunker=null;
const islandGrid=window.HUNTER_SPATIAL_GRID.createSpatialCellGrid(512);
function rebuildIslandGrid(){
  islandGrid.clear();
  if(!islands)return;
  for(const island of islands){
    // rawHAt només necessita illes amb distància inferior a 2*r.
    const reach=island.r*2;
    islandGrid.insert(island,island.x-reach,island.x+reach,
      island.z-reach,island.z+reach);
  }
}
const islandCandidates=(x,z)=>islandGrid.at(x,z)||(islands||[]);
const seedFromText=v=>{v=String(v??'').trim();if(/^-?\d+$/.test(v))return Number(BigInt(v)&0xffffffffn);let h=2166136261>>>0;for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const mul=a=>{const next=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};next.getState=()=>a>>>0;next.setState=value=>{a=value|0};return next};
const hash=(x,y)=>{const h=Math.sin(x*127.1+y*311.7+seed*.001)*43758.5453;return h-Math.floor(h)};
function vn(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
return hash(ix,iy)*(1-u)*(1-v)+hash(ix+1,iy)*u*(1-v)+hash(ix,iy+1)*(1-u)*v+hash(ix+1,iy+1)*u*v}
const fbm=(x,y)=>vn(x,y)*.5+vn(x*2,y*2)*.25+vn(x*4,y*4)*.125+vn(x*8,y*8)*.0625;
const clamp01=v=>Math.max(0,Math.min(1,v)),smooth01=t=>t*t*(3-2*t);
function islandReliefAt(x,z,list){return window.HUNTER_WORLD_PHYSICS.reliefAt(x,z,list,seed)}
function rawHAt(x,z){return window.HUNTER_WORLD_PHYSICS.rawTerrainAt(x,z,islandCandidates(x,z),seed,H)}
// Evitem recórrer TOTES les plataformes de TOTS els compounds en cada
// consulta d'altura. L'ordre d'inserció dels candidates és l'original:
// solapaments, altures, llavors i col·lisions continuen idèntics.
let terrainLevels=[];
const terrainLevelGrid=window.HUNTER_SPATIAL_GRID.createSpatialCellGrid(256);
const addLevelArea=(x,z,w,d,y,rot=0,blend=12)=>{
  const {level,bounds}=window.HUNTER_WORLD_PHYSICS.planLevelArea(x,z,w,d,y,rot,blend);
  terrainLevels.push(level);
  terrainLevelGrid.insert(level,bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ);
};
function hAt(x,z){
  const h=rawHAt(x,z),candidates=terrainLevelGrid.at(x,z);
  return candidates?window.HUNTER_WORLD_PHYSICS.levelHeight(h,x,z,candidates):h;
}
const waveAmp=window.HUNTER_WAVES.amplitude;
const wy=(x,z,t)=>water.surfaceHeight(x,z,t);
const rr=(a,b)=>a+R()*(b-a);
// Four independent geographic sectors in large worlds; small worlds have one shared pool.
const mapSector=(x,z)=>(x>=0?1:0)+(z>=0?2:0);
const sectorMatches=(x,z,sector)=>sector==null||mapSector(x,z)===sector;
function genIslands(){
 const layout=window.HUNTER_WORLD_GENERATION.createIslandLayout(seed,MAP_SCALE);
 R=layout.random;islands=layout.islands;A=layout.base;Bi=layout.headquarters;
 rebuildIslandGrid();
}
const slope=(x,z,h)=>Math.abs(hAt(x+5,z)-h)+Math.abs(hAt(x,z+5)-h);
function land(i,n=600,fl){return drainBuildSteps(landSteps(i,n,fl))}
function* landSteps(i,n=600,fl){for(let k=0;k<n;k++){if(k%16===0)yield {stage:'Cercant terreny lliure',completed:k,total:n,unit:'intents'};const a=R()*6.283,d=R()*i.r*.75,x=i.x+Math.cos(a)*d,z=i.z+Math.sin(a)*d,h=hAt(x,z);
if(h>3&&h<14&&slope(x,z,h)<2.5&&(!fl||fr(x,z)<2.2)&&!B.some(b=>Math.abs(b.x-x)<b.hw+24&&Math.abs(b.z-z)<b.hd+24)&&!treeHit(x,z,3)&&Math.abs(x)<H-150&&Math.abs(z)<H-150)return{x,z,h}}return null}
// escena
const coarse=matchMedia('(pointer:coarse)').matches;
const qualityName=window.HUNTER_GRAPHICS_QUALITY||((coarse||window.HUNTER_FORCE_LOW_QUALITY)?'mobile':'desktop');
const visualQuality=window.HUNTER_VISUAL_CONFIG[qualityName];
let highTerrainTexture=null;
const terrainTextureTask=visualQuality.terrainDetailTexture
  ?window.HUNTER_HIGH_GRAPHICS.createTerrainTextureTask(THREE):null;
const awaitingTerrainMaterials=[];
function advanceTerrainTexture(){
  if(!terrainTextureTask||highTerrainTexture)return;
  const tex=terrainTextureTask.advance(4);
  if(!tex)return;
  highTerrainTexture=tex;
  for(const mat of awaitingTerrainMaterials){
    mat.map=tex;mat.flatShading=false;mat.needsUpdate=true;
    const cutout=mat.userData?.hunterCutoutMaterial;
    if(cutout){cutout.map=tex;cutout.flatShading=false;cutout.needsUpdate=true}
  }
  awaitingTerrainMaterials.length=0;
}
const rendering=window.HUNTER_RENDERING.create(THREE,visualQuality);
const ren=rendering.renderer,scene=rendering.scene,cam=rendering.camera,sunDir=rendering.sunDir,sun=rendering.sun,sky=rendering.sky,sunM=rendering.sunMesh;
document.body.prepend(ren.domElement);
const rs=rendering.resize;addEventListener('resize',rs);rs();
const maxRenderRatio=Math.min(devicePixelRatio||1,visualQuality.pixelRatio);
const adaptivePerformance=window.HUNTER_PERFORMANCE.create({
  renderer:ren,maxPixelRatio:maxRenderRatio,
  minPixelRatio:visualQuality.minPixelRatio,
  element:document.getElementById('perfStats'),compact:qualityName!=='desktop'
});
// El panell es mostra només quan l'usuari activa l'interruptor de pausa.
let performanceStatsVisible=false;
const perfHotspots={broadphaseMs:0,aiMs:0,visibilityMs:0,stealthMs:0,
  aiMarineMs:0,aiNavMs:0,aiSenseMs:0,aiDirectMs:0,aiPathMs:0,
  aiDirectChecks:0,aiPathChecks:0,aiPathDeferred:0,
  aiPathNodes:0,aiPassivePathNodes:0,aiSweepMs:0,
  aiSweepChecks:0,aiSweepSamples:0,aiUpdated:0,aiSkipped:0,
  aiSweepFastGroundSamples:0,aiSweepFullGroundSamples:0,
  aiPassiveDirectChecks:0,aiRemoteDecisions:0,aiImmediateDecisions:0,
  aiSoldierMs:0,aiVehicleMs:0,aiTowerMs:0,aiOtherMs:0,aiCoordMs:0,
  aiTowerSightMs:0,aiTowerSightChecks:0,aiTowerSightSkipped:0,
  aiSweepVehicleHeightSkipped:0};
window.HUNTER_PERF_HOTSPOTS=perfHotspots;
document.body.classList.remove('performance-stats-visible');
function setPerformanceStatsVisible(enabled){
  performanceStatsVisible=!!enabled;
  if(world)registerDrawCategories();
  document.body.classList.toggle('performance-stats-visible',performanceStatsVisible);
}
window.HUNTER_PERFORMANCE_STATS=adaptivePerformance.stats;
adaptivePerformance.stats.hotspots=perfHotspots;
const performanceDebugRequested=typeof location!=='undefined'&&
  new URLSearchParams(location.search||'').get('perf')==='1';
const performanceAuditMode=typeof location!=='undefined'?
  new URLSearchParams(location.search||'').get('perfAudit'):null;
const performanceAuditRequested=performanceAuditMode==='1'||performanceAuditMode==='full';
const stressAuditRequested=performanceAuditRequested&&
  new URLSearchParams(location.search||'').get('stress')==='1';
const STRESS_AUDIT_PRESET=Object.freeze({seed:2407759483,x:1208,z:-1594,scale:1});
const water=window.HUNTER_WATER_SYSTEM.create(THREE,{scene,sunDir,size:S,segments:visualQuality.waterSegments,initialSegments:Math.min(160,visualQuality.waterSegments),heightAt:hAt,config:window.HUNTER_WATER,reflections:visualQuality.waterReflections!==false,coastDetail:!!visualQuality.coastDetail,fogColor:scene.fog.color});
let waterUpgradePending=false;
const waterMat=water.material,waterUniforms=water.uniforms;
const movementFx=window.HUNTER_MOVEMENT_FX.create(THREE,{
 scene,quality:qualityName,waveModel:window.HUNTER_WAVES,
 waterTime:waterUniforms.time,waterBed:hAt
});
// Efectes hostils: només vehicles amb rodes, erugues o buc.
const ENEMY_TRAIL_TYPES=new Set(['jeep','tanqueta','tanc','patrulla_marina']);
window.HUNTER_MOVEMENT_FX_STATS=movementFx.stats;
const updateSeabed=()=>water.setWorldSize(S);
const waves=water.update;
// Diagnòstic de GPU: amagam les dues malles del mar, sense alterar
// la física d'onades ni el relleu. Això permet comparar FPS en calent.
let waterDisabled=false;
function setWaterDisabled(disabled){
  waterDisabled=!!disabled;
  const checkbox=document.getElementById('disableWater');
  if(checkbox)checkbox.checked=waterDisabled;
  water.mesh.visible=!waterDisabled;
  water.deep.visible=!waterDisabled;
  movementFx.setWaterVisible(!waterDisabled);
  if(water.shore)water.shore.visible=!waterDisabled&&water.shoreStats.segments>0;
  window.HUNTER_WATER_DISABLED=waterDisabled;
  return waterDisabled;
}
const waterSettingCheckbox=document.getElementById('disableWater');
if(waterSettingCheckbox)waterSettingCheckbox.addEventListener('change',()=>setWaterDisabled(waterSettingCheckbox.checked));
// Ombres de proximitat. Malles classificades una vegada per mapa,
// amb actualització ocasional i sense passejar l'arbre de l'escena.
let shadowsDisabled=false;
const shadowCandidates=[],shadowStats={candidates:0,active:0,excludedDetail:0,updates:0,playerCasters:0,deferredFaunaCasters:0};
const shadowNodeOwners=new WeakMap(),shadowOwnerKinds=new WeakMap();
const shadowCache=window.HUNTER_SHADOW_CACHE.create({shadowMap:ren.shadowMap,
  labelNode:node=>{
    const owner=shadowNodeOwners.get(node);
    const kind=owner?shadowOwnerKinds.get(owner):null;
    return (kind||'element')+' / '+(node.name||node.geometry?.type||node.type||'pivot');
  }
});
let shadowPoseNodes=[],shadowBoatNodes=[];
const shadowBoatProxyCache=new WeakMap();
// Un vector per propietari dinàmic, reutilitzat en cada selecció d'ombres.
const shadowOwnerPositionCache=new WeakMap();
shadowStats.cache=shadowCache.stats;
let shadowLastX=Infinity,shadowLastZ=Infinity,shadowLastMs=-Infinity;
window.HUNTER_SHADOW_STATS=shadowStats;
function updateShadowCasters(force=false){
  if(!visualQuality.shadows||shadowsDisabled)return;
  const now=performance.now();
  if(!force&&Math.abs(P.x-shadowLastX)<30&&Math.abs(P.z-shadowLastZ)<30&&now-shadowLastMs<1000)return;
  shadowLastX=P.x;shadowLastZ=P.z;shadowLastMs=now;
  const range2=Math.pow(visualQuality.shadowDistance||225,2),
        dynamicPositions=new Map();
  let count=0,deferredFaunaCasters=0;
  const poseNodes=new Set(),boatProxies=new Set();
  for(const entry of shadowCandidates){
    let q=entry.point;
    if(entry.owner){
      q=dynamicPositions.get(entry.owner);
      if(!q){
        q=shadowOwnerPositionCache.get(entry.owner);
        if(!q){q=new THREE.Vector3();shadowOwnerPositionCache.set(entry.owner,q)}
        entry.owner.getWorldPosition(q);dynamicPositions.set(entry.owner,q);
      }
    }
    const dx=q.x-P.x,dz=q.z-P.z,near=dx*dx+dz*dz<range2;
    entry.mesh.castShadow=near;
    if(near){
      count++;
      if(entry.owner){
        // Gavines i taurons conserven castShadow, però el seu moviment
        // continu no invalida tot el mapa cada fotograma. El mapa continua
        // refrescant-se cada 180 ms (i quan es mouen jugadors/vehicles).
        // Sense aquest filtre una sola gavina activava ~100 passades
        // d'ombres a CADA fotograma encara que només en projectàs una.
        if(shadowOwnerKinds.get(entry.owner)==='fauna'){
          deferredFaunaCasters++;
          continue;
        }
        // Incloem pivots de mans, rodes i rotors, no sols la posició del vehicle.
        for(let o=entry.mesh;o;o=o.parent){
          // L'oscil·lació de les ones canvia Y, pitch i roll del buc,
          // però no representa navegació ni canvi de rumb. Conservam
          // la detecció immediata de X, Z i yaw, i el refresc periòdic
          // actualitza la inclinació i l'ombra completa del buc.
          const boatKind=shadowOwnerKinds.get(entry.owner);
          // La barca de rems té pivots animats que no han de provocar
          // un shadow redraw a cada remada. El buc conserva la seva
          // ombra completa, i la resta es refresca periòdicament.
          if(boatKind==='vehicle barca_rems'&&o!==entry.owner)continue;
          if(o===entry.owner&&(
            boatKind==='vehicle llanxa'||boatKind==='vehicle llanxa_coets'||
            boatKind==='vehicle barca_rems')){
            let proxy=shadowBoatProxyCache.get(o);
            if(!proxy){
              proxy={
                source:o,
                position:{x:o.position.x,y:0,z:o.position.z},
                rotation:{x:0,y:o.rotation.y,z:0},
                scale:{x:1,y:1,z:1},
                shadowMotionRole:'boat'
              };
              shadowBoatProxyCache.set(o,proxy);
            }
            boatProxies.add(proxy);
            poseNodes.add(proxy);
            shadowNodeOwners.set(proxy,o);
          }else{
            poseNodes.add(o);
            shadowNodeOwners.set(o,entry.owner);
          }
          if(o===entry.owner)break;
        }
      }
    }
  }
  shadowPoseNodes=[...poseNodes];
  shadowBoatNodes=[...boatProxies];
  shadowStats.boatMotionProxies=shadowBoatNodes.length;
  shadowStats.active=count;
  shadowStats.deferredFaunaCasters=deferredFaunaCasters;
  shadowStats.updates++;
}
function setShadowsDisabled(disabled){
  shadowsDisabled=!!disabled;
  const checkbox=document.getElementById('disableShadows');
  if(checkbox)checkbox.checked=shadowsDisabled;
  const enabled=!!visualQuality.shadows&&!shadowsDisabled;
  ren.shadowMap.enabled=enabled;
  sun.castShadow=enabled;
  if(enabled){
    shadowCache.invalidate();
    updateShadowCasters(true);
  }else{
    shadowPoseNodes=[];shadowBoatNodes=[];
    for(const entry of shadowCandidates)entry.mesh.castShadow=false;
    shadowStats.active=0;shadowStats.deferredFaunaCasters=0;
  }
  window.HUNTER_SHADOWS_DISABLED=shadowsDisabled;
  return shadowsDisabled;
}
const shadowSettingCheckbox=document.getElementById('disableShadows');
if(shadowSettingCheckbox)shadowSettingCheckbox.addEventListener('change',()=>setShadowsDisabled(shadowSettingCheckbox.checked));
function* traverseGenerationSteps(root,visit,stage){
  const stack=[root];let count=0;
  while(stack.length){
    const node=stack.pop();visit(node);
    for(let i=node.children.length-1;i>=0;i--)stack.push(node.children[i]);
    if(++count%64===0)yield {stage,completed:count,total:null,unit:'objectes'};
  }
}
function prepareShadowCasters(){return drainBuildSteps(prepareShadowCastersSteps())}
function* prepareShadowCastersSteps(){
  shadowCandidates.length=0;
  shadowPoseNodes=[];shadowBoatNodes=[];
  shadowCache.invalidate();
  shadowLastX=Infinity;shadowLastZ=Infinity;shadowLastMs=-Infinity;
  shadowStats.candidates=0;shadowStats.active=0;shadowStats.excludedDetail=0;
  shadowStats.playerCasters=0;shadowStats.deferredFaunaCasters=0;
  if(!visualQuality.shadows||!world)return;
  const dynamicRoots=new Set([pl,...V.map(v=>v.o),...E.map(e=>e.o),...fa.map(f=>f.o)].filter(Boolean));
  shadowOwnerKinds.set(pl,'jugador');
  for(const v of V)if(v.o)shadowOwnerKinds.set(v.o,'vehicle '+v.t);
  for(const e of E)if(e.o)shadowOwnerKinds.set(e.o,'enemic '+(e.t||'soldat'));
  for(const f of fa)if(f.o)shadowOwnerKinds.set(f.o,'fauna');
  world.updateWorldMatrix(true,false);
  yield* traverseGenerationSteps(world,o=>o.updateWorldMatrix(false,false),'Matrius d’ombres');
  pl.updateMatrixWorld(true);
  const collect=mesh=>{
    if(!mesh.isMesh)return;
    mesh.castShadow=false;
    const geometry=mesh.geometry;
    if(!geometry||mesh.isInstancedMesh||mesh.userData.waterMask||
       mesh.userData.terrainTile||mesh.userData.noCastShadow)return;
    if(!geometry.boundingSphere)geometry.computeBoundingSphere();
    const radius=(geometry.boundingSphere?.radius||0)*mesh.matrixWorld.getMaxScaleOnAxis(),
          mat=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
    // Les peces molt petites i els vidres no fan una passada d'ombres.
    if(radius<.85||(mat?.transparent&&mat.opacity<.9)){
      shadowStats.excludedDetail++;mesh.receiveShadow=false;return;
    }
    let owner=mesh.parent;
    while(owner&&owner!==world&&owner!==scene&&!dynamicRoots.has(owner))owner=owner.parent;
    if(!dynamicRoots.has(owner))owner=null;
    shadowCandidates.push({mesh,owner,point:owner?null:mesh.getWorldPosition(new THREE.Vector3())});
  };
  yield* traverseGenerationSteps(world,collect,'Ombres');
  pl.traverse(collect);
  // Els caps i les extremitats del jugador eren massa petits per passar
  // el filtre general (0.85 m). Seleccionam onze malles representatives
  // del rig, conservant les animacions sense processar detalls microscòpics.
  if(visualQuality.playerShadows){
    const chosen=new Set(),u=pl.userData;
    const largest=(root,n,direct=false)=>{
      if(!root)return;
      const candidates=[];
      const offer=mesh=>{
        if(!mesh.isMesh||mesh.userData.noCastShadow||mesh.material?.transparent)return;
        const geo=mesh.geometry;
        if(!geo.boundingSphere)geo.computeBoundingSphere();
        candidates.push({mesh,radius:(geo.boundingSphere?.radius||0)*mesh.matrixWorld.getMaxScaleOnAxis()});
      };
      if(direct)for(const child of root.children)offer(child);
      else root.traverse(offer);
      candidates.sort((a,b)=>b.radius-a.radius);
      for(const c of candidates.slice(0,n))chosen.add(c.mesh);
    };
    // Després d'articular el rig, les malles del tors són dins upperBody.
    // Seleccionant només fills directes de pl se'n perdia tota l'ombra.
    largest(u.upperBody,3,true);
    largest(u.ll,2);largest(u.lr,2);
    largest(u.al,1);largest(u.ar,1);
    largest(u.head,2);
    const already=new Set(shadowCandidates.map(e=>e.mesh));
    for(const mesh of chosen)if(!already.has(mesh))
      shadowCandidates.push({mesh,owner:pl,point:null});
    shadowStats.playerCasters=chosen.size;
  }else shadowStats.playerCasters=0;
  shadowStats.candidates=shadowCandidates.length;
  if(!shadowsDisabled)updateShadowCasters(true);
}

// terreny visual a src/terrain.js
let stairs=[],piers=[];
let Wl=[],Dr=[],items=[],inv={},msg='',msgT=0,HQ=null,ib=null;
let hqIntelStage=0,hqIntelSites=[],hqDiscardIndex=-1,hqIntelEliminationOrder=[];
const {hqIntelSectors,hqIntelDiscarded,knownVehicleSectors}=
  window.HUNTER_GAME_STATE.createIntelCollections(Set);
const wallGrid=window.HUNTER_SPATIAL_GRID.createSpatialCellGrid(64);
let wallGridSource=null,wallGridCount=-1,wallQueryStamp=0;
function rebuildWallGrid(){
  wallGrid.clear();wallGridSource=Wl;wallGridCount=Wl.length;
  for(const w of Wl)wallGrid.insert(w,w.x0,w.x1,w.z0,w.z1);
}
function wallCandidates(x,z,r=0){
  if(wallGridSource!==Wl||wallGridCount!==Wl.length)rebuildWallGrid();
  return wallGrid.query(x,z,r,'_wallQueryStamp',++wallQueryStamp);
}
const buildingGrid=window.HUNTER_SPATIAL_GRID.createSpatialCellGrid(96);
let buildingGridSource=null,buildingGridCount=-1,buildingQueryStamp=0;
function rebuildBuildingGrid(){
  buildingGrid.clear();buildingGridSource=B;buildingGridCount=B.length;
  for(const b of B)buildingGrid.insert(b,b.x-b.w/2,b.x+b.w/2,
    b.z-b.d/2,b.z+b.d/2);
}
function buildingCandidates(x,z,r=0){
  if(buildingGridSource!==B||buildingGridCount!==B.length)rebuildBuildingGrid();
  return buildingGrid.query(x,z,r,'_buildingQueryStamp',++buildingQueryStamp);
}
const {ICON,IT}=window.HUNTER_GAME_CATALOG.createItemCatalog();
// combat i enemics
let E=[],Pj=[],bombs=[],grenades=[],DEAD=[],hp=window.HUNTER_COMBAT_BALANCE.player,ammo=0,disg=false,bazookaEquipped=false,grenadeEquipped=false,cisallaEquipped=false,sniperEquipped=false,assaultRifleEquipped=false,knifeEquipped=false,sniperAmmo=0,bazookaAmmo=0,scopeActive=false,scopePitch=0,scopeYaw=0,over=0,fcd=0,kills=0,intelMarks=[],hqMapKnown=false,playerEject=null,playerFall=null,playerCrouched=false;
// Ojiva compartida per tots els projectils pesats. Eix longitudinal -Z:
// culata cilíndrica a +Z i punta cònica a -Z, com els canons del joc.
// Geometria única reutilitzada, sense crear malles noves per cada tir.
const {light:gLight,heavy:gHeavy,forward:heavyForward}=window.HUNTER_PROJECTILE_MODEL.createProjectileGeometry(THREE);
const endEl=document.getElementById('end'),
mB=new THREE.MeshBasicMaterial({color:0xffe45a}),mS=new THREE.MeshBasicMaterial({color:0xff7a1a}),mE=new THREE.MeshBasicMaterial({color:0xff4040}),
// Bales de pistola, franctirador, soldats i tanqueta: petites i blanques.
// Els projectils explosius mantenen el color i volum original.
mW=new THREE.MeshBasicMaterial({color:0xffffff}),SMALL_ARMS_SCALE=.7;
// Cadència compartida entre la tanqueta del jugador i les enemigues.
const TANKETTE_FIRE_INTERVAL=.16;
const EC=window.HUNTER_GAME_CATALOG.createEnemyProfiles(
  COMBAT_BALANCE,TANKETTE_FIRE_INTERVAL);
// extres: so, partícules, fauna, diari
let started=0,DIF=1,AC=null,eng=null,seaAudio=null,logb=[],fa=[],pi_=0;const lastS={},rn=(a,b)=>a+Math.random()*(b-a);
const PT=[];for(let i=0;i<100;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false}));m.visible=false;scene.add(m);PT.push({m,life:0,max:1,s:1})}
function puff(x,y,z,c,s,rise=0){const p=PT[pi_++%100];p.life=p.max=1.1;p.s=s;p.rise=rise;p.m.material.color.setHex(c);p.m.position.set(x+rn(-.6,.6),y,z+rn(-.6,.6));p.m.visible=true}
function mark(){const q=cv||P;logb.push({n:'P'+(logb.length+1),x:q.x,z:q.z});msg='Coordenades guardades: '+(q.x|0)+', '+(q.z|0);msgT=2}
function spawnFauna(){return drainBuildSteps(spawnFaunaSteps())}
function* spawnFaunaSteps(){
  // RNG local determinista; les posicions dels taurons formen part del
  // fingerprint COOP. Mai no consumir Math.random() ni el RNG global R.
  const faunaR=window.HUNTER_WORLD_GENERATION.createWorldRandom((seed^0x5f3759df)>>>0);
  const faunaRange=(a,b)=>a+faunaR()*(b-a);
  fa=[];for(let k=0;k<48;k++){yield {stage:'Fauna',completed:k,total:78,unit:'animals'};const bird=window.HUNTER_FAUNA.createGull(THREE,{box:bx,material:M}),o=bird.o,wl=bird.wl,wr=bird.wr;world.add(o);
const cx=faunaRange(-H+200,H-200),cz=faunaRange(-H+200,H-200),baseY=faunaRange(25,55);
fa.push({k:'g',o,wl,wr,cx,cz,r:faunaRange(40,120),a:faunaRange(0,6.28),sp:faunaRange(.15,.3),y:baseY,flyY:Math.max(baseY,hAt(cx,cz)+10),x:cx,z:cz})}
for(let k=0;k<30;k++){yield {stage:'Fauna',completed:48+k,total:78,unit:'animals'};let cx,cz,n=0;do{cx=faunaRange(-H+150,H-150);cz=faunaRange(-H+150,H-150)}while(hAt(cx,cz)>-6&&++n<60);if(hAt(cx,cz)>-6)continue;
const o=window.HUNTER_FAUNA.createShark(THREE,{material:M});world.add(o);fa.push({k:'s',o,cx,cz,r:faunaRange(12,28),a:faunaRange(0,6.28),sp:faunaRange(.25,.45),x:cx,z:cz,sharkMode:'patrol',biteCd:0})}}
const updateDamagedVehicleSmoke=(v,dt,health,maxHealth)=>{
  if(v.destroyed||health<=0)return;
  const frac=Math.max(0,Math.min(1,1-health/Math.max(1,maxHealth)));

  if(frac>.08){
    v.smokeT=(v.smokeT||0)-dt;
    if(v.smokeT<=0){
      const baseY=v.o?.position?.y??Math.max(0,hAt(v.x,v.z));
      let smokeX=v.x,smokeZ=v.z,smokeY;
      if(v.t==='ferry'&&v.o?.userData?.damageSmokeOrigin){
        // Origen fix al sostre de la cabina; acompanya tots els girs.
        v.o.updateWorldMatrix(true,false);
        const origin=new THREE.Vector3(...v.o.userData.damageSmokeOrigin)
          .applyMatrix4(v.o.matrixWorld);
        smokeX=origin.x;smokeZ=origin.z;smokeY=origin.y;
      }else{
        if(v.smokeTopOffset==null&&v.o){
          v.o.updateMatrixWorld(true);
          const bb=new THREE.Box3().setFromObject(v.o);
          v.smokeTopOffset=Math.max(.7,bb.max.y-baseY);
        }
        smokeY=baseY+(v.smokeTopOffset||1.8);
      }
      // El pool de partícules és el mateix en individual i COOP.
      if(Math.hypot(v.x-P.x,v.z-P.z)<250)
        movementFx.damageSmoke(v,frac,smokeY,smokeX,smokeZ);
      v.smokeT=Math.max(.08,.55-frac*.42)
    }
  }
};
function updExtra(dt,t){updDeb(dt);
for(let i=fa.length-1;i>=0;i--){
  const f=fa[i],px=f.x??f.cx,pz=f.z??f.cz,
        dx=px-P.x,dz=pz-P.z,d2=dx*dx+dz*dz,
        interval=d2<FAUNA_NEAR2?0:(d2<FAUNA_MID2?.12:.4);
  f.lodAcc=(f.lodAcc||0)+dt;
  if(interval>0&&f.lodAcc<interval)continue;
  const step=f.lodAcc;f.lodAcc=0;
  if(f.k==='s'){
    const outcome=window.HUNTER_SHARKS.update(f,step,
      !cv&&!over&&!playerFall&&!playerEject&&swimming?P:null,hAt);
    if(outcome.remove){world.remove(f.o);fa.splice(i,1);continue}
    f.o.position.set(f.x,wy(f.x,f.z,t)-.18-(f.dead?outcome.sink:0),f.z);
    f.o.rotation.y=f.sharkYaw??Math.PI-f.a;
    f.o.rotation.z=f.dead?Math.min(1.4,(f.deathT||0)*2):0;
    if(outcome.bite&&!over){
      hurtP(window.HUNTER_SHARKS.BITE_DAMAGE,false,{type:'shark',x:f.x,y:f.o.position.y,z:f.z});
      // Gran esquitx de sang, sense materials ni partícules noves:
      // reutilitza el pool d'efectes existent al nivell de l'aigua.
      const biteY=wy(P.x,P.z,t)+.08;
      for(let k=0;k<12;k++){
        const a=k*Math.PI/6,d=.35+(k%4)*.33;
        puff(P.x+Math.cos(a)*d,biteY+rn(0,.4),P.z+Math.sin(a)*d,
          k%3?0xa51b2b:0xcc303d,1.65+rn(0,1.65));
      }
      msg='Un tauró et mossega!';msgT=1.5;
    }
    if(!f.dead&&d2<FAUNA_NEAR2&&Math.random()<.1)
      puff(f.x,wy(f.x,f.z,t)+.02,f.z,0xffffff,1.2);
    continue;
  }
  f.a+=f.sp*step;f.x=f.cx+Math.cos(f.a)*f.r;f.z=f.cz+Math.sin(f.a)*f.r;
  f.o.rotation.y=Math.PI-f.a;
  const terrainY=Math.max(0,hAt(f.x,f.z))+10;
  let obstacleY=terrainY;
  for(const b of buildingCandidates(f.x,f.z,5))
    if(Math.abs(f.x-b.x)<b.w/2+5&&Math.abs(f.z-b.z)<b.d/2+5)
      obstacleY=Math.max(obstacleY,b.fy+b.h+8);
  const cruiseY=f.y+Math.sin(t+f.cx)*2,targetY=Math.max(cruiseY,obstacleY),
        climbK=1-Math.exp(-3.8*step);
  f.flyY=(f.flyY??targetY)+(targetY-(f.flyY??targetY))*climbK;
  if(f.flyY<obstacleY)f.flyY=obstacleY;
  f.o.position.set(f.x,f.flyY,f.z);
  f.wl.rotation.z=Math.sin(t*8+f.cx)*.5;f.wr.rotation.z=-f.wl.rotation.z;
}
V.forEach(v=>{
  if(v.destroyed)return;
  v.playerHitCd=Math.max(0,(v.playerHitCd||0)-dt);
  updateDamagedVehicleSmoke(v,dt,v.life,v.maxLife||VT[v.t]?.life||1);
});
for(const e of E){
  if(!['jeep','tanqueta','tanc','patrulla_marina'].includes(e.t))continue;
  updateDamagedVehicleSmoke(e,dt,e.hp,EC[e.t]?.hp||1);
}
// Esteles dels vehicles pilotables i dels enemics; tots els efectes
// comparteixen quatre malles instanciades. LOD de distància al sistema.
const fxContext={playerX:P.x,playerZ:P.z,playerVehicle:cv,
  terrainAt:hAt,waterAt:(x,z)=>wy(x,z,t)};
for(const v of V)movementFx.vehicle(v,dt,fxContext);
fxContext.enemy=true;
for(const u of E)if(ENEMY_TRAIL_TYPES.has(u.t))
  movementFx.vehicle(u,dt,fxContext);
movementFx.update(dt,cam);
 PT.forEach(p=>{if(p.life>0){p.life-=dt;if(p.rise)p.m.position.y+=p.rise*dt;const frame=window.HUNTER_DEBRIS_CORE.dustFrame(p.life,p.max,p.s);p.m.scale.setScalar(frame.scale);p.m.material.opacity=frame.opacity;if(p.life<=0){p.m.visible=false;p.rise=0}}});
if(seaAudio&&audioCanPlay()){const coastal=Math.max(.25,1-Math.max(0,hAt(P.x,P.z))/22),
      // La barca de rems, com el windsurf, només fa fregadís d'aigua.
      waterVolume=cv&&(cv.t==='windsurf'||cv.t==='barca_rems')
        ?.026+Math.min(1,Math.abs(cv.v)/22)*.016:.035+coastal*.05;
  seaAudio.gain.gain.setTargetAtTime(over?0:waterVolume,AC.currentTime,.5)}
if(eng&&audioCanPlay()){const c=cv?VT[cv.t]:null;
  eng.g.gain.value=c&&!['bici','windsurf','barca_rems'].includes(cv.t)&&!over?(cv.t==='cotxe_civil'?1.65:1)*(.02+Math.min(1,Math.abs(cv.v)/40)*.03):0;
  eng.o.frequency.value=c?(cv.t==='cotxe_civil'?28:c.m=='a'?60:35)+Math.abs(cv.v)*(c.m=='a'?1.3:2.5):40}}
const seedRandomEl=document.getElementById('seedRandom'),seedInputEl=document.getElementById('seedInput'),iniEl=document.getElementById('ini'),
startMenuEl=document.getElementById('startMenu'),seedSearchScreenEl=document.getElementById('seedSearchScreen'),
seedSearchOpenEl=document.getElementById('seedSearchOpen'),seedSearchBackEl=document.getElementById('seedSearchBack'),
seedSearchRunEl=document.getElementById('seedSearchRun'),seedSearchCancelEl=document.getElementById('seedSearchCancel'),
seedSearchStartEl=document.getElementById('seedSearchStart'),seedSearchCountEl=document.getElementById('seedSearchCount'),
seedSearchDistanceEl=document.getElementById('seedSearchDistance'),seedSearchMapSizeEl=document.getElementById('seedSearchMapSize'),
seedSearchStatusEl=document.getElementById('seedSearchStatus'),seedSearchResultsEl=document.getElementById('seedSearchResults'),
seedSearchCategoryEl=document.getElementById('seedSearchCategory'),seedSearchTypeEl=document.getElementById('seedSearchType');
let seedSearchToken=0,seedSearchRunning=false,seedSearchPromise=null;
const seedSearch=window.HUNTER_SEED_SEARCH;
const currentMapScale=()=>+(document.querySelector('input[name="mapSize"]:checked')?.value||1);
const fillSeedSearchTypes=(preferred)=>{
  const options=seedSearch.typeOptions(seedSearchCategoryEl.value,window.HUNTER_VEHICLE_DYNAMICS.types,IT);
  const wanted=preferred||'*';
  seedSearchTypeEl.replaceChildren();
  for(const entry of options){
    const option=document.createElement('option');
    option.value=entry.value;option.textContent=entry.label;
    seedSearchTypeEl.appendChild(option);
  }
  seedSearchTypeEl.value=options.some(q=>q.value===wanted)?wanted:'*';
};
fillSeedSearchTypes('ferry'); // Conserva el cercador de ferris com a selecció inicial.
seedSearchCategoryEl.onchange=()=>{fillSeedSearchTypes();seedSearchResultsEl.replaceChildren();seedSearchStatusEl.textContent='Tria el tipus i prem Buscar.'};
seedSearchTypeEl.onchange=()=>{seedSearchResultsEl.replaceChildren();seedSearchStatusEl.textContent='Prem Buscar per analitzar aquest tipus.'};
const showSeedSearch=()=>{
  if(generationPromise)return;
  const sc=currentMapScale();seedSearchMapSizeEl.value=sc===2?'Gran · 9,6 km':'Petit · 4,8 km';
  startMenuEl.style.display='none';seedSearchScreenEl.style.display='block';seedSearchScreenEl.setAttribute('aria-hidden','false')
};
const hideSeedSearch=()=>{
  seedSearchToken++;seedSearchCancelEl.disabled=true;seedSearchRunEl.disabled=true;
  const close=()=>{
    seedSearchRunEl.disabled=false;seedSearchCancelEl.disabled=true;
    seedSearchScreenEl.style.display='none';seedSearchScreenEl.setAttribute('aria-hidden','true');
    startMenuEl.style.display='flex';
  };
  // En seleccionar una llavor durant una cerca, esperem la neteja del
  // generador abans de tornar a mostrar els botons d'inici de partida.
  if(seedSearchRunning&&seedSearchPromise)seedSearchPromise.then(close,close);
  else close();
};
const renderSeedSearchResults=(rows,target,label,category,type)=>{
  const labelMap=new Map(seedSearch.typeOptions(category,window.HUNTER_VEHICLE_DYNAMICS.types,IT)
    .map(q=>[q.value,q.label]));
  seedSearchResultsEl.replaceChildren();
  for(const [i,r] of rows.slice(0,8).entries()){
    const el=document.createElement('div');
    el.className='seed-result'+(r.distance<=target?' is-near':'');
    const main=document.createElement('div'),head=document.createElement('b'),details=document.createElement('small');
    head.textContent='#'+(i+1)+' · llavor '+r.seed;
    const dx=Math.round(r.x),dz=Math.round(r.z);
    details.textContent=label+' · '+r.count+' al mapa'+
      (type==='*'?' · més proper: '+(labelMap.get(r.type)||r.type):'')+
      ' · a '+Math.round(r.distance)+' m'+
      (r.distance<=target?' · dins l’objectiu':'')+' · X: '+dx+', Z: '+dz;
    main.append(head,details);
    const dist=document.createElement('b');dist.textContent=Math.round(r.distance)+' m';
    const use=document.createElement('button');use.type='button';use.textContent='Usa aquesta llavor';
    use.onclick=()=>{
      seedRandomEl.checked=false;seedInputEl.disabled=false;
      seedInputEl.value=String(r.seed);hideSeedSearch();seedInputEl.focus()
    };
    el.append(main,dist,use);seedSearchResultsEl.appendChild(el);
  }
};
async function runSeedSearch(){
  if(generationPromise||seedSearchRunning||seedSearchRunEl.disabled)return;
  seedSearchRunning=true;
  const token=++seedSearchToken,
        start=Math.max(0,Math.min(4294967295,Math.trunc(Number(seedSearchStartEl.value)||0)))>>>0,
        count=Math.max(1,Math.min(100,Math.trunc(Number(seedSearchCountEl.value)||30))),
        target=Math.max(0,Math.min(10000,Number(seedSearchDistanceEl.value)||0)),
        category=seedSearchCategoryEl.value,type=seedSearchTypeEl.value,
        label=seedSearchTypeEl.options[seedSearchTypeEl.selectedIndex]?.textContent||type,
        scale=currentMapScale(),rows=[];
  seedSearchStartEl.value=String(start);seedSearchCountEl.value=String(count);
  seedSearchDistanceEl.value=String(target);
  seedSearchMapSizeEl.value=scale===2?'Gran · 9,6 km':'Petit · 4,8 km';
  seedSearchRunEl.disabled=true;seedSearchCancelEl.disabled=false;
  seedSearchCategoryEl.disabled=true;seedSearchTypeEl.disabled=true;
  seedSearchResultsEl.replaceChildren();
  const oldScale=MAP_SCALE,oldS=S,oldH=H,oldRequested=requestedSeed,oldMode=seedSearchMode;
  let tested=0,found=0,within=0;
  // Llindar de temps: si una llavor és ràpida, en processam diverses
  // abans de cedir el fil; si és cara, retornam el control immediatament.
  const batchBudgetMs=12,batchLimit=8;
  let batchStart=performance.now(),batchCount=0,resultsDirty=false;
  MAP_SCALE=scale;S=4800*MAP_SCALE;H=S/2;seedSearchMode=true;
  minimap.setWorldSize(S,H);
  try{
    for(let i=0;i<count;i++){
      if(token!==seedSearchToken)break;
      const raw=(start+i)>>>0;
      // Una llavor visible sempre correspon a una llavor real, sense XOR.
      requestedSeed=raw;
      // Un canvi de DOM per lot en lloc de dos per cada llavor.
      try{
        const generated=buildSeedData();
        const nearest=seedSearch.findNearest({...generated,category,type});
        if(nearest){
          found++;if(nearest.distance<=target)within++;
          // En cas de reintent intern, oferim la llavor definitiva,
          // que coincidirà amb el HUD en iniciar la partida.
          rows.push({seed:generated.seed,...nearest});
          rows.sort(seedSearch.compare);
          if(rows.length>12)rows.length=12;
          resultsDirty=true;
        }
      }catch(err){console.warn('Llavor descartada durant la cerca',raw,err)}
      tested++;
      // Lots cooperatius: fins a 8 llavors, o 12 ms de feina.
      // La cancel·lació es comprova al principi de CADA llavor.
      batchCount++;
      if(batchCount>=batchLimit||performance.now()-batchStart>=batchBudgetMs){
        if(resultsDirty){renderSeedSearchResults(rows,target,label,category,type);resultsDirty=false}
        seedSearchStatusEl.textContent='Analitzades '+tested+'/'+count+' · '+found+
          ' amb '+label+' · '+within+' a '+target+' m o menys.';
        await new Promise(resolve=>requestAnimationFrame(resolve));
        batchStart=performance.now();batchCount=0;
      }
    }
    if(token===seedSearchToken){
      if(resultsDirty)renderSeedSearchResults(rows,target,label,category,type);
      const best=rows[0];
      seedSearchStatusEl.textContent=best
        ?'Cerca acabada: '+tested+' llavors · '+found+' amb '+label+
          ' · '+within+' dins '+target+' m · millor: '+Math.round(best.distance)+' m.'
        :'Cerca acabada: '+tested+' llavors; no s’ha trobat cap '+label.toLowerCase()+'.';
    }
  }finally{
    // Mai deixem la mida del mapa ni la llavor provisional de la cerca actives.
    MAP_SCALE=oldScale;S=oldS;H=oldH;requestedSeed=oldRequested;seedSearchMode=oldMode;
    minimap.setWorldSize(S,H);
    seedSearchRunning=false;
    seedSearchRunEl.disabled=false;seedSearchCancelEl.disabled=true;
    seedSearchCategoryEl.disabled=false;seedSearchTypeEl.disabled=false;
  }
}
if(seedSearchOpenEl)seedSearchOpenEl.onclick=showSeedSearch;
if(seedSearchBackEl)seedSearchBackEl.onclick=hideSeedSearch;
if(seedSearchRunEl)seedSearchRunEl.onclick=()=>{seedSearchPromise=runSeedSearch();return seedSearchPromise};
if(seedSearchCancelEl)seedSearchCancelEl.onclick=()=>{
  seedSearchToken++;seedSearchStatusEl.textContent='Cerca cancel·lada.';
  seedSearchRunEl.disabled=true;seedSearchCancelEl.disabled=true
};
// El fons del menú és un fitxer estàtic: ni llavors ni localStorage ni WebGL a la portada.
seedRandomEl.onchange=()=>{seedInputEl.disabled=seedRandomEl.checked;if(!seedRandomEl.checked)seedInputEl.focus()};
function readGameStartOptions(difficulty=DIF){
  return window.HUNTER_START_LIFECYCLE.resolveStartOptions({
    difficulty,stressPreset:stressAuditRequested?STRESS_AUDIT_PRESET:null,
    readScale:currentMapScale,randomSeed:()=>seedRandomEl.checked,
    readSeedText:()=>seedInputEl.value,seedFromText
  });
}
function applyStressAuditPosition(){
  if(!stressAuditRequested)return;
  // La posició només s'utilitza en la prova instrumentada; no afecta les
  // llavors normals ni la distribució aleatòria del món.
  const {x,z}=STRESS_AUDIT_PRESET;
  P.x=x;P.z=z;P.y=Math.max(0,hAt(x,z));P.hd=Math.atan2(x,z);
  pl.position.set(P.x,P.y,P.z);
  pl.rotation.y=P.hd;
  cv=null;resetCameraState();
  cam.position.set(P.x+18,P.y+24,P.z+32);
  cam.lookAt(P.x,P.y+2,P.z);
  if(terrainStream)terrainStream.update(P.x,P.z,visualQuality.shadows?2:1.2,cam,null);
  updateDistanceVisibility();
  updateShadowCasters(true);
  mini();
}
function applyGameStartOptions({difficulty=DIF,scale=MAP_SCALE,seed:inputSeed=requestedSeed}={}){
  const state=window.HUNTER_START_LIFECYCLE.normalizeStartState(
    {difficulty,scale,seed:inputSeed},seedFromText);
  DIF=state.difficulty;MAP_SCALE=state.mapScale;S=state.size;H=state.halfSize;
  requestedSeed=state.requestedSeed;
}
// Explicit compatibility entry point for tools/harnesses that need an immediate
// complete world. Production buttons and restart exclusively use the Promise.
function startGameSynchronously(options=readGameStartOptions()){
  if(generationPromise||seedSearchRunning)throw new Error('Ja hi ha una generació en curs');
  applyGameStartOptions(options);build();configureOptionalWorld();validateRequiredWorldFeatures();prepareOperationRegistry();if(options.restoreSnapshot)applyOperationSnapshot(options.restoreSnapshot);minimap.setWorldSize(S,H);minimap.reset();mini();
  started=1;paused=!!options.restoreSnapshot;iniEl.style.display='none';document.body.classList.add('game-started');initAudio();if(paused){ui.show('pause');audioPause()}resetSimulationClock();
}
function discardGeneratedWorld(){
  // Conservam els bindings clàssics que comparteixen generació, HUD i desaments.
  window.HUNTER_START_LIFECYCLE.cleanupGeneratedWorld({
    clearOperations:()=>{operationRegistry=null;activeOperation=null;operationRun=null;},
    resetOptionalSystems,
    terrainStream,forgetTerrainStream:()=>{terrainStream=null;},
    world,scene,resources:window.HUNTER_RESOURCES,forgetWorld:()=>{world=null;},
    resetEntities:()=>{
      ({B,Wl,Dr,stairs,piers,items,V,E,fa}=
        window.HUNTER_GAME_STATE.createWorldEntityCollections(Array));
    },
    PL,FA,TG,resetTerrainLevels:()=>{terrainLevels=[];},terrainLevelGrid,
    resetTransients:()=>{
      PM={};cv=null;ib=null;activeBunker=null;
      waterUpgradePending=false;seedCompounds=[];elapsed=0;
    },
    clearKeys,resetSimulationClock
  });
}
function startGameProgressively(options=readGameStartOptions()){
  if(nativeCoopSession&&!options.nativeSession)stopNativeCoop();
  if(operationWritePromise)return waitOperationWrite().then(()=>startGameProgressively(options));
  if(operationBusy&&!options.restoreSnapshot)return Promise.reject(new Error('Espera que acabi el desament.'));
  if(generationPromise)return generationPromise;
  if(seedSearchRunning)return Promise.reject(new Error('Espera que acabi la cerca de llavors'));
  const generationAttempt=window.HUNTER_START_LIFECYCLE.createGenerationAttempt(document);
  generationCancel=generationAttempt.cancel;
  let resolveTask,rejectTask;
  const task=new Promise((resolve,reject)=>{resolveTask=resolve;rejectTask=reject});
  // Claim ownership before executing any startup code, including code that can
  // throw before the first await. A synchronous failure must not relatch a job.
  generationPromise=task;window.HUNTER_START_PROMISE=task;task.catch(()=>{});
  (async()=>{
    window.HUNTER_GENERATION_STATE={status:'starting',stage:'Preparant el món',completed:0,total:null,steps:0,yields:0,maxStepMs:0,maxTurnMs:0,error:null};
    try{
      audioPause();
      applyGameStartOptions(options);started=0;paused=true;clearKeys();resetCameraState();ui.hide();
      document.body.classList.remove('game-started');document.body.classList.add('game-generating');
      iniEl.style.display='none';generationAttempt.enter();
      document.getElementById('startLoading').style.display='none';
      // Unlock in the activation task. Synthesise audio only after the world,
      // as before: its Math.random calls must not precede generated fauna.
      initAudio({unlockOnly:true});
      audioPause();
      const iterator=(function*(){
        yield* buildSteps();configureOptionalWorld();validateRequiredWorldFeatures();prepareOperationRegistry();
        minimap.setWorldSize(S,H);minimap.reset();
        yield* minimap.buildBackgroundSteps();mini();
      })();
      await buildProgressively({iterator,signal:generationAttempt.signal,schedule:options.schedule||window.HUNTER_GENERATION_SCHEDULE,onProgress:generationAttempt.report});
      if(generationAttempt.signal.aborted)throw generationAbortError();
      if(options.restoreSnapshot)applyOperationSnapshot(options.restoreSnapshot);else applyStressAuditPosition();
      initAudio();started=1;paused=!!options.restoreSnapshot||!simulationFocused||!!document.hidden;clearKeys();
      if(paused){ui.show('pause');audioPause()}
      window.HUNTER_GENERATION_STATE.status='ready';
      iniEl.style.display='none';document.body.classList.add('game-started');
      resetSimulationClock();return {seed,mapScale:MAP_SCALE};
    }catch(error){
      Object.assign(window.HUNTER_GENERATION_STATE,{status:error.name==='AbortError'?'cancelled':'error',error:error.message});
      started=0;paused=false;discardGeneratedWorld();ui.hide();
      iniEl.style.display='flex';startMenuEl.style.display='flex';
      seedSearchScreenEl.style.display='none';seedSearchScreenEl.setAttribute('aria-hidden','true');
      const message=document.getElementById('startLoading');
      message.textContent=error.name==='AbortError'?'Generació cancel·lada. Pots tornar a començar.':'No s’ha pogut generar el món. Torna a prémer per reintentar-ho.';
      message.style.display='block';
      if(error.name!=='AbortError')console.error('No es pot generar el món Hunter',error);
      throw error;
    }finally{
      generationAttempt.leave();
      document.body.classList.remove('game-generating');generationCancel=null;generationPromise=null;resetSimulationClock();
    }
  })().then(resolveTask,rejectTask);
  return task;
}
window.HUNTER_START_GAME=startGameProgressively;
window.HUNTER_CANCEL_START=()=>{
  const task=generationPromise;if(generationCancel)generationCancel();
  return task?task.then(()=>{},()=>{}):Promise.resolve();
};
document.getElementById('generationCancel').onclick=()=>window.HUNTER_CANCEL_START();
document.querySelectorAll('#ini button[data-d]').forEach(b=>b.onclick=()=>startGameProgressively(readGameStartOptions(+b.dataset.d)));
// animacions de destrucció
const DB=[],WA=[],dgeo=new THREE.BoxGeometry(1,1,1),dmc={},dmat=c=>dmc[c]||(dmc[c]=M(c));
function debris(x,y,z,col,n,sz,sp,shape=null){for(let i=0;i<n;i++){const m=new THREE.Mesh(dgeo,dmat(col)),d=window.HUNTER_DEBRIS_CORE.createDebrisParticle(x,y,z,sz,sp,rn);m.scale.set(d.scale.x,d.scale.y,d.scale.z);m.position.set(d.position.x,d.position.y,d.position.z);m.rotation.set(d.rotation.x,d.rotation.y,d.rotation.z);
if(shape==='timberBeam'){
  // Bigues de coberta, no blocs de runa: secció prima i llargada variable.
  const thickness=rn(.12,.22);m.scale.set(thickness,thickness,rn(2.3,4.5));
  m.rotation.set(rn(-.7,.7),rn(-Math.PI,Math.PI),rn(-.7,.7));
  d.ry=rn(-5,5);d.rz=rn(-5,5);
}
world.add(m);DB.push({...d,m,s0:m.scale.clone()})}
while(DB.length>160)world.remove(DB.shift().m)}
function vehicleDebris(v,baseY){
  if(!v?.o)return;
  v.o.updateMatrixWorld(true);
  const meshes=[];v.o.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.geometry&&!o.userData.waterMask)meshes.push(o)});
  const heavy=['tanc','tanqueta','camio'].includes(v.t),truck=v.t==='camio',air=v.t==='heli'||v.t==='heli_combat',maxPieces=heavy?24:air?20:16;
  const chosen=meshes.length<=maxPieces?meshes:meshes.filter((_,i)=>i%Math.ceil(meshes.length/maxPieces)===0).slice(0,maxPieces);
  const center=new THREE.Vector3(v.x,baseY+1,v.z),p=new THREE.Vector3(),q=new THREE.Quaternion(),sc=new THREE.Vector3();
  for(const src of chosen){
    src.matrixWorld.decompose(p,q,sc);
    const piece=new THREE.Mesh(src.geometry,src.material);piece.position.copy(p);piece.quaternion.copy(q);piece.scale.copy(sc);piece.castShadow=true;piece.receiveShadow=true;world.add(piece);
    const dx=p.x-center.x,dz=p.z-center.z,d=Math.max(.3,Math.hypot(dx,dz)),out=heavy?rn(7,16):rn(9,20);
    DB.push({m:piece,s0:piece.scale.clone(),vx:dx/d*out+rn(-5,5),vy:rn(10,heavy?22:26),vz:dz/d*out+rn(-5,5),rx:rn(truck?-1:-9,truck?1:9),ry:rn(truck?-1.25:-9,truck?1.25:9),rz:rn(truck?-.9:-9,truck?.9:9),life:rn(truck?2:2.2,truck?3.1:4.2),vehiclePart:true,truckPiece:truck})
  }
  const burst=heavy?14:10;debris(v.x,baseY+1.3,v.z,0x34383a,burst,.45,14);
  for(let i=0;i<(heavy?7:5);i++)puff(v.x+rn(-2,2),baseY+rn(.5,2.2),v.z+rn(-2,2),i%2?0x3b3b38:0x787064,rn(1.6,3.2));
  while(DB.length>240){const d=DB.shift();if(d?.m)world.remove(d.m)}
}
// Destrucció no explosiva: clones temporals de LES PECES DEL VEHICLE,
// mai boom(). Perfil propi per a bicicleta, barca de rems i windsurf.
// Les geometries/materials són compartides i no es creen textures noves.
function fragileVehicleDebris(v,baseY,forwardSpeed=0){
  if(!v?.o)return;
  const profile=window.HUNTER_DEBRIS_CORE.FRAGILE_VEHICLE_PROFILES[v.t];
  if(!profile)return;
  v.o.updateMatrixWorld(true);
  const meshes=[];
  v.o.traverse(o=>{
    if(o.isMesh&&!o.isInstancedMesh&&o.geometry&&!o.userData.waterMask)
      meshes.push(o);
  });
  const descendantOf=(mesh,node)=>{
    for(let parent=mesh;parent;parent=parent.parent)
      if(parent===node)return true;
    return false;
  };
  const importance=mesh=>{
    if(v.t==='bici'){
      if((v.o.userData.wheels||[]).some(node=>descendantOf(mesh,node)))return 100;
      return v.o.userData.crank&&descendantOf(mesh,v.o.userData.crank)?65:30;
    }
    if(v.t==='barca_rems')
      return (v.o.userData.oars||[]).some(node=>descendantOf(mesh,node))?100:55;
    if(mesh.name==='windsurf-sail')return 120;
    if(mesh.name==='windsurf-sail-panels')return 115;
    return v.o.userData.windsurfRig&&descendantOf(mesh,v.o.userData.windsurfRig)?90:60;
  };
  const chosen=meshes.sort((a,b)=>importance(b)-importance(a)).slice(0,profile.maxPieces),
        center=new THREE.Vector3(v.x,baseY+1,v.z),p=new THREE.Vector3(),
        q=new THREE.Quaternion(),scale=new THREE.Vector3();
  for(const src of chosen){
    src.matrixWorld.decompose(p,q,scale);
    const piece=new THREE.Mesh(src.geometry,src.material);
    piece.position.copy(p);piece.quaternion.copy(q);piece.scale.copy(scale);
    piece.castShadow=true;piece.receiveShadow=true;world.add(piece);
    const movement=window.HUNTER_DEBRIS_CORE.fragileVehicleFragmentMotion(
      v.t,p,center,v.hd,forwardSpeed,rn);
    DB.push({...movement,m:piece,s0:piece.scale.clone()});
  }
  // Estelles i engrunes de material, però sense fum, flama ni dany en àrea.
  debris(v.x,baseY+.8,v.z,profile.color,profile.crumbs,.25,8);
  if(v.t!=='bici'&&hAt(v.x,v.z)<0){
    const surface=wy(v.x,v.z,elapsed);
    for(let i=0;i<3;i++)puff(v.x+rn(-1,1),surface+rn(0,.3),
      v.z+rn(-1,1),i%2?0x9ccbd5:0xe0edf0,rn(.55,1.1));
  }
  while(DB.length>220){const d=DB.shift();if(d?.m)world.remove(d.m)}
}
function wallBreak(w){if(w.porchSupports)collapsePorch(w.owner);
for(const trim of w.timberTrim||[])trim.visible=false;
const h=w.y1-w.y0-1,parts=w.parts&&w.parts.length?w.parts:[w.m],base=parts[0],col=w.barbed?0x4a4f52:(base?.material?.color?.getHex?.()??0x8d9389),cx=(w.x0+w.x1)/2,cz=(w.z0+w.z1)/2;
// Els brancals, la porta i la llinda són un sol conjunt estructural.
// Les peces d'una obertura s'oculten alhora, sense marcs residuals.
if(w.doorAssembly||w.parts&&w.parts.length){parts.forEach(m=>{if(m)m.visible=false})}
else if(w.m?.visible)WA.push({m:w.m,h,t:.5});else if(w.m?.parent)w.m.parent.remove(w.m);
for(let i=0;i<(w.door?6:10);i++)debris(rn(w.x0,w.x1),w.y0+1+h*rn(.2,.9),rn(w.z0,w.z1),col,1,.9,7);
for(let i=0;i<3;i++)puff(cx,w.y0+1+h*rn(.1,.6),cz,0xc9b48a,3.5)}
function destroyInteriorStair(b){
 const a=b?.interiorStair;if(!a||a.destroyed)return;
 a.destroyed=true;
 if(b.interiorStairGroup)b.interiorStairGroup.visible=false;
 let i=stairs.indexOf(a);if(i>=0)stairs.splice(i,1);
 i=Wl.indexOf(b.interiorStairCollider);
 if(i>=0){Wl.splice(i,1);wallGridCount=-1}
}
// Fragments reals del metall de la volta: reconstruïm els mateixos deu
// trams corbats a partir de les dades físiques, sense geometries noves ni
// canviar la llavor. Cada panell es parteix en tres seccions longitudinals.
// Els fragments viuen a world, independents de l'ocultació de b.roof quan
// la càmera entra a l'hangar. Només apareixen després de la destrucció.
function shatterHangarRoof(b){
  const roof=b.roof,segments=roof?.userData?.hitSegments;
  if(!segments?.length){if(roof)roof.visible=false;return}
  roof.updateWorldMatrix(true,false);
  const material=roof.children.find(mesh=>mesh.isMesh)?.material;
  if(!material){roof.visible=false;return}
  const frame=new THREE.Quaternion(),panelTurn=new THREE.Quaternion(),
    zAxis=new THREE.Vector3(0,0,1),position=new THREE.Vector3();
  roof.getWorldQuaternion(frame);
  roof.visible=false;
  for(const section of segments){
    const length=section.depth/3;
    panelTurn.setFromAxisAngle(zAxis,section.a-Math.PI/2);
    for(let part=0;part<3;part++){
      const fragment=new THREE.Mesh(dgeo,material),
        localZ=-section.depth/2+length*(part+.5);
      position.set(section.x,section.y,localZ).applyMatrix4(roof.matrixWorld);
      fragment.position.copy(position);
      fragment.quaternion.copy(frame).multiply(panelTurn);
      fragment.scale.set(section.chord,.24,length*.985);
      fragment.castShadow=false;fragment.receiveShadow=true;
      world.add(fragment);
      const radial=section.x>=0?1:-1;
      DB.push({m:fragment,s0:fragment.scale.clone(),
        vx:radial*rn(2,8)+rn(-3,3),
        vy:rn(5,12),vz:(part-1)*rn(3,8)+rn(-3,3),
        rx:rn(-2.5,2.5),ry:rn(-2.5,2.5),rz:rn(-3.2,3.2),
        life:rn(1.9,3),vehiclePart:true});
    }
  }
  // Les peces utilitzen dgeo i materials compartits; no cal disposar-los
  // en retirar les partícules, i limitam el pool com als altres enderrocs.
  while(DB.length>160)world.remove(DB.shift().m);
}
function roofBreak(b){if(b.rb)return;b.rb=1;
 // Els objectes del pis superior no poden quedar suspesos després
 // de l'ensorrament: cauen a la planta baixa.
 if(b.upperFloor)for(const it of items){
   if(it.building===b&&it.y>b.fy+b.storey){
     it.y=b.fy+1.3;if(it.o)it.o.position.y=it.y;
   }
 }
 // Quan cau la sustentació desapareixen el forjat, el marc i l'escala.
 if(b.upperFloor){b.upperFloor.visible=false;destroyInteriorStair(b)}
 for(const r of b.extraRoofs||[])r.visible=false;b.rhp=0;const col=b.roof.material?b.roof.material.color.getHex():(b.roof.userData.color||0x777777),y=b.fy+b.h+.6;
if(b.hangar&&b.roof?.userData?.hangarRoof){
  shatterHangarRoof(b);
  for(let i=0;i<12;i++)puff(b.x+rn(-b.w/2,b.w/2),b.fy+rn(1,b.w*.45),b.z+rn(-b.d/2,b.d/2),0x8b8580,3.8);
  for(let i=0;i<10;i++)debris(b.x+rn(-b.w/2,b.w/2),b.fy+rn(1,b.w*.45),b.z+rn(-b.d/2,b.d/2),col,1,.75,6);
}else{
  b.roof.visible=false;
  if(b.wood||b.civilianHut){
    // La fusta del sostre té bigues marrons fins i tot en complexos aliats
    // (on el color administratiu de la coberta pot ser blau).
    const timberColors=[0x69533a,0x887044,0x6d5637,0xa08a57];
    for(let i=0;i<20;i++)debris(b.x+rn(-b.w/2,b.w/2),y,b.z+rn(-b.d/2,b.d/2),timberColors[i%timberColors.length],1,1.3,9,'timberBeam');
  }else{
    for(let i=0;i<20;i++)debris(b.x+rn(-b.w/2,b.w/2),y,b.z+rn(-b.d/2,b.d/2),col,1,1.3,9);
  }
  for(let i=0;i<8;i++)puff(b.x+rn(-b.w/2,b.w/2),y,b.z+rn(-b.d/2,b.d/2),0xc9b48a,4.5)
}
snd('boom',.4,{x:b.x,y,z:b.z},b)}
function fragileDebrisWaterHeight(x,z){return wy(x,z,elapsed)}
function updDeb(dt){for(let i=DB.length-1;i>=0;i--){const d=DB[i],m=d.m,k=window.HUNTER_DEBRIS_CORE.stepDebrisParticle(d,m.position,m.rotation,dt,hAt,fragileDebrisWaterHeight);m.scale.set(d.s0.x*k,d.s0.y*k,d.s0.z*k);if(d.life<=0){world.remove(m);DB.splice(i,1)}}
for(let i=WA.length-1;i>=0;i--){const a=WA[i];a.t-=dt;const s=Math.max(0,a.t/.5);a.m.scale.y=s;a.m.position.y=a.h/2*s;if(a.t<=0){world.remove(a.m);WA.splice(i,1)}}
updFA(dt)}
// vegetació
const TG=new Map();
function treeHit(x,z,r){const cx=Math.floor(x/16),cz=Math.floor(z/16);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=TG.get((cx+a)+','+(cz+b));if(L)for(const t of L)if(!(palmsDisabled&&t.p)&&Math.hypot(x-t.x,z-t.z)<t.r+r)return true}return false}
// Col·lisió del jugador amb la silueta REAL del tronc corbat, no només
// amb el cercle de l'arrel. La mateixa corba sinusoïdal s'usa a vegetation.js;
// la rotació i l'escala provenen de la mateixa palmera determinista.
function palmPush(t,r0){window.HUNTER_WORLD_PHYSICS.pushPalm(P,t,r0)}
function treePush(){
  const r0=.5,cx=Math.floor(P.x/16),cz=Math.floor(P.z/16);
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
    const L=TG.get((cx+a)+','+(cz+b));if(!L)continue;
    for(const t of L)window.HUNTER_WORLD_PHYSICS.pushTree(P,t,palmsDisabled,r0);
  }
}
function nearbyRock(x,z,r=0,baseY=-Infinity,topY=Infinity){
 const cx=Math.floor(x/16),cz=Math.floor(z/16),
   steps=Math.max(1,Math.ceil((r+8)/16));
 let hit=null,dist=Infinity;
 for(let a=-steps;a<=steps;a++)for(let b=-steps;b<=steps;b++){
   const L=TG.get((cx+a)+','+(cz+b));if(!L)continue;
   for(const t of L){
     if(!t.rock||t.topY<baseY-.5||t.bottomY>topY+.5)continue;
     const d=Math.hypot(x-t.x,z-t.z);
     if(d<t.r+r&&d<dist){hit=t;dist=d}
   }
 }
 return hit;
}
function vehiclePushPlayer(){
  if(cv||playerFall)return;
  // Els vaixells patrulla també tenen un casc físic en mode enemic.
  // Quan la tripulació mor i el casc passa a V, no es duplica el contacte.
  for(const v of [...V,...E.filter(u=>['jeep','tanqueta','tanc','patrulla_marina'].includes(u.t))]){
    if(v.destroyed)continue;
    const overlap=circleVehicleOverlap(P.x,P.z,.62,v),
          sweep=runoverSweepHit(v.impactFromX??v.x,v.impactFromZ??v.z,
            v.x,v.z,P.x,P.z,vehicleRadius(v.t)*.68+.62*.45);
    if(!overlap&&!sweep)continue;
    if(v.t==='ferry'&&(terminalRampHeight(P.x,P.z)!==null||pedestrianFerry(P.x,P.z,P.y)?.f===v))continue;
    // Només apartam el jugador si el buc l'ocupa ara; un pas ràpid
    // que ja l'ha travessat conserva el dany sense teletransportar-lo.
    if(overlap){
      const b=vehicleBox(v),dx=P.x-b.x,dz=P.z-b.z,s=Math.sin(b.hd),c=Math.cos(b.hd),lx=dx*c-dz*s,lz=dx*s+dz*c,ex=b.w/2+.66-Math.abs(lx),ez=b.d/2+.66-Math.abs(lz);
      if(ex<ez){const sign=lx<0?-1:1;P.x=b.x+(sign*(b.w/2+.66))*c+lz*s;P.z=b.z-(sign*(b.w/2+.66))*s+lz*c}
      else{const sign=lz<0?-1:1;P.x=b.x+lx*c+sign*(b.d/2+.66)*s;P.z=b.z-lx*s+sign*(b.d/2+.66)*c}
    }
    const sp=Math.abs(v.v??v.impactSpeed??0),
          dmg=runoverDamage(sp,VT[vehicleHitType(v.t)]?.mass||1);
    if(dmg>0&&!(playerEject?.kind==='flip'&&playerEject.t>0)&&(!v.playerHitCd||v.playerHitCd<=0)){
      hurtP(dmg,false,{type:'runover',x:v.x,y:v.o?.position?.y??P.y,z:v.z});v.playerHitCd=.45;msg='Impacte amb un vehicle!';msgT=1.5;
    }
  }
}
const PL=[],FA=[],ZM=new THREE.Matrix4().makeScale(0,0,0);let PM={};
// L'opció només canvia el render, les col·lisions i les actualitzacions
// durant la partida. La generació conserva els mateixos nombres aleatoris
// i posicions per permetre una comparació justa amb la mateixa llavor.
let palmsDisabled=false;
function setPalmsDisabled(disabled){
  palmsDisabled=!!disabled;
  const checkbox=document.getElementById('disablePalms');
  if(checkbox)checkbox.checked=palmsDisabled;
  if(PM.trunk)PM.trunk.visible=!palmsDisabled;
  for(const a of FA)if(a.y)a.y.visible=!palmsDisabled;
  if(!palmsDisabled&&PM.update)PM.update(P.x,P.z,true);
  window.HUNTER_PALMS_DISABLED=palmsDisabled;
  return palmsDisabled;
}
const palmSettingCheckbox=document.getElementById('disablePalms');
if(palmSettingCheckbox)palmSettingCheckbox.addEventListener('change',()=>setPalmsDisabled(palmSettingCheckbox.checked));
const vegetationVisual=window.HUNTER_VEGETATION.create(THREE,{materialProfile,random:rr});
let compoundClear=[];
function treeAt(x,z,r){const cx=Math.floor(x/16),cz=Math.floor(z/16);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=TG.get((cx+a)+','+(cz+b));if(L)for(const t of L)if(!(palmsDisabled&&t.p)&&Math.hypot(x-t.x,z-t.z)<t.r+r)return t}return null}
function crush(x,z,r){if(palmsDisabled)return;const cx=Math.floor(x/16),cz=Math.floor(z/16);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=TG.get((cx+a)+','+(cz+b));if(L)L.slice().forEach(t=>{if(t.p&&Math.hypot(x-t.x,z-t.z)<t.r+r)killPalm(t)})}}
function dmgP(t,d){if(!t.alive)return;const amount=wholeDamage(d);if(!amount)return;t.hp=Math.max(0,Math.ceil(t.hp)-amount);if(t.hp<=0)killPalm(t)}
function killPalm(t){if(!t.alive)return;t.alive=false;const a=TG.get(t.k);if(a){const i=a.indexOf(t);if(i>=0)a.splice(i,1)}
// La palmera que cau reutilitza la copa, els tons i la inclinació originals,
// abans que el sector instanciat n'esborri les matrius.
const g=PM.falling?.(t);if(PM.remove)PM.remove(t.i,ZM);
if(g&&g.children.length){
 const y=new THREE.Group();y.position.set(t.x,t.y,t.z);y.rotation.y=t.yaw;y.scale.setScalar(t.s);y.add(g);
 world.add(y);FA.push({y,g,t:0,s:t.s,x:t.x,z:t.z,yaw:t.yaw});
}
}
function updFA(dt){for(let i=FA.length-1;i>=0;i--){const a=FA[i];a.t+=dt;const frame=window.HUNTER_DEBRIS_CORE.palmFallFrame(a,a.t,hAt);a.g.rotation.z=frame.angle;
if(frame.progress>=1){for(const d of [frame.leaves,frame.wood])debris(d.x,d.y,d.z,d.color,d.count,d.size,d.speed);const p=frame.dust;puff(p.x,p.y,p.z,p.color,p.size);
 a.g.traverse(part=>{if(part.userData?.palmFallMaterial)part.material.dispose()});
 world.remove(a.y);FA.splice(i,1)}}}

function vegetate(pa){return drainBuildSteps(vegetateSteps(pa))}
function* vegetateSteps(pa){TG.clear();PL.length=0;FA.length=0;
const layout=yield* window.HUNTER_VEGETATION_LAYOUT.vegetationLayoutSteps({
 halfSize:H,islands,heightAt:hAt,seed,random:R,spawn:pa,buildings:B,stairs,compounds:compoundClear,
 // Only skip points outside every island's 2*r influence and every levelled area.
 mayHaveLand:(x,z)=>!!islandGrid.at(x,z)||!!terrainLevelGrid.at(x,z)
}),{palms:pm,bushes:bu,rocks:rk,rockFieldStats}=layout;
for(const e of layout.trees){let a=TG.get(e.k);if(!a)TG.set(e.k,a=[]);a.push(e);if(e.p)PL.push(e);}
world.userData.rockFieldStats={...rockFieldStats,totalRocks:rk.length};
if(seedSearchMode){
  // vegetationVisual.build consumeix 11 tirades/palmera (tronc + dues
  // copes), 3/arbust i 5/roca. Preservam EXACTAMENT l'estat final del
  // generador R sense construir cap InstancedMesh.
  for(let n=pm.length*11+bu.length*3+rk.length*5;n>0;n--){if(n%1024===0)yield {stage:'Colors de vegetació',completed:null,total:null};R()}
  PM={stats:{},update(){},remove(){}};return;
}
const vegetationMeshes=yield* vegetationVisual.buildSteps({
  world,palms:pm,bushes:bu,rocks:rk,playerX:pa.x,playerZ:pa.z,
  lowQuality:!visualQuality.shadows,lodProfile:qualityName
});
PM=vegetationMeshes.palms;
window.HUNTER_VEGETATION_STATS={...PM.stats,rockFields:rockFieldStats,placement:layout.placementStats}}
function fr(x,z){let a=1e9,b=-1e9;for(const[i,j]of[[0,0],[9,9],[-9,9],[9,-9],[-9,-9],[9,0],[-9,0],[0,9],[0,-9]]){const h=hAt(x+i,z+j);a=Math.min(a,h);b=Math.max(b,h)}return b-a}
function checkRoofSupport(b,w){
 if(window.HUNTER_SHARED_COMBAT.countDestroyedSupport(b,w))roofBreak(b);
}
function demolishCivilianHut(b){
 if(!b?.civilianHut||b.hutCollapsed)return;
 b.hutCollapsed=true;
 for(const part of Wl.slice()){
  if(part.owner!==b||part.destroyedWall)continue;
  part.destroyedWall=true;part.hp=0;part.open=true;part.playerBlock=false;
  wallBreak(part);
  const i=Wl.indexOf(part);if(i>=0){Wl.splice(i,1);wallGridCount=-1}
  const j=Dr.indexOf(part);if(j>=0)Dr.splice(j,1);
  if(b.door===part)b.door=null;
 }
 roofBreak(b);
}
function collapsePorch(b,effects=true){
 if(!b?.porchParts?.length)return;
 const alreadyDestroyed=!!b.porchDestroyed;
 b.porchDestroyed=true;
 for(const part of b.porchParts)part.visible=false;
 if(effects&&!alreadyDestroyed){
  for(let i=0;i<7;i++)debris(b.x+rn(-2.8,2.8),b.fy+rn(1.2,4.8),
    b.z+b.d/2+rn(.5,3),0x806447,1,.55,7,'timberBeam');
  puff(b.x,b.fy+1.3,b.z+b.d/2+2,0xb5a389,3.6);
 }
}
function collapseCivicProp(w,effects=true){
 const civic=w?.civicObject;
 if(!civic||civic.broken)return false;
 civic.broken=true;
 for(const member of civic.walls){
  member.hp=0;member.open=true;member.destroyedWall=true;member.playerBlock=false;
  const i=Wl.indexOf(member);if(i>=0)Wl.splice(i,1);
 }
 if(civic.rubbleWall)civic.rubbleWall.open=false;
 for(const child of civic.intact)child.visible=false;
 if(civic.rubble)civic.rubble.visible=true;
 wallGridCount=-1;
 if(effects){
  const wood=civic.kind==='bench';
  for(let i=0;i<(wood?8:14);i++)
   debris(civic.x+rn(-1.3,1.3),civic.y+rn(.5,1.4),
     civic.z+rn(-1.2,1.2),wood?0x806447:0x868879,1,wood?.4:.55,wood?6:8);
  for(let i=0;i<3;i++)puff(civic.x,civic.y+1,civic.z,wood?0x9b8a68:0x9a978a,2.2);
  snd(wood?'woodBreak':'boom',wood?.72:.34,{x:civic.x,y:civic.y+1,z:civic.z},civic);
 }
 return true;
}
function dmgW(w,d,shotClass='heavy'){
 // La peanya i el cos superior de l'antena comparteixen la vida.
 if(w.antennaRoot)w=w.antennaRoot;
 if(w.civicRubble)return;
 if(w.civicFurniture){
  if(w.civicFurniture==='well'&&shotClass==='light')return;
  const civic=w.civicObject,amount=wholeDamage(d);
  if(!civic||civic.broken||!amount)return;
  const hp=Math.max(0,Math.ceil(w.hp)-amount);
  for(const member of civic.walls)member.hp=hp;
  if(hp===0)collapseCivicProp(w);
  return;
 }
 if(w.towerLegOwner){if(!w.towerLegOwner.destroyed)hurtE(w.towerLegOwner,d);return}
 if(shotClass==='light'&&!w.antennaMembers&&!window.HUNTER_SHARED_COMBAT.canLightDamageWall(w))return;
 const amount=wholeDamage(d);
 if(!amount||!Number.isFinite(w.hp)||w.hp<=0)return;
 if(w.owner?.civilianHut&&amount>=COMBAT_BALANCE.weapons.bazooka){
  demolishCivilianHut(w.owner);return;
 }
 w.hp=Math.max(0,Math.ceil(w.hp)-amount);
 if(w.hp>0)return;
 // Destrucció atòmica de tota l'obertura: cap porta o llinda invisible
 // pot conservar la col·lisió després de caure un dels dos brancals.
 const members=w.antennaMembers||(w.woodenDoor?[w]:(w.doorAssembly||[w]));
 for(const piece of members){
  if(!piece||piece.destroyedWall)continue;
  piece.destroyedWall=true;piece.hp=0;piece.open=true;piece.playerBlock=false;
  wallBreak(piece);
  let i=Wl.indexOf(piece);if(i>=0){Wl.splice(i,1);wallGridCount=-1}
  i=Dr.indexOf(piece);if(i>=0)Dr.splice(i,1);
  if(piece.owner?.door===piece)piece.owner.door=null;
  if(piece.stairStructure)destroyInteriorStair(piece.stairStructure.owner);
  checkRoofSupport(piece.owner,piece);
 }
 snd(w.woodenDoor?'woodBreak':'boom',w.woodenDoor?.72:.3,{x:w.cx??(w.x0+w.x1)/2,y:(w.y0+w.y1)/2,z:w.cz??(w.z0+w.z1)/2},w);
}
function mkB(x,z,w,d,h,col,roof,opt={}){const fy=hAt(x,z),visual=seedSearchMode
  ?{group:new THREE.Group(),walls:null,doors:null,roof:new THREE.Group()}
  :(opt.hangar?buildingVisual.createHangarShell:buildingVisual.createShell)({width:w,depth:d,height:h,wallColor:col,roofColor:roof}),
  g=visual.group,wm=visual.walls,dm=visual.doors,shell=window.HUNTER_BUILDING_SHELL.planBuildingShell(w,d,h,opt,R),
 {dw,ds,wallH,wallHp,roofHp}=shell,structuralWalls=[],buildingWallStart=Wl.length;
let entranceDoor=null;
const seg=(lx,lz,sx,sz,dr,windows=false,supportSide=null,supportWeight=0,level=0)=>{if(!dr){const parts=seedSearchMode?[new THREE.Object3D()]:windows?buildingVisual.addWindowedWall(g,{lx,lz,sx,sz,height:wallH,material:wm}):[buildingVisual.addWall(g,{lx,lz,sx,sz,height:wallH,material:wm})],m=parts[0],layout=windows?window.HUNTER_BUILDING_SHELL.windowLayout(sx,sz,wallH):null,glassMeshes=parts.filter(mesh=>mesh.userData.windowPane!==undefined),o={x0:x+lx-sx/2,x1:x+lx+sx/2,z0:z+lz-sz/2,z1:z+lz+sz/2,y0:fy+level-(level?0:1),y1:fy+level+wallH,hp:wallHp,m,parts:windows?parts:null,door:false,open:false,rammable:true,cx:x+lx,cz:z+lz,supportSide,supportWeight,upperFloorWindow:!!layout&&level>0,...(layout?{windowPanes:layout.centers.map(c=>({axis:layout.alongX?'z':'x',x:x+lx+(layout.alongX?c:0),z:z+lz+(layout.alongX?0:c),y0:fy+level+layout.bottom+.09,y1:fy+level+layout.bottom+layout.height-.09,width:layout.width-.18})),glassMeshes}: {})};for(const mesh of parts)mesh.position.y+=level;Wl.push(o);if(supportWeight>0)structuralWalls.push(o);return o}
const doorHeight=Math.min(opt.doorHeight||window.HUNTER_BUILDING_SHELL.STANDARD_BUILDING_DOOR.height,Math.max(2.8,wallH-.65)),parts=seedSearchMode?{door:new THREE.Object3D(),doorHeight}:buildingVisual.addDoor(g,{lx,lz,sx,sz,height:wallH,wallMaterial:wm,doorMaterial:dm,doorHeight,thinWoodDoor:!opt.bunker&&!opt.hangar&&!opt.workshop}),normal=[[0,1],[0,-1],[1,0],[-1,0]][ds],woodenDoor=!opt.bunker&&!opt.hangar&&!opt.workshop,thickness=window.HUNTER_BUILDING_SHELL.WOODEN_DOOR_THICKNESS,door={x0:x+lx-(woodenDoor&&ds>=2?thickness:sx)/2,x1:x+lx+(woodenDoor&&ds>=2?thickness:sx)/2,z0:z+lz-(woodenDoor&&ds<2?thickness:sz)/2,z1:z+lz+(woodenDoor&&ds<2?thickness:sz)/2,y0:fy-1,y1:fy+parts.doorHeight,hp:opt.bunker?window.HUNTER_BUILDING_SHELL.BUNKER_DOOR_HP:window.HUNTER_BUILDING_SHELL.WOODEN_DOOR_HP,woodenDoor:!opt.bunker&&!opt.hangar&&!opt.workshop,m:parts.door,door:true,open:!!opt.openDoor,alwaysOpen:!!opt.openDoor,locked:!!opt.lockedDoor,cx:x+lx,cz:z+lz,nx:normal[0],nz:normal[1],doorWidth:dw,doorHeight:parts.doorHeight,bunkerGate:!!opt.bunker,openProgress:opt.bunker?0:null,openDuration:opt.bunker?10:null,closedLocalY:parts.door.position.y,rammable:true};Wl.push(door);Dr.push(door);entranceDoor=door;
let lintel=null;
if(parts.lintel){
 lintel={x0:x+lx-sx/2,x1:x+lx+sx/2,z0:z+lz-sz/2,z1:z+lz+sz/2,
  y0:fy+parts.doorHeight,y1:fy+wallH,hp:wallHp,m:parts.lintel,
  door:false,open:false,playerBlock:false,cx:x+lx,cz:z+lz};
 Wl.push(lintel);
}
return {door,lintel};};
const created=[];
for(const part of shell.segments){
 if(part.hangarPost){const sh=Math.max(3.1,h*.3),{lx,lz,sx,sz}=part,
   m=seedSearchMode?new THREE.Object3D():buildingVisual.addWall(g,{lx,lz,sx,sz,height:sh,material:wm}),
   o={x0:x+lx-sx/2,x1:x+lx+sx/2,z0:z+lz-sz/2,z1:z+lz+sz/2,y0:fy-1,y1:fy+sh,hp:10,m,door:false,open:false,rammable:true,cx:x+lx,cz:z+lz};
   Wl.push(o);created.push(o);
 }else if(part.hangarRearWall){
   // Un sol objectiu de 10 PV, però amb contorn semicircular com la volta.
   const {lx,lz,sx,sz}=part,
     archHeight=.12+sx/2,
     m=seedSearchMode?new THREE.Object3D():
       buildingVisual.addHangarRearWall(g,{lx,lz,sx,sz,material:wm}),
     o={x0:x+lx-sx/2,x1:x+lx+sx/2,z0:z+lz-sz/2,z1:z+lz+sz/2,
       y0:fy-1,y1:fy+archHeight,hp:wallHp,m,door:false,open:false,
       rammable:true,cx:x+lx,cz:z+lz,hangarRearWall:true};
   Wl.push(o);created.push(o);
 }else created.push(seg(part.lx,part.lz,part.sx,part.sz,part.door,part.windows,part.supportSide,part.supportWeight,part.level));
}
for(const indices of shell.assemblies){
 const assembly=indices.flatMap(i=>created[i]?.door?[created[i].door,created[i].lintel].filter(Boolean):[created[i]]);
 for(const part of assembly)part.doorAssembly=assembly;
}
g.position.set(x,fy,z);if(!seedSearchMode)world.add(g);
const b={o:g,x,z,hw:w/2+1.5,hd:d/2+1.5,w,d,h,fy,wm,dm,roof:visual.roof,foundation:visual.foundation,rhp:roofHp,hangar:!!opt.hangar,civilianHut:!!opt.civilianHut,weakWood:!!(opt.weakWalls||opt.civilianHut),door:entranceDoor,doorSide:ds,doorWidth:dw,kind:opt.kind||'house',structuralWalls,destroyedWallSupport:0};for(const piece of Wl.slice(buildingWallStart)){piece.owner=b;if(b.weakWood&&!piece.door)piece.weakWood=true;}
structuralWalls.forEach(w=>w.owner=b);B.push(b);if(opt.hangar)addRampAccess(b,ds);else if(!opt.workshop)addStairs(b,ds);return b}
function mkEnemyBunker(x,z){
  const firstWall=Wl.length,b=mkB(x,z,40,34,10,0xd9ded2,0xbfc6bb,{kind:'enemy_bunker',bunker:true,doorSide:0,doorWidth:4,doorHeight:4.4,lockedDoor:true}),g=b.o,inset=3.5;
  if(seedSearchMode){
    // Només els registres físics del búnquer: mateix volum que el joc.
    for(const w of b.structuralWalls){const lean=inset*2.2/b.h;
      if(w.supportSide===0)w.z0-=lean;
      if(w.supportSide===1)w.z1+=lean;
      if(w.supportSide===2)w.x0-=lean;
      if(w.supportSide===3)w.x1+=lean;
    }
    const wall=(lx,lz,sx,sz)=>Wl.push({x0:x+lx-sx/2,x1:x+lx+sx/2,
      z0:z+lz-sz/2,z1:z+lz+sz/2,y0:b.fy-1,y1:b.fy+8,hp:window.HUNTER_BUILDING_SHELL.BUNKER_STRUCTURE_HP,
      door:false,open:false,rammable:true,cx:x+lx,cz:z+lz,owner:b});
    for(const lx of[-4,4])for(const [lz,d]of[[-12.5,3],[-4,6],[7,10]])wall(lx,lz,.6,d);
    for(const lx of[-11,11])wall(lx,-7,12,.6);
    b.generalSpots=[{x,z:z-9}];addBunkerBasement(b);return b;
  }
  // Taper every exterior face; keep the gate vertical and independently animated.
  const meshes=new Set(Wl.slice(firstWall).filter(w=>!w.door).flatMap(w=>w.parts||[w.m]));
  for(const mesh of meshes){
    const p=mesh.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const t=Math.max(0,Math.min(1,(p.getY(i)+mesh.position.y)/b.h));
      p.setX(i,(p.getX(i)+mesh.position.x)*(1-2*inset*t/b.w)-mesh.position.x);
      p.setZ(i,(p.getZ(i)+mesh.position.z)*(1-2*inset*t/b.d)-mesh.position.z);
    }
    p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
  }
  b.roof.scale.set((b.w-2*inset)/(b.w+1.35),1,(b.d-2*inset)/(b.d+1.35));g.userData.bunkerWallInset=inset;
  // Physical footprints cover the inward lean at character height.
  for(const w of b.structuralWalls){const lean=inset*2.2/b.h;if(w.supportSide===0)w.z0-=lean;if(w.supportSide===1)w.z1+=lean;if(w.supportSide===2)w.x0-=lean;if(w.supportSide===3)w.x1+=lean;}
  const wall=(lx,lz,sx,sz)=>{const m=buildingVisual.addWall(g,{lx,lz,sx,sz,height:8,material:b.wm});Wl.push({x0:x+lx-sx/2,x1:x+lx+sx/2,z0:z+lz-sz/2,z1:z+lz+sz/2,y0:b.fy-1,y1:b.fy+8,hp:window.HUNTER_BUILDING_SHELL.BUNKER_STRUCTURE_HP,m,door:false,open:false,rammable:true,cx:x+lx,cz:z+lz,owner:b})};
  for(const lx of[-4,4])for(const [lz,d]of[[-12.5,3],[-4,6],[7,10]])wall(lx,lz,.6,d);
  for(const lx of[-11,11])wall(lx,-7,12,.6);
  for(const sign of[-1,1]){const shape=new THREE.Shape();shape.moveTo(sign*2,0);shape.lineTo(sign*3.5,0);shape.lineTo(sign*2.7,5.2);shape.lineTo(sign*2,5.2);shape.closePath();const post=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:3.3,bevelEnabled:false}),M(0x795337,'masonry'));post.position.z=b.d/2-2.8;g.add(post)}
  bx(g,5.4,.85,3.3,0x795337,0,4.8,b.d/2-1.15,'masonry');
  bx(g,5,1.1,2.5,0x5a5944,0,.9,-12,'paint');
  b.generalSpots=[{x,z:z-9}];addBunkerBasement(b);return b;
}
// Soterrani integrat sota el model existent: ni la porta blindada ni les
// parets inclinades de la planta principal canvien. La variant deriva només
// de la llavor i del lloc del búnquer, sense consumir cap tirada global R().
function addBunkerBasement(b){
  // L'edifici estàndard té una base massissa de 12,3 m: omplia
  // completament el soterrani i ocultava tant les escales com els mobles.
  // Només al búnquer retiram aquesta base i la substituïm pel forjat
  // superior perforat i pel terra inferior construïts a continuació.
  if(b.foundation){
    b.o.remove(b.foundation);
    b.foundation.geometry?.dispose();
    b.foundation.material?.dispose();
    b.foundation=null;
  }
  const {variant,floorY,halfX,halfZ,stairSide,divisions,westDoors,eastDivider,stairX,stairTop,stairBottom}=window.HUNTER_WORLD_GENERATION.bunkerBasementPlan(seed,b);
  b.basement={variant,floorY,halfX,halfZ,upperSlabMeshes:[],lights:[],
    cameraHiddenWalls:[],lightsOn:false,doors:[],
    stair:{x:stairX,zTop:stairTop,zBottom:stairBottom,width:3.3},
    generalLocal:{x:-19,z:variant%2?15:-15},eliteLocal:[
      {x:0,z:-15},{x:-1,z:14},
      {x:17,z:stairSide>0?-16:16},
      {x:-19,z:(divisions[0]+divisions[1])/2}
    ]};
  activeBunker=b;
  const wall=(lx,lz,w,d,base=-9.2,height=9.25,color=0x68756d)=>{
    const mesh=seedSearchMode?new THREE.Object3D():bx(b.o,w,height,d,color,lx,base+height/2,lz,'masonry');
    mesh.castShadow=true;mesh.receiveShadow=true;
    Wl.push({x0:b.x+lx-w/2,x1:b.x+lx+w/2,z0:b.z+lz-d/2,z1:b.z+lz+d/2,
      y0:b.fy+base,y1:b.fy+base+height,hp:Infinity,m:mesh,door:false,
      open:false,rammable:false,cx:b.x+lx,cz:b.z+lz,owner:b,
      bunkerBasementWall:true});
  };
  const floorPanel=(xa,xb,za,zb,level,color)=>{
    if(seedSearchMode)return;
    const panel=bx(b.o,xb-xa,.26,zb-za,color,(xa+xb)/2,level-.13,(za+zb)/2,'terrain');
    panel.receiveShadow=true;
  };
  // Forjat amb un buit real per a l'escala. Els projectils impacten al
  // forjat però no bloqueja lateralment el moviment del jugador.
  const slab=(xa,xb,za,zb)=>{
    if(!seedSearchMode){
      const before=b.o.children.length;
      floorPanel(xa,xb,za,zb,.22,0x8e9588);
      for(const mesh of b.o.children.slice(before)){
        mesh.name='bunker-forjat-opac';
        mesh.material=mesh.material.clone();
        mesh.material.transparent=false;
        mesh.material.opacity=1;
        mesh.material.depthWrite=true;
        mesh.material.side=THREE.DoubleSide;
        b.basement.upperSlabMeshes.push(mesh);
      }
    }
    Wl.push({x0:b.x+xa,x1:b.x+xb,z0:b.z+za,z1:b.z+zb,
      y0:b.fy-.03,y1:b.fy+.22,hp:Infinity,m:new THREE.Object3D(),
      door:false,open:false,rammable:false,playerBlock:false,
      cx:b.x+(xa+xb)/2,cz:b.z+(za+zb)/2,owner:b});
  };
  const st=b.basement.stair,shaftLeft=st.x-st.width/2,
        shaftRight=st.x+st.width/2,
        shaftNear=Math.min(st.zTop,st.zBottom),
        shaftFar=Math.max(st.zTop,st.zBottom);
  // Quatre peces reals del forjat deixen el buit exactament allà on
  // la llavor ha situat l'escala, a qualsevol de les dues habitacions.
  slab(-19.2,shaftLeft,-16.2,16.2);
  slab(shaftRight,19.2,-16.2,16.2);
  slab(shaftLeft,shaftRight,-16.2,shaftNear);
  slab(shaftLeft,shaftRight,shaftFar,16.2);
  floorPanel(-halfX+.4,halfX-.4,-halfZ+.4,halfZ-.4,-9.27,0x434c49);
  // Sostre continu, independent dels envans destructibles del búnquer.
  // La única obertura és la caixa d'escala.
  slab(-halfX,-19.2,-halfZ,halfZ);
  slab(19.2,halfX,-halfZ,halfZ);
  slab(-19.2,19.2,-halfZ,-16.2);
  slab(-19.2,19.2,16.2,halfZ);
  // Tres cambres a ponent, dues a llevant i passadís central.
  wall(-halfX+.4,0,.8,halfZ*2-.8);wall(halfX-.4,0,.8,halfZ*2-.8);
  wall(0,-halfZ+.4,halfX*2-.8,.8);wall(0,halfZ-.4,halfX*2-.8,.8);
  const span=halfX-7.5-.4, roomX=(halfX+7.5-.4)/2;
  for(const z of divisions)wall(-roomX,z,span,.65,-9.1,8.75);
  wall(roomX,eastDivider,span,.65,-9.1,8.75);
  const doorway=(lx,from,to,doorZ)=>{
    const gap=4.3,doorHeight=4.1,base=-9.15,lo=doorZ-gap/2,hi=doorZ+gap/2;
    if(lo>from)wall(lx,(from+lo)/2,.7,lo-from,-9.15,9.0);
    if(hi<to)wall(lx,(hi+to)/2,.7,to-hi,-9.15,9.0);
    // Llinda opaca sobre una porta de mida humana, no pas un forat
    // de nou metres fins al sostre. La fulla puja dins la llinda.
    wall(lx,doorZ,.82,gap,base+doorHeight,9-doorHeight,0x69746d);
    const mesh=seedSearchMode?new THREE.Object3D():
      bx(b.o,.88,doorHeight,gap+.04,0x899990,lx,base+doorHeight/2,doorZ,'metal');
    mesh.name='bunker-porta-interior-elevable';
    const d={x0:b.x+lx-.44,x1:b.x+lx+.44,
      z0:b.z+lo,z1:b.z+hi,y0:b.fy+base,y1:b.fy+base+doorHeight,
      hp:Infinity,m:mesh,door:true,open:false,rammable:false,
      bunkerInteriorDoor:true,bunkerBasementWall:true,
      openProgress:0,doorHeight,
      closedLocalY:base+doorHeight/2,owner:b,
      cx:b.x+lx,cz:b.z+doorZ};
    Wl.push(d);Dr.push(d);b.basement.doors.push(d);
  };
  const limits=[-halfZ+.65,...divisions,halfZ-.65];
  for(let i=0;i<3;i++)doorway(-7.5,limits[i],limits[i+1],westDoors[i]);
  doorway(7.5,-halfZ+.65,eastDivider,-16);
  doorway(7.5,eastDivider,halfZ-.65,16);
  // Graons a la cambra escollida, amb sentit de baixada nord o sud.
  if(!seedSearchMode){
    const steps=15,run=Math.abs(st.zTop-st.zBottom);
    for(let i=0;i<steps;i++){
      const z=st.zTop+(i+.5)*(st.zBottom-st.zTop)/steps;
      const y=.22-(i+1)*9.37/steps;
      bx(b.o,st.width,.21,run/steps+.035,
        i%2?0x797f79:0x8b9289,st.x,y-.1,z,'masonry');
    }
    for(const xx of[shaftLeft-.13,shaftRight+.13]){
      const rail=bx(b.o,.12,1.3,run,0x3a4c49,
        xx,-3.9,(st.zTop+st.zBottom)/2,'metal');
      rail.rotation.x=Math.sign(st.zBottom-st.zTop)*Math.atan2(9.37,run);
    }
    // Sales amb funció pròpia: comandament, ràdio, infermeria, dipòsit
    // d'armes i control de la porta. Tot el mobiliari gran registra una
    // caixa de col·lisió compartida per jugador, IA i projectils.
    const basementLevel=-9.15,rooms=[
      {lo:-halfZ+.75,hi:divisions[0]},
      {lo:divisions[0],hi:divisions[1]},
      {lo:divisions[1],hi:halfZ-.75}
    ];
    const generalRoomIndex=b.basement.generalLocal.z<0?0:2;
    const generalRoom=rooms[generalRoomIndex];
    b.basement.generalRoom={xMin:-halfX+1.7,xMax:-9.1,
      zMin:generalRoom.lo+2,zMax:generalRoom.hi-2};
    b.basement.roomTypes=[];
    const piece=(name,lx,lz,width,depth,height,color,y0=basementLevel,
      collision=true,profile='metal')=>{
      const mesh=bx(b.o,width,height,depth,color,lx,y0+height/2,lz,profile);
      mesh.name='bunker-'+name;
      if(collision){
        const center=buildingWorldPoint(b,lx,lz);
        const collisionY=b.fy+Math.min(basementLevel,y0);
        Wl.push({x0:center.x-width/2,x1:center.x+width/2,
          z0:center.z-depth/2,z1:center.z+depth/2,
          y0:collisionY,y1:b.fy+y0+height,hp:Infinity,m:mesh,
          door:false,open:false,rammable:false,owner:b,indoorFurniture:true,
          cx:center.x,cz:center.z});
      }
      return mesh;
    };
    const desk=(x,z,w,d)=>{
      piece('taula-tauler',x,z,w,d,1.18,0x66503c,basementLevel,true,'organic');
      piece('tapa-taula',x,z,w+.12,d+.10,.16,0x987054,-8.0,false,'organic');
    };
    const locker=(name,x,z,col=0x626f68)=>
      piece(name,x,z,1.23,.82,3.4,col,basementLevel,true);
    const panel=(name,x,z,w,h,color)=>{
      // Senyalització, mapes i pantalles a l'altura dels ulls.
      const m=piece(name,x,z,w,.085,h,color,-6.05,false);
      m.castShadow=false;return m;
    };
    for(let roomIndex=0;roomIndex<rooms.length;roomIndex++){
      const room=rooms[roomIndex],mid=(room.lo+room.hi)/2;
      if(roomIndex===generalRoomIndex){
        b.basement.roomTypes.push('despatx del general');
        desk(-23,mid,3.3,1.65);
        piece('cadira-general',-25.25,mid+.2,1.0,1.0,.94,0x4b473d);
        locker('arxivador-general',-25.1,room.lo+2,0x65695b);
        panel('mapa-operacions',-26.45,mid+1.8,2.25,1.50,0xc4b78c);
        // Marques de tropes i rutes sobre el mapa.
        for(const sign of[-1,1])piece('marca-mapa',
          -26.37,mid+1.8+sign*.57,.18,.1,.16,
          sign<0?0x9e362a:0x324b78,-5.43,false,'paint');
        piece('telefon-desp',-22.5,mid-.30,.43,.30,.2,0x2c3232,-7.84,false);
      }else if(roomIndex===1){
        b.basement.roomTypes.push('centre de comunicacions');
        for(const dz of[-2.3,2.35]){
          piece('consola-radio',-23.3,mid+dz,2.15,1.18,1.40,0x43575e);
          piece('pantalla-radio',-23.3,mid+dz-.18,1.48,.32,.70,0x294852,-7.6,false);
          for(const dx of[-.54,.15,.59])piece('commutador',
            -23.3+dx,mid+dz-.56,.20,.08,.10,0xb6d5b5,-7.30,false);
        }
        locker('armari-radio',-25.4,mid,0x586e69);
        panel('esquema-antenes',-26.45,mid+1.0,1.65,1.10,0xa8b3a2);
      }else{
        b.basement.roomTypes.push('infermeria');
        for(const dz of[-2.15,2.15]){
          piece('llit-hospital',-23.3,mid+dz,2.3,2.70,.95,0x657d76);
          piece('matalas',-16.3,mid+dz,2.0,2.38,.17,0xc4d4cc,
            -8.18,false,'paint');
          piece('coixi',-23.3,mid+dz-.84,1.15,.55,.22,0xe0ded0,-7.99,false,'paint');
        }
        locker('farmaciola-armari',-9.2,room.lo+2,0x8a9e93);
        piece('creu-infermeria',-26.48,mid,.12,1.2,1.0,0xcc4d43,-6.17,false,'paint');
        piece('creu-infermeria',-26.47,mid,.12,.36,2.0,0xcc4d43,-6.67,false,'paint');
      }
    }
    // Les dues sales orientals intercanvien funció segons on apareix
    // l'escala; mai no hi ha prestatgeries o consoles a la seva caixa.
    const armorySide=-stairSide,accessSide=stairSide;
    b.basement.roomTypes.push('armeria');
    locker('armari-armes-1',24.8,armorySide*19,0x58665f);
    locker('armari-armes-2',24.8,armorySide*14.9,0x58665f);
    piece('banc-manteniment',9.5,armorySide*19.35,2.15,1.15,1.22,0x775e43);
    for(const dz of[-.38,.12,.48])piece('eina-armeria',
      9.5,armorySide*19.35+dz,1.10,.09,.09,0x303735,-7.88,false);
    panel('inventari-armeria',26.4,armorySide*18,.08,1.3,0xb2bba5);
    b.basement.roomTypes.push('control i accés');
    piece('quadre-electric',9.2,accessSide*20.5,1.88,1.2,3.0,0x4b6060);
    piece('visors-control',9.2,accessSide*19.83,1.54,.17,.4,
      0x8eb0a1,-6.58,false);
    piece('guixeta-seguretat',25.5,accessSide*19.3,.9,.82,2.9,0x697a74);
    piece('consola-acces',9.2,accessSide*6.3,1.1,1.0,1.12,0x576662);
    // Lluminàries subjectes a l'intradós del forjat y=+.22:
    // cap focus ni plafó no pot quedar flotant a mitja altura.
    for(const [lx,lz] of [[0,-19],[0,-8],[0,8],[0,19],[18,-18],[-19,0],[-19,-18],[-19,18],[19,18],[19,0]]){
      const lamp=new THREE.PointLight(0xffe8bd,5.2,19,2);
      lamp.position.set(lx,-.55,lz);lamp.visible=false;
      b.o.add(lamp);b.basement.lights.push(lamp);
      const light=bx(b.o,1.12,.15,.73,0xf1e2b8,lx,-.30,lz,'paint');
      light.name='bunker-plafó-sostre';
      // El suport toca físicament l'intradós del forjat y=-.04.
      const rim=bx(b.o,1.26,.25,.86,0x606c63,lx,-.10,lz,'metal');
      rim.name='bunker-suport-plafó';
    }
  }
  return b.basement;
}
// El soterrani sobresurt de la planta exterior del búnquer. Detectar-lo
// en 3D impedeix que les cambres exteses activin el mode natació quan
// la seva cota és inferior al nivell de la mar.
function playerInsideBunkerBasement(x,z,y){
 const b=activeBunker;
 if(!b?.basement||!Number.isFinite(y)||y>=b.fy-2)return false;
 const q=buildingLocalPoint(b,x,z);
 return Math.abs(q.x)<b.basement.halfX-.45&&
   Math.abs(q.z)<b.basement.halfZ-.45;
}
function bunkerSubFloorAt(x,z,previous=-Infinity){return window.HUNTER_WALK_SURFACES.bunkerFloorAt(activeBunker,x,z,previous)}
// Door-aligned treads share the exact same geometry and walking height.
function stairLocal(s,x,z){return window.HUNTER_WALK_SURFACES.stairLocal(s,x,z)}
function stairContains(s,x,z,margin=0){return window.HUNTER_WALK_SURFACES.stairContains(s,x,z,margin)}
// Els molls no tenen barrera lateral: rampes i unions en T són transitables,
// i el personatge pot abandonar el pantalà cap a l'aigua.
// L'altura comprovada a groundAt evita l'ascens instantani des de l'aigua.
function groundAt(x,z,previous=-Infinity){
  const bunkerFloor=bunkerSubFloorAt(x,z,previous);
  if(bunkerFloor!==null)return bunkerFloor;
  // No enfonsar el model sota els triangles que dibuixa el LOD actual.
  // Preservem l'altura física si és més alta (evita enfonsaments i salts negatius).
  const physical=hAt(x,z),visible=terrainStream?.visibleHeightAt(x,z);
  let y=window.HUNTER_WALK_SURFACES.walkingHeightAt({physical,visible,stairs,piers,buildings:buildingCandidates(x,z)},x,z,previous);
const ramp=terminalRampHeight(x,z);if(ramp!==null)y=Math.max(y,ramp);if(Number.isFinite(previous)){const deck=pedestrianFerry(x,z,previous);if(deck)y=Math.max(y,deck.y)}
return y}
// Deixar un replà i entrar lateralment al forat activa gravetat.
function stairDropAt(x,z,previousY){
  if(!Number.isFinite(previousY))return false;
  const b=activeBunker;
  if(b?.basement&&previousY>b.fy-1){
    const p=buildingLocalPoint(b,x,z),st=b.basement.stair;
    if(Math.abs(p.x-st.x)<st.width/2&&
      p.z>Math.min(st.zTop,st.zBottom)&&p.z<Math.max(st.zTop,st.zBottom)&&
      previousY-bunkerSubFloorAt(x,z,previousY)>.7)return true;
  }
  for(const building of buildingCandidates(x,z)){
    if(!building.upperFloor||building.rb||!building.interiorStair||building.interiorStair.destroyed)continue;
    const level=building.fy+building.storey+.15;
    if(previousY<level-.6||!stairContains(building.interiorStair,x,z))continue;
    if(previousY-groundAt(x,z,previousY)>.7)return true;
  }
  return false;
}
function addRampAccess(b,side){const [nx,nz]=[[0,1],[0,-1],[1,0],[-1,0]][side],edge=(nx?b.w:b.d)/2+.2,x=b.x+nx*edge,z=b.z+nz*edge,top=b.fy+.3;
let length=8,bottom=hAt(x+nx*length,z+nz*length);for(let L=8;L<=26;L+=2){const yy=hAt(x+nx*L,z+nz*L);if(Math.abs(top-yy)<Math.abs(top-bottom)){length=L;bottom=yy}if(Math.abs(top-yy)<.35){length=L;bottom=yy;break}}
if(Math.abs(top-bottom)<.1)return;const width=Math.max(6,Math.min(b.doorWidth-.8,30)),r={x,z,nx,nz,top,bottom,length,width,ramp:true};stairs.push(r);b.stair=r;
if(!seedSearchMode)buildingVisual.addRamp(b.o,{alongAxis:!!nx,length,width,top:top-b.fy,bottom:bottom-b.fy,x:x-b.x+nx*length/2,z:z-b.z+nz*length/2,color:0x8f918e,direction:nx||nz})}
function addStairs(b,side){
const s=window.HUNTER_BUILDING_SHELL.exteriorStair(b,side,hAt);if(!s)return;
const {x,z,nx,nz,top,steps,tread,length,rise}=s;stairs.push(s);b.stair=s;
if(!seedSearchMode)for(let i=0;i<steps;i++){const a=(i+.5)*tread,xx=x+nx*a,zz=z+nz*a,y=top-i*rise,base=Math.min(y-.16,hAt(xx,zz)-.15);buildingVisual.addStep(b.o,{alongAxis:!!nx,riseWidth:tread,height:y-b.fy,base:base-b.fy,x:xx-b.x,z:zz-b.z,color:i%2?0xa69982:0xb5a68e})}
}
function wallPush(){window.HUNTER_WORLD_PHYSICS.pushWalls(P,wallCandidates(P.x,P.z,.6))}
function playerDoorLabel(d){return (d.desiredOpen??d.open)?'Tancar porta':'Obrir porta'}
function nearestPlayerDoor(){
  if(cv||playerFall||playerEject||swimming)return null;
  let best=null,range=4.5;
  for(const d of Dr){if(d.hp<=0||d.alwaysOpen||d.locked&&!d.bunkerGate||P.y+3.1<=d.y0||P.y+.15>=d.y1)continue;
    const distance=Math.hypot(P.x-d.cx,P.z-d.cz);if(distance<range){best=d;range=distance;}}
  return best;
}
function doorOccupied(d){
  const inside=(x,y,z)=>x>d.x0-.8&&x<d.x1+.8&&z>d.z0-.8&&z<d.z1+.8&&y+3.1>d.y0&&y+.15<d.y1;
  if(!cv&&inside(P.x,P.y,P.z))return true;
  if(enemyCandidatesAt(d.cx,d.cz,6).some(u=>u.hp>0&&inside(u.x,u.gy??u.o?.position?.y??hAt(u.x,u.z),u.z)))return true;
  return V.some(v=>!v.sunk&&Math.abs((v.o?.position?.y??hAt(v.x,v.z))-(d.y0+1))<5&&circleVehicleOverlap(d.cx,d.cz,.8,v));
}
function interactPlayerDoor(){
  if(nativeCoopSession){const d=nearestPlayerDoor();return d?nativeCoopSession.channel?.door(d.saveId,!(d.desiredOpen??d.open)):false;}
  const d=nearestPlayerDoor();if(!d)return false;
  const open=!(d.desiredOpen??d.open);
  if(!open&&doorOccupied(d)){msg='Hi ha algú o un vehicle al pas de la porta.';msgT=2;return true;}
  d.desiredOpen=open;
  window.HUNTER_STEALTH.emit('door',d.cx,(d.y0??hAt(d.cx,d.cz))+1,d.cz);
  if(!d.bunkerGate&&!d.bunkerInteriorDoor){d.open=open;if(d.m)d.m.visible=!open;}
  msg=open?'Porta oberta.':'Porta tancada.';if(d.bunkerGate||d.bunkerInteriorDoor)msg=open?'Obrint porta…':'Tancant porta…';msgT=2;
  updateActionButton(cv?null:nearV());return true;
}
function updateDoors(dt){
  for(const d of Dr){
    // Legacy saves have only open/openProgress. Initialise intent once, never by proximity.
    if(d.desiredOpen==null)d.desiredOpen=!!d.alwaysOpen||!!d.open||(d.openProgress||0)>0;
    if(d.alwaysOpen)d.desiredOpen=true;
    if(d.bunkerInteriorDoor||d.bunkerGate){
      if(!d.desiredOpen&&d.openProgress>0&&doorOccupied(d))d.desiredOpen=true;
      const duration=d.bunkerGate?(d.openDuration||10):(d.desiredOpen?1.15:1.6);
      d.openProgress=Math.max(0,Math.min(1,(d.openProgress||0)+(d.desiredOpen?dt/duration:-dt/duration)));
      const p=d.openProgress,ease=p*p*(3-2*p);
      if(d.bunkerGate){d.m.scale.y=Math.max(.025,1-ease);d.m.position.y=d.closedLocalY+d.doorHeight*ease*.5;d.open=p>=.999;}
      else{d.m.position.y=d.closedLocalY+(d.doorHeight+.55)*ease;d.open=p>.86;}
      d.m.visible=p<.999;continue;
    }
    d.open=!!d.desiredOpen;if(d.m)d.m.visible=!d.open;
  }
}
function itemMapTexture(kind){const c=document.createElement('canvas');c.width=192;c.height=144;const q=c.getContext('2d');q.fillStyle=kind==='heli'?'#dceff4':kind==='tanc'?'#eadfb9':'#ead59b';q.fillRect(0,0,c.width,c.height);q.strokeStyle='#8f7b52';q.lineWidth=5;q.strokeRect(5,5,c.width-10,c.height-10);q.strokeStyle='#baa36b';q.lineWidth=2;for(let x=30;x<190;x+=32){q.beginPath();q.moveTo(x,7);q.lineTo(x,137);q.stroke()}for(let y=26;y<140;y+=28){q.beginPath();q.moveTo(7,y);q.lineTo(185,y);q.stroke()}
  q.save();q.translate(96,72);q.strokeStyle='#313a36';q.fillStyle='#596d55';q.lineWidth=6;
  if(kind==='heli'){q.beginPath();q.ellipse(0,5,32,13,0,0,Math.PI*2);q.fill();q.beginPath();q.moveTo(-55,-13);q.lineTo(55,-13);q.stroke();q.beginPath();q.moveTo(0,-31);q.lineTo(0,22);q.stroke();q.fillRect(28,1,35,7)}
  else if(kind==='tanc'){q.fillRect(-34,-8,58,24);q.fillRect(-18,-21,29,15);q.beginPath();q.moveTo(10,-14);q.lineTo(48,-14);q.stroke();q.strokeRect(-38,17,67,9)}
  else{q.fillStyle='#7a4e3d';q.fillRect(-28,-4,56,31);q.fillStyle='#a94338';q.beginPath();q.moveTo(-34,-4);q.lineTo(0,-33);q.lineTo(34,-4);q.closePath();q.fill();q.fillStyle='#ead59b';q.fillRect(-6,12,12,15)}
  q.restore();const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;return tex}
function createItemVisual(t){const g=new THREE.Group(),metal=0x454b4e,dark=0x3d3025;
  if(t==='mapa'||t==='mapa_heli'||t==='mapa_tanc'){const kind=t==='mapa_heli'?'heli':t==='mapa_tanc'?'tanc':'hq',paper=new THREE.Mesh(new THREE.BoxGeometry(1.65,.07,1.25),M(t==='mapa_heli'?0xdceff4:t==='mapa_tanc'?0xeadfb9:0xead59b,'paint'));g.add(paper);const top=new THREE.Mesh(new THREE.PlaneGeometry(1.52,1.12),new THREE.MeshBasicMaterial({map:itemMapTexture(kind),transparent:false}));top.rotation.x=-Math.PI/2;top.position.y=.041;g.add(top)}
  else if(t==='expl')return window.HUNTER_EXPLOSIVE_VISUALS.create(THREE,false);
  else if(t==='med'){bx(g,1.35,.7,1,0xf4f4f0,0,.35,0,'paint');bx(g,1.05,.08,.28,0xd5aa76,0,.74,0,'paint');bx(g,.28,.08,.95,0xd5aa76,0,.75,0,'paint');for(const x of[-.18,.18])for(const z of[-.18,.18]){const d=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.03,6),M(0x9b734b,'paint'));d.position.set(x,.81,z);g.add(d)}}
  else if(t==='arma'){bx(g,1.45,.55,1.05,0x745539,0,.28,0,'paint');bx(g,1.5,.1,1.1,dark,0,.04,0,'metal');for(const x of[-.48,-.16,.16,.48])for(const z of[-.27,.27]){const bullet=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.48,8),M(0xc9a23f,'metal'));bullet.position.set(x,.72,z);g.add(bullet);const tip=new THREE.Mesh(new THREE.ConeGeometry(.08,.16,8),M(0xb7772b,'metal'));tip.position.set(x,1.04,z);g.add(tip)}}
  else if(t==='bazooka'){const tube=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,2.65,10),M(0x58664a,'paint'));tube.rotation.z=Math.PI/2;tube.position.set(0,.62,0);g.add(tube);const rear=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.18,10),M(0x252b27,'metal'));rear.rotation.z=Math.PI/2;rear.position.set(-1.37,.62,0);g.add(rear);const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(.29,.22,.24,10),M(0x252b27,'metal'));muzzle.rotation.z=Math.PI/2;muzzle.position.set(1.42,.62,0);g.add(muzzle);bx(g,.16,.4,.22,0x252b27,-.35,.35,0,'metal');bx(g,.12,.2,.3,0x737b74,.35,.83,0,'metal')}
  else if(t==='fusell_assalt'){
    bx(g,.32,.27,2.1,0x55644e,0,.66,0,'paint');bx(g,.16,.15,1.28,0x303938,0,.65,-1.45,'metal');
    bx(g,.3,.27,.8,0x88704f,0,.6,1.12,'paint');bx(g,.16,.45,.28,0x2b3430,0,.39,.12,'metal');
    bx(g,.22,.4,.54,0x3a463b,0,.31,-.41,'metal');
  }
  else if(t==='franctirador'){
    bx(g,.35,.3,2.25,0x586a5a,0,.62,0,'paint');bx(g,.16,.16,1.65,0x303736,0,.65,-1.55,'metal');
    bx(g,.19,.24,.7,0x7c6247,0,.52,.95,'paint');bx(g,.28,.35,.45,0x7c6247,0,.56,1.58,'paint');
    bx(g,.17,.19,.7,0x26322e,0,.95,-.18,'metal');bx(g,.15,.16,.3,0x26322e,0,1.06,-.45,'metal');
    bx(g,.13,.28,.22,0x2d322d,0,.34,-.08,'metal');
  }
  else if(t==='paracaigudes'){
    // Motxilla de paracaigudes compacta de lona, no un bloc rectangular.
    const canvas=M(0x718269,'paint'),trim=M(0x4c5847,'paint'),
          straps=M(0xc9b891,'paint'),buckles=M(0x343d38,'metal');
    const pack=new THREE.Mesh(new THREE.SphereGeometry(.6,12,9),canvas);
    pack.scale.set(1.04,1.05,.73);pack.position.y=.66;g.add(pack);
    const panel=new THREE.Mesh(new THREE.SphereGeometry(.56,10,8),trim);
    panel.scale.set(.98,1,.21);panel.position.set(0,.65,.42);g.add(panel);
    const cover=new THREE.Mesh(new THREE.SphereGeometry(.43,10,7),canvas);
    cover.scale.set(1,.48,.8);cover.position.set(0,1.12,-.12);g.add(cover);
    const band=(points,mat,r=.055)=>{
      const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve,12,r,6,false),mat));
    };
    for(const side of[-1,1]){
      band([[side*.37,1.11,.37],[side*.43,.93,.53],
        [side*.42,.50,.56],[side*.32,.20,.40]],straps,.07);
      band([[side*.53,.94,-.08],[side*.64,.70,-.14],
        [side*.53,.33,-.18],[side*.36,.22,.16]],straps,.045);
      bx(g,.16,.095,.10,0xc5c7b5,side*.40,.48,.58,'metal');
      bx(g,.095,.05,.13,0x39483d,side*.40,.48,.65,'metal');
    }
    band([[-.47,.65,-.36],[-.23,.62,-.48],[.23,.62,-.48],
      [.47,.65,-.36]],straps,.06);
    bx(g,.55,.16,.12,0x596a52,0,.31,-.42,'paint');
    bx(g,.23,.14,.16,0x343d38,0,.31,-.51,'metal');
    band([[-.18,1.15,.24],[-.18,1.37,.20],[.18,1.37,.20],
      [.18,1.15,.24]],buckles,.045);
  }
  else if(t==='cisalla'){const cutter=window.HUNTER_BOLT_CUTTERS.create(THREE);cutter.rotation.z=Math.PI/2;cutter.position.y=.66;cutter.scale.setScalar(1.12);g.add(cutter)}
  else if(t==='granada'){
    // Pickup de cinc granades més visible: conjunt x1,5 i formació més compacta.
    for(const [x,z] of[[-.32,-.18],[0,-.18],[.32,-.18],[-.16,.18],[.16,.18]]){
      const body=new THREE.Mesh(new THREE.SphereGeometry(.17,8,6),M(0x4a5842,'metal'));
      body.scale.set(.88,1.08,.88);body.position.set(x,.42,z);g.add(body);
      bx(g,.07,.12,.07,0x252b27,x,.61,z,'metal');
    }
    g.scale.setScalar(1.5);
  }
  else if(t==='disf'){bx(g,.78,1.3,.16,0xb53232,0,.8,0,'paint');const l=bx(g,.7,.38,.16,0xb53232,-.62,1.18,0,'paint'),r=bx(g,.7,.38,.16,0xb53232,.62,1.18,0,'paint');l.rotation.z=-.55;r.rotation.z=.55;bx(g,.16,.18,.18,0xf1c7a1,0,1.44,0,'organic');bx(g,.08,1.05,.19,0x6f1f1f,0,.75,-.02,'paint')}
  else bx(g,...IT[t].s,IT[t].c,0,.4,0,'paint');
  return g}
// Restriccions de botí compartides pel generador de complexos i pels
// objectes aleatoris. Només afecten objectes recollibles, NO vehicles ni
// decoració: els tancs continuen dins els hangars.
const LOOT_MAPS=new Set(['mapa','mapa_heli','mapa_tanc']);
const LOOT_WEAPONS=new Set(['bazooka','franctirador','fusell_assalt','granada','expl']);
// Each civilian home gets one independent 50% roll, with 60/30/10
// proportions conditional on finding an item.
const CIVILIAN_HOUSE_LOOT=new Set(['med','arma','cisalla']);
function rollCivilianHouseLoot(random){
  if(random()>=.50)return null;
  const chance=random();
  return chance<.6?'med':chance<.9?'arma':'cisalla';
}
function itemInsideHangar(x,z){
  return B.some(b=>b.hangar&&Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2);
}
function lootAllowed(t,b=null,x=null,z=null,compound=null){
  if(b?.hangar)return false;
  if(b?.civilian&&!CIVILIAN_HOUSE_LOOT.has(t))return false;
  if(x!=null&&z!=null&&itemInsideHangar(x,z))return false;
  const complex=compound||b?.compound;
  if(complex==='polvori'&&LOOT_MAPS.has(t))return false;
  // El taller només ofereix subministraments i eines; mai armament.
  if(complex==='hangar'&&LOOT_WEAPONS.has(t))return false;
  return true;
}
// Repartiment comú entre botí fix i aleatori: un màxim de tres
// objectes en tot l'edifici, comptant totes les plantes.
const MAX_BUILDING_ITEMS=3;
function itemBuildingAt(x,z){
  return B.find(b=>{
    const p=buildingLocalPoint(b,x,z);
    return Math.abs(p.x)<(b.localW||b.w)/2-.55 &&
      Math.abs(p.z)<(b.localD||b.d)/2-.55;
  })||null;
}
const buildingItemCount=b=>items.reduce((n,it)=>n+(it.building===b?1:0),0);
function itemHeightInBuilding(b,x,z,forcedFloor=null){
  if(!b)return hAt(x,z)+1.3;
  const n=buildingItemCount(b),
        firstUpper=Math.floor(Math.abs(b.x*1.341+b.z*1.733))%2,
        upstairs=b.floors===2&&!b.rb&&!!b.interiorStair&&
          !stairContains(b.interiorStair,x,z,.6)&&
          (forcedFloor===null?(n+firstUpper)%2===1:forcedFloor===1);
  return b.fy+(upstairs?b.storey:0)+1.3;
}
function canPlaceItem(t,b,compound){
  if(b&&buildingItemCount(b)>=(b.civilian?1:MAX_BUILDING_ITEMS))return false;
  // Una sola farmaciola a tota la base de sortida.
  if(t==='med'&&(compound==='base'||b?.compound==='base')&&
    items.some(it=>it.t==='med'&&it.compound==='base'))return false;
  return true;
}
function addItemAt(t,x,z,compound=null){
  const b=itemBuildingAt(x,z);
  if(!lootAllowed(t,b,x,z,compound)||!canPlaceItem(t,b,compound))return null;
  const y=itemHeightInBuilding(b,x,z),o=seedSearchMode?null:createItemVisual(t);
  if(o){o.position.set(x,y,z);world.add(o)}
  const item={t,x,z,y,o,building:b,compound:compound||b?.compound||null};
  items.push(item);return o||item;
}
function addIt(t,b,forcedFloor=null){
  if(!IT[t]){console.warn('Tipus d’objecte desconegut:',t);return null}
  if(!lootAllowed(t,b)||!canPlaceItem(t,b,b?.compound))return null;
  let x,z,found=false;
  const width=b.localW||b.w,depth=b.localD||b.d;
  for(let k=0;k<35;k++){
    const lx=rr(-(width/2-2),width/2-2),
          lz=rr(-(depth/2-2),depth/2-2),
          point=buildingWorldPoint(b,lx,lz);
    x=point.x;z=point.z;
    if(!itemInsideHangar(x,z)&&
      !Wl.some(w=>!w.open&&w.playerBlock!==false&&
        x>w.x0-.9&&x<w.x1+.9&&z>w.z0-.9&&z<w.z1+.9)&&
      !(b.interiorStair&&stairContains(b.interiorStair,x,z,.75))){
      found=true;break;
    }
  }
  if(!found||!lootAllowed(t,b,x,z))return null;
  const y=itemHeightInBuilding(b,x,z,forcedFloor),o=seedSearchMode?null:createItemVisual(t);
  if(o){o.position.set(x,y,z);world.add(o)}
  const item={t,x,z,y,o,building:b,compound:b.compound||null};
  items.push(item);return o||item;
}
// Cada planta transitable dels edificis militars de dues plantes
// conserva almenys un objecte. Sense modificar el límit de tres.
function ensureTwoStoreyLoot(b){
  if(!b||b.civilian||b.hangar||b.rb||b.floors!==2||
     !b.upperFloor||!b.interiorStair||b.interiorStair.destroyed)return false;
  const own=()=>items.filter(it=>it.building===b);
  const onFloor=(it,floor)=>floor===1?it.y>b.fy+b.storey:it.y<b.fy+b.storey;
  for(const floor of [0,1]){
    if(own().some(it=>onFloor(it,floor)))continue;
    if(buildingItemCount(b)<MAX_BUILDING_ITEMS&&addIt('arma',b,floor))continue;
    // Si l'edifici és ple, traslladam un objecte existent de planta,
    // sense afegir-ne un quart ni alterar la mena de botí.
    const donor=own().filter(it=>onFloor(it,1-floor)&&
      !stairContains(b.interiorStair,it.x,it.z,.75));
    const item=donor.find(it=>!LOOT_MAPS.has(it.t))||donor[0];
    if(!item)return false;
    item.y=b.fy+(floor===1?b.storey:0)+1.3;
    if(item.o)item.o.position.y=item.y;
  }
  return own().some(it=>onFloor(it,0))&&own().some(it=>onFloor(it,1));
}
function flag(x,z,c){if(!seedSearchMode)world.add(buildingVisual.createFlag({x,y:hAt(x,z),z,color:c}))}
// jugador i vehicles
const bx=(g,w,h,d,c,x,y,z,profile='organic')=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c,profile));m.position.set(x,y,z);g.add(m);return m};
const buildingVisual=window.HUNTER_BUILDINGS.create(THREE,{material:M,materialProfile,box:bx});
const pl=window.HUNTER_CHARACTERS.createPlayer(THREE,{box:bx});scene.add(pl);
const animPl=(f,dt,running=false,strafe=0)=>window.HUNTER_CHARACTERS.animatePlayer(pl,{
  forward:f,strafe,dt,running,crouching:playerCrouched&&!cv&&!swimming&&!playerFall&&!playerEject&&!scopeActive,
  swimming,inVehicle:!!cv,ammo,bazookaEquipped,grenadeEquipped,cisallaEquipped,sniperEquipped,assaultRifleEquipped,
  grenadeChargePower:grenadeCharge?Math.min(1,grenadeCharge.elapsed/GRENADE_CHARGE_SECONDS):0,
  airborne:!!playerFall,parachuting:!!playerFall?.parachute
});
const VT=window.HUNTER_VEHICLE_DYNAMICS.types;
const VS=window.HUNTER_VEHICLES.scales;
// Quan els patins reposen sobre una superfície, el punt inferior de la
// geometria escalada ha de quedar només 10 cm per damunt del sòl/pista.
// Durant el vol, v.alt continua representant l'origen del model.
const helicopterLandedAltitude=(v,surfaceY)=>surfaceY-(v.o?.userData?.skidContactHeight||0)+.1;
const vehicleRadius=t=>{const type=t==='patrulla_marina'?'llanxa':t==='jeep'?'cotxe':t;return window.HUNTER_VEHICLES.radii[type]*VS[type]};
const VHB=window.HUNTER_VEHICLES.hitboxes;
const vehicleHitType=t=>t==='jeep'?'cotxe':t==='patrulla_marina'?'llanxa':t;
const vehicleBox=(v,x=v.x,z=v.z,hd=v.hd)=>{const t=vehicleHitType(v.t),hb=VHB[t]||[vehicleRadius(t)*1.25,vehicleRadius(t)*1.6],sc=VS[t]||1;return{x,z,hd,w:hb[0]*sc,d:hb[1]*sc,v}};
// Contacte entre el segment real de filferrada i la planta rectangular del vehicle.
// El radi de cerca només serveix per obtenir candidats, mai per confirmar l'impacte.
function fenceVehicleContact(...args){return window.HUNTER_SHARED_COMBAT.fenceVehicleContact(...args)}
// SAT per quatre eixos, sense arrays ni objectes efímers per contacte.
// Mateixos eixos, projeccions i comparació estricta de la versió anterior.
const obbOverlap=(...args)=>window.HUNTER_SHARED_COMBAT.obbOverlap(...args);
const circleVehicleOverlap=(x,z,r,v)=>{const b=vehicleBox(v),dx=x-b.x,dz=z-b.z,s=Math.sin(b.hd),c=Math.cos(b.hd),lx=dx*c-dz*s,lz=dx*s+dz*c,cx=Math.max(-b.w/2,Math.min(b.w/2,lx)),cz=Math.max(-b.d/2,Math.min(b.d/2,lz)),ex=lx-cx,ez=lz-cz;return ex*ex+ez*ez<r*r};
const vehicleY=v=>v.alt!=null&&VT[vehicleHitType(v.t)]?.m==='a'?v.alt:(v.o?.position?.y??Math.max(0,hAt(v.x,v.z)));
const vehicleHeightCompatible=(a,b)=>Math.abs(vehicleY(a)-vehicleY(b))<Math.max(2.2,Math.min(vehicleRadius(vehicleHitType(a.t)),vehicleRadius(vehicleHitType(b.t)))*.55);
const VEHICLE_CELL=64,vehicleGrid=new Map(),playerVehicleGrid=new Map(),enemyGrid=new Map(),vehicleCellKey=(cx,cz)=>cx+','+cz;
let vehicleGridVSource=null,vehicleGridESource=null,
  vehicleGridVLength=-1,vehicleGridELength=-1,vehicleGridRebuiltFrameId=-1;
// Les posicions només serveixen per detectar canvis de sector dins del pas
// de simulació. No canvien ni el radi ni la precisió de les col·lisions.
const vehicleGridLastCell=new WeakMap();
const gridCellOf=v=>vehicleCellKey(Math.floor(v.x/VEHICLE_CELL),Math.floor(v.z/VEHICLE_CELL));
const addVehicleToGrid=(grid,v)=>{const key=vehicleCellKey(Math.floor(v.x/VEHICLE_CELL),Math.floor(v.z/VEHICLE_CELL)),bucket=grid.get(key);if(bucket)bucket.push(v);else grid.set(key,[v])};
function rebuildVehicleGrid(){
  const stamp=performanceStatsVisible?performance.now():0;
  vehicleGrid.clear();playerVehicleGrid.clear();enemyGrid.clear();vehicleGridVSource=V;vehicleGridESource=E;
  vehicleGridVLength=V.length;vehicleGridELength=E.length;
  for(const v of V)if(!v.destroyed){addVehicleToGrid(vehicleGrid,v);addVehicleToGrid(playerVehicleGrid,v);vehicleGridLastCell.set(v,gridCellOf(v))}
  for(const u of E)if(!u.destroyed){addVehicleToGrid(enemyGrid,u);if(u.t==='jeep'||u.t==='tanqueta'||u.t==='tanc'||u.t==='patrulla_marina')addVehicleToGrid(vehicleGrid,u);vehicleGridLastCell.set(u,gridCellOf(u))}
  if(performanceStatsVisible)perfHotspots.broadphaseMs+=performance.now()-stamp;
}
// Els vehicles han pogut desplaçar-se des de l'inici del pas. Només cal
// reconstruir si algú realment ha travessat una cel·la de 64 metres.
function refreshVehicleGridIfCellsChanged(){
  if(vehicleGridVSource!==V||vehicleGridESource!==E||
     vehicleGridVLength!==V.length||vehicleGridELength!==E.length){
    rebuildVehicleGrid();return
  }
  for(const v of V)if(!v.destroyed&&vehicleGridLastCell.get(v)!==gridCellOf(v)){
    rebuildVehicleGrid();return
  }
  for(const u of E)if(!u.destroyed&&vehicleGridLastCell.get(u)!==gridCellOf(u)){
    rebuildVehicleGrid();return
  }
}
function gridCandidatesAt(grid,x,z,r=24){
  const out=[],minX=Math.floor((x-r)/VEHICLE_CELL),maxX=Math.floor((x+r)/VEHICLE_CELL),
        minZ=Math.floor((z-r)/VEHICLE_CELL),maxZ=Math.floor((z+r)/VEHICLE_CELL);
  for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){const b=grid.get(vehicleCellKey(cx,cz));if(b)for(const v of b)out.push(v)}
  return out
}
function vehicleCandidatesAt(x,z,r=24,playersOnly=false){
  if(vehicleGridVSource!==V||vehicleGridESource!==E)rebuildVehicleGrid();
  return gridCandidatesAt(playersOnly?playerVehicleGrid:vehicleGrid,x,z,r)
}
function enemyCandidatesAt(x,z,r=24){
  if(vehicleGridVSource!==V||vehicleGridESource!==E)rebuildVehicleGrid();
  return gridCandidatesAt(enemyGrid,x,z,r)
}
const vehicleObstacles=v=>vehicleCandidatesAt(v.x,v.z,32,false).filter(o=>o!==v&&!o.destroyed);
const mkV=window.HUNTER_VEHICLES.createFactory(THREE,{box:bx,material:M,shadows:visualQuality.shadows});
// Representació mínima: no cal cap malla de vehicle per calcular
// les coordenades. Es respecta l'altura dels patins del model original.
function seedVehicleStub(t){
  const g=new THREE.Group();
  g.userData.skidContactHeight=
    t==='heli'||t==='heli_combat' ? (.48-.075)*VS[t] : 0;
  return g;
}
const riderSystem=window.HUNTER_RIDER.create(THREE,{scene,box:bx,material:M,scales:VS,heightAt:hAt,shadows:visualQuality.shadows});
const rider=riderSystem.object,poseRider=riderSystem.update;
let swimming=false;let V=[],cv=null;const P={x:0,z:0,y:0,hd:0};
// Optional opportunities share the real world, controls, cover and game clock.
// NPCs remain neutral and never enter enemy auto-aim or enemy perception lists.
function optionalLineClear(from,to,ignoreWall=null){
  return !blastOccluded(from.x,from.y,from.z,to.x,to.y,to.z,ignoreWall);
}
function optionalCivilianCanMove(from,to,radius){
  if(Math.abs(to.x)>H-2||Math.abs(to.z)>H-2||hAt(to.x,to.z)<.12||
    Math.abs(to.y-from.y)>.65||treeHit(to.x,to.z,radius))return false;
  const reach=Math.hypot(to.x-from.x,to.z-from.z)/2+radius;
  for(const wall of wallCandidates((from.x+to.x)/2,(from.z+to.z)/2,reach)){
    if(wall.open||wall.hp<=0||wall.y1<Math.min(from.y,to.y)+.15||
      wall.y0>Math.max(from.y,to.y)+1.8)continue;
    if(segmentAabbT(from.x,from.y+.9,from.z,to.x,to.y+.9,to.z,
      wall.x0-radius,wall.x1+radius,wall.y0,wall.y1,wall.z0-radius,wall.z1+radius)!==null)return false;
  }
  return !vehicleCandidatesAt(to.x,to.z,24,true).some(v=>
    !v.destroyed&&Math.abs(vehicleY(v)-to.y)<3&&circleVehicleOverlap(to.x,to.z,radius,v));
}
const optionalNotify=text=>{msg=text;msgT=3;requestOperationAutosave('world');};
const prisonerSystem=window.HUNTER_PRISONERS.create({
  THREE,box:bx,material:M,heightAt:(x,z)=>hAt(x,z),canMove:optionalCivilianCanMove,onRescue:count=>recordOperationMetric('rescues',count),
  clearLine:optionalLineClear,notify:optionalNotify,sound:snd,vehicleRadius,
  vehicleName:v=>VT[v.t]?.n||v.t
});
const radioRelay=window.HUNTER_RADIO_RELAY.create({
  THREE,box:bx,material:M,heightAt:(x,z)=>hAt(x,z),clearLine:optionalLineClear,
  notify:optionalNotify,sound:snd,
  registerCollider:collider=>{Wl.push(collider);wallGridCount=-1},
  unregisterCollider:collider=>{
    const index=Wl.indexOf(collider);if(index>=0)Wl.splice(index,1);wallGridCount=-1;
  },
  onAlert:(unit,position)=>{
    if(!E.includes(unit)||unit.hp<=0||unit.canSee)return;
    releaseSoldierReservation(unit);releaseSoldierEntry(unit);
    unit.aiMode='investigate';unit.tacticGoal=null;unit.tacticT=0;
    unit.lastSeenX=position.x;unit.lastSeenY=position.y;unit.lastSeenZ=position.z;
    unit.searchT=(position.duration||30)+Math.hypot(position.x-unit.x,position.z-unit.z)/Math.max(1,unit.sp*.65);
    unit.alert=Math.max(unit.alert||0,position.duration||30);
  }
});
function optionalContext(active=!!started&&!paused&&!over&&simulationFocused&&!document.hidden&&!generationPromise){
  return {player:P,vehicle:cv,vehicles:V,enemies:E,
    active,canInteract:!playerFall&&!playerEject&&!swimming&&!scopeActive,
    visualRange:scopeActive?3500:400};
}
function resetOptionalSystems(){
  window.HUNTER_REQUIRED_WORLD_FEATURES=null;
  prisonerSystem.reset();radioRelay.reset();
}
function configureOptionalWorld(){
  const compounds=world?.userData?.compounds||[];
  prisonerSystem.configure({world,camp:world?.userData?.prisonCamp||compounds.find(c=>c.id==='prison-camp'),base:P.base,logicalOnly:seedSearchMode});
  radioRelay.configure({world,compounds,logicalOnly:seedSearchMode});
}
function validateRequiredWorldFeatures(){
  const camps=(world?.userData?.compounds||[]).filter(c=>c.id==='prison-camp'),
    prisoners=prisonerSystem.entities,
    mechanics=prisoners.filter(u=>u.role==='mechanic'),
    farmers=prisoners.filter(u=>u.role==='farmer');
  if(camps.length!==1||world.userData.prisonCamp!==camps[0]||
    !Number.isFinite(camps[0].x)||!Number.isFinite(camps[0].z)||
    prisoners.length!==5||mechanics.length!==1||farmers.length!==4||
    prisoners.some(u=>!Number.isFinite(u.hp)||u.hp<=0||!Number.isFinite(u.x)||!Number.isFinite(u.y)||
      !Number.isFinite(u.z)||u.y<=0||!seedSearchMode&&u.o?.parent!==world)){
    throw new Error('Món incomplet: cal un camp de presoners amb quatre camperols i un mecànic. Llavor '+(seed>>>0));
  }
  window.HUNTER_REQUIRED_WORLD_FEATURES=Object.freeze({
    seed:seed>>>0,mapScale:MAP_SCALE,prisonCamps:1,farmers:4,mechanics:1,
    status:'validated'
  });
}
function updateOptionalSystems(dt,active){
  const context=optionalContext(active);
  prisonerSystem.update(dt,context);radioRelay.update(dt,context);
}
function getOptionalAction(){
  if(nativeCoopSession)return nativeReviveAction()||nativeCoopOptionalAction();
  const context=optionalContext();
  if(!context.active||!context.canInteract||cv)return null;
  const prisonerAction=prisonerSystem.getAction(context);
  // Asking the mechanic to follow must never trap the player beside a vehicle.
  if(prisonerAction?.kind==='mechanicFollow'&&nearV())return radioRelay.getAction(context);
  return prisonerAction||radioRelay.getAction(context);
}
function executePlayerOptionalAction(){
  if(nativeCoopSession)return nativeCoopCommand('optional');
  const action=getOptionalAction();if(!action)return false;
  const context=optionalContext();
  return action.kind==='sabotage'?radioRelay.interact(action,context):prisonerSystem.interact(action,context);
}
function optionalMapMarkers(){return [...radioRelay.markers(),...prisonerSystem.markers()]}
const FERRY_DECK=window.HUNTER_VEHICLES.decks?.ferry;
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const ferryLocal=(f,x,z)=>{const dx=x-f.x,dz=z-f.z,s=Math.sin(f.hd),co=Math.cos(f.hd);return{x:dx*co-dz*s,z:dx*s+dz*co}};
const ferryWorld=(f,lx,lz)=>{const s=Math.sin(f.hd),co=Math.cos(f.hd);return{x:f.x+lx*co+lz*s,z:f.z-lx*s+lz*co}};
const ferryCabinContains=(lx,lz,margin=0)=>{
  const c=FERRY_DECK?.cabin;
  return !!c&&Math.abs(lx-c.x)<c.halfW+margin&&Math.abs(lz-c.z)<c.halfL+margin
};
const ferryWalkable=(lx,lz,margin=0)=>{
  if(!FERRY_DECK)return false;
  const d=FERRY_DECK,sc=VS.ferry||1,ax=Math.abs(lx),az=Math.abs(lz);
  return ax+margin<=((az+margin<=d.halfL*sc)?d.halfW:d.rampHalfW)*sc&&
    az+margin<= (d.halfL+d.ramp)*sc;
};
function ferryCabinVehicleHit(f,box){
  const c=FERRY_DECK?.cabin;if(!c)return false;
  const p=ferryWorld(f,c.x*(VS.ferry||1),c.z*(VS.ferry||1));
  return obbOverlap(box,{...p,hd:f.hd,w:c.halfW*2*(VS.ferry||1),d:c.halfL*2*(VS.ferry||1)})
}
function ferryCabinPushPlayer(){
  const deck=pedestrianFerry(P.x,P.z,P.y),c=FERRY_DECK?.cabin;
  if(!deck||!c||!ferryCabinContains(deck.q.x,deck.q.z,.62))return;
  const q=deck.q,m=.65,dx=deck.q.x-c.x,dz=deck.q.z-c.z,
    ex=c.halfW+m-Math.abs(dx),ez=c.halfL+m-Math.abs(dz);
  if(ex<ez)q.x=c.x+(dx<0?-1:1)*(c.halfW+m);
  else q.z=c.z+(dz<0?-1:1)*(c.halfL+m);
  const p=ferryWorld(deck.f,q.x,q.z);P.x=p.x;P.z=p.z
}
const ferryLocalSurfaceY=(f,lz)=>{
  const sc=VS.ferry||1,d=FERRY_DECK;if(!d)return f.o.position.y;
  const az=Math.abs(lz),deck=d.y*sc,edge=d.halfL*sc,ramp=d.ramp*sc;
  if(az<=edge)return f.o.position.y+deck;
  const q=Math.max(0,Math.min(1,(az-edge)/Math.max(.01,ramp)));
  const hinge=f.o?.userData?.ferryRamps?.find(a=>a.side===Math.sign(lz))?.hinge;
  const tip=hinge?deck-Math.sin(hinge.rotation.x)*Math.sign(lz)*ramp:d.rampY*sc;
  return f.o.position.y+deck+(tip-deck)*q
};
function ferryForVehicle(v,x=v.x,z=v.z,includeRamp=true){
  if(!FERRY_DECK||v.t==='ferry')return null;
  const hb=vehicleBox(v,x,z,v.hd),sc=VS.ferry||1;
  for(const f of V){
    if(f===v||f.destroyed||f.t!=='ferry')continue;
    const q=ferryLocal(f,x,z),fw=FERRY_DECK.halfW*sc,fl=FERRY_DECK.halfL*sc,r=includeRamp?FERRY_DECK.ramp*sc:0,
          rel=wrapAngle(v.hd-f.hd),ca=Math.abs(Math.cos(rel)),sa=Math.abs(Math.sin(rel)),
          ex=ca*hb.w*.5+sa*hb.d*.5,ez=sa*hb.w*.5+ca*hb.d*.5;
    // Coberta ampla i rampa estreta: el morro del vehicle comença
    // l'embarcament abans que el buc sòlid el bloquegi. Els laterals
    // segueixen limitats per la projecció de la hitbox del vehicle.
    const ax=Math.abs(q.x),az=Math.abs(q.z),rampHalf=FERRY_DECK.rampHalfW*sc;
    if(ax+ex>fw-.18)continue;
    if(az+ez<=fl)return f;
    if(includeRamp&&Math.abs(f.v||0)<.8&&Math.abs(f.driveInput||0)<.2&&
       az-ez<=fl+r+.65&&az<=fl+r+ez+.65&&
       ax+ex<=rampHalf+.45)return f
  }
  return null
}
function attachToFerry(v,f){
  if(!f||f.destroyed){v.carrier=null;return}
  const q=ferryLocal(f,v.x,v.z);v.carrier=f;v.carrierLX=q.x;v.carrierLZ=q.z;v.carrierHD=wrapAngle(v.hd-f.hd)
}
function detachFromFerry(v){v.carrier=null;delete v.carrierLX;delete v.carrierLZ;delete v.carrierHD}
function syncFerryCargo(){
  if(!FERRY_DECK)return;
  for(const v of V){
    const f=v.carrier;if(!f)continue;
    if(f.destroyed||v.destroyed){detachFromFerry(v);continue}
    const p=ferryWorld(f,v.carrierLX||0,v.carrierLZ||0);v.x=p.x;v.z=p.z;v.hd=wrapAngle(f.hd+(v.carrierHD||0));
    if(VT[v.t]?.m==='a')v.alt=helicopterLandedAltitude(v,ferryLocalSurfaceY(f,v.carrierLZ||0))
  }
}
const setPatrol=(u,pts,guard=false)=>{if(!u)return u;u.patrol=pts.map(([x,z])=>({x,z}));u.pi=-1;u.guard=guard;u.wt=0;return u};
const setDefense=(u,pts)=>{if(!u)return u;u.defense=pts.map(([x,z])=>({x,z}));u.defenseTarget=null;return u};
const chooseDefense=(u,q)=>{
  if(!u.defense||!u.defense.length)return null;let best=null,score=1e9;
  for(const p of u.defense){if(hAt(p.x,p.z)<-.5||treeHit(p.x,p.z,1))continue;const du=Math.hypot(p.x-u.x,p.z-u.z),dq=Math.hypot(p.x-q.x,p.z-q.z),sc=du+dq*.08;if(sc<score&&sight(p.x,p.z,q.x,q.z,hAt(p.x,p.z)+1.7)){score=sc;best=p}}
  return best
};
const wireRod=(a,b,r=.045,c=0x3d4143)=>{const v=new THREE.Vector3(...a),w=new THREE.Vector3(...b),d=w.clone().sub(v),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),6),M(c,'metal'));m.position.copy(v.add(w).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());world.add(m);return m};
// Una filferrada tenia abans 15 malles independents per cada tram de 6 m:
// dos pals, cinc filferros, quatre diagonals i quatre espines. Aquí es
// combinen en una única geometria amb colors per vèrtex. La lògica Wl
// conserva UN objecte per tram perquè els dispars i els tancs el trenquin.
const fenceVisual=window.HUNTER_FENCE_VISUAL.createFenceVisual(THREE,{heightAt:hAt});
function barbedSection(x1,z1,x2,z2){
  if(seedSearchMode){
    const y1=Math.max(hAt(x1,z1),0),y2=Math.max(hAt(x2,z2),0),pad=.24;
    const w={x0:Math.min(x1,x2)-pad,x1:Math.max(x1,x2)+pad,
      z0:Math.min(z1,z2)-pad,z1:Math.max(z1,z2)+pad,
      y0:Math.min(y1,y2),y1:Math.max(y1,y2)+5,hp:8,
      door:false,open:false,barbed:true,rammable:true,
      ax:x1,az:z1,bx:x2,bz:z2,cx:(x1+x2)/2,cz:(z1+z2)/2};
    Wl.push(w);wallGridCount=-1;return w;
  }
  const y1=Math.max(hAt(x1,z1),0),y2=Math.max(hAt(x2,z2),0),cx=(x1+x2)/2,cz=(z1+z2)/2,mesh=fenceVisual(x1,z1,x2,z2),parts=[mesh];world.add(mesh);
  const pad=.24,w={x0:Math.min(x1,x2)-pad,x1:Math.max(x1,x2)+pad,
    z0:Math.min(z1,z2)-pad,z1:Math.max(z1,z2)+pad,
    y0:Math.min(y1,y2),y1:Math.max(y1,y2)+5,hp:8,
    m:mesh,parts,door:false,open:false,barbed:true,rammable:true,
    ax:x1,az:z1,bx:x2,bz:z2,cx,cz};
  Wl.push(w);
  // Les altes/baixes poden compensar-se en longitud: invalidació explícita.
  wallGridCount=-1;
  return w;
};
const barbedSegment=(x1,z1,x2,z2)=>{
  const L=Math.hypot(x2-x1,z2-z1),n=Math.max(1,Math.ceil(L/6));
  for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n;barbedSection(x1+(x2-x1)*a,z1+(z2-z1)*a,x1+(x2-x1)*b,z1+(z2-z1)*b)}
};
const barbedHQ=(cx,cz,hw=50,hd=46,gap=13,gateOffset=0)=>{
  const n=cz-hd,s=cz+hd,w=cx-hw,e=cx+hw,gx=Math.max(w+gap,Math.min(e-gap,cx+gateOffset));
  barbedSegment(w,n,e,n);barbedSegment(w,n,w,s);barbedSegment(e,n,e,s);
  barbedSegment(w,s,gx-gap/2,s);barbedSegment(gx+gap/2,s,e,s);
  compoundClear.push({x:cx,z:cz,r:Math.hypot(hw,hd)*1.02});
};
// construir món
// Carta natural: rawHAt exclou TOTS els anivellaments de terrainLevels.
// Es mostreja una vegada quan les illes ja són definitives (incloent-hi
// les illes de suport que es poden crear durant la generació).
// Les plataformes dels complexos continuen existint en hAt per a física
// i gràfics 3D, però no poden revelar l'HQ al minimapa ni al mapa gran.
// minimapa
const mc=document.getElementById('mm');
const minimap=window.HUNTER_MINIMAP.create({
  THREE,canvas:mc,worldSize:S,halfSize:H,baseHeightAt:rawHAt,colorAt:window.HUNTER_TERRAIN.colorAt,
  getState:()=>({base:P.base,hq:HQ,mapKnown:hqMapKnown||!!inv.mapa,hqClues:window.HUNTER_GAME_INTEL.hqClueMarkers({mapScale:MAP_SCALE,stage:hqIntelStage,confirmed:hqMapKnown,sites:hqIntelSites,discarded:hqIntelDiscarded,discardIndex:hqDiscardIndex}),current:cv||P,currentVehicle:cv,vehicles:V,enemies:E,log:logb,intel:intelMarks,opportunities:optionalMapMarkers()})
});
window.HUNTER_MINIMAP_STATS=minimap.stats;
const mini=()=>minimap.draw();
// control
let paused=false,muted=false,zoom=1,waypoint=null,elapsed=0,uiTick=0,worldVisualTick=0,palmVisualTick=0;
const simulationClock=window.HUNTER_SIMULATION_CLOCK.create(),
      cinematicClock=window.HUNTER_SIMULATION_CLOCK.create();
const stealthFeedback=window.HUNTER_STEALTH_FEEDBACK.create(THREE);
window.HUNTER_STEALTH_FEEDBACK_STATS=stealthFeedback.stats;
let simulationFrameActive=false,simulationFocused=true;
function resetSimulationClock(now=performance.now()){
  if(now===null){audioReset();adaptivePerformance.resetCapture();}
  simulationClock.reset(now);cinematicClock.reset(now);
  combatFeedback?.clear();
  stealthFeedback.reset();resetSoldierCoordination();
}
// Comptabilitat consultable: temps admès, simulat i descartat, també en pauses.
window.HUNTER_SIMULATION_STATS={gameplay:simulationClock.stats,cinematic:cinematicClock.stats};
const vehicleLook=window.HUNTER_CAMERA_CONTROLS.createVehicleLook(),
      cameraOcclusion=window.HUNTER_CAMERA_CONTROLS.createOcclusion();
let drag=null,cameraVehicle=null,cameraBasement=null;
function restoreCameraWalls(){
  cameraOcclusion.restore();
  if(activeBunker?.basement)activeBunker.basement.cameraHiddenWalls.length=0;
}
function cancelCameraDrag(){
  const id=drag?.id;drag=null;
  if(id==null)return;
  // Un pointer cancel·lat o perdut ja pot haver perdut la captura nativa.
  try{if(ren.domElement.hasPointerCapture(id))ren.domElement.releasePointerCapture(id)}catch{}
}
function resetCameraState(){
  cancelCameraDrag();vehicleLook.reset();cameraVehicle=cv;
  restoreCameraWalls();
}
function syncCameraVehicle(){if(cameraVehicle!==cv)resetCameraState()}
const LOD_NEAR2=500*500,LOD_MID2=1200*1200,ITEM_ANIM2=500*500,FAUNA_NEAR2=650*650,FAUNA_MID2=1400*1400;
// Distàncies visuals per família. NO afecten danys, física, IA ni mapa.
const VISUAL_RANGES={
  desktop:{buildings:1650,fences:1020,props:700,vehicles:2080,enemies:1850,items:420,fauna:1350,antennas:1750},
  mobile:{buildings:980,fences:580,props:510,vehicles:1200,enemies:1050,items:330,fauna:790,antennas:1100},
  ultra:{buildings:650,fences:400,props:350,vehicles:780,enemies:700,items:250,fauna:530,antennas:770}
}[qualityName]||{buildings:1200,fences:790,props:600,vehicles:1620,enemies:1410,items:380,fauna:1100,antennas:1360};
const {visibilityStats,enemyLodStats}=
  window.HUNTER_GAME_STATE.createVisibilityCounters();
const ENEMY_LOD_RANGES={
  desktop:{full:310,mid:860},mobile:{full:185,mid:470},ultra:{full:135,mid:305}
}[qualityName]||{full:240,mid:660};
window.HUNTER_ENEMY_LOD_STATS=enemyLodStats;
window.HUNTER_VISIBILITY_STATS=visibilityStats;
let staticVisualBatches=[];
const {renderCategories,shadowRenderCategories,renderOtherDetails,
  vehicleDrawTypes,vehicleDrawParts,vehicleShadowTypes,vehicleFleet}=
  window.HUNTER_GAME_STATE.createDrawCounters();
window.HUNTER_VEHICLE_DRAW_TYPES=vehicleDrawTypes;
window.HUNTER_VEHICLE_DRAW_PARTS=vehicleDrawParts;
window.HUNTER_VEHICLE_SHADOW_TYPES=vehicleShadowTypes;
window.HUNTER_VEHICLE_FLEET=vehicleFleet;
window.HUNTER_SHADOW_DRAW_GROUPS=shadowRenderCategories;
window.HUNTER_DRAW_OTHER_DETAILS=renderOtherDetails;
window.HUNTER_DRAW_CALL_GROUPS=renderCategories;
adaptivePerformance.stats.drawCategories=renderCategories;
const registeredDrawHooks=new WeakMap();
// Reuses the world build's existing traversal to instrument only large,
// switchable visual groups. No second scene scan per rendered frame.
const hiddenMatrixCull=window.HUNTER_HIDDEN_MATRIX.create();
function registerDrawCategories(){const steps=registerDrawCategoriesSteps(false);while(!steps.next().done){}}
function* registerDrawCategoriesSteps(progressive=true){
  const tagged=new Map(),vehicleRoots=new Map();
  for(const key in vehicleFleet)delete vehicleFleet[key];
  const markVehicle=(root,type)=>{
    if(!root)return;
    vehicleRoots.set(root,type);
    let stats=vehicleFleet[type];
    if(!stats)stats=vehicleFleet[type]={
      count:0,meshes:0,shadowCasters:0,savedMeshes:0,originalMeshes:0
    };
    stats.count++;
    // Les fàbriques registren les peces eliminades per fusió, sense
    // confondre-les amb les malles que no es veuen per distància.
    stats.savedMeshes+=(root.userData?.vehicleBatchStats?.groups||0)+
      (root.userData?.marineBatchStats?.groups||0);
    root.traverse(o=>{
      if(o.isMesh){stats.meshes++;if(o.castShadow)stats.shadowCasters++}
    });
    stats.originalMeshes=stats.meshes+stats.savedMeshes;
  };
  for(const b of B)tagged.set(b.o,'edificis');
  for(const v of V){tagged.set(v.o,'vehicles');markVehicle(v.o,v.t)}
  for(const e of E)if(e.o){
    tagged.set(e.o,'enemics');
    if(['jeep','tanqueta','tanc','patrulla_marina'].includes(e.t))markVehicle(e.o,e.t);
  }
  for(const f of fa)if(f.o)tagged.set(f.o,'fauna');
  for(const item of items)tagged.set(item.o,'objectes');
  if(PM.trunk)tagged.set(PM.trunk,'vegetacio');
  if(terrainStream?.mesh)tagged.set(terrainStream.mesh,'terreny');
  tagged.set(pl,'jugador');
  // El mar i el cel són fills directes de l'escena, no del món generat.
  if(typeof water!=='undefined'){
    if(water.mesh)tagged.set(water.mesh,'mar');
    if(water.deep)tagged.set(water.deep,'mar');
    if(water.shore)tagged.set(water.shore,'mar');
  }
  if(typeof sky!=='undefined')tagged.set(sky,'cel');
  if(typeof sunM!=='undefined')tagged.set(sunM,'cel');
  if(typeof rendering!=='undefined'&&rendering.glow)tagged.set(rendering.glow,'cel');
  function track(mesh){
    if(tagged.has(mesh)||mesh.name==='hunter-vehicle-full-detail'||
       mesh.name==='hunter-enemy-full')hiddenMatrixCull.register(mesh);
    if(!mesh.isMesh)return;
    const installed=registeredDrawHooks.get(mesh);
    if(!performanceStatsVisible){
      if(installed){
        mesh.onBeforeRender=installed.previous;
        mesh.onBeforeShadow=installed.previousShadow;
      }
      return;
    }
    let label='altres';
    if(mesh.userData.terrainTile)label='terreny';
    else if(mesh.name==='hunter-fence-section')label='filferrades';
    else if(mesh.name==='hunter-static-decor-batch')label='decoracio';
    else {
      let root=mesh;
      while(root){if(tagged.has(root)){label=tagged.get(root);break}root=root.parent}
      if(label==='altres'&&(mesh.parent?.name==='hunter-bush-sectors'||mesh.parent?.name==='hunter-rock-sectors'))label='vegetacio';
    }
    // Subcategories estables de les malles que encara no tenen un propietari.
    const detail=label==='altres'?(mesh.parent?.name||mesh.name||
      mesh.geometry?.type||'malla sense nom'):'';
    let vehicleType='';
    for(let root=mesh;root;root=root.parent)
      if(vehicleRoots.has(root)){vehicleType=vehicleRoots.get(root);break}
    // La geometria identifica pneumàtics, rems, pales i detalls.
    // Els batches estàtics tenen noms explícits per preservar la distinció.
    const vehiclePart=vehicleType?(mesh.name||
      mesh.parent?.name||mesh.geometry?.type||'malla sense nom'):'';
    const existing=registeredDrawHooks.get(mesh);
    if(existing){
      // The same mesh can change parent/category across world rebuilds.
      existing.label=label;existing.detail=detail;
      existing.vehicleType=vehicleType;existing.vehiclePart=vehiclePart;
      mesh.onBeforeRender=existing.wrapper;
      mesh.onBeforeShadow=existing.shadowWrapper;
      return;
    }
    // Preserve any existing animation hook, wrapping each mesh only once.
    const previous=mesh.onBeforeRender,previousShadow=mesh.onBeforeShadow;
    const entry={label,detail,vehicleType,vehiclePart,previous,previousShadow};
    mesh.onBeforeRender=function(...args){
      renderCategories[entry.label]=(renderCategories[entry.label]||0)+1;
      if(entry.label==='altres')renderOtherDetails[entry.detail]=(renderOtherDetails[entry.detail]||0)+1;
      if(entry.vehicleType){
        vehicleDrawTypes[entry.vehicleType]=(vehicleDrawTypes[entry.vehicleType]||0)+1;
        const key=entry.vehicleType+' / '+entry.vehiclePart;
        vehicleDrawParts[key]=(vehicleDrawParts[key]||0)+1;
      }
      if(previous)return previous.apply(this,args);
    };
    entry.wrapper=mesh.onBeforeRender;
    mesh.onBeforeShadow=function(...args){
      if(typeof shadowRenderCategories!=='undefined')
        shadowRenderCategories[entry.label]=(shadowRenderCategories[entry.label]||0)+1;
      if(entry.vehicleType)vehicleShadowTypes[entry.vehicleType]=(vehicleShadowTypes[entry.vehicleType]||0)+1;
      if(previousShadow)return previousShadow.apply(this,args);
    };
    entry.shadowWrapper=mesh.onBeforeShadow;
    registeredDrawHooks.set(mesh,entry);
  }
  if(progressive)yield* traverseGenerationSteps(world,track,'Preparant el render');
  else world.traverse(track);
  pl.traverse(track);
  // Malles fora del món: mar, cel i efectes. No tornem a recórrer tot el món.
  if(typeof scene!=='undefined'&&scene?.children)
    for(const child of scene.children){
      if(child===world||child===pl)continue;
      if(progressive)yield* traverseGenerationSteps(child,track,'Classificant efectes');
      else child.traverse(track);
    }
}
function terrainConcealsBuilding(b,dist){
  // Oclusió conservadora només per a edificis força llunyans.
  if(dist<340)return false;
  const fromY=Math.max(P.y+3,cam.position.y),
        toY=b.fy+b.h+5;
  let covered=0;
  for(const t of [.3,.52,.74]){
    const x=P.x+(b.x-P.x)*t,z=P.z+(b.z-P.z)*t,
          line=fromY+(toY-fromY)*t;
    if(hAt(x,z)>line+9)covered++;
  }
  return covered>=2;
}
function isInsideVisibleBuilding(b){
  if(b?.basement&&!cv&&P.y<b.fy-3.9){
    const local=buildingLocalPoint(b,P.x,P.z);
    if(Math.abs(local.x)<b.basement.halfX&&Math.abs(local.z)<b.basement.halfZ)return true;
  }
  if(b===ib)return true;
  if(!b.hangar||!cv||cv.destroyed)return false;
  const y=VT[cv.t]?.m==='a'?(cv.alt??cv.o?.position?.y):(cv.o?.position?.y??cv.alt),
        heading=cv.hd+vehicleLook.offset;
  return y!=null&&window.HUNTER_CAMERA_CONTROLS.hangarBlocksSight(b,cam.position,{
    x:cv.x-Math.sin(heading)*8,y:(cv.o?.position?.y??y)+2,
    z:cv.z-Math.cos(heading)*8
  },{x:cv.x,y,z:cv.z});
}
function currentSniperFocus(){return scopeActive?window.HUNTER_SCOPE_FOCUS.create(P.x,P.y+1.76,P.z,scopeYaw,scopePitch):null}
function updateDistanceVisibility(){
  const stamp=performanceStatsVisible?performance.now():0;
  const max=VISUAL_RANGES,focus=currentSniperFocus();
  for(const k of Object.keys(visibilityStats))visibilityStats[k]=0;
  for(const b of B){
    const dx=b.x-P.x,dz=b.z-P.z,d2=dx*dx+dz*dz,
          inside=isInsideVisibleBuilding(b),
          close=inside||d2<(max.buildings+b.hw)* (max.buildings+b.hw)||
            !!focus?.contains(b.x,b.fy+b.h*.5,b.z,Math.max(b.hw,b.h*.5)),
          obscured=close&&!inside&&terrainConcealsBuilding(b,Math.sqrt(d2));
    b.o.visible=close&&!obscured;
    // Sota el búnquer, ni el forjat ni la coberta no es tornen
    // transparents. L'opacitat reduïda és només per a cases normals.
    const basementView=!!b.basement&&inside&&P.y<b.fy-1;
    b.roof.visible=(!inside||basementView)&&b.rhp>0;
    for(const r of b.extraRoofs||[])r.visible=b.roof.visible;
    if(b.upperFloor)b.upperFloor.visible=!b.rb&&(!inside||P.y>=b.fy+b.storey-.6);
    // Les peces interposades s'oculten a la càmera, no totes les parets
    // de l'habitació. La resta conserva el material opac original.
    b.wm.opacity=b.dm.opacity=1;
    b.wm.depthWrite=b.dm.depthWrite=true;
    if(!b.o.visible)visibilityStats.buildings++;
    if(obscured)visibilityStats.terrainOccluded++;
  }
  for(const w of Wl){
    if(!w.barbed||!w.m)continue;
    const dx=w.cx-P.x,dz=w.cz-P.z;
    w.m.visible=(w.hp>0&&(dx*dx+dz*dz<max.fences*max.fences||
      !!focus?.contains(w.cx,(w.y0+w.y1)*.5,w.cz,5)));
    if(!w.m.visible)visibilityStats.fences++;
  }
  const chunkRadius=113; // diagonal mitja del sector de 160 m
  for(const mesh of staticVisualBatches){
    const dx=mesh.position.x-P.x,dz=mesh.position.z-P.z,
          // El lot inclou peces de tot el sector: no desapareix quan
          // la seva vora encara és propera. La histèresi evita parpelleig.
          r=max.props+chunkRadius+(mesh.visible?35:0);
    mesh.visible=dx*dx+dz*dz<r*r||
      !!focus?.intersectsXZBox(mesh.position.x,mesh.position.z,80);
    if(!mesh.visible)visibilityStats.props++;
  }
  for(const v of V){
    const dx=v.x-P.x,dz=v.z-P.z;
    // La destrucció té prioritat sobre el LOD: a multijugador el
    // servidor amaga el vehicle, i aquesta passada no el pot ressuscitar.
    v.o.visible=!v.destroyed&&(v===cv||dx*dx+dz*dz<max.vehicles*max.vehicles||
      !!focus?.contains(v.x,v.o.position.y+1.5,v.z,5));
    if(!v.o.visible)visibilityStats.vehicles++;
  }
  for(const key in enemyLodStats)enemyLodStats[key]=0;
  for(const e of E){
    if(!e.o)continue;
    const dx=e.x-P.x,dz=e.z-P.z,d2=dx*dx+dz*dz,
          scopeDetailed=!!focus?.contains(e.x,e.o.position.y+(e.t==='torre'?8:2),e.z,e.t==='torre'?3:1.5),
          visible=e.hp>0&&!e.destroyed&&(d2<max.enemies*max.enemies||scopeDetailed);
    // La presentació incremental del cooperatiu no ha d'haver
    // d'ocultar morts a cada fotograma: el LOD respecta l'estat vital.
    e.o.visible=visible;
    if(!visible){window.HUNTER_ENEMY_LOD.setLevel(e.o,'far');visibilityStats.enemies++;enemyLodStats.hidden++;continue}
    const d=Math.sqrt(d2),old=e.o.userData.enemyLOD,
      fullLimit=ENEMY_LOD_RANGES.full+(old==='full'?12:-12),
      midLimit=ENEMY_LOD_RANGES.mid+(old==='mid'?12:-12),
      level=scopeDetailed||d<fullLimit?'full':d<midLimit?'mid':'far';
    window.HUNTER_ENEMY_LOD.setLevel(e.o,level);
    enemyLodStats[level]++;
    if(level==='full'&&e.t!=='soldat'&&e.t!=='general')enemyLodStats.vehicleFull++;
  }
  for(const item of items){
    const dx=item.x-P.x,dz=item.z-P.z,
          // Es tracta només de dibuix: el recollible sempre existeix
          // al mapa i conserva totes les comprovacions de recollida.
          r=max.items+(item.o.visible?25:0);
    item.o.visible=dx*dx+dz*dz<r*r||
      !!focus?.contains(item.x,item.y+1,item.z,2);
    if(!item.o.visible)visibilityStats.items++;
  }
  for(const f of fa){
    const dx=(f.x??f.cx)-P.x,dz=(f.z??f.cz)-P.z;
    f.o.visible=dx*dx+dz*dz<max.fauna*max.fauna||
      !!focus?.contains(f.x??f.cx,f.o.position.y??4,f.z??f.cz,2);
    if(!f.o.visible)visibilityStats.fauna++;
  }
  for(const compound of world.userData.compounds||[]){
    if(!compound.antenna)continue;
    const dx=compound.x-P.x,dz=compound.z-P.z;
    compound.antenna.visible=dx*dx+dz*dz<max.antennas*max.antennas||
      !!focus?.contains(compound.x,compound.antenna.position.y,compound.z,10);
    if(!compound.antenna.visible)visibilityStats.antennas++;
  }
  if(performanceStatsVisible)perfHotspots.visibilityMs+=performance.now()-stamp;
}
function prepareVisibilitySystem(){return drainBuildSteps(prepareVisibilitySystemSteps())}
function* prepareVisibilitySystemSteps(){
  staticVisualBatches=world.children.filter(o=>o.name==='hunter-static-decor-batch');
  yield* registerDrawCategoriesSteps();
  updateDistanceVisibility();
}

const K={},joystick=window.HUNTER_JOYSTICK.create(document.getElementById('joystick')),
      strafeButtons={left:document.getElementById('strafeLeft'),right:document.getElementById('strafeRight')},
      strafePointers={left:null,right:null},
      STRAFE_VEHICLES=new Set(['hover','heli','heli_combat']);
const playerInputReader=window.HUNTER_PLAYER_INPUT.createReader(K,joystick,strafePointers);
// Els blindats tenen dos papers autoritatius: conductor (seient 0) i
// artiller (seient 1). Amb un sol ocupant, SHIFT o TORRETA activen
// temporalment el control manual i bloquegen la conducció.
let armoredTurretToggle=false,armoredTurretVehicle=null;
const armoredVehicle=()=>!!cv&&(cv.t==='tanc'||cv.t==='tanqueta');
function armoredRole(){
 if(!armoredVehicle()||!nativeCoopSession)return 'solo';
 const row=nativeCoopSession.appliedVehicleRows?.get(cv.saveId);
 if(row?.seats?.[1]===nativeCoopSession.self)return 'gunner';
 if(row?.seats?.[0]===nativeCoopSession.self&&row.seats[1])return 'driver-locked';
 return 'solo';
}
function armoredManualActive(){
 if(armoredTurretVehicle!==cv){armoredTurretVehicle=cv;armoredTurretToggle=false;}
 if(!armoredVehicle()||armoredRole()==='driver-locked')return false;
 return armoredTurretToggle||!!K.ShiftLeft||!!K.ShiftRight;
}
function armoredCanFire(){
 return !armoredVehicle()||armoredRole()!=='driver-locked';
}
const armoredTurretButton=document.createElement('button');
armoredTurretButton.id='armoredTurretButton';armoredTurretButton.type='button';
armoredTurretButton.textContent='TORRETA';
armoredTurretButton.style.cssText='display:none;position:fixed;z-index:7;'+
 'right:calc(12px + env(safe-area-inset-right,0px));'+
 'bottom:calc(210px + env(safe-area-inset-bottom,0px));'+
 'height:44px;min-width:100px;padding:8px 12px;border-radius:11px;'+
 'border:2px solid #c9d5a7;background:#152e2de8;color:#fff;'+
 'font:700 12px system-ui;touch-action:manipulation';
armoredTurretButton.setAttribute('aria-label','Activar control manual de torreta');
armoredTurretButton.setAttribute('aria-pressed','false');
document.body.appendChild(armoredTurretButton);
armoredTurretButton.addEventListener('click',()=>{
 if(!armoredVehicle()||armoredRole()==='driver-locked'||paused||over)return;
 armoredTurretToggle=!armoredTurretToggle;
 joystick.reset();releaseStrafeButtons();
 updateArmoredTurretButton();
});
function updateArmoredTurretButton(){
 const show=!!started&&!paused&&!over&&armoredVehicle();
 const role=show?armoredRole():'solo',locked=role==='driver-locked',manual=show&&armoredManualActive();
 armoredTurretButton.style.display=show?'block':'none';
 armoredTurretButton.disabled=locked;
 armoredTurretButton.textContent=locked?'CONDUCTOR':manual?'TORRETA ●':'TORRETA';
 armoredTurretButton.style.background=manual?'#477757ef':'#152e2de8';
 armoredTurretButton.setAttribute('aria-pressed',String(manual));
 armoredTurretButton.title=locked?'Conductor: el segon jugador controla la torreta':
  role==='gunner'?'Artiller · SHIFT o interruptor per apuntar manualment':
  'SHIFT o interruptor: apuntat manual; deixa de conduir mentre està actiu';
}

const crouchButton=document.createElement('button');
crouchButton.id='crouchButton';crouchButton.type='button';
crouchButton.textContent='AJUPIR';crouchButton.title='Ajupir-se o aixecar-se · X';
crouchButton.setAttribute('aria-label','Ajupir-se o aixecar-se');
crouchButton.setAttribute('aria-pressed','false');
crouchButton.style.cssText='display:none;position:fixed;z-index:7;'+
  'left:calc(12px + env(safe-area-inset-left,0px));'+
  'bottom:calc(235px + env(safe-area-inset-bottom,0px));'+
  'width:70px;height:42px;border-radius:12px;border:2px solid #b6d3b8;'+
  'background:#10241edb;color:#fff;font:700 11px system-ui;'+
  'box-shadow:0 3px 11px #0008;touch-action:manipulation';
document.body.appendChild(crouchButton);
const canCrouch=()=>window.HUNTER_PLAYER_INPUT.canCrouch(started,paused,over,cv,swimming,scopeActive,playerFall,playerEject);
function updateCrouchButton(){
  const enabled=canCrouch();crouchButton.style.display=enabled?'block':'none';
  crouchButton.style.background=playerCrouched?'#4a7655ee':'#10241edb';
  crouchButton.textContent=playerCrouched?'AIXECAR':'AJUPIR';
  crouchButton.setAttribute('aria-pressed',String(playerCrouched&&enabled));
}
crouchButton.addEventListener('click',e=>{
  e.preventDefault();if(canCrouch()){playerCrouched=!playerCrouched;updateCrouchButton()}
});
function setStealthDebug(enabled){window.HUNTER_STEALTH.setDebug(enabled)}
function setStealthLayer(key,value){window.HUNTER_STEALTH.setLayer(key,value)}
const canStrafe=()=>window.HUNTER_PLAYER_INPUT.canStrafe(scopeActive,cv,STRAFE_VEHICLES,playerEject,playerFall);
const setStrafeHeld=(side,held)=>{
  const button=strafeButtons[side];
  button.classList.toggle('held',held);
  button.setAttribute('aria-pressed',String(held));
};
const releaseStrafeButtons=()=>{
  for(const side of ['left','right']){strafePointers[side]=null;setStrafeHeld(side,false)}
};
const updateStrafeControls=()=>{
  const enabled=!!started&&!paused&&!over&&canStrafe();
  document.body.classList.toggle('strafe-active',enabled);
  if(!enabled&&(strafePointers.left!==null||strafePointers.right!==null))releaseStrafeButtons();
  return enabled;
};
for(const side of ['left','right']){
  const button=strafeButtons[side];
  button.addEventListener('pointerdown',e=>{
    if(!updateStrafeControls()||strafePointers[side]!==null)return;
    e.preventDefault();strafePointers[side]=e.pointerId;
    button.setPointerCapture(e.pointerId);setStrafeHeld(side,true);
  });
  const release=e=>{
    if(strafePointers[side]!==e.pointerId)return;
    strafePointers[side]=null;setStrafeHeld(side,false);
  };
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,release);
}
const clearKeys=()=>{
  resetCameraState();
  cancelGrenadeCharge();cancelAssaultBurst();Object.keys(K).forEach(k=>K[k]=0);
  joystick.reset();releaseStrafeButtons();
  document.querySelectorAll('[data-k]').forEach(b=>b.classList.remove('held'))
};
const quickWeapons=()=>['pistola','ganivet',...['fusell_assalt','franctirador','bazooka','granada','cisalla'].filter(k=>inv[k]>0)];
const selectedWeapon=()=>knifeEquipped?'ganivet':assaultRifleEquipped?'fusell_assalt':sniperEquipped?'franctirador':bazookaEquipped?'bazooka':grenadeEquipped?'granada':cisallaEquipped?'cisalla':'pistola';
function selectWeapon(k){if(nativeCoopSession){selectNativeCoopWeapon(k);return;}if(!weaponPickerAvailable()||swimming||!quickWeapons().includes(k))return;cancelGrenadeCharge();cancelAssaultBurst();setSniperScope(false);knifeEquipped=k==='ganivet';assaultRifleEquipped=k==='fusell_assalt';sniperEquipped=k==='franctirador';bazookaEquipped=k==='bazooka';grenadeEquipped=k==='granada';cisallaEquipped=k==='cisalla';msg=k+' equipat';msgT=1.5;drawWeaponPicker()}
function cycleWeapon(n){const w=quickWeapons(),i=w.indexOf(selectedWeapon());selectWeapon(w[(i+n+w.length)%w.length])}
const picker=document.createElement('div');picker.style.cssText='position:fixed;z-index:100;right:10px;bottom:258px;background:#203239ed;padding:8px;border-radius:10px;display:none;flex-direction:column;gap:5px;max-height:50vh;overflow:auto';document.body.appendChild(picker);
const pickerToggle=document.createElement('button');pickerToggle.textContent='⚔ Armes';pickerToggle.style.cssText='position:fixed;z-index:99;right:10px;bottom:210px;padding:8px;color:white;background:#304b52;border-radius:9px';pickerToggle.style.display='none';document.body.appendChild(pickerToggle);
let pickerOpen=false,pickerSignature=null;
const weaponPickerAvailable=()=>!!started&&document.body.classList.contains('game-started')&&!paused&&!over&&hp>0&&!cv&&!deathCinematic?.active&&!victoryCinematic?.active&&!victoryCinematic?.finished;
function syncWeaponPicker(){const visible=weaponPickerAvailable();const display=visible?'block':'none';if(pickerToggle.style.display!==display)pickerToggle.style.display=display;if(!visible&&pickerOpen){pickerOpen=false;drawWeaponPicker()}}
pickerToggle.onclick=()=>{if(!weaponPickerAvailable())return;pickerOpen=!pickerOpen;drawWeaponPicker()};
function drawWeaponPicker(){const visible=pickerOpen&&weaponPickerAvailable(),weapons=visible?quickWeapons():[];
const signature=visible?JSON.stringify([selectedWeapon(),ammo,sniperAmmo,bazookaAmmo,weapons.map(k=>[k,inv[k]])]):'hidden';
if(signature===pickerSignature)return;pickerSignature=signature;
picker.style.display=visible?'flex':'none';picker.replaceChildren();if(!visible)return;const names={pistola:'🔫 Pistola',ganivet:'🔪 Ganivet',fusell_assalt:'🔫 Fusell d’assalt',franctirador:'🔭 Rifle',bazooka:'🚀 Bazooka',granada:'💣 Granades',cisalla:'✂ Cisalla'};quickWeapons().forEach((k,i)=>{const b=document.createElement('button');b.textContent=(i+1)+' · '+names[k]+' · '+(k==='pistola'||k==='fusell_assalt'?ammo:k==='franctirador'?sniperAmmo:k==='bazooka'?bazookaAmmo:k==='ganivet'?'∞':inv[k]);b.style.cssText='padding:8px;color:white;background:'+(selectedWeapon()===k?'#356c51':'#364a52');b.onclick=()=>{selectWeapon(k);pickerOpen=false;drawWeaponPicker()};picker.appendChild(b)})}
const act=c=>{if(generationPromise)return;if(ui?.isBombTimerOpen?.()){
  // No es pot tancar el programador ni detonar saltant-se la confirmació.
  if(c==='Escape'||c==='KeyP'||c==='KeyI'){panel('inventory');return}
  if(c==='Enter'||c==='NumpadEnter'){
    document.getElementById('bombTimerConfirm')?.click?.();return
  }
  return
}if(/^Digit[1-7]$/.test(c)){selectWeapon(quickWeapons()[Number(c.slice(5))-1]);return}if(c==='KeyV'){cycleWeapon(1);return}if(c==='Escape'||c==='KeyP'){
  if(started){
    // ESC/P sempre porta a la pausa: si érem dins un submenú,
    // primer tornam al menú principal; una altra pulsació reprèn la partida.
    if(!paused)panel('pause');
    else if(ui?.getMode?.()!=='pause')panel('pause');
    else resume();
  }
  return;
}if(c==='KeyM'){if(started)paused?resume():panel('map');return}if(c==='KeyI'){if(started)paused?resume():panel('inventory');return}if(c==='F9'){setStealthDebug(!window.HUNTER_STEALTH.enabled());return}if(!started||paused||over)return;if(c==='KeyX'){if(canCrouch()){playerCrouched=!playerCrouched;updateCrouchButton()}return}if(c==='KeyT'){toggleSniperScope();return}if(c==='KeyE'){if(cv)toggle();else if(interactPlayerDoor()){}else if(getOptionalAction())executePlayerOptionalAction();else if(nearV())toggle();else panel('inventory');return}if(c==='KeyR'){panel('inventory');return}if(c==='KeyB'){if(cv)throwVehicleGrenade();return}if(c==='KeyG'){
  // The utility helicopter has two independent actions: F throws
  // grenades and G programmes a timed explosive for the side door.
  if(cv?.t==='heli'){
    if((inv.expl||0)>0&&!swimming&&!playerFall&&!playerEject)
      panel('bombtimer');
    else if(!inv.expl){msg='No tens explosius C4 per deixar caure.';msgT=2}
    return;
  }
  if(!secondaryWeapon()&&inv.expl&&!cv&&
     !swimming&&!playerFall&&!playerEject)panel('bombtimer');
}if(c==='KeyC'){if(inv.disf){if(nativeCoopSession)nativeCoopSession.channel.inventory('disguise',!disg);else setDis(!disg);}else{msg='Busca una disfressa dins dels edificis.';msgT=3}}if(c==='KeyL')mark()};
const nearV=()=>{if(playerFall||playerEject)return null;let b=null,bd2=Infinity;for(const v of vehicleCandidatesAt(P.x,P.z,24,true)){if(v.sunk&&v.t!=='bici'||(v.t!=='bici'&&v.waterIngress?.dead)||v.reentryLockUntil>elapsed||v.enemyCrew?.some(Boolean))continue;const dx=v.x-P.x,dz=v.z-P.z,d2=dx*dx+dz*dz,r=vehicleRadius(v.t)+5;if((circleVehicleOverlap(P.x,P.z,5,v)||d2<r*r)&&d2<bd2){bd2=d2;b=v}}return b};
function updateActionButton(nearby){
  const button=document.getElementById('mainActionButton');
  if(!button)return;
  // El mateix vehicle que retornaria nearV() a la tecla E.
  // En conduir, la icona continua identificant el vehicle del qual baixarem.
  const door=!cv?nearestPlayerDoor():null,optional=!cv&&!door?getOptionalAction():null;
  const vehicle=cv||nearby||null,type=door?'door-'+((door.desiredOpen??door.open)?'close':'open'):optional?'optional-'+optional.kind:vehicle?.t||'backpack',
        name=vehicle?VT[vehicle.t]?.n||vehicle.t:null,
        title=door?playerDoorLabel(door):optional?optional.label:cv?'Baixar de '+name:nearby?'Pujar a '+name:'Obrir inventari';
  if(button.dataset.vehicle!==type){
    button.dataset.vehicle=type;
    button.innerHTML=door?window.HUNTER_ACTION_ICONS.door:optional?optional.icon||'✋':vehicle?window.HUNTER_ACTION_ICONS.vehicle(type):window.HUNTER_ACTION_ICONS.backpack;
  }
  if(button.title!==title){
    button.title=title;
    button.setAttribute('aria-label',title);
  }
}
// Cúpula del paracaigudes amb vuit cordes, visible mentre es descendeix.
let parachuteVisual=null;
function makeParachuteVisual(){
  const g=new THREE.Group();
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(3.45,16,7,0,Math.PI*2,0,Math.PI/2),
    new THREE.MeshStandardMaterial({color:0xe5d7b0,side:THREE.DoubleSide,roughness:.88,flatShading:true}));
  canopy.position.y=5.3;canopy.castShadow=true;g.add(canopy);
  const vertices=[];
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*3.42,z=Math.sin(a)*3.42;
    vertices.push(x,5.25,z,.57*Math.cos(a),2.56,.43*Math.sin(a))}
  const lines=new THREE.BufferGeometry();
  lines.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.add(new THREE.LineSegments(lines,new THREE.LineBasicMaterial({color:0xe9eee5})));
  return g;
}
function createParachuteVisual(){const g=makeParachuteVisual();world.add(g);return g;}
function removeParachuteVisual(){if(parachuteVisual){world.remove(parachuteVisual);parachuteVisual=null}}
// Detecta el primer sostre travessat durant la caiguda, també quan el
// desplaçament horitzontal canvia de teulada dins d'un sol fotograma.
function parachuteRoofLanding(x0,z0,y0,x1,z1,y1){
  return window.HUNTER_PLAYER_SIMULATION.sweptRoofLanding(
    {x:x0,z:z0,y:y0},{x:x1,z:z1,y:y1},{buildingCandidates,solidRoofAt});
}
// Compartida per al salt voluntari i per a la destrucció de l'helicòpter.
// La caiguda conserva l'altura i la inèrcia; el dany es calcula en aterrar.
function ejectFromHelicopter(v){
  resetCameraState();
  const fx=-Math.sin(v.hd),fz=-Math.cos(v.hd),
        exitRightX=v.x+Math.cos(v.hd)*1.8,exitRightZ=v.z-Math.sin(v.hd)*1.8,
        blockedRight=wallCandidates(exitRightX,exitRightZ,1).some(w=>!w.open&&
          exitRightX>w.x0-.8&&exitRightX<w.x1+.8&&exitRightZ>w.z0-.8&&exitRightZ<w.z1+.8),
        side=blockedRight?-1:1,
        ground=Math.max(0,hAt(v.x,v.z)),
        altitude=Number.isFinite(v.alt)?v.alt:(v.o?.position?.y??ground);
  P.x=v.x+Math.cos(v.hd)*side*1.8;
  P.z=v.z-Math.sin(v.hd)*side*1.8;
  P.hd=v.hd;P.y=altitude;
  playerFall={y:altitude,vy:0,
    vx:fx*(v.v||0)*.82+Math.cos(v.hd)*side*2.5,
    vz:fz*(v.v||0)*.82-Math.sin(v.hd)*side*2.5,
    startHeight:Math.max(0,altitude-ground),t:0,spin:side,leanF:0,leanS:0};
  const chute=!!inv.paracaigudes;
  playerFall.parachute=chute;
  removeParachuteVisual();
  if(chute)parachuteVisual=createParachuteVisual();
  v.reentryLockUntil=elapsed+8;
  playerEject=null;v.strafeV=0;cv=null;swimming=false;
}
// Sortida segura del Humvee, turismes i camió en marxa: pel costat i
// darrere del sentit de moviment, fora de la caixa física del vehicle.
function truckExitCandidate(v,side,index){
  const box=vehicleBox(v),k=index%8,exitSide=index<8?side:-side,
        lateral=box.w/2+2.2+Math.floor(k/4)*1.5,
        behind=-(v.v<0?-1:1)*(box.d*.22+(k%4)*1.35),
        fx=-Math.sin(v.hd),fz=-Math.cos(v.hd),
        sx=Math.cos(v.hd),sz=-Math.sin(v.hd);
  return{x:v.x+sx*exitSide*lateral+fx*behind,
    z:v.z+sz*exitSide*lateral+fz*behind,side:exitSide};
}
// A deep-water wreck cannot keep the player captive or be entered again.
function escapeSubmergedVehicle(v){
  if(cv!==v)return;
  resetCameraState();
  const distance=vehicleBox(v).w/2+2.1,side=1;
  P.x=Math.max(-H+4,Math.min(H-4,v.x+Math.cos(v.hd)*side*distance));
  P.z=Math.max(-H+4,Math.min(H-4,v.z-Math.sin(v.hd)*side*distance));
  P.hd=v.hd;P.y=wy(P.x,P.z,elapsed)-1.9;
  v.v=0;v.driveInput=0;v.steerInput=0;v.reentryLockUntil=Infinity;
  cv=null;swimming=true;playerEject=null;
  msg='Vehicle enfonsat! Has sortit a l’aigua.';msgT=3;
}
// La reentrada a un blindat ha de partir d'un estat de conducció finit.
 // No reiniciam vida, posició ni inèrcia bona: només els controls transitoris
 // i possibles NaN d'una simulació interrompuda quan el vehicle era buit.
function prepareArmoredVehicleEntry(v){
  if(!['tanc','tanqueta'].includes(v?.t))return true;
  if(!V.includes(v)||v.destroyed||v.sunk||!(v.life>0)||!v.o||
     ![v.x,v.z,v.hd].every(Number.isFinite))return false;
  for(const field of ['v','sideV','strafeV','yawRate','driveInput','steerInput',
                      'envCd','bump','ramCd'])
    if(!Number.isFinite(v[field]))v[field]=0;
  v.driveInput=0;v.steerInput=0;v.yawRate=0;v.strafeV=0;
  return true;
}
function recoverArmoredControlFailure(v,error,phase){
  if(!v||!['tanc','tanqueta'].includes(v.t))return false;
  console.error('[Hunter] Recuperació del blindat després d’un error en '+phase,{
    type:v.t,id:v.saveId,position:[v.x,v.z],velocity:v.v,error
  });
  const side=vehicleRadius(v.t)+2.5,hd=Number.isFinite(v.hd)?v.hd:0,
        x=v.x+Math.cos(hd)*side,z=v.z-Math.sin(hd)*side;
  if(Number.isFinite(x)&&Number.isFinite(z)){
    P.x=Math.max(-H+3,Math.min(H-3,x));
    P.z=Math.max(-H+3,Math.min(H-3,z));
    P.y=groundAt(P.x,P.z);
    P.hd=hd;
  }
  cv=null;playerEject=null;playerFall=null;K.KeyF=0;
  joystick.reset();releaseStrafeButtons();resetCameraState();
  msg='S’ha recuperat un error del blindat. Pots continuar a peu.';msgT=5;
  return true;
}
function executePlayerToggle(){if(playerFall||playerEject)return;resetCameraState();if(scopeActive)setSniperScope(false);if(cv){
const leaving=cv,speed=Math.abs(leaving.v),isAir=VT[leaving.t].m==='a',
      platform=leaving.t==='ferry'?leaving:leaving.carrier||ferryForVehicle(leaving),
      platformLocal=platform?ferryLocal(platform,leaving.x,leaving.z):null,
      ferry=platform&&(!isAir||Math.abs(leaving.alt-helicopterLandedAltitude(leaving,ferryLocalSurfaceY(platform,platformLocal.z)))<2)?platform:null,
      ground=Math.max(0,hAt(leaving.x,leaving.z)),height=Math.max(0,leaving.alt-ground);
if(isAir&&height>4&&!ferry){
  ejectFromHelicopter(leaving);
  leaving.crashing=true;leaving.crashT=0;leaving.crashSpin=rn(-1,1)<0?-1:1;leaving.driveInput=0;leaving.steerInput=0;leaving.strafeV=0;
  msg=playerFall.parachute?'Paracaigudes desplegat!':'Has saltat! L’helicòpter està fora de control!';msgT=3;return
}
const moving=speed>3&&!ferry,box=vehicleBox(leaving),
      safeMovingRoadExit=moving&&['camio','cotxe','cotxe_civil'].includes(leaving.t);let spot=null;
// Sempre dreta primer; l'esquerra només quan cap posició dreta és segura.
for(const side of[1,-1]){
  const backs=[0,-1.7,1.7,-3.4,3.4,-5.1,5.1,-6.8];
  for(let i=0;i<backs.length;i++){
    const front=backs[i],lateral=box.w/2+1.55;
    const localFerryExit=leaving.t==='ferry'?[-5,6,-10,10,-15,15,-20,20][i]:null,
      candidate=localFerryExit!==null?{...ferryWorld(ferry,side*8,localFerryExit),side}:
        safeMovingRoadExit?truckExitCandidate(leaving,side,i):
        {x:leaving.x+Math.cos(leaving.hd)*side*lateral-Math.sin(leaving.hd)*front,
         z:leaving.z-Math.sin(leaving.hd)*side*lateral-Math.cos(leaving.hd)*front,side},
      {x,z}=candidate;
    if(ferry){const q=ferryLocal(ferry,x,z);
      if(!ferryWalkable(q.x,q.z,1.15)||ferryCabinContains(q.x,q.z,1.15))continue;
    }
    if(Math.abs(x)>H-3||Math.abs(z)>H-3||treeHit(x,z,1)||
      (leaving!==ferry&&circleVehicleOverlap(x,z,1.1,leaving))||
      vehicleCandidatesAt(x,z,40).some(u=>u!==leaving&&u!==ferry&&!u.destroyed&&circleVehicleOverlap(x,z,1.1,u))||
      wallCandidates(x,z,1).some(w=>!w.open&&x>w.x0-1&&x<w.x1+1&&z>w.z0-1&&z<w.z1+1))continue;
    // No travessam parets ni filferrada entre la porta i el punt d'eixida.
    const doorDistance=box.w/2+.15,
      doorX=leaving.x+Math.cos(leaving.hd)*side*doorDistance-Math.sin(leaving.hd)*front,
      doorZ=leaving.z-Math.sin(leaving.hd)*side*doorDistance-Math.cos(leaving.hd)*front,
      dx=x-doorX,dz=z-doorZ;
    if(wallCandidates((x+doorX)/2,(z+doorZ)/2,Math.hypot(dx,dz)/2+2).some(w=>
      !w.open&&segmentAabbT(doorX,P.y+1,doorZ,x,groundAt(x,z)+1,z,
        w.x0-.6,w.x1+.6,w.y0,w.y1,w.z0-.6,w.z1+.6)!==null))continue;
    if(safeMovingRoadExit&&hAt(x,z)<=0&&hAt(leaving.x,leaving.z)>0)continue;
    if(hAt(x,z)<=0&&VT[leaving.t].m!=='w'&&!ferry)continue;
    spot=candidate;break;
  }
  if(spot)break;
}
if(!spot){msg='No hi ha espai per baixar aquí.';msgT=3;return}
P.x=spot.x;P.z=spot.z;P.hd=leaving.hd;
if(ferry){const q=ferryLocal(ferry,spot.x,spot.z);P.y=ferryLocalSurfaceY(ferry,q.z)+.12;swimming=false}
leaving.driveInput=0;leaving.steerInput=0;leaving.strafeV=0;leaving.reentryLockUntil=elapsed+2;
if(moving){const fx=-Math.sin(leaving.hd),fz=-Math.cos(leaving.hd),sx=Math.cos(leaving.hd)*spot.side,sz=-Math.sin(leaving.hd)*spot.side,
  carry=Math.sign(leaving.v)*Math.min(safeMovingRoadExit?11:28,speed*(safeMovingRoadExit?.3:.72)),outward=safeMovingRoadExit?8:1.4;
  playerEject={kind:'flip',vx:fx*carry+sx*outward,vz:fz*carry+sz*outward,t:.5,dur:.5,height:.68};msg='Has saltat del vehicle en marxa!';msgT=2.5}
cv=null}else{const v=nearV();if(v&&(!v.sunk||v.t==='bici')){
  if(!prepareArmoredVehicleEntry(v)){
    console.warn('[Hunter] Reentrada rebutjada: estat invàlid del blindat',v.t,v.saveId);
    msg='El blindat no està disponible en aquest moment.';msgT=3;return;
  }
  cv=v;swimming=false;playerCrouched=false;P.hd=v.hd;
  if(v.t==='tanc'||v.t==='tanqueta'){
    joystick.reset();releaseStrafeButtons();resetCameraState();
  }
  msg=VT[v.t].n+' · accelera amb joystick / W';msgT=3;
}}}
addEventListener('keydown',e=>{
  if(['Escape','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)||armoredVehicle()&&e.code.startsWith('Shift'))e.preventDefault();
  if(e.repeat)return;
  if(e.code==='KeyF'&&started&&!paused&&!over&&grenadeEquipped&&!cv){
    beginGrenadeCharge();K.KeyF=0;return;
  }
  if(e.code==='KeyF'&&nativeCoopSession&&scopeActive&&sniperEquipped&&started&&!paused&&!over){
    nativeCoopCommand('fire');nativeCoopSession.fireHeld=true;
  }
  act(e.code);if(started&&!paused&&!over)K[e.code]=1;
});
addEventListener('keyup',e=>{if(e.code==='KeyF')releaseGrenadeCharge();K[e.code]=0});
for(const b of document.querySelectorAll('[data-k]')){
  const c=b.dataset.k;
  b.addEventListener('pointerdown',e=>{
    e.preventDefault();b.setPointerCapture(e.pointerId);
    if(c==='KeyF'&&started&&!paused&&!over&&grenadeEquipped&&!cv){
      beginGrenadeCharge();K.KeyF=0;b.classList.add('held');return;
    }
    if(c==='KeyF'&&nativeCoopSession&&scopeActive&&sniperEquipped&&started&&!paused&&!over){
      // La mira en zoom consumeix l'event del botó directament: un clic,
      // un tret, també si el pointerup arriba abans del següent fotograma.
      nativeCoopCommand('fire');nativeCoopSession.fireHeld=true;
    }
    act(c);
    if(started&&!paused&&!over){K[c]=1;b.classList.add('held')}
  });
  b.addEventListener('pointerup',()=>{
    if(c==='KeyF')releaseGrenadeCharge();
    K[c]=0;b.classList.remove('held');
  });
  for(const v of ['pointercancel','lostpointercapture'])
    b.addEventListener(v,()=>{if(c==='KeyF')cancelGrenadeCharge();K[c]=0;b.classList.remove('held')});
}
document.getElementById('mainActionButton')?.addEventListener('keydown',e=>{
  if(!['Enter','Space'].includes(e.code))return;e.preventDefault();e.stopPropagation();if(!e.repeat)act('KeyE');
});
// The utility-helicopter C4 action is also accessible by tabbing to its
// touch control and pressing Enter/Space. It shares the same G handler.
document.getElementById('heliBombButton')?.addEventListener('keydown',e=>{
  if(e.code!=='Enter'&&e.code!=='Space')return;
  e.preventDefault();e.stopPropagation();
  act('KeyG');
});
addEventListener('blur',()=>{simulationFocused=false;updateOptionalSystems(0,false);audioPause();resetSimulationClock();clearKeys();if(started&&!paused&&!over)panel('pause')});
addEventListener('focus',()=>{simulationFocused=true;resetSimulationClock();if(started&&!paused)audioResume()});
document.addEventListener('visibilitychange',()=>{resetSimulationClock();if(document.hidden){updateOptionalSystems(0,false);audioPause();if(started&&!over)panel('pause')}else if(started&&!paused)audioResume()});
ren.domElement.addEventListener('wheel',e=>{e.preventDefault();if(e.shiftKey){cycleWeapon(e.deltaY>0?1:-1);return}zoom=Math.max(.7,Math.min(1.9,zoom+e.deltaY*.001))},{passive:false});
ren.domElement.addEventListener('pointerdown',e=>{
  syncCameraVehicle();
  if(!started||paused||over||drag||e.button!=null&&e.button!==0)return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,vehicle:cv,scope:scopeActive};
  try{ren.domElement.setPointerCapture(e.pointerId)}catch{cancelCameraDrag()}
});
ren.domElement.addEventListener('pointermove',e=>{
  syncCameraVehicle();
  if(!drag||drag.id!==e.pointerId)return;
  if(!started||paused||over||drag.vehicle!==cv||drag.scope!==scopeActive){resetCameraState();return}
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(scopeActive){
    scopePitch=Math.max(-.65,Math.min(.65,scopePitch-dy*.00115));
    scopeYaw-=dx*.00115;
  }else if(cv)vehicleLook.turn(dx);
  else P.hd-=dx*.006;
  drag.x=e.clientX;drag.y=e.clientY;
});
const releaseCameraPointer=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  cancelCameraDrag();vehicleLook.release();
};
for(const name of ['pointerup','pointercancel','lostpointercapture'])
  ren.domElement.addEventListener(name,releaseCameraPointer);
function setSniperScope(enabled){
  resetCameraState();
  const wasActive=scopeActive;
  scopeActive=!!enabled&&sniperEquipped&&!!inv.franctirador&&!cv&&!swimming&&!over;
  if(scopeActive)playerCrouched=false;
  if(scopeActive&&!wasActive){scopeYaw=P.hd;scopePitch=0;joystick.reset();releaseStrafeButtons()}
  if(!scopeActive){
    scopePitch=0;scopeYaw=P.hd;
    if(wasActive){joystick.reset();releaseStrafeButtons()}
    if(cam.fov!==58){cam.fov=58;cam.updateProjectionMatrix()}
  }
  if(!scopeActive&&pl.userData.sniper)pl.userData.sniper.rotation.set(0,0,0,'YXZ');
  if(wasActive!==scopeActive){worldVisualTick=0;palmVisualTick=0}
  document.body.classList.toggle('sniper-scoped',scopeActive);
  const button=document.getElementById('sniperAimButton');
  if(button)button.setAttribute('aria-pressed',String(scopeActive));
}
function toggleSniperScope(){if(!paused)setSniperScope(!scopeActive)}
const cheats={items:false,invisible:false,immune:false,fly:false};
let cheatFlightY=null;
function grantAllWeapons(){
  ammo=Math.max(ammo,999);
  for(const key of ['med','granada','cisalla','expl','paracaigudes','disf'])inv[key]=Math.max(inv[key]||0,999);
  for(const key of ['bazooka','franctirador','fusell_assalt'])inv[key]=1;
  sniperAmmo=Math.max(sniperAmmo,999);bazookaAmmo=Math.max(bazookaAmmo,999);
  hqMapKnown=true;hqIntelStage=MAP_SCALE===2?4:3;
  for(const v of V)if(v.rockets!=null)v.rockets=Math.max(v.rockets,999);
}
function setCheat(key,enabled){
  if(!Object.hasOwn(cheats,key))return;
  if(nativeCoopSession){
    if(nativeCoopSession.room?.host!==nativeCoopSession.self)return false;
    return nativeCoopSession.channel?.cheat?.(key,!!enabled)??false;
  }
  cheats[key]=!!enabled;
  if(key==='items'&&enabled){grantAllWeapons();revealMapPickup('mapa_heli',true);revealMapPickup('mapa_tanc',true)}
  if(key==='fly'){cheatFlightY=enabled?P.y:null;if(enabled){cv=null;playerFall=null;playerEject=null;swimming=false}}
  if(key==='invisible'&&enabled)for(const u of E){u.canSee=false;u.canShoot=false;u.alert=0;u.recognition=0;u.pursuitT=0;if(u.t==='soldat'){u.aiMode='patrol';u.searchT=0}}
}
function resume(){if(generationPromise||operationBusy)return;paused=false;simulationFocused=true;clearKeys();ui.hide();audioResume();resetSimulationClock()}
function panel(mode){if(generationPromise)return;setSniperScope(false);paused=true;updateOptionalSystems(0,false);resetSimulationClock();pickerOpen=false;picker.style.display='none';pickerToggle.style.display='none';clearKeys();audioPause();ui.show(mode)}

async function abandonMission(){
  if(generationPromise)return;
  // No descartam el món mentre un desament ja iniciat encara escriu.
  // No es crea cap desament nou: abandonar no equival a desar.
  if(operationWritePromise)await waitOperationWrite();
  if(operationBusy)return;
  paused=true;clearKeys();audioPause();setSniperScope(false);
  if(nativeCoopSession)stopNativeCoop();
  started=0;over=false;simulationFocused=false;
  ui.hide();discardGeneratedWorld();resetCameraState();
  document.body.classList.remove('game-started','game-generating','sniper-scoped','player-swimming');
  iniEl.style.display='flex';startMenuEl.style.display='flex';
  seedSearchScreenEl.style.display='none';
  seedSearchScreenEl.setAttribute('aria-hidden','true');
  document.getElementById('startLoading').style.display='none';
  pickerOpen=false;picker.style.display='none';pickerToggle.style.display='none';
  resetSimulationClock();
}

// Les cartes revelen informació de forma immediata: no són objectes
// d'inventari que s'hagin d'equipar ni obrir manualment.
function revealMapPickup(kind,allSectors=false,pickupSector=null){
  // Preserve the old autosave ordering, including unknown/duplicate maps.
  requestOperationAutosave('intel');
  const state={mapScale:MAP_SCALE,player:P,vehicles:V,enemies:E,
    hqIntelStage,hqIntelSectors,hqIntelDiscarded,hqIntelEliminationOrder,
    hqMapKnown,knownVehicleSectors,intelMarks,mapSector,sectorMatches};
  const message=window.HUNTER_GAME_INTEL.resolveMapPickup(state,kind,allSectors,pickupSector);
  hqIntelStage=state.hqIntelStage;hqMapKnown=state.hqMapKnown;intelMarks=state.intelMarks;
  return message;
}
function executePlayerUseItem(id){
  if(!inv[id])return false;
  if(id==='med'){if(hp>=COMBAT_BALANCE.player){msg='Ja tens la vida al màxim.';msgT=2;return false}inv.med--;if(inv.med<=0)delete inv.med;hp=Math.min(COMBAT_BALANCE.player,Math.ceil(hp)+COMBAT_BALANCE.medkit);msg='Has usat una farmaciola.';msgT=2;snd('pick');return true}
  if(id==='expl'){
    if(cv&&cv.t!=='heli'||swimming||playerFall||playerEject){
      msg=cv?.t==='heli_combat'?
        'No pots utilitzar C4 des de l’helicòpter de combat.':
        'No pots preparar explosius des d’aquí.';
      msgT=2;return false
    }
    panel('bombtimer');return true
  }
  if(id==='cisalla'){
    if(cv||swimming||playerFall||playerEject){msg='La cisalla només es pot equipar a peu.';msgT=2;return false}
    cancelGrenadeCharge();cisallaEquipped=!cisallaEquipped;
    if(cisallaEquipped){knifeEquipped=false;bazookaEquipped=false;grenadeEquipped=false;sniperEquipped=false;assaultRifleEquipped=false;setSniperScope(false)}
    resume();msg=cisallaEquipped?'Cisalla equipada · Acosta’t a una tanca i prem Talla / F.':'Cisalla desada.';msgT=2;return true
  }
  if(id==='bazooka'){if(cv||swimming){msg='Has d’anar a peu per equipar el bazooka.';msgT=2;return false}cancelGrenadeCharge();bazookaEquipped=!bazookaEquipped;if(bazookaEquipped){knifeEquipped=false;grenadeEquipped=false;cisallaEquipped=false;sniperEquipped=false;assaultRifleEquipped=false;setSniperScope(false)}resume();msg=bazookaEquipped?'Bazooka equipat: '+bazookaAmmo+' coets disponibles.':'Bazooka desequipat.';msgT=2;return true}
  if(id==='granada'){if(cv||swimming){msg='Has d’anar a peu per equipar les granades.';msgT=2;return false}cancelGrenadeCharge();grenadeEquipped=!grenadeEquipped;if(grenadeEquipped){knifeEquipped=false;bazookaEquipped=false;cisallaEquipped=false;sniperEquipped=false;assaultRifleEquipped=false;setSniperScope(false)}resume();msg=grenadeEquipped?'Granades equipades: '+inv.granada+'.':'Granades desequipades.';msgT=2;return true}
  if(id==='fusell_assalt'){
    if(cv||swimming||playerFall||playerEject){msg='El fusell d’assalt només es pot equipar a peu.';msgT=2;return false}
    cancelGrenadeCharge();setSniperScope(false);
    assaultRifleEquipped=!assaultRifleEquipped;
    if(assaultRifleEquipped){knifeEquipped=false;sniperEquipped=false;bazookaEquipped=false;grenadeEquipped=false;cisallaEquipped=false}
    resume();msg=assaultRifleEquipped?'Fusell d’assalt equipat · '+ammo+' cartutxos compartits.':'Fusell d’assalt desat.';msgT=2;return true;
  }
  if(id==='franctirador'){
    cancelGrenadeCharge();
    if(cv||swimming){msg='Has d’anar a peu per equipar el rifle.';msgT=2;return false}
    sniperEquipped=!sniperEquipped;
    if(sniperEquipped){knifeEquipped=false;bazookaEquipped=false;grenadeEquipped=false;cisallaEquipped=false;assaultRifleEquipped=false}
    setSniperScope(false);resume();
    msg=sniperEquipped?'Rifle equipat · '+sniperAmmo+' cartutxos · Mira amb T.':'Rifle desequipat.';msgT=2;return true
  }
  if(id==='disf'){setDis(!disg);msg=disg?'Disfressa activada.':'Disfressa desactivada.';msgT=2;return true}
  if(id==='mapa'||id==='mapa_heli'||id==='mapa_tanc'){
    // Compatibilitat amb una carta que encara pugui existir en un inventari antic.
    msg=revealMapPickup(id);msgT=3;delete inv[id];mini();return true;
  }
  return false
}
function dropInvItem(id){
  if(!inv[id]||id==='arma')return false;inv[id]--;if(inv[id]<=0)delete inv[id];if(id==='disf'&&disg)setDis(false);if(id==='bazooka'&&bazookaEquipped&&!inv.bazooka)bazookaEquipped=false;if(id==='cisalla'&&cisallaEquipped&&!inv.cisalla){cisallaEquipped=false;pl.userData.cisallaCut=0}if(id==='granada'&&grenadeEquipped&&!inv.granada){grenadeEquipped=false;cancelGrenadeCharge()}if(id==='franctirador'&&!inv.franctirador){sniperEquipped=false;setSniperScope(false)}if(id==='fusell_assalt'&&!inv.fusell_assalt)assaultRifleEquipped=false
  msg='Has deixat: '+IT[id].n;msgT=2;return true
}
combatFeedback=window.HUNTER_UI.createCombatFeedback({
  element:document.getElementById('combatFeedback'),
  hit:document.getElementById('hitConfirm'),
  direction:document.getElementById('damageDirection')
});
const combatCameraForward=new THREE.Vector3(),combatCameraRight=new THREE.Vector3();
function renderCombatFeedback(){
  cam.getWorldDirection(combatCameraForward);
  if(Math.hypot(combatCameraForward.x,combatCameraForward.z)<.001){
    combatCameraRight.set(1,0,0).applyQuaternion(cam.quaternion);
    combatCameraForward.set(combatCameraRight.z,0,-combatCameraRight.x);
  }
  combatFeedback.update({active:!!started&&!paused&&!over&&simulationFocused&&!document.hidden,
    now:performance.now(),playerX:P.x,playerZ:P.z,
    forwardX:combatCameraForward.x,forwardZ:combatCameraForward.z});
}
let stealthVisibilityFrame=0;
const stealthVehicleBounds=new WeakMap();
function stealthFeedbackVisible(u,body,marker){
  const from=cam.position;
  function clear(to){
    const reach=Math.hypot(to.x-from.x,to.z-from.z)/2+3,
      mx=(from.x+to.x)/2,mz=(from.z+to.z)/2;
    for(const w of wallCandidates(mx,mz,reach)){
      if(w.open||w.barbed||w.hp<=0)continue;
      const t=segmentAabbT(from.x,from.y,from.z,to.x,to.y,to.z,w.x0,w.x1,w.y0,w.y1,w.z0,w.z1);
      if(t!==null&&t>.002&&t<.998)return false;
    }
    for(const b of buildingCandidates(mx,mz,reach)){
      if(b.rb||b.rhp<=0)continue;
      if(b.upperFloor&&Number.isFinite(b.storey)&&Math.abs(to.y-from.y)>.001){
        const floor=b.fy+b.storey+.15,q=(floor-from.y)/(to.y-from.y);
        if(q>.002&&q<.998&&upperFloorHeight(b,from.x+(to.x-from.x)*q,
          from.z+(to.z-from.z)*q,floor)!==null)return false;
      }
      const t=b.hangar?hangarRoofSegmentT(from.x,from.y,from.z,to.x,to.y,to.z,b):
        segmentAabbT(from.x,from.y,from.z,to.x,to.y,to.z,b.x-b.w/2,b.x+b.w/2,
          b.fy+b.h-.35,b.fy+b.h+.8,b.z-b.d/2,b.z+b.d/2);
      if(t!==null&&t>.002&&t<.998)return false;
    }
    for(const v of vehicleCandidatesAt(mx,mz,reach+18)){
      if(v.destroyed||!v.o)continue;
      let cached=stealthVehicleBounds.get(v);
      if(!cached){cached={frame:-1,box:new THREE.Box3()};stealthVehicleBounds.set(v,cached)}
      if(cached.frame!==stealthVisibilityFrame){
        // Els vehicles aparcats no necessiten recalcular les caixes de totes
        // les seves peces (rodes, cabina, carrosseria) a cada fotograma.
        // Les peces animades i els vehicles en moviment sí que es revisen.
        const moving=Math.abs(v.v||0)>.01||!!v.enemyCrew?.some(Boolean)||!!v.crashing||
          (v.t==='heli'||v.t==='heli_combat')&&v===cv;
        if(!cached.valid||moving||cached.object!==v.o||
           cached.x!==v.o.position.x||cached.y!==v.o.position.y||
           cached.z!==v.o.position.z||cached.hd!==v.o.rotation.y||
           cached.rx!==v.o.rotation.x||cached.rz!==v.o.rotation.z){
          v.o.updateWorldMatrix(true,true);cached.box.setFromObject(v.o);
          cached.object=v.o;cached.valid=true;
          cached.x=v.o.position.x;cached.y=v.o.position.y;cached.z=v.o.position.z;
          cached.hd=v.o.rotation.y;cached.rx=v.o.rotation.x;cached.rz=v.o.rotation.z;
        }
        cached.frame=stealthVisibilityFrame;
      }
      const box=cached.box;
      if(box.isEmpty()){
        const radius=vehicleRadius(v.t)*.55;
        if(segmentSphereT(from.x,from.y,from.z,to.x,to.y,to.z,v.x,vehicleY(v)+1.5,v.z,radius)!==null)return false;
      }else{
        const t=segmentAabbT(from.x,from.y,from.z,to.x,to.y,to.z,
          box.min.x,box.max.x,box.min.y,box.max.y,box.min.z,box.max.z);
        if(t!==null&&t>.002&&t<.998)return false;
      }
    }
    const count=Math.min(96,Math.max(2,Math.ceil(from.distanceTo(to))));
    for(let i=1;i<count;i++){
      const q=i/count,x=from.x+(to.x-from.x)*q,y=from.y+(to.y-from.y)*q,z=from.z+(to.z-from.z)*q;
      if(bunkerProjectileSurface(x,z,y)>y-.12)return false;
    }
    return true;
  }
  return clear(body)&&clear(marker);
}
function renderStealthFeedback(){
  const stamp=performanceStatsVisible?performance.now():0;
  stealthVisibilityFrame++;
  stealthFeedback.update({world,camera:cam,enemies:E,active:!!started&&!paused&&!over&&simulationFocused&&!document.hidden,
    visible:stealthFeedbackVisible});
  if(performanceStatsVisible)perfHotspots.stealthMs+=performance.now()-stamp;
}
const ui=window.HUNTER_UI.create({
  hud:document.getElementById('hud'),
  panel:document.getElementById('gamepanel'),
  title:document.getElementById('panelTitle'),
  body:document.getElementById('panelBody'),
  resumeButton:document.getElementById('resumeButton'),
  minimap,
  getState:({nearVehicle=cv?null:nearV()}={})=>({
    coop:nativeCoopSession?.state?{health:nativeCoopSession.state.players.find(p=>p.id!==nativeCoopSession.self)?.hp,status:nativeCoopSession.state.status,host:nativeCoopSession.room?.host===nativeCoopSession.self}:null,autosave:operationAutosave?.state(),started:!!started,hp,ammo,kills,vehicle:cv,vehicleTypes:VT,inside:ib,swimming,crouching:playerCrouched,disguised:disg,bazookaEquipped,grenadeEquipped,cisallaEquipped,sniperEquipped,sniperAmmo,bazookaAmmo,scopeActive,
    inventory:inv,itemTypes:IT,player:P,nearVehicle,optionalAction:!cv&&nearestPlayerDoor()?{kind:'door',label:playerDoorLabel(nearestPlayerDoor()),icon:window.HUNTER_ACTION_ICONS.door}:getOptionalAction(),messageTime:msgT,message:msg,
    waypoint,worldSize:S,seed,mapScale:MAP_SCALE,hqIntel:window.HUNTER_GAME_INTEL.hqIntelStatus({mapScale:MAP_SCALE,stage:hqIntelStage,confirmed:hqMapKnown,sites:hqIntelSites,sectors:hqIntelSectors,discarded:hqIntelDiscarded}),palmsDisabled,waterDisabled,shadowsDisabled,performanceStatsVisible,muted,cheats:nativeCoopSession?.state?.cheats||{...cheats},stealthDebug:window.HUNTER_STEALTH.enabled(),stealthLayers:window.HUNTER_STEALTH.layers(),shadowStats,performance:adaptivePerformance.stats,visibilityStats,enemyLodStats
  }),
  actions:{
    resume:()=>{if(!started){ui.hide();return}if(!operationBusy)resume()},
    renderSaves:renderOperations,
    renderAccount,
    renderCoop,
    renderHistory:renderOperationHistory,
    setAutosave:setOperationAutosave,
    open:mode=>panel(mode),
    setWaypoint:v=>waypoint=v,
    useItem:id=>useInvItem(id),
    placeExplosive:seconds=>{
      if(!plant(seconds))return false;
      resume();return true
    },
    dropItem:id=>dropInvItem(id),
    restart:d=>startGameProgressively({difficulty:d,scale:MAP_SCALE,seed:requestedSeed,restart:true}),
    abandonMission,
    setPalmsDisabled,
    setWaterDisabled,
    setShadowsDisabled,
    setPerformanceStatsVisible,
    getPerformanceDiagnostic:()=>({
      version:window.HUNTER_VERSION||null,quality:qualityName,
      viewport:{width:window.innerWidth,height:window.innerHeight,
        devicePixelRatio:window.devicePixelRatio||1},
      rendererMemory:{...(ren.info?.memory||{})},
      worldGeneration:window.HUNTER_BUILD_STATS||null,
      roadStats:world?.userData?.pathStats||null,
      staticBatchStats:window.HUNTER_STATIC_BATCH_STATS||null,
      recent:adaptivePerformance.recentSummary()
    }),
    setAudioMuted,
    setStealthDebug,
    setStealthLayer,
    zoom:d=>zoom=Math.max(.7,Math.min(1.9,zoom+d)),
    setCheat
  }
});
// The minimap is a direct navigation-map control on mouse, touch and keyboard.
// Stop event bubbling so the gesture never becomes a camera/game action.
mc.addEventListener('click',e=>{
  e.preventDefault();e.stopPropagation();
  if(started&&!over&&!generationPromise)panel('map');
});
mc.addEventListener('keydown',e=>{
  if((e.code!=='Enter'&&e.code!=='Space')||e.repeat)return;
  e.preventDefault();e.stopPropagation();
  mc.click();
});
function vehicleImpactFx(x,y,z){debris(x,y,z,0xffc14d,5,.16,5);puff(x,y,z,0x8a8478,.8)}
function collisionDamageVehicle(v,dmg,impacts=1){
 if(v?.t==='tanc')return;
 impactVehicle(v,impacts>1?impacts:dmg);
}
function relativeVehicleImpactSpeed(...args){return window.HUNTER_SHARED_COMBAT.relativeVehicleImpactSpeed(...args)}
function ramSpeedFactor(...args){return window.HUNTER_SHARED_COMBAT.ramSpeedFactor(...args)}
function vehicleRamThreshold(...args){return window.HUNTER_SHARED_COMBAT.vehicleRamThreshold(...args)}
function vehicleCanBreakBarrier(...args){return window.HUNTER_SHARED_COMBAT.vehicleCanBreakBarrier(...args)}
function mayRamWhileRecovering(...args){return window.HUNTER_SHARED_COMBAT.mayRamWhileRecovering(...args)}
function tankCanCrush(...args){return window.HUNTER_SHARED_COMBAT.tankCanCrush(...args)}
function killShark(f){
  if(f.dead)return;
  window.HUNTER_SHARKS.kill(f);
  const y=wy(f.x,f.z,elapsed)+.1;
  puff(f.x,y,f.z,0xffffff,2.8);
  puff(f.x,y,f.z,0x92bac1,1.7);
  if(victoryCinematic?.active)return;
  msg='Has envestit un tauró!';msgT=1.8;
}
function handleVehicleImpacts(v,dt,oldX=v.x,oldZ=v.z){
  const c=VT[v.t],speed=Math.abs(v.v),radius=vehicleRadius(v.t);
  v.impactFromX=oldX;v.impactFromZ=oldZ;
  v.ramCd=Math.max(0,(v.ramCd||0)-dt);v.envCd=Math.max(0,(v.envCd||0)-dt);v.bump=Math.max(0,(v.bump||0)-dt);
  // Els cascs i taules poden atropellar taurons. La trajectòria
  // completa detecta col·lisions fins i tot entre dos fotogrames.
  if(speed>=3&&(c.m==='w'||c.m==='wl')&&hAt(v.x,v.z)<-.8){
    for(const f of fa){
      if(f.k!=='s'||f.dead)continue;
      if(Math.abs((v.o?.position?.y??0)-wy(f.x,f.z,elapsed))>2.5)continue;
      if(window.HUNTER_SHARKS.vehicleHit(f,oldX,oldZ,v.x,v.z,radius))
        killShark(f);
    }
  }
  // Les pedres petites es poden superar sense bloquejar la trajectòria.
  // Evitam mal repetit dins la mateixa pedra fins a abandonar-ne el radi.
  if(v.lastSmallRock&&Math.hypot(v.x-v.lastSmallRock.x,
     v.z-v.lastSmallRock.z)>v.lastSmallRock.r+radius*.48+1)
     v.lastSmallRock=null;
  // Les roques grosses segueixen essent obstacles sòlids; els helicòpters
  // només les toquen si volen prou baixos.
  if(speed>=.4&&v.envCd<=0){
    const {baseY,topY}=window.HUNTER_VEHICLE_ENVIRONMENT.rockVerticalBand(c.m,hAt(v.x,v.z),v.alt??0,VS[v.t]||1),
      rock=nearbyRock(v.x,v.z,radius*.48,baseY,topY);
    if(rock){
      if(rock.s<=1.7&&rock.r<=2.5){
        if(v.lastSmallRock!==rock){
          v.lastSmallRock=rock;
          // Les erugues passen damunt les pedres sense perdre PV.
          if(v.t!=='tanc'&&v.t!=='tanqueta')
            collisionDamageVehicle(v,1,1);
          vehicleImpactFx(rock.x,Math.max(0,hAt(rock.x,rock.z))+.45,rock.z);
          if(v.destroyed)return;
          v.v*=.97;v.bump=Math.max(v.bump,.08);v.envCd=.12;
        }
        return; // Cap correcció de posició: es passa per sobre.
      }
      // Conservar el llindar de col·lisió original de les roques grosses.
      if(speed<2.5)return;
      // Les roques grosses continuen col·lidint. Un impacte ràpid
      // hi provoca dany i redueix la velocitat.
      if(speed>10){
        collisionDamageVehicle(v,window.HUNTER_VEHICLE_ENVIRONMENT.rockImpact(speed,c.mass||1).damage,1);
        vehicleImpactFx(rock.x,Math.max(0,hAt(rock.x,rock.z))+.8,rock.z);
      }
      if(v.destroyed)return;
      const dx=v.x-rock.x,dz=v.z-rock.z,dist=Math.hypot(dx,dz),
        clear=rock.r+radius*.48+.08;
      if(dist>.01){v.x=rock.x+dx/dist*clear;v.z=rock.z+dz/dist*clear}
      else{v.x=oldX;v.z=oldZ}
      const response=window.HUNTER_VEHICLE_ENVIRONMENT.rockImpact(speed,c.mass||1);v.v*=response.speedFactor;v.bump=response.bump;v.envCd=response.cooldown;
      msg='Impacte amb roca!';msgT=1;return;
    }
  }
  if(speed<2.5||c.m==='a'||c.m==='w')return;
  // Els impactes lents no maten automàticament els soldats.
  if(v.ramCd<=0&&speed>6){
    for(const u of E){
      if(u.t!=='soldat')continue;
      // Un soldat ja embarcat és part de la tripulació, no un vianant.
      // Això també protegeix el copilot quan el seu vehicle comença a moure's.
      if(u.enemyVehicleClaim&&['waiting','riding'].includes(u.enemyVehicleClaim.phase))continue;
      if(runoverSweepHit(oldX,oldZ,v.x,v.z,u.x,u.z,radius*.68+u.r*.45)){
        const dmg=runoverDamage(speed,c.mass||1);
        hurtE(u,dmg);u.alert=12;v.ramCd=.35;v.v*=.86;
        msg='Atropellament!';msgT=1;break;
      }
    }
  }
  if(v.ramCd<=0&&speed>6){
    for(const civilian of prisonerSystem.entities){
      if(civilian.hp<=0||civilian.destroyed||Math.abs(vehicleY(v)-civilian.y)>3)continue;
      if(runoverSweepHit(oldX,oldZ,v.x,v.z,civilian.x,civilian.z,radius*.68+civilian.radius*.45)){
        const lost=prisonerSystem.hurt(civilian,runoverDamage(speed,c.mass||1),{type:'vehicle',x:v.x,z:v.z});
        if(lost)spawnBulletImpact('blood',civilian.x,civilian.y+1,civilian.z,{sx:oldX,sy:vehicleY(v)+1,sz:oldZ});
        v.ramCd=.35;v.v*=.86;msg='Atropellament d’un civil!';msgT=2;break;
      }
    }
  }
  if(v.envCd>0)return;
  const t=treeAt(v.x,v.z,radius*.48);if(!t)return;
  if(t.p&&t.alive){
    const response=window.HUNTER_VEHICLE_ENVIRONMENT.palmImpact(v.t,speed,c.mass||1);
    if(!response.destroy){
      // Una maniobra a poca velocitat topa amb la palmera, sense
      // fer-la caure ni perdre PV. Els pesants conserven la força.
      v.x=oldX;v.z=oldZ;v.v*=response.speedFactor;v.bump=response.bump;v.envCd=response.cooldown;return;
    }
    killPalm(t);
    if(response.damage)collisionDamageVehicle(v,response.damage,1);
    if(v.destroyed)return;
    v.v*=response.speedFactor;
    v.bump=response.bump;v.envCd=response.cooldown;
    msg='Has tombat una palmera.';msgT=1;return;
  }
  // Les roques ja s'han resolt abans, també per a les embarcacions.
}
// Hitboxes físics de les cobertes. Calculats a partir de la mateixa
// geometria dels sostres, sense afegir malles al renderitzador.
function solidRoofAt(b,x,z){return window.HUNTER_WALK_SURFACES.solidRoofAt(b,x,z)}
function roofNearXZ(b,x,z,r=0){
  if(!b||b.rhp<=0||b.rb)return null;
  const hw=b.hangar?b.w/2+.1:(b.w+1.35)*(b.roof?.scale?.x||1)/2,
        hd=b.hangar?(b.d+1.15)/2:(b.d+1.35)*(b.roof?.scale?.z||1)/2,
        xx=Math.max(b.x-hw,Math.min(b.x+hw,x)),
        zz=Math.max(b.z-hd,Math.min(b.z+hd,z));
  if((x-xx)**2+(z-zz)**2>r*r)return null;
  const safeX=b.hangar?Math.max(b.x-hw+.23,Math.min(b.x+hw-.23,xx)):xx;
  return solidRoofAt(b,safeX,zz);
}
function helicopterRoofCollision(v,x,z,alt){
  const scale=VS[v.t]||1,visualScale=v.t==='heli_combat'?1.5:1.1,
        skid=v.o.userData.skidContactHeight||0,
        rotor=v.o.userData.rotorContactHeight||((v.t==='heli_combat'?3.3:3.9)*scale),
        bodyTop=alt+(v.t==='heli_combat'?3.0:3.45)*scale*visualScale,
        bodyBottom=alt+skid,rotorY=alt+rotor,
        bodyRadius=(v.t==='heli_combat'?1.45:1.65)*scale*visualScale,
        rotorRadius=(v.t==='heli_combat'?6.75:7.4)*scale*visualScale;
  for(const b of buildingCandidates(x,z,rotorRadius+2)){
    const hull=roofNearXZ(b,x,z,bodyRadius);
    if(hull&&bodyBottom<hull.top+.08&&bodyTop>hull.bottom-.08)return hull;
    const blades=roofNearXZ(b,x,z,rotorRadius);
    if(blades&&rotorY>=blades.bottom-.11&&rotorY<=blades.top+.11)return blades;
  }
  return null;
}
function helicopterRoofAltitude(v,x,z,fromAlt,toAlt){
  const skid=v.o.userData.skidContactHeight||0,
        rotor=v.o.userData.rotorContactHeight||((v.t==='heli_combat'?3.3:3.9)*(VS[v.t]||1)),
        radius=(v.t==='heli_combat'?1.45:1.65)*(VS[v.t]||1)*(v.t==='heli_combat'?1.5:1.1);
  for(const b of buildingCandidates(x,z,radius+2)){
    const roof=roofNearXZ(b,x,z,radius);
    if(!roof)continue;
    // Descens des de sobre: patins sobre la coberta.
    if(toAlt<fromAlt&&fromAlt+skid>=roof.top-.12&&toAlt+skid<roof.top+.12)
      toAlt=Math.max(toAlt,roof.top-skid+.1);
    // Ascens des de l'interior: el rotor no travessa la volta.
    else if(toAlt>fromAlt&&fromAlt+rotor<=roof.bottom+.12&&toAlt+rotor>roof.bottom-.12)
      toAlt=Math.min(toAlt,roof.bottom-rotor-.12);
  }
  return toAlt;
}
// Volum escombrat de l'helicòpter: fuselatge, patins i disc complet
// de les aspes. La Y evita que una palmera bloquegi un aparell molt alt.
function helicopterEnvironmentContact(v,from,to){
  const scale=VS[v.t]||1,visualScale=v.t==='heli_combat'?1.5:1.1,
    skid=v.o.userData.skidContactHeight||0,
    rotor=v.o.userData.rotorContactHeight||3.9*scale,
    rotorRadius=(v.t==='heli_combat'?6.75:7.4)*scale*visualScale,
    bodyRadius=(v.t==='heli_combat'?1.45:1.65)*scale*visualScale,
    bodyTop=(v.t==='heli_combat'?3:3.45)*scale*visualScale,
    steps=Math.min(12,Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/2.5+Math.abs(to.alt-from.alt)/2.5)));
  for(let i=1;i<=steps;i++){
    const q=i/steps,x=from.x+(to.x-from.x)*q,z=from.z+(to.z-from.z)*q,
      alt=from.alt+(to.alt-from.alt)*q,bladeY=alt+rotor,
      floor=Math.max(0,groundAt(x,z)),bottom=alt+skid;
    if(bottom<floor-.18&&(Math.hypot(v.v||0,v.strafeV||0)>4||v.verticalV< -4))
      return{x,z,alt,y:floor,kind:'ground'};
    // Les puntes del rotor poden tocar un vessant encara que el centre voli alt.
    for(const r of [rotorRadius*.6,rotorRadius])for(let a=0;a<12;a++){
      const angle=a*Math.PI/6,px=x+Math.cos(angle)*r,pz=z+Math.sin(angle)*r,
        terrain=Math.max(0,groundAt(px,pz));
      if(bladeY<=terrain+.16)return{x,z,alt,y:terrain,kind:'ground'};
    }
    for(const b of buildingCandidates(x,z,rotorRadius+2)){
      const bladeRoof=roofNearXZ(b,x,z,rotorRadius);
      if(bladeRoof&&bladeY>=bladeRoof.bottom-.16&&bladeY<=bladeRoof.top+.16)
        return{x,z,alt,y:bladeY,kind:'roof'};
      const hull=roofNearXZ(b,x,z,bodyRadius);
      if(hull&&bottom<hull.top+.06&&alt+bodyTop>hull.bottom-.06)
        return{x,z,alt,y:hull.top,kind:'roof'};
    }
    const cells=Math.ceil((rotorRadius+6)/16),cx=Math.floor(x/16),cz=Math.floor(z/16);
    for(let dx=-cells;dx<=cells;dx++)for(let dz=-cells;dz<=cells;dz++){
      const list=TG.get((cx+dx)+','+(cz+dz));if(!list)continue;
      for(const tree of list){
        if(!tree.p||!tree.alive||palmsDisabled)continue;
        const d=Math.hypot(tree.x-x,tree.z-z),height=tree.s*6.2,
          crownRadius=tree.s*4.7,base=tree.y;
        const bodyHit=d<bodyRadius+tree.r&&bottom<base+height&&alt+bodyTop>base;
        const bladeHit=d<rotorRadius+crownRadius&&bladeY>=base+height-tree.s*1.2&&bladeY<=base+height+tree.s*1.8 ||
          d<rotorRadius+tree.r&&bladeY>=base&&bladeY<=base+height;
        if(bodyHit||bladeHit)return{x,z,alt,y:bladeHit?bladeY:bottom,kind:'tree'};
      }
    }
  }
  return null;
}
// Les antenes i les parabòliques són obstacles físics de l'aire:
// el cos o el rotor poden xocar de front, lateralment o en ascens.
function crashHelicopterStructure(v,contact){
  const wasPiloted=cv===v;
  v.x=contact.x;v.z=contact.z;v.alt=contact.alt;
  place(v,elapsed,0,0);
  vehicleImpactFx(contact.x,contact.y,contact.z);
  damageVehicle(v,65,Math.max(1,v.life??VT[v.t].life));
  if(wasPiloted){
    msg={antenna:'Has xocat contra l’antena!',satellite:'Has xocat contra la parabòlica!',
      tree:'Les aspes han tocat una palmera!',ground:'Has xocat contra el terreny!',
      roof:'Has xocat contra un edifici!'}[contact.kind]||'Col·lisió de l’helicòpter!';
    msgT=3;
  }
  return false;
}
function stepV(v,f,tr,ud,dt,strafe=0){
const c=VT[v.t],a=c.m==='a',water=c.m==='w'||c.m==='wl',land=c.m==='l',radius=vehicleRadius(v.t),
  shore=window.HUNTER_VEHICLE_DYNAMICS.shore;
if(v.sunk&&v.t!=='bici'){v.v=0;v.sideV=0;v.strafeV=0;if(cv===v)escapeSubmergedVehicle(v);return !v.destroyed}
// El moll i la passarel·la del ferri són terra ferma per a les rodes:
// la profunditat es mesura des de la superfície que sosté el vehicle,
// no des del fons de la mar. A la mar oberta groundAt continua
// retornant el terreny físic i la inundació funciona igual que abans.
const onFerryDeck=land&&(v.carrier||ferryForVehicle(v,v.x,v.z,true)),
  depth=land&&!onFerryDeck?shore.depth(v.x,v.z,groundAt,(x,z)=>wy(x,z,elapsed)):-Infinity,
  flooded=land?shore.wetLand(v,depth,dt):null,
  input=window.HUNTER_VEHICLE_DYNAMICS.inputs(v,f,tr,dt);
f=input.forward;tr=input.turn;
if(land){
  if(flooded.disabled){f=0;v.driveInput=0;}
  else f*=flooded.engine;
  if(flooded.wet>.02){
    v.waterSplashCd=Math.max(0,(v.waterSplashCd||0)-dt);
    if(Math.abs(v.v)>1.5&&v.waterSplashCd<=0){
      puff(v.x,wy(v.x,v.z,elapsed),v.z,0xb4d7dc,.55+flooded.wet*.8);
      v.waterSplashCd=.25;
    }
  }
  if(v.sunk&&v.t!=='bici'){v.v=0;if(cv===v)escapeSubmergedVehicle(v);return !v.destroyed}
}
// Strafe sense girar: només hovercraft i els dos helicòpters.
// Conservar la deriva natural existent (sideV) i afegir-hi una velocitat
// lateral independent amb acceleració i frenada suaus.
const sideV=window.HUNTER_SHARED_VEHICLES.advanceVehicle(v,f,tr,dt,strafe,{drag:flooded?.drag||0});
if(a&&v.carrier&&ud>.12){detachFromFerry(v);v.verticalV=Math.max(v.verticalV||0,3)}

const oldX=v.x,oldZ=v.z,
      fx=-Math.sin(v.hd),fz=-Math.cos(v.hd),sx=Math.cos(v.hd),sz=-Math.sin(v.hd);
const totalSideV=sideV+v.strafeV;
let nx=v.x+(fx*v.v+sx*totalSideV)*dt,nz=v.z+(fz*v.v+sz*totalSideV)*dt;
if(c.m==='w'){
  const footprint=vehicleBox(v),current=shore.clearance(v,v.x,v.z,footprint,hAt,(x,z)=>wy(x,z,elapsed));
  let next=shore.clearance(v,nx,nz,footprint,hAt,(x,z)=>wy(x,z,elapsed)),
    contact=shore.boatContact(v,current,next,dt),incomingSpeed=Math.abs(v.v);
  if(contact.shallow>0){
    // Friction begins before the boat actually grounds, preserving momentum
    // and making slow approaches controllable rather than instant stops.
    v.v*=Math.exp(-contact.drag*dt);
    nx=v.x+(fx*v.v+sx*totalSideV)*dt;nz=v.z+(fz*v.v+sz*totalSideV)*dt;
    next=shore.clearance(v,nx,nz,footprint,hAt,(x,z)=>wy(x,z,elapsed));
    contact=shore.boatContact(v,current,next,dt);
  }
  if(contact.blocked){
    // Stop the bow where the hull first reaches the beach, not at its
    // previous frame position. Reverse travel toward deeper water is free.
    const dx=nx-v.x,dz=nz-v.z;let lo=0,hi=1;
    for(let i=0;i<9;i++){
      const m=(lo+hi)/2,clear=shore.clearance(v,v.x+dx*m,v.z+dz*m,
        footprint,hAt,(x,z)=>wy(x,z,elapsed));
      if(clear>=contact.limit)lo=m;else hi=m;
    }
    nx=v.x+dx*lo;nz=v.z+dz*lo;
    v.v*=-.055;
    if(incomingSpeed>12&&(v.shoreHitCd||0)<=0){
      collisionDamageVehicle(v,Math.min(4,Math.max(1,Math.ceil((incomingSpeed-12)/9))));
      vehicleImpactFx(nx,Math.max(0,hAt(nx,nz))+.5,nz);
      if(cv===v){msg='La quilla ha impactat contra la costa!';msgT=2}
      v.shoreHitCd=.8;
    }
  }
  v.shoreHitCd=Math.max(0,(v.shoreHitCd||0)-dt);
}
let raw=hAt(nx,nz),h=land?groundAt(nx,nz):raw,g=Math.max(0,h),
    deckCarrier=(land||a)?ferryForVehicle(v,nx,nz,true):null,ok=Math.abs(nx)<H-radius&&Math.abs(nz)<H-radius;
if(ok&&a&&!deckCarrier){
  const structureHit=window.HUNTER_AIR_OBSTACLES.hit(THREE,world,v,
    {x:v.x,z:v.z,alt:v.alt},{x:nx,z:nz,alt:v.alt},VS[v.t]||1);
  if(structureHit)return crashHelicopterStructure(v,structureHit);
  const environmentHit=helicopterEnvironmentContact(v,
    {x:v.x,z:v.z,alt:v.alt},{x:nx,z:nz,alt:v.alt});
  if(environmentHit)return crashHelicopterStructure(v,environmentHit);
}
if((!a||v.alt-g<16)&&!deckCarrier){const footprint=vehicleBox(v,nx,nz,v.hd);for(const w of wallCandidates(nx,nz,radius))if(!w.open&&w.playerBlock!==false&&
  !(a&&(v.alt+(v.o.userData.skidContactHeight||0)>w.y1+.15||
    v.alt+(v.o.userData.rotorContactHeight||7)<w.y0-.15))&&
  !(w.towerLegOwner&&a&&v.alt>w.y1+2)&&nx>w.x0-radius&&nx<w.x1+radius&&nz>w.z0-radius&&nz<w.z1+radius){
  const touch=w.barbed?fenceVehicleContact(w,footprint):null;
  if(w.barbed&&!touch)continue;
  // Els murs empren la caixa real del vehicle. Abans el radi ample
  // bloquejava el tanc quan encara no havia tocat la porta.
  if(!w.barbed&&!obbOverlap(footprint,{
    x:(w.x0+w.x1)/2,z:(w.z0+w.z1)/2,hd:0,
    w:Math.max(.05,w.x1-w.x0),d:Math.max(.05,w.z1-w.z0)
  }))continue;
  // Les parets del pis superior no bloquegen vehicles a nivell de terra.
  if(land&&(w.y1<g-.8||w.y0>g+
    (v.t==='tanc'||v.t==='camio'?5.6:4.2)*(VS[v.t]||1)))continue;
  // El pou enderrocat deixa una pila baixa de pedres. El tanc passa
  // sobre les runes; per als altres vehicles continua havent-hi obstacle.
  if(w.civicRubble&&v.t==='tanc')continue;
  // La destrucció de mobiliari segueix dmgW/collapseCivicProp, de manera
  // que cauen tots els segments del pou, apareixen les runes i els FX.
  if(land&&w.civicFurniture){
    const ram=window.HUNTER_SHARED_COMBAT.tankCivicRam(v,w,v.envCd);
    if(ram){
      dmgW(w,w.hp);
      if(w.civicObject?.broken){
        v.v*=ram.speedFactor;v.bump=Math.max(v.bump,ram.bump);v.envCd=ram.cooldown;
        msg=w.civicFurniture==='bench'?'Has atropellat un banc!':'Has enderrocat un pou!';
        msgT=1.6;
        continue;
      }
    }
  }
  if(w.towerLegOwner&&land){
    const tower=w.towerLegOwner;
    if(tower.destroyed)continue;
    if(v.envCd<=0){
      const damage=window.HUNTER_TOWER_MODEL.towerLegRamDamage(Math.abs(v.v),c.mass||1);
      if(damage>0){
        dmgW(w,damage);
        vehicleImpactFx(w.cx,Math.max(0,hAt(w.cx,w.cz))+.9,w.cz);
        collisionDamageVehicle(v,Math.max(1,Math.ceil(damage/3)));
        v.v*=.35;v.bump=.18;v.envCd=.55;
        if(v.destroyed)return false;
        if(tower.destroyed){msg='Has enderrocat una torre!';msgT=2;continue;}
      }
    }
    ok=false;break;
  }
  if(w.rammable&&land&&mayRamWhileRecovering(v.t,!!w.barbed,v.envCd)){
    const barbed=!!w.barbed,tank=v.t==='tanc',
          truckFence=v.t==='camio'&&barbed;
    const ram=window.HUNTER_SHARED_COMBAT.barrierRam(v,w,v.envCd);
    if(ram){
      dmgW(w,w.hp);
      if(ram.damage)collisionDamageVehicle(v,0,ram.damage);
      const hitX=touch?.x??w.cx,hitZ=touch?.z??w.cz;
      vehicleImpactFx(hitX,Math.max(0,hAt(hitX,hitZ))+1.1,hitZ);
      if(v.destroyed)return false;
      v.v*=ram.speedFactor;
      v.bump=ram.bump;
      v.envCd=ram.cooldown;
      if(!Wl.includes(w)){msg=barbed?'Has trencat la filferrada!':'Has travessat una paret!';msgT=1;continue}
    }
  }
  if(a)return crashHelicopterStructure(v,{x:nx,z:nz,alt:v.alt,y:w.y1,kind:'roof'});
  ok=false;break
}}
if(ok&&deckCarrier&&ferryCabinVehicleHit(deckCarrier,vehicleBox(v,nx,nz,v.hd))){
  // La cabina bloqueja els vehicles embarcats, com un edifici sòlid.
  ok=false;v.bump=.12;
}
if(ok){const test=vehicleBox(v,nx,nz,v.hd),hit=vehicleObstacles(v).find(o=>o!==deckCarrier&&o!==v.carrier&&o.carrier!==v&&vehicleHeightCompatible(v,o)&&obbOverlap(test,vehicleBox(o)));if(hit){
  const rel=relativeVehicleImpactSpeed(v,hit),ownMass=c.mass||1,otherMass=VT[vehicleHitType(hit.t)]?.mass||1,
        ratio=Math.max(.35,Math.min(2.5,otherMass/ownMass)),
        tankCrush=tankCanCrush(v,hit,ownMass,otherMass);
  if(tankCrush){
    if(E.includes(hit))hurtE(hit,Math.max(300,hit.hp+1));
    else damageVehicle(hit,0,Math.max(1,hit.life??VT[hit.t].life));
    vehicleImpactFx(hit.x,Math.max(vehicleY(v),vehicleY(hit))+.5,hit.z);
    v.v*=.99;v.bump=.08;v.envCd=.12;
  }else{
    v.v*=rel>5?Math.max(.16,.42/ratio):Math.max(.3,.62/ratio);
    if('v'in hit)hit.v*=Math.max(.3,.72/Math.max(.5,ownMass/otherMass));
    if(rel>10&&v.envCd<=0){
      collisionDamageVehicle(v,impactDamage(rel,ownMass,otherMass),1);
      impactVehicle(hit,impactDamage(rel,otherMass,ownMass));
      vehicleImpactFx((v.x+hit.x)/2,Math.max(vehicleY(v),vehicleY(hit))+.5,(v.z+hit.z)/2);
    }
    v.bump=.14;v.envCd=.18;ok=false;
  }
}}
if(ok){
  v.x=nx;v.z=nz;
  if(land){
    const f2=ferryForVehicle(v,v.x,v.z,true);if(f2)attachToFerry(v,f2);else if(v.carrier)detachFromFerry(v)
  }
  handleVehicleImpacts(v,dt,oldX,oldZ);if(v.destroyed)return false;if(v.t==='tanc'||v.t==='tanqueta'||v.t==='camio')crush(nx,nz,window.HUNTER_VEHICLE_ENVIRONMENT.palmCrushRadius(v.t,VS[v.t]))
}else{v.v*=Math.exp(-12*dt);v.sideV*=Math.exp(-10*dt);v.strafeV*=Math.exp(-12*dt)}
if(a){
  const g2=Math.max(0,groundAt(v.x,v.z)),previousAlt=window.HUNTER_SHARED_VEHICLES.stepHelicopterLift(v,ud,dt,helicopterLandedAltitude(v,g2));
  if(!deckCarrier){
    const terrainHit=helicopterEnvironmentContact(v,
      {x:v.x,z:v.z,alt:previousAlt},{x:v.x,z:v.z,alt:v.alt});
    if(terrainHit)return crashHelicopterStructure(v,terrainHit);
    const structureHit=window.HUNTER_AIR_OBSTACLES.hit(THREE,world,v,
      {x:v.x,z:v.z,alt:previousAlt},{x:v.x,z:v.z,alt:v.alt},VS[v.t]||1);
    if(structureHit)return crashHelicopterStructure(v,structureHit);
    const corrected=helicopterRoofAltitude(v,v.x,v.z,previousAlt,v.alt);
    if(corrected!==v.alt){v.alt=corrected;v.verticalV=0}
  }
  const f2=ferryForVehicle(v,v.x,v.z,false);
  if(f2){
    const q=ferryLocal(f2,v.x,v.z),deckY=ferryLocalSurfaceY(f2,q.z);
    const deckLandingY=helicopterLandedAltitude(v,deckY);
    if(v.alt<=deckLandingY+.55&&ud<=.05){v.alt=deckLandingY;v.verticalV=0;attachToFerry(v,f2)}
    else if(v.carrier===f2&&v.alt>deckLandingY+1.4)detachFromFerry(v)
  }else if(v.carrier)detachFromFerry(v)
  // Els patins ja suporten el pes: no acumulem velocitat de descens contra el terra.
  if(!f2&&v.verticalV<0&&v.alt<=helicopterLandedAltitude(v,g2)+.001)v.verticalV=0;
}
if(v.carrier)attachToFerry(v,v.carrier);
return !v.destroyed}
function animateTankTracks(v,dt){
  const tracks=v.o?.userData?.tracks;if(!tracks?.length)return;
  const scale=VS[v.t]||1,yaw=v.yawRate||0,halfTrack=2.1;
  for(const track of tracks){
    // Fase positiva = la part superior de l'eruga corre cap enrere (+Z local).
    // En gir pivotant, yaw reparteix velocitats oposades a esquerra/dreta.
    const beltSpeed=v.v/scale+track.side*yaw*halfTrack;
    // Erugues aturades: la geometria és exactament la mateixa. Un tanc
    // pot tenir desenes d'esglaons que no s'han de reposicionar a 60 FPS.
    if(beltSpeed===0&&track.renderedPhase===track.phase)continue;
    track.phase=(track.phase+beltSpeed*dt)%track.perimeter;if(track.phase<0)track.phase+=track.perimeter;
    for(const link of track.links){
      let q=(link.userData.trackOffset+track.phase)%track.perimeter;
      let y,z,rx=0;
      if(q<track.straight){
        y=track.cy+track.r;z=track.front+q;rx=0;
      }else if((q-=track.straight)<Math.PI*track.r){
        const a=q/track.r;y=track.cy+track.r*Math.cos(a);z=track.rear+track.r*Math.sin(a);rx=a;
      }else if((q-=Math.PI*track.r)<track.straight){
        y=track.cy-track.r;z=track.rear-q;rx=Math.PI;
      }else{
        q-=track.straight;const a=q/track.r;y=track.cy-track.r*Math.cos(a);z=track.front-track.r*Math.sin(a);rx=Math.PI+a;
      }
      link.position.set(track.x,y,z);link.rotation.set(rx,0,0);
    }
    track.renderedPhase=track.phase;
  }
}
function place(v,t,dt,tr){
const c=VT[v.t],o=v.o;
// Evitam mostres de terreny, suspensió i animacions de peces per cada
// fotograma d'un vehicle terrestre aparcat. No es congelen ni el pilot,
// ni vehicles en moviment, ni els que han tocat aigua o pateixen impactes.
const parked=c.m==='l'&&v!==cv&&!v.carrier&&!v.crashing&&!v.waterIngress&&!v.sunk&&
  !v.bump&&!v.v&&!v.sideV&&!v.strafeV&&!v.yawRate&&!v.verticalV&&
  !v.driveInput&&!v.steerInput&&!tr;
if(parked&&v.visualParkedReady&&
   v.visualParkedX===v.x&&v.visualParkedZ===v.z&&v.visualParkedHd===v.hd&&
   v.visualParkedY===v.y&&v.visualParkedGrounded===v.grounded&&
   v.visualParkedMeshY===o.position.y&&o.position.x===v.x&&o.position.z===v.z&&
   o.rotation.y===v.hd)return;
const g=hAt(v.x,v.z);let y,pi=0,ro=Math.sin(t*2+v.x)*.02;
if(c.m==='a'&&v.carrier&&!v.crashing){
  const q=ferryLocal(v.carrier,v.x,v.z);
  y=helicopterLandedAltitude(v,ferryLocalSurfaceY(v.carrier,q.z));v.alt=y;
  pi=v.carrier.o.rotation.x;ro=v.carrier.o.rotation.z;
}
else if(c.m==='a'){
  y=v.alt;const speedN=Math.max(-1,Math.min(1,v.v/(c.maxF||35))),yawN=Math.max(-1,Math.min(1,(v.yawRate||0)/(c.tu||1)));
  pi=-speedN*(c.pitch||.2);ro=-yawN*(c.bank||.32)-(v.strafeV||0)/(c.strafeMax||17)*(c.bank||.32)*.5;
  // Amb els patins en contacte, l'aparell descansa pla sobre el terreny.
  // El balanceig residual del gir no ha de deixar els patins suspesos.
  const landed=helicopterLandedAltitude(v,Math.max(0,groundAt(v.x,v.z)));
  if(!v.crashing&&v.alt<=landed+.25){
    const proximity=Math.max(0,Math.min(1,(v.alt-landed)/.25));
    const s=Math.sin(v.hd),co=Math.cos(v.hd),front=2.05*(VS[v.t]||1),
          halfSkid=1.458*(VS[v.t]||1),
          frontY=groundAt(v.x-s*front,v.z-co*front),
          backY=groundAt(v.x+s*front,v.z+co*front),
          rightY=groundAt(v.x+co*halfSkid,v.z-s*halfSkid),
          leftY=groundAt(v.x-co*halfSkid,v.z+s*halfSkid),
          slopePitch=Math.max(-.24,Math.min(.24,Math.atan2(frontY-backY,2*front))),
          slopeRoll=Math.max(-.24,Math.min(.24,Math.atan2(rightY-leftY,2*halfSkid)));
    pi=slopePitch*(1-proximity)+pi*proximity;
    ro=slopeRoll*(1-proximity)+ro*proximity;
  }
  if(v.crashing){pi+=Math.sin(v.crashT*3)*.35;ro+=(v.crashSpin||1)*(.45+Math.min(.65,v.crashT*.12))}
}
else if(c.m==='w'){
   y=wy(v.x,v.z,t)+(v.t==='barca_rems'?-.1:.2);
   if(v.grounded)y=Math.max(y,hAt(v.x,v.z)+Math.min(.85,(window.HUNTER_VEHICLE_DYNAMICS.shore.draft[v.t]||.8)*.5));
   if(v.t==='windsurf'&&o.userData.windsurfRig){
     // A varada board has its sail laid lengthwise over the sand. The mast
     // is physically parented to its universal joint, not rotated around
     // the middle of the board. Raising the rig is smooth upon boarding.
     const shore=window.HUNTER_VEHICLE_DYNAMICS.shore,
       clearance=shore.clearance(v,v.x,v.z,vehicleBox(v),hAt,
         (x,z)=>wy(x,z,t)),
       onBeach=v.beached||v.grounded||hAt(v.x,v.z)>-.12;
     if(v===cv&&Math.abs(v.v)>1&&clearance>.6)v.beached=false;
     const layTarget=v!==cv&&onBeach?1:0;
     if(o.userData.windsurfLay==null)o.userData.windsurfLay=layTarget;
     const factor=1-Math.exp(-4*Math.max(0,dt));
     o.userData.windsurfLay+=(layTarget-o.userData.windsurfLay)*factor;
     const lay=o.userData.windsurfLay,rig=o.userData.windsurfRig;
     rig.rotation.set(-.14+(Math.PI/2+.14)*lay,0,.055*(1-lay));
     rig.position.y=.34-.08*lay;
     if(lay>.05)y=Math.max(y,hAt(v.x,v.z)+.12);
   }
   const speed=Math.min(1,Math.abs(v.v)/(c.maxF||30)),
         wave=Math.sin(t*2.4+v.x*.03+v.z*.025);
   pi=wave*.035*speed;ro=-(v.yawRate||0)*.11+wave*.025;
   // Només la moto aquàtica i el windsurf s'enlairen en
   // remuntar una ona a velocitat: els altres bucs no boten.
   if(v.grounded&&v.waveJump){v.waveJump.lift=0;v.waveJump.vy=0;v.waveJump.airborne=false}
   if((v.t==='moto_aquatica'||v.t==='windsurf')&&!v.grounded){
     const jump=window.HUNTER_WATER_JUMPS.update(v,dt,t,wy,c.maxF);
     y+=jump.lift;pi+=jump.pitch;
   }
 }
else if(c.m==='wl'){y=Math.max(g,wy(v.x,v.z,t))+.6;ro=-(v.yawRate||0)*.08-(v.strafeV||0)*.008}
else if(v.carrier){const q=ferryLocal(v.carrier,v.x,v.z);y=ferryLocalSurfaceY(v.carrier,q.z)+.05;pi=0;ro=0}
else{
  const s2=Math.sin(v.hd),k=Math.cos(v.hd);
  // Suport al centre del vehicle: ni el màxim físic ni les rodes
  // del darrere han de fixar una alçada antiga en una baixada.
  // La inclinació continua seguint la diferència de les mostres frontal/darrere.
  y=groundAt(v.x,v.z)+.05;
  pi=Math.atan((groundAt(v.x-s2*3,v.z-k*3)-groundAt(v.x+s2*3,v.z+k*3))/6);ro=-(v.sideV||0)*.018;
  if(v.waterIngress){
    const state=v.waterIngress,surface=wy(v.x,v.z,t),bed=hAt(v.x,v.z);
    const floated=Math.max(y,surface-.5);
    // A steep coastal shelf must not catapult a car upward in one frame.
    y=y+Math.min(2.5,floated-y)*state.buoyancy;
    if(state.dead)y=Math.max(bed-.4,y-state.sink);
    if(state.dead)pi=Math.min(.27,pi+.025*state.elapsed);
  }
}
if(v.bump>0)y+=Math.sin((1-v.bump/.22)*Math.PI)*.34;o.position.set(v.x,y,v.z);o.rotation.set(pi,v.hd,ro);
// Les rampes del ferri reposen sobre el moll o la platja quan s'atura.
// La superfície física empra el mateix angle que les peces animades.
if(v.t==='ferry'&&o.userData.ferryRamps){
  const deck=FERRY_DECK,sc=VS.ferry||1,length=deck.ramp*sc,
    deckY=y+deck.y*sc,moving=Math.abs(v.v)>.8||Math.abs(v.driveInput||0)>.2;
  for(const ramp of o.userData.ferryRamps){
    const side=ramp.side,tip=ferryWorld(v,0,side*(deck.halfL+deck.ramp)*sc);
    const supportGround=window.HUNTER_WALK_SURFACES.walkingHeightAt({
      physical:hAt(tip.x,tip.z),visible:null,stairs:[],piers,buildings:[]
    },tip.x,tip.z);
    let support=Math.max(wy(tip.x,tip.z,t),supportGround);
    const bridge=terminalRampHeight(tip.x,tip.z);
    if(bridge!==null)support=Math.max(support,bridge);
    const down=Math.max(-.16,Math.min(.58,Math.atan2(deckY-support,length))),
      target=side*(moving?-.88:down),blend=1-Math.exp(-5*Math.max(0,dt));
    ramp.hinge.rotation.x+=(target-ramp.hinge.rotation.x)*blend;
  }
}
// Direcció visual a l'eix davant (-Z): independent del rodament en X.
window.HUNTER_VEHICLES.animateSteering(o,v.t,tr,dt);
v.pedalPhase=(v.pedalPhase||0)+v.v*dt/1.5;if(o.userData.crank)o.userData.crank.rotation.x=(v.t==='bici'?-v.pedalPhase:v.pedalPhase);if(o.userData.oars){const power=Math.min(1,Math.abs(v.v)/1.6),rowPhase=v.t==='barca_rems'?-(v.pedalPhase||0):(v.pedalPhase||0),sweep=Math.sin(rowPhase)*.5*power,dip=.12+.18*(.5+.5*Math.cos(rowPhase))*power;o.userData.oars.forEach((r,i)=>{const side=i?1:-1;r.rotation.y=side*sweep;r.rotation.z=-side*(.12+dip);r.rotation.x=.06*Math.sin(rowPhase)})}if(o.userData.rotor)o.userData.rotor.rotation.y+=dt*(v===cv?30:v.crashing?Math.max(5,26-(v.crashT||0)*4):0);if(o.userData.fan)o.userData.fan.rotation.z+=dt*(v===cv?35:0);if(o.userData.tailRotor)o.userData.tailRotor.rotation.x+=dt*(v===cv?40:v.crashing?Math.max(7,32-(v.crashT||0)*5):0);if(v.t==='tanc')animateTankTracks(v,dt);(o.userData.wheels||[]).forEach(w=>{const side=w.userData.trackSide;if(v.t==='tanc'&&side){const sideSpeed=v.v+side*(v.yawRate||0)*2.1*(VS[v.t]||1);w.rotation.x-=sideSpeed*dt/(w.userData.radius||.6)}else w.rotation.x-=v.v*dt/(w.userData.radius||.6)})
// Registrar la pose immòbil un cop col·locada. Un canvi extern de posició
// (p. ex. un snapshot o un transport) invalida automàticament la memòria cau.
v.visualParkedReady=parked;
if(parked){
  v.visualParkedX=v.x;v.visualParkedZ=v.z;v.visualParkedHd=v.hd;
  v.visualParkedY=v.y;v.visualParkedGrounded=v.grounded;
  v.visualParkedMeshY=o.position.y;
}
}
// Única cadència de presentació dels vehicles: usada tant per la
// simulació individual com pels snapshots del cooperatiu natiu. La
// simulació/autoritat del vehicle NO es retarda amb aquest LOD visual.
function updateVehicleVisualLod(t,dt,{skipHidden=false}={}){
  const scopeVisual=scopeActive?currentSniperFocus():null;
  for(const v of V){
    // Ni el LOD ni les animacions poden ressuscitar una carcassa.
    if(v.destroyed||skipHidden&&!v.o.visible&&v!==cv)continue;
    // Distant model LOD: a prop, en el vehicle del jugador o amb la
    // mira de franctirador, tots els pivots i les peces reals són visibles.
    // Enfora, una sola malla cromàtica conserva la silueta i els ocupants.
    if(v.o?.userData?.distantVehicleLOD){
      const dx=v.x-P.x,dz=v.z-P.z,d2=dx*dx+dz*dz,
        focus=!!scopeVisual?.contains(v.x,v.o.position.y+1.5,v.z,6),
        current=v.o.userData.distantVehicleLOD.level==='far',
        distant=window.HUNTER_VEHICLES.shouldSimplifyVehicle(
          v.t,d2,current,v===cv||focus);
      window.HUNTER_VEHICLES.setDistantVehicleLOD(v.o,distant);
    }
    if(v.t==='barca_rems'&&v.o?.userData?.rowboatVisualLod){
      const dx=v.x-P.x,dz=v.z-P.z,d2=dx*dx+dz*dz,
        currentFar=v.o.userData.rowboatVisualLod.far.visible,
        // Histèresi: 660 m en acostar-se, 740 m en allunyar-se.
        limit=currentFar?660:740,
        focus=!!scopeVisual?.contains(v.x,v.o.position.y+1.5,v.z,5);
      window.HUNTER_VEHICLES.setRowboatVisualLod(v.o,
        v!==cv&&!focus&&d2>limit*limit);
    }
    if(v===cv){
      place(v,t,dt,v.steerInput||0);
      v.visualLodAcc=0;
      continue;
    }
    const dx=v.x-P.x,dz=v.z-P.z,d2=dx*dx+dz*dz,
      focus=!!scopeVisual?.contains(v.x,v.o.position.y+1.5,v.z,5),
      // Un helicòpter permet veure la flota a 1–2 km. No espaiem
      // l'animació dels vaixells visibles ni dels vehicles que es mouen:
      // .1–.45 s entre poses es percebia com a teletransportacions.
      // Els vehicles llunyans fora del rang visual mantenen el LOD barat.
      moving=Math.abs(v.v||0)>.05||Math.abs(v.sideV||0)>.05||
        Math.abs(v.strafeV||0)>.05||Math.abs(v.yawRate||0)>.01||
        Math.abs(v.x-v.o.position.x)>.05||Math.abs(v.z-v.o.position.z)>.05,
      nautical=VT[v.t]?.m==='w'||VT[v.t]?.m==='wl',
      fluidVisible=v.o.visible&&(nautical||moving),
      interval=focus||d2<LOD_NEAR2||fluidVisible?0:(d2<LOD_MID2?.1:.45);
    if(interval===0){
      place(v,t,dt,0);
      v.visualLodAcc=0;
    }else{
      v.visualLodAcc=(v.visualLodAcc||0)+dt;
      if(v.visualLodAcc>=interval){
        const step=v.visualLodAcc;
        v.visualLodAcc=0;
        place(v,t,step,0);
      }
    }
  }
}
let runStepTimer=0,stealthStepTimer=0;
const cameraOffset=new THREE.Vector3(),bunkerEye=new THREE.Vector3();
function hideCameraObstructions(owner,eye,basement){
  const radius=Math.hypot(eye.x-cam.position.x,eye.z-cam.position.z)/2+2;
  for(const wall of wallCandidates((eye.x+cam.position.x)/2,(eye.z+cam.position.z)/2,radius)){
    if(wall.owner!==owner||
      (!!wall.bunkerBasementWall!==basement&&!(basement&&wall.indoorFurniture))||
      !wall.m?.visible||wall.destroyedWall||wall.hp<=0)continue;
    if(wall.y1<Math.min(eye.y,cam.position.y)||wall.y0>Math.max(eye.y,cam.position.y))continue;
    const hit=segmentAabbT(eye.x,eye.y,eye.z,cam.position.x,cam.position.y,cam.position.z,
      wall.x0,wall.x1,wall.y0,wall.y1,wall.z0,wall.z1);
    if(hit===null||hit<=.005||hit>=.995)continue;
    cameraOcclusion.hide(wall);
    if(basement)owner.basement.cameraHiddenWalls.push(wall.m);
  }
}
// Botó independent del joystick: un toc = un clàxon/timbre, també a COOP.
// El teclat manté Majúscules; arrossegar el joystick NO fa sonar res.
const VEHICLE_SIGNAL_SOUNDS=window.HUNTER_ENEMY_PERCEPTION.VEHICLE_SIGNAL_SOUNDS,
      vehicleHornButton=document.getElementById('vehicleHornButton'),
      vehicleHornIcon=vehicleHornButton.querySelector('.horn-icon'),
      vehicleHornLabel=vehicleHornButton.querySelector('.horn-label');
let vehicleSpecialHeld=false,vehicleHornPointerId=null,vehicleHornMode=null;
function syncVehicleHornButton(type){
  const next=type||null;
  document.body.classList.toggle('vehicle-horn-active',!!next);
  if(!next&&vehicleHornPointerId!==null){
    vehicleHornPointerId=null;
    vehicleHornButton.classList.remove('held');
    vehicleHornButton.setAttribute('aria-pressed','false');
  }
  if(vehicleHornMode===next)return;
  vehicleHornMode=next;
  if(!next)return;
  const bicycle=next==='bici',label=bicycle?'TIMBRE':'CLÀXON';
  vehicleHornIcon.textContent=bicycle?'🔔':'📣';
  vehicleHornLabel.textContent=label;
  vehicleHornButton.setAttribute('aria-label',bicycle
    ?'Fer sonar el timbre de la bicicleta':'Fer sonar el clàxon del vehicle');
  vehicleHornButton.title=label+' · Majúscules';
}
function updateVehicleSpecialAction(){
  const playable=!!started&&!paused&&!over&&hp>0&&!!cv&&
    !playerFall&&!playerEject&&!scopeActive&&
    (!nativeCoopSession||(!nativeCoopSession.gameOver&&nativeCoopSession.state?.status==='running'));
  const sound=playable?VEHICLE_SIGNAL_SOUNDS[cv.t]:null;
  syncVehicleHornButton(sound?cv.t:null);
  const down=!!sound&&(vehicleHornPointerId!==null||!!K.ShiftLeft||!!K.ShiftRight);
  if(!down){vehicleSpecialHeld=false;return}
  if(vehicleSpecialHeld)return;
  vehicleSpecialHeld=true;
  // La comunicació al Worker i el radi d'alerta no depenen del control usat.
  if(nativeCoopSession&&!nativeCoopSession.channel?.inventory?.('signal','vehicle'))return;
  snd(sound,1,null,cv);
  window.HUNTER_STEALTH.emit(sound,cv.x,cv.o?.position?.y??P.y,cv.z);
}
vehicleHornButton.addEventListener('pointerdown',e=>{
  if(vehicleHornPointerId!==null||!document.body.classList.contains('vehicle-horn-active')||
    e.button!==0)return;
  e.preventDefault();
  vehicleHornPointerId=e.pointerId;
  vehicleHornButton.classList.add('held');
  vehicleHornButton.setAttribute('aria-pressed','true');
  vehicleHornButton.setPointerCapture(e.pointerId);
  // No perdem una pulsació ràpida entre dos fotogrames.
  updateVehicleSpecialAction();
});
const releaseVehicleHorn=e=>{
  if(e.pointerId!==vehicleHornPointerId)return;
  vehicleHornPointerId=null;
  vehicleHornButton.classList.remove('held');
  vehicleHornButton.setAttribute('aria-pressed','false');
  updateVehicleSpecialAction();
};
for(const eventName of ['pointerup','pointercancel','lostpointercapture'])
  vehicleHornButton.addEventListener(eventName,releaseVehicleHorn);
addEventListener('blur',()=>{
  vehicleHornPointerId=null;vehicleSpecialHeld=false;
  vehicleHornButton.classList.remove('held');
  vehicleHornButton.setAttribute('aria-pressed','false');
});
function readPlayerControls(strafeEnabled,canRun){
 return playerInputReader(strafeEnabled,canRun,playerCrouched);
}
function updatePlayerCamera(dt){
// Restituïm només peces vives que la càmera havia ocultat, també en
// canviar d'edifici. La física de parets i portes continua intacta.
restoreCameraWalls();
syncCameraVehicle();
const scopeNow=scopeActive&&sniperEquipped&&!cv&&!playerFall&&!swimming;
const fieldOfView=scopeNow?2*Math.atan(Math.tan(58*Math.PI/360)/8)*180/Math.PI:58;
if(Math.abs(cam.fov-fieldOfView)>.001){cam.fov=fieldOfView;cam.updateProjectionMatrix()}
if(scopeNow){
  cameraBasement=null;
  const fx=-Math.sin(scopeYaw),fz=-Math.cos(scopeYaw),vertical=Math.tan(scopePitch);
  cam.position.set(P.x-fx*.12,P.y+1.76,P.z-fz*.12);
  cam.lookAt(P.x+fx*160,P.y+1.76+vertical*160,P.z+fz*160);
}else{
  const T=cv||P,c=cv?VT[cv.t]:ib?{cd:6,ch:11}:{cd:10,ch:5},ty=cv?cv.o.position.y:P.y,
    heading=cv?vehicleLook.heading(cv,dt,!!drag):P.hd,
    w=cameraOffset.set(T.x+Math.sin(heading)*c.cd*zoom*(cv?Math.sqrt(VS[cv.t]):1),0,T.z+Math.cos(heading)*c.cd*zoom*(cv?Math.sqrt(VS[cv.t]):1));
  // Mode soterrani també durant el PRIMER esglaó, no només quan
  // el jugador ja ha baixat 2 m. La càmera no es pot quedar darrere
  // d'un envà opac, ni pot perseguir l'altura exterior de la muntanya.
  const b=activeBunker,local=b?.basement&&!cv?buildingLocalPoint(b,P.x,P.z):null,
        inside=!!local&&Math.abs(local.x)<b.basement.halfX-.5&&
        Math.abs(local.z)<b.basement.halfZ-.5;
  const stair=b?.basement?.stair;
  const descending=!!local&&Math.abs(local.x-stair.x)<stair.width/2+.45&&
    local.z>=Math.min(stair.zTop,stair.zBottom)-.5&&
    local.z<=Math.max(stair.zTop,stair.zBottom)+.5&&P.y<b.fy+.18;
  const bunkerBelow=!!inside&&(P.y<b.fy-3.9||descending);
  // El forjat ÉS el sostre del soterrani. No s'ha d'amagar:
  // ara que la càmera és sempre a sota, es veu el plafó i no es
  // produeix cap obstrucció; els llums queden ancorats al sostre real.
  if(b?.basement)for(const slab of b.basement.upperSlabMeshes)slab.visible=true;
  if(bunkerBelow){
    // Distància normal i suavitzat dins el volum segur del soterrani.
    // L'entrada es fixa sota el forjat: interpolar des de fora creuaria
    // el sostre opac. La resta del recorregut no pot tornar-hi a passar.
    const targetEye=bunkerEye.set(P.x,
      Math.min(b.fy-1.0,Math.max(b.basement.floorY+1.6,P.y+1.65)),P.z);
    const cameraDistance=Math.max(8.8,Math.min(14,11.5*zoom));
    const cameraHeight=Math.max(b.basement.floorY+4.5,
      Math.min(b.fy-1.45,P.y+5.4));
    w.set(P.x+Math.sin(heading)*cameraDistance,cameraHeight,
      P.z+Math.cos(heading)*cameraDistance);
    // No deixam sortir la càmera del volum subterrani, perquè llavors
    // el terreny exterior pot ocultar completament la vista.
    const cl=buildingLocalPoint(b,w.x,w.z);
    const clampedX=Math.max(-b.basement.halfX+1.3,
      Math.min(b.basement.halfX-1.3,cl.x));
    const clampedZ=Math.max(-b.basement.halfZ+1.3,
      Math.min(b.basement.halfZ-1.3,cl.z));
    if(clampedX!==cl.x||clampedZ!==cl.z){
      const q=buildingWorldPoint(b,clampedX,clampedZ);
      w.x=q.x;w.z=q.z;
    }
    if(cameraBasement!==b)cam.position.copy(w);
    else cam.position.lerp(w,1-Math.exp(-7*dt));
    const smoothLocal=buildingLocalPoint(b,cam.position.x,cam.position.z),
      safe=buildingWorldPoint(b,
        Math.max(-b.basement.halfX+1.3,Math.min(b.basement.halfX-1.3,smoothLocal.x)),
        Math.max(-b.basement.halfZ+1.3,Math.min(b.basement.halfZ-1.3,smoothLocal.z)));
    cam.position.set(safe.x,
      Math.max(b.basement.floorY+4.5,Math.min(b.fy-1.45,cam.position.y)),safe.z);
    // La càmera POT travessar els envans. Només ocultam les peces
    // físiques interposades entre càmera i jugador, no les parets
    // de tota la cambra ni les col·lisions del personatge.
    hideCameraObstructions(b,targetEye,true);
    b.basement.cameraInside=true;
    cameraBasement=b;
  }else{
    if(b?.basement)b.basement.cameraInside=false;
    w.y=Math.max(ty+c.ch*zoom*(cv?Math.sqrt(VS[cv.t]):1),hAt(w.x,w.z)+3,2.5);
    // En sortir del soterrani cal passar directament al costat exterior
    // del forjat. El suavitzat exterior es manté sempre damunt el terreny,
    // inclòs l'arc entre dues posicions segures al voltant d'un turó.
    if(cameraBasement)cam.position.copy(w);
    else cam.position.lerp(w,1-Math.pow(.001,dt));
    cam.position.y=Math.max(cam.position.y,hAt(cam.position.x,cam.position.z)+3,2.5);
    cameraBasement=null;
    if(ib&&!cv)hideCameraObstructions(ib,bunkerEye.set(P.x,P.y+1.65,P.z),false);
  }
  cam.lookAt(T.x-Math.sin(heading)*(bunkerBelow?3.5:8),
    Math.min(bunkerBelow?b.fy-1.0:Infinity,ty+(bunkerBelow?2.0:2)),
    T.z-Math.cos(heading)*(bunkerBelow?3.5:8));
  if(cv){
    // Es recalcula a cada fotograma: el LOD (.2 s) és massa lent
    // quan el vehicle surt del hangar i la càmera encara hi és dins.
    const sight={x:cv.x-Math.sin(heading)*8,y:ty+2,z:cv.z-Math.cos(heading)*8},
          vehicle={x:cv.x,y:VT[cv.t]?.m==='a'?(cv.alt??ty):ty,z:cv.z};
    for(const hangar of B){
      if(!hangar.hangar||!hangar.o.visible||hangar.rb)continue;
      const obstructs=window.HUNTER_CAMERA_CONTROLS.hangarBlocksSight(hangar,cam.position,sight,vehicle);
      hangar.roof.visible=hangar.rhp>0&&!obstructs;
      // La paret posterior semicircular NO pertany a roof: cal ocultar
      // només les parets realment interposades entre vehicle i càmera.
      if(obstructs)hideCameraObstructions(hangar,bunkerEye.set(cv.x,ty+2,cv.z),false);
    }
  }
}
}
function updatePlayerHUD(dt){
uiTick+=dt;if(uiTick>.12){uiTick=0;const nv=cv?null:nearV();const contextButtons=document.getElementById('contextButtons');if(contextButtons){contextButtons.classList.toggle('heli-active',(!cv&&cheats.fly)||(!!cv&&VT[cv.t]?.m==='a'));contextButtons.classList.toggle('heli-combat-active',cv?.t==='heli_combat');contextButtons.classList.toggle('heli-bomb-active',cv?.t==='heli');contextButtons.classList.toggle('vehicle-grenade-active',!!cv&&cv.t!=='heli_combat'&&cv.t!=='heli');const grenadeVehicleButton=document.getElementById('vehicleGrenadeButton');if(grenadeVehicleButton){const count=inv.granada||0;grenadeVehicleButton.dataset.count=String(count);grenadeVehicleButton.title=count?'Llançar granada des del vehicle · B ('+count+' restants)':'No tens granades · B';grenadeVehicleButton.setAttribute('aria-label',grenadeVehicleButton.title)}contextButtons.classList.toggle('sniper-active',!!sniperEquipped&&!!inv.franctirador&&!cv)}
const heliMissileButton=document.querySelector('.heli-combat-control[data-k="KeyG"]');
if(heliMissileButton){const count=cv?.t==='heli_combat'?Math.max(0,cv.rockets||0):0;
  heliMissileButton.dataset.count=String(count);
  heliMissileButton.title='Disparar míssil · G ('+count+' restants)';
  heliMissileButton.setAttribute('aria-label',heliMissileButton.title);
}
const heliBombButton=document.getElementById('heliBombButton');
if(heliBombButton){
  const count=inv.expl||0,available=count>0;
  heliBombButton.dataset.count=String(count);
  heliBombButton.setAttribute('aria-disabled',String(!available));
  const title=available?'Programar i deixar caure C4 ('+count+' disponibles) · G':'No tens explosius C4 · G';
  if(heliBombButton.title!==title){
    heliBombButton.title=title;
    heliBombButton.setAttribute('aria-label',title);
  }
}
const fireButton=document.getElementById('mainFireButton');
if(fireButton){
  const mountedRow=cv&&nativeCoopSession?.appliedVehicleRows?.get(cv.saveId),
        passenger=!!mountedRow&&mountedRow.seats?.[0]!==nativeCoopSession.self,
        personalWeapon=!cv||passenger,
        heliGrenade=cv?.t==='heli'&&!passenger,
        grenade=heliGrenade||personalWeapon&&grenadeEquipped&&(inv.granada||0)>0,
        cutters=personalWeapon&&cisallaEquipped&&(inv.cisalla||0)>0,
        knife=personalWeapon&&(knifeEquipped||!grenade&&!cutters&&!bazookaEquipped&&!sniperEquipped&&!assaultRifleEquipped&&ammo<=0),
        weapon=cutters?'cisalla':grenade?'granada':knife?'ganivet':'normal';
  if(fireButton.dataset.weapon!==weapon){
    fireButton.dataset.weapon=weapon;
    fireButton.innerHTML=(cutters?ICON.cisalla:grenade?ICON.granada:knife?ICON.ganivet:'🎯')+
      '<span class="fire-ammo-count" aria-hidden="true"></span>';
  }
  const ammoLeft=!personalWeapon?(heliGrenade?(inv.granada||0):'∞'):
    grenade?(inv.granada||0):cutters||knife?null:
      bazookaEquipped?bazookaAmmo:sniperEquipped?sniperAmmo:ammo;
  const badge=fireButton.querySelector('.fire-ammo-count');
  if(badge){
    badge.hidden=ammoLeft===null;
    const label=ammoLeft===null?'':String(ammoLeft);
    if(badge.textContent!==label)badge.textContent=label;
  }
  const action=cutters?'Talla filferrada':grenade?'Llançar granada':knife?'Atacar amb ganivet':'Dispar';
  const title=(heliGrenade?'Llançar granada de l’inventari':grenade?'Mantén premut per arribar més lluny':action)+
    (ammoLeft===null?'':' · '+ammoLeft+' restants');
  if(fireButton.title!==title){fireButton.title=title;fireButton.setAttribute('aria-label',title)}
  
}
updateActionButton(nv);if(pickerOpen)drawWeaponPicker();
mini();ui.renderHUD({nearVehicle:nv});}}
function update(dt,t){
if(nativeCoopSession){updateNativeCoop(dt);return;}
syncCameraVehicle();
updateArmoredTurretButton();
if(activeBunker?.basement?.lights?.length){
  const basement=activeBunker.basement;
  const nearby=started&&!paused&&
    Math.hypot(P.x-activeBunker.x,P.z-activeBunker.z)<160;
  if(nearby!==basement.lightsOn){
    for(const lamp of basement.lights)lamp.visible=nearby;
    basement.lightsOn=nearby;
  }
}
const strafeEnabled=updateStrafeControls();
if(cheats.items)grantAllWeapons();
// La prolongació del joystick és només per córrer/crol a peu.
// Els vehicles tenen el botó CLÀXON/TIMBRE separat.
const canRun=window.HUNTER_PLAYER_INPUT.canRun(started,paused,over,cv,playerFall,playerEject,scopeActive);
const canSpecial=window.HUNTER_PLAYER_INPUT.canSpecial(started,paused,over,hp,cv,playerFall,playerEject,scopeActive);
joystick.setVehicleMode(canSpecial?cv.t:null);
joystick.setRunEnabled(canRun);
document.body.classList.toggle('player-swimming',canRun&&swimming);
updateCrouchButton();
// Darrera defensa: cap estat actiu amb vida nul·la, fins i tot si una
 // interacció externa o una restauració d'estat ha posat hp a zero.
 if(started&&!over&&hp<=0){
   hp=0;fin('HAS MORT',{type:'impact',x:P.x,y:P.y,z:P.z});
 }
 if(!started||paused||over){updateVehicleSpecialAction();updateOptionalSystems(0,false);resetCameraState();updateBazookaReticle(0);if(eng)eng.g.gain.value=0;return}
updateVehicleSpecialAction();
if(!(dt>0))return;
// Graella completa només un cop per RAF, no 15 cops al fotograma saturat.
if(vehicleGridRebuiltFrameId!==renderLoopFrameId){
  rebuildVehicleGrid();vehicleGridRebuiltFrameId=renderLoopFrameId;
}else refreshVehicleGridIfCellsChanged();
elapsed+=dt;
window.HUNTER_STEALTH.tick(dt);
const playerStartX=P.x,playerStartZ=P.z;
const {f,tr,strafe,ud,running}=readPlayerControls(strafeEnabled,canRun),lim=H-2;
// El córrer fa passes de bota a ritme viu, però no quan nedam.
if(running&&!swimming&&!playerFall&&!playerEject&&f>.2){
  runStepTimer-=dt;
  if(runStepTimer<=0){snd('step',.65);runStepTimer=.29}
}else runStepTimer=0;
if(scopeActive){
  // El joystick i el teclat controlen ÚNICAMENT la càmera de la mira:
  // sense traslació, gir ni animació de desplaçament del jugador.
  // Y/U (strafe habitual) també passa a moure horitzontalment la mira.
  const scopeStrafe=(K.KeyU?1:0)-(K.KeyY?1:0);
  // Joystick de la mira ×8: només el component tàctil és un 18%
  // del gir normal. Les tecles conserven la velocitat anterior.
  const precision=.18,
    scopeTurn=(K.KeyA||K.ArrowLeft?1:0)-(K.KeyD||K.ArrowRight?1:0)-
      joystick.state.x*precision,
    scopeForward=(K.KeyW||K.ArrowUp?1:0)-(K.KeyS||K.ArrowDown?1:0)-
      joystick.state.y*precision;
  scopeYaw+=(scopeTurn-scopeStrafe*.8)*dt*.38;
  scopePitch=Math.max(-.65,Math.min(.65,scopePitch+scopeForward*dt*.30));
}else if(cv){
  const driven=cv;let alive=false;
  try{const turretSteering=armoredVehicle()&&armoredManualActive();alive=stepV(driven,turretSteering?0:f,turretSteering?0:tr,ud,dt,strafe)}
  catch(error){if(!recoverArmoredControlFailure(driven,error,'moviment'))throw error;}
  if(alive&&cv===driven){P.x=driven.x;P.z=driven.z;P.hd=driven.hd}
}
else{P.hd+=tr*dt*2.2;if(cheats.fly){
  const speed=65,vertical=(K.KeyH||K.Space?1:0)-(K.KeyJ||K.ShiftLeft?1:0),length=Math.max(1,Math.hypot(f,strafe));
  P.x=Math.max(-lim,Math.min(lim,P.x+(-Math.sin(P.hd)*f+Math.cos(P.hd)*strafe)*speed*dt/length));
  P.z=Math.max(-lim,Math.min(lim,P.z+(-Math.cos(P.hd)*f-Math.sin(P.hd)*strafe)*speed*dt/length));
  cheatFlightY=Math.max(hAt(P.x,P.z)+1,Math.min(500,(cheatFlightY??P.y)+vertical*speed*dt));
  P.y=cheatFlightY;
}else if(playerFall){
  const fall=playerFall,oldX=P.x,oldZ=P.z,oldY=fall.y;
  const airborne=window.HUNTER_PLAYER_SIMULATION.stepAirborne(P,fall,{forward:f,strafe},dt,lim);
  Object.assign(fall,airborne.fall);P.x=airborne.x;P.z=airborne.z;
  const water=wy(P.x,P.z,t),shaft=fall.kind==='shaft',
        roof=shaft?null:parachuteRoofLanding(oldX,oldZ,oldY,P.x,P.z,fall.y),
        landing=shaft?groundAt(P.x,P.z,fall.y):
          Math.max(hAt(P.x,P.z),water-1.4,roof??-Infinity);
  P.y=fall.y;
  if(fall.y<=landing&&(!shaft||oldY>=landing-.08)){
    P.y=landing;const fallH=fall.startHeight,
      waterLanding=roof===null&&water>hAt(P.x,P.z)+1.5,
      dmg=window.HUNTER_PLAYER_SIMULATION.fallLandingDamage(fall,{water:waterLanding,maxHealth:COMBAT_BALANCE.player});
    removeParachuteVisual();playerFall=null;
    if(dmg>0)hurtP(dmg,false,{type:'fall',x:P.x,y:P.y+8,z:P.z});
    if(!shaft){msg=dmg===0&&fallH>4?'Has aterrat amb seguretat.':waterLanding?'Has caigut a l’aigua.':'Has impactat contra el terra!';msgT=2.5;}
  }
}
else if(playerEject&&playerEject.t>0){
  P.x=Math.max(-lim,Math.min(lim,P.x+playerEject.vx*dt));
  P.z=Math.max(-lim,Math.min(lim,P.z+playerEject.vz*dt));
  if(playerEject.kind==='blast'){
    playerEject.vy-=19*dt;
    playerEject.height=Math.max(0,(playerEject.height||0)+playerEject.vy*dt);
    if(playerEject.height===0)playerEject.vy=0;
    const landed=playerEject.height===0;
    playerEject.vx*=Math.exp(-(landed?7:1.7)*dt);
    playerEject.vz*=Math.exp(-(landed?7:1.7)*dt);
    if(landed&&playerEject.t<.25)playerEject.t=0;
  }else{
    playerEject.vx*=Math.exp(-2.4*dt);playerEject.vz*=Math.exp(-2.4*dt);
  }
  playerEject.t=Math.max(0,playerEject.t-dt);
}else{
  // Avanç i strafe simultanis sense variar el rumb. Normalitzam la
  // diagonal per mantenir la velocitat màxima d'un jugador a peu.
  // Dins l'aigua: braça normal, crol accelerat quan es manté la
  // prolongació superior i natació lateral amb els botons de strafe.
  const moved=window.HUNTER_PLAYER_SIMULATION.moveOnFoot(P,{forward:f,strafe,run:!!running},dt,{limit:lim,swimming:!!swimming,crouched:!!playerCrouched});
  P.x=moved.x;P.z=moved.z;
  if(!cheats.fly&&stairDropAt(P.x,P.z,P.y)){
    const below=groundAt(P.x,P.z,P.y);
    playerFall={kind:'shaft',y:P.y,vy:0,vx:0,vz:0,
      startHeight:P.y-below,t:0,spin:0,leanF:0,leanS:0,parachute:false};
    swimming=false;
  }
}
if(!cheats.fly){
  if(!playerFall){wallPush();treePush();vehiclePushPlayer();ferryCabinPushPlayer()}
  else if(playerFall.kind==='shaft')wallPush();
}}
// Cal transportar també el jugador que va a peu sobre la coberta mòbil.
const walkingDeck=!cv&&!playerFall?pedestrianFerry(P.x,P.z,P.y):null;
V.slice().forEach(v=>{
   // El vehicle requisat ja el simula el conductor enemic amb stepV.
   // No li aplicam una segona passada en punt mort (ni esborram l'accelerador).
   if(v===cv||v.enemyCrew?.[0]?.enemyVehicleClaim?.phase==='riding'||
      v.enemyCrew?.[0]?.enemyVehicleClaim?.phase==='waiting')return;
  if(v.sunk&&v.waterIngress&&v.t!=='bici'){
    // The hull continues to descend to the seabed even after its engine
    // becomes unusable and it is no longer being simulated as a driver.
    const bed=hAt(v.x,v.z),depth=Math.max(0,wy(v.x,v.z,t)-bed),
      rate=window.HUNTER_VEHICLE_DYNAMICS.shore.land[v.t]?.sinkRate||1.2;
    v.waterIngress.sink=Math.min(depth+2,
      v.waterIngress.sink+rate*dt);
    v.v=0;v.sideV=0;v.strafeV=0;return;
  }
  if(v.carrier){v.v=0;v.sideV=0;v.strafeV=0;return}if(v.crashing){v.crashT=(v.crashT||0)+dt;v.hd+=(v.crashSpin||1)*(1.8+v.crashT*.35)*dt;v.v*=Math.exp(-.12*dt);v.x-=Math.sin(v.hd)*v.v*dt;v.z-=Math.cos(v.hd)*v.v*dt;const ground=Math.max(0,hAt(v.x,v.z)),water=wy(v.x,v.z,t),impactY=Math.max(ground,water);v.alt-=(5+v.crashT*8)*dt;if(v.alt<=impactY+1){v.alt=impactY+.8;explodeVehicle(v)}return}if(Math.abs(v.v)>.08||v.waterIngress?.dead&&!v.sunk){v.driveInput=0;v.steerInput=0;stepV(v,0,0,0,dt);if(Math.abs(v.v)<.08)v.v=0}});
syncFerryCargo();updateTerminalRamps();
if(walkingDeck&&!walkingDeck.f.destroyed){const p=ferryWorld(walkingDeck.f,walkingDeck.q.x,walkingDeck.q.z);P.x=p.x;P.z=p.z}
const previousInterior=ib;
ib=cv?null:buildingCandidates(P.x,P.z).find(b=>Math.abs(P.x-b.x)<b.w/2&&Math.abs(P.z-b.z)<b.d/2&&P.y<(solidRoofAt(b,P.x,P.z)?.bottom??b.fy+b.h+.1))||null;
if(ib!==previousInterior)worldVisualTick=0;
const floor=ib&&ib.kind!=='enemy_bunker'?Math.max(ib.fy+.3,groundAt(P.x,P.z,P.y)):groundAt(P.x,P.z,P.y),
      surface=wy(P.x,P.z,t),
      insideBasement=playerInsideBunkerBasement(P.x,P.z,P.y);
const support=window.HUNTER_PLAYER_SIMULATION.waterSupport({floor,surface,
  flight:!!cheats.fly,vehicle:!!cv,interior:!!ib,basement:!!insideBasement,falling:!!playerFall});
swimming=support.swimming;
if(swimming)playerCrouched=false;
document.body.classList.toggle('player-swimming',canRun&&swimming);
if(scopeActive&&(cv||swimming||playerFall||!sniperEquipped))setSniperScope(false);
if(!playerFall&&!cheats.fly){
  // El suport segueix el triangle visible JUST sota el centre del jugador.
  // Mostrejar el màxim de quatre punts manté el personatge en l'aire
  // en baixar una pendent, perquè els punts del darrere són més alts.
  // Dins el búnquer, la superfície marina no és una superfície física:
  // el nivell del terra de l'habitació ha de guanyar sempre.
  P.y=support.y;
}
// Sons audibles per la IA: passos, braçades i motors. El volum de l'àudio
// real no intervé en els radis, i no emetem res si el jugador està aturat.
stealthStepTimer-=dt;
if(stealthStepTimer<=0){
  if(cv&&Math.abs(cv.v)>1){
    const vehicleNoise={bici:'bicycle',moto:'motorbike',cotxe:'car',cotxe_civil:'civilianCar',camio:'truck',
      tanc:'tank',tanqueta:'apc',barca_rems:'rowboat',windsurf:'windsurf',
      moto_aquatica:'jetski',llanxa:'speedboat',llanxa_coets:'speedboat',
      ferry:'ferry',heli:'helicopter',heli_combat:'helicopter',hover:'jetski'},
      kind=vehicleNoise[cv.t],maximum=window.HUNTER_STEALTH.RADII[kind];
    if(maximum){
      const velocity=Math.min(1,Math.abs(cv.v)/Math.max(1,VT[cv.t].maxF||35));
      window.HUNTER_STEALTH.emit(kind,cv.x,cv.o.position.y+1,cv.z,
        maximum*(.45+.55*velocity));
    }
  }else if(!cv&&!playerFall&&!playerEject&&!scopeActive&&
    Math.hypot(P.x-playerStartX,P.z-playerStartZ)>.025){
    window.HUNTER_STEALTH.emit(swimming?'swim':playerCrouched?'crouch':running?'run':'walk',
      P.x,P.y+1,P.z);
  }
  stealthStepTimer=.24;
}
// Actualització del LOD de les palmeres a baixa freqüència (i també en vehicle).
palmVisualTick-=dt;
if(palmVisualTick<=0){
  palmVisualTick=scopeActive?.10:.16;
  if(PM.update)PM.update(P.x,P.z,!!scopeActive,palmsDisabled,currentSniperFocus());
  updateShadowCasters();
}
// Un vehicle sota un hangar també ha de deixar veure l'interior.
// Només s'amaga la coberta quan som realment per sota seu (no en sobrevolar-la).
function viewInsideBuilding(b){
  if(b===ib)return true;
  if(!b.hangar||!cv||cv.destroyed)return false;
  const y=VT[cv.t]?.m==='a'?(cv.alt??cv.o?.position?.y):(cv.o?.position?.y??cv.alt),
        heading=cv.hd+vehicleLook.offset;
  return y!=null&&window.HUNTER_CAMERA_CONTROLS.hangarBlocksSight(b,cam.position,{
    x:cv.x-Math.sin(heading)*8,y:(cv.o?.position?.y??y)+2,
    z:cv.z-Math.cos(heading)*8
  },{x:cv.x,y,z:cv.z});
}
worldVisualTick-=dt;
if(worldVisualTick<=0){
  worldVisualTick=.2;
  updateDistanceVisibility();
}
updateDoors(dt);
items.forEach(it=>{const dx=it.x-P.x,dz=it.z-P.z;if(dx*dx+dz*dz<ITEM_ANIM2){it.o.rotation.y=t*2;it.o.position.y=it.y+Math.sin(t*3+it.x)*.25}});
if(!cv)for(let k=items.length-1;k>=0;k--){const it=items[k],dx=P.x-it.x,dz=P.z-it.z;if(dx*dx+dz*dz<4.84&&Math.abs(P.y-it.y)<3){let mapMessage=null;
  if(it.t==='arma'){ammo+=12;sniperAmmo+=2;bazookaAmmo+=1;}
  else if(it.t==='mapa'||it.t==='mapa_heli'||it.t==='mapa_tanc'){
    mapMessage=revealMapPickup(it.t,false,MAP_SCALE===2?mapSector(it.x,it.z):null);
    mini(); // la informació apareix de seguida, sense entrar a cap menú
  }
  else if(it.t==='franctirador'){inv.franctirador=1;sniperAmmo+=6}
  else if(it.t==='bazooka'){inv.bazooka=1;bazookaAmmo+=3}
  else inv[it.t]=(inv[it.t]||0)+(it.t==='granada'?5:1);
  world.remove(it.o);items.splice(k,1);requestOperationAutosave('equipment');recordOperationMetric('pickups');
  msg=mapMessage||'Has trobat: '+IT[it.t].n+(it.t==='arma'?' · +12 bales, +2 rifle, +1 coet':it.t==='granada'?' ×5':it.t==='bazooka'?' +3 coets':it.t==='franctirador'?' +6 cartutxos':'');
  msgT=3;snd('pick')}}
msgT-=dt;if(parachuteVisual)parachuteVisual.position.set(P.x,P.y,P.z);pl.position.set(P.x,P.y,P.z);pl.rotation.y=P.hd;pl.visible=!cv&&!scopeActive;
// Strafe independent: gir visual de la cintura i les cames, no de P.hd.
animPl(cv||scopeActive?0:f,dt,running&&f>.1,cv||scopeActive?0:strafe);
// La física conserva P.y, sota l'aigua. Aixecam només el model per
// deixar el pit vora la superfície quan s'ajau per nedar a crol.
// La compensació desapareix en aigües somes i al sortir de l'aigua.
if(!cv&&!scopeActive&&!playerFall&&!playerEject)
  pl.position.y+=window.HUNTER_CHARACTERS.swimVisualLift(pl,surface,P.y);
if(!cv&&!swimming&&!playerFall&&!playerEject&&!scopeActive){
  // Ajustam la malla a la sola real de les botes i al triangle visible,
  // també en pendents. No canviam P.y ni la detecció física del terra.
  pl.updateMatrixWorld(true);
  const soles=pl.userData.soleContacts||[],point=pl.userData.soleWorldScratch??=new THREE.Vector3();
  let clearance=Infinity;
  for(const sole of soles){
    sole.getWorldPosition(point);
    const physical=hAt(point.x,point.z),visible=terrainStream?.visibleHeightAt(point.x,point.z);
    const floor=groundAt(point.x,point.z,P.y);
    // Sobre terreny natural, ajustam al triangle real del LOD renderitzat.
    // A rampes, molls, escales i plantes es conserva el suport construït.
    // El terreny visual pot tenir un triangle de LOD diferent del punt
    // físic. Si no hi ha cap plataforma a sota, preval el triangle
    // que efectivament es dibuixa (i que rep l'ombra).
    const natural=Math.abs(floor-Math.max(0,physical))<.18;
    const target=natural&&Number.isFinite(visible)?visible:floor;
    clearance=Math.min(clearance,point.y-target);
  }
  // Sense espai artificial entre soles i sòl. En pendent el contacte
  // s'avalua per separat a cada peu abans de traslladar tot el rig.
  if(Number.isFinite(clearance))pl.position.y-=Math.max(-.18,Math.min(1.8,clearance-.006));
}
 // L'animació de caminar va a 8.4 rad/s: un esquitx a cada suport de
 // peu (creuament de fase PI). Sense esquitxos nedant ni en vehicles.
 movementFx.playerStep({
   phase:pl.userData.ph,x:P.x,z:P.z,heading:P.hd,
   moving:!scopeActive&&(Math.abs(f)>.04||Math.abs(strafe)>.04),
   swimming,inVehicle:!!cv,falling:!!playerFall||!!playerEject||!!ib,
   surfaceAt:(x,z)=>wy(x,z,t),groundAt
 });
 if(movementFx.swimStroke({phase:pl.userData.ph,x:P.x,z:P.z,heading:P.hd,
    swimming,crawling:(pl.userData.crawlBlend||0)>.55,
    moving:Math.abs(f)>.1&&!cv&&!playerFall&&!playerEject,
    surfaceAt:(x,z)=>wy(x,z,t)}))snd('swim',.65);
if(!cv&&playerFall){
  pl.position.y=playerFall.y;
  if(playerFall.parachute){
    // Amb la cúpula oberta, postura suspesa (sense cabrioles), braços
    // aixecats agafant els tirants i una oscil·lació molt suau.
    pl.rotation.x=0;
    pl.rotation.x=-playerFall.leanF*.13;
    pl.rotation.z=playerFall.leanS*.14+Math.sin(playerFall.t*1.8)*.045;
    // La postura de braços i la visibilitat de l'equipament ja són
    // exclusives de l'animació aèria (sense una segona capa contradictòria).
  }else if(playerFall.kind==='shaft'){
    pl.rotation.x=-Math.min(.22,playerFall.t*.3);
    pl.rotation.z=0;
  }else{
    pl.rotation.x=(playerFall.spin||1)*playerFall.t*7.5;
    pl.rotation.z=Math.sin(playerFall.t*8)*.45;
  }
}
else if(!cv&&playerEject&&playerEject.t>=0){
  const dur=playerEject.dur||.5,p=Math.max(0,Math.min(1,1-playerEject.t/dur)),u=pl.userData;
  if(playerEject.kind==='flip'){
    // Una sola volta completa. L'últim frame és exactament dret, sense correcció posterior.
    const turn=p>=1?0:-Math.PI*2*p,waistLocal=2.05,waistScaled=waistLocal*pl.scale.y;
    pl.rotation.x=turn;pl.rotation.z=0;
    const waistOffset=new THREE.Vector3(0,waistScaled,0).applyQuaternion(pl.quaternion);
    pl.position.x-=waistOffset.x;
    pl.position.y+=waistScaled-waistOffset.y+Math.sin(Math.PI*p)*(playerEject.height||.68);
    pl.position.z-=waistOffset.z;
    const compact=1-Math.pow(p,8);
    if(u.al)u.al.rotation.x=.58*compact;if(u.ar)u.ar.rotation.x=.58*compact;
    if(u.ael)u.ael.rotation.x=.5*compact;if(u.aer)u.aer.rotation.x=.5*compact;
    if(u.ll)u.ll.rotation.x=-.28*compact;if(u.lr)u.lr.rotation.x=-.28*compact;
    if(u.lkl)u.lkl.rotation.x=-.5*compact;if(u.lkr)u.lkr.rotation.x=-.5*compact;
  }else if(playerEject.kind==='bicycle'){
    // Petita pèrdua d'equilibri sense desplaçament ni efecte explosiu.
    const stumble=Math.sin(Math.PI*p);
    pl.rotation.x=-.24*stumble;
    pl.rotation.z=.35*stumble;
  }else if(playerEject.kind==='blast'){
    const airborne=Math.max(0,playerEject.height||0),wave=Math.sin(Math.PI*p);
    pl.position.y+=airborne;
    pl.rotation.x=-wave*1.05;
    pl.rotation.z=(playerEject.roll||1)*wave*.95;
    // Les extremitats les mou el ragdoll; el cos encara segueix
    // la trajectòria simplificada existent (sense motors físics pesants).
    if(playerBlastRagdoll)window.HUNTER_RAGDOLL.update(playerBlastRagdoll,dt,{
      airborne:airborne>.12,grounded:airborne<=.12
    });
  }
}
updateVehicleVisualLod(t,dt);poseRider(cv,dt);
// Les torretes dels blindats del jugador segueixen gradualment el vector
// que triaria l'autoapuntat actual. El vehicle pot avançar/girar mentre
// la torre conserva el seu propi rumb i l'elevació del canó.
if(cv&&(cv.t==='tanc'||cv.t==='tanqueta')){
  if(armoredManualActive())window.HUNTER_VEHICLES.manualTurret(cv.o,cv.t,tr,f,dt);
  else{
    const gun=window.HUNTER_VEHICLES.turretShot(THREE,cv.o);
  if(gun){
    const hd=cv.hd,fx=-Math.sin(hd),fz=-Math.cos(hd),
          range=cv.t==='tanc'?250:150,
          heavy=cv.t==='tanc',
          [ax,ay,az]=autoAimArmoredShot(
            gun.origin.x,gun.origin.y,gun.origin.z,fx,fz,range,
            heavy?'heavy':'light',heavy?85*HEAVY_SHOT_SPEED_FACTOR:135);
    window.HUNTER_VEHICLES.aimTurret(THREE,cv.o,
      new THREE.Vector3(ax,ay,az),dt);
  }
  }
}
updatePlayerCamera(dt);
if(playerEject&&playerEject.t<=0){
  if(playerBlastRagdoll){
    window.HUNTER_RAGDOLL.reset(playerBlastRagdoll);
    playerBlastRagdoll=null;
  }
  playerEject=null;
}
updateBazookaReticle(dt);
updateLightAimReticle(dt);
const previousCooldown=Math.max(0,fcd);
fcd=Math.max(0,previousCooldown-dt);updateGrenadeCharge(dt);updateAssaultBurst(dt);
if(K.KeyF&&(!grenadeEquipped||cv)){
  const overshoot=previousCooldown>0?Math.min(0,previousCooldown-dt):0;
  try{fire()}
  catch(error){if(!recoverArmoredControlFailure(cv,error,'dispar'))throw error;}
  // Conservam només la fracció del pas que travessa el cooldown actual.
  // Aturats a zero no es guarden trets ni escurçam la primera espera.
  if(fcd>0)fcd=Math.max(0,fcd+overshoot);
}
const enemyAiStamp=performanceStatsVisible?performance.now():0;
updEn(dt,simulationFrameActive,enemyAiPressure);
if(performanceStatsVisible)perfHotspots.aiMs+=performance.now()-enemyAiStamp;
window.HUNTER_STEALTH_DEBUG.update(THREE,world,E,P);
updDead(dt);updPj(dt);updFx(dt);updExtra(dt,t);
updateOptionalSystems(dt,!!started&&!paused&&!over&&simulationFocused&&!document.hidden);
updatePlayerHUD(dt);}



if(performanceDebugRequested||performanceAuditRequested)setPerformanceStatsVisible(true);
const performanceGpuTimer=performanceAuditRequested?
  window.HUNTER_PERFORMANCE_AUDIT.createGpuTimer(ren):null;
const performanceAudit=performanceAuditRequested?window.HUNTER_PERFORMANCE_AUDIT.create({
  // La llavor d'estrès requereix més temps perquè el LOD s'estabilitzi.
  warmupMs:stressAuditRequested?3500:1100,
  sampleMs:stressAuditRequested?5000:performanceAuditMode==='full'?3000:5000,
  fullAudit:performanceAuditMode==='full',
  getState:()=>({seed,version:window.HUNTER_VERSION||null,quality:qualityName,pixelRatio:ren.getPixelRatio(),
    shadowsDisabled,waterDisabled,
    playerBatchStats:pl.userData?.batchStats||null,
    pathStats:world?.userData?.pathStats||null,
    stressPreset:stressAuditRequested?{...STRESS_AUDIT_PRESET}:null,
    vehicleFleet:JSON.parse(JSON.stringify(vehicleFleet))}),
  setShadowsDisabled,setWaterDisabled,gpuTimer:performanceGpuTimer,
  getCameraPose:()=>[cam.quaternion.x,cam.quaternion.y,cam.quaternion.z,cam.quaternion.w]
}):null;
const frameDiagnostics=window.HUNTER_FRAME_DIAGNOSTICS.createFrameDiagnostics({
  performanceAudit,adaptivePerformance,perfHotspots,shadowStats,shadowCache,ren,
  renderCategories,shadowRenderCategories,renderOtherDetails,
  vehicleDrawTypes,vehicleDrawParts,vehicleShadowTypes
});
const frameTickCoordinator=window.HUNTER_FRAME_TICK.createFrameTickCoordinator({
  simulationClock,cinematicClock,resetEnemyPathFrameBudget,
  update,getElapsed:()=>elapsed,
  shouldContinueGameplay:()=>!!started&&!paused&&!over&&simulationFocused&&!document.hidden,
  setSimulationFrameActive:active=>{simulationFrameActive=active},
  syncWeaponPicker,
  tickPersistence:()=>{if(!nativeCoopSession){operationAutosave?.tick();cloudTick();journalTick();}},
  getVictoryCinematic:()=>victoryCinematic,
  getDeathCinematic:()=>deathCinematic,
  updateVictoryCinematic,updateDeathCinematic,
  canContinueCinematics:()=>!paused&&simulationFocused&&!document.hidden
});
let last=performance.now(),renderLoopFrameId=0,enemyAiPressure=false;
resetSimulationClock(last);
(function loop(now){
renderLoopFrameId++;
// DOM can repaint and accept cancel/retry between generation tasks. No world
// simulation, RNG, LOD, fire, clock debt or partial-world render is permitted.
if(generationPromise){last=now;frameTickCoordinator.suspend(now);requestAnimationFrame(loop);return}
if(performanceGpuTimer)performanceGpuTimer.poll();
const rawDt=Number.isFinite(now)&&now>=last?(now-last)/1000:0;
last=Number.isFinite(now)&&now>=0?now:performance.now();
if(performanceStatsVisible)frameDiagnostics.resetHotspots();
const cpuStarted=performance.now(),victoryAtStart=victoryCinematic,
      deathAtStart=deathCinematic,visible=simulationFocused&&!document.hidden,
      gameplayActive=!!started&&!paused&&!over&&visible,
      cinematicActive=!!started&&!paused&&visible&&
        (!!victoryAtStart&&(victoryAtStart.active||victoryAtStart.finished)||!!deathAtStart?.active);
// Pressupost adaptatiu només sota càrrega: conserva la física 1/60 s,
// però evita monopolitzar la CPU fins a 15 subpassos abans de cada render.
const previousFrame=adaptivePerformance.stats;
const perStepMs=previousFrame.simulationSteps>0?
  previousFrame.updateCpuMs/previousFrame.simulationSteps:0;
enemyAiPressure=gameplayActive&&(rawDt>.045||previousFrame.updateCpuMs>35);
simulationClock.setStepBudget(enemyAiPressure&&perStepMs>0?
  Math.max(4,Math.min(15,Math.floor(120/perStepMs))):15);
let simulated;
try{simulated=frameTickCoordinator.advanceGameplay(now,gameplayActive)}
catch(error){
 // Una mort generada dins la col·lisió (p. ex. tanc contra moto pilotada)
 // ja ha mostrat la causa. No permetem que un error posterior de física/FX
 // mati el requestAnimationFrame abans de la repetició cinematogràfica.
 if(!deathCinematic?.active)throw error;
 console.error('Hunter: error en el fotograma fatal; la cinemàtica continua',error);
 simulated={steps:0,simulatedDt:0,droppedDt:0};
}
frameTickCoordinator.advanceCinematics(now,cinematicActive,victoryAtStart,deathAtStart);
updateAudioFrame();
renderCombatFeedback();
renderStealthFeedback();
const t=elapsed+(victoryCinematic?victoryCinematic.t:0);
const simulationEnded=performance.now();
if(started&&!paused&&(!over||victoryCinematic?.active)&&terrainStream)
  terrainStream.update(victoryCinematic?.active?cam.position.x:P.x,
    victoryCinematic?.active?cam.position.z:P.z,visualQuality.shadows?2:1.2,cam,
    victoryCinematic?.active?null:currentSniperFocus());const terrainEnded=performance.now();
 // El món no queda congelat durant la repetició: les onades avancen
 // lentament mentre la càmera i el cos es mouen a velocitat cinematogràfica.
 waves(t+(deathCinematic?.active?deathCinematic.t*.18:0));
// El focus de la càmera de la llum es mou en salts petits i coherents;
// evitam regeneracions per centímetres sense descentrar el shadow map.
const sunFocusX=victoryCinematic?cam.position.x:P.x,
  sunFocusZ=victoryCinematic?cam.position.z:P.z,
  anchorCoord=window.HUNTER_SHADOW_CACHE.anchorCoordinate;
sun.target.position.set(ren.shadowMap.enabled?anchorCoord(sunFocusX):sunFocusX,0,
  ren.shadowMap.enabled?anchorCoord(sunFocusZ):sunFocusZ);
sun.position.copy(sun.target.position).addScaledVector(sunDir,500);sky.position.copy(cam.position);sunM.position.copy(cam.position).addScaledVector(sunDir,visualQuality.sunDistance||3500);if(rendering.glow)rendering.glow.position.copy(sunM.position);
for(const proxy of shadowBoatNodes){
  const source=proxy.source;
  proxy.position.x=source.position.x;
  proxy.position.z=source.position.z;
  proxy.rotation.y=source.rotation.y;
}
const shadowRedrawn=shadowCache.schedule({now:performance.now(),x:sun.target.position.x,z:sun.target.position.z,
  nodes:shadowPoseNodes,enabled:!!ren.shadowMap.enabled});
const renderStarted=performance.now();
const measuringRenderMatrix=performanceAudit?.status==='running'&&gameplayActive;
let renderMatrixCpuMs=0;
// During an audit only: observe the built-in Three.js scene transform pass.
// Keep every matrix calculation, the render path and all visual effects.
const gpuSample=measuringRenderMatrix?performanceGpuTimer?.begin():null;
const originalSceneMatrixUpdate=measuringRenderMatrix?scene.updateMatrixWorld:null;
if(originalSceneMatrixUpdate)scene.updateMatrixWorld=function(...args){
  const begin=performance.now();
  try{return originalSceneMatrixUpdate.apply(this,args)}
  finally{renderMatrixCpuMs+=performance.now()-begin}
};
// Estadístiques de camins limitades al fotograma actual.
const roadFrameStats=world?.userData?.pathRenderStats;
frameDiagnostics.resetDrawCounters(roadFrameStats);
hiddenMatrixCull.beginRender();
try{
 if(deathVoidReady()){
   const v=deathCinematic;v.voidCamera.aspect=cam.aspect;v.voidCamera.updateProjectionMatrix();
   ren.render(v.voidScene,v.voidCamera);
 }else if(deathCinematic?.underwaterActive){
   // Mantenim la mateixa càmera i el mateix cos, però sense la superfície
   // opaca del mar ni el cel exterior mentre el personatge s'enfonsa.
   ren.render(deathCinematic.underwaterScene,cam);
 }else ren.render(scene,cam);
}finally{
 hiddenMatrixCull.endRender();
 if(originalSceneMatrixUpdate)scene.updateMatrixWorld=originalSceneMatrixUpdate;
 if(gpuSample)performanceGpuTimer.end(gpuSample);
}
const renderCompleted=performance.now();
// Les tasques incrementals de textura i malla del mar tenen el seu propi
// cronòmetre. Permet detectar un pic puntual de 400 ms sense confondre'l
// amb IA o GPU. En producció el cost són només dues lectures de rellotge.
const postStart=renderCompleted;
let afterTerrainTexture=postStart,afterWaterUpgrade=postStart;
if(started&&!paused&&!over){
  advanceTerrainTexture();
  afterTerrainTexture=performance.now();
  if(waterUpgradePending){water.queueResolutionUpgrade();waterUpgradePending=false}
  water.stepResolutionUpgrade(2);
  afterWaterUpgrade=performance.now();
}
const postRenderCompleted=performance.now();
frameDiagnostics.recordFrame({
  gameplayActive,rawDt,P,gpuSample,cpuStarted,simulationEnded,
  terrainEnded,renderStarted,renderCompleted,postRenderCompleted,
  renderMatrixCpuMs,renderHiddenGroupsSkipped:hiddenMatrixCull.skipped,
  terrainTextureCpuMs:afterTerrainTexture-postStart,
  waterUpgradeCpuMs:afterWaterUpgrade-afterTerrainTexture,
  simulated,roadFrameStats,shadowRedrawn,now,
  simulationActive:!!started&&!paused&&!over,performanceStatsVisible
});
requestAnimationFrame(loop)})(last);




document.getElementById('operationsOpen').onclick=openOperations;

initializeOperationAutosave();

initializeAccounts();

initializeOperationAuthority();
document.getElementById('historyOpen').onclick=openHistoryPanel;
addEventListener('pagehide',()=>{if(started)recordJournalNow()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started)recordJournalNow()});
window.HUNTER_COMMANDS=Object.freeze({dispatch:command=>operationAuthority.dispatch(command),context:()=>({version:1,actorId:'local',operationId:operationCommandEpoch})});

document.getElementById('coopOpen').onclick=openCoopPanel;


