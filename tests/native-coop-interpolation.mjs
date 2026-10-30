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
// La taxa d'extrapolació ha de comptar NOMÉS el cursor fora de la finestra
// autoritativa, no cada frame que té una trajectòria activa.
const buffered=createNativeCoopInterpolation();
buffered.receive(make(0),'a');
buffered.receive(make(3,.9,4),'a');
buffered.advance(1/60);
assert.equal(buffered.stats.forecastFrames,0,
 'Interpolar entre dos ticks no és predir el futur');
assert.equal(buffered.stats.extrapolatedFrames,0);
assert(buffered.stats.interpolatedFrames>0,
 'La finestra de ticks s’utilitza per interpolar');
assert.equal(buffered.stats.bufferDelayMs,150,'Retard inicial de 150 ms');
buffered.advance(.08);
buffered.receive(make(6,1.8,8),'a');
assert(buffered.stats.bufferDelayMs>150&&buffered.stats.bufferDelayMs<=200,
 'Jitter d’arribada fa adaptar el buffer dins 150–200 ms');
buffered.advance(.095);buffered.advance(.095);
buffered.receive(make(12,3.6,16),'a');
assert.equal(buffered.stats.gapResets,0,'190 ms de separació no reinicien el buffer');

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
assert(stream.stats.bufferUnderruns>0,'Els talls reals de buffer es registren');
assert.equal(stream.stats.extrapolatedFrames,stream.stats.forecastFrames,
 'Cap frame interpolat no es classifica com a previsió');
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

// Quan el servidor no pot fer cap enviament durant 774 ms,
// passen 23 ticks. Abans aquest interval reiniciava TOTS els remots.
const delayed=createNativeCoopInterpolation();
const fast=(tick,x)=>({
 ...make(tick,x/10,x),
 vehicles:[{...v('air',x),t:'heli_combat',v:60}]
});
delayed.receive(fast(0,0),'a');
delayed.receive(fast(3,10),'a');
delayed.advance(.10);
const airBefore=delayed.movingVehicles()[0].pose.x;
const playerBefore=delayed.actor('b').x;
delayed.receive(fast(26,55),'a');
assert.equal(delayed.stats.maxTickGap,23,'Es registra el tall de 23 ticks');
assert.equal(delayed.stats.longGapReceives,1,'Tall > 400 ms registrat, sense reiniciar');
assert.equal(delayed.stats.gapResets,0,'Un tall de 774 ms no es confon amb reconnexió');
assert.equal(delayed.stats.activeVehicles,1,'L’helicòpter ràpid no es tracta com a teletransport');
assert.equal(delayed.stats.activePlayers,1,'El company conserva la interpolació');
close(delayed.movingVehicles()[0].pose.x,airBefore,
 'La recepció tardana conserva la darrera pose visible de l’helicòpter',1e-9);
close(delayed.actor('b').x,playerBefore,
 'La recepció tardana conserva la darrera pose visible del company',1e-9);
delayed.advance(1/60);
assert(delayed.movingVehicles()[0].pose.x>airBefore,
 'L’helicòpter recupera el moviment suaument');
assert(delayed.movingVehicles()[0].pose.x-airBefore<2.1,
 'La recuperació de 774 ms no aplica un salt visual en un frame a 60 FPS');
assert(delayed.stats.speedLimitedFrames>0,
 'La recuperació de l’helicòpter ha de registrar la limitació de velocitat visual');
assert(delayed.stats.maxRenderErrorM>0,
 'Es mesura l’error de la pose visual respecte del destí temporal');
delayed.receive(fast(120,100),'a');
assert.equal(delayed.stats.gapResets,1,'Una desconnexió de més de dos segons sí reinicia el buffer');
assert.equal(delayed.movingVehicles().length,0,'No es prediuen trajectòries a partir de dades molt antigues');

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

// Un paquet fora d'ordre no pot esborrar el buffer ni fer tornar enrere
// les poses. La revisió de la sala es valida a la capa de transport.
const reorderedPackets=createNativeCoopInterpolation();
reorderedPackets.receive(make(0),'a');
reorderedPackets.receive(make(3,.6,2),'a');
reorderedPackets.advance(.05);
const beforeStale=reorderedPackets.actor('b').x;
const oldReceives=reorderedPackets.stats.receives;
reorderedPackets.receive(make(2,.2,1),'a');
assert.equal(reorderedPackets.stats.staleReceives,1,
 'Es comptabilitza un snapshot antic rebut a la mateixa missió');
assert.equal(reorderedPackets.stats.receives,oldReceives,
 'El snapshot antic no es publica com a estat nou');
close(reorderedPackets.actor('b').x,beforeStale,
 'El paquet fora d’ordre no desplaça el company',1e-9);
reorderedPackets.receive(make(6,1.2,4),'a');
assert.equal(reorderedPackets.stats.activePlayers,1,
 'La trajectòria continua després del paquet antic');

// Passar de conductor a passatger al MATEIX vehicle també canvia
// l'ancoratge visual del personatge i no s'ha d'interpolar a peu.
const seatChange=createNativeCoopInterpolation();
seatChange.receive(make(0,0,0,{seats:['b',null]}),'a');
seatChange.receive(make(3,.5,2,{seats:['b',null]}),'a');
seatChange.advance(.05);
assert(seatChange.actor('b'),'El pilot remot té trajectòria abans del canvi');
seatChange.receive(make(6,1,4,{seats:[null,'b']}),'a');
assert.equal(seatChange.actor('b'),null,
 'El canvi de seient dins del vehicle es presenta immediatament');

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
console.log('native coop interpolation: adaptive 150-200ms buffer, true forecast counters, jitter 190/346/774ms, bounded recovery, transitions and 374 vehicles passed');
