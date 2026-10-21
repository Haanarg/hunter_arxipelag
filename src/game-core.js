window.addEventListener("error",e=>{const p=document.getElementById("ini");if(p&&p.style.display!=="none"){const esc=v=>String(v||"").replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c])),m=(e&&e.message)?e.message:"Error desconegut",where=e&&e.filename?(e.filename.split("/").pop()+":"+e.lineno+":"+e.colno):"",stack=e&&e.error&&e.error.stack?e.error.stack:"";p.innerHTML="<h1>No s’ha pogut iniciar el joc</h1><p style=\"max-width:560px\">Error d’arrencada: <b>"+esc(m)+"</b></p>"+(where?"<p><b>"+esc(where)+"</b></p>":"")+(stack?"<pre style=\"max-width:90vw;white-space:pre-wrap;text-align:left;font-size:11px;opacity:.8\">"+esc(stack)+"</pre>":"")+"<p style=\"opacity:.8\">Envia una captura d’aquest missatge si persisteix.</p>"}});
let terrainStream=null,seedSearchMode=false,seedCompounds=[],seedScratchWorld=null;
const requiredModules=['HUNTER_VISUAL_CONFIG','HUNTER_MATERIALS','HUNTER_PALETTE','HUNTER_WATER','HUNTER_RENDERING','HUNTER_WATER_SYSTEM','HUNTER_WAVES','HUNTER_TERRAIN','HUNTER_VEHICLES','HUNTER_VEHICLE_DYNAMICS','HUNTER_JOYSTICK','HUNTER_RIDER','HUNTER_VEGETATION','HUNTER_BUILDINGS','HUNTER_CHARACTERS','HUNTER_FAUNA','HUNTER_MINIMAP','HUNTER_UI','HUNTER_SEED_SEARCH'];
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
const M=(c,profile='organic')=>new THREE.MeshStandardMaterial({color:vivid(c),flatShading:true,...materialProfile(profile)});
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
const ISLAND_CELL=512,islandGrid=new Map(),islandCellKey=(cx,cz)=>cx+','+cz;
function rebuildIslandGrid(){
  islandGrid.clear();
  if(!islands)return;
  for(const island of islands){
    // rawHAt parteix de m=-1: una illa només pot millorar aquest valor si d < 2*r.
    const reach=island.r*2,minX=Math.floor((island.x-reach)/ISLAND_CELL),maxX=Math.floor((island.x+reach)/ISLAND_CELL),
          minZ=Math.floor((island.z-reach)/ISLAND_CELL),maxZ=Math.floor((island.z+reach)/ISLAND_CELL);
    for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
      const key=islandCellKey(cx,cz),bucket=islandGrid.get(key);
      if(bucket)bucket.push(island);else islandGrid.set(key,[island])
    }
  }
}
const islandCandidates=(x,z)=>islandGrid.get(islandCellKey(Math.floor(x/ISLAND_CELL),Math.floor(z/ISLAND_CELL)))||(islands||[]);
const seedFromText=v=>{v=String(v??'').trim();if(/^-?\d+$/.test(v))return Number(BigInt(v)&0xffffffffn);let h=2166136261>>>0;for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const mul=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const hash=(x,y)=>{const h=Math.sin(x*127.1+y*311.7+seed*.001)*43758.5453;return h-Math.floor(h)};
function vn(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
return hash(ix,iy)*(1-u)*(1-v)+hash(ix+1,iy)*u*(1-v)+hash(ix,iy+1)*(1-u)*v+hash(ix+1,iy+1)*u*v}
const fbm=(x,y)=>vn(x,y)*.5+vn(x*2,y*2)*.25+vn(x*4,y*4)*.125+vn(x*8,y*8)*.0625;
const clamp01=v=>Math.max(0,Math.min(1,v)),smooth01=t=>t*t*(3-2*t);
function islandReliefAt(x,z,list){
  let m=-1,dom=null;
  for(const i of list){const q=1-Math.hypot(x-i.x,z-i.z)/i.r;if(q>m){m=q;dom=i}}
  let h=(m-.25+.6*(fbm(x/520,z/520)-.47))*45;
  if(dom&&h>0){
    // La costa es manté gairebé intacta; el relleu addicional entra progressivament cap a l'interior.
    const interior=smooth01(clamp01((m-.30)/.48));
    if(interior>0){
      const mid=(fbm(x/155+13,z/155-9)-.46875)*12*interior;
      const pd=Math.hypot(x-dom.peakX,z-dom.peakZ)/(dom.r*.72),
            peak=smooth01(clamp01(1-pd)),
            sizeGain=Math.max(.72,Math.min(1.22,dom.r/620));
      h=h*(1+.24*interior)+mid+peak*9*sizeGain*interior
    }
  }
  return h
}
function rawHAt(x,z){let h=islandReliefAt(x,z,islandCandidates(x,z));const e=Math.max(Math.abs(x),Math.abs(z));
if(e>H-120)h=Math.min(h,-4-(e-(H-120))*.05);
if(h>=-1.5)return h;
const depth=-h-1.5;return -1.5-Math.min(72,depth*depth*2.8+depth*.8)}
// Evitem recórrer TOTES les plataformes de TOTS els compounds en cada
// consulta d'altura. L'ordre d'inserció dels candidates és l'original:
// solapaments, altures, llavors i col·lisions continuen idèntics.
let terrainLevels=[];
const LEVEL_CELL=256,terrainLevelGrid=new Map();
const levelCellKey=(cx,cz)=>cx+','+cz;
const addLevelArea=(x,z,w,d,y,rot=0,blend=12)=>{
  const m={x,z,hw:w/2,hd:d/2,y,rot,c:Math.cos(rot),s:Math.sin(rot),blend};
  terrainLevels.push(m);
  // La circumferència circumscrita conté qualsevol punt amb out < blend,
  // també en les plataformes girades.
  const reach=Math.hypot(m.hw,m.hd)+blend,
        minX=Math.floor((x-reach)/LEVEL_CELL),maxX=Math.floor((x+reach)/LEVEL_CELL),
        minZ=Math.floor((z-reach)/LEVEL_CELL),maxZ=Math.floor((z+reach)/LEVEL_CELL);
  for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
    const key=levelCellKey(cx,cz),bucket=terrainLevelGrid.get(key);
    if(bucket)bucket.push(m);else terrainLevelGrid.set(key,[m]);
  }
};
function hAt(x,z){
  let h=rawHAt(x,z);
  const candidates=terrainLevelGrid.get(levelCellKey(
    Math.floor(x/LEVEL_CELL),Math.floor(z/LEVEL_CELL)));
  if(!candidates)return h;
  for(const m of candidates){
    const dx=x-m.x,dz=z-m.z,lx=dx*m.c+dz*m.s,lz=-dx*m.s+dz*m.c,
          ox=Math.max(0,Math.abs(lx)-m.hw),oz=Math.max(0,Math.abs(lz)-m.hd),
          out=Math.hypot(ox,oz);
    if(out<m.blend){const k=out<=0?1:1-smooth01(out/m.blend);h=h+(m.y-h)*k}
  }
  return h;
}
const waveAmp=window.HUNTER_WAVES.amplitude;
const wy=(x,z,t)=>water.surfaceHeight(x,z,t);
const rr=(a,b)=>a+R()*(b-a);
function genIslands(){R=mul(seed);const q=R()<.5?-1:1,q2=R()<.5?-1:1,extent=MAP_SCALE===1?1000:2200,baseMin=MAP_SCALE===1?500:1200,baseMax=MAP_SCALE===1?800:1800;
A={x:-q*rr(baseMin,baseMax)*2,z:-q2*rr(baseMin,baseMax)*2,r:rr(520,680)};Bi={x:q*rr(baseMin,baseMax)*2,z:q2*rr(baseMin,baseMax)*2,r:rr(520,680)};
islands=[A,Bi];const regular=22*MAP_SCALE*MAP_SCALE,large=2*MAP_SCALE*MAP_SCALE;
for(let i=0;i<regular;i++)islands.push({x:rr(-extent,extent)*2,z:rr(-extent,extent)*2,r:rr(180,520)});
for(let i=0;i<large;i++)islands.push({x:rr(-extent*.55,extent*.55)*2,z:rr(-extent*.55,extent*.55)*2,r:rr(800,1040)});
// Cim principal desplaçat de manera determinista, sense consumir R() ni alterar la resta de la generació.
for(let n=0;n<islands.length;n++){const i=islands[n],ox=(hash(i.x*.013+n*1.37,i.z*.011-7.1)-.5)*.42*i.r,oz=(hash(i.z*.017-n*.91,i.x*.009+11.3)-.5)*.42*i.r;i.peakX=i.x+ox;i.peakZ=i.z+oz}
rebuildIslandGrid()}
const slope=(x,z,h)=>Math.abs(hAt(x+5,z)-h)+Math.abs(hAt(x,z+5)-h);
function land(i,n=600,fl){for(let k=0;k<n;k++){const a=R()*6.283,d=R()*i.r*.75,x=i.x+Math.cos(a)*d,z=i.z+Math.sin(a)*d,h=hAt(x,z);
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
document.body.classList.remove('performance-stats-visible');
function setPerformanceStatsVisible(enabled){
  performanceStatsVisible=!!enabled;
  document.body.classList.toggle('performance-stats-visible',performanceStatsVisible);
}
window.HUNTER_PERFORMANCE_STATS=adaptivePerformance.stats;
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
const shadowCandidates=[],shadowStats={candidates:0,active:0,excludedDetail:0,updates:0,playerCasters:0};
let shadowLastX=Infinity,shadowLastZ=Infinity,shadowLastMs=-Infinity;
window.HUNTER_SHADOW_STATS=shadowStats;
function updateShadowCasters(force=false){
  if(!visualQuality.shadows||shadowsDisabled)return;
  const now=performance.now();
  if(!force&&Math.abs(P.x-shadowLastX)<30&&Math.abs(P.z-shadowLastZ)<30&&now-shadowLastMs<1000)return;
  shadowLastX=P.x;shadowLastZ=P.z;shadowLastMs=now;
  const range2=Math.pow(visualQuality.shadowDistance||225,2),
        dynamicPositions=new Map();
  let count=0;
  for(const entry of shadowCandidates){
    let q=entry.point;
    if(entry.owner){
      q=dynamicPositions.get(entry.owner);
      if(!q){q=entry.owner.getWorldPosition(new THREE.Vector3());dynamicPositions.set(entry.owner,q)}
    }
    const dx=q.x-P.x,dz=q.z-P.z,near=dx*dx+dz*dz<range2;
    entry.mesh.castShadow=near;
    if(near)count++;
  }
  shadowStats.active=count;shadowStats.updates++;
}
function setShadowsDisabled(disabled){
  shadowsDisabled=!!disabled;
  const checkbox=document.getElementById('disableShadows');
  if(checkbox)checkbox.checked=shadowsDisabled;
  const enabled=!!visualQuality.shadows&&!shadowsDisabled;
  ren.shadowMap.enabled=enabled;
  sun.castShadow=enabled;
  if(enabled){
    ren.shadowMap.needsUpdate=true;
    updateShadowCasters(true);
  }else{
    for(const entry of shadowCandidates)entry.mesh.castShadow=false;
    shadowStats.active=0;
  }
  window.HUNTER_SHADOWS_DISABLED=shadowsDisabled;
  return shadowsDisabled;
}
const shadowSettingCheckbox=document.getElementById('disableShadows');
if(shadowSettingCheckbox)shadowSettingCheckbox.addEventListener('change',()=>setShadowsDisabled(shadowSettingCheckbox.checked));
function prepareShadowCasters(){
  shadowCandidates.length=0;
  shadowLastX=Infinity;shadowLastZ=Infinity;shadowLastMs=-Infinity;
  shadowStats.candidates=0;shadowStats.active=0;shadowStats.excludedDetail=0;shadowStats.playerCasters=0;
  if(!visualQuality.shadows||!world)return;
  const dynamicRoots=new Set([pl,...V.map(v=>v.o),...E.map(e=>e.o),...fa.map(f=>f.o)].filter(Boolean));
  world.updateMatrixWorld(true);
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
  world.traverse(collect);
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
    largest(pl,3,true);
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
const WALL_CELL=64,wallGrid=new Map();let wallGridSource=null,wallGridCount=-1,wallQueryStamp=0;
const wallCellKey=(cx,cz)=>cx+','+cz;
function rebuildWallGrid(){
  wallGrid.clear();wallGridSource=Wl;wallGridCount=Wl.length;
  for(const w of Wl){
    const minX=Math.floor(w.x0/WALL_CELL),maxX=Math.floor(w.x1/WALL_CELL),
          minZ=Math.floor(w.z0/WALL_CELL),maxZ=Math.floor(w.z1/WALL_CELL);
    for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
      const key=wallCellKey(cx,cz),bucket=wallGrid.get(key);
      if(bucket)bucket.push(w);else wallGrid.set(key,[w])
    }
  }
}
function wallCandidates(x,z,r=0){
  if(wallGridSource!==Wl||wallGridCount!==Wl.length)rebuildWallGrid();
  const out=[],stamp=++wallQueryStamp,minX=Math.floor((x-r)/WALL_CELL),maxX=Math.floor((x+r)/WALL_CELL),
        minZ=Math.floor((z-r)/WALL_CELL),maxZ=Math.floor((z+r)/WALL_CELL);
  for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
    const bucket=wallGrid.get(wallCellKey(cx,cz));if(!bucket)continue;
    for(const w of bucket)if(w._wallQueryStamp!==stamp){w._wallQueryStamp=stamp;out.push(w)}
  }
  return out
}
const BUILDING_CELL=96,buildingGrid=new Map();let buildingGridSource=null,buildingGridCount=-1,buildingQueryStamp=0;
const buildingCellKey=(cx,cz)=>cx+','+cz;
function rebuildBuildingGrid(){
  buildingGrid.clear();buildingGridSource=B;buildingGridCount=B.length;
  for(const b of B){
    const minX=Math.floor((b.x-b.w/2)/BUILDING_CELL),maxX=Math.floor((b.x+b.w/2)/BUILDING_CELL),
          minZ=Math.floor((b.z-b.d/2)/BUILDING_CELL),maxZ=Math.floor((b.z+b.d/2)/BUILDING_CELL);
    for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
      const key=buildingCellKey(cx,cz),bucket=buildingGrid.get(key);
      if(bucket)bucket.push(b);else buildingGrid.set(key,[b])
    }
  }
}
function buildingCandidates(x,z,r=0){
  if(buildingGridSource!==B||buildingGridCount!==B.length)rebuildBuildingGrid();
  const out=[],stamp=++buildingQueryStamp,minX=Math.floor((x-r)/BUILDING_CELL),maxX=Math.floor((x+r)/BUILDING_CELL),
        minZ=Math.floor((z-r)/BUILDING_CELL),maxZ=Math.floor((z+r)/BUILDING_CELL);
  for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
    const bucket=buildingGrid.get(buildingCellKey(cx,cz));if(!bucket)continue;
    for(const b of bucket)if(b._buildingQueryStamp!==stamp){b._buildingQueryStamp=stamp;out.push(b)}
  }
  return out
}
const ICON={
med:'<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="9" y="16" width="46" height="34" rx="5" fill="#fff" stroke="#657078" stroke-width="3"/><rect x="18" y="28" width="28" height="9" rx="4.5" fill="#d7ae7c" transform="rotate(-28 32 32.5)"/><circle cx="27" cy="35" r="1.8" fill="#9a6f45"/><circle cx="37" cy="30" r="1.8" fill="#9a6f45"/></svg>',
expl:'<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="24" width="48" height="30" rx="5" fill="#667753" stroke="#25372c" stroke-width="3"/><path d="M14 27 C17 3 22 14 24 27 M22 27 C26 5 33 10 34 27 M32 27 C38 0 45 10 46 27 M42 27 C48 11 53 12 52 27" fill="none" stroke-width="3.3"/><path d="M14 27 C17 3 22 14 24 27" stroke="#dc493d" fill="none" stroke-width="3.3"/><path d="M22 27 C26 5 33 10 34 27" stroke="#35c866" fill="none" stroke-width="3.3"/><path d="M32 27 C38 0 45 10 46 27" stroke="#327cdd" fill="none" stroke-width="3.3"/><rect x="17" y="34" width="30" height="14" rx="2" fill="#172b27"/><text x="32" y="44" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle" fill="#91e795">03:00</text></svg>',
disf:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 12 L30 17 L34 17 L42 12 L54 22 L47 30 L43 27 L43 55 L21 55 L21 27 L17 30 L10 22 Z" fill="#b83232" stroke="#661d1d" stroke-width="3"/><path d="M28 16 Q32 23 36 16" fill="none" stroke="#f0c7a2" stroke-width="3"/></svg>',
mapa:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 13 L25 9 L39 14 L56 10 L56 51 L39 55 L25 50 L8 54 Z" fill="#ead69b" stroke="#7c693c" stroke-width="3"/><path d="M25 9 V50 M39 14 V55" stroke="#a18b56" stroke-width="2"/><rect x="30" y="28" width="15" height="11" fill="#7c4f3a"/><path d="M29 28 L37.5 21 L46 28" fill="#a33b32"/></svg>',
mapa_heli:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 13 L25 9 L39 14 L56 10 L56 51 L39 55 L25 50 L8 54 Z" fill="#d9edf5" stroke="#557986" stroke-width="3"/><path d="M17 33 H49 M32 20 V46" stroke="#557986" stroke-width="2"/><ellipse cx="32" cy="33" rx="11" ry="5" fill="#587766"/><path d="M43 33 H54 M21 33 H10" stroke="#35453c" stroke-width="3"/></svg>',
mapa_tanc:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 13 L25 9 L39 14 L56 10 L56 51 L39 55 L25 50 L8 54 Z" fill="#e5d6a8" stroke="#786b46" stroke-width="3"/><rect x="18" y="31" width="28" height="11" rx="4" fill="#68754b"/><rect x="25" y="25" width="15" height="8" rx="3" fill="#78845b"/><path d="M40 29 H55" stroke="#40473a" stroke-width="3"/></svg>',
bazooka:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 35 L51 18" stroke="#536148" stroke-width="11" stroke-linecap="round"/><path d="M8 38 L17 34" stroke="#252b27" stroke-width="13" stroke-linecap="round"/><path d="M48 20 L56 17" stroke="#252b27" stroke-width="14" stroke-linecap="round"/><path d="M29 30 L25 42" stroke="#2c302d" stroke-width="5" stroke-linecap="round"/><path d="M35 26 L39 18" stroke="#737b74" stroke-width="3"/><circle cx="51" cy="18" r="4" fill="#b76b2d"/></svg>',
franctirador:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M5 35 L53 35" stroke="#343d39" stroke-width="7"/><rect x="20" y="23" width="20" height="8" rx="2" fill="#778577" stroke="#292f2b" stroke-width="2"/><rect x="25" y="17" width="13" height="5" rx="1" fill="#243333"/><path d="M16 36 L8 48 H22 L28 36" fill="#846948" stroke="#3d3126" stroke-width="2"/><rect x="52" y="30" width="7" height="10" rx="1" fill="#242b2b"/><path d="M31 35 L28 46" stroke="#343d39" stroke-width="5"/></svg>',
ganivet:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 52L34 31" stroke="#4d3528" stroke-width="9" stroke-linecap="round"/><path d="M10 55L15 50" stroke="#cba87c" stroke-width="4" stroke-linecap="round"/><path d="M27 29L36 38" stroke="#303b3c" stroke-width="5" stroke-linecap="round"/><path d="M34 31L51 9Q56 6 53 14L42 35Z" fill="#c9d2d2" stroke="#455255" stroke-width="2"/><path d="M35 30L50 13" stroke="#f3faf4" stroke-width="2"/></svg>',
cisalla:'<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke-linecap="round"><path d="M14 56L30 30M50 56L34 30" stroke="#b73a36" stroke-width="8"/><path d="M30 30L24 8M34 30L40 8" stroke="#a3b2b4" stroke-width="6"/><path d="M24 8L32 17 40 8" stroke="#d3dde0" stroke-width="3"/></g><circle cx="32" cy="30" r="6" fill="#414b4c" stroke="#b7c7c9" stroke-width="2"/></svg>',
paracaigudes:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 27 Q32 -5 58 27 Z" fill="#e9d9aa" stroke="#6c5945" stroke-width="3"/><path d="M32 7 Q13 18 6 27 M32 7 Q51 18 58 27 M21 12L21 27 M43 12L43 27" fill="none" stroke="#bb7151" stroke-width="2"/><path d="M6 27L24 49 M58 27L40 49 M32 27V50" fill="none" stroke="#52565a" stroke-width="2"/><rect x="23" y="46" width="18" height="12" rx="2" fill="#70816a"/></svg>',
granada:'<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="31" cy="38" rx="16" ry="18" fill="#4a5842" stroke="#263028" stroke-width="3"/><rect x="27" y="14" width="10" height="10" rx="2" fill="#303632"/><path d="M34 15 C44 8 51 14 48 23" fill="none" stroke="#727b72" stroke-width="4"/><circle cx="48" cy="24" r="5" fill="none" stroke="#727b72" stroke-width="3"/></svg>',
arma:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 19 H54 V50 H10 Z" fill="#75583a" stroke="#3e3024" stroke-width="3"/><path d="M14 24 H50" stroke="#b58a56" stroke-width="3"/><g fill="#d4aa42" stroke="#70591e" stroke-width="1"><circle cx="20" cy="34" r="4"/><circle cx="31" cy="34" r="4"/><circle cx="42" cy="34" r="4"/><circle cx="25" cy="44" r="4"/><circle cx="36" cy="44" r="4"/></g></svg>'
};
const IT={
med:{n:'Farmaciola',c:0xf2f3de,s:[1.2,.8,.8],icon:ICON.med,desc:'Recupera 8 punts de vida.',usable:true},
mapa:{n:'Mapa de l’HQ',c:0xffe27a,s:[1.6,.08,1.2],icon:ICON.mapa,desc:'En recollir-lo, revela immediatament la posició de l’HQ enemic.',usable:false},
mapa_heli:{n:'Mapa d’helicòpters',c:0x9fd7ff,s:[1.6,.08,1.2],icon:ICON.mapa_heli,desc:'En recollir-lo, marca immediatament tots els helicòpters actius al mapa.',usable:false},
mapa_tanc:{n:'Mapa de tancs',c:0xc6b06a,s:[1.6,.08,1.2],icon:ICON.mapa_tanc,desc:'En recollir-lo, marca immediatament tots els tancs actius al mapa.',usable:false},
bazooka:{n:'Bazooka',c:0x58664a,s:[2.1,.45,.45],icon:ICON.bazooka,desc:'Llançacoets amb 3 coets per recollida. La retícula indica el punt d’apuntat i es torna verda si l’autoapuntat fixa un enemic.',usable:true},
franctirador:{n:'Rifle de franctirador',c:0x647366,s:[2.7,.5,.42],icon:ICON.franctirador,desc:'Rifle de llarg abast. 6 cartutxos per recollida; elimina soldats d’un tret. Equipa’l i prem Mira / T per activar l’òptica x8.',usable:true},
paracaigudes:{n:'Paracaigudes',c:0xcfaa74,s:[1.2,.9,.9],icon:ICON.paracaigudes,desc:'Es desplega automàticament en saltar d’un helicòpter en vol. Frena la caiguda i evita els danys de l’aterratge.',usable:false},
cisalla:{n:'Cisalla',c:0xb83f38,s:[1,1.4,.3],icon:ICON.cisalla,desc:'Talla silenciosament un tram de filferrada proper. Equipa-la i prem Talla / F mirant la tanca. No gasta munició ni alerta els enemics.',usable:true},
granada:{n:'Granades',c:0x4a5842,s:[.65,.65,.65],icon:ICON.granada,desc:'Paquet de 5 granades. A peu, mantén Dispar per arribar més lluny i mira la trajectòria. Des de l’helicòpter utilitari, prem Dispar per llançar-ne una de l’inventari.',usable:true},
arma:{n:'Munició',c:0x555b66,s:[1.6,.35,.35],icon:ICON.arma,desc:'Caixa de munició per a l’arma personal.',usable:false},
expl:{n:'Explosius',c:0x617451,s:[.9,.9,.9],icon:ICON.expl,desc:'Bloc d’explosiu plàstic amb cables RGB i temporitzador digital. La càrrega col·locada parpelleja en vermell durant 3 segons i té força destructiva triple.',usable:true},
disf:{n:'Disfressa enemiga',c:0x4a7a3a,s:[1,1.2,.6],icon:ICON.disf,desc:'Camisa enemiga vermella. Activa o desactiva la disfressa.',usable:true}
};
// combat i enemics
let E=[],Pj=[],bombs=[],grenades=[],fx=[],DEAD=[],hp=window.HUNTER_COMBAT_BALANCE.player,ammo=0,disg=false,bazookaEquipped=false,grenadeEquipped=false,cisallaEquipped=false,sniperEquipped=false,knifeEquipped=false,sniperAmmo=0,scopeActive=false,scopePitch=0,scopeYaw=0,over=0,fcd=0,kills=0,intelMarks=[],hqMapKnown=false,playerEject=null,playerFall=null,playerCrouched=false;
// Ojiva compartida per tots els projectils pesats. Eix longitudinal -Z:
// culata cilíndrica a +Z i punta cònica a -Z, com els canons del joc.
// Geometria única reutilitzada, sense crear malles noves per cada tir.
const gHeavy=new THREE.LatheGeometry([
  new THREE.Vector2(0,-.46),new THREE.Vector2(.19,-.46),
  new THREE.Vector2(.24,-.42),new THREE.Vector2(.24,-.34),
  new THREE.Vector2(.18,-.33),new THREE.Vector2(.18,.12),
  new THREE.Vector2(.22,.15),new THREE.Vector2(.19,.23),
  new THREE.Vector2(.12,.36),new THREE.Vector2(0,.48)
],12);
gHeavy.rotateX(-Math.PI/2);
const heavyForward=new THREE.Vector3(0,0,-1);
// Bales lleugeres: petits cilindres allargats, amb l'eix longitudinal -Z.
// Comparteixen geometria i cada projectil s'orienta segons la trajectòria.
const gLight=new THREE.CylinderGeometry(.105,.105,.78,8);
gLight.rotateX(-Math.PI/2);
const endEl=document.getElementById('end'),sphG=new THREE.SphereGeometry(1,10,8),
mB=new THREE.MeshBasicMaterial({color:0xffe45a}),mS=new THREE.MeshBasicMaterial({color:0xff7a1a}),mE=new THREE.MeshBasicMaterial({color:0xff4040}),
// Bales de pistola, franctirador, soldats i tanqueta: petites i blanques.
// Els projectils explosius mantenen el color i volum original.
mW=new THREE.MeshBasicMaterial({color:0xffffff}),SMALL_ARMS_SCALE=.7;
// Cadència compartida entre la tanqueta del jugador i les enemigues.
const TANKETTE_FIRE_INTERVAL=.16;
const EC={
 soldat:{hp:COMBAT_BALANCE.people.soldier,sp:7,rng:32,rate:1.1,dmg:COMBAT_BALANCE.weapons.rifle,spl:0,r:2},
 jeep:{hp:COMBAT_BALANCE.vehicles.cotxe,sp:22,rng:75,rate:1.1,dmg:COMBAT_BALANCE.weapons.rifle,spl:0,r:3.9},
 tanqueta:{hp:COMBAT_BALANCE.vehicles.tanqueta,sp:13,rng:42,rate:TANKETTE_FIRE_INTERVAL,dmg:COMBAT_BALANCE.weapons.tankette,spl:0,r:4.5},
 tanc:{hp:COMBAT_BALANCE.vehicles.tanc,sp:8,rng:100,rate:2.5,dmg:COMBAT_BALANCE.weapons.tank,spl:7,r:6.8},
 torre:{hp:24,sp:0,rng:112.5,rate:.7,dmg:COMBAT_BALANCE.weapons.towerLight,spl:0,r:3},
 patrulla_marina:{hp:COMBAT_BALANCE.vehicles.llanxa,sp:20,rng:245,rate:.4,dmg:COMBAT_BALANCE.weapons.rifle,spl:0,r:7.5},
 general:{hp:COMBAT_BALANCE.people.general,sp:1.45,rng:35,rate:.9,dmg:COMBAT_BALANCE.weapons.pistol,spl:0,r:2}
};
// extres: so, partícules, fauna, diari
let started=0,DIF=1,AC=null,eng=null,seaAudio=null,logb=[],fa=[],pi_=0;const lastS={},rn=(a,b)=>a+Math.random()*(b-a);
const PT=[];for(let i=0;i<100;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false}));m.visible=false;scene.add(m);PT.push({m,life:0,max:1,s:1})}
function puff(x,y,z,c,s,rise=0){const p=PT[pi_++%100];p.life=p.max=1.1;p.s=s;p.rise=rise;p.m.material.color.setHex(c);p.m.position.set(x+rn(-.6,.6),y,z+rn(-.6,.6));p.m.visible=true}
function mark(){const q=cv||P;logb.push({n:'P'+(logb.length+1),x:q.x,z:q.z});msg='Coordenades guardades: '+(q.x|0)+', '+(q.z|0);msgT=2}
function spawnFauna(){fa=[];for(let k=0;k<48;k++){const bird=window.HUNTER_FAUNA.createGull(THREE,{box:bx,material:M}),o=bird.o,wl=bird.wl,wr=bird.wr;world.add(o);
const cx=rn(-H+200,H-200),cz=rn(-H+200,H-200),baseY=rn(25,55);
fa.push({k:'g',o,wl,wr,cx,cz,r:rn(40,120),a:rn(0,6.28),sp:rn(.15,.3),y:baseY,flyY:Math.max(baseY,hAt(cx,cz)+10),x:cx,z:cz})}
for(let k=0;k<30;k++){let cx,cz,n=0;do{cx=rn(-H+150,H-150);cz=rn(-H+150,H-150)}while(hAt(cx,cz)>-6&&++n<60);if(hAt(cx,cz)>-6)continue;
const o=window.HUNTER_FAUNA.createShark(THREE,{material:M});world.add(o);fa.push({k:'s',o,cx,cz,r:rn(12,28),a:rn(0,6.28),sp:rn(.25,.45),x:cx,z:cz,sharkMode:'patrol',biteCd:0})}}
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
  const frac=1-(v.life/(v.maxLife||1));
  if(frac>.08){
    v.smokeT=(v.smokeT||0)-dt;
    if(v.smokeT<=0){
      const baseY=v.o?.position?.y??Math.max(0,hAt(v.x,v.z));
      if(v.smokeTopOffset==null&&v.o){
        v.o.updateMatrixWorld(true);
        const bb=new THREE.Box3().setFromObject(v.o);
        v.smokeTopOffset=Math.max(.7,bb.max.y-baseY);
      }
      // Fum billboarding agrupat en una sola malla per a tots els vehicles.
      if(Math.hypot(v.x-P.x,v.z-P.z)<250)
        movementFx.damageSmoke(v,frac,baseY+(v.smokeTopOffset||1.8));
      v.smokeT=Math.max(.08,.55-frac*.42)
    }
  }
});
// Esteles dels vehicles pilotables i dels enemics; tots els efectes
// comparteixen quatre malles instanciades. LOD de distància al sistema.
const fxContext={playerX:P.x,playerZ:P.z,playerVehicle:cv,
  terrainAt:hAt,waterAt:(x,z)=>wy(x,z,t)};
