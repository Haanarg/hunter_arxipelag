import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Miniflare} from 'miniflare';
import {applyMigrations} from './helpers/apply-d1.mjs';
import {nativeFingerprint} from '../server/coop-native.mjs';
import {GAME_VERSION} from '../src/version.mjs';
const directory=await mkdtemp(join(tmpdir(),'hunter-native-auth-'));
const options={modulesRoot:'/tmp',modules:[{type:'ESModule',path:'/tmp/hunter-worker.mjs'}],compatibilityDate:'2026-08-06',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],d1Persist:join(directory,'d1'),r2Buckets:['SAVES'],r2Persist:join(directory,'r2'),durableObjects:{COOP_ROOMS:{className:'CoopRoomHub',useSQLite:true}},durableObjectsPersist:join(directory,'do'),bindings:{AUTH_SECRET:'test-native-only-secret-0123456789012345678901234',AUTH_ORIGIN:'http://localhost'}};
let mf=new Miniflare(options);const sockets=[];
async function wait(fn,label){const end=Date.now()+20000;while(Date.now()<end){const result=fn();if(result)return result;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out: '+label);}
try{
 const DB=await mf.getD1Database('DB');await applyMigrations(DB,{coop:true});let ip=0;
 async function browser(name){
  const jar=new Map(),address='10.8.0.'+(++ip);let id;
  const headers=extra=>({Origin:'http://localhost','cf-connecting-ip':address,'X-Hunter-User':id||'',Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...extra});
  async function call(path,data){const response=await mf.dispatchFetch('http://localhost'+path,{method:data?'POST':'GET',headers:headers(data?{'Content-Type':'application/json'}:{}),body:data?JSON.stringify(data):undefined});for(const cookie of response.headers.getSetCookie()){const entry=cookie.split(';')[0],split=entry.indexOf('=');jar.set(entry.slice(0,split),entry.slice(split+1));}assert.equal(response.status,200,await response.clone().text());return response.json();}
  id=(await call('/api/auth/sign-up/email',{username:name,password:'native-test-password-123'})).user.id;await DB.prepare("UPDATE hunter_access SET status='approved' WHERE owner=?").bind(id).run();
  return {id,call,async connect(room){const response=await mf.dispatchFetch('http://localhost/api/coop/socket?room='+room.id,{headers:headers({Upgrade:'websocket'})});assert.equal(response.status,101);const ws=response.webSocket,client={ws,events:[],setup:null,state:null};ws.addEventListener('message',event=>{const data=JSON.parse(event.data);client.events.push(data);if(data.type==='native-mission'){client.setup=data;client.state=data.state;}if(data.type==='state')client.state=data.state;});ws.accept();sockets.push(ws);ws.send(JSON.stringify({type:'hello',protocol:1,gameVersion:GAME_VERSION}));await wait(()=>client.events.some(e=>e.type==='room'),'authenticated room');return client;}};
 }
 const a=await browser('nativefirst'),b=await browser('nativesecond');let room=(await a.call('/api/coop/rooms',{seed:67,mapScale:1,difficulty:1})).room;room=(await b.call('/api/coop/join',{code:room.code})).room;room=(await a.call('/api/coop/ready',{ready:true,revision:room.revision})).room;room=(await b.call('/api/coop/ready',{ready:true,revision:room.revision})).room;
 const game=await createRequire(import.meta.url)('./harness.cjs')();game.start('67');const payload=game.run('captureNativeCoopWorld()'),text=JSON.stringify(payload),fingerprint=await nativeFingerprint(text);
 let ca=await a.connect(room),cb=await b.connect(room);
 const ready=client=>client.ws.send(JSON.stringify({type:'native-ready',protocol:1,revision:room.revision,fingerprint}));
 ready(cb);assert.equal(cb.setup,null,'guest cannot start without original world');
 for(let index=0,total=Math.ceil(text.length/45000);index<total;index++)ca.ws.send(JSON.stringify({type:'native-world',protocol:1,revision:room.revision,fingerprint,index,total,chunk:text.slice(index*45000,(index+1)*45000)}));ready(ca);
 await wait(()=>ca.setup&&cb.setup,'native original-world handshake');await wait(()=>ca.state.status==='running'&&cb.state.status==='running','shared original campaign running');
 assert.equal(ca.setup.self,a.id);assert.equal(cb.setup.self,b.id);assert.equal(ca.setup.meta.mode,'native');assert.equal(ca.setup.meta.fingerprint,fingerprint);assert.equal(ca.setup.meta.id,cb.setup.meta.id);assert.equal(ca.setup.meta.targets.length,payload.targets.length);assert.ok(ca.setup.meta.targets.some(e=>e.t==='general'));assert.equal(ca.state.vehicles.length,payload.vehicles.length);
 assert.equal(ca.events.some(e=>e.type==='mission'),false,'no prototype mission/client setup');
 const epoch=ca.setup.meta.id,originalHeading=ca.state.players.find(p=>p.id===a.id).hd;
 ca.ws.send(JSON.stringify({type:'input',protocol:1,epoch,sequence:1,interact:false,input:{forward:0,turn:1,strafe:0,run:false}}));await wait(()=>cb.state.players.find(p=>p.id===a.id).acknowledged===1,'original actor input accepted');assert.notEqual(cb.state.players.find(p=>p.id===a.id).hd,originalHeading);
 ca.ws.send(JSON.stringify({type:'inventory',protocol:1,epoch,operation:'weapon',target:'knife',commandId:'native-auth-knife'}));await wait(()=>ca.events.some(e=>e.type==='action'&&e.commandId==='native-auth-knife'&&e.ok),'native inventory command');await wait(()=>cb.state.inventories.find(i=>i.actorId===a.id).weapon==='knife','inventory shared');
 cb.ws.close();await wait(()=>ca.state.status==='paused','disconnect pauses original campaign');
 cb=await b.connect(room);await wait(()=>cb.setup,'restored native setup');await wait(()=>ca.state.status==='running','reconnect resumes');assert.equal(cb.setup.meta.id,epoch);assert.equal(cb.state.inventories.find(i=>i.actorId===a.id).weapon,'knife');
 for(const ws of sockets)try{ws.close();}catch{}await mf.dispose();mf=new Miniflare(options);ca=await a.connect(room);cb=await b.connect(room);await wait(()=>ca.setup&&cb.setup&&ca.state.status==='running','native cold restoration');assert.equal(ca.setup.meta.id,epoch);assert.equal(ca.setup.meta.fingerprint,fingerprint);assert.equal(cb.state.inventories.find(i=>i.actorId===a.id).weapon,'knife');
 assert.equal(ca.state.vehicles.length,payload.vehicles.length);assert.ok(ca.state.combat.targets.some(e=>e.t==='general'));
 console.log('native authenticated: two approved accounts, original 1MB+ world/chunks, original general/fleet, own identities, input, inventory, disconnect/reconnect and cold Durable Object restoration passed (no GPU browser test)');
}finally{for(const ws of sockets)try{ws.close();}catch{}await mf.dispose();await rm(directory,{recursive:true,force:true});}
