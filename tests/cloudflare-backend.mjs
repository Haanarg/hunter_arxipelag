import assert from 'node:assert/strict';
import {applyMigrations} from './helpers/apply-d1.mjs';
import {Miniflare} from 'miniflare';
import worker from '../server/worker.mjs';
import {configuredAccounts} from '../src/account-client.mjs';
import {createOperation} from '../src/operation-save.mjs';
const mf=new Miniflare({modules:true,script:"export default {fetch(){return new Response('bindings')}}",d1Databases:['DB'],r2Buckets:['SAVES'],compatibilityDate:'2026-08-06'});
try{
 const DB=await mf.getD1Database('DB'),SAVES=await mf.getR2Bucket('SAVES');
 await applyMigrations(DB);
 const env={DB,SAVES,AUTH_SECRET:'test-only-secret-not-deployed-0123456789-abcdef',AUTH_ORIGIN:'http://localhost',ASSETS:{fetch:async()=>new Response('static')}},ctx={waitUntil:p=>p.catch(()=>{})};
 function browser(ip){
   const cookies=new Map();
   const fetcher=async(path,options={})=>{
     const headers=new Headers(options.headers);headers.set('Origin',env.AUTH_ORIGIN);headers.set('cf-connecting-ip',ip);
     if(cookies.size)headers.set('Cookie',[...cookies].map(([key,value])=>key+'='+value).join('; '));
     const response=await worker.fetch(new Request('http://localhost'+path,{...options,headers}),env,ctx);
     for(const cookie of response.headers.getSetCookie()){const [pair]=cookie.split(';'),at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}
     return response;
   };
   return {fetcher,cookies};
 }
 const a=browser('10.0.0.1'),b=browser('10.0.0.2'),c=browser('10.0.0.3');
 const alice=await configuredAccounts({apiBase:'/api'},{fetcher:a.fetcher}),bob=await configuredAccounts({apiBase:'/api'},{fetcher:b.fetcher});
 assert.equal(alice.configured,true);assert.equal(alice.status().user,null);
 await alice.signUp('Alice','alice-password-123');await bob.signUp('Bob','bob-password-123');
 const aid=alice.status().user.id,bid=bob.status().user.id;
 assert.equal(alice.status().approval,'pending');assert.equal(bob.status().approval,'pending');
 const call=(browser,path,method='GET',data,headers={})=>browser.fetcher(path,{method,headers:{...headers,...(data===undefined?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data)});
 assert.equal((await call(a,'/api/saves','GET',undefined,{'X-Hunter-User':aid})).status,403);
 assert.equal((await call(b,'/api/admin/users')).status,403);
 await DB.prepare("UPDATE hunter_access SET status='approved',role='admin' WHERE owner=?").bind(aid).run();
 await alice.verifiedUser();assert.equal(alice.status().role,'admin');
 assert.equal((await alice.users()).length,2);await alice.approve(bid,'approved');await bob.verifiedUser();assert.equal(bob.status().approval,'approved');
 assert.equal((await DB.prepare('SELECT role FROM hunter_access WHERE owner=?').bind(bid).first()).role,'user');
 const codes=await alice.recoveryCodes('alice-password-123');assert.equal(codes.length,8);
 const rows=(await DB.prepare('SELECT code_hash FROM hunter_recovery WHERE owner=?').bind(aid).all()).results;
 assert.equal(rows.length,8);assert.ok(rows.every(row=>row.code_hash.length===64&&!codes.some(code=>code.replace(/-/g,'')===row.code_hash)));
 const oldCookie=new Map(a.cookies);
 await alice.recover('alice',codes[0],'alice-password-new');
 const oldHeaders={'Cookie':[...oldCookie].map(([k,v])=>k+'='+v).join('; '),'X-Hunter-User':aid};
 assert.equal((await worker.fetch(new Request('http://localhost/api/saves',{headers:oldHeaders}),env,ctx)).status,401);
 await assert.rejects(alice.signIn('alice','alice-password-123'));
 await alice.signIn('alice','alice-password-new');
 await assert.rejects(alice.recover('alice',codes[0],'wrong-replay-password'));
 await alice.signIn('alice','alice-password-new');
 const renewed=await alice.recoveryCodes('alice-password-new');assert.equal(renewed.length,8);
 await assert.rejects(alice.recover('alice',codes[1],'another-reset-password'));
 const sid='op:large',snapshot=createOperation({operationId:sid,name:'Large R2',gameVersion:'0.6.6',generatorVersion:'world:0.6.2',seed:67,mapScale:1});
 snapshot.world.testPayload='x'.repeat(2100000);
 const headers={'X-Hunter-User':aid,'X-Hunter-Revision':'0'},url='/api/saves/'+sid;
 let response=await call(a,url,'PUT',snapshot,headers);assert.equal(response.status,200,await response.clone().text());assert.equal((await response.json()).revision,1);
 response=await call(a,url,'GET',undefined,{'X-Hunter-User':aid});assert.equal((await response.json()).snapshot.world.testPayload.length,2100000,'save larger than D1 row lives in R2');
 assert.equal((await call(b,url,'GET',undefined,{'X-Hunter-User':bid})).status,404);
 assert.equal((await call(b,url,'GET',undefined,{'X-Hunter-User':aid})).status,403);
 assert.equal((await call(a,url,'PUT',snapshot,headers)).status,409);
 headers['X-Hunter-Revision']='1';assert.equal((await call(a,url,'PUT',snapshot,headers)).status,200);
 headers['X-Hunter-Revision']='2';const racing=await Promise.all([call(a,url,'PUT',snapshot,headers),call(a,url,'PUT',snapshot,headers)]);
 assert.deepEqual(racing.map(r=>r.status).sort(),[200,409]);assert.equal((await SAVES.list()).objects.length,2,'only current and previous cloud blobs remain after CAS');
 const history={format:1,runId:'run:sql',seed:67,mapScale:1,generatorVersion:'world:0.6.2',seconds:10,startedAt:100,lastPlayedAt:200,outcome:'active',metrics:{kills:2,shots:4,damageTaken:0,pickups:1,rescues:0,sabotages:0},vehicles:['vehicles:1']};
 for(let i=0;i<2;i++)assert.equal((await call(a,'/api/history/run:sql','PUT',history,{'X-Hunter-User':aid})).status,200);
 response=await call(a,'/api/history','GET',undefined,{'X-Hunter-User':aid});const records=await response.json();assert.equal(records.length,1);assert.equal(records[0].record.metrics.kills,2);
 assert.equal((await call(a,url,'DELETE',undefined,{'X-Hunter-User':aid,'X-Hunter-Revision':'3'})).status,200);
 assert.equal((await SAVES.list()).objects.length,0);assert.equal((await DB.prepare('SELECT count(*) AS n FROM hunter_runs WHERE owner=?').bind(aid).first()).n,1);
 await alice.approve(bid,'suspended');assert.equal((await call(b,'/api/saves','GET',undefined,{'X-Hunter-User':bid})).status,403);
 const csrf=await worker.fetch(new Request('http://localhost/api/auth/sign-in/email',{method:'POST',headers:{Origin:'https://attacker.test','Content-Type':'application/json'},body:'{}'}),env,ctx);assert.equal(csrf.status,403);
 const unavailable=await worker.fetch(new Request('http://localhost/api/capabilities'),{ASSETS:env.ASSETS},ctx);assert.equal((await unavailable.json()).accounts,false);
 console.log('Cloudflare backend: native D1/R2, pending approval, admin isolation, one-use recovery, session revocation, >2MB saves, ownership, CAS race, backup cleanup, journal deduplication and CSRF passed');
}finally{await mf.dispose();}
