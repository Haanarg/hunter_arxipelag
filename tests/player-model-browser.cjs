// Visual smoke of the production model and every visible driver, using real WebGL.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert');
(async()=>{
 const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{const f=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',f.endsWith('.html')?'text/html':/\.m?js$/.test(f)?'text/javascript':'text/plain');res.end(fs.readFileSync(f))}catch{res.writeHead(404).end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let b;
 try{
 b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await b.newPage({viewport:{width:850,height:700}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>typeof mkV==='function');
 await page.evaluate(()=>{
  document.querySelectorAll('body > :not(canvas)').forEach(e=>e.style.display='none');
  const s=new THREE.Scene();s.background=new THREE.Color(0x23352e);s.add(new THREE.HemisphereLight(0xd5efff,0x69805b,1.5));
  const light=new THREE.DirectionalLight(0xffe1b0,2.5);light.position.set(4,8,-6);s.add(light);
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(850,700);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.domElement.style.cssText='position:fixed;inset:0;z-index:99999';document.body.append(renderer.domElement);
  window.modelDemo={s,renderer,r:HUNTER_RIDER.create(THREE,{scene:s,scales:VS,heightAt:()=>0,shadows:false})};
 });
 for(const type of ['player','bici','moto','moto_aquatica','llanxa','llanxa_coets','barca_rems','windsurf']){
  const stats=await page.evaluate(type=>{
   const {s,r}=modelDemo;if(modelDemo.o)s.remove(modelDemo.o);
   let o;if(type==='player'){o=HUNTER_CHARACTERS.createPlayer(THREE,{box:bx});r.update(null,0)}
   else{o=mkV(type);r.update({t:type,v:3,pedalPhase:1.4,o},1)}
   s.add(o);modelDemo.o=o;s.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(o);if(r.object.visible)bounds.union(new THREE.Box3().setFromObject(r.object));
   const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z)*1.25;
   const camera=new THREE.OrthographicCamera(-span*850/700/2,span*850/700/2,span/2,-span/2,.1,200);
   camera.position.copy(center).add(new THREE.Vector3(5,3,-8).normalize().multiplyScalar(35));camera.lookAt(center);
   modelDemo.renderer.render(s,camera);return {type,driver:r.object.visible,shaders:modelDemo.renderer.info.programs.every(p=>!p.diagnostics||p.diagnostics.runnable)};
  },type);
  assert(stats.shaders);assert.equal(stats.driver,type!=='player');
  await page.screenshot({path:path.join(require('os').tmpdir(),'hunter-model-'+type+'.png')});console.log(stats);
 }
 assert.deepEqual(errors,[]);
 }finally{if(b)await b.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
