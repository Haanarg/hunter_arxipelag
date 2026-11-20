import assert from 'node:assert/strict';
import {moveOnFoot,damageHealth,createPlayerSimulation,PLAYER_MAX_HEALTH,waterSupport} from '../src/player-simulation.mjs';
import {PLAYER_STANDING_HEIGHT,PLAYER_CROUCHED_HEIGHT,PLAYER_SWIM_DRAFT,
 playerHitSpheres,playerProjectileContactT,playerBodyHeight} from '../src/player-physical-profile.mjs';
import {pushPalm,pushWalls,pushTree} from '../src/world-physics.mjs';
import {segmentSphereT} from '../src/combat-rules.mjs';
assert.equal(PLAYER_MAX_HEALTH,25);
const clamp=(v,l)=>Math.max(-l,Math.min(l,v));
// Independent copy of the previous runtime equations, across its actual modes.
for(const swimming of [false,true])for(const crouched of [false,true])for(const run of [false,true])for(const forward of [-1,0,.4,1])for(const strafe of [-1,0,.7,1])for(const hd of [-3,0,1.4]){
 const state={x:2,z:-3,hd},dt=1/60,limit=10,length=Math.max(1,Math.hypot(forward,strafe)),ss=(swimming?(run?8.5:5):crouched?4.5:run?19:12)*forward*dt/length,lateral=(swimming?(run?6.5:4.5):crouched?3.8:9)*strafe*dt/length;
 const expected={x:clamp(state.x-Math.sin(hd)*ss+Math.cos(hd)*lateral,limit),z:clamp(state.z-Math.cos(hd)*ss-Math.sin(hd)*lateral,limit),hd};
 assert.deepEqual(moveOnFoot(state,{forward,strafe,run},dt,{limit,swimming,crouched}),expected);
}
for(const damage of [NaN,Infinity,-1,0,.1,1,3.5,100])assert.equal(damageHealth(8.5,damage),Number.isFinite(damage)&&damage>0?Math.max(0,9-Math.ceil(damage)):8.5);
assert.equal(damageHealth(8,5,{immune:true}),8);
const actors=[{id:'a',x:0,z:0,hd:0,hp:PLAYER_MAX_HEALTH},{id:'b',x:0,z:0,hd:Math.PI,hp:PLAYER_MAX_HEALTH}],options={epoch:'epoch:1',actors,limit:100};
const engine=createPlayerSimulation(options),message={protocol:1,epoch:'epoch:1',sequence:1,input:{forward:1,turn:0,strafe:0,run:false}};
assert.equal(engine.accept('outsider',message),false);assert.equal(engine.accept('a',{...message,epoch:'old'}),false);
assert.equal(engine.accept('a',{...message,input:{...message.input,forward:NaN}}),false);
assert.equal(engine.accept('a',{...message,input:{...message.input,x:100}}),false,'positions are not accepted as input');
assert.equal(engine.accept('a',message),true);assert.equal(engine.accept('a',message),false,'sequence replay');assert.equal(engine.accept('b',message),true);
let state=engine.step();assert.equal(state.tick,1);assert.ok(state.players[0].z<0&&state.players[1].z>0);assert.equal(state.players[0].acknowledged,1);
for(let i=0;i<10;i++)engine.step();const stopped=engine.snapshot();engine.step();assert.deepEqual(engine.snapshot().players,stopped.players,'stale input times out');
engine.damage('a',100);engine.accept('a',{...message,sequence:2});const dead=engine.step().players[0];assert.equal(dead.hp,0);engine.step();assert.deepEqual(engine.snapshot().players[0],dead,'dead actor cannot move');
const detached=engine.snapshot();detached.players[0].hp=999;assert.equal(engine.snapshot().players[0].hp,0,'snapshots do not mutate authority');
let fail=false;
const collision=createPlayerSimulation({...options,world:{resolve:(old,candidate)=>old.id==='b'&&fail?{...candidate,x:Infinity}:{...candidate,x:Math.max(0,candidate.x)}}});
collision.accept('a',{...message,input:{forward:0,turn:0,strafe:-1,run:false}});collision.step();assert.equal(collision.snapshot().players[0].x,0,'world adapter constrains movement');
const before=collision.snapshot();fail=true;assert.throws(()=>collision.step());assert.deepEqual(collision.snapshot(),before,'invalid world result cannot commit half a tick');
console.log('player simulation: legacy movement parity, health, two actors, validated inputs, sequence/epoch/identity, timeout, fixed ticks, death, world constraints and atomic tick passed');

const reverse=createPlayerSimulation(options);reverse.accept('a',{...message,input:{...message.input,forward:-1,run:true}});assert.equal(reverse.step().players[0].z,.4,'client cannot sprint backwards');
const blockedRun=createPlayerSimulation({...options,world:{context:()=>({canRun:false})}});blockedRun.accept('a',{...message,input:{...message.input,run:true}});assert.equal(blockedRun.step().players[0].z,-.4,'world decides sprint permission');

