(async()=>{
  // Three.js real: tres geometries, histèresi, instancing, destrucció i llavors.
  const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
  const root=path.resolve(__dirname,'..');
  const THREE=await import(require('url').pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')));
  const ctx=vm.createContext({console,Math,Float32Array});ctx.window=ctx;
  vm.runInContext(fs.readFileSync(path.join(root,'src/vegetation.js'),'utf8'),ctx);
  const entries=[
    [0,6,0,1,0,-1,0],[75,5,50,1.1,.5,0,.1],
    [800,9,100,1.2,1,1,-.1],[840,9,140,1,2,-1,0],
    [-910,8,700,.9,1.7,0,.2],[1900,10,1600,1.1,.2,1,0]
  ];
  let rngCalls=0;
  const create=(lowQuality=false,lodProfile=null)=>{
    const world=new THREE.Group();
    const visual=ctx.HUNTER_VEGETATION.create(THREE,{
      materialProfile:()=>({}),
      random:(a,b)=>{rngCalls++;return a+(b-a)*.4}
    });
    const built=visual.build({world,palms:entries,
      bushes:[[200,3,250,1,0]],rocks:[[180,3,260,1,0]],
      playerX:0,playerZ:0,lowQuality,lodProfile});
    return {world,visual,model:built.palms};
  };
  const {world,visual,model}=create();
  assert.equal(model.trunk.parent,world,'palm root belongs to world');
  assert.equal(model.stats.totalPalms,entries.length,'all palms represented');
  assert.equal(model.variantMap.length,entries.length,'destroy map preserved');
  assert(model.stats.visiblePalms<entries.length,'distant sectors culled');
  assert.equal(model.stats.profile,'desktop');
  assert.equal(model.stats.nearDistance,260);
  assert.equal(model.stats.midDistance,650);
  assert.equal(model.stats.farDistance,1900);
  const chunks=model.variants;
  assert(chunks.length>=3,'chunks separated geographically');
  assert(chunks.every(ch=>ch.meshes.every(m=>m.isInstancedMesh&&m.frustumCulled)),
    'all three LODs are sectorized InstancedMeshes');
  const near=chunks.find(ch=>ch.cx===0&&ch.cz===0);
  assert(near&&near.lod===0&&near.trunk.visible&&
    near.secondary.some(m=>m&&m.visible),'near palms keep all crown details');

  const tris=g=>g.index?g.index.count/3:g.attributes.position.count/3;
  const full=tris(visual.geometry.trunk)+
    tris(visual.geometry.palmVariants[0].crown)+
    tris(visual.geometry.palmVariants[0].crown2);
  const medium=tris(visual.geometry.midTrunk)+tris(visual.geometry.midCrown);
  const far=tris(visual.geometry.farTrunk)+tris(visual.geometry.farCrown);
  assert(medium<full/2,'mid geometry uses fewer than half the triangles');
  assert(far<full/5,'far geometry uses at least 80% fewer triangles');

  const visibleCount=ch=>ch.meshes.filter(m=>m.visible).length;
  assert.equal(visibleCount(near),1+near.primary.filter(Boolean).length+near.secondary.filter(Boolean).length,
    'near group keeps all detailed variants of its crowns');
  model.update(730,0,true);
  assert.equal(near.lod,0,'stay at near LOD inside 55m margin');
  model.update(750,0,true);
  assert.equal(near.lod,1,'closer threshold changes to medium earlier');
  assert.equal(visibleCount(near),2,'mid-distance group draws only two instanced meshes');
  assert(near.midTrunk.visible&&near.midCrown.visible&&
    !near.trunk.visible&&!near.secondary.some(m=>m&&m.visible));
  assert(!near.midCrown.receiveShadow&&!near.midTrunk.receiveShadow,
    'reduced models do not receive shadow maps');
  model.update(720,0,true);
  assert.equal(near.lod,1,'hysteresis prevents immediate switch back');
  model.update(610,0,true);
  assert.equal(near.lod,0,'full detail returns once genuinely near');
  model.update(1220,0,true);
  assert.equal(near.lod,2,'far palm becomes three crossed leaf planes');
  assert.equal(visibleCount(near),2,'far palm still uses two instanced meshes');
  assert(near.farTrunk.visible&&near.farCrown.visible);
  assert(model.stats.farSectors>=1,'LOD stats count simplified far sectors');
  model.update(2440,0,true);
  assert.equal(near.lod,3,'sectors are hidden beyond viewing distance');
  assert.equal(visibleCount(near),0,'no distant palm meshes remain visible');
  model.update(0,0,true);
  assert(near.trunk.visible&&near.secondary.some(m=>m&&m.visible),
    'near palms recover full detailed meshes');
  assert(model.stats.lodSwitches>=5,'LOD transitions measured');

  const zero=new THREE.Matrix4().makeScale(0,0,0),out=new THREE.Matrix4();
  const entry=model.variantMap[2],ch=entry.chunk;
  const indices=[
    [ch.trunk,entry.trunkIndex],
    [ch.primary[entry.variant],entry.index],
    [ch.secondary[entry.variant],entry.index],
    [ch.midTrunk,entry.trunkIndex],
    [ch.midCrown,entry.trunkIndex],
    [ch.farTrunk,entry.trunkIndex],
    [ch.farCrown,entry.trunkIndex]
  ];
  model.remove(2,zero);
  for(const [mesh,index] of indices){
    mesh.getMatrixAt(index,out);
    assert(out.elements[0]===0&&out.elements[5]===0&&out.elements[10]===0,
      'destroyed palm hidden from all seven geometric parts');
    assert(mesh.instanceMatrix.version>0,
      'updated instance matrix sent to GPU on next render');
  }
  model.update(1900,1600,true);
  assert(ch.farTrunk.visible||ch.midTrunk.visible||ch.trunk.visible,
    'distant sector reappears near the player');
  model.update(8000,8000,true);
  assert.equal(model.stats.visiblePalms,0,'all palms culled far from the map');
  const low=create(true);
  assert.equal(low.model.stats.profile,'mobile');
  assert.equal(low.model.stats.nearDistance,190,'mobile switches away from detailed palms earlier');
  assert.equal(low.model.stats.midDistance,470,'mobile switches to crossed crowns earlier');
  assert.equal(low.model.stats.farDistance,1250,'mobile retains original far clip');
  assert(low.model.stats.visiblePalms<=entries.length,'mobile LOD initializes');
  const ultra=create(true,'ultra');
  assert.equal(ultra.model.stats.profile,'ultra','lowest preset is independent of mobile');
  assert.equal(ultra.model.stats.nearDistance,120);
  assert.equal(ultra.model.stats.midDistance,300);
  assert.equal(ultra.model.stats.farDistance,850);
  assert(ultra.model.stats.detailSectors<=low.model.stats.detailSectors&&
         low.model.stats.detailSectors<=model.stats.detailSectors,
    'number of high-detail sectors decreases on weaker devices');
  assert(ultra.model.stats.visiblePalms<=low.model.stats.visiblePalms,
    'lowest preset culls its crossed-crown sectors sooner');
  const ultraNear=ultra.model.variants.find(ch=>ch.cx===0&&ch.cz===0);
  ultra.model.update(600,0,true);
  assert.equal(ultraNear.lod,1,'ultra switches to simplified palms after the shorter threshold');
  low.model.update(680,0,true);
  const mobileNear=low.model.variants.find(ch=>ch.cx===0&&ch.cz===0);
  assert.equal(mobileNear.lod,1,'mobile switches to simplified palms after the shorter threshold');
  assert.equal(rngCalls,3*(11*entries.length+3+5),
    'simplified LODs must not consume additional world RNG values');
  console.log(JSON.stringify({passed:true,sectorCount:chunks.length,
    trianglesPerPalm:{full,medium,far},
    reduction:{medium:Math.round((1-medium/full)*100),
               far:Math.round((1-far/full)*100)},
    switches:model.stats.lodSwitches,
    checks:['instance LOD','hysteresis','shadow-free distance','destruction',
      'frustum culling','mobile','RNG preserved']}));
})().catch(e=>{console.error(e);process.exitCode=1});
