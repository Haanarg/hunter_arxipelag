'use strict';
// Prova real en Chromium: clic a dificultat i generació inicial del món.
// Node 22 i CDP natiu, sense dependències de navegador afegides.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),os=require('node:os');
const root=path.resolve(__dirname,'..'),port=18765,cdpPort=18766;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mime=f=>/\.html$/.test(f)?'text/html':/\.(mjs|js)$/.test(f)?'text/javascript':/\.css$/.test(f)?'text/css':/\.json$/.test(f)?'application/json':'application/octet-stream';
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),f=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
 if(!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.stat(f,(e,s)=>{
  if(e||!s.isFile()){res.writeHead(404);res.end('Not found '+url.pathname);return}
  res.writeHead(200,{'Content-Type':mime(f),'Cache-Control':'no-store'});
  fs.createReadStream(f).pipe(res);
 });
});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hunter-browser-'));
let browser,ws,serial=0;
const awaiting=new Map(),exceptions=[],consoleErrors=[];
async function chromePage(){
 for(let i=0;i<160;i++){
  try{
   const tabs=await(await fetch('http://127.0.0.1:'+cdpPort+'/json/list')).json();
   const page=tabs.find(t=>t.type==='page'&&t.webSocketDebuggerUrl);
   if(page)return page.webSocketDebuggerUrl;
  }catch{}
  await sleep(250);
 }
 throw Error('Chrome/CDP no disponible');
}
function send(method,params={}){
 const id=++serial;
 return new Promise((ok,fail)=>{
  const timer=setTimeout(()=>{awaiting.delete(id);fail(Error('Timeout '+method))},30000);
  awaiting.set(id,result=>{clearTimeout(timer);result.error?fail(Error(JSON.stringify(result.error))):ok(result.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
}
async function evalPage(expression){
 const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
 return r.result?.value;
}
async function main(){
 await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const chrome=process.env.CHROME_BIN||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
 if(!chrome)throw Error('Chromium absent');
 browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox','--user-data-dir='+tmp,'--remote-debugging-port='+cdpPort,'--no-first-run','http://127.0.0.1:'+port+'/?quality=mobile&runtime=source'],{stdio:'ignore'});
 ws=new WebSocket(await chromePage());
 await new Promise((ok,fail)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',fail,{once:true})});
 ws.addEventListener('message',event=>{
  const m=JSON.parse(event.data);
  if(m.id){awaiting.get(m.id)?.(m);awaiting.delete(m.id);return}
  if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')consoleErrors.push(m.params.args.map(a=>a.value||a.description||a.type).join(' '));
 });
 await send('Runtime.enable');await send('Page.enable');
 for(let i=0;i<200;i++){
  if(await evalPage('Boolean(window.HUNTER_MENU_READY && document.querySelector("#ini button[data-d]"))'))break;
  await sleep(100);
 }
 if(!await evalPage('Boolean(window.HUNTER_MENU_READY)'))throw Error('Portada no inicialitzada');
 await evalPage('document.querySelector("#ini button[data-d]").click(); true');
 let state=null;
 for(let i=0;i<700;i++){
  state=await evalPage('JSON.stringify({ready:!!window.HUNTER_READY,gen:window.HUNTER_GENERATION_STATE?.status||null,error:window.HUNTER_GENERATION_STATE?.error||null,loading:document.getElementById("startLoading")?.textContent||"",alert:[...document.querySelectorAll("[role=alert]")].map(x=>x.textContent).join(" "),started:document.body.classList.contains("game-started")})');
  const d=JSON.parse(state);
  if(d.started||d.gen==='error'||/Error de càrrega|Error en iniciar Húnter/.test(d.loading+' '+d.alert))break;
  await sleep(100);
 }
 console.log('HUNTER_BROWSER_STARTUP',state);
 console.log('HUNTER_BROWSER_EXCEPTIONS',JSON.stringify(exceptions.slice(-20)));
 console.log('HUNTER_BROWSER_CONSOLE_ERRORS',JSON.stringify(consoleErrors.slice(-20)));
 if(!JSON.parse(state).started)throw Error('No ha començat la partida real');
}
main().catch(e=>{console.error('HUNTER_BROWSER_FAILURE',e.stack||e);process.exitCode=1}).finally(()=>{
 for(const fn of awaiting.values())fn({error:{message:'closing'}});
 try{ws?.close()}catch{}
 browser?.kill('SIGKILL');server.close();fs.rmSync(tmp,{recursive:true,force:true});
});