// WebGL regression: compare dry floor, masked water and unmasked water.
// Optional: npm install --no-save playwright; npx playwright install chromium
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{const f=path.join(root,decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!f.startsWith(root+'/')){res.writeHead(403).end();return}try{const data=fs.readFileSync(f);res.setHeader('Content-Type',f.endsWith('.html')?'text/html':/\.m?js$/.test(f)?'text/javascript':'text/plain');res.end(data)}catch{res.writeHead(404).end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE_PATH || undefined,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const mobile of [true]){
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1360,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 const page=await context.newPage();const errors=[],warnings=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text())});
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.waitForFunction(()=>typeof started!=='undefined',null,{timeout:60000});
 console.log('loaded',mobile,await page.evaluate(()=>({revision:THREE.REVISION,gl:ren.getContext().getParameter(ren.getContext().VERSION)})));
 await page.locator('#seedRandom').uncheck();await page.locator('#seedInput').fill('12345');await page.locator('button[data-d="1"]').click();
 await page.waitForFunction(()=>started&&B.length>0,null,{timeout:120000});
 await page.evaluate(()=>{const q=V.find(v=>v.t==='barca_rems');P.x=q.x;P.z=q.z;P.y=q.o.position.y;toggle();if(cv!==q)throw Error('Cannot enter rowboat');q.v=3;stepV(q,1,0,1,.04);place(q,2,.04,0);poseRider(q,.1);panel('pause');ui.hide();cam.position.copy(new THREE.Vector3(5,5,8).applyQuaternion(q.o.quaternion).add(q.o.position));cam.lookAt(q.o.position.clone().add(new THREE.Vector3(0,.6,0)));ren.render(scene,cam);});
 const checks=await page.evaluate(()=>{
   const q=cv,mask=q.o.getObjectByName('rowboat-water-mask'),target=new THREE.WebGLRenderTarget(420,240,{stencilBuffer:true});
   const samples=[];const oldAspect=cam.aspect;cam.aspect=420/240;cam.updateProjectionMatrix();
   for(const t of [0,1.7,3.4]){
     water.update(t);q.hd=t*.4;place(q,t,0,0);poseRider(q,.1);q.o.updateWorldMatrix(true,true);
     cam.position.copy(new THREE.Vector3(0,10,.3).applyQuaternion(q.o.quaternion).add(q.o.position));cam.lookAt(q.o.position);cam.updateMatrixWorld();
     const p=q.o.localToWorld(new THREE.Vector3(.55,.08,.65)).project(cam),x=Math.floor((p.x*.5+.5)*420),y=Math.floor((p.y*.5+.5)*240);
     const outside=q.o.localToWorld(new THREE.Vector3(2.1,.08,.8)).project(cam),ox=Math.floor((outside.x*.5+.5)*420),oy=Math.floor((outside.y*.5+.5)*240);
     const pixel=()=>{ren.setRenderTarget(target);ren.render(scene,cam);const data=new Uint8Array(4);ren.readRenderTargetPixels(target,x,y,1,1,data);const sea=new Uint8Array(4);ren.readRenderTargetPixels(target,ox,oy,1,1,sea);return {inside:[...data],outside:[...sea]}};
     water.mesh.visible=false;const dry=pixel();water.mesh.visible=true;mask.visible=true;const masked=pixel();mask.visible=false;const wet=pixel();mask.visible=true;
     samples.push({t,dry,masked,wet,offset:q.o.position.y-wy(q.x,q.z,t)});
   }
   elapsed=3.4;water.update(elapsed);ren.setRenderTarget(null);target.dispose();cam.aspect=oldAspect;cam.updateProjectionMatrix();ren.render(scene,cam);return samples;
 });
 console.log(JSON.stringify({maskChecks:checks}));for(const q of checks){assert.deepEqual(q.masked.inside,q.dry.inside,'inside stays dry');assert.notDeepEqual(q.wet.inside,q.dry.inside,'fixture water intersects floor');assert.deepEqual(q.masked.outside,q.wet.outside,'outside water unchanged');assert(Math.abs(q.offset+.1)<1e-8)}
 await page.evaluate(()=>{const q=cv;cam.position.copy(new THREE.Vector3(5,5,8).applyQuaternion(q.o.quaternion).add(q.o.position));cam.lookAt(q.o.position.clone().add(new THREE.Vector3(0,.6,0)));ren.render(scene,cam)});
 await page.screenshot({path:path.join(require('os').tmpdir(),'rowboat-water-mask.png')});
 console.log(JSON.stringify({errors,warnings,vehicle:await page.evaluate(()=>cv.t)}));assert.equal(errors.length,0);
 await context.close();
 }
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