for(const v of V)movementFx.vehicle(v,dt,fxContext);
fxContext.enemy=true;
for(const u of E)if(ENEMY_TRAIL_TYPES.has(u.t))
  movementFx.vehicle(u,dt,fxContext);
movementFx.update(dt,cam);
 PT.forEach(p=>{if(p.life>0){p.life-=dt;if(p.rise)p.m.position.y+=p.rise*dt;p.m.scale.setScalar(p.s*(1+(1-p.life/p.max)*1.15));p.m.material.opacity=Math.max(0,p.life/p.max)*.8;if(p.life<=0){p.m.visible=false;p.rise=0}}});
if(seaAudio){const coastal=Math.max(.25,1-Math.max(0,hAt(P.x,P.z))/22),
      // La barca de rems, com el windsurf, només fa fregadís d'aigua.
      waterVolume=cv&&(cv.t==='windsurf'||cv.t==='barca_rems')
        ?.026+Math.min(1,Math.abs(cv.v)/22)*.016:.035+coastal*.05;
  seaAudio.gain.gain.setTargetAtTime(over?0:waterVolume,AC.currentTime,.5)}
if(eng){const c=cv?VT[cv.t]:null;
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
  if(seedSearchRunning||seedSearchRunEl.disabled)return;
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
document.querySelectorAll('#ini button[data-d]').forEach(b=>b.onclick=()=>{
  DIF=+b.dataset.d;MAP_SCALE=+(document.querySelector('input[name="mapSize"]:checked')?.value||1);S=4800*MAP_SCALE;H=S/2;
  const rawSeed=seedRandomEl.checked?null:seedFromText(seedInputEl.value||'hunter');
  // No alterar la llavor introduïda: la que es veu al HUD s'ha
  // de poder reintroduir per recuperar exactament el mateix arxipèlag.
  requestedSeed=rawSeed;
  build();minimap.setWorldSize(S,H);minimap.reset();mini();
  // Sense captura WebGL síncrona/toDataURL: evitar bloqueig després de generar el món.
  started=1;iniEl.style.display='none';document.body.classList.add('game-started');initAudio()
});
// animacions de destrucció
const DB=[],WA=[],HR=[],dgeo=new THREE.BoxGeometry(1,1,1),dmc={},dmat=c=>dmc[c]||(dmc[c]=M(c));
function debris(x,y,z,col,n,sz,sp){for(let i=0;i<n;i++){const m=new THREE.Mesh(dgeo,dmat(col)),s=rn(.4,1)*sz;m.scale.set(s,s*rn(.5,1.2),s);m.position.set(x+rn(-1,1),y,z+rn(-1,1));m.rotation.set(rn(0,3),rn(0,3),0);world.add(m);
DB.push({m,s0:m.scale.clone(),vx:rn(-sp,sp),vy:rn(sp*.4,sp*1.3),vz:rn(-sp,sp),rx:rn(-6,6),life:rn(1.2,2)})}
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
function wallBreak(w){const h=w.y1-w.y0-1,parts=w.parts&&w.parts.length?w.parts:[w.m],base=parts[0],col=w.barbed?0x4a4f52:base.material.color.getHex(),cx=(w.x0+w.x1)/2,cz=(w.z0+w.z1)/2;
if(w.parts&&w.parts.length){parts.forEach(m=>m.visible=false)}else if(w.m.visible)WA.push({m:w.m,h,t:.5});else world.remove(w.m);
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
  HR.push({m:b.roof,t:0,dur:1.05,baseY:b.roof.position.y,baseRx:b.roof.rotation.x,baseRz:b.roof.rotation.z,dir:rn(-1,1)<0?-1:1,x:b.x,z:b.z,w:b.w,d:b.d,col});
  for(let i=0;i<12;i++)puff(b.x+rn(-b.w/2,b.w/2),b.fy+rn(1,b.w*.45),b.z+rn(-b.d/2,b.d/2),0x8b8580,3.8);
  for(let i=0;i<10;i++)debris(b.x+rn(-b.w/2,b.w/2),b.fy+rn(1,b.w*.45),b.z+rn(-b.d/2,b.d/2),col,1,.75,6);
}else{
  b.roof.visible=false;
  for(let i=0;i<20;i++)debris(b.x+rn(-b.w/2,b.w/2),y,b.z+rn(-b.d/2,b.d/2),col,1,1.3,9);
  for(let i=0;i<8;i++)puff(b.x+rn(-b.w/2,b.w/2),y,b.z+rn(-b.d/2,b.d/2),0xc9b48a,4.5)
}
snd('boom',.4)}
function updDeb(dt){for(let i=DB.length-1;i>=0;i--){const d=DB[i],m=d.m;d.vy-=28*dt;m.position.x+=d.vx*dt;m.position.y+=d.vy*dt;m.position.z+=d.vz*dt;m.rotation.x+=d.rx*dt;m.rotation.y+=(d.ry||0)*dt;m.rotation.z+=(d.rz||0)*dt;
const g=Math.max(0,hAt(m.position.x,m.position.z))+.2;if(m.position.y<g){m.position.y=g;d.vy*=-.3;d.vx*=.6;d.vz*=.6;d.rx*=d.truckPiece?.38:.82;if(d.ry)d.ry*=d.truckPiece?.38:.82;if(d.rz)d.rz*=d.truckPiece?.38:.82}
d.life-=dt;const fade=d.vehiclePart?.55:.4,k=Math.max(0,Math.min(1,d.life/fade));m.scale.set(d.s0.x*k,d.s0.y*k,d.s0.z*k);if(d.life<=0){world.remove(m);DB.splice(i,1)}}
for(let i=WA.length-1;i>=0;i--){const a=WA[i];a.t-=dt;const s=Math.max(0,a.t/.5);a.m.scale.y=s;a.m.position.y=a.h/2*s;if(a.t<=0){world.remove(a.m);WA.splice(i,1)}}
for(let i=HR.length-1;i>=0;i--){const a=HR[i],m=a.m;a.t+=dt;const p=Math.min(1,a.t/a.dur),e=p*p*(3-2*p);m.rotation.z=a.baseRz+a.dir*e*.62;m.rotation.x=a.baseRx+Math.sin(p*Math.PI)*.08;m.position.y=a.baseY-e*8.5;if(p>.35&&Math.random()<.35)puff(a.x+rn(-a.w/2,a.w/2),Math.max(.4,m.parent.position.y+m.position.y+rn(0,3)),a.z+rn(-a.d/2,a.d/2),0x7c7772,2.4);if(p>=1){m.visible=false;if(m.parent)m.parent.remove(m);HR.splice(i,1)}}
updFA(dt)}
// vegetació
const TG=new Map();
function treeHit(x,z,r){const cx=Math.floor(x/16),cz=Math.floor(z/16);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=TG.get((cx+a)+','+(cz+b));if(L)for(const t of L)if(!(palmsDisabled&&t.p)&&Math.hypot(x-t.x,z-t.z)<t.r+r)return true}return false}
// Col·lisió del jugador amb la silueta REAL del tronc corbat, no només
// amb el cercle de l'arrel. La mateixa corba sinusoïdal s'usa a vegetation.js;
// la rotació i l'escala provenen de la mateixa palmera determinista.
function palmPush(t,r0){
  const height=6.2*t.s,reach=t.r+r0+1.65*t.s;
  if(P.y>t.y+height+.6||P.y+4.2<t.y)return;
  if(Math.abs(P.x-t.x)>reach||Math.abs(P.z-t.z)>reach)return;
  const yawCos=Math.cos(t.yaw),yawSin=Math.sin(t.yaw);
  let overlap=0,nx=0,nz=0;
  // El model a peu fa prop de quatre metres: comprovam tot el cos,
  // incloent espatlles i cap, sense crear malles de col·lisió addicionals.
  for(const offset of [.3,1,1.7,2.4,3.1,3.8]){
    const y=P.y+offset;
    if(y<t.y||y>t.y+height)continue;
    const q=(y-t.y)/height;
    const bend=height*.25*Math.sin(Math.PI*q);
    const trunkX=t.x+bend*yawCos,trunkZ=t.z-bend*yawSin;
    const dx=P.x-trunkX,dz=P.z-trunkZ,d=Math.hypot(dx,dz);
    const bodyRadius=offset>3.1 ? r0*.75 : r0;
    const radius=bodyRadius+t.r*(1-.43*q)+.04*t.s;
    if(d<radius&&radius-d>overlap){
      overlap=radius-d;
      if(d>.0001){nx=dx/d;nz=dz/d}
      else {nx=Math.cos(P.hd);nz=-Math.sin(P.hd)}
    }
  }
  if(overlap>0){P.x+=nx*overlap;P.z+=nz*overlap}
}
function treePush(){
  const r0=.5,cx=Math.floor(P.x/16),cz=Math.floor(P.z/16);
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
    const L=TG.get((cx+a)+','+(cz+b));if(!L)continue;
    for(const t of L){
      if(t.p){if(!palmsDisabled)palmPush(t,r0);continue}
      if(t.rock&&(P.y>t.topY+.6||P.y+1.5<t.bottomY))continue;
      const dx=P.x-t.x,dz=P.z-t.z,d=Math.hypot(dx,dz),m=t.r+r0;
      if(d<m&&d>.001){P.x=t.x+dx/d*m;P.z=t.z+dz/d*m}
    }
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
  for(const v of [...V,...E.filter(u=>['jeep','tanqueta','tanc'].includes(u.t))]){
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
const PG={t:vegetationVisual.geometry.trunk,c:vegetationVisual.geometry.crown,c2:vegetationVisual.geometry.crown2};
let compoundClear=[];
function treeAt(x,z,r){const cx=Math.floor(x/16),cz=Math.floor(z/16);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=TG.get((cx+a)+','+(cz+b));if(L)for(const t of L)if(!(palmsDisabled&&t.p)&&Math.hypot(x-t.x,z-t.z)<t.r+r)return t}return null}
function crush(x,z,r){if(palmsDisabled)return;const cx=Math.floor(x/16),cz=Math.floor(z/16);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=TG.get((cx+a)+','+(cz+b));if(L)L.slice().forEach(t=>{if(t.p&&Math.hypot(x-t.x,z-t.z)<t.r+r)killPalm(t)})}}
function dmgP(t,d){if(!t.alive)return;const amount=wholeDamage(d);if(!amount)return;t.hp=Math.max(0,Math.ceil(t.hp)-amount);if(t.hp<=0)killPalm(t)}
function killPalm(t){if(!t.alive)return;t.alive=false;const a=TG.get(t.k);if(a){const i=a.indexOf(t);if(i>=0)a.splice(i,1)}
// La geometria es gestiona ara en instàncies de cada sector.
if(PM.remove)PM.remove(t.i,ZM);
const y=new THREE.Group(),g=new THREE.Group();y.position.set(t.x,t.y,t.z);y.rotation.y=t.yaw;y.scale.setScalar(t.s);y.add(g);
[[PG.t,0x8a6a3a],[PG.c,0x4fa03a],[PG.c2,0x6fbf3a]].forEach(([ge,c])=>g.add(new THREE.Mesh(ge,dmat(c))));world.add(y);FA.push({y,g,t:0,s:t.s,x:t.x,z:t.z,yaw:t.yaw})}
function updFA(dt){for(let i=FA.length-1;i>=0;i--){const a=FA[i];a.t+=dt;const k=Math.min(1,a.t/.9);a.g.rotation.z=-k*k*1.5;
if(k>=1){const c=Math.cos(a.yaw),s=Math.sin(a.yaw),lx=a.x+c*6.4*a.s,lz=a.z-s*6.4*a.s,ly=Math.max(hAt(lx,lz),0)+.6;
debris(lx,ly,lz,0x4fa03a,8,1,5);debris(a.x+c*3*a.s,ly,a.z-s*3*a.s,0x8a6a3a,4,.7,3);puff(lx,ly,lz,0xc9b48a,3);world.remove(a.y);FA.splice(i,1)}}}
function vegetate(pa){TG.clear();PL.length=0;FA.length=0;const pm=[],bu=[],rk=[],put=e=>{e.k=Math.floor(e.x/16)+','+Math.floor(e.z/16);let a=TG.get(e.k);if(!a)TG.set(e.k,a=[]);a.push(e)};
 const rockSafe=(x,z,r=2)=>Math.abs(x)<H-35&&Math.abs(z)<H-35&&
   !stairs.some(st=>stairContains(st,x,z,r+1))&&
   Math.hypot(x-pa.x,z-pa.z)>16+r&&
   !B.some(b=>Math.abs(x-b.x)<b.w/2+r+4&&Math.abs(z-b.z)<b.d/2+r+4)&&
   !compoundClear.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+r+5);
 const addRock=(x,z,scale,kind)=>{
   if(!rockSafe(x,z,scale*1.45))return false;
   const h=hAt(x,z);if(h<-4.6)return false;
   const tall=kind===1,y=h+(tall?.85:.38)*scale,
     radius=(tall?1.27:1.44)*scale,
     topY=h+(tall?2.3:1.18)*scale;
   rk.push([x,y,z,scale,window.HUNTER_ROCK_FIELDS.rockNoise(x,z,5)*Math.PI*2,0,
     (window.HUNTER_ROCK_FIELDS.rockNoise(x,z,6)-.5)*.33,kind]);
   put({x,z,y,r:radius,rock:true,kind,s:scale,topY,bottomY:h-scale*.5});
   return true;
 };
