// Genera una captura REAL del motor Three.js amb la llavor visible 67.
// npm install --no-save playwright && npx playwright install chromium
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const server=http.createServer((req,res)=>{
    const urlPath=decodeURIComponent(req.url.split('?')[0]);
    const file=path.resolve(root,'.'+(urlPath==='/'?'/index.html':urlPath));
    if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
    try{
      const data=fs.readFileSync(file);
      res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.jpg')?'image/jpeg':'text/plain');
      res.end(data);
    }catch{res.writeHead(404).end()}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
    const page=await browser.newPage({viewport:{width:1360,height:768},deviceScaleFactor:1});
    page.on('pageerror',error=>console.error('Browser error:',error.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/?quality=desktop&eager=1');
    await page.waitForFunction(()=>window.HUNTER_READY===true,{timeout:120000});
    await page.locator('#seedRandom').uncheck();
    await page.locator('#seedInput').fill('67');
    await page.locator('button[data-d="1"]').click();
    await page.waitForFunction(()=>started&&B.length>0,null,{timeout:120000});
    await page.evaluate(()=>{
      panel('pause');
      // Punt de vista elevat del paisatge real de la base per a la llavor 67.
      cam.position.set(P.x+180,P.y+100,P.z+180);
      cam.lookAt(P.x,P.y+4,P.z);
      // Completar els sectors visibles abans de fer la captura.
      for(let i=0;i<150;i++)terrainStream?.update(P.x,P.z,4,cam);
      ren.render(scene,cam);
    });
    await page.addStyleTag({content:'#ini,#gamepanel,#hud,#perfStats,#mm,#joystick,#contextButtons,#strafeLeft,#strafeRight,#end,#sniperScope{display:none!important}'});
    await page.waitForTimeout(500);
    const output=path.join(root,'assets/menu-seed-67.jpg');
    fs.mkdirSync(path.dirname(output),{recursive:true});
    await page.locator('body > canvas').screenshot({path:output,type:'jpeg',quality:82,timeout:60000});
    const stat=fs.statSync(output);
    if(stat.size<12000)throw new Error('La captura és massa petita: '+stat.size);
    console.log('Captura seed 67:',output,stat.size,'bytes');
  }finally{if(browser)await browser.close();server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
