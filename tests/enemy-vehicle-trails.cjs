#!/usr/bin/env node
// Regressió de les esteles dels vehicles hostils amb filtres LOD per qualitat.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url');
(async()=>{
 const root=path.join(__dirname,'..');
 const T=await import(pathToFileURL(path.join(root,'vendor/three-r186.module.mjs')).href);
 const ctx={window:{HUNTER_VEHICLE_DYNAMICS:{types:{
   cotxe:{m:'l'},tanqueta:{m:'l'},tanc:{m:'l'},llanxa:{m:'w'},heli:{m:'a'}
 }}}};
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'src/movement-fx.js'),'utf8'),ctx);
 const source=fs.readFileSync(path.join(root,'src/game-core.js'),'utf8');
 assert.ok(source.includes("new Set(['jeep','tanqueta','tanc','patrulla_marina'])"),
   'Llista completa dels vehicles enemics');
 assert.ok(source.includes('movementFx.vehicle(u,dt,fxContext)'),
   "Cal enviar els enemics al sistema d'esteles");
 const ranges={desktop:240,mobile:160,ultra:95};
 const make=quality=>ctx.window.HUNTER_MOVEMENT_FX.create(T,{
   scene:new T.Scene(),quality,
   waveModel:{glsl:'float hunterWaveHeight(vec2 p,float t,float b){return 0.;}',height:()=>0},
   waterTime:{value:0},waterBed:()=>-10
 });
 const land={playerX:0,playerZ:0,enemy:true,terrainAt:()=>2,waterAt:()=>0},
       sea={...land,terrainAt:()=>-10};
 const advance=(fx,type,x,options,steps=8)=>{
   const u={t:type,x,z:0,hd:0,speed:17,yawRate:.14};
   fx.vehicle(u,.1,options);
   for(let i=0;i<steps;i++){u.z-=2;fx.vehicle(u,.1,options)}
   return u;
 };
 for(const [quality,range] of Object.entries(ranges)){
   const fx=make(quality);
   advance(fx,'patrulla_marina',range+12,sea);
   assert.equal(fx.stats.waterTrails,0,'Lluny no hi ha estela naval: '+quality);
   assert.equal(fx.stats.emitted.wake,0,'Lluny no s’emeten partícules: '+quality);
   const marine=advance(fx,'patrulla_marina',range-12,sea,12);
   assert.ok(fx.stats.waterTrails>0,'Patrullera enemiga amb estela: '+quality);
   assert.ok(fx.stats.emitted.wake>0,'Estela d’aigua compartida: '+quality);
   const wakes=fx.stats.emitted.wake;
   marine.speed=90; // No ha de deixar estela si només canvia speed.
   for(let i=0;i<10;i++)fx.vehicle(marine,.1,sea);
   assert.equal(fx.stats.emitted.wake,wakes,'Aturada: sense noves esteles');
   for(const type of ['jeep','tanqueta','tanc']){
     const before=fx.stats.landTrails;
     advance(fx,type,range-16,land,12);
     assert.ok(fx.stats.landTrails>before,'Pols enemiga '+type+': '+quality);
   }
   assert.ok(fx.stats.emitted.smoke>0,'Escapament dels motors terrestres');
   assert.equal(Object.keys(fx.groups).length,4,'No s’afegeixen malles noves');
   fx.dispose();
 }
 const high=make('desktop'),mid=make('mobile'),low=make('ultra');
 advance(high,'jeep',175,land);
 advance(mid,'jeep',175,land);
 advance(low,'jeep',175,land);
 assert.ok(high.stats.landTrails>0,'Distància alta arriba a 175m');
 assert.equal(mid.stats.landTrails,0,'Distància mòbil no arriba a 175m');
 assert.equal(low.stats.landTrails,0,'Distància baixa no arriba a 175m');
 for(const fx of [high,mid,low])fx.dispose();
 // Els efectes pilotables mantenen el radi original.
 const own=make('ultra'),v={t:'cotxe',x:130,z:0,hd:0,v:19};
 const ownContext={...land,enemy:false};
 own.vehicle(v,.1,ownContext);
 for(let i=0;i<8;i++){v.z-=2;own.vehicle(v,.1,ownContext)}
 assert.ok(own.stats.landTrails>0,'Esteles dels vehicles propis inalterades');
 own.dispose();
 console.log('OK esteles: patrullera, jeep, tanqueta, tanc, qualitat i 4 malles');
})().catch(e=>{console.error(e);process.exitCode=1});