for(let x=-H+40;x<H-40;x+=14)for(let z=-H+40;z<H-40;z+=14){const px=x+rr(-4,4),pz=z+rr(-4,4),h=hAt(px,pz);if(h<1.3||h>42)continue;
const dn=fbm(px/80+7,pz/80+3),q=R(),highPalm=.22+Math.max(0,Math.min(1,(h-28)/14))*.12;let L=null;
if(h<4)L=q<.12?pm:null;else if(dn>.55&&h<28)L=q<.20?pm:null;else if(h>=28&&q<highPalm)L=pm;else if(dn>.4)L=q<.2?bu:null;else if(h>8&&q<.04)L=rk;else if(q<.024)L=pm;
if(!L||slope(px,pz,h)>4.5)continue;
if(stairs.some(s=>stairContains(s,px,pz,2))||Math.hypot(px-pa.x,pz-pa.z)<14||B.some(b=>Math.abs(px-b.x)<b.w/2+5&&Math.abs(pz-b.z)<b.d/2+5)||compoundClear.some(c=>Math.hypot(px-c.x,pz-c.z)<c.r))continue;
const s=1.15*rr(.75,1.25),yaw=rr(0,6.28);
if(L==pm){const leafVar=R()<.33?-1:R()<.66?0:1,tone=rr(-.25,.25),idx=pm.length;pm.push([px,h-.3,pz,s,yaw,leafVar,tone]);const e={x:px,z:pz,y:h-.3,s,yaw,r:.6*Math.max(.75,s),p:true,alive:true,hp:8,i:idx,leafVar,tone};put(e);PL.push(e)}
else if(L===rk)window.HUNTER_ROCK_FIELDS.baseRockCluster(px,pz,s,addRock);
 else L.push([px,h-.3,pz,s,yaw])}
