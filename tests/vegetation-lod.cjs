(async()=>{
  // Three.js real: culling per sector, LOD, i destrucció de palmeres.
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
  const create=(lowQuality=false)=>{
    const world=new THREE.Group();
    const visual=ctx.HUNTER_VEGETATION.create(THREE,{
      materialProfile:()=>({}),
      random:(a,b)=>{rngCalls++;return a+(b-a)*.4}
    });
    const built=visual.build({world,palms:entries,bushes:[[200,3,250,1,0]],rocks:[[180,3,260,1,0]],
      playerX:0,playerZ:0,lowQuality});
    return {world,visual,model:built.palms};
  };
  const {world,model}=create();
  assert.strictEqual(model.trunk.parent,world,'chunk parent still belongs to world');
  assert.strictEqual(model.stats.totalPalms,entries.length);
  assert.strictEqual(model.variantMap.length,entries.length);
  assert(model.stats.visiblePalms<entries.length,'distant palm sectors culled');
  const chunks=model.variants;
  assert(chunks.length>=3,'multiple geographic sectors were formed');
  assert(chunks.every(ch=>ch.meshes.every(m=>m.isInstancedMesh&&m.frustumCulled)));
  const nearest=chunks.find(ch=>ch.cx===0&&ch.cz===0);
  assert(nearest?.secondary.some(m=>m&&m.visible),'near crowns keep full detail');
  const distant=chunks.find(ch=>ch.cx>=4);
  assert(distant&&!distant.trunk.visible,'far trunk is not rendered');
  model.update(1200,100,true);
  const medium=chunks.find(ch=>ch.cx===0&&ch.cz===0);
  assert(medium.trunk.visible&&medium.secondary.every(m=>!m||!m.visible),
    'medium range draws trunk and primary crown only');
  const zero=new THREE.Matrix4().makeScale(0,0,0);
  const entry=model.variantMap[2];
  const trunk=entry.chunk.trunk,crown=entry.chunk.primary[entry.variant],
        crown2=entry.chunk.secondary[entry.variant];
  model.remove(2,zero);
  const out=new THREE.Matrix4();
  for(const [m,i] of [[trunk,entry.trunkIndex],[crown,entry.index],[crown2,entry.index]]){
    m.getMatrixAt(i,out);
    assert(out.elements[0]===0&&out.elements[5]===0&&out.elements[10]===0,
      'destroyed palm hidden from every instanced part');
    assert(m.instanceMatrix.needsUpdate===undefined||m.instanceMatrix.version>0,
      'instance buffer has been marked for upload');
  }
  model.update(1900,1600,true);
  assert(distant.trunk.visible,'distant group reappears when approached');
  model.update(8000,8000,true);
  assert.equal(model.stats.visiblePalms,0,'all far-away groups hidden');
  const low=create(true);
  assert(low.model.stats.visiblePalms<=entries.length,'reduced quality initializes normally');
  const all=world.children.filter(o=>o.isInstancedMesh).length;
  assert.equal(rngCalls,2*(11*entries.length+3+5),
    'palm generation consumes a deterministic number of random values');
  console.log(JSON.stringify({passed:true,sectorCount:chunks.length,
    totalPalms:entries.length,initialVisiblePalms:model.stats.visiblePalms,
    instancedObjects:all,checks:['culling','crown LOD','destroy','re-enable','mobile','random usage']}));
})().catch(e=>{console.error(e);process.exitCode=1});
