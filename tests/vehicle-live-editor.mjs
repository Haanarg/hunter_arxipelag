import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {symmetrizeModel} from '../src/vehicle-live-geometry.mjs';
import {createBtr823BPreview} from '../src/btr82-3b-preview.mjs';
import {writeModelLab,readModelLab} from '../server/model-lab.mjs';
function mirrored(root,axis,plane){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),points=[],bins=new Map(),unit=0.0001;
 const bin=v=>v.map(n=>Math.floor(n/unit));
 root.traverse(mesh=>{if(!mesh.isMesh)return;const matrix=inverse.clone().multiply(mesh.matrixWorld),p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix).toArray(),key=bin(v).join(',');points.push(v);if(!bins.has(key))bins.set(key,[]);bins.get(key).push(v)}
 });
 for(const point of points){const v=[...point],i={x:0,y:1,z:2}[axis];v[i]=2*plane-v[i];const base=bin(v);let found=false;
  for(let x=-1;x<=1&&!found;x++)for(let y=-1;y<=1&&!found;y++)for(let z=-1;z<=1&&!found;z++){
   found=(bins.get([base[0]+x,base[1]+y,base[2]+z].join(','))||[]).some(p=>p.every((n,j)=>Math.abs(n-v[j])<0.00003));
  }assert(found,'Missing reflected vertex '+v);
 }
}
for(const axis of ['x','y','z'])for(const side of [-1,1]){
 const root=new THREE.Group(),part=new THREE.Mesh(new THREE.BoxGeometry(4,3,5),Array.from({length:6},()=>new THREE.MeshStandardMaterial()));
 part.position.set(.5,.2,-.3);part.rotation.set(.1,.2,.3);root.position.set(7,3,2);root.rotation.y=.8;root.add(part);
 const original=part.geometry,bytes=original.attributes.position.array.slice();
 symmetrizeModel(root,axis,side,.2);mirrored(root,axis,.2);
 assert.deepEqual(original.attributes.position.array,bytes);
 assert(part.geometry.attributes.uv);assert(part.geometry.groups.some(g=>g.materialIndex>0));
 assert([...part.geometry.attributes.position.array].every(Number.isFinite));
}
const btr=createBtr823BPreview(),before=btr.clone(true);
symmetrizeModel(btr);mirrored(btr,'x',0);
const restored=new THREE.ObjectLoader().parse(btr.toJSON());mirrored(restored,'x',0);
assert(before.children.length>0);
// Unsupported models fail atomically, before replacing any geometry.
const mixed=new THREE.Group(),box=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());mixed.add(box,new THREE.SkinnedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));const old=box.geometry;
assert.throws(()=>symmetrizeModel(mixed),/estàtica/);assert.equal(box.geometry,old);
// Shared queue: admin-only writes, capability read, expiration, no credentials.
const objects=new Map(),env={AUTH_SECRET:'test-only-secret',AUTH_ORIGIN:'https://hunter.example',SAVES:{put:async(k,v)=>objects.set(k,v),get:async k=>objects.has(k)?{json:async()=>JSON.parse(objects.get(k))}:null}};
const req=new Request('https://hunter.example/api/model-lab/queue',{method:'PUT'}),url=new URL(req.url),json=Response.json,body=async()=>({requests:[{text:'Mou el canó'}]});
await assert.rejects(()=>writeModelLab(req,env,{id:'u'},url,body,json,{access:async()=>({role:'user'}),limit:async()=>{}}),/administrador/);
const response=await writeModelLab(req,env,{id:'u'},url,body,json,{access:async()=>({role:'admin'}),limit:async()=>{}}),result=await response.json();
const read=await readModelLab(new Request(result.url),env,new URL(result.url),json);assert.equal((await read.json()).requests[0].text,'Mou el canó');
assert(!JSON.stringify([...objects.values()]).includes('test-only-secret'));
const k=[...objects.keys()][0],expired=JSON.parse(objects.get(k));expired.expiresAt=0;objects.set(k,JSON.stringify(expired));
await assert.rejects(()=>readModelLab(new Request(result.url),env,new URL(result.url),json),/caducat/);
console.log('PASS live editor: six symmetry directions, transformed meshes, attributes, BTR, JSON roundtrip, atomic failure and shared queue permissions/expiry');
