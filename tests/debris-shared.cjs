'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
(async()=>{
 const h=await require('./harness.cjs')();
 if(process.env.HUNTER_DEBRIS_REFERENCE){
  const text=require('node:fs').readFileSync(process.env.HUNTER_DEBRIS_REFERENCE,'utf8');
  h.run(text.slice(text.indexOf('function debris('),text.indexOf('function vehicleDebris(')));
  const start=text.indexOf('function updDeb('),end=text.indexOf('updFA(dt)}',start)+'updFA(dt)}'.length;h.run(text.slice(start,end));
 }
 const snapshots=h.run(`(()=>{let state=1234567;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};world=new THREE.Group();hAt=()=>0;DB.length=0;FA.length=0;WA.length=0;HR.length=0;
 const read=()=>DB.map(d=>({p:d.m.position.toArray(),r:d.m.rotation.toArray(),s:d.m.scale.toArray(),vx:d.vx,vy:d.vy,vz:d.vz,rx:d.rx,life:d.life}));
 debris(3,2,4,0x4fa03a,8,1,5);debris(2,1,-3,0x8a6a3a,4,.7,3);DB[0].vehiclePart=true;DB[0].ry=2;DB[0].rz=-3;DB[1].vehiclePart=true;DB[1].truckPiece=true;DB[1].ry=-2;DB[1].rz=4;const rows=[read()];for(let i=0;i<90;i++){updDeb(1/60);rows.push(read())}return {rows,state};})()`);
 const hash=crypto.createHash('sha256').update(JSON.stringify(snapshots)).digest('hex');
 if(process.env.HUNTER_DEBRIS_REFERENCE)console.log(hash);else assert.equal(hash,'19f7f610f25d25fb7f7dc269b1f74e87d3356562211334821495a00551cd2294');
 console.log('shared debris: original RNG, spawn, gravity, bounce, spin, fade and expiry preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
