import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {applyMigrations} from './helpers/apply-d1.mjs';
const mf=new Miniflare({modulesRoot:'/tmp',modules:[{type:'ESModule',path:'/tmp/hunter-worker.mjs'}],compatibilityDate:'2026-08-06',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['SAVES'],durableObjects:{COOP_ROOMS:{className:'CoopRoomHub',useSQLite:true}},bindings:{AUTH_SECRET:'test-realtime-only-secret-01234567890123456789',AUTH_ORIGIN:'http://localhost'}});
const sockets=[];
try{
 const DB=await mf.getD1Database('DB');await applyMigrations(DB,{coop:true});let nextIP=0;
 async function browser(name){
  const jar=new Map(),ip='10.3.0.'+(++nextIP);let id;
  const headers=extra=>({Origin:'http://localhost','cf-connecting-ip':ip,'X-Hunter-User':id||'',Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...extra});
  async function call(path,data){
   const r=await mf.dispatchFetch('http://localhost'+path,{method:data?'POST':'GET',headers:headers(data?{'Content-Type':'application/json'}:{}),body:data?JSON.stringify(data):undefined});
   for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],a=p.indexOf('=');jar.set(p.slice(0,a),p.slice(a+1));}return r;
  }
  const signup=await call('/api/auth/sign-up/email',{username:name,password:'realtime-password-123'});assert.equal(signup.status,200);id=(await signup.json()).user.id;
  await DB.prepare("UPDATE hunter_access SET status='approved' WHERE owner=?").bind(id).run();
  return {id,call,headers,connect:room=>mf.dispatchFetch('http://localhost/api/coop/socket?room='+room,{headers:headers({Upgrade:'websocket'})})};
 }
 function inbox(ws){
  const events=[],waiters=[];ws.addEventListener('message',e=>{const body=JSON.parse(e.data);events.push(body);for(const f of [...waiters])f();});
  ws.accept();sockets.push(ws);
  return async predicate=>{
   const find=()=>events.find(e=>predicate(e));if(find())return find();
   return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{waiters.splice(waiters.indexOf(check),1);reject(new Error('WebSocket event timeout'));},8000);const check=()=>{const match=find();if(match){clearTimeout(timer);waiters.splice(waiters.indexOf(check),1);resolve(match);}};waiters.push(check);check();});
  };
 }
 const capabilities=await mf.dispatchFetch('http://localhost/api/capabilities').then(r=>r.json());assert.equal(capabilities.coopRealtime,true);
 const a=await browser('realtimehost'),b=await browser('realtimeguest'),outsider=await browser('realtimeother');
 let r=await a.call('/api/coop/rooms',{seed:67,mapScale:1,difficulty:1});assert.equal(r.status,200);let room=(await r.json()).room;
 assert.equal((await outsider.connect(room.id)).status,403,'third user cannot connect');
 assert.equal((await mf.dispatchFetch('http://localhost/api/coop/socket?room='+room.id,{headers:outsider.headers({Upgrade:'websocket','X-Coop-Actor':a.id,'X-Coop-Session':'forged'})})).status,403,'forged internal headers ignored');
 assert.equal((await mf.dispatchFetch('http://localhost/api/coop/socket?room='+room.id,{headers:a.headers({Upgrade:'websocket',Origin:'https://attacker.test'})})).status,403,'WebSocket origin required');
 r=await a.connect(room.id);if(r.status!==101)assert.fail(await r.text());const hostSocket=r.webSocket,hostEvent=inbox(hostSocket);
 await hostEvent(e=>e.type==='room'&&e.room?.members.length===1);
 room=(await b.call('/api/coop/join',{code:room.code}).then(r=>r.json())).room;
 await hostEvent(e=>e.room?.members.length===2);
 r=await b.connect(room.id);assert.equal(r.status,101);const guestSocket=r.webSocket,guestEvent=inbox(guestSocket);
 await guestEvent(e=>e.room?.members.length===2);
 room=(await a.call('/api/coop/ready',{ready:true,revision:room.revision}).then(r=>r.json())).room;
 await guestEvent(e=>e.room?.revision===room.revision&&e.room.members.some(m=>m.id===a.id&&m.ready));
 room=(await b.call('/api/coop/ready',{ready:true,revision:room.revision}).then(r=>r.json())).room;
 await hostEvent(e=>e.room?.allReady===true);await guestEvent(e=>e.room?.allReady===true);
 guestSocket.send(JSON.stringify({type:'heartbeat',protocol:1}));
 r=await a.connect(room.id);assert.equal(r.status,101,'reconnect authenticated same seat');const replacement=r.webSocket;inbox(replacement);
 const oldClose=await new Promise(resolve=>{if(hostSocket.readyState===3)return resolve({code:4001});hostSocket.addEventListener('close',resolve,{once:true});});assert.equal(oldClose.code,4001);
 await DB.prepare("UPDATE hunter_access SET status='suspended' WHERE owner=?").bind(b.id).run();
 const suspendedClose=new Promise(resolve=>guestSocket.addEventListener('close',resolve,{once:true}));guestSocket.send(JSON.stringify({type:'heartbeat',protocol:1}));assert.equal((await suspendedClose).code,4003);
 const invalidClose=new Promise(resolve=>replacement.addEventListener('close',resolve,{once:true}));replacement.send(JSON.stringify({type:'position',x:999}));assert.equal((await invalidClose).code,1008,'arbitrary game data rejected');
 r=await a.connect(room.id);assert.equal(r.status,101);const finalSocket=r.webSocket;const finalEvents=inbox(finalSocket);
 await a.call('/api/coop/leave',{});await finalEvents(e=>e.type==='room'&&e.room===null);
 r=await a.call('/api/coop/rooms',{seed:68,mapScale:1,difficulty:1});room=(await r.json()).room;
 r=await a.connect(room.id);assert.equal(r.status,101);const rateSocket=r.webSocket;inbox(rateSocket);
 const rateClose=new Promise(resolve=>rateSocket.addEventListener('close',resolve,{once:true}));for(let i=0;i<21;i++)rateSocket.send(JSON.stringify({type:'heartbeat',protocol:1}));assert.equal((await rateClose).code,1008,'message rate bounded');
 r=await a.connect(room.id);assert.equal(r.status,101);const revoked=r.webSocket;inbox(revoked);
 await DB.prepare('DELETE FROM session WHERE userId=?').bind(a.id).run();
 const revokedClose=new Promise(resolve=>revoked.addEventListener('close',resolve,{once:true}));revoked.send(JSON.stringify({type:'heartbeat',protocol:1}));assert.equal((await revokedClose).code,4003,'logout/reset session revocation enforced');
 console.log('realtime: native SQLite Durable Object, authenticated WebSockets, private room/origin, push join/readiness, two accounts, heartbeat, replacement/reconnect, suspension, invalid messages and room closure passed');
}finally{for(const ws of sockets)try{ws.close();}catch(_){}await mf.dispose();}
