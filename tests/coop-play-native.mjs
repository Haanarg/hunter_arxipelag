import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Miniflare} from 'miniflare';
import {applyMigrations} from './helpers/apply-d1.mjs';
import {GAME_VERSION} from '../src/version.mjs';
const directory=await mkdtemp(join(tmpdir(),'hunter-coop-play-')),options={modulesRoot:'/tmp',modules:[{type:'ESModule',path:'/tmp/hunter-worker.mjs'}],compatibilityDate:'2026-08-06',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],d1Persist:join(directory,'d1'),r2Buckets:['SAVES'],r2Persist:join(directory,'r2'),durableObjects:{COOP_ROOMS:{className:'CoopRoomHub',useSQLite:true}},durableObjectsPersist:join(directory,'do'),bindings:{AUTH_SECRET:'test-play-only-secret-0123456789012345678901234',AUTH_ORIGIN:'http://localhost'}};
let mf=new Miniflare(options),timer;const sockets=[];
const wait=async(fn,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){const value=fn();if(value)return value;await new Promise(r=>setTimeout(r,50));}throw Error('Mission test timeout');};
try{
 let DB=await mf.getD1Database('DB');await applyMigrations(DB,{coop:true});let nextIP=0;
 async function browser(name){
  const jar=new Map(),ip='10.7.0.'+(++nextIP);let id;
  const headers=extra=>({Origin:'http://localhost','cf-connecting-ip':ip,'X-Hunter-User':id||'',Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...extra});
  async function call(path,data){const r=await mf.dispatchFetch('http://localhost'+path,{method:data?'POST':'GET',headers:headers(data?{'Content-Type':'application/json'}:{}),body:data?JSON.stringify(data):undefined});for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],a=p.indexOf('=');jar.set(p.slice(0,a),p.slice(a+1));}return r;}
  const r=await call('/api/auth/sign-up/email',{username:name,password:'play-test-password-123'});assert.equal(r.status,200);id=(await r.json()).user.id;await DB.prepare("UPDATE hunter_access SET status='approved' WHERE owner=?").bind(id).run();
  return {id,call,async connect(room){const r=await mf.dispatchFetch('http://localhost/api/coop/socket?room='+room,{headers:headers({Upgrade:'websocket'})});if(r.status!==101)assert.fail(await r.text());const ws=r.webSocket,client={ws,events:[],setup:null,state:null};ws.addEventListener('message',e=>{const data=JSON.parse(e.data);client.events.push(data);if(data.type==='mission'){client.setup=data;client.state=data.state;}if(data.type==='state')client.state=data.state;});ws.accept();sockets.push(ws);ws.send(JSON.stringify({type:'hello',protocol:1,gameVersion:GAME_VERSION}));return client;}};
 }
 const a=await browser('playfirst'),b=await browser('playsecond');
 let room=(await a.call('/api/coop/rooms',{seed:67,mapScale:1,difficulty:1}).then(r=>r.json())).room;
 room=(await b.call('/api/coop/join',{code:room.code}).then(r=>r.json())).room;
 room=(await a.call('/api/coop/ready',{ready:true,revision:room.revision}).then(r=>r.json())).room;
 room=(await b.call('/api/coop/ready',{ready:true,revision:room.revision}).then(r=>r.json())).room;
 let ca=await a.connect(room.id),cb=await b.connect(room.id);
 const launch=c=>c.ws.send(JSON.stringify({type:'launch',protocol:1,gameVersion:GAME_VERSION,revision:room.revision}));
 launch(ca);await wait(()=>ca.events.find(e=>e.type==='waiting'));assert.equal(ca.setup,null,'one vote cannot start');
 launch(cb);await wait(()=>ca.setup&&cb.setup);assert.equal(ca.setup.meta.id,cb.setup.meta.id);assert.equal(ca.setup.self,a.id);assert.equal(cb.setup.self,b.id);
 await wait(()=>ca.state?.status==='running');
 // Reconnect the guest: the other player must see a pause and then resume.
 assert.equal(ca.state.inventories.find(i=>i.actorId===a.id).bullets,24);
 ca.ws.send(JSON.stringify({type:'inventory',protocol:1,epoch:ca.setup.meta.id,operation:'disguise',target:true,commandId:'native-disguise'}));
 await wait(()=>ca.events.find(e=>e.commandId==='native-disguise'&&e.ok));await wait(()=>cb.state.inventories.find(i=>i.actorId===a.id).disguised);
 assert.equal(cb.state.inventories.find(i=>i.actorId===b.id).disguised,false);
 ca.ws.send(JSON.stringify({type:'combat',protocol:1,epoch:ca.setup.meta.id,weapon:'pistol',commandId:'native-shot'}));
 await wait(()=>ca.events.find(e=>e.commandId==='native-shot'&&e.ok));await wait(()=>cb.state.inventories.find(i=>i.actorId===a.id).bullets===23);assert.equal(cb.state.inventories.find(i=>i.actorId===b.id).bullets,24);assert.equal(cb.state.inventories.find(i=>i.actorId===a.id).disguised,false);
 ca.ws.send(JSON.stringify({type:'combat',protocol:1,epoch:ca.setup.meta.id,weapon:'pistol',commandId:'native-shot'}));await wait(()=>ca.events.find(e=>e.commandId==='native-shot'&&e.duplicate));
 let phase='relay',indices=[0,0],sequences=[0,0],driverError=null;
 const door=ca.setup.meta.doors[0];assert.ok(door);
 const pawn=i=>ca.state.players.find(p=>p.id===(i?b.id:a.id));
 const sendIntent=(i,movement,interact=false)=>{const p=pawn(i),c=i?cb:ca;sequences[i]=Math.max(sequences[i],p.acknowledged)+1;c.ws.send(JSON.stringify({type:'input',protocol:1,epoch:ca.setup.meta.id,sequence:sequences[i],input:movement,interact}));};
 async function moveTo(i,target){
   const t=setInterval(()=>{const p=pawn(i),dx=target.x-p.x,dz=target.z-p.z,d=Math.max(1,Math.hypot(dx,dz));sendIntent(i,{forward:-dz/d,turn:0,strafe:dx/d,run:true});},50);
   try{await wait(()=>Math.hypot(pawn(i).x-target.x,pawn(i).z-target.z)<.15,15000);}finally{clearInterval(t);sendIntent(i,{forward:0,turn:0,strafe:0,run:false});}
 }
 async function operate(c,commandId,open){c.ws.send(JSON.stringify({type:'door',protocol:1,epoch:missionId,doorId:door.id,open,commandId}));return wait(()=>c.events.find(e=>e.type==='action'&&e.commandId===commandId));}
 const awayFromJeep=ca.state.vehicles[0],thrower=pawn(1);await face(1,Math.atan2(-(thrower.x-awayFromJeep.x),-(thrower.z-awayFromJeep.z)));
 cb.ws.send(JSON.stringify({type:'combat',protocol:1,epoch:ca.setup.meta.id,weapon:'grenade',commandId:'native-grenade'}));await wait(()=>ca.state.combat.grenades.length===1);
 const missionId=ca.setup.meta.id;cb.ws.close(1000,'Test reconnect');await wait(()=>ca.state.status==='paused');const pausedGrenade=structuredClone(ca.state.combat.grenades);await new Promise(r=>setTimeout(r,250));assert.deepEqual(ca.state.combat.grenades,pausedGrenade,'grenade fuse/trajectory pause with disconnected teammate');
 cb=await b.connect(room.id);await wait(()=>cb.setup);assert.equal(cb.setup.meta.id,missionId);await wait(()=>ca.state.status==='running');await wait(()=>ca.state.combat.effects.some(e=>e.kind==='explosion'));assert.equal(ca.state.combat.grenades.length,0);await face(1,0);
 // The authenticated transport assigns seats; passenger input cannot move the jeep.
 const jeep=ca.state.vehicles[0],spawn=[{...pawn(0)},{...pawn(1)}];
 await moveTo(0,{x:jeep.x-2.2,z:jeep.z});await moveTo(1,{x:jeep.x+2.2,z:jeep.z});
 async function vehicle(c,operation,commandId){c.ws.send(JSON.stringify({type:'vehicle',protocol:1,epoch:missionId,vehicleId:jeep.id,operation,commandId}));return wait(()=>c.events.find(e=>e.commandId===commandId));}
 assert.equal((await vehicle(ca,'enter','native-driver')).code,'ENTERED');assert.equal((await vehicle(cb,'enter','native-passenger')).code,'ENTERED');await wait(()=>cb.state.vehicles[0].seats[1]===b.id);
 const parked={...ca.state.vehicles[0]};sendIntent(1,{forward:1,turn:1,strafe:1,run:true});await new Promise(r=>setTimeout(r,400));assert.equal(ca.state.vehicles[0].z,parked.z,'passenger cannot drive over WebSocket');
 const driving=setInterval(()=>sendIntent(0,{forward:1,turn:0,strafe:0,run:false}),50);try{await wait(()=>Math.hypot(ca.state.vehicles[0].x-parked.x,ca.state.vehicles[0].z-parked.z)>.25);}finally{clearInterval(driving);sendIntent(0,{forward:0,turn:0,strafe:0,run:false});}
 await wait(()=>Math.abs(ca.state.vehicles[0].v)<.01);assert.equal(ca.state.players[0].z,ca.state.players[1].z,'passenger travels with driver');
 assert.equal((await vehicle(cb,'exit','native-passenger-exit')).code,'EXITED');assert.equal((await vehicle(ca,'exit','native-driver-exit')).code,'EXITED');
 await moveTo(0,spawn[0]);await moveTo(1,spawn[1]);
 // Select the assault rifle and validate three server-timed bullets on both clients.
 ca.ws.send(JSON.stringify({type:'inventory',protocol:1,epoch:missionId,operation:'weapon',target:'assault',commandId:'native-select-assault'}));await wait(()=>ca.events.find(e=>e.commandId==='native-select-assault'&&e.ok));
 const ammoBefore=ca.state.inventories.find(i=>i.actorId===a.id).bullets;ca.ws.send(JSON.stringify({type:'combat',protocol:1,epoch:missionId,weapon:'assault',commandId:'native-burst'}));await wait(()=>ca.events.find(e=>e.commandId==='native-burst'&&e.code==='BURST'));await wait(()=>cb.state.inventories.find(i=>i.actorId===a.id).bullets===ammoBefore-3);
 ca.ws.send(JSON.stringify({type:'inventory',protocol:1,epoch:missionId,operation:'weapon',target:'pistol',commandId:'native-select-pistol'}));await wait(()=>ca.events.find(e=>e.commandId==='native-select-pistol'&&e.ok));
 const origin={x:pawn(0).x,z:pawn(0).z};
 ca.ws.send(JSON.stringify({type:'inventory',protocol:1,epoch:missionId,operation:'drop',target:'grenades',commandId:'native-drop'}));
 await wait(()=>ca.events.find(e=>e.commandId==='native-drop'&&e.ok));await wait(()=>cb.state.supplies.some(s=>s.id==='drop-1'));
 assert.equal(ca.state.inventories.find(i=>i.actorId===a.id).grenades,1,'drop subtracts only owner');
 ca.ws.send(JSON.stringify({type:'inventory',protocol:1,epoch:missionId,operation:'drop',target:'grenades',commandId:'native-drop'}));await wait(()=>ca.events.find(e=>e.commandId==='native-drop'&&e.duplicate));
 await moveTo(1,origin);await wait(()=>ca.state.inventories.find(i=>i.actorId===b.id).grenades===2);assert.equal(ca.state.supplies.some(s=>s.id==='drop-1'),false);
 await moveTo(1,{x:origin.x+4,z:origin.z});
 assert.equal((await operate(cb,'native-remote',true)).code,'TOO_FAR');
 await moveTo(0,{x:door.cx,z:door.cz+2.2});assert.equal((await operate(ca,'native-open',true)).code,'OPENED');
 await wait(()=>cb.state.doors.find(d=>d.id===door.id)?.open===true);
 ca.ws.send(JSON.stringify({type:'door',protocol:1,epoch:missionId,doorId:door.id,open:false,commandId:'native-open'}));await wait(()=>ca.events.find(e=>e.type==='action'&&e.commandId==='native-open'&&e.duplicate));assert.equal(ca.state.doorRevision,1);
 await moveTo(0,{x:door.cx,z:door.cz});await moveTo(1,{x:door.cx,z:door.cz+2.2});
 assert.equal((await operate(cb,'native-occupied',false)).code,'OCCUPIED');
 await moveTo(0,{x:door.cx,z:door.cz-2.2});assert.equal((await operate(cb,'native-close',false)).code,'CLOSED');
 const pushing=setInterval(()=>sendIntent(0,{forward:-1,turn:0,strafe:0,run:false}),50);await new Promise(r=>setTimeout(r,1000));clearInterval(pushing);sendIntent(0,{forward:0,turn:0,strafe:0,run:false});
 assert.ok(pawn(0).z<door.cz-.7,'closed door blocks the actor inside');
 assert.equal((await operate(cb,'native-open-again',true)).code,'OPENED');await moveTo(0,{x:door.cx,z:door.cz+2.2});
 // Reach a target via verified navigation, rotate using input (no client hit claims), shoot three times.
 const route=ca.setup.meta.routes[0],target=ca.setup.meta.targets[0];await moveTo(0,route[0]);for(const p of route.slice(1))await moveTo(0,p);
 async function face(i,angle){const interval=setInterval(()=>{const error=Math.atan2(Math.sin(angle-pawn(i).hd),Math.cos(angle-pawn(i).hd));sendIntent(i,{forward:0,strafe:0,turn:Math.max(-1,Math.min(1,error*4)),run:false});},50);try{await wait(()=>Math.abs(Math.atan2(Math.sin(angle-pawn(i).hd),Math.cos(angle-pawn(i).hd)))<.015);}finally{clearInterval(interval);sendIntent(i,{forward:0,strafe:0,turn:0,run:false});}}
 await wait(()=>ca.state.combat.targets[0].state==='attack');assert.ok(ca.state.players.find(p=>p.id===a.id).hp<=20);const enemy=ca.state.combat.targets[0];await face(0,Math.atan2(-(enemy.x-pawn(0).x),-(enemy.z-pawn(0).z)));
 for(let n=0;n<3;n++){const commandId='native-hit-'+n,tick=ca.state.tick;ca.ws.send(JSON.stringify({type:'combat',protocol:1,epoch:missionId,weapon:'pistol',commandId}));const result=await wait(()=>ca.events.find(e=>e.commandId===commandId));assert.equal(result.code,'FIRED');await wait(()=>cb.state.combat.targets.find(t=>t.id===target.id).hp===8-4*n);await wait(()=>ca.state.tick>=tick+11);}
 await face(0,0);for(const p of [...route].reverse())await moveTo(0,p);
 timer=setInterval(()=>{try{
  const state=ca.state,meta=ca.setup.meta;if(!state||state.status!=='running')return;
  if(state.phase!==phase){phase=state.phase;indices=[0,0];}if(!['relay','extract'].includes(phase))return;
  for(let i=0;i<2;i++){
   const c=i?cb:ca,p=state.players.find(p=>p.id===(i?b.id:a.id)),path=phase==='relay'?meta.routes[i]:[...meta.routes[i]].reverse(),dist=q=>Math.hypot(p.x-q.x,p.z-q.z);
   while(indices[i]<path.length-1&&dist(path[indices[i]])<.3)indices[i]++;
   const target=path[indices[i]],dx=target.x-p.x,dz=target.z-p.z,d=Math.max(1,Math.hypot(dx,dz));sequences[i]=Math.max(sequences[i],p.acknowledged)+1;
   c.ws.send(JSON.stringify({type:'input',protocol:1,epoch:meta.id,sequence:sequences[i],input:{forward:-dz/d,turn:0,strafe:dx/d,run:true},interact:dist(meta.terminals[i])<3}));
  }
 }catch(e){driverError=e;}},50);
 await wait(()=>driverError||ca.state?.phase==='won',60000);if(driverError)throw driverError;clearInterval(timer);timer=null;
 await wait(()=>cb.state?.phase==='won');assert.equal(ca.state.phase,cb.state.phase);const tick=ca.state.tick;assert.ok(tick>90);
 // Restart workerd against the same local D1/DO storage: no client geometry or
 // test endpoint is used to restore the mission or award victory.
 for(const ws of sockets)try{ws.close();}catch(_){}await mf.dispose();mf=new Miniflare(options);DB=await mf.getD1Database('DB');
 ca=await a.connect(room.id);cb=await b.connect(room.id);await wait(()=>ca.setup&&cb.setup);
 assert.equal(ca.state.inventories.find(i=>i.actorId===a.id).bullets,29,'spent bullets and pickup survive runtime restart');assert.equal(ca.state.inventories.find(i=>i.actorId===b.id).bullets,36);
 assert.equal(ca.state.combat.targets[0].hp,0,'shared target destruction survives runtime restart');assert.equal(ca.state.inventories.find(i=>i.actorId===a.id).grenades,2);assert.equal(ca.state.inventories.find(i=>i.actorId===b.id).grenades,3,'thrown/transferred grenade and automatic pickups survive restart');
 assert.equal(ca.state.inventories.find(i=>i.actorId===a.id).disguised,false,'shooting removes disguise and survives runtime restart');assert.equal(ca.setup.meta.id,missionId);assert.equal(ca.state.phase,'won');assert.equal(ca.state.tick,tick,'checkpoint survives complete runtime restart');assert.equal(ca.state.doorRevision,3);assert.equal(ca.setup.geometry.walls[door.wallIndex].open,true,'open door collision survives runtime restart');
 cb.ws.send(JSON.stringify({type:'door',protocol:1,epoch:missionId,doorId:door.id,open:true,commandId:'native-open-again'}));await wait(()=>cb.events.find(e=>e.type==='action'&&e.commandId==='native-open-again'&&e.duplicate));assert.equal(cb.state.doorRevision,3);
 // Position claims are rejected even for an authenticated participant.
 const closed=new Promise(resolve=>ca.ws.addEventListener('close',resolve,{once:true}));ca.ws.send(JSON.stringify({type:'input',protocol:1,epoch:missionId,sequence:999,input:{forward:0,turn:0,strafe:0,run:false,x:999},interact:true}));assert.equal((await closed).code,1008);
 ca=await a.connect(room.id);await wait(()=>ca.setup);launch(ca);launch(cb);
 await wait(()=>ca.setup.meta.id!==missionId&&ca.state.status==='running');
 // Let a real guard down A, restart the runtime, then B reaches and revives A.
 const rescueMissionId=ca.setup.meta.id,helpRoute=ca.setup.meta.routes[0];for(const p of helpRoute)await moveTo(0,p);
 await wait(()=>ca.state.players.find(p=>p.id===a.id).hp===0,45000);const deadline=ca.state.rescue.down.find(d=>d.actorId===a.id).expiresAtTick;
 assert.equal(ca.state.phase,'relay','one downed player does not end mission');
 for(const ws of sockets)try{ws.close();}catch(_){}await mf.dispose();mf=new Miniflare(options);DB=await mf.getD1Database('DB');ca=await a.connect(room.id);cb=await b.connect(room.id);await wait(()=>ca.setup&&cb.setup&&ca.state.status==='running');assert.equal(ca.setup.meta.id,rescueMissionId);assert.equal(ca.state.rescue.down[0].expiresAtTick,deadline,'down timer survives native runtime restart');
 for(const p of helpRoute)await moveTo(1,p);const liveGuard=ca.state.combat.targets[0];await face(1,Math.atan2(-(liveGuard.x-pawn(1).x),-(liveGuard.z-pawn(1).z)));
 for(let n=0;n<3;n++){const commandId='rescue-guard-'+n,tick=ca.state.tick;cb.ws.send(JSON.stringify({type:'combat',protocol:1,epoch:rescueMissionId,weapon:'pistol',commandId}));const result=await wait(()=>cb.events.find(e=>e.commandId===commandId));assert.equal(result.code,'FIRED');await wait(()=>ca.state.tick>=tick+14);}
 const holding=setInterval(()=>sendIntent(1,{forward:0,turn:0,strafe:0,run:false},true),50);try{await wait(()=>ca.state.players.find(p=>p.id===a.id).hp===8,10000);}finally{clearInterval(holding);sendIntent(1,{forward:0,turn:0,strafe:0,run:false});}
 await wait(()=>cb.state.players.find(p=>p.id===a.id).hp===8);assert.equal(cb.state.players.find(p=>p.id===a.id).hp,8);assert.equal(ca.state.rescue.down.length,0);assert.equal(ca.state.inventories.find(bag=>bag.actorId===b.id).medkits,0,'native revive consumes exactly one helper medkit');assert.equal(ca.state.inventories.find(bag=>bag.actorId===a.id).medkits,2,'patient keeps its own initial and collected kits');assert.ok(ca.state.rescue.immune.some(d=>d.actorId===a.id));
 // Switch both authenticated sessions into the complete arsenal/fleet range.
 const oldRangeId=ca.setup.meta.id;
 for(const client of [ca,cb])client.ws.send(JSON.stringify({type:'launch',protocol:1,gameVersion:GAME_VERSION,revision:room.revision,mode:'proving'}));
 await wait(()=>ca.setup.meta.id!==oldRangeId&&cb.setup.meta.id===ca.setup.meta.id&&ca.state.status==='running');
 assert.equal(ca.setup.meta.mode,'proving');assert.equal(ca.state.vehicles.length,16);assert.equal(ca.state.inventories.find(bag=>bag.actorId===a.id).bazooka,12);
 const rangeEpoch=ca.setup.meta.id;
 ca.ws.send(JSON.stringify({type:'inventory',protocol:1,epoch:rangeEpoch,operation:'weapon',target:'sniper',commandId:'native-sniper-equip'}));await wait(()=>ca.events.find(e=>e.commandId==='native-sniper-equip'&&e.ok));
 ca.ws.send(JSON.stringify({type:'combat',protocol:1,epoch:rangeEpoch,weapon:'sniper',commandId:'native-sniper-fire'}));await wait(()=>ca.events.find(e=>e.commandId==='native-sniper-fire'&&e.code==='FIRED'));
 await wait(()=>cb.state.inventories.find(bag=>bag.actorId===a.id).sniperAmmo===39);assert.equal(cb.state.inventories.find(bag=>bag.actorId===b.id).sniperAmmo,40);
 const revoked=new Promise(resolve=>cb.ws.addEventListener('close',resolve,{once:true}));await DB.prepare("UPDATE hunter_access SET status='suspended' WHERE owner=?").bind(b.id).run();
 assert.equal((await revoked).code,4003,'active mission revokes suspended participant');await wait(()=>ca.state.status==='paused');
 const pauseTick=ca.state.tick;await new Promise(r=>setTimeout(r,300));assert.equal(ca.state.tick,pauseTick,'one player cannot continue after revocation');
 console.log('playable coop: native authenticated two-account launch votes, selected assault burst/ammo, two-seat jeep/passenger/driver/exit, movement through server geometry, doors/proximity/occupied passage/collision/persistence, both terminals, extraction/victory, disconnect pause/resume, durable runtime restart and position-forgery rejection, voted 16-vehicle proving ground and independently owned sniper ammo passed');
}finally{if(timer)clearInterval(timer);for(const ws of sockets)try{ws.close();}catch(_){}await mf.dispose();await rm(directory,{recursive:true,force:true});}
