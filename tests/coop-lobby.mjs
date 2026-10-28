import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {applyMigrations} from './helpers/apply-d1.mjs';
import worker from '../server/worker.mjs';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response()}}',d1Databases:['DB'],r2Buckets:['SAVES'],compatibilityDate:'2026-08-06'});
try{
 const DB=await mf.getD1Database('DB'),SAVES=await mf.getR2Bucket('SAVES');await applyMigrations(DB,{coop:true});
 const env={DB,SAVES,AUTH_SECRET:'test-coop-only-not-a-secret-01234567890123456789',AUTH_ORIGIN:'http://localhost'},ctx={waitUntil:p=>p.catch(()=>{})};
 let index=0;
 async function browser(name,approve=true){
  const cookies=new Map();let id;const ip='10.2.0.'+(++index);
  const call=async(path,data,owner=id)=>{
   const headers={Origin:env.AUTH_ORIGIN,'cf-connecting-ip':ip,'X-Hunter-User':owner||'',Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')};
   if(data)headers['Content-Type']='application/json';
   const r=await worker.fetch(new Request(env.AUTH_ORIGIN+path,{method:data?'POST':'GET',headers,body:data?JSON.stringify(data):undefined}),env,ctx);
   for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],a=p.indexOf('=');cookies.set(p.slice(0,a),p.slice(a+1));}return r;
  };
  const r=await call('/api/auth/sign-up/email',{username:name,password:'coop-password-123'});assert.equal(r.status,200);id=(await r.json()).user.id;
  if(approve)await DB.prepare("UPDATE hunter_access SET status='approved' WHERE owner=?").bind(id).run();return {id,call};
 }
 const host=await browser('host'),b=await browser('guest1'),c=await browser('guest2'),pending=await browser('pending',false);
 const create={seed:67,mapScale:1,difficulty:1};
 assert.equal((await pending.call('/api/coop/rooms',create)).status,403);
 assert.equal((await host.call('/api/coop/rooms',{...create,seed:-1})).status,400);
 let r=await host.call('/api/coop/rooms',create);assert.equal(r.status,200,await r.clone().text());let room=(await r.json()).room;
 assert.equal(room.members.length,1);assert.equal(room.seed,67);assert.equal(room.allReady,false);
 assert.equal((await c.call('/api/coop/current',undefined,host.id)).status,403);
 assert.equal((await c.call('/api/coop/current').then(r=>r.json())).room,null,'outsider has no room listing');
 const joined=await Promise.all([b.call('/api/coop/join',{code:room.code}),c.call('/api/coop/join',{code:room.code})]);assert.deepEqual(joined.map(r=>r.status).sort(),[200,409]);
 const guest=joined[0].status===200?b:c;
 assert.equal((await DB.prepare('SELECT count(*) AS n FROM hunter_coop_members').first()).n,2);
 assert.equal((await guest.call('/api/coop/rooms',create)).status,409);assert.equal((await DB.prepare('SELECT count(*) AS n FROM hunter_coop_rooms').first()).n,1,'failed create rolls back room');
 assert.equal((await host.call('/api/coop/ready',{ready:true,revision:room.revision})).status,409,'stale membership revision rejected');
 room=(await host.call('/api/coop/current').then(r=>r.json())).room;
 room=(await host.call('/api/coop/ready',{ready:true,revision:room.revision}).then(r=>r.json())).room;
 room=(await guest.call('/api/coop/ready',{ready:true,revision:room.revision}).then(r=>r.json())).room;assert.equal(room.allReady,true);
 await DB.prepare('UPDATE hunter_coop_members SET last_seen=? WHERE owner=?').bind(Date.now()-60000,guest.id).run();
 room=(await host.call('/api/coop/current').then(r=>r.json())).room;assert.equal(room.allReady,false,'offline participant not ready');
 await guest.call('/api/coop/current');
 await DB.prepare("UPDATE hunter_access SET status='suspended' WHERE owner=?").bind(guest.id).run();
 room=(await host.call('/api/coop/current').then(r=>r.json())).room;assert.equal(room.allReady,false);assert.equal((await guest.call('/api/coop/current')).status,403);
 await DB.prepare("UPDATE hunter_access SET status='approved' WHERE owner=?").bind(guest.id).run();
 await guest.call('/api/coop/leave',{});room=(await host.call('/api/coop/current').then(r=>r.json())).room;assert.equal(room.members.length,1);assert.equal(room.members[0].ready,false,'leaving resets host readiness');
 await guest.call('/api/coop/join',{code:room.code});
 await host.call('/api/coop/leave',{});assert.equal((await guest.call('/api/coop/current').then(r=>r.json())).room,null,'host closing removes both seats');
 r=await host.call('/api/coop/rooms',create);assert.equal(r.status,200);room=(await r.json()).room;
 await DB.prepare('UPDATE hunter_coop_rooms SET expires_at=?').bind(Date.now()-1).run();
 assert.equal((await guest.call('/api/coop/join',{code:room.code})).status,404);assert.equal((await host.call('/api/coop/current').then(r=>r.json())).room,null);
 assert.equal((await DB.prepare('SELECT count(*) AS n FROM hunter_coop_members').first()).n,0,'expiry cascades membership cleanup');
 console.log('coop lobby: authenticated approved users, owner isolation, shared settings, concurrent two-seat limit, one room per user, transactional rollback, revision checks, readiness, offline/suspended members, leaving, host close and expiry passed');
}finally{await mf.dispose();}