const rockFieldStats=window.HUNTER_ROCK_FIELDS.generateRockFields({
  islands,hAt,canPlace:rockSafe,addRock
});
world.userData.rockFieldStats={...rockFieldStats,totalRocks:rk.length};
if(seedSearchMode){
  // vegetationVisual.build consumeix 11 tirades/palmera (tronc + dues
  // copes), 3/arbust i 5/roca. Preservam EXACTAMENT l'estat final del
  // generador R sense construir cap InstancedMesh.
  for(let n=pm.length*11+bu.length*3+rk.length*5;n>0;n--)R();
  PM={stats:{},update(){},remove(){}};return;
}
const vegetationMeshes=vegetationVisual.build({
  world,palms:pm,bushes:bu,rocks:rk,playerX:pa.x,playerZ:pa.z,
  lowQuality:!visualQuality.shadows,lodProfile:qualityName
});
PM=vegetationMeshes.palms;
window.HUNTER_VEGETATION_STATS={...PM.stats,rockFields:rockFieldStats}}
function fr(x,z){let a=1e9,b=-1e9;for(const[i,j]of[[0,0],[9,9],[-9,9],[9,-9],[-9,-9],[9,0],[-9,0],[0,9],[0,-9]]){const h=hAt(x+i,z+j);a=Math.min(a,h);b=Math.max(b,h)}return b-a}
function checkRoofSupport(b,w){
  if(!b||b.rb||b.hangar||b.kind==='enemy_bunker'||!w||!w.supportWeight)return;
  if(!w.supportCounted){
    w.supportCounted=true;
    b.destroyedWallSupport=(b.destroyedWallSupport||0)+w.supportWeight;
  }
  if(b.destroyedWallSupport>=3)roofBreak(b)
}
function dmgW(w,d){if(w.towerLegOwner){if(!w.towerLegOwner.destroyed)hurtE(w.towerLegOwner,d);return}const amount=wholeDamage(d);if(!amount||!Number.isFinite(w.hp))return;w.hp=Math.max(0,Math.ceil(w.hp)-amount);if(w.hp<=0){wallBreak(w);let i=Wl.indexOf(w);if(i>=0){Wl.splice(i,1);wallGridCount=-1}i=Dr.indexOf(w);if(i>=0)Dr.splice(i,1);if(w.stairStructure)destroyInteriorStair(w.stairStructure.owner);checkRoofSupport(w.owner,w);snd('boom',.3)}}
function mkB(x,z,w,d,h,col,roof,opt={}){const fy=hAt(x,z),visual=seedSearchMode
  ?{group:new THREE.Group(),walls:null,doors:null,roof:new THREE.Group()}
  :(opt.hangar?buildingVisual.createHangarShell:buildingVisual.createShell)({width:w,depth:d,height:h,wallColor:col,roofColor:roof}),
  g=visual.group,wm=visual.walls,dm=visual.doors,t=.8,dw=opt.doorWidth||2.5,ds=opt.doorSide==null?Math.floor(R()*4):opt.doorSide,structuralWalls=[];
const wallH=opt.floors===2?h/2:h;
let entranceDoor=null;
const seg=(lx,lz,sx,sz,dr,windows=false,supportSide=null,supportWeight=0,level=0)=>{if(!dr){const parts=seedSearchMode?[new THREE.Object3D()]:windows?buildingVisual.addWindowedWall(g,{lx,lz,sx,sz,height:wallH,material:wm}):[buildingVisual.addWall(g,{lx,lz,sx,sz,height:wallH,material:wm})],m=parts[0],o={x0:x+lx-sx/2,x1:x+lx+sx/2,z0:z+lz-sz/2,z1:z+lz+sz/2,y0:fy+level-(level?0:1),y1:fy+level+wallH,hp:12,m,parts:windows?parts:null,door:false,open:false,rammable:true,cx:x+lx,cz:z+lz,supportSide,supportWeight};for(const mesh of parts)mesh.position.y+=level;if(opt.wood){for(const mesh of parts)if(mesh.material?.color?.getHex()===0x3e7185)mesh.visible=false;}Wl.push(o);if(supportWeight>0)structuralWalls.push(o);return}
const parts=seedSearchMode?{door:new THREE.Object3D(),doorHeight:opt.doorHeight||4.4}:buildingVisual.addDoor(g,{lx,lz,sx,sz,height:wallH,wallMaterial:wm,doorMaterial:dm,doorHeight:opt.doorHeight||4.4}),normal=[[0,1],[0,-1],[1,0],[-1,0]][ds],door={x0:x+lx-sx/2,x1:x+lx+sx/2,z0:z+lz-sz/2,z1:z+lz+sz/2,y0:fy-1,y1:fy+parts.doorHeight,hp:8,m:parts.door,door:true,open:!!opt.openDoor,alwaysOpen:!!opt.openDoor,locked:!!opt.lockedDoor,cx:x+lx,cz:z+lz,nx:normal[0],nz:normal[1],doorWidth:dw,doorHeight:parts.doorHeight,bunkerGate:!!opt.bunker,openProgress:opt.bunker?0:null,openDuration:opt.bunker?10:null,closedLocalY:parts.door.position.y};Wl.push(door);Dr.push(door);entranceDoor=door;
if(parts.lintel)Wl.push({x0:door.x0,x1:door.x1,z0:door.z0,z1:door.z1,y0:fy+parts.doorHeight,y1:fy+h,hp:12,m:parts.lintel,door:false,open:false,playerBlock:false,cx:x+lx,cz:z+lz})};
if(opt.hangar){
  const sh=Math.max(3.1,h*.3),push=(lx,lz,sx,sz)=>{
    const m=seedSearchMode?new THREE.Object3D():buildingVisual.addWall(g,{lx,lz,sx,sz,height:sh,material:wm}),o={x0:x+lx-sx/2,x1:x+lx+sx/2,z0:z+lz-sz/2,z1:z+lz+sz/2,y0:fy-1,y1:fy+sh,hp:16,m,door:false,open:false,rammable:true,cx:x+lx,cz:z+lz};Wl.push(o);return o
  };
  // Sense parets laterals ni paret rectangular posterior:
  // el compound afegeix una sola paret semicircular al fons amb col·lisió pròpia.
  // Aquí només calen els dos muntants de la boca frontal.
  const frontZ=ds===0?d/2-t/2:-d/2+t/2,sl=Math.max(.5,(w-dw)/2),off=dw/2+sl/2;
  push(-off,frontZ,sl,t);push(off,frontZ,sl,t);
}else{
  [[0,d/2-t/2,w,t,0],[0,-d/2+t/2,w,t,0],[w/2-t/2,0,t,d-2*t,1],[-w/2+t/2,0,t,d-2*t,1]].forEach(([cx,cz,sx,sz,ax],k)=>{if(k!=ds){seg(cx,cz,sx,sz,0,!opt.bunker&&!opt.solidWalls,k,1);return}const L=ax?sz:sx,sl=(L-dw)/2,off=dw/2+sl/2;for(const q of[-1,1]){if(ax)seg(cx,cz+q*off,sx,sl,0,false,k,.5);else seg(cx+q*off,cz,sl,sz,0,false,k,.5)}if(ax)seg(cx,cz,sx,dw,1);else seg(cx,cz,dw,sz,1)});
  if(!opt.noPartitions&&!opt.bunker&&w*d>=140&&R()<.5){const al=w>=d,L=al?d:w,gp=rr(-L/4,L/4),px=(R()<.5?-1:1)*rr((al?w:d)*.12,(al?w:d)*.2),a0=-L/2+t,a1=L/2-t,ps=(a,b)=>{if(b-a<.5)return;const cc=(a+b)/2,l=b-a;if(al)seg(px,cc,t,l);else seg(cc,px,l,t)};ps(a0,gp-1.6);ps(gp+1.6,a1)}
}
if(opt.floors===2)for(const [cx,cz,sx,sz]of[[0,d/2-t/2,w,t],[0,-d/2+t/2,w,t],[w/2-t/2,0,t,d-2*t],[-w/2+t/2,0,t,d-2*t]])seg(cx,cz,sx,sz,0,!opt.solidWalls,null,0,wallH);
g.position.set(x,fy,z);if(!seedSearchMode)world.add(g);
const b={o:g,x,z,hw:w/2+1.5,hd:d/2+1.5,w,d,h,fy,wm,dm,roof:visual.roof,foundation:visual.foundation,rhp:opt.hangar?12:16,hangar:!!opt.hangar,door:entranceDoor,doorSide:ds,doorWidth:dw,kind:opt.kind||'house',structuralWalls,destroyedWallSupport:0};structuralWalls.forEach(w=>w.owner=b);B.push(b);if(opt.hangar)addRampAccess(b,ds);else addStairs(b,ds);return b}
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
      z0:z+lz-sz/2,z1:z+lz+sz/2,y0:b.fy-1,y1:b.fy+8,hp:12,
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
  const wall=(lx,lz,sx,sz)=>{const m=buildingVisual.addWall(g,{lx,lz,sx,sz,height:8,material:b.wm});Wl.push({x0:x+lx-sx/2,x1:x+lx+sx/2,z0:z+lz-sz/2,z1:z+lz+sz/2,y0:b.fy-1,y1:b.fy+8,hp:12,m,door:false,open:false,rammable:true,cx:x+lx,cz:z+lz,owner:b})};
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
  const random=mul((seed^Math.imul(Math.round(b.x),73856093)^Math.imul(Math.round(b.z),19349663)^0x6e7b32e1)>>>0);
  const variant=Math.floor(random()*4),floorY=b.fy-9.15,
        // Prop del doble de superfície útil: cambres i passadís més amples
        // sense engrandir el volum exterior de la fortificació.
        halfX=27.0,halfZ=23.0,stairSide=(variant&1)?-1:1,
        divisions=[-7.0+(variant%2)*1.3,6.4+Math.floor(variant/2)*1.3],
        westDoors=[-15+(variant%2)*.7,0+Math.floor(variant/2)*.7,15-(variant%2)],
        // Allunyam l'envà del final de l'escala: més de 8 m de replà
        // per poder girar i veure la sala quan s'arriba a baix.
        eastDivider=-stairSide*7,
        stairX=(variant&2)?14.6:10.8,
        stairTop=stairSide*13.6,stairBottom=stairSide*1.3;
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
    bx(b.o,xb-xa,.26,zb-za,color,(xa+xb)/2,level-.13,(za+zb)/2,'masonry');
  };
  // Forjat amb un buit real per a l'escala. Els projectils impacten al
  // forjat però no bloqueja lateralment el moviment del jugador.
  const slab=(xa,xb,za,zb)=>{
    if(!seedSearchMode){
      const before=b.o.children.length;
      floorPanel(xa,xb,za,zb,.22,0x8e9588);
      for(const mesh of b.o.children.slice(before)){
        mesh.name='bunker-forjat-opac';
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
  // La part nova del soterrani queda coberta, sota el terreny.
  // No engrandim el forat exterior de l'escala ni el forjat superior.
  if(!seedSearchMode){
    const cover=(xa,xb,za,zb)=>floorPanel(xa,xb,za,zb,-1.05,0x545e58);
    cover(-halfX,-19.2,-halfZ,halfZ);
    cover(19.2,halfX,-halfZ,halfZ);
    cover(-19.2,19.2,-halfZ,-16.2);
    cover(-19.2,19.2,16.2,halfZ);
  }
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
      bunkerInteriorDoor:true,openProgress:0,doorHeight,
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
function bunkerSubFloorAt(x,z,previous=-Infinity){
  const b=activeBunker;if(!b?.basement)return null;
  const p=buildingLocalPoint(b,x,z);
  if(Math.abs(p.x)>b.basement.halfX-.4||Math.abs(p.z)>b.basement.halfZ-.4)return null;
  const st=b.basement.stair;
  if(Math.abs(p.x-st.x)<=st.width/2&&
     p.z>=Math.min(st.zTop,st.zBottom)&&
     p.z<=Math.max(st.zTop,st.zBottom)){
    const t=(p.z-st.zTop)/(st.zBottom-st.zTop);
    return b.fy+.22-t*(b.fy+.22-b.basement.floorY);
  }
  if(previous<b.fy-3.9)return b.basement.floorY;
  // El forjat superior només existeix sota l'edifici visible, no sobre
  // tot el soterrani ampliat: a fora deixam actuar el terreny natural.
  return Math.abs(p.x)<=19&&Math.abs(p.z)<=16?b.fy+.22:null;
}
// Door-aligned treads share the exact same geometry and walking height.
function stairLocal(s,x,z){const dx=x-s.x,dz=z-s.z;return{along:dx*s.nx+dz*s.nz,side:dx*s.nz-dz*s.nx}}
function stairContains(s,x,z,margin=0){const q=stairLocal(s,x,z);return q.along>=-margin&&q.along<=s.length+margin&&Math.abs(q.side)<=s.width/2+margin}
// Els molls no tenen barrera lateral: rampes i unions en T són transitables,
// i el personatge pot abandonar el pantalà cap a l'aigua.
// L'altura comprovada a groundAt evita l'ascens instantani des de l'aigua.
function groundAt(x,z,previous=-Infinity){
  const bunkerFloor=bunkerSubFloorAt(x,z,previous);
  if(bunkerFloor!==null)return bunkerFloor;
  // No enfonsar el model sota els triangles que dibuixa el LOD actual.
  // Preservem l'altura física si és més alta (evita enfonsaments i salts negatius).
  const physical=hAt(x,z),visible=terrainStream?.visibleHeightAt(x,z);
  let y=visible===null||visible===undefined?physical:Math.max(physical,visible);for(const s of stairs){if(s.internal&&s.owner?.rb)continue;if(stairContains(s,x,z)){const q=stairLocal(s,x,z);if(s.ramp){const t=Math.max(0,Math.min(1,q.along/s.length));y=Math.max(y,s.top+(s.bottom-s.top)*t)}else{const i=Math.min(s.steps-1,Math.max(0,Math.floor(q.along/s.tread)));y=Math.max(y,s.top-i*s.rise)}}}
// En entrar des de l'aigua, P.y és massa baix per quedar-se damunt
 // la plataforma. La rampa ascendeix de forma contínua fins a la coberta.
 for(const p of piers){const dx=x-p.x,dz=z-p.z,along=dx*p.ux+dz*p.uz,side=dx*p.px+dz*p.pz;if(Math.abs(along)<=p.length/2+.35&&Math.abs(side)<=p.width/2+.2&&
    (!Number.isFinite(previous)||previous>=p.y-.55))y=Math.max(y,p.y)}
for(const b of buildingCandidates(x,z)){const floor=upperFloorHeight(b,x,z,previous);if(floor!==null)y=Math.max(y,floor)}
// Un personatge que ja és damunt una coberta sòlida hi continua caminant.
// La comprovació d'altura impedeix pujar-hi per art de màgia des del carrer.
if(Number.isFinite(previous))for(const b of buildingCandidates(x,z)){
  const roof=solidRoofAt(b,x,z);
  if(roof&&previous>=roof.top-.22)y=Math.max(y,roof.top+.05);
}
const ramp=terminalRampHeight(x,z);if(ramp!==null)y=Math.max(y,ramp);if(Number.isFinite(previous)){const deck=pedestrianFerry(x,z,previous);if(deck)y=Math.max(y,deck.y)}
return y}
function addRampAccess(b,side){const [nx,nz]=[[0,1],[0,-1],[1,0],[-1,0]][side],edge=(nx?b.w:b.d)/2+.2,x=b.x+nx*edge,z=b.z+nz*edge,top=b.fy+.3;
let length=8,bottom=hAt(x+nx*length,z+nz*length);for(let L=8;L<=26;L+=2){const yy=hAt(x+nx*L,z+nz*L);if(Math.abs(top-yy)<Math.abs(top-bottom)){length=L;bottom=yy}if(Math.abs(top-yy)<.35){length=L;bottom=yy;break}}
if(Math.abs(top-bottom)<.1)return;const width=Math.max(6,Math.min(b.doorWidth-.8,30)),r={x,z,nx,nz,top,bottom,length,width,ramp:true};stairs.push(r);b.stair=r;
if(!seedSearchMode)buildingVisual.addRamp(b.o,{alongAxis:!!nx,length,width,top:top-b.fy,bottom:bottom-b.fy,x:x-b.x+nx*length/2,z:z-b.z+nz*length/2,color:0x8f918e,direction:nx||nz})}
function addStairs(b,side){const [nx,nz]=[[0,1],[0,-1],[1,0],[-1,0]][side],edge=(nx?b.w:b.d)/2+.15,x=b.x+nx*edge,z=b.z+nz*edge,top=b.fy+.3;
if(top-hAt(x,z)<.12)return;
const tread=.75;let steps=1;for(;steps<80;steps++){const end=steps*tread;if(top-hAt(x+nx*end,z+nz*end)<=steps*.32)break}
const length=steps*tread,bottom=hAt(x+nx*length,z+nz*length),rise=Math.max(0,(top-bottom)/steps),s={x,z,nx,nz,top,steps,tread,length,rise,width:4.2};stairs.push(s);b.stair=s;
if(!seedSearchMode)for(let i=0;i<steps;i++){const a=(i+.5)*tread,xx=x+nx*a,zz=z+nz*a,y=top-i*rise,base=Math.min(y-.16,hAt(xx,zz)-.15);buildingVisual.addStep(b.o,{alongAxis:!!nx,riseWidth:tread,height:y-b.fy,base:base-b.fy,x:xx-b.x,z:zz-b.z,color:i%2?0xa69982:0xb5a68e})}
}
function wallPush(){const r=.6;for(const w of wallCandidates(P.x,P.z,r)){if(w.playerBlock===false||w.y0>P.y+3.1||w.y1<P.y+.15)continue;if(w.towerLegOwner&&(P.y+1.5<w.y0||P.y>w.y1))continue;if(!w.open&&P.x>w.x0-r&&P.x<w.x1+r&&P.z>w.z0-r&&P.z<w.z1+r){const a=[P.x-(w.x0-r),w.x1+r-P.x,P.z-(w.z0-r),w.z1+r-P.z],i=a.indexOf(Math.min(...a));
if(i==0)P.x=w.x0-r;else if(i==1)P.x=w.x1+r;else if(i==2)P.z=w.z0-r;else P.z=w.z1+r}}}
function updateDoors(dt){
  for(const d of Dr){
    if(d.bunkerInteriorDoor){
      const nearPlayer=!cv&&P.y<d.owner.fy-2&&
        Math.hypot(P.x-d.cx,P.z-d.cz)<5.6;
      const nearSoldier=enemyCandidatesAt(d.cx,d.cz,5.7).some(u=>
        (u.t==='soldat'||u.t==='general')&&u.hp>0&&
        u.y<d.owner.fy-2&&Math.hypot(u.x-d.cx,u.z-d.cz)<5.6);
      const target=nearPlayer||nearSoldier;
      d.openProgress=Math.max(0,Math.min(1,d.openProgress+
        (target?dt/1.15:-dt/1.6)));
      const p=d.openProgress,ease=p*p*(3-2*p);
      d.m.position.y=d.closedLocalY+(d.doorHeight+.55)*ease;
      d.m.visible=p<.98;
      d.open=p>.86;
      continue;
    }
    if(d.bunkerGate){
      const dx=P.x-d.cx,dz=P.z-d.cz,front=dx*d.nx+dz*d.nz,side=Math.abs(dx*d.nz-dz*d.nx),
            inFront=!cv&&front>=0&&front<=4.8&&side<=d.doorWidth/2+1.15;
      if(inFront&&d.openProgress<1){
        if(d.openProgress===0)window.HUNTER_STEALTH.emit('door',d.cx,(d.y0??hAt(d.cx,d.cz))+1,d.cz);
        d.openProgress=Math.min(1,d.openProgress+dt/d.openDuration);
        msg='Obrint porta del búnquer… '+Math.round(d.openProgress*100)+'%';msgT=.25
      }
      const p=d.openProgress,ease=p*p*(3-2*p);
      d.m.scale.y=Math.max(.025,1-ease);
      d.m.position.y=d.closedLocalY+d.doorHeight*ease*.5;
      d.m.visible=p<.999;
      d.open=p>=.999;
      continue
    }
    const dx=P.x-d.cx,dz=P.z-d.cz,r=d.open?6:4.5,
      soldierNear=!d.locked&&enemyCandidatesAt(d.cx,d.cz,4.7).some(u=>
        (u.t==='soldat'||u.t==='general')&&Math.hypot(u.x-d.cx,u.z-d.cz)<4.5),
      o=d.alwaysOpen||(!d.locked&&((!cv&&dx*dx+dz*dz<r*r)||soldierNear));
    if(!d.open&&o&&!cv&&dx*dx+dz*dz<r*r)
      window.HUNTER_STEALTH.emit('door',d.cx,(d.y0??hAt(d.cx,d.cz))+1,d.cz);
    d.open=o;d.m.visible=!o
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
  else if(t==='granada'){for(const [x,z] of[[-.35,-.24],[0,-.24],[.35,-.24],[-.18,.22],[.18,.22]]){const body=new THREE.Mesh(new THREE.SphereGeometry(.17,8,6),M(0x4a5842,'metal'));body.scale.set(.88,1.08,.88);body.position.set(x,.42,z);g.add(body);bx(g,.07,.12,.07,0x252b27,x,.61,z,'metal')}}
  else if(t==='disf'){bx(g,.78,1.3,.16,0xb53232,0,.8,0,'paint');const l=bx(g,.7,.38,.16,0xb53232,-.62,1.18,0,'paint'),r=bx(g,.7,.38,.16,0xb53232,.62,1.18,0,'paint');l.rotation.z=-.55;r.rotation.z=.55;bx(g,.16,.18,.18,0xf1c7a1,0,1.44,0,'organic');bx(g,.08,1.05,.19,0x6f1f1f,0,.75,-.02,'paint')}
  else bx(g,...IT[t].s,IT[t].c,0,.4,0,'paint');
  return g}
// Restriccions de botí compartides pel generador de complexos i pels
// objectes aleatoris. Només afecten objectes recollibles, NO vehicles ni
// decoració: els tancs continuen dins els hangars.
const LOOT_MAPS=new Set(['mapa','mapa_heli','mapa_tanc']);
const LOOT_WEAPONS=new Set(['bazooka','franctirador','granada','expl']);
function itemInsideHangar(x,z){
  return B.some(b=>b.hangar&&Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2);
}
function lootAllowed(t,b=null,x=null,z=null,compound=null){
  if(b?.hangar)return false;
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
function itemHeightInBuilding(b,x,z){
  if(!b)return hAt(x,z)+1.3;
  const n=buildingItemCount(b),
        firstUpper=Math.floor(Math.abs(b.x*1.341+b.z*1.733))%2,
        upstairs=b.floors===2&&!b.rb&&!!b.interiorStair&&
          !stairContains(b.interiorStair,x,z,.6)&&
          (n+firstUpper)%2===1;
  return b.fy+(upstairs?b.storey:0)+1.3;
}
function canPlaceItem(t,b,compound){
  if(b&&buildingItemCount(b)>=MAX_BUILDING_ITEMS)return false;
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
function addIt(t,b){
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
  const y=itemHeightInBuilding(b,x,z),o=seedSearchMode?null:createItemVisual(t);
  if(o){o.position.set(x,y,z);world.add(o)}
  const item={t,x,z,y,o,building:b,compound:b.compound||null};
  items.push(item);return o||item;
}
function flag(x,z,c){if(!seedSearchMode)world.add(buildingVisual.createFlag({x,y:hAt(x,z),z,color:c}))}
// jugador i vehicles
const bx=(g,w,h,d,c,x,y,z,profile='organic')=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c,profile));m.position.set(x,y,z);g.add(m);return m};
const buildingVisual=window.HUNTER_BUILDINGS.create(THREE,{material:M,materialProfile,box:bx});
const pl=window.HUNTER_CHARACTERS.createPlayer(THREE,{box:bx});scene.add(pl);
const animPl=(f,dt,running=false,strafe=0)=>window.HUNTER_CHARACTERS.animatePlayer(pl,{
  forward:f,strafe,dt,running,crouching:playerCrouched&&!cv&&!swimming&&!playerFall&&!playerEject&&!scopeActive,
  swimming,inVehicle:!!cv,ammo,bazookaEquipped,grenadeEquipped,cisallaEquipped,sniperEquipped,
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
function fenceVehicleContact(w,box){
  if(!w.barbed||!Number.isFinite(w.ax)||!Number.isFinite(w.bx))return null;
  const s=Math.sin(box.hd),c=Math.cos(box.hd),
        local=(x,z)=>{const dx=x-box.x,dz=z-box.z;return{x:dx*c-dz*s,z:dx*s+dz*c}},
        a=local(w.ax,w.az),b=local(w.bx,w.bz),
        dx=b.x-a.x,dz=b.z-a.z,hw=box.w/2+.3,hd=box.d/2+.3,
        p=[-dx,dx,-dz,dz],q=[a.x+hw,hw-a.x,a.z+hd,hd-a.z];
  let enter=0,leave=1;
  for(let i=0;i<4;i++){
    if(Math.abs(p[i])<1e-9){if(q[i]<0)return null;continue}
    const t=q[i]/p[i];
    if(p[i]<0)enter=Math.max(enter,t);else leave=Math.min(leave,t);
    if(enter>leave)return null;
  }
  // Els fragments apareixen al punt tocat pel frontal i no al centre del tram.
  const travel=box.v?.v<0?-1:1,nose=local(
    box.x-Math.sin(box.hd)*travel*box.d/2,
    box.z-Math.cos(box.hd)*travel*box.d/2),
    d2=dx*dx+dz*dz,
    t=d2>1e-9?Math.max(enter,Math.min(leave,((nose.x-a.x)*dx+(nose.z-a.z)*dz)/d2)):enter;
  return{x:w.ax+(w.bx-w.ax)*t,z:w.az+(w.bz-w.az)*t};
}
const obbAxes=b=>{const s=Math.sin(b.hd),c=Math.cos(b.hd);return[{x:c,z:-s},{x:s,z:c}]};
const obbOverlap=(a,b)=>{const A=obbAxes(a),B=obbAxes(b),dx=b.x-a.x,dz=b.z-a.z,axes=[...A,...B];for(const ax of axes){const dist=Math.abs(dx*ax.x+dz*ax.z),ra=Math.abs(A[0].x*ax.x+A[0].z*ax.z)*a.w/2+Math.abs(A[1].x*ax.x+A[1].z*ax.z)*a.d/2,rb=Math.abs(B[0].x*ax.x+B[0].z*ax.z)*b.w/2+Math.abs(B[1].x*ax.x+B[1].z*ax.z)*b.d/2;if(dist>ra+rb)return false}return true};
const circleVehicleOverlap=(x,z,r,v)=>{const b=vehicleBox(v),dx=x-b.x,dz=z-b.z,s=Math.sin(b.hd),c=Math.cos(b.hd),lx=dx*c-dz*s,lz=dx*s+dz*c,cx=Math.max(-b.w/2,Math.min(b.w/2,lx)),cz=Math.max(-b.d/2,Math.min(b.d/2,lz)),ex=lx-cx,ez=lz-cz;return ex*ex+ez*ez<r*r};
const vehicleY=v=>v.alt!=null&&VT[vehicleHitType(v.t)]?.m==='a'?v.alt:(v.o?.position?.y??Math.max(0,hAt(v.x,v.z)));
const vehicleHeightCompatible=(a,b)=>Math.abs(vehicleY(a)-vehicleY(b))<Math.max(2.2,Math.min(vehicleRadius(vehicleHitType(a.t)),vehicleRadius(vehicleHitType(b.t)))*.55);
const VEHICLE_CELL=64,vehicleGrid=new Map(),playerVehicleGrid=new Map(),enemyGrid=new Map(),vehicleCellKey=(cx,cz)=>cx+','+cz;
let vehicleGridVSource=null,vehicleGridESource=null;
const addVehicleToGrid=(grid,v)=>{const key=vehicleCellKey(Math.floor(v.x/VEHICLE_CELL),Math.floor(v.z/VEHICLE_CELL)),bucket=grid.get(key);if(bucket)bucket.push(v);else grid.set(key,[v])};
function rebuildVehicleGrid(){
  vehicleGrid.clear();playerVehicleGrid.clear();enemyGrid.clear();vehicleGridVSource=V;vehicleGridESource=E;
  for(const v of V)if(!v.destroyed){addVehicleToGrid(vehicleGrid,v);addVehicleToGrid(playerVehicleGrid,v)}
  for(const u of E)if(!u.destroyed){addVehicleToGrid(enemyGrid,u);if(u.t==='jeep'||u.t==='tanqueta'||u.t==='tanc'||u.t==='patrulla_marina')addVehicleToGrid(vehicleGrid,u)}
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
  return f.o.position.y+(deck+(d.rampY*sc-deck)*q)
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
    if(includeRamp&&az-ez<=fl+r+.65&&az<=fl+r+ez+.65&&
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
const fenceMaterial=new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,flatShading:true});
const fencePostTemplate=new THREE.CylinderGeometry(.12,.16,1,6).toNonIndexed();
const fenceWireTemplate=new THREE.CylinderGeometry(1,1,1,6).toNonIndexed();
const fenceUp=new THREE.Vector3(0,1,0);
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
  const y1=Math.max(hAt(x1,z1),0),y2=Math.max(hAt(x2,z2),0),
        dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L,
        px=-uz,pz=ux,Hw=4.9,cx=(x1+x2)/2,cz=(z1+z2)/2,parts=[];
  const posA=new THREE.Vector3(),posB=new THREE.Vector3(),
        direction=new THREE.Vector3(),center=new THREE.Vector3(),
        rotation=new THREE.Quaternion(),size=new THREE.Vector3(),
        transform=new THREE.Matrix4();
  const items=[];
  const addCylinder=(ax,ay,az,bx,by,bz,r,color,post=false)=>{
    posA.set(ax,ay,az);posB.set(bx,by,bz);
    direction.subVectors(posB,posA);const len=direction.length();
    if(len<.001)return;
    center.copy(posA).add(posB).multiplyScalar(.5);
    rotation.setFromUnitVectors(fenceUp,direction.multiplyScalar(1/len));
    size.set(post?1:r,len,post?1:r);
    transform.compose(center,rotation,size);
    items.push({geo:post?fencePostTemplate:fenceWireTemplate,matrix:transform.clone(),color:new THREE.Color(color)});
  };
  for(const [x,z,y] of [[x1,z1,y1],[x2,z2,y2]])
    addCylinder(x,y,z,x,y+Hw,z,1,0x4a4f52,true);
  for(const h of [.55,1.55,2.55,3.55,4.35])
    addCylinder(x1,y1+h,z1,x2,y2+h,z2,.028,0x30363a);
  for(const [a,b] of [[.6,2.5],[2.5,4.35],[4.35,2.5],[2.5,.6]])
    addCylinder(x1,y1+a,z1,x2,y2+b,z2,.024,0x353b3e);
  for(let n=0;n<4;n++){
    const a=(n+.12)/4,b=(n+.88)/4,
          xa=x1+dx*a,za=z1+dz*a,xb=x1+dx*b,zb=z1+dz*b,
          ya=Math.max(hAt(xa,za),0)+4.72,
          yb=Math.max(hAt(xb,zb),0)+4.72,
          side=n%2?-.22:.22;
    addCylinder(xa+px*side,ya,za+pz*side,xb-px*side,yb,zb-pz*side,.024,0x292f32);
  }
  const vertices=items.reduce((sum,item)=>sum+item.geo.attributes.position.count,0),
        positions=new Float32Array(vertices*3),normals=new Float32Array(vertices*3),
        colors=new Float32Array(vertices*3);
  const p=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
  let offset=0;
  for(const {geo,matrix,color} of items){
    const srcPos=geo.attributes.position,srcNorm=geo.attributes.normal;
    normalMatrix.getNormalMatrix(matrix);
    for(let v=0;v<srcPos.count;v++){
      const at=(offset+v)*3;
      p.fromBufferAttribute(srcPos,v).applyMatrix4(matrix);
      normal.fromBufferAttribute(srcNorm,v).applyMatrix3(normalMatrix).normalize();
      positions[at]=p.x-cx;positions[at+1]=p.y;positions[at+2]=p.z-cz;
      normals[at]=normal.x;normals[at+1]=normal.y;normals[at+2]=normal.z;
      colors[at]=color.r;colors[at+1]=color.g;colors[at+2]=color.b;
    }
    offset+=srcPos.count;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,fenceMaterial);
  mesh.name='hunter-fence-section';
  mesh.position.set(cx,0,cz);
  mesh.castShadow=false;mesh.receiveShadow=false;
  mesh.userData.noCastShadow=true;
  mesh.userData.noReceiveShadow=true;
  world.add(mesh);parts.push(mesh);
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
// minimapa
const mc=document.getElementById('mm');
const minimap=window.HUNTER_MINIMAP.create({
  THREE,canvas:mc,worldSize:S,halfSize:H,heightAt:hAt,colorAt:window.HUNTER_TERRAIN.colorAt,
  getState:()=>({base:P.base,hq:HQ,mapKnown:hqMapKnown||!!inv.mapa,current:cv||P,currentVehicle:cv,vehicles:V,enemies:E,log:logb,intel:intelMarks})
});
window.HUNTER_MINIMAP_STATS=minimap.stats;
const mini=()=>minimap.draw();
// control
let paused=false,muted=false,zoom=1,waypoint=null,elapsed=0,uiTick=0,worldVisualTick=0,palmVisualTick=0;
const LOD_NEAR2=500*500,LOD_MID2=1200*1200,ITEM_ANIM2=500*500,FAUNA_NEAR2=650*650,FAUNA_MID2=1400*1400;
// Distàncies visuals per família. NO afecten danys, física, IA ni mapa.
const VISUAL_RANGES={
  desktop:{buildings:1650,fences:1020,props:1300,vehicles:2080,enemies:1850,items:1000,fauna:1350,antennas:1750},
  mobile:{buildings:980,fences:580,props:750,vehicles:1200,enemies:1050,items:620,fauna:790,antennas:1100},
  ultra:{buildings:650,fences:400,props:540,vehicles:780,enemies:700,items:450,fauna:530,antennas:770}
}[qualityName]||{buildings:1200,fences:790,props:990,vehicles:1620,enemies:1410,items:800,fauna:1100,antennas:1360};
const visibilityStats={buildings:0,fences:0,props:0,vehicles:0,enemies:0,items:0,fauna:0,antennas:0,terrainOccluded:0};
const enemyLodStats={full:0,mid:0,far:0,hidden:0,vehicleFull:0};
const ENEMY_LOD_RANGES={
  desktop:{full:310,mid:860},mobile:{full:185,mid:470},ultra:{full:135,mid:305}
}[qualityName]||{full:240,mid:660};
window.HUNTER_ENEMY_LOD_STATS=enemyLodStats;
window.HUNTER_VISIBILITY_STATS=visibilityStats;
let staticVisualBatches=[];
const renderCategories={terreny:0,edificis:0,filferrades:0,vehicles:0,enemics:0,vegetacio:0,decoracio:0,objectes:0,fauna:0,altres:0};
window.HUNTER_DRAW_CALL_GROUPS=renderCategories;
adaptivePerformance.stats.drawCategories=renderCategories;
function registerDrawCategories(){
  const tagged=new Map();
  for(const b of B)tagged.set(b.o,'edificis');
  for(const v of V)tagged.set(v.o,'vehicles');
  for(const e of E)if(e.o)tagged.set(e.o,'enemics');
  for(const f of fa)if(f.o)tagged.set(f.o,'fauna');
  for(const item of items)tagged.set(item.o,'objectes');
  if(PM.trunk)tagged.set(PM.trunk,'vegetacio');
  if(terrainStream?.mesh)tagged.set(terrainStream.mesh,'terreny');
  tagged.set(pl,'altres');
  function track(mesh){
    if(!mesh.isMesh)return;
    let label='altres';
    if(mesh.userData.terrainTile)label='terreny';
    else if(mesh.name==='hunter-fence-section')label='filferrades';
    else if(mesh.name==='hunter-static-decor-batch')label='decoracio';
    else {
      let root=mesh;
      while(root){if(tagged.has(root)){label=tagged.get(root);break}root=root.parent}
      if(label==='altres'&&(mesh.parent?.name==='hunter-bush-sectors'||mesh.parent?.name==='hunter-rock-sectors'))label='vegetacio';
    }
    // No substituïm les possibles animacions/callbacks ja existents.
    const previous=mesh.onBeforeRender;
    mesh.onBeforeRender=function(...args){
      renderCategories[label]++;
      if(previous)previous.apply(this,args);
    };
  }
  world.traverse(track);
  pl.traverse(track);
  // Els objectes fora del món (mar, cel) compten al total del renderitzador
  // però no necessiten etiquetes de geometria terrestre.
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
  const y=VT[cv.t]?.m==='a'?(cv.alt??cv.o?.position?.y):(cv.o?.position?.y??cv.alt);
  return Math.abs(cv.x-b.x)<b.w/2&&Math.abs(cv.z-b.z)<b.d/2&&
    y!=null&&y>=b.fy-2&&y<b.fy+b.h+2;
}
function currentSniperFocus(){return scopeActive?window.HUNTER_SCOPE_FOCUS.create(P.x,P.y+1.76,P.z,scopeYaw,scopePitch):null}
function updateDistanceVisibility(){
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
    b.wm.opacity=b.dm.opacity=inside&&!basementView?.18:1;
    b.wm.depthWrite=b.dm.depthWrite=!inside||basementView;
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
          r=max.props+chunkRadius;
    mesh.visible=dx*dx+dz*dz<r*r||!!focus?.intersectsXZBox(mesh.position.x,mesh.position.z,80);
    if(!mesh.visible)visibilityStats.props++;
  }
  for(const v of V){
    const dx=v.x-P.x,dz=v.z-P.z;
    v.o.visible=v===cv||dx*dx+dz*dz<max.vehicles*max.vehicles||
      !!focus?.contains(v.x,v.o.position.y+1.5,v.z,5);
    if(!v.o.visible)visibilityStats.vehicles++;
  }
  for(const key in enemyLodStats)enemyLodStats[key]=0;
  for(const e of E){
    if(!e.o)continue;
    const dx=e.x-P.x,dz=e.z-P.z,d2=dx*dx+dz*dz,
          scopeDetailed=!!focus?.contains(e.x,e.o.position.y+(e.t==='torre'?8:2),e.z,e.t==='torre'?3:1.5),
          visible=d2<max.enemies*max.enemies||scopeDetailed;
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
    const dx=item.x-P.x,dz=item.z-P.z;
    item.o.visible=dx*dx+dz*dz<max.items*max.items||
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
}
function prepareVisibilitySystem(){
  staticVisualBatches=world.children.filter(o=>o.name==='hunter-static-decor-batch');
  registerDrawCategories();
  updateDistanceVisibility();
}

const K={},joystick=window.HUNTER_JOYSTICK.create(document.getElementById('joystick')),
      strafeButtons={left:document.getElementById('strafeLeft'),right:document.getElementById('strafeRight')},
      strafePointers={left:null,right:null},
      STRAFE_VEHICLES=new Set(['hover','heli','heli_combat']);
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
const canCrouch=()=>started&&!paused&&!over&&!cv&&!swimming&&!scopeActive&&!playerFall&&!playerEject;
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
const canStrafe=()=>!scopeActive&&(cv?STRAFE_VEHICLES.has(cv.t):!playerEject&&(!playerFall||!!playerFall.parachute));
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
  cancelGrenadeCharge();Object.keys(K).forEach(k=>K[k]=0);
  joystick.reset();releaseStrafeButtons();
  document.querySelectorAll('[data-k]').forEach(b=>b.classList.remove('held'))
};
const quickWeapons=()=>['pistola','ganivet',...['franctirador','bazooka','granada','cisalla'].filter(k=>inv[k]>0)];
const selectedWeapon=()=>knifeEquipped?'ganivet':sniperEquipped?'franctirador':bazookaEquipped?'bazooka':grenadeEquipped?'granada':cisallaEquipped?'cisalla':'pistola';
function selectWeapon(k){if(!weaponPickerAvailable()||swimming||!quickWeapons().includes(k))return;cancelGrenadeCharge();setSniperScope(false);knifeEquipped=k==='ganivet';sniperEquipped=k==='franctirador';bazookaEquipped=k==='bazooka';grenadeEquipped=k==='granada';cisallaEquipped=k==='cisalla';msg=k+' equipat';msgT=1.5;drawWeaponPicker()}
function cycleWeapon(n){const w=quickWeapons(),i=w.indexOf(selectedWeapon());selectWeapon(w[(i+n+w.length)%w.length])}
const picker=document.createElement('div');picker.style.cssText='position:fixed;z-index:100;right:10px;bottom:258px;background:#203239ed;padding:8px;border-radius:10px;display:none;flex-direction:column;gap:5px;max-height:50vh;overflow:auto';document.body.appendChild(picker);
const pickerToggle=document.createElement('button');pickerToggle.textContent='⚔ Armes';pickerToggle.style.cssText='position:fixed;z-index:99;right:10px;bottom:210px;padding:8px;color:white;background:#304b52;border-radius:9px';pickerToggle.style.display='none';document.body.appendChild(pickerToggle);
let pickerOpen=false;
const weaponPickerAvailable=()=>!!started&&document.body.classList.contains('game-started')&&!paused&&!over&&hp>0&&!cv&&!deathCinematic?.active&&!victoryCinematic?.active&&!victoryCinematic?.finished;
function syncWeaponPicker(){const visible=weaponPickerAvailable();pickerToggle.style.display=visible?'block':'none';if(!visible){pickerOpen=false;picker.style.display='none'}}
pickerToggle.onclick=()=>{if(!weaponPickerAvailable())return;pickerOpen=!pickerOpen;drawWeaponPicker()};
function drawWeaponPicker(){picker.style.display=pickerOpen&&weaponPickerAvailable()?'flex':'none';picker.replaceChildren();if(picker.style.display==='none')return;const names={pistola:'🔫 Pistola',ganivet:'🔪 Ganivet',franctirador:'🔭 Rifle',bazooka:'🚀 Bazooka',granada:'💣 Granades',cisalla:'✂ Cisalla'};quickWeapons().forEach((k,i)=>{const b=document.createElement('button');b.textContent=(i+1)+' · '+names[k]+' · '+(k==='pistola'?ammo:k==='franctirador'?sniperAmmo:k==='ganivet'?'∞':inv[k]);b.style.cssText='padding:8px;color:white;background:'+(selectedWeapon()===k?'#356c51':'#364a52');b.onclick=()=>{selectWeapon(k);pickerOpen=false;drawWeaponPicker()};picker.appendChild(b)})}
const act=c=>{if(/^Digit[1-6]$/.test(c)){selectWeapon(quickWeapons()[Number(c.slice(5))-1]);return}if(c==='KeyV'){cycleWeapon(1);return}if(c==='Escape'||c==='KeyP'){if(started)paused?resume():panel('pause');return}if(c==='KeyM'){if(started)paused?resume():panel('map');return}if(c==='KeyI'){if(started)paused?resume():panel('inventory');return}if(c==='F9'){setStealthDebug(!window.HUNTER_STEALTH.enabled());return}if(!started||paused||over)return;if(c==='KeyX'){if(canCrouch()){playerCrouched=!playerCrouched;updateCrouchButton()}return}if(c==='KeyT'){toggleSniperScope();return}if(c==='KeyE'){if(cv||nearV())toggle();else panel('inventory');return}if(c==='KeyR'){panel('inventory');return}if(c==='KeyG'){if(!secondaryWeapon())plant();}if(c==='KeyC'){if(inv.disf)setDis(!disg);else{msg='Busca una disfressa dins dels edificis.';msgT=3}}if(c==='KeyL')mark()};
const nearV=()=>{if(playerFall||playerEject)return null;let b=null,bd2=Infinity;for(const v of vehicleCandidatesAt(P.x,P.z,24,true)){if(v.reentryLockUntil>elapsed)continue;const dx=v.x-P.x,dz=v.z-P.z,d2=dx*dx+dz*dz,r=vehicleRadius(v.t)+5;if((circleVehicleOverlap(P.x,P.z,5,v)||d2<r*r)&&d2<bd2){bd2=d2;b=v}}return b};
function updateActionButton(nearby){
  const button=document.getElementById('mainActionButton');
  if(!button)return;
  // El mateix vehicle que retornaria nearV() a la tecla E.
  // En conduir, la icona continua identificant el vehicle del qual baixarem.
  const vehicle=cv||nearby||null,type=vehicle?.t||'backpack',
        name=vehicle?VT[type]?.n||type:null,
        title=cv?'Baixar de '+name:nearby?'Pujar a '+name:'Obrir inventari';
  if(button.dataset.vehicle!==type){
    button.dataset.vehicle=type;
    button.innerHTML=vehicle?window.HUNTER_ACTION_ICONS.vehicle(type):window.HUNTER_ACTION_ICONS.backpack;
  }
  if(button.title!==title){
    button.title=title;
    button.setAttribute('aria-label',title);
  }
}
// Cúpula del paracaigudes amb vuit cordes, visible mentre es descendeix.
let parachuteVisual=null;
function createParachuteVisual(){
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
  world.add(g);return g;
}
function removeParachuteVisual(){if(parachuteVisual){world.remove(parachuteVisual);parachuteVisual=null}}
// Detecta el primer sostre travessat durant la caiguda, també quan el
// desplaçament horitzontal canvia de teulada dins d'un sol fotograma.
function parachuteRoofLanding(x0,z0,y0,x1,z1,y1){
  if(y1>=y0)return null;
  const steps=Math.max(1,Math.ceil(Math.hypot(x1-x0,z1-z0)/.65)),
        fall=y0-y1;
  let hit=null;
  for(let i=0;i<=steps;i++){
    const q=i/steps,x=x0+(x1-x0)*q,z=z0+(z1-z0)*q,
          candidateY=y0-fall*q;
    for(const b of buildingCandidates(x,z)){
      const roof=solidRoofAt(b,x,z);
      if(!roof||y0<roof.top-.15||y1>roof.top+.05)continue;
      // No aterrar abans que els peus arribin a la coberta.
      if(candidateY>=roof.top-.08&&(!hit||roof.top>hit))hit=roof.top;
    }
  }
  return hit;
}
// Compartida per al salt voluntari i per a la destrucció de l'helicòpter.
// La caiguda conserva l'altura i la inèrcia; el dany es calcula en aterrar.
function ejectFromHelicopter(v){
  const fx=-Math.sin(v.hd),fz=-Math.cos(v.hd),side=rn(-1,1)<0?-1:1,
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
// Sortida del camió: sempre pel costat i al darrere del sentit de marxa.
// Els punts de prova ja són fora de la caixa física, no davant del para-xocs.
function truckExitCandidate(v,side,index){
  const box=vehicleBox(v),k=index%8,exitSide=index<8?side:-side,
        lateral=box.w/2+2.2+Math.floor(k/4)*1.5,
        behind=-(v.v<0?-1:1)*(box.d*.22+(k%4)*1.35),
        fx=-Math.sin(v.hd),fz=-Math.cos(v.hd),
        sx=Math.cos(v.hd),sz=-Math.sin(v.hd);
  return{x:v.x+sx*exitSide*lateral+fx*behind,
    z:v.z+sz*exitSide*lateral+fz*behind,side:exitSide};
}
function toggle(){if(playerFall||playerEject)return;if(scopeActive)setSniperScope(false);if(cv){
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
const moving=speed>3&&!ferry,side=rn(-1,1)<0?-1:1,rrad=vehicleRadius(leaving.t)+2.2,
      movingTruck=moving&&leaving.t==='camio';let spot=null;
for(let i=0;i<16;i++){
  const a=leaving.hd+side*Math.PI/2+i*Math.PI/8,
        localFerryExit=leaving.t==='ferry'?[0,-5,5,-10,10,-15,15,-20,20][i%9]:null,
        candidate=localFerryExit!==null?{...ferryWorld(ferry,0,localFerryExit),side}:
          movingTruck?truckExitCandidate(leaving,side,i):
          {x:leaving.x+Math.cos(a)*rrad,z:leaving.z+Math.sin(a)*rrad,side},
        {x,z}=candidate;
  if(ferry){const q=ferryLocal(ferry,x,z);
    if(!ferryWalkable(q.x,q.z,1.15)||ferryCabinContains(q.x,q.z,1.15))continue;
  }
  if(Math.abs(x)>H-3||Math.abs(z)>H-3||treeHit(x,z,1)||
    (leaving!==ferry&&circleVehicleOverlap(x,z,1.1,leaving))||
    vehicleCandidatesAt(x,z,40).some(u=>u!==leaving&&u!==ferry&&!u.destroyed&&circleVehicleOverlap(x,z,1.1,u))||
    wallCandidates(x,z,1).some(w=>!w.open&&x>w.x0-1&&x<w.x1+1&&z>w.z0-1&&z<w.z1+1))continue;
  if(movingTruck&&hAt(x,z)<=0)continue;
  spot=candidate;if(ferry||hAt(x,z)>0||VT[leaving.t].m==='w')break;
}
if(!spot){msg='No hi ha espai per baixar aquí.';msgT=3;return}
P.x=spot.x;P.z=spot.z;P.hd=leaving.hd;
if(ferry){const q=ferryLocal(ferry,spot.x,spot.z);P.y=ferryLocalSurfaceY(ferry,q.z)+.12;swimming=false}
leaving.driveInput=0;leaving.steerInput=0;leaving.strafeV=0;leaving.reentryLockUntil=elapsed+2;
if(moving){const fx=-Math.sin(leaving.hd),fz=-Math.cos(leaving.hd),sx=Math.cos(leaving.hd)*spot.side,sz=-Math.sin(leaving.hd)*spot.side,
  carry=Math.sign(leaving.v)*Math.min(movingTruck?11:28,speed*(movingTruck?.3:.72)),outward=movingTruck?8:1.4;
  playerEject={kind:'flip',vx:fx*carry+sx*outward,vz:fz*carry+sz*outward,t:.5,dur:.5,height:.68};msg='Has saltat del vehicle en marxa!';msgT=2.5}
cv=null}else{const v=nearV();if(v){cv=v;swimming=false;playerCrouched=false;P.hd=v.hd;msg=VT[v.t].n+' · accelera amb joystick / W';msgT=3}}}
addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  if(e.code==='KeyF'&&started&&!paused&&!over&&grenadeEquipped&&!cv){
    beginGrenadeCharge();K.KeyF=0;return;
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
addEventListener('blur',()=>{clearKeys();if(started&&!paused&&!over)panel('pause')});document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!over)panel('pause')});
ren.domElement.addEventListener('wheel',e=>{e.preventDefault();if(e.shiftKey){cycleWeapon(e.deltaY>0?1:-1);return}zoom=Math.max(.7,Math.min(1.9,zoom+e.deltaY*.001))},{passive:false});
let drag=null;ren.domElement.addEventListener('pointerdown',e=>{if(!started||paused||over)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};ren.domElement.setPointerCapture(e.pointerId)});ren.domElement.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||paused)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(scopeActive)scopePitch=Math.max(-.65,Math.min(.65,scopePitch-dy*.00115));drag.y=e.clientY;if(scopeActive)scopeYaw-=dx*.00115;else{const q=cv||P;q.hd-=dx*.006}drag.x=e.clientX});ren.domElement.addEventListener('pointerup',()=>drag=null);ren.domElement.addEventListener('pointercancel',()=>drag=null);
function setSniperScope(enabled){
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
  for(const key of ['med','bazooka','granada','cisalla','expl','franctirador','paracaigudes','disf'])inv[key]=Math.max(inv[key]||0,999);
  sniperAmmo=Math.max(sniperAmmo,999);
  hqMapKnown=true;
  for(const v of V)if(v.rockets!=null)v.rockets=Math.max(v.rockets,999);
}
function setCheat(key,enabled){
  if(!Object.hasOwn(cheats,key))return;
  cheats[key]=!!enabled;
  if(key==='items'&&enabled){grantAllWeapons();revealMapPickup('mapa');revealMapPickup('mapa_heli');revealMapPickup('mapa_tanc')}
  if(key==='fly'){cheatFlightY=enabled?P.y:null;if(enabled){cv=null;playerFall=null;playerEject=null;swimming=false}}
  if(key==='invisible'&&enabled)for(const u of E){u.canSee=false;u.canShoot=false;u.alert=0;u.recognition=0;u.pursuitT=0;if(u.t==='soldat'){u.aiMode='patrol';u.searchT=0}}
}
function resume(){paused=false;clearKeys();ui.hide();if(AC&&!muted)AC.resume()}
function panel(mode){setSniperScope(false);paused=true;pickerOpen=false;picker.style.display='none';pickerToggle.style.display='none';clearKeys();if(eng)eng.g.gain.value=0;if(AC)AC.suspend();ui.show(mode)}
// Les cartes revelen informació de forma immediata: no són objectes
// d'inventari que s'hagin d'equipar ni obrir manualment.
function revealMapPickup(kind){
  if(kind==='mapa'){
    hqMapKnown=true;
    return 'HQ enemic descobert al mapa!';
  }
  const isHeli=kind==='mapa_heli',isTank=kind==='mapa_tanc';
  if(!isHeli&&!isTank)return null;
  const markKind=isHeli?'heli':'tanc',
        targets=(isHeli?V.filter(v=>v.t==='heli'||v.t==='heli_combat'):
          [...V.filter(v=>v.t==='tanc'),...E.filter(e=>e.t==='tanc')])
          .filter(v=>!v.destroyed);
  intelMarks=intelMarks.filter(m=>m.kind!==markKind);
  targets.forEach((v,i)=>intelMarks.push({
    kind:markKind,ref:v,
    label:(isHeli?(v.t==='heli_combat'?'Helicòpter de combat ':'Helicòpter '):'Tanc ')+(i+1)
  }));
  return 'Mapa actualitzat: '+targets.length+' '+(isHeli?'helicòpters':'tancs')+' localitzats.';
}
function useInvItem(id){
  if(!inv[id])return false;
  if(id==='med'){if(hp>=COMBAT_BALANCE.player){msg='Ja tens la vida al màxim.';msgT=2;return false}inv.med--;if(inv.med<=0)delete inv.med;hp=Math.min(COMBAT_BALANCE.player,Math.ceil(hp)+COMBAT_BALANCE.medkit);msg='Has usat una farmaciola.';msgT=2;snd('pick');return true}
  if(id==='expl'){if(cv||swimming){msg='No pots col·locar explosius des d’aquí.';msgT=2;return false}resume();plant();return true}
  if(id==='cisalla'){
    if(cv||swimming||playerFall||playerEject){msg='La cisalla només es pot equipar a peu.';msgT=2;return false}
    cancelGrenadeCharge();cisallaEquipped=!cisallaEquipped;
    if(cisallaEquipped){knifeEquipped=false;bazookaEquipped=false;grenadeEquipped=false;sniperEquipped=false;setSniperScope(false)}
    resume();msg=cisallaEquipped?'Cisalla equipada · Acosta’t a una tanca i prem Talla / F.':'Cisalla desada.';msgT=2;return true
  }
  if(id==='bazooka'){if(cv||swimming){msg='Has d’anar a peu per equipar el bazooka.';msgT=2;return false}cancelGrenadeCharge();bazookaEquipped=!bazookaEquipped;if(bazookaEquipped){knifeEquipped=false;grenadeEquipped=false;cisallaEquipped=false;sniperEquipped=false;setSniperScope(false)}resume();msg=bazookaEquipped?'Bazooka equipat: '+inv.bazooka+' coets disponibles.':'Bazooka desequipat.';msgT=2;return true}
  if(id==='granada'){if(cv||swimming){msg='Has d’anar a peu per equipar les granades.';msgT=2;return false}cancelGrenadeCharge();grenadeEquipped=!grenadeEquipped;if(grenadeEquipped){knifeEquipped=false;bazookaEquipped=false;cisallaEquipped=false;sniperEquipped=false;setSniperScope(false)}resume();msg=grenadeEquipped?'Granades equipades: '+inv.granada+'.':'Granades desequipades.';msgT=2;return true}
  if(id==='franctirador'){
    cancelGrenadeCharge();
    if(cv||swimming){msg='Has d’anar a peu per equipar el rifle.';msgT=2;return false}
    sniperEquipped=!sniperEquipped;
    if(sniperEquipped){knifeEquipped=false;bazookaEquipped=false;grenadeEquipped=false;cisallaEquipped=false}
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
  if(!inv[id]||id==='arma')return false;inv[id]--;if(inv[id]<=0)delete inv[id];if(id==='disf'&&disg)setDis(false);if(id==='bazooka'&&bazookaEquipped&&!inv.bazooka)bazookaEquipped=false;if(id==='cisalla'&&cisallaEquipped&&!inv.cisalla){cisallaEquipped=false;pl.userData.cisallaCut=0}if(id==='granada'&&grenadeEquipped&&!inv.granada){grenadeEquipped=false;cancelGrenadeCharge()}if(id==='franctirador'&&!inv.franctirador){sniperEquipped=false;setSniperScope(false)}
  msg='Has deixat: '+IT[id].n;msgT=2;return true
}
const ui=window.HUNTER_UI.create({
  hud:document.getElementById('hud'),
  panel:document.getElementById('gamepanel'),
  title:document.getElementById('panelTitle'),
  body:document.getElementById('panelBody'),
  resumeButton:document.getElementById('resumeButton'),
  minimap,
  getState:()=>({
    hp,ammo,kills,vehicle:cv,vehicleTypes:VT,inside:ib,swimming,crouching:playerCrouched,disguised:disg,bazookaEquipped,grenadeEquipped,cisallaEquipped,sniperEquipped,sniperAmmo,scopeActive,
    inventory:inv,itemTypes:IT,player:P,nearVehicle:cv?null:nearV(),messageTime:msgT,message:msg,
    waypoint,worldSize:S,seed,mapScale:MAP_SCALE,palmsDisabled,waterDisabled,shadowsDisabled,performanceStatsVisible,cheats:{...cheats},stealthDebug:window.HUNTER_STEALTH.enabled(),stealthLayers:window.HUNTER_STEALTH.layers(),shadowStats,performance:adaptivePerformance.stats,visibilityStats,enemyLodStats
  }),
  actions:{
    resume,
    open:mode=>panel(mode),
    setWaypoint:v=>waypoint=v,
    useItem:id=>useInvItem(id),
    dropItem:id=>dropInvItem(id),
    restart:d=>{DIF=d;elapsed=0;build();minimap.reset();mini();resume()},
    setPalmsDisabled,
    setWaterDisabled,
    setShadowsDisabled,
    setPerformanceStatsVisible,
    setStealthDebug,
    setStealthLayer,
    zoom:d=>zoom=Math.max(.7,Math.min(1.9,zoom+d)),
    setCheat
  }
});
mc.onclick=()=>started&&panel('map');
function vehicleImpactFx(x,y,z){debris(x,y,z,0xffc14d,5,.16,5);puff(x,y,z,0x8a8478,.8)}
function collisionDamageVehicle(v,dmg,impacts=1){
 if(v?.t==='tanc')return;
 impactVehicle(v,impacts>1?impacts:dmg);
}
function relativeVehicleImpactSpeed(a,b){
 const ah=a.hd||0,bh=b.navHd??b.hd??0,
  av=a.v??a.impactSpeed??0,bv=b.v??b.impactSpeed??0;
 return Math.hypot(-Math.sin(ah)*av+Math.sin(bh)*bv,
  -Math.cos(ah)*av+Math.cos(bh)*bv);
}
function ramSpeedFactor(type,barbed){
  if(type==='tanc')return .995;
  if(type==='camio'&&barbed)return 1;
  return barbed?.72:.55;
}
function mayRamWhileRecovering(type,barbed,cooldown){
  return cooldown<=0||type==='tanc'||(type==='camio'&&barbed);
}
function tankCanCrush(v,other,ownMass,otherMass){
  return v.t==='tanc'&&Math.abs(v.v)>1&&ownMass>otherMass&&other.t!=='ferry';
}
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
  // Les roques emergides, també a la costa, aturen vehicles marítims i
  // terrestres; els helicòpters només hi xoquen si volen prou baixos.
  if(speed>=2.5&&v.envCd<=0){
    const baseY=c.m==='a'?(v.alt??0)-1:
      (c.m==='w'||c.m==='wl')?-1.4:hAt(v.x,v.z),
      topY=c.m==='a'?(v.alt??0)+2:baseY+Math.max(2,(VS[v.t]||1)*2.2),
      rock=nearbyRock(v.x,v.z,radius*.48,baseY,topY);
    if(rock){
      collisionDamageVehicle(v,Math.min(5,Math.max(1,Math.ceil(speed/(9*Math.sqrt(c.mass||1))))),1);
      vehicleImpactFx(rock.x,Math.max(0,hAt(rock.x,rock.z))+.8,rock.z);
      if(v.destroyed)return;
      const dx=v.x-rock.x,dz=v.z-rock.z,dist=Math.hypot(dx,dz),
        clear=rock.r+radius*.48+.08;
      if(dist>.01){v.x=rock.x+dx/dist*clear;v.z=rock.z+dz/dist*clear}
      else{v.x=oldX;v.z=oldZ}
      v.v*=-.12;v.bump=.22;v.envCd=.32;
      msg='Impacte amb roca!';msgT=1;return;
    }
  }
  if(speed<2.5||c.m==='a'||c.m==='w')return;
  // Els impactes lents no maten automàticament els soldats.
  if(v.ramCd<=0&&speed>6){
    for(const u of E){
      if(u.t!=='soldat')continue;
      if(runoverSweepHit(oldX,oldZ,v.x,v.z,u.x,u.z,radius*.68+u.r*.45)){
        const dmg=runoverDamage(speed,c.mass||1);
        hurtE(u,dmg);u.alert=12;v.ramCd=.35;v.v*=.86;
        msg='Atropellament!';msgT=1;break;
      }
    }
  }
  if(v.envCd>0)return;
  const t=treeAt(v.x,v.z,radius*.48);if(!t)return;
  if(t.p&&t.alive){const heavy=v.t==='tanc'||v.t==='camio';killPalm(t);if(!heavy)collisionDamageVehicle(v,Math.min(3,Math.max(1,Math.ceil(speed/(18*Math.sqrt(c.mass||1))))),1);if(v.destroyed)return;if(!heavy)v.v*=.9;v.bump=heavy?.06:.18;v.envCd=heavy?.08:.28;msg='Has tombat una palmera.';msgT=1;return}
  // Les roques ja s'han resolt abans, també per a les embarcacions.
}
// Hitboxes físics de les cobertes. Calculats a partir de la mateixa
// geometria dels sostres, sense afegir malles al renderitzador.
function solidRoofAt(b,x,z){
  if(!b||b.rhp<=0||b.rb)return null;
  const rx=x-b.x,rz=z-b.z;
  if(!b.hangar){
    const sx=b.roof?.scale?.x||1,sz=b.roof?.scale?.z||1;
    if(Math.abs(rx)>(b.w+1.35)*sx/2||Math.abs(rz)>(b.d+1.35)*sz/2)return null;
    // Coberta rectangular: gruix 1.15, centre a h+.62.
    return {bottom:b.fy+b.h+.045,top:b.fy+b.h+1.195,building:b};
  }
  // La volta visual té 10 segments amb juntes mínimes entre plaques.
  // L'envolupant semicircular omple aquestes juntes, sense forats
  // a la hitbox, i manté la mateixa alçada i pendent que les plaques.
  if(Math.abs(rz)>(b.d+1.15)/2)return null;
  const radius=b.w/2;
  if(Math.abs(rx)>radius+.2)return null;
  const curvedY=b.fy+.12+Math.sqrt(Math.max(0,radius*radius-Math.min(radius,Math.abs(rx))**2));
  return {bottom:curvedY-.32,top:curvedY+.32,building:b};
}
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
  const scale=VS[v.t]||1,skid=v.o.userData.skidContactHeight||0,
        rotor=v.o.userData.rotorContactHeight||((v.t==='heli_combat'?3.3:3.9)*scale),
        bodyTop=alt+(v.t==='heli_combat'?3.0:3.45)*scale,
        bodyBottom=alt+skid,rotorY=alt+rotor,
        bodyRadius=(v.t==='heli_combat'?1.45:1.65)*scale,
        rotorRadius=(v.t==='heli_combat'?6.75:7.4)*scale;
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
        radius=(v.t==='heli_combat'?1.45:1.65)*(VS[v.t]||1);
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
  const scale=VS[v.t]||1,skid=v.o.userData.skidContactHeight||0,
    rotor=v.o.userData.rotorContactHeight||3.9*scale,
    rotorRadius=(v.t==='heli_combat'?6.75:7.4)*scale,
    bodyRadius=(v.t==='heli_combat'?1.45:1.65)*scale,
    bodyTop=(v.t==='heli_combat'?3:3.45)*scale,
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
const c=VT[v.t],a=c.m==='a',water=c.m==='w'||c.m==='wl',land=c.m==='l',radius=vehicleRadius(v.t),input=window.HUNTER_VEHICLE_DYNAMICS.inputs(v,f,tr,dt);f=input.forward;tr=input.turn;
// Strafe sense girar: només hovercraft i els dos helicòpters.
// Conservar la deriva natural existent (sideV) i afegir-hi una velocitat
// lateral independent amb acceleració i frenada suaus.
const maxStrafe=v.t==='hover'?12:(a?(c.strafeMax||17):0),
      targetStrafe=maxStrafe*Math.max(-1,Math.min(1,strafe));
