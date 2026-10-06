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
 for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1360,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 const page=await context.newPage();const errors=[],warnings=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text())});
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.waitForFunction(()=>typeof started!=='undefined',null,{timeout:60000});
 console.log('loaded',mobile,await page.evaluate(()=>({revision:THREE.REVISION,gl:ren.getContext().getParameter(ren.getContext().VERSION)})));
 await page.locator('#seedRandom').uncheck();await page.locator('#seedInput').fill('12345');await page.locator('button[data-d="1"]').click();
 await page.waitForFunction(()=>started&&B.length>0,null,{timeout:120000});
 await page.evaluate(()=>{panel('pause');ren.render(scene,cam)});
 await page.evaluate(()=>ui.hide());
 await page.screenshot({path:path.join(require('os').tmpdir(),'hunter-')+(mobile?'mobile':'desktop')+'.png'});
 await page.evaluate(()=>{const q=V.find(v=>v.t==='llanxa');cam.position.set(q.x+45,q.o.position.y+24,q.z+65);cam.lookAt(q.x,q.o.position.y,q.z);ren.render(scene,cam)});
 await page.screenshot({path:path.join(require('os').tmpdir(),'hunter-coast-')+(mobile?'mobile':'desktop')+'.png'});
 await page.evaluate(()=>{const before=elapsed;update(.1,elapsed+.1);if(elapsed!==before)throw Error('pause clock');resume();update(.1,elapsed+.1);if(elapsed<=before)throw Error('resume clock');panel('pause')});
 const result=await page.evaluate(()=>({vehicles:V.length,types:new Set(V.map(v=>v.t)).size,buildings:B.length,programs:ren.info.programs.length,shaders:ren.info.programs.every(p=>!p.diagnostics||p.diagnostics.runnable),profile:qualityName,srgb:ren.outputColorSpace===THREE.SRGBColorSpace,missile:!!document.querySelector('[data-k="KeyR"]'),climb:!!document.querySelector('[data-k="KeyU"]')&&!!document.querySelector('[data-k="KeyJ"]')}));
 console.log(JSON.stringify({mobile,result,errors,warnings}));assert.equal(errors.length,0,'console errors');assert(result.shaders,'compiled shaders');assert.equal(result.types,15);assert(result.srgb&&result.missile&&result.climb);assert.equal(result.profile,mobile?'mobile':'desktop');
 await context.close();
 }
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
