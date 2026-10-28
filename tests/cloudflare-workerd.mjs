import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {GAME_VERSION} from '../src/version.mjs';
import {applyMigrations} from './helpers/apply-d1.mjs';
const mf=new Miniflare({modulesRoot:'/tmp',modules:[{type:'ESModule',path:'/tmp/hunter-worker.mjs'}],compatibilityDate:'2026-08-06',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['SAVES'],bindings:{AUTH_SECRET:'test-workerd-only-secret-12345678901234567890',AUTH_ORIGIN:'http://localhost'}});
try{
 const DB=await mf.getD1Database('DB');await applyMigrations(DB,{coop:true});
 const cookies=new Map();
 async function call(path,method='GET',body){
  const headers={'X-Hunter-User':globalThis.coopTestOwner||'',Origin:'http://localhost','cf-connecting-ip':'10.1.1.1'};
  if(cookies.size)headers.Cookie=[...cookies].map(([k,v])=>k+'='+v).join('; ');
  if(body)headers['Content-Type']='application/json';
  const response=await mf.dispatchFetch('http://localhost'+path,{method,headers,body:body?JSON.stringify(body):undefined});
  for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}
  return response;
 }
 let response=await call('/api/capabilities');assert.equal((await response.json()).accounts,true);
 response=await call('/api/auth/sign-up/email','POST',{username:'workeruser',password:'workerd-password-123'});assert.equal(response.status,200,await response.clone().text());
 const user=(await response.json()).user;assert.equal(user.name,'workeruser');assert.equal(user.email,undefined);
 response=await call('/api/account/status');assert.equal((await response.json()).status,'pending');
 await DB.prepare("UPDATE hunter_access SET status='approved',role='admin' WHERE owner=?").bind(user.id).run();
 response=await call('/api/account/recovery-codes','POST',{password:'workerd-password-123'});assert.equal(response.status,200,await response.clone().text());
 const codes=(await response.json()).codes;assert.equal(codes.length,8);
 response=await call('/api/account/recover','POST',{username:'workeruser',code:codes[0],newPassword:'new-workerd-password'});assert.equal(response.status,200,await response.clone().text());
 response=await call('/api/account/status');assert.equal(response.status,401);
 response=await call('/api/auth/sign-in/email','POST',{username:'workeruser',password:'new-workerd-password'});assert.equal(response.status,200,await response.clone().text());
 const adminCookies=new Map(cookies);
 response=await call('/api/auth/sign-up/email','POST',{username:'workerplayer',password:'player-password-123'});assert.equal(response.status,200);
 const player=(await response.json()).user;
 cookies.clear();for(const [k,v] of adminCookies)cookies.set(k,v);
 response=await call('/api/admin/users/'+player.id+'/recovery','POST',{password:'new-workerd-password',confirmedIdentity:true});assert.equal(response.status,200,await response.clone().text());
 const ticket=await response.json();
 response=await call('/api/account/recover','POST',{username:'workerplayer',code:ticket.code,newPassword:'recovered-player-password'});assert.equal(response.status,200,await response.clone().text());
 response=await call('/api/auth/sign-in/email','POST',{username:'workerplayer',password:'recovered-player-password'});assert.equal(response.status,200);
 response=await call('/api/account/status');assert.equal((await response.json()).status,'pending');
 await DB.prepare("UPDATE hunter_access SET status='approved' WHERE owner=?").bind(player.id).run();
 globalThis.coopTestOwner=player.id;
 response=await call('/api/coop/rooms','POST',{seed:67,mapScale:1,difficulty:1});assert.equal(response.status,200,await response.clone().text());
 const lobby=(await response.json()).room,playerCookies=new Map(cookies);
 cookies.clear();for(const [k,v] of adminCookies)cookies.set(k,v);globalThis.coopTestOwner=user.id;
 response=await call('/api/coop/join','POST',{code:lobby.code});assert.equal(response.status,200,await response.clone().text());let joined=(await response.json()).room;assert.equal(joined.members.length,2);
 response=await call('/api/coop/ready','POST',{ready:true,revision:joined.revision});joined=(await response.json()).room;
 cookies.clear();for(const [k,v] of playerCookies)cookies.set(k,v);globalThis.coopTestOwner=player.id;
 response=await call('/api/coop/ready','POST',{ready:true,revision:joined.revision});joined=(await response.json()).room;
 response=await call('/api/coop/prepare','POST',{revision:joined.revision,protocol:1,gameVersion:GAME_VERSION});assert.equal(response.status,200,await response.clone().text());
 const manifest=(await response.json()).manifest;assert.equal(manifest.participants.length,2);assert.equal(manifest.playable,true);
 console.log('workerd: bundled production Worker, native D1, signup, manual approval, recovery codes, reset, session revocation, admin-assisted recovery, login and two-player lobby and shared mission preparation passed');
}finally{await mf.dispose();}
