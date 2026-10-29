#!/usr/bin/env node
'use strict';
// LOD únic de vehicles del runtime original: solo i sessió cooperativa.
const assert=require('node:assert/strict');
const createGame=require('./harness.cjs');

(async()=>{
 const game=await createGame();
 game.start('67');
 const result=game.run(`(()=>{
   // Reutilitzam vehicles reals del món original però aïllam només
   // les crides visuals a place(): no volem alterar física ni servidor.
   clearKeys();scopeActive=false;paused=false;over=0;started=1;
   const vehicles=V.slice(0,5);
   if(vehicles.length<5)throw Error('La fixture no conté cinc vehicles');
   V=vehicles;
   const [pilot,near,medium,far,wreck]=vehicles;
   P.x=0;P.z=0;P.y=10;P.hd=Math.PI;
   for(const v of vehicles){
     v.testVisualCalls=[];v.visualLodAcc=0;v.destroyed=false;v.o.visible=true;
     v.v=0;v.hd=Math.PI;v.x=0;v.z=0;
   }
   near.x=30;medium.x=700;far.x=1600;wreck.x=35;wreck.destroyed=true;
   let visualCalls=0;
   place=(v,t,dt,steering)=>{v.testVisualCalls.push({dt,steering});visualCalls++};
   const samples=()=>vehicles.map(v=>v.testVisualCalls.length);
   cv=pilot;
   for(let i=0;i<20;i++)updateVehicleVisualLod(i*.05,.05);
   const solo=samples(),soloSteer=pilot.testVisualCalls[0].steering;
   for(const v of vehicles){v.testVisualCalls.length=0;v.visualLodAcc=0}
   cv=null;
   const rows=vehicles.map((v,i)=>({
     id:v.saveId,t:v.t,x:v.x,z:v.z,y:10,hd:v.hd,
     v:0,alt:10,life:v.destroyed?0:5,destroyed:!!v.destroyed,
     seats:i===0?['a',null]:[null,null]
   }));
   nativeCoopSession={
     preparing:false,self:'a',state:{
       status:'running',phase:'relay',tick:30,
       players:[{id:'a',x:0,y:10,z:0,hd:Math.PI,hp:25,swimming:false,acknowledged:0}],
       vehicles:rows,inventories:[{actorId:'a',bullets:24,sniperAmmo:0,weapon:'pistol'}],
       combat:{targets:[],projectiles:[],grenades:[],effects:[]},
       doors:[],removedWalls:[],removedRoofs:[],brokenWindows:[],
       palmHealth:[],claimedSupplies:[]
     },
     vehicles:new Map(vehicles.map(v=>[v.saveId,v])),
     enemies:new Map(),items:new Map(),walls:[],buildings:[],palms:[],
     remotes:new Map(),projectiles:new Map(),grenades:new Map(),
     seenEffects:new Set(),channel:{},nextFireTick:1000
   };
   worldVisualTick=1000;palmVisualTick=1000;uiTick=0;
   for(let i=0;i<20;i++)updateNativeCoop(.05);
   const coop=samples();
   return {solo,coop,soloSteer,frameCount:20,visualCalls};
 })()`);
 for(const [name,counts] of Object.entries({solo:result.solo,coop:result.coop})){
   assert.equal(counts[0],20,name+': el vehicle propi s\'actualitza cada fotograma');
   assert.equal(counts[1],20,name+': vehicle proper sense reducció');
   assert(counts[2]>=9&&counts[2]<=10,name+': 0,1 s a distància mitjana');
   assert.equal(counts[3],2,name+': 0,45 s per vehicle llunyà');
   assert.equal(counts[4],0,name+': vehicle destruït no es reanima');
 }
 assert.equal(result.soloSteer,0,'La direcció visual local no canvia');
 console.log('OK LOD compartit: 20/20 propers, 9-10/20 mitjans, 2/20 llunyans i 0/20 destruïts en ambdós modes');
})().catch(error=>{console.error(error);process.exitCode=1});

