import assert from 'node:assert/strict';
import {resolveCoopPlayerVehicleContact} from '../src/coop-vehicle-contacts-core.mjs';
import {stepRangeVehicle} from '../src/coop-vehicle-motion-core.mjs';
import {createRelayVehicles} from '../server/coop-vehicles.mjs';
import {traceArena,createTraceWallIndex} from '../server/coop-combat.mjs';

const car={id:'car',t:'cotxe',x:0,y:0,z:0,hd:0,v:0,seats:[null,null],life:10};
const actor={id:'a',x:6,y:0,z:0,hd:0,hp:25,fall:null,swimming:false};
const world={
 heightAt:()=>0,groundAt:()=>0,
 resolveBody:(previous,candidate)=>({...candidate,y:previous.y}),
 locomotionAt:()=>({floor:0,terrain:0,interior:false,drop:false}),
 vegetationNear:()=>[]
};
const water={surfaceAt:()=>0};
const meta={id:'native-fixes',mode:'native',bounds:{x0:-100,x1:100,z0:-100,z1:100},vehicles:[car]};
const vehicles=createRelayVehicles({meta,world:()=>world,water,players:()=>[actor],active:()=>true,geometry:()=>({walls:[]})});
const command=(operation,commandId)=>vehicles.command('a',{epoch:meta.id,vehicleId:'car',operation,commandId});
assert.equal(command('enter','enter-first').code,'ENTERED');
assert.equal(command('exit','exit-first').code,'EXITED');
actor.x=4.5;
assert.equal(command('enter','enter-again').code,'ENTERED','vehicle remains enterable after a first exit');
const hull=vehicles.live()[0];
hull.v=8;
const leaving=command('exit','exit-moving');
assert.equal(leaving.code,'EXITED','moving vehicles permit exit in native co-op');
vehicles.step(1);
assert.ok(vehicles.live()[0].v>0,'unoccupied vehicle must retain inertia after exit');

// Regressió: el centre d'un vehicle pot quedar arran d'una paret.
// Les sortides han de validar el punt exterior, no travessar el mur
// des del centre de la caixa.
const wallWorld={...world,resolveBody:(previous,candidate)=>
  previous.x<1&&candidate.x>1?{...previous}:{...candidate}};
const nearWall=createRelayVehicles({
 meta:{...meta,vehicles:[{...car,seats:['a',null]}]},
 world:()=>wallWorld,water,players:()=>[{...actor,x:0,z:0}],
 active:()=>true,geometry:()=>({walls:[]})
});
assert.equal(nearWall.command('a',{epoch:meta.id,vehicleId:'car',
 operation:'exit',commandId:'first-press'}).code,'EXITED',
 'guest exits on the first press even next to a wall');

const resolved=resolveCoopPlayerVehicleContact(
 {id:'pedestrian',x:6,y:0,z:0},{x:0,y:0,z:0,hd:0},[car],'pedestrian');
assert.ok(Math.hypot(resolved.x,resolved.z)>2.5,'pedestrians cannot occupy a vehicle hitbox');
const seated=resolveCoopPlayerVehicleContact(
 {id:'a',x:0,y:0,z:0},{x:0,y:0,z:0,hd:0},[{...car,seats:['a',null]}],'a');
assert.equal(seated.x,0,'vehicle occupants are exempt from their own hitbox');

const docked={...car,x:0,z:0,y:3,v:0,seats:[null,null]};
const pier={...world,heightAt:()=>-2,groundAt:()=>3};
stepRangeVehicle(docked,{forward:0,turn:0,strafe:0},1/30,1,pier,water,meta.bounds);
assert.ok(docked.y>=3,'pier deck keeps the vehicle above submerged terrain');
assert.ok(!docked.waterIngress?.dead,'a vehicle on a pier must not sink');
// Indexar parets no pot alterar fraccions d'impacte ni identificadors de vidre.
const walls=[
 {x0:-2,x1:2,z0:-4.2,z1:-3.8,y0:0,y1:6,open:false},
 {x0:200,x1:202,z0:90,z1:110,y0:0,y1:8,open:false}
];
const ground={heightAt:()=>-20};
const geometry={walls,buildings:[]},index=createTraceWallIndex(walls);
for(const [from,to] of [
 [{x:0,y:2,z:0},{x:0,y:2,z:-8}],
 [{x:20,y:2,z:0},{x:20,y:2,z:-8}],
 [{x:201,y:2,z:120},{x:201,y:2,z:80}],
 [{x:1,y:2,z:-5},{x:1,y:2,z:3}]
]){
 const options={collectWindows:true,ignoreBarbed:true};
 assert.deepEqual(
  traceArena(from,to,geometry,ground,{...options,wallCandidates:index(from,to)}),
  traceArena(from,to,geometry,ground,options),
  'spatial index must preserve exact projectile contact and wall ID');
}
console.log('COOP regressions: vehicle hitboxes, reboarding, moving exits, inertia and pier support passed');

