const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const T=await import(require('node:url').pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')));
 const c=vm.createContext({Math,console,Float32Array});c.window=c;
 for(const file of ['src/water-config.js','src/waves.js','src/coast-foam.js','src/water.js'])
   vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
 const heightAt=(x,z)=>4.8-Math.hypot(x,z)*.075;
 const create=detail=>c.HUNTER_WATER_SYSTEM.create(T,{
   scene:new T.Scene(),sunDir:new T.Vector3(.3,.24,-1).normalize(),
   size:650,segments:48,heightAt,config:c.HUNTER_WATER,coastDetail:detail
 });
 const low=create(false),high=create(true);
 low.updateSeabed();high.updateSeabed();
 assert.equal(low.shore,null,'mobile/ultra do not create shoreline geometry');
 assert(high.shore&&high.shore.parent,'high profile has independent shore strip');
 assert(high.shoreStats.segments>5,'contours find coast '+JSON.stringify(high.shoreStats));
 assert.equal(high.shoreStats.vertices,high.shoreStats.segments*6);
 assert.equal(high.shoreStats.triangles,high.shoreStats.segments*4);
 assert.equal(high.shore.renderOrder,3,'foam drawn just above water');
 assert(high.shore.material.transparent&&!high.shore.material.depthWrite);
 assert(high.shore.material.vertexShader.includes('hunterWaveHeight('));
 assert.strictEqual(high.shore.material.uniforms.time,high.uniforms.time);
 const p=high.shore.geometry.attributes.position;
 let onCoast=0;
 for(let k=1;k<p.count;k+=6)if(Math.abs(heightAt(p.getX(k),p.getZ(k)))<1.2)onCoast++;
 assert(onCoast>high.shoreStats.segments*.65,'foam follows accurate shore geometry');
 const old=high.shore.geometry;let disposed=false;old.addEventListener('dispose',()=>disposed=true);
 high.setWorldSize(720);
 assert(disposed&&high.shore.geometry!==old,'shore re-created with ocean');
 const original=high.surfaceHeight(13,17,1.7);
 high.update(1.7);
 assert.equal(high.uniforms.time.value,1.7);
 assert.equal(high.surfaceHeight(13,17,1.7),original,'wave physics unchanged');
 high.shore.visible=false;
 assert(high.shoreStats.sampledPoints<high.geometry.attributes.position.count*10,
   'only local coastal cells are sampled');
 const scene=high.shore.parent;
 high.dispose();low.dispose();assert.equal(scene.children.length,0);
 console.log('PASS: shoreline foam, accurate contour, shared waves, cleanup and mobile isolation',JSON.stringify(high.shoreStats));
})().catch(e=>{console.error(e);process.exitCode=1});
