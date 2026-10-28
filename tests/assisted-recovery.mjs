import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import worker from '../server/worker.mjs';
import {applyMigrations} from './helpers/apply-d1.mjs';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response()}}',d1Databases:['DB'],r2Buckets:['SAVES'],compatibilityDate:'2026-08-06'});
try{
 const DB=await mf.getD1Database('DB'),SAVES=await mf.getR2Bucket('SAVES');await applyMigrations(DB);
 const env={DB,SAVES,AUTH_SECRET:'test-only-assisted-recovery-secret-123456789',AUTH_ORIGIN:'http://localhost'},ctx={waitUntil:p=>p.catch(()=>{})};
 let ip=0;
 function browser(){
  const jar=new Map();
  return async(path,body)=>{
   const headers={Origin:env.AUTH_ORIGIN,'cf-connecting-ip':'10.0.1.'+(++ip),Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')};
   if(body)headers['Content-Type']='application/json';
   const response=await worker.fetch(new Request(env.AUTH_ORIGIN+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}),env,ctx);
   for(const cookie of response.headers.getSetCookie()){const p=cookie.split(';')[0],at=p.indexOf('=');jar.set(p.slice(0,at),p.slice(at+1));}
   return response;
  };
 }
 const admin=browser(),player=browser(),outsider=browser();
 async function signup(call,username){const response=await call('/api/auth/sign-up/email',{username,password:'original-password-123'});assert.equal(response.status,200);return (await response.json()).user;}
 const a=await signup(admin,'manager'),b=await signup(player,'player'),c=await signup(outsider,'other');
 await DB.prepare("UPDATE hunter_access SET status='approved',role='admin' WHERE owner IN (?,?)").bind(a.id,c.id).run();
 const route='/api/admin/users/'+b.id+'/recovery',body={password:'original-password-123',confirmedIdentity:true};
 assert.equal((await player(route,body)).status,403,'ordinary user cannot issue');
 assert.equal((await admin(route,{...body,confirmedIdentity:false})).status,400);
 assert.equal((await admin(route,{...body,password:'incorrect-password'})).status,400);
 assert.equal((await admin('/api/admin/users/'+a.id+'/recovery',body)).status,403,'cannot recover own admin');
 assert.equal((await admin('/api/admin/users/'+c.id+'/recovery',body)).status,403,'cannot recover another admin');
 const codes=await player('/api/account/recovery-codes',{password:body.password}).then(r=>r.json());
 let ticket=await admin(route,body).then(r=>r.json());assert.equal(ticket.code.replace(/-/g,'').length,32);
 let replacement=await admin(route,body).then(r=>r.json());
 assert.equal((await player('/api/account/recover',{username:'player',code:ticket.code,newPassword:'new-player-password'})).status,400,'replacement invalidates old ticket');
 await DB.prepare('UPDATE hunter_assisted_recovery SET expires_at=? WHERE owner=?').bind(Date.now()-1,b.id).run();
 assert.equal((await player('/api/account/recover',{username:'player',code:replacement.code,newPassword:'new-player-password'})).status,400,'expired ticket rejected');
 ticket=await admin(route,body).then(r=>r.json());
 const saved=await DB.prepare('SELECT * FROM hunter_assisted_recovery WHERE owner=?').bind(b.id).first();assert.equal(saved.code_hash.length,64);assert.ok(!JSON.stringify(saved).includes(ticket.code.replace(/-/g,'')));
 assert.equal((await player('/api/account/recover',{username:'player',code:ticket.code,newPassword:'new-player-password'})).status,200);
 assert.equal((await player('/api/account/status')).status,401,'all target sessions revoked');
 assert.equal((await player('/api/account/recover',{username:'player',code:ticket.code,newPassword:'replayed-password'})).status,400);
 assert.equal((await player('/api/account/recover',{username:'player',code:codes.codes[0],newPassword:'replayed-password'})).status,400,'old personal codes revoked');
 assert.equal((await player('/api/auth/sign-in/email',{username:'player',password:'new-player-password'})).status,200);
 assert.equal((await player('/api/account/status').then(r=>r.json())).status,'pending','recovery does not approve account');
 assert.equal((await DB.prepare("SELECT count(*) AS n FROM hunter_account_audit WHERE event='recovery-used'").first()).n,1);
 ticket=await admin(route,body).then(r=>r.json());
 await DB.prepare("UPDATE hunter_access SET status='suspended' WHERE owner=?").bind(a.id).run();
 assert.equal((await player('/api/account/recover',{username:'player',code:ticket.code,newPassword:'revoked-admin-reset'})).status,400,'suspended issuer invalidates ticket');
 await DB.prepare("UPDATE hunter_access SET status='approved' WHERE owner=?").bind(a.id).run();
 assert.equal((await player('/api/auth/change-password',{currentPassword:'new-player-password',newPassword:'manually-changed-password'})).status,200);
 assert.equal((await DB.prepare('SELECT count(*) AS n FROM hunter_assisted_recovery WHERE owner=?').bind(b.id).first()).n,0,'password change revokes pending assisted ticket');
 await DB.prepare("UPDATE hunter_access SET status='suspended' WHERE owner=?").bind(b.id).run();
 assert.equal((await admin(route,body)).status,403,'cannot issue for suspended target');
 console.log('assisted recovery: admin reauthentication, verification, target restrictions, hash-only tickets, replacement, expiry, one-use, session and personal-code revocation, audit and issuer suspension passed');
}finally{await mf.dispose();}
