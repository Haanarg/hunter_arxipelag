import assert from 'node:assert/strict';
import {createNativeCoopInterpolation} from '../src/native-coop-interpolation.mjs';

const player=(id,x,z=0,hd=0,hp=25)=>({id,x,y:1,z,hd,hp,swimming:false});
const vehicle=(id,x,z=0,hd=0,alt=undefined,seats=[null,null])=>({
 id,x,y:1,z,hd,...(alt===undefined?{}:{alt}),seats,destroyed:false,t:'cotxe',v:0
});
const state=(tick,actors,vehicles,status='running',missionId='same')=>({
 tick,status,missionId,players:actors,vehicles
});
const approx=(actual,expected,label)=>assert(Math.abs(actual-expected)<1e-6,
 label+': expected '+expected+' got '+actual);
const smoother=createNativeCoopInterpolation();
const send=(tick,remoteX,vehicleX,remoteHeading=0,vehicleHeading=0,options={})=>{
 const remote=player('b',remoteX,0,remoteHeading,options.health??25);
 const v=vehicle('car',vehicleX,0,vehicleHeading,options.alt,options.seats||[null,null]);
 const a=player('a',0);
 smoother.receive(state(tick,[a,remote],[v],options.status||'running',options.mission||'same'),'a');
};
send(0,0,0,Math.PI*179/180,Math.PI*179/180);
assert.equal(smoother.actor('b',1),null,'Primer snapshot: no hi ha trajectòria anterior');
send(3,9,6,-Math.PI*179/180,-Math.PI*179/180,{alt:2});
approx(smoother.advance(.05),.5,'Cursor a mig interval de 100 ms');
approx(smoother.actor('b',.5).x,4.5,'Posició del company al mig');
approx(smoother.movingVehicles(.5)[0].pose.x,3,'Posició del vehicle remot al mig');
assert.equal(smoother.movingVehicles(.5).length,1,'Només un vehicle ha canviat');
assert(Math.abs(Math.abs(smoother.actor('b',.5).hd)-Math.PI)<.03,'Rumb pel camí angular curt');
approx(smoother.movingVehicles(.5)[0].pose.alt,2,'Altitud nova sense valor antic');
const sameTickState=state(3,[player('a',0),player('b',9,0,-Math.PI*179/180)],
 [vehicle('car',6,0,-Math.PI*179/180,2)],'running','same');
sameTickState.inventories=[{actorId:'a',weapon:'pistol'}];
smoother.receive(sameTickState,'a');
approx(smoother.advance(0),.5,'Una acció dins del mateix tick conserva el cursor visual');
approx(smoother.actor('b',.5).x,4.5,'No reinicia el company amb un snapshot del mateix tick');
approx(smoother.advance(.05),1,'Arribada al snapshot més recent');
approx(smoother.actor('b',1).x,9,'Arribada al final');
smoother.advance(.5);
approx(smoother.actor('b',1).x,9,'Mai extrapola posicions sense autoritat');

// Trànsit de xarxa irregular: el cursor no retrocedeix i el buffer és acotat.
send(6,18,12);
assert(smoother.advance(.02)>0,'Continua interpolant el següent interval');
const mid=smoother.actor('b',.2);
assert(mid.x>=9&&mid.x<=18,'El cursor no fa retrocedir el company');
smoother.advance(.5);
approx(smoother.movingVehicles(1)[0].pose.x,12,'La presentació no extrapola vehicles');

// Canvis discontinus o perillosos: no interpolar entre dos llocs separats.
send(9,600,600);
assert.equal(smoother.actor('b',.5),null,'Teletransport del company: canvi immediat');
assert.equal(smoother.movingVehicles(.5).length,0,'Teletransport del vehicle: canvi immediat');
assert(smoother.stats.teleports>=2,'Registra la discontinuïtat');
send(12,602,602,0,0,{seats:['b',null]});
assert.equal(smoother.actor('b',.5),null,'Entrar al vehicle no interpola el personatge');
send(15,604,604,0,0,{seats:[null,null]});
assert.equal(smoother.actor('b',.5),null,'Sortir del vehicle no interpola el personatge');
send(18,605,605,0,0,{health:0});
assert.equal(smoother.actor('b',.5),null,'Mort del company: efecte immediat');
send(21,606,606);
assert.equal(smoother.actor('b',.5),null,'Reanimació del company: efecte immediat');
send(24,607,607,0,0,{status:'paused'});
assert.equal(smoother.movingVehicles(.5).length,0,'La pausa neteja la interpolació');
send(27,608,608);
assert.equal(smoother.actor('b',.5),null,'La represa no barreja estats de pausa');
send(75,900,900);
assert.equal(smoother.movingVehicles(.5).length,0,'Salt de xarxa llarg: sense extrapolacions');
send(78,902,902,0,0,{mission:'new'});
assert.equal(smoother.actor('b',.5),null,'Una altra missió reinicia les trajectòries');

// Flota de càrrega: només es processen vehicles amb pose diferent.
const stress=createNativeCoopInterpolation(),fleet=Array.from({length:374},(_,i)=>vehicle('v'+i,i*3));
stress.receive(state(0,[player('a',0),player('b',0)],fleet),'a');
const next=fleet.map((v,i)=>i%20===0?{...v,x:v.x+5}:v);
stress.receive(state(3,[player('a',0),player('b',2)],next),'a');
assert.equal(stress.stats.activeVehicles,19,'374 vehicles, només 19 trajectòries actives');
assert.equal(stress.movingVehicles(.5).length,19);
approx(stress.movingVehicles(.5)[0].pose.x,2.5,'Primera trajectòria');
assert.equal(stress.actor('a',.5),null,'Mai interpolem el jugador propi');

console.log('native coop interpolation: tick interpolation, rotation, no extrapolation, teleport, seating, death, pause, restart and 374-vehicle load passed');
