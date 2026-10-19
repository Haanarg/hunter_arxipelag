'use strict';
const assert=require('node:assert/strict');

(async()=>{
 const game=await require('./harness.cjs')();
 game.start('2026');game.frame();
 const geometry=game.run(`(()=>{
   const f=V.find(v=>v.t==='ferry'),boxes=f.o.children.filter(o=>o.geometry?.type==='BoxGeometry')
     .map(o=>o.geometry.parameters),ramps=boxes.filter(b=>b.width===13.6&&b.depth===6.2);
   return{hull:boxes.some(b=>b.width===32&&b.depth===55),rampCount:ramps.length,
     size:[FERRY_DECK.halfW,FERRY_DECK.halfL,FERRY_DECK.rampHalfW],
     cabins:boxes.some(b=>b.width===3.35&&b.depth===7.6)};
 })()`);
 assert(geometry.hull,'el buc ha de duplicar amplada i llargada');
 assert.equal(geometry.rampCount,2,'les dues rampes originals han de mantenir les mides');
 assert(geometry.cabins,'la cabina ha de conservar la seva geometria');
 assert(geometry.size[0]>13&&geometry.size[1]>25&&geometry.size[2]===6.7);

 const ferry=game.run(`(()=>{
   const f=V.find(v=>v.t==='ferry'),car=V.find(v=>v.t==='cotxe'),old={x:car.x,z:car.z,hd:car.hd},
     oldP={...P},oldCv=cv,oldFall=playerFall,oldEject=playerEject;
   const result={};
   try{
     car.x=f.x;car.z=f.z;car.hd=f.hd;attachToFerry(car,f);
     cv=car;playerFall=null;playerEject=null;toggle();
     result.disembarked=cv===null;
     const deck=pedestrianFerry(P.x,P.z,P.y);
     result.onDeck=deck?.f===f&&Math.abs(P.y-deck.y)<.5&&
       ferryWalkable(deck.q.x,deck.q.z,1)&&!ferryCabinContains(deck.q.x,deck.q.z,.62);
     const c=FERRY_DECK.cabin,p=ferryWorld(f,c.x,c.z);
     result.cabinCarSolid=ferryCabinVehicleHit(f,vehicleBox(car,p.x,p.z,f.hd));
     P.x=p.x;P.z=p.z;P.y=ferryLocalSurfaceY(f,c.z)+.12;
     ferryCabinPushPlayer();const q=ferryLocal(f,P.x,P.z);
     result.cabinPlayerSolid=!ferryCabinContains(q.x,q.z,.62);
     const end=FERRY_DECK.halfL+FERRY_DECK.ramp/2,side=ferryWorld(f,FERRY_DECK.rampHalfW+3,end),middle=ferryWorld(f,0,end);
     car.hd=f.hd;
     result.narrowRamp=ferryForVehicle(car,side.x,side.z,true)!==f&&ferryForVehicle(car,middle.x,middle.z,true)===f;
     cv=f;toggle();const onDeck=pedestrianFerry(P.x,P.z,P.y);
     result.ferryPilotExit=cv===null&&onDeck?.f===f;
   }finally{
     cv=oldCv;playerFall=oldFall;playerEject=oldEject;
     Object.assign(P,oldP);Object.assign(car,old);detachFromFerry(car);
   }
   return result
 })()`);
 for(const [key,ok]of Object.entries(ferry))assert(ok,`ferry: ${key}`);
 // La posició de la terminal ha de correspondre al ferri ampliat, no al
 // buc anterior: el cap de la rampa de popa queda a la zona del moll.
 const {newWorldLayouts}=await import('../src/compound-phase4-layouts.mjs');
 const terminalLayout=newWorldLayouts.find(l=>l.id==='ferry-terminal');
 const ferryLocalZ=terminalLayout.vehicles.find(v=>v.t==='ferry').z;
 const sternTip=ferryLocalZ-(game.context.HUNTER_VEHICLES.decks.ferry.halfL+
   game.context.HUNTER_VEHICLES.decks.ferry.ramp);
 assert(Math.abs(sternTip-30)<2,'La rampa del ferri s’ha d’alinear amb el carril de càrrega a z=30');
 const actualTerminal=game.run(`(()=>{
   const c=world.userData.compounds.find(c=>c.layoutId==='ferry-terminal'&&c.loadingRamp);
   if(!c)return null;
   const s=terminalRampState(c.loadingRamp);
   return s&&{length:s.length,difference:Math.abs(s.startY-s.endY),hasFerry:!!c.ferry};
 })()`);
 if(actualTerminal){
   assert(actualTerminal.hasFerry,'La rampa terminal ha de tenir un ferri amarrat');
   assert(actualTerminal.length>=4&&actualTerminal.length<=12,
     'La passarel·la d’accés no ha de començar sota el buc ni quedar desconnectada');
   assert(actualTerminal.difference<1,'La passarel·la s’ha d’unir sense un salt vertical');
 }

 const boarding=game.run(`(()=>{
   const f=V.find(v=>v.t==='ferry'),d=FERRY_DECK,results=[];
   for(const type of ['cotxe','camio','tanqueta']){
     const sc=VS[type],hb=VHB[type],halfLength=hb[1]*sc*.5;
     const localZ=d.halfL+d.ramp+halfLength+.4,point=ferryWorld(f,0,localZ);
     const v={t:type,x:point.x,z:point.z,hd:f.hd};
     // Un vehicle s'ha de poder enganxar a la rampa abans d'entrar al buc:
     // abans de la correcció hi quedava bloquejat per la col·lisió.
     const enters=ferryForVehicle(v)===f;
     const lateral=ferryWorld(f,d.rampHalfW+hb[0]*sc*.5+.9,localZ);
     const misses=ferryForVehicle(v,lateral.x,lateral.z)!==f;
     const deck=ferryWorld(f,0,0);
     const centered=ferryForVehicle(v,deck.x,deck.z,false)===f;
     results.push({type,enters,misses,centered});
   }
   return results
 })()`);
 for(const check of boarding)for(const [name,ok]of Object.entries(check))
   if(name!=='type')assert(ok,`ferri ${check.type}: ${name}`);


 game.run(`{
   const f=V.find(v=>v.t==='ferry'),p=ferryWorld(f,0,-8);
   P.x=p.x;P.z=p.z;P.y=ferryLocalSurfaceY(f,-8)+.12;cv=null;f.v=8;
   globalThis.testFerryBefore={x:f.x,z:f.z,local:ferryLocal(f,P.x,P.z)};
 }`);
 game.frame(100);
 const walking=game.run(`(()=>{
   const f=V.find(v=>v.t==='ferry'),q=ferryLocal(f,P.x,P.z);
   return {moved:Math.hypot(f.x-testFerryBefore.x,f.z-testFerryBefore.z)>.01,
     carried:Math.hypot(q.x-testFerryBefore.local.x,q.z-testFerryBefore.local.z)<.25,
     stillOnDeck:pedestrianFerry(P.x,P.z,P.y)?.f===f}
 })()`);
 assert(walking.moved,'el ferry es desplaça amb el jugador a bord');
 assert(walking.carried,'el jugador a peu ha de seguir el ferry en moviment');
 assert(walking.stillOnDeck,'el jugador continua sobre la coberta');

 const patrols=game.run(`(()=>{
   const biggest=islands.filter(i=>i.r>=800),cars=E.filter(e=>e.t==='jeep'&&e.interCompoundPatrol);
   return {biggest:biggest.length,count:cars.length,
     details:cars.map(u=>({sameIsland:biggest.some(i=>islands.indexOf(i)===u.patrolIslandIndex),
       distinctComplexes:u.patrolComplexes.length===2&&u.patrolEnds.length===2&&
         Math.hypot(u.patrolEnds[0].x-u.patrolEnds[1].x,u.patrolEnds[0].z-u.patrolEnds[1].z)>60,
       overLand:u.patrol.every(p=>hAt(p.x,p.z)>.1),
       roundTrip:u.patrol.length>=4&&Math.hypot(u.patrol[0].x-u.patrol.at(-1).x,u.patrol[0].z-u.patrol.at(-1).z)<30}))}
 })()`);
 assert(patrols.biggest>=2,'la llavor ha de tenir illes grans');
 assert(patrols.count>=2,`calen patrulles terrestres en diverses illes grans (n'hi ha ${patrols.count})`);
 for(const u of patrols.details)for(const [key,ok]of Object.entries(u))assert(ok,`patrulla terrestre: ${key}`);
 console.log('OK: ferry x2, rampes intactes, cabina sòlida, desembarcament sobre coberta i cotxes patrullant entre complexos');
})().catch(e=>{console.error(e);process.exitCode=1});