const immunePlayers=createPlayerSimulation({...options,immune:()=>true});
assert.equal(immunePlayers.damage('a',10),false,
 'COOP immune prevents authoritative damage on both identities');
assert.equal(immunePlayers.damage('b',15),false);
assert.equal(immunePlayers.snapshot().players[0].hp,PLAYER_MAX_HEALTH);
assert.equal(immunePlayers.snapshot().players[1].hp,PLAYER_MAX_HEALTH);


// Contracte físic V18 pur: SOLO (P) i COOP (actor) usen EXACTAMENT
// les mateixes tres esferes i el mateix punt de suport de natació.
const standing={x:0,y:0,z:0,crouched:false,swimming:false};
const crouched={...standing,crouched:true};
const standingZones=playerHitSpheres(standing);
const crouchedZones=playerHitSpheres(crouched);
assert.equal(standingZones.length,3);
assert.equal(crouchedZones.length,3);
assert.equal(PLAYER_STANDING_HEIGHT,3.11232);
assert.equal(PLAYER_CROUCHED_HEIGHT,PLAYER_STANDING_HEIGHT-.30);
assert(standingZones.every((p,i)=>p.radius===crouchedZones[i].radius),
 'Ajupir-se no canvia la mida del cap o del tors: baixa el centre');
assert(Math.abs(standingZones[2].y+standingZones[2].radius-PLAYER_STANDING_HEIGHT)<1e-10);
assert(Math.abs(crouchedZones[2].y+crouchedZones[2].radius-PLAYER_CROUCHED_HEIGHT)<1e-10);
const horizontalShot=y=>[{x:-5,y,z:0},{x:5,y,z:0}];
const headshotY=PLAYER_STANDING_HEIGHT-.08;
const [headFrom,headTo]=horizontalShot(headshotY);
assert(playerProjectileContactT(headFrom,headTo,standing,segmentSphereT)!==null,
 'De peu: el tret arriba al cap V18');
assert.equal(playerProjectileContactT(headFrom,headTo,crouched,segmentSphereT),null,
 'Ajupit: el cap ja no ocupa l\'alçada de peu; també en COOP');
const [duckFrom,duckTo]=horizontalShot(PLAYER_CROUCHED_HEIGHT-.12);
assert(playerProjectileContactT(duckFrom,duckTo,crouched,segmentSphereT)!==null,
 'Ajupit: el cap real encara rep trets');
const [legFrom,legTo]=horizontalShot(.8);
assert(playerProjectileContactT(legFrom,legTo,crouched,segmentSphereT)!==null,
 'Les cames ajupides continuen dins la hitbox');
const behind={...standing,x:4,z:4};
assert.equal(playerProjectileContactT(headFrom,headTo,behind,segmentSphereT),null,
 'No hi ha dany fora de les tres esferes');

// Ajupit sí passa per sota una llinda entre les alçades real de peu i ajupida.
const lowWall={x0:-.2,x1:.2,z0:-.2,z1:.2,
 y0:(PLAYER_CROUCHED_HEIGHT+PLAYER_STANDING_HEIGHT)/2,
 y1:PLAYER_STANDING_HEIGHT+.4};
const upright={x:.10,y:0,z:.10,hd:0};
const ducking={...upright};
pushWalls(upright,[lowWall],.6,{crouched:false});
pushWalls(ducking,[lowWall],.6,{crouched:true});
assert.notDeepEqual(upright,ducking);
assert.deepEqual(ducking,{x:.10,y:0,z:.10,hd:0});
const raisedRock={x:0,z:0,r:.5,rock:true,p:false,
 bottomY:lowWall.y0,topY:lowWall.y1};
const standRock={x:.12,y:0,z:0,hd:0},duckRock={...standRock};
pushTree(standRock,raisedRock,false,.5,{crouched:false});
pushTree(duckRock,raisedRock,false,.5,{crouched:true});
assert(standRock.x>duckRock.x+.4&&duckRock.x===.12,
 'Les roques altes deixen passar el jugador que s\'ajup');
// La palmera alta per damunt del cos ajupit també no pot empènyer-lo.
const palm={x:0,z:0,y:lowWall.y0,r:.30,s:1,yaw:0,p:true};
const duckPalm={x:.1,z:0,y:0,hd:0};
pushPalm(duckPalm,palm,.5,{crouched:true});
assert.equal(duckPalm.x,.1);

