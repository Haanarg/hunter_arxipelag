import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {createCloudSync} from '../src/operation-cloud.mjs';
import {createOperation,createOperationStore} from '../src/operation-save.mjs';
let user={id:'user-a'};
const accounts={status:()=>({user}),async signOut(){user=null}};
const local=createOperationStore({indexedDB,name:'cloud-test'}),storage=new Map(),memory={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
let snapshot=await local.save(createOperation({operationId:'op:cloud',name:'Cloud',gameVersion:'0.6.6',generatorVersion:'world:0.6.2',seed:67,mapScale:1}),{expectedRevision:0});
const cloud=new Map();let offline=false;
const remote={owner:async()=>user.id,write:async(owner,id,expected,payload)=>{
 if(offline)throw new Error('offline');assert.equal(owner,user.id);const key=owner+':'+id,current=cloud.get(key);
 if((current?.revision||0)!==expected){const error=new Error('conflict');error.code='CONFLICT';throw error;}
 cloud.set(key,{revision:expected+1,snapshot:structuredClone(payload),operation_id:id});return expected+1;
},read:async(owner,id)=>structuredClone(cloud.get(owner+':'+id)),list:async()=>[...cloud.values()]};
const sync=createCloudSync({accounts,remote,local,storage:memory});
assert.equal(await sync.push(snapshot.operationId),1);
const original=await local.load(snapshot.operationId);original.world.time=10;snapshot=await local.save(original,{expectedRevision:1});
offline=true;await assert.rejects(sync.enqueue(snapshot),/offline/);assert.equal((await local.load(snapshot.operationId)).world.time,10);
offline=false;await sync.retry();assert.equal(cloud.get('user-a:op:cloud').revision,2);
cloud.get('user-a:op:cloud').revision=3;
await assert.rejects(sync.push(snapshot.operationId),e=>e.code==='CONFLICT');assert.equal((await local.load(snapshot.operationId)).world.time,10);
await sync.push(snapshot.operationId,{asNew:true});assert.equal(cloud.size,2);
const pulled=await sync.pull('op:cloud');assert.notEqual(pulled.operationId,snapshot.operationId);assert.equal((await local.list()).length,2);
user={id:'user-b'};await sync.push(snapshot.operationId);assert.ok(cloud.has('user-b:op:cloud'),'links are scoped to the verified account');
await accounts.signOut();assert.equal(accounts.status().user,null);assert.equal((await local.list()).length,2,'logout preserves local saves');
await local.close();
console.log('cloud sync: local preservation, offline retry, CAS conflict, new cloud copy, pull and account isolation passed');
