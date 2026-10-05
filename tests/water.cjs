const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),c=vm.createContext({Math,console,Float32Array});c.window=c;
for(const f of ['vendor/three-r128.min.js','src/water-config.js','src/waves.js','src/water.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
const {THREE:T,HUNTER_WAVES:w,HUNTER_WATER_SYSTEM:system,HUNTER_WATER:config}=c;
let samples=0;
for(const size of [4800,9600])for(const segments of [240,400]){
 const scene=new T.Scene(),bed=(x,z)=>-12+8*Math.sin(x*.004)*Math.cos(z*.006);
 const water=system.create(T,{scene,sunDir:new T.Vector3(0,1,0),size,segments,heightAt:bed,config});water.updateSeabed();
 const g=water.geometry,p=g.attributes.position,b=g.attributes.seabed;
 // Independently sample triangles using Three.js barycentric coordinates.
 for(let i=0;i<150;i++){
  const ti=(i*7919%(g.index.count/3))*3,ids=[g.index.getX(ti),g.index.getX(ti+1),g.index.getX(ti+2)];
  const vertices=ids.map(j=>new T.Vector3(p.getX(j),0,p.getZ(j)));
  const q=new T.Vector3().addScaledVector(vertices[0],.2).addScaledVector(vertices[1],.35).addScaledVector(vertices[2],.45);
  const bary=T.Triangle.getBarycoord(q,...vertices,new T.Vector3()),time=i*.17;
  const hs=ids.map(j=>w.height(p.getX(j),p.getZ(j),time,b.getX(j)));
  const expected=hs[0]*bary.x+hs[1]*bary.y+hs[2]*bary.z;
  assert(Math.abs(water.surfaceHeight(q.x,q.z,time)-expected)<1e-8,'CPU matches displaced triangles');samples++;
 }
 assert(water.geometry.boundingBox.max.y>=w.maxDisplacement,'wave bounds prevent premature culling');
 for(const match of water.material.fragmentShader.matchAll(/#include <([^>]+)>/g))assert(T.ShaderChunk[match[1]],'shader chunk '+match[1]);
 let disposed=false;g.addEventListener('dispose',()=>disposed=true);water.setWorldSize(size===4800?9600:4800);assert(disposed,'old geometry released on resize');
 water.update(4);assert.equal(water.uniforms.time.value,4);water.dispose();assert.equal(scene.children.length,0);
}
for(let i=0;i<100;i++){const x=i*13,z=-i*9,t=i*.31,bed=-i*.4;const legacy=(Math.sin(x*.03+t*1.2)*.9+Math.cos(z*.04+t*.9)*.9+Math.sin((x+z)*.07+t*2)*.4)*Math.max(.12,Math.min(1,(-bed+.6)/9));assert(Math.abs(w.height(x,z,t,bed)-legacy)<1e-12,'wave spectrum preserved')}
console.log(JSON.stringify({passed:true,triangleSamples:samples,profiles:4,waveSamples:100,checks:['shared wave spectrum','CPU triangle interpolation','bounds','shader includes','resize/disposal']}));
