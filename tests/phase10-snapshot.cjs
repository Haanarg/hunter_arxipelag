'use strict';
// Semantic state only. Rendering object identities and timings are intentionally excluded.
// Capture this from the untouched v0.5.79 checkout before comparing either changed path.
module.exports=`(()=>{
  const skip=new Set(['o','m','parts','geometry','material','wm','dm','roof','wallMat','doorMat',
    'parent','children','_listeners','matrix','matrixWorld','normalMatrix','modelViewMatrix',
    'owner','building','door','doors','structuralWalls','f','layout','buildings','loot','vehicles',
    'basement','interiorStair','loadingRamp','gate','ramp','waterMask',
    '_buildingQueryStamp','_wallQueryStamp']); // transient spatial-query cache stamps, not world semantics
  const plain=(value,depth=3,seen=new Set())=>{
    if(value===null||['string','boolean'].includes(typeof value))return value;
    if(typeof value==='number')return Number.isFinite(value)?value:String(value);
    if(typeof value!=='object'||depth<0||seen.has(value))return undefined;
    if(value.isObject3D||value.isBufferGeometry||value.isMaterial||value.isTexture)return undefined;
    if(value.isVector2||value.isVector3||value.isEuler)return Object.fromEntries(['x','y','z'].filter(k=>k in value).map(k=>[k,value[k]]));
    seen.add(value);
    let result;
    if(Array.isArray(value))result=value.map(v=>plain(v,depth-1,seen));
    else if(value instanceof Map)result=[...value].map(([k,v])=>[k,plain(v,depth-1,seen)]);
    else result=Object.fromEntries(Object.keys(value).sort().filter(k=>!skip.has(k)&&typeof value[k]!=='function').map(k=>[k,plain(value[k],depth-1,seen)]).filter(([,v])=>v!==undefined));
    seen.delete(value);return result;
  };
  const heights=[];
  for(let i=-20;i<=20;i++)for(let j=-20;j<=20;j++){
    const x=i*H/20,z=j*H/20;heights.push([x,z,hAt(x,z)]);
  }
  const rng=Array.from({length:16},()=>R());
  return JSON.parse(JSON.stringify({
    seed,scale:MAP_SCALE,size:S,player:plain(P),islands:plain(islands),heights,
    buildings:B.map(b=>({...plain(b),door:Dr.indexOf(b.door),basement:plain(b.basement),
      interiorStair:plain(b.interiorStair),rotation:b.o?.rotation.y??null})),
    walls:Wl.map(w=>({...plain(w),owner:B.indexOf(w.owner)})),
    doors:Dr.map(d=>({...plain(d),wall:Wl.indexOf(d)})),stairs:plain(stairs),piers:plain(piers),
    loot:items.map(it=>({...plain(it),building:B.indexOf(it.building)})),
    vehicles:V.map(v=>plain(v)),enemies:E.map(e=>plain(e)),
    vegetation:[...TG].map(([key,entries])=>[key,plain(entries)]),palms:plain(PL),
    compounds:(world.userData.compounds||[]).map(c=>({...plain(c),
      buildings:(c.buildings||[]).map(b=>B.indexOf(b)),
      loot:(c.loot||[]).map(it=>items.indexOf(it)),vehicles:plain(c.vehicles),
      loadingRamp:plain(c.loadingRamp)})),
    paths:plain(world.userData.paths,5),marinePatrolPositions:plain(world.userData.marinePatrolPositions),
    terrainLevels:plain(terrainLevels),compoundClear:plain(compoundClear),rng
  }));
})()`;
