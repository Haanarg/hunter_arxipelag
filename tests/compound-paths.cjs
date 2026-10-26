const assert=require('node:assert/strict');
(async()=>{
 const T=await import('../vendor/three-r186.module.mjs'),{preparePaths,createPathNetwork,smoothPath}=await import('../src/compound-paths.mjs');
 const routes=[{points:[[0,0],[30,0],[30,30]],width:6},{points:[[30,15],[50,15]],width:4}];
 const paths=preparePaths(routes);assert.equal(paths[0].fadeStart,true);assert.equal(paths[1].fadeStart,false);assert.equal(paths[1].fadeEnd,true);
 const curve=smoothPath(routes[0].points,6);assert(curve.some(p=>p[0]>25&&p[0]<30&&p[1]>0&&p[1]<5),'rounded turn');
 let revision=0,lift=0;const heightAt=(x,z)=>.1*x+.05*z+lift,net=createPathNetwork(T,{routes,heightAt,heightVersion:()=>revision,step:1});
 assert.equal(net.userData.pathStats.chunkCells,64,'larger static road batches');
 const occupied=new Set(),alphas=[];
 for(const m of net.children){assert.equal(m.material.depthWrite,false);assert(m.material.polygonOffset);const p=m.geometry.attributes.position,c=m.geometry.attributes.color;
  for(let i=0;i<p.count;i++){assert(Number.isFinite(p.getY(i)));assert(Math.abs(p.getY(i)-heightAt(p.getX(i),p.getZ(i))-.12)<1e-5);alphas.push(c.getW(i));if(p.getX(i)===0&&p.getZ(i)===0)assert.equal(c.getW(i),0,'free endpoint fades out')}
  for(let i=0;i<p.count;i+=3){const k=[0,1,2].map(j=>[p.getX(i+j),p.getZ(i+j)].join(',')).sort().join('|');assert(!occupied.has(k),'no duplicated surface at intersections');occupied.add(k)}
 }
 assert(alphas.some(a=>a>0&&a<1),'soft edges');assert(alphas.some(a=>a===1),'opaque centre');lift=2;revision++;
 for(const m of net.children){m.onBeforeRender();const p=m.geometry.attributes.position;assert(Math.abs(p.getY(0)-heightAt(p.getX(0),p.getZ(0))-.12)<1e-5,'follows visible terrain LOD')}
 console.log('Paths: curved junctions, unique surface, edge/end fades and terrain updates passed',net.userData.pathStats);
})().catch(e=>{console.error(e);process.exitCode=1});
