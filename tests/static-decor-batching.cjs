const assert=require('node:assert/strict');
(async()=>{
 const game=await require('./harness.cjs')();
 game.start('2407759483');
 const check=game.run("(()=>{\n   const stats=window.HUNTER_STATIC_BATCH_STATS,\n     meshes=world.children.filter(m=>m.userData.staticDecorBatch||m.name==='hunter-static-decor-batch');\n   let allValid=true,colorful=false;\n   for(const m of meshes){\n     const geo=m.geometry,p=geo.getAttribute('position'),c=geo.getAttribute('color');\n     if(!m.isMesh||!m.material.vertexColors||!c||c.count!==p.count||!geo.boundingSphere||p.count===0)allValid=false;\n     if(c&&c.count>30)colorful=true;\n   }\n   const walls=Wl.length,buildings=B.length,piersCount=piers.length,compoundCount=world.userData.compounds.length;\n   const valid=stats.originalMeshes>stats.batchedMeshes&&stats.batchedMeshes===meshes.length&&stats.drawCallsSaved>100;\n   return {valid,allValid,colorful,walls,buildings,piersCount,compoundCount,...stats};\n })()");
 assert(check.valid,'batches should eliminate substantial static draw calls');
 assert(check.allValid&&check.colorful,'batched geometry retains colors and bounds');
 assert(check.walls>0&&check.buildings>0&&check.piersCount>0&&check.compoundCount>0,'collision records and structures remain');
 console.log('PASS: compound props, paths and piers are spatially batched',JSON.stringify(check));
})().catch(err=>{console.error(err);process.exitCode=1});