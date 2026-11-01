#!/usr/bin/env node
'use strict';
// Mateixa llavor => els mateixos vehicles, IDs, direccions i posicions
// al món individual, als dos clients COOP natius i al Worker autoritatiu.
const assert=require('node:assert/strict');
(async()=>{
 const createGame=require('./harness.cjs');
 const {generateNativeMission}=await import('../server/coop-native.mjs');
 const {vehicleDynamics}=await import('../src/vehicle-dynamics-core.mjs');
 const {vehicleModels}=await import('../src/vehicle-model-core.mjs');
 const {vehicleSeatCount}=await import('../src/vehicle-specs.mjs');
 const types=Object.keys(vehicleDynamics.types);
 assert.equal(types.length,16,'La flota compartida té 16 tipus de vehicle');
 assert.deepEqual(new Set(types),new Set(Object.keys(vehicleModels.scales)),
   'Tots els vehicles pilotables disposen de model visual a tots dos modes');
 for(const scale of [1,2]){
   const seed=67,solo=await createGame();solo.start(String(seed),scale);
   const original=solo.run('JSON.stringify(V.map(v=>({id:v.saveId,t:v.t,x:Math.round(v.x*1e6)/1e6,z:Math.round(v.z*1e6)/1e6,hd:Math.round(v.hd*1e6)/1e6})))');
   const coopHost=await createGame();coopHost.start(String(seed),scale);
   const host=coopHost.run('captureNativeCoopWorld()');
   const coopGuest=await createGame();coopGuest.start(String(seed),scale);
   const guest=coopGuest.run('captureNativeCoopWorld()');
   assert.equal(JSON.stringify(host),JSON.stringify(guest),
     'HOST i GUEST han de tenir exactament el mateix món i flota');
   const signature=list=>JSON.stringify(list.map(v=>({
     id:v.id,t:v.t,x:v.x,z:v.z,hd:v.hd
   })));
   assert.equal(signature(host.vehicles),original,
     'La flota COOP ha de ser EXACTAMENT la flota individual: mateix ID, tipus, coordenades i orientació');
   const available=new Set(host.vehicles.map(v=>v.t)),
     missing=types.filter(t=>!available.has(t));
   assert.deepEqual(missing,[],'Han d’aparèixer els 16 tipus al mapa de prova amb llavor 67');
   const sectors=scale===2?[0,1,2,3]:[null],
     sector=(x,z)=>(x>=0?1:0)+(z>=0?2:0),
     count=(rows,s)=>rows.filter(v=>v.t==='hover'&&(s===null||sector(v.x,v.z)===s)).length;
   for(const s of sectors)
     assert.ok(count(host.vehicles,s)>=2,
       'Dues unitats hovercraft al mapa petit o per quadrant al gran');
   const room={id:'parity',revision:1,seed,mapScale:scale,difficulty:1,
     allReady:true,expiresAt:Date.now()+86400000,
     members:[{id:'a',name:'HOST'},{id:'b',name:'GUEST'}]};
   const generated=generateNativeMission(room,host,'test-fingerprint');
   assert.equal(signature(generated.record.meta.vehicles),original,
     'La validació del Worker no canvia cap posició ni orientació');
   for(const vehicle of generated.record.meta.vehicles)
     assert.equal(vehicle.seats.length,vehicleSeatCount(vehicle.t),
       'Places correctes a '+vehicle.t);
   const hover=generated.record.meta.vehicles.find(v=>v.t==='hover');
   assert.ok(hover&&hover.seats.length===2,
     'L’hovercraft D ha de permetre conduir i portar passatger');
   console.log('Flota COOP = individual, mapa '+(scale===1?'petit':'gran')+
     ': 16 tipus, '+host.vehicles.length+' vehicles, hovercraft per sector='+
     sectors.map(s=>count(host.vehicles,s)).join(','));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