v.strafeV=window.HUNTER_VEHICLE_DYNAMICS.smooth(v.strafeV||0,targetStrafe,6.5,dt);
if(Math.abs(targetStrafe)<.01&&Math.abs(v.strafeV)<.02)v.strafeV=0;
if(a&&v.carrier&&ud>.12){detachFromFerry(v);v.verticalV=Math.max(v.verticalV||0,3)}
v.v+=f*c.a*dt;
const dragBase=c.dr*(water?1.08:land?.86:1),coastBoost=Math.abs(f)<.03?(water?1.18:land?1.04:.82):1;
v.v*=Math.max(0,1-dragBase*coastBoost*dt);
v.v=Math.max(-(c.maxR||12),Math.min(c.maxF||40,v.v));

let steerScale=1;
if(land){const speed=Math.abs(v.v),fade=c.steerFade??.4;steerScale=(.35+.65*Math.min(1,speed/9))*(1-fade*Math.min(1,speed/(c.maxF||35))*.55)}
else if(water){const speed=Math.abs(v.v),min=c.waterSteerMin??.2;steerScale=min+(1-min)*Math.min(1,speed/10)}
const targetYaw=tr*c.tu*steerScale*(a?1:(v.v<0?-1:1));
v.yawRate=window.HUNTER_VEHICLE_DYNAMICS.smooth(v.yawRate||0,targetYaw,c.yawResponse||4,dt);
v.hd+=v.yawRate*dt;

