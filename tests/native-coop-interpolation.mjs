import assert from 'node:assert/strict';
import {createNativeCoopInterpolation} from '../src/native-coop-interpolation.mjs';

const p=(id,x,z=0,hd=0,hp=25)=>({id,x,y:1,z,hd,hp});
const v=(id,x,z=0,hd=0,alt=undefined,seats=[null,null])=>({
 id,x,y:1,z,hd,...(alt===undefined?{}:{alt}),seats,destroyed:false,t:'cotxe',v:0
});
const make=(tick,b=0,vehicle=0,options={})=>({
 missionId:options.mission||'mission',tick,status:options.status||'running',
 players:[p('a',0),p('b',b,0,options.playerHeading||0,options.hp??25)],
 vehicles:[v('car',vehicle,0,options.heading||0,options.alt,options.seats||[null,null])]
});
const close=(x,y,label,epsilon=.08)=>assert(Math.abs(x-y)<=epsilon,
 label+': '+x+' vs '+y);
const stream=createNativeCoopInterpolation();
stream.receive(make(0), 'a');
assert.equal(stream.actor('b'),null,'Al primer estat no s’inventa cap desplaçament');
stream.receive(make(3,.9,4,{heading:Math.PI*179/180,alt:2}), 'a');
let previous=stream.actor('b').x;
for(let i=0;i<6;i++){
 stream.advance(1/60);
 const current=stream.actor('b').x;
 assert(current>previous,'Company avança cada fotograma del primer interval: '+i);
 previous=current;
}
const at100ms=stream.actor('b').x;
assert(at100ms>.5&&at100ms<1.7,'Suavització durant els 100 ms del snapshot');
const renderedCar=stream.movingVehicles()[0].pose.x;
assert(renderedCar>2&&renderedCar<7,'El cotxe també avança entre snapshots');

// Fins a 346 ms entre dos paquets: abans el company s'aturava
// exactament als 100 ms i després feia un salt. Ara avança una mica
// sense dades, amb un màxim de 120 ms de previsió visual.
stream.advance(.09);
const afterGap=stream.actor('b').x;
assert(afterGap>at100ms,'El company no es congela en superar 100 ms');
for(let i=0;i<4;i++)stream.advance(.09);
assert(stream.stats.clampedFrames>0,'La previsió queda limitada durant un tall llarg');
const beforeReceipt=stream.actor('b').x;
stream.receive(make(12,3.6,16), 'a');
close(stream.actor('b').x,beforeReceipt,
 'Rebre un estat tardà no reubica sobtadament el model',1e-9);
const beforeVehicleReceipt=stream.movingVehicles()[0].pose.x;
stream.receive({...make(12,3.6,16),inventories:[{actorId:'a',bullets:3}]},'a');
close(stream.movingVehicles()[0].pose.x,beforeVehicleReceipt,
 'Una acció dins del mateix tick no reinicia la trajectòria',1e-9);
stream.advance(1/60);
assert(stream.actor('b').x>beforeReceipt,'La correcció tardana s’absorbeix progressivament');

// El gir prop de +/- PI ha de seguir el camí curt sense gir complet.
const turns=createNativeCoopInterpolation();
turns.receive(make(0,0,0,{heading:Math.PI*179/180,playerHeading:Math.PI*179/180}),'a');
turns.receive(make(3,.5,2,{heading:-Math.PI*179/180,playerHeading:-Math.PI*179/180}),'a');
turns.advance(.05);
const angle=turns.actor('b').hd;
assert(Math.abs(Math.abs(angle)-Math.PI)<.07,'Gir del company pel camí curt');
assert(Math.abs(Math.abs(turns.movingVehicles()[0].pose.hd)-Math.PI)<.07,
 'Gir del vehicle pel camí curt');

// Condicions sense interpolació: teletransport, mort, reanimació,
// entrada/sortida de vehicle, pausa i canvi de missió.
const transitions=createNativeCoopInterpolation();
transitions.receive(make(0,0,0),'a');
transitions.receive(make(3,.6,2),'a');
transitions.advance(.05);
transitions.receive(make(6,1000,500),'a');
assert.equal(transitions.actor('b'),null,'Teletransport: ubicació immediata');
assert.equal(transitions.movingVehicles().length,0,'Cotxe teleportat: ubicació immediata');
assert(transitions.stats.teleports>=2);
transitions.receive(make(9,1002,502,{seats:['b',null]}),'a');
assert.equal(transitions.actor('b'),null,'Entrada a vehicle: res de travessar parets');
transitions.receive(make(12,1003,503),'a');
assert.equal(transitions.actor('b'),null,'Sortida de vehicle: posició immediata');
transitions.receive(make(15,1004,504,{hp:0}),'a');
assert.equal(transitions.actor('b'),null,'Mort sense interpolació');
transitions.receive(make(18,1005,505),'a');
assert.equal(transitions.actor('b'),null,'Reanimació sense interpolació');
transitions.receive(make(21,1006,506,{status:'paused'}),'a');
assert.equal(transitions.movingVehicles().length,0,'Pausa: no hi ha extrapolació');
transitions.receive(make(24,1007,507),'a');
assert.equal(transitions.actor('b'),null,'Represa amb buffer net');
transitions.receive(make(27,1008,508,{mission:'another'}),'a');
assert.equal(transitions.actor('b'),null,'Nova missió amb buffer net');

// Tots dos modes comparteixen el món, però només es calculen trajectòries
// pels vehicles realment actualitzats (19/374 en aquest cas).
const fleet=Array.from({length:374},(_,i)=>v('v'+i,i*3));
const stress=createNativeCoopInterpolation();
stress.receive({missionId:'m',tick:0,status:'running',
 players:[p('a',0),p('b',0)],vehicles:fleet},'a');
stress.receive({missionId:'m',tick:3,status:'running',
 players:[p('a',0),p('b',.6)],
 vehicles:fleet.map((row,i)=>i%20===0?{...row,x:row.x+5}:row)},'a');
assert.equal(stress.stats.activeVehicles,19,'19 de 374 vehicles necessiten interpolació');
const firstVehicleList=stress.movingVehicles();
stress.advance(.016);
assert.strictEqual(stress.movingVehicles(),firstVehicleList,
 'No es creen llistes de trajectòries a cada fotograma');
assert.equal(stress.actor('a'),null,'El jugador local mai no és interpolat');
// Quan el servidor confirma que el company i el vehicle estan aturats,
 // desapareixen les trajectòries després de completar la correcció:
 // sense feina per fotograma per als objectes immòbils.
const idle=createNativeCoopInterpolation();
idle.receive(make(0),'a');
idle.receive(make(3,.6,2),'a');
idle.advance(.08);
idle.receive(make(6,.6,2),'a');
for(let i=0;i<40;i++)idle.advance(1/60);
assert.equal(idle.stats.activeVehicles,0,'Vehicle aturat: sense trajectòria persistent');
assert.equal(idle.stats.activePlayers,0,'Company aturat: sense trajectòria persistent');
console.log('native coop interpolation: jitter 346ms, continuous visual pose, capped forecast, transitions, rotation and 374 vehicles passed');
