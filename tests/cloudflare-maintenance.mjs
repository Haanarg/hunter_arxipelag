import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {applyMigrations} from './helpers/apply-d1.mjs';
import {runMaintenance} from '../server/maintenance.mjs';
import worker from '../server/worker.mjs';
const DAY=86400000,mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response()}}',d1Databases:['DB'],r2Buckets:['SAVES'],compatibilityDate:'2026-08-06'});
try{
 const DB=await mf.getD1Database('DB'),SAVES=await mf.getR2Bucket('SAVES'),env={DB,SAVES,AUTH_SECRET:'test-maintenance-secret-1234567890123456',AUTH_ORIGIN:'http://localhost'};
 let response=await worker.fetch(new Request('http://localhost/api/capabilities'),env,{});const missing=await response.json();assert.equal(missing.accounts,false,'no accounts before migrations');assert.equal(missing.reason,'migrations');
 for(const AUTH_ORIGIN of ['http://example.test','https://example.test/path','https://example.test/']){
  response=await worker.fetch(new Request('http://localhost/api/capabilities'),{...env,AUTH_ORIGIN},{});assert.equal((await response.json()).accounts,false,'reject invalid origin configuration');
 }
 for(const key of ['DB','SAVES','AUTH_SECRET','AUTH_ORIGIN']){
  const bad={...env};delete bad[key];
  response=await worker.fetch(new Request('http://localhost/api/capabilities'),bad,{});
  const body=await response.json();assert.deepEqual(body.issues,[key]);assert.ok(!JSON.stringify(body).includes(env.AUTH_SECRET),'never disclose secret');
 }
 await applyMigrations(DB);response=await worker.fetch(new Request('http://localhost/api/capabilities'),env,{});assert.equal((await response.json()).accounts,true);
 await DB.prepare('INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,?,?,?)').bind('owner','owner','owner@hunter.invalid',0,Date.now(),Date.now()).run();
 for(const key of ['saves/00-orphan','saves/01-current','saves/02-previous','saves/03-orphan','saves/04-orphan','foreign/untouched'])await SAVES.put(key,'test');
 await DB.prepare('INSERT INTO hunter_saves(owner,id,revision,object_key,previous_key,name,seed,map_scale,played_seconds,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind('owner','op:test',1,'saves/01-current','saves/02-previous','test',67,1,0,Date.now()).run();
 let result=await runMaintenance(env);assert.equal(result.deleted,0,'fresh uncommitted upload survives grace period');
 await DB.prepare("UPDATE hunter_maintenance SET cursor=NULL").run();
 // Simulate old objects using a future maintenance clock, without changing R2 internals.
 const now=Date.now()+2*DAY;
 result=await runMaintenance(env,{now,pageSize:2});assert.equal(result.scanned,4);assert.equal(result.deleted,2);assert.equal(result.more,true);
 assert.equal(await SAVES.head('saves/00-orphan'),null);assert.ok(await SAVES.head('saves/01-current'));assert.ok(await SAVES.head('saves/02-previous'));
 result=await runMaintenance(env,{now,pageSize:2});assert.equal(result.deleted,1);assert.equal(result.more,false);
 assert.ok(await SAVES.head('foreign/untouched'),'other prefixes never touched');
 await DB.prepare("UPDATE hunter_maintenance SET lease='other',lease_until=?").bind(now+60000).run();
 result=await runMaintenance(env,{now});assert.equal(result.busy,true,'overlapping invocation skipped');
 await DB.prepare('UPDATE hunter_maintenance SET lease_until=0').run();
 let failures=0;const failBucket={list:options=>SAVES.list(options),delete:async()=>{failures++;throw new Error('R2 unavailable');}};
 await SAVES.put('saves/05-orphan','test');
 await assert.rejects(runMaintenance({...env,SAVES:failBucket},{now:now+DAY}));assert.equal(failures,1);
 assert.equal((await DB.prepare('SELECT lease_until FROM hunter_maintenance').first()).lease_until,0,'lease released after failure');
 result=await runMaintenance(env,{now:now+DAY});assert.equal(result.deleted,1,'failed page retried safely');
 assert.ok(await SAVES.head('saves/01-current'));assert.ok(await SAVES.head('saves/02-previous'));
 const pending=[];await worker.scheduled({},env,{waitUntil:p=>pending.push(p)});await Promise.all(pending);assert.equal(pending.length,1,'scheduled handler invokes maintenance');
 console.log('maintenance/readiness: missing schema, native D1/R2, grace period, current and previous protection, paginated resume, lease, failure retry and scheduled handler passed');
}finally{await mf.dispose();}