let sideV=0;
if(water){
  const drift=(c.waterDrift||0)*v.v*v.yawRate;
  v.sideV=window.HUNTER_VEHICLE_DYNAMICS.smooth(v.sideV||0,drift,2.2,dt);
  sideV=v.sideV;
}else if(land){
  const grip=c.landGrip??.9,slip=(1-grip)*v.v*v.yawRate*.42;
  v.sideV=window.HUNTER_VEHICLE_DYNAMICS.smooth(v.sideV||0,slip,5+grip*5,dt);
  sideV=v.sideV;
}else v.sideV=window.HUNTER_VEHICLE_DYNAMICS.smooth(v.sideV||0,0,4,dt);

const oldX=v.x,oldZ=v.z,
      fx=-Math.sin(v.hd),fz=-Math.cos(v.hd),sx=Math.cos(v.hd),sz=-Math.sin(v.hd);
const totalSideV=sideV+v.strafeV,
      nx=v.x+(fx*v.v+sx*totalSideV)*dt,nz=v.z+(fz*v.v+sz*totalSideV)*dt,raw=hAt(nx,nz),h=land?groundAt(nx,nz):raw,g=Math.max(0,h),
      deckCarrier=(land||a)?ferryForVehicle(v,nx,nz,true):null;let ok=Math.abs(nx)<H-radius&&Math.abs(nz)<H-radius;
