const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..'),THREE=await import(require('node:url').pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')));
 const ctx=vm.createContext({window:{},Math,Uint8Array});ctx.window=ctx;
 for(const file of ['src/visual-config.js','src/high-graphics.js'])
   vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
 const quality=ctx.HUNTER_VISUAL_CONFIG;
 assert(quality.desktop.terrainDetailTexture&&quality.desktop.playerShadows&&quality.desktop.coastDetail);
 assert(quality.desktop.waterSegments>320&&quality.desktop.shadowDistance>225);
 assert(!quality.mobile.terrainDetailTexture&&!quality.ultra.terrainDetailTexture);
 const texture=ctx.HUNTER_HIGH_GRAPHICS.createTerrainTexture(THREE,64);
 assert.equal(texture.image.width,64);
 assert.equal(texture.image.height,64);
 assert.equal(texture.repeat.x,20);
 const texels=texture.image.data;
 assert(new Set(Array.from(texels).filter((_,i)=>i%4===0)).size>8,'detail texture varies spatially');
 assert.equal(texture.anisotropy,4);
 const task=ctx.HUNTER_HIGH_GRAPHICS.createTerrainTextureTask(THREE,32);
 assert.equal(task.progress,0);
 assert.equal(task.advance(4),null,'first pass must not create the texture');
 assert.equal(task.progress,4/32);
 let incremental=null;
 while(!incremental)incremental=task.advance(4);
 assert.equal(incremental.image.width,32);
 incremental.dispose();
 const game=await require('./harness.cjs')();
 assert(game.run('!highTerrainTexture&&terrainTextureTask.progress===0'),'defer the procedural texture while engine loads');
 game.start('67');
 assert(game.run('water.resolution===160&&!highTerrainTexture'),'first playable scene uses reduced water grid and pending texture');
 const warmup=game.run(`(()=>{
   while(!highTerrainTexture)advanceTerrainTexture();
   const queued=water.queueResolutionUpgrade();
   let steps=0;
   while(!water.stepResolutionUpgrade(6)&&steps++<150){} 
   return {queued,steps,ready:water.resolution===visualQuality.waterSegments,
     mapped:terrainStream.mesh.children.filter(m=>m.userData.terrainTile)
       .every(m=>m.material.map===highTerrainTexture)};
 })()`);
 assert(warmup.queued&&warmup.ready&&warmup.mapped,'graphics warmup must finish without changing the terrain model '+JSON.stringify(warmup));
 const report=game.run(`(()=>{
   const player=shadowCandidates.filter(e=>e.owner===pl),active=player.filter(e=>e.mesh.castShadow),
     terrain=terrainStream.mesh.children.filter(m=>m.userData.terrainTile&&m.receiveShadow),
     cfg=VISUAL_RANGES;
   const before=shadowStats.playerCasters;
   setShadowsDisabled(true);
   const off=player.every(e=>!e.mesh.castShadow);
   setShadowsDisabled(false);
   const on=player.some(e=>e.mesh.castShadow)&&sun.castShadow&&ren.shadowMap.enabled;
   return {playerCasters:before,playerMeshes:player.length,active:active.length,
     terrainReceiving:terrain.length,off,on,visibleBuildings:cfg.buildings,
     waterSegments:water.geometry.parameters?.widthSegments||visualQuality.waterSegments,
     profile:qualityName};
 })()`);
 assert.equal(report.profile,'desktop');
 assert(report.playerCasters>=8&&report.playerMeshes>=8&&report.active>=8,JSON.stringify(report));
 assert(report.terrainReceiving>0&&report.off&&report.on,JSON.stringify(report));
 assert(report.visibleBuildings>=1100&&report.waterSegments===384);
 const skirtUV=game.run(`terrainStream.mesh.children.filter(m=>m.userData.terrainTile)
   .every(m=>!m.material.map||m.geometry.attributes.uv.count===m.geometry.attributes.position.count)`);
 assert(skirtUV,'texture UVs must extend over LOD seam skirts');
 texture.dispose();
 console.log('PASS: high textures, expanded visibility, caster silhouette, near-ground shadows',JSON.stringify(report));
})().catch(error=>{console.error(error);process.exitCode=1});