// El suport de B3/C4/quiet es deriva de la mateixa talla V18 i no de
// l'esquelet ocult 2/3. Canviar la superfície no canvia la profunditat.
for(const surface of [-1,0,2,5]){
 const deep=waterSupport({floor:surface-7,surface});
 assert.equal(deep.swimming,true);
 assert(Math.abs(deep.y-(surface-PLAYER_SWIM_DRAFT))<1e-10);
 const shallow=waterSupport({floor:surface-PLAYER_SWIM_DRAFT+.05,surface});
 assert.equal(shallow.swimming,false);
 const indoors=waterSupport({floor:surface-7,surface,interior:true});
 assert.equal(indoors.swimming,false);
 const basement=waterSupport({floor:surface-7,surface,basement:true});
 assert.equal(basement.swimming,false);
 const blocked=waterSupport({floor:surface-7,surface,flight:true});
 assert.equal(blocked.swimming,false);
 const immersed={x:0,y:deep.y,z:0,swimming:true};
 const [from,to]=horizontalShot(surface+.10);
 assert(playerProjectileContactT(from,to,immersed,segmentSphereT)!==null,
  'Natació: un tret pot interceptar el cap sobre l\'aigua');
 const [aboveFrom,aboveTo]=horizontalShot(surface+1.2);
 assert.equal(playerProjectileContactT(aboveFrom,aboveTo,immersed,segmentSphereT),null,
  'Natació: no existeix una hitbox de peu flotant sobre la superfície');
}
assert(playerBodyHeight({crouched:true})<playerBodyHeight({}));
assert(playerBodyHeight({swimming:true})<PLAYER_STANDING_HEIGHT);
console.log('PASS V18 physical profile: standing/crouched swimmer hitboxes, cover, palms, rocks and buoyancy SOLO/COOP');


// La simulació COOP remet la mateixa postura autoritativa a l'adaptador
// físic del món, també quan l'input no es rep en tots els ticks.
const seenCoopPoses=[];
const coopPhysicalWorld={
 locomotionAt:()=>({floor:0,terrain:0,interior:false,basement:false,drop:false}),
 resolveBody:(previous,candidate)=>{
  seenCoopPoses.push({id:previous.id,crouched:previous.crouched,
   swimming:previous.swimming});
  return candidate;
 },
 roofLanding:()=>null
};
const crouchSim=createPlayerSimulation({
 epoch:'v18-hitbox-coop',actors:[
  {id:'p1',x:0,y:.06,z:0,hd:0,hp:PLAYER_MAX_HEALTH},
  {id:'p2',x:4,y:.06,z:4,hd:0,hp:PLAYER_MAX_HEALTH}
 ],limit:100,world:coopPhysicalWorld,vertical:{surfaceAt:()=>-100}
});
const poseInput={forward:0,turn:0,strafe:0,run:false,crouch:true};
assert(crouchSim.accept('p1',{protocol:1,epoch:'v18-hitbox-coop',
 sequence:1,input:poseInput}));
crouchSim.step();
assert(seenCoopPoses.some(p=>p.id==='p1'&&p.crouched&&!p.swimming),
 'Worker COOP aplica al món físic l\'ajupiment rebut del jugador');
const savedCrouch=crouchSim.snapshot().players[0];
assert.equal(savedCrouch.crouched,true);
crouchSim.step();
assert(seenCoopPoses.at(-2)?.crouched,
 'Worker COOP manté la postura física entre ticks sense nou input');
assert(crouchSim.accept('p1',{protocol:1,epoch:'v18-hitbox-coop',
 sequence:2,input:{...poseInput,crouch:false}}));
crouchSim.step();
assert.equal(crouchSim.snapshot().players[0].crouched,false);
assert(seenCoopPoses.at(-2)?.crouched===false,
 'Worker COOP restaura la hitbox de peu després d\'aixecar-se');

const seenSwimmers=[];
const swimmingWorld={
 locomotionAt:()=>({floor:-7,terrain:-7,interior:false,basement:false,drop:false}),
 resolveBody:(previous,candidate)=>{
  seenSwimmers.push({crouched:previous.crouched,swimming:previous.swimming});
  return candidate;
 },roofLanding:()=>null
};
const seaSim=createPlayerSimulation({epoch:'v18-swim-coop',actors:[
 {id:'p1',x:0,y:-PLAYER_SWIM_DRAFT,z:0,hd:0,hp:25,crouched:true},
 {id:'p2',x:3,y:-PLAYER_SWIM_DRAFT,z:3,hd:0,hp:25}
],limit:100,world:swimmingWorld,vertical:{surfaceAt:()=>0}});
assert(seaSim.snapshot().players.every(p=>p.swimming));
assert.equal(seaSim.snapshot().players[0].crouched,false,
 'El nedador no conserva la postura ajupida d\'una partida carregada');
seaSim.step();
assert(seenSwimmers.every(p=>p.swimming&&!p.crouched),
 'El COOP només presenta el perfil físic horitzontal dins l\'aigua');
assert(Math.abs(seaSim.snapshot().players[0].y+PLAYER_SWIM_DRAFT)<1e-8);
console.log('PASS COOP authoritative crouch and swimming pose is shared with world collision adapter');