if(c.m==='w')ok=ok&&raw<-1.2;if(c.m==='l')ok=ok&&(!!deckCarrier||h>-1.2);
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
  if(w.rammable&&land&&mayRamWhileRecovering(v.t,!!w.barbed,v.envCd)){
    const speed=Math.abs(v.v),barbed=!!w.barbed,breakSpeed=barbed?8:14,
          tank=v.t==='tanc',truckFence=v.t==='camio'&&barbed;
    if(tank||truckFence||speed>breakSpeed){
      dmgW(w,w.hp);
      if(!tank&&!truckFence)collisionDamageVehicle(v,0,barbed?2:3);
      const hitX=touch?.x??w.cx,hitZ=touch?.z??w.cz;
      vehicleImpactFx(hitX,Math.max(0,hAt(hitX,hitZ))+1.1,hitZ);
      if(v.destroyed)return false;
      v.v*=ramSpeedFactor(v.t,barbed);
      v.bump=(tank||truckFence)?.06:barbed?.14:.2;
      v.envCd=(tank||truckFence)?.08:.28;
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
    if(rel>6&&v.envCd<=0){
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
  handleVehicleImpacts(v,dt,oldX,oldZ);if(v.destroyed)return false;if(v.t==='tanc'||v.t==='tanqueta'||v.t==='camio')crush(nx,nz,(v.t==='tanc'?3.2:v.t==='camio'?2.6:2.4)*VS[v.t])
}else{v.v*=Math.exp(-12*dt);v.sideV*=Math.exp(-10*dt);v.strafeV*=Math.exp(-12*dt)}
if(a){
  const g2=Math.max(0,groundAt(v.x,v.z)),targetVz=ud*(c.climb||24);
  v.verticalV=window.HUNTER_VEHICLE_DYNAMICS.smooth(v.verticalV||0,targetVz,c.liftResponse||2.5,dt);
  if(Math.abs(ud)<.01)v.verticalV*=Math.exp(-1.5*dt);
  const previousAlt=v.alt;
  v.alt=Math.max(helicopterLandedAltitude(v,g2),Math.min(150,v.alt+v.verticalV*dt));
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
  }
}
function place(v,t,dt,tr){const c=VT[v.t],o=v.o,g=hAt(v.x,v.z);let y,pi=0,ro=Math.sin(t*2+v.x)*.02;
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
   const speed=Math.min(1,Math.abs(v.v)/(c.maxF||30)),
         wave=Math.sin(t*2.4+v.x*.03+v.z*.025);
   pi=wave*.035*speed;ro=-(v.yawRate||0)*.11+wave*.025;
   // Només la moto aquàtica i el windsurf s'enlairen en
   // remuntar una ona a velocitat: els altres bucs no boten.
   if(v.t==='moto_aquatica'||v.t==='windsurf'){
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
  pi=Math.atan((groundAt(v.x-s2*3,v.z-k*3)-groundAt(v.x+s2*3,v.z+k*3))/6);ro=-(v.sideV||0)*.018}
if(v.bump>0)y+=Math.sin((1-v.bump/.22)*Math.PI)*.34;o.position.set(v.x,y,v.z);o.rotation.set(pi,v.hd,ro);
// Direcció visual a l'eix davant (-Z): independent del rodament en X.
window.HUNTER_VEHICLES.animateSteering(o,v.t,tr,dt);
v.pedalPhase=(v.pedalPhase||0)+v.v*dt/1.5;if(o.userData.crank)o.userData.crank.rotation.x=(v.t==='bici'?-v.pedalPhase:v.pedalPhase);if(o.userData.oars){const power=Math.min(1,Math.abs(v.v)/1.6),rowPhase=v.t==='barca_rems'?-(v.pedalPhase||0):(v.pedalPhase||0),sweep=Math.sin(rowPhase)*.5*power,dip=.12+.18*(.5+.5*Math.cos(rowPhase))*power;o.userData.oars.forEach((r,i)=>{const side=i?1:-1;r.rotation.y=side*sweep;r.rotation.z=-side*(.12+dip);r.rotation.x=.06*Math.sin(rowPhase)})}if(o.userData.rotor)o.userData.rotor.rotation.y+=dt*(v===cv?30:v.crashing?Math.max(5,26-(v.crashT||0)*4):0);if(o.userData.fan)o.userData.fan.rotation.z+=dt*(v===cv?35:0);if(o.userData.tailRotor)o.userData.tailRotor.rotation.x+=dt*(v===cv?40:v.crashing?Math.max(7,32-(v.crashT||0)*5):0);if(v.t==='tanc')animateTankTracks(v,dt);(o.userData.wheels||[]).forEach(w=>{const side=w.userData.trackSide;if(v.t==='tanc'&&side){const sideSpeed=v.v+side*(v.yawRate||0)*2.1*(VS[v.t]||1);w.rotation.x-=sideSpeed*dt/(w.userData.radius||.6)}else w.rotation.x-=v.v*dt/(w.userData.radius||.6)})}
let runStepTimer=0,stealthStepTimer=0;
function update(dt,t){
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
// La prolongació del joystick funciona a peu i nedant: a l'aigua activa el crol.
const canRun=!!started&&!paused&&!over&&!cv&&!playerFall&&!playerEject&&!scopeActive;
joystick.setRunEnabled(canRun);
document.body.classList.toggle('player-swimming',canRun&&swimming);
updateCrouchButton();
// Darrera defensa: cap estat actiu amb vida nul·la, fins i tot si una
 // interacció externa o una restauració d'estat ha posat hp a zero.
 if(started&&!over&&hp<=0){
   hp=0;fin('HAS MORT',{type:'impact',x:P.x,y:P.y,z:P.z});
 }
 if(!started||paused||over){updateBazookaReticle(0);if(eng)eng.g.gain.value=0;return}
rebuildVehicleGrid();elapsed+=dt;
window.HUNTER_STEALTH.tick(dt);
const playerStartX=P.x,playerStartZ=P.z;
const jf=-joystick.state.y,jtr=-joystick.state.x,
      f=Math.max(-1,Math.min(1,(K.KeyW||K.ArrowUp?1:0)-(K.KeyS||K.ArrowDown?1:0)+jf)),
      tr=Math.max(-1,Math.min(1,(K.KeyA||K.ArrowLeft?1:0)-(K.KeyD||K.ArrowRight?1:0)+jtr)),
      strafe=strafeEnabled?Math.max(-1,Math.min(1,
        (K.KeyU?1:0)-(K.KeyY?1:0)+(strafePointers.right!==null?1:0)-(strafePointers.left!==null?1:0))):0,
      ud=(K.KeyH||K.Space?1:0)-(K.KeyJ||K.ShiftLeft?1:0),lim=H-2;
const running=canRun&&!playerCrouched&&f>.1&&(joystick.state.running||K.ShiftLeft||K.ShiftRight);
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
  // Sensibilitat baixa per controlar amb precisió l'òptica x8.
  scopeYaw+=(tr-scopeStrafe*.8)*dt*.38;
  scopePitch=Math.max(-.65,Math.min(.65,scopePitch+f*dt*.30));
}else if(cv){const driven=cv,alive=stepV(driven,f,tr,ud,dt,strafe);if(alive&&cv===driven){P.x=driven.x;P.z=driven.z;P.hd=driven.hd}}
else{P.hd+=tr*dt*2.2;if(cheats.fly){
  const speed=65,vertical=(K.KeyH||K.Space?1:0)-(K.KeyJ||K.ShiftLeft?1:0),length=Math.max(1,Math.hypot(f,strafe));
  P.x=Math.max(-lim,Math.min(lim,P.x+(-Math.sin(P.hd)*f+Math.cos(P.hd)*strafe)*speed*dt/length));
  P.z=Math.max(-lim,Math.min(lim,P.z+(-Math.cos(P.hd)*f-Math.sin(P.hd)*strafe)*speed*dt/length));
  cheatFlightY=Math.max(hAt(P.x,P.z)+1,Math.min(500,(cheatFlightY??P.y)+vertical*speed*dt));
  P.y=cheatFlightY;
}else if(playerFall){
  const fall=playerFall,oldX=P.x,oldZ=P.z,oldY=fall.y;
  fall.t+=dt;fall.vy-=fall.parachute?10*dt:24*dt;
  if(fall.parachute){
    fall.vy=Math.max(-4.8,fall.vy);
    // Inclinació suau amb el joystick/tecles, conservant una mica d'inèrcia.
    const desiredX=-Math.sin(P.hd)*f*2.8+Math.cos(P.hd)*strafe*2.2,
          desiredZ=-Math.cos(P.hd)*f*2.8-Math.sin(P.hd)*strafe*2.2,
          blend=1-Math.exp(-2.2*dt);
    fall.vx+=(desiredX-fall.vx)*blend;fall.vz+=(desiredZ-fall.vz)*blend;
    fall.leanF+=(f-fall.leanF)*blend;
    fall.leanS+=(strafe-fall.leanS)*blend;
  }else{fall.vx*=Math.exp(-.18*dt);fall.vz*=Math.exp(-.18*dt)}
  P.x=Math.max(-lim,Math.min(lim,P.x+fall.vx*dt));
  P.z=Math.max(-lim,Math.min(lim,P.z+fall.vz*dt));
  fall.y+=fall.vy*dt;
  const water=wy(P.x,P.z,t),roof=parachuteRoofLanding(oldX,oldZ,oldY,P.x,P.z,fall.y),
        landing=Math.max(hAt(P.x,P.z),water-1.4,roof??-Infinity);
  P.y=fall.y;
  if(fall.y<=landing){
    P.y=landing;const fallH=fall.startHeight,impact=Math.max(0,-fall.vy),
      waterLanding=roof===null&&water>hAt(P.x,P.z)+1.5,
      dmg=fall.parachute?0:wholeDamage(Math.min(COMBAT_BALANCE.player,Math.max(0,((fallH-4)*(waterLanding?.42:.9)+Math.max(0,impact-12)*(waterLanding?.45:.8))*.2)));
    removeParachuteVisual();playerFall=null;
    if(dmg>0)hurtP(dmg,false,{type:'fall',x:P.x,y:P.y+8,z:P.z});
    msg=dmg===0&&fallH>4?'Has aterrat amb seguretat.':waterLanding?'Has caigut a l’aigua.':'Has impactat contra el terra!';msgT=2.5;
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
  const length=Math.max(1,Math.hypot(f,strafe)),
        ss=(swimming?(running?8.5:5):playerCrouched?4.5:running?19:12)*f*dt/length,
        lateral=(swimming?(running?6.5:4.5):playerCrouched?3.8:9)*strafe*dt/length;
  P.x=Math.max(-lim,Math.min(lim,P.x-Math.sin(P.hd)*ss+Math.cos(P.hd)*lateral));
  P.z=Math.max(-lim,Math.min(lim,P.z-Math.cos(P.hd)*ss-Math.sin(P.hd)*lateral));
}
if(!playerFall&&!cheats.fly){wallPush();treePush();vehiclePushPlayer();ferryCabinPushPlayer()}}
// Cal transportar també el jugador que va a peu sobre la coberta mòbil.
const walkingDeck=!cv&&!playerFall?pedestrianFerry(P.x,P.z,P.y):null;
V.slice().forEach(v=>{if(v===cv)return;if(v.carrier){v.v=0;v.sideV=0;v.strafeV=0;return}if(v.crashing){v.crashT=(v.crashT||0)+dt;v.hd+=(v.crashSpin||1)*(1.8+v.crashT*.35)*dt;v.v*=Math.exp(-.12*dt);v.x-=Math.sin(v.hd)*v.v*dt;v.z-=Math.cos(v.hd)*v.v*dt;const ground=Math.max(0,hAt(v.x,v.z)),water=wy(v.x,v.z,t),impactY=Math.max(ground,water);v.alt-=(5+v.crashT*8)*dt;if(v.alt<=impactY+1){v.alt=impactY+.8;explodeVehicle(v)}return}if(Math.abs(v.v)>.08){v.driveInput=0;v.steerInput=0;stepV(v,0,0,0,dt);if(Math.abs(v.v)<.08)v.v=0}});
syncFerryCargo();updateTerminalRamps();
if(walkingDeck&&!walkingDeck.f.destroyed){const p=ferryWorld(walkingDeck.f,walkingDeck.q.x,walkingDeck.q.z);P.x=p.x;P.z=p.z}
ib=cv?null:buildingCandidates(P.x,P.z).find(b=>Math.abs(P.x-b.x)<b.w/2&&Math.abs(P.z-b.z)<b.d/2&&P.y<(solidRoofAt(b,P.x,P.z)?.bottom??b.fy+b.h+.1))||null;
const floor=ib&&ib.kind!=='enemy_bunker'?Math.max(ib.fy+.3,groundAt(P.x,P.z,P.y)):groundAt(P.x,P.z,P.y),surface=wy(P.x,P.z,t);swimming=!cheats.fly&&!cv&&!ib&&!playerFall&&floor<surface-2.1;
if(swimming)playerCrouched=false;
document.body.classList.toggle('player-swimming',canRun&&swimming);
if(scopeActive&&(cv||swimming||playerFall||!sniperEquipped))setSniperScope(false);
if(!playerFall&&!cheats.fly){
  // El suport segueix el triangle visible JUST sota el centre del jugador.
  // Mostrejar el màxim de quatre punts manté el personatge en l'aire
  // en baixar una pendent, perquè els punts del darrere són més alts.
  P.y=ib?floor:Math.max(floor+.06,surface-2.1);
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
  const y=VT[cv.t]?.m==='a'?(cv.alt??cv.o?.position?.y):(cv.o?.position?.y??cv.alt);
  return Math.abs(cv.x-b.x)<b.w/2&&Math.abs(cv.z-b.z)<b.d/2&&
    y!=null&&y>=b.fy-2&&y<b.fy+b.h+2;
}
worldVisualTick-=dt;
if(worldVisualTick<=0){
  worldVisualTick=.2;
  updateDistanceVisibility();
}
updateDoors(dt);
items.forEach(it=>{const dx=it.x-P.x,dz=it.z-P.z;if(dx*dx+dz*dz<ITEM_ANIM2){it.o.rotation.y=t*2;it.o.position.y=it.y+Math.sin(t*3+it.x)*.25}});
if(!cv)for(let k=items.length-1;k>=0;k--){const it=items[k],dx=P.x-it.x,dz=P.z-it.z;if(dx*dx+dz*dz<4.84&&Math.abs(P.y-it.y)<3){let mapMessage=null;
  if(it.t==='arma')ammo+=16;
  else if(it.t==='mapa'||it.t==='mapa_heli'||it.t==='mapa_tanc'){
    mapMessage=revealMapPickup(it.t);
    mini(); // la informació apareix de seguida, sense entrar a cap menú
  }
  else if(it.t==='franctirador'){inv.franctirador=1;sniperAmmo+=6}
  else inv[it.t]=(inv[it.t]||0)+(it.t==='granada'?5:it.t==='bazooka'?3:1);
  world.remove(it.o);items.splice(k,1);
  msg=mapMessage||'Has trobat: '+IT[it.t].n+(it.t==='granada'?' ×5':it.t==='bazooka'?' ×3':it.t==='franctirador'?' +6 cartutxos':'');
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
  // Contacte visual dels peus amb el triangle sota cada bota: a les
  // baixades el centre del cos és més alt que la posició dels peus.
  pl.updateMatrixWorld(true);
  const boots=pl.userData.boots||[];
  let closest=Infinity;
  for(const boot of boots){
    const p=boot.getWorldPosition(new THREE.Vector3());
    closest=Math.min(closest,p.y-groundAt(p.x,p.z,P.y));
  }
  if(Number.isFinite(closest))pl.position.y-=Math.max(-.06,Math.min(.36,closest-.16));
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
  }else if(playerEject.kind==='blast'){
    const airborne=Math.max(0,playerEject.height||0),wave=Math.sin(Math.PI*p);
    pl.position.y+=airborne;
    pl.rotation.x=-wave*1.05;
    pl.rotation.z=(playerEject.roll||1)*wave*.95;
    if(u.al)u.al.rotation.x=-1.25*wave;
    if(u.ar)u.ar.rotation.x=-1.1*wave;
    if(u.ll)u.ll.rotation.x=.75*wave;
    if(u.lr)u.lr.rotation.x=-.85*wave;
  }
}
V.forEach(v=>{
  if(v===cv){place(v,t,dt,v.steerInput||0);return}
  const dx=v.x-P.x,dz=v.z-P.z,d2=dx*dx+dz*dz,
    scopeVisual=scopeActive&&currentSniperFocus().contains(v.x,v.o.position.y+1.5,v.z,5),
    interval=scopeVisual||d2<LOD_NEAR2?0:(d2<LOD_MID2 ? .1 : .45);
  if(interval===0){place(v,t,dt,0);v.visualLodAcc=0}
  else{v.visualLodAcc=(v.visualLodAcc||0)+dt;if(v.visualLodAcc>=interval){const step=v.visualLodAcc;v.visualLodAcc=0;place(v,t,step,0)}}
});poseRider(cv,dt);
// Les torretes dels blindats del jugador segueixen gradualment el vector
// que triaria l'autoapuntat actual. El vehicle pot avançar/girar mentre
// la torre conserva el seu propi rumb i l'elevació del canó.
if(cv&&(cv.t==='tanc'||cv.t==='tanqueta')){
    const gun=window.HUNTER_VEHICLES.turretShot(THREE,cv.o);
  if(gun){
    const hd=cv.hd,fx=-Math.sin(hd),fz=-Math.cos(hd),
          range=cv.t==='tanc'?220:85,
          heavy=cv.t==='tanc',
          [ax,ay,az]=autoAimArmoredShot(
            gun.origin.x,gun.origin.y,gun.origin.z,fx,fz,range,
            heavy?'heavy':'light',heavy?85*HEAVY_SHOT_SPEED_FACTOR:135);
    window.HUNTER_VEHICLES.aimTurret(THREE,cv.o,
      new THREE.Vector3(ax,ay,az),dt);
  }
}
const scopeNow=scopeActive&&sniperEquipped&&!cv&&!playerFall&&!swimming;
const fieldOfView=scopeNow?2*Math.atan(Math.tan(58*Math.PI/360)/8)*180/Math.PI:58;
if(Math.abs(cam.fov-fieldOfView)>.001){cam.fov=fieldOfView;cam.updateProjectionMatrix()}
if(scopeNow){
  const fx=-Math.sin(scopeYaw),fz=-Math.cos(scopeYaw),vertical=Math.tan(scopePitch);
  cam.position.set(P.x-fx*.12,P.y+1.76,P.z-fz*.12);
  cam.lookAt(P.x+fx*160,P.y+1.76+vertical*160,P.z+fz*160);
}else{
  const T=cv||P,c=cv?VT[cv.t]:ib?{cd:6,ch:11}:{cd:10,ch:5},ty=cv?cv.o.position.y:P.y,
    w=new THREE.Vector3(T.x+Math.sin(T.hd)*c.cd*zoom*(cv?Math.sqrt(VS[cv.t]):1),0,T.z+Math.cos(T.hd)*c.cd*zoom*(cv?Math.sqrt(VS[cv.t]):1));
  // Mode soterrani també durant el PRIMER esglaó, no només quan
  // el jugador ja ha baixat 2 m. La càmera no es pot quedar darrere
  // d'un envà opac, ni pot perseguir l'altura exterior de la muntanya.
  const b=activeBunker,local=b?.basement&&!cv?buildingLocalPoint(b,P.x,P.z):null,
        inside=!!local&&Math.abs(local.x)<b.basement.halfX-.5&&
        Math.abs(local.z)<b.basement.halfZ-.5;
  const stair=b?.basement?.stair;
  const descending=!!local&&Math.abs(local.x-stair.x)<stair.width/2+.45&&
    local.z>=stair.zBottom-.5&&local.z<=stair.zTop+.4&&P.y<b.fy+.04;
  const bunkerBelow=!!inside&&(P.y<b.fy-3.9||descending);
  // El forjat ÉS el sostre del soterrani. No s'ha d'amagar:
  // ara que la càmera és sempre a sota, es veu el plafó i no es
  // produeix cap obstrucció; els llums queden ancorats al sostre real.
  if(b?.basement)for(const slab of b.basement.upperSlabMeshes)slab.visible=true;
  // Les parets ocultades a l'últim fotograma tornen a ser visibles
  // abans de calcular les que ara queden entre la càmera i el jugador.
  if(b?.basement?.cameraHiddenWalls){
    for(const mesh of b.basement.cameraHiddenWalls)mesh.visible=true;
    b.basement.cameraHiddenWalls.length=0;
  }
  if(bunkerBelow){
    // Càmera estable a distància normal, sense correccions angulars
    // brusques ni l'antic raycast que la teletransportava davant dels envans.
    const targetEye=new THREE.Vector3(P.x,
      Math.min(b.fy-1.0,Math.max(b.basement.floorY+1.6,P.y+1.65)),P.z);
    const cameraDistance=Math.max(10.5,Math.min(17,13.5*zoom));
    const cameraHeight=Math.max(b.basement.floorY+5.4,
      Math.min(b.fy-1.55,P.y+7.2));
    const heading=T.hd;
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
    cam.position.copy(w);
    // La càmera POT travessar els envans. Només ocultam les peces
    // físiques interposades entre càmera i jugador, no les parets
    // de tota la cambra ni les col·lisions del personatge.
    for(const wall of wallCandidates(
      (targetEye.x+cam.position.x)/2,(targetEye.z+cam.position.z)/2,
      cameraDistance/2+2)){
      if(wall.owner!==b||!wall.bunkerBasementWall||!wall.m)continue;
      if(wall.y1<Math.min(targetEye.y,cam.position.y)||
         wall.y0>Math.max(targetEye.y,cam.position.y))continue;
      const hit=segmentAabbT(targetEye.x,targetEye.y,targetEye.z,
        cam.position.x,cam.position.y,cam.position.z,
        wall.x0,wall.x1,wall.y0,wall.y1,wall.z0,wall.z1);
      if(hit!==null&&hit>.005&&hit<.995){
        wall.m.visible=false;
        b.basement.cameraHiddenWalls.push(wall.m);
      }
    }
    b.basement.cameraInside=true;
  }else{
    if(b?.basement)b.basement.cameraInside=false;
    w.y=Math.max(ty+c.ch*zoom*(cv?Math.sqrt(VS[cv.t]):1),hAt(w.x,w.z)+3,2.5);
    cam.position.lerp(w,1-Math.pow(.001,dt));
  }
  cam.lookAt(T.x-Math.sin(T.hd)*(bunkerBelow?3.5:8),
    Math.min(bunkerBelow?b.fy-1.0:Infinity,ty+(bunkerBelow?2.0:2)),
    T.z-Math.cos(T.hd)*(bunkerBelow?3.5:8));
}
if(playerEject&&playerEject.t<=0)playerEject=null;
updateBazookaReticle(dt);
fcd-=dt;updateGrenadeCharge(dt);if(K.KeyF&&(!grenadeEquipped||cv))fire();updEn(dt);
window.HUNTER_STEALTH_DEBUG.update(THREE,world,E,P);
updDead(dt);updPj(dt);updFx(dt);updExtra(dt,t);
const nv=cv?null:nearV();
uiTick+=dt;if(uiTick>.12){uiTick=0;const contextButtons=document.getElementById('contextButtons');if(contextButtons){contextButtons.classList.toggle('heli-active',(!cv&&cheats.fly)||(!!cv&&VT[cv.t]?.m==='a'));contextButtons.classList.toggle('heli-combat-active',cv?.t==='heli_combat');contextButtons.classList.toggle('sniper-active',!!sniperEquipped&&!!inv.franctirador&&!cv)}const fireButton=document.getElementById('mainFireButton');
if(fireButton){
  const heliGrenade=cv?.t==='heli',
        grenade=heliGrenade||!cv&&grenadeEquipped&&(inv.granada||0)>0,
        cutters=!cv&&cisallaEquipped&&(inv.cisalla||0)>0,
        knife=!cv&&(knifeEquipped||!grenade&&!cutters&&!bazookaEquipped&&!sniperEquipped&&ammo<=0),
        weapon=cutters?'cisalla':grenade?'granada':knife?'ganivet':'normal';
  if(fireButton.dataset.weapon!==weapon){
    fireButton.dataset.weapon=weapon;
    fireButton.innerHTML=cutters?ICON.cisalla:grenade?ICON.granada:knife?ICON.ganivet:'🎯';
    const action=cutters?'Talla filferrada':grenade?'Llançar granada':knife?'Atacar amb ganivet':'Dispar';
    fireButton.setAttribute('aria-label',action);
    fireButton.title=heliGrenade?'Llançar granada de l’inventari':grenade?'Mantén premut per arribar més lluny':action;
  }
}
updateActionButton(nv);syncWeaponPicker();if(pickerOpen)drawWeaponPicker();
mini();ui.renderHUD();}}


let last=performance.now();
(function loop(now){const rawDt=(now-last)/1000,dt=Math.min(.05,Math.max(0,rawDt));last=now;const t=elapsed+(victoryCinematic?victoryCinematic.t:started&&!paused&&!over?dt:0),cpuStarted=performance.now();
update(dt,t);
syncWeaponPicker();
if(victoryCinematic?.active||victoryCinematic?.finished)updateVictoryCinematic(dt);
 if(deathCinematic?.active)updateDeathCinematic(dt);
const simulationEnded=performance.now();
if(started&&!paused&&(!over||victoryCinematic?.active)&&terrainStream)
  terrainStream.update(victoryCinematic?.active?cam.position.x:P.x,
    victoryCinematic?.active?cam.position.z:P.z,visualQuality.shadows?2:1.2,cam,
    victoryCinematic?.active?null:currentSniperFocus());const terrainEnded=performance.now();
 // El món no queda congelat durant la repetició: les onades avancen
 // lentament mentre la càmera i el cos es mouen a velocitat cinematogràfica.
 waves(t+(deathCinematic?.active?deathCinematic.t*.18:0));
sun.target.position.set(victoryCinematic?cam.position.x:P.x,0,
  victoryCinematic?cam.position.z:P.z);
sun.position.copy(sun.target.position).addScaledVector(sunDir,500);sky.position.copy(cam.position);sunM.position.copy(cam.position).addScaledVector(sunDir,visualQuality.sunDistance||3500);if(rendering.glow)rendering.glow.position.copy(sunM.position);const renderStarted=performance.now();for(const k in renderCategories)renderCategories[k]=0;
 if(deathVoidReady()){
   const v=deathCinematic;v.voidCamera.aspect=cam.aspect;v.voidCamera.updateProjectionMatrix();
   ren.render(v.voidScene,v.voidCamera);
 }else ren.render(scene,cam);
if(started&&!paused&&!over){
  advanceTerrainTexture();
  if(waterUpgradePending){water.queueResolutionUpgrade();waterUpgradePending=false}
  water.stepResolutionUpgrade(2);
}
adaptivePerformance.sample({dt:rawDt,renderCpuMs:performance.now()-renderStarted,
  updateCpuMs:simulationEnded-cpuStarted,terrainCpuMs:terrainEnded-simulationEnded,
  active:!!started&&!paused&&!over,now});
requestAnimationFrame(loop)})(last);



