(async()=>{
// Tests de malles de terreny: sense navegador, amb Three.js real.
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),THREE=await import(require('url').pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')));
const ctx=vm.createContext({console,Math,Float32Array,Uint16Array,performance});ctx.window=ctx;
vm.runInContext(fs.readFileSync(path.join(root,'src/terrain.js'),'utf8'),ctx,{filename:'src/terrain.js'});
const sys=ctx.HUNTER_TERRAIN;
const h=(x,z)=>Math.sin(x*.008)*12+Math.cos(z*.005)*8-3;
let evaluations=0;
const measured=(x,z)=>{evaluations++;return h(x,z)};
function create(size,lowQuality=false){
  const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true});
  return sys.create(THREE,{size,segments:400,heightAt:measured,material,startX:0,startZ:0,lowQuality});
}
const terrain=create(4800);
assert.equal(terrain.stats.totalTiles,36);
assert(terrain.stats.initialTiles>=4&&terrain.stats.initialTiles<=16);
assert(terrain.stats.generatedTiles===terrain.stats.initialTiles);
assert(terrain.stats.processedVertices<160000,'startup should avoid global high-resolution terrain');
assert.equal(terrain.mesh.children.length,terrain.stats.generatedTiles);
const tiles=terrain.mesh.children;
assert(tiles.every(m=>m.userData.terrainTile),'tile meshes marked for shadow avoidance');
for(const m of tiles){
  const g=m.geometry,p=g.attributes.position,c=g.attributes.color;
  assert(p.count>0&&p.count===c.count);
  assert(g.index.count>0&&g.index.count%3===0);
  const i=0;
  assert(Math.abs(p.getY(i)-h(m.position.x+p.getX(i),m.position.z+p.getZ(i)))<1e-5,'tile preserves simulation height');
}
for(let frame=0;frame<2400&&terrain.stats.generatedTiles<36;frame++)
  terrain.update(0,0,3);
assert.equal(terrain.stats.generatedTiles,36,'all distant tiles are generated progressively');
assert.equal(terrain.mesh.children.length,36,'LOD replacement must not duplicate draw calls');
assert.equal(terrain.stats.visibleTiles,36,'visible tile counter excludes upgrades');
// After moving to a new island, distant sectors must upgrade their LOD.
for(let frame=0;frame<500&&terrain.stats.upgradedTiles===0;frame++)
  terrain.update(1550,1100,3);
assert(terrain.stats.upgradedTiles>0,'approaching new sectors upgrades their LOD');
const nearGeom=terrain.mesh.children[0].geometry;
let disposed=false;nearGeom.addEventListener('dispose',()=>disposed=true);
terrain.dispose();
assert(disposed,'terrain geometry disposed on restart');
assert.equal(terrain.mesh.children.length,0,'terrain group emptied');
const large=create(9600,true);
assert.equal(large.stats.totalTiles,144,'large map is tiled');
assert(large.stats.initialTiles>=4&&large.stats.initialTiles<=16,'large map only generates start sectors');
large.dispose();
console.log(JSON.stringify({passed:true,initialTiles:tiles.length,tiles:36,
  initialVertexBudget:true,progressiveUpgrade:true,disposal:true,largeMap:true,evaluations}));
})().catch(e=>{console.error(e);process.exitCode=1});
