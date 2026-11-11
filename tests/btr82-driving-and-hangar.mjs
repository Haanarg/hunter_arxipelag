// Regressió: BTR-82 de rodes, velocitat de requisa, i un sol mur al fons d'hangar.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {vehicleDynamics,advanceVehicle} from '../src/vehicle-dynamics-core.mjs';
import {governedRequisitionInput,REQUISITION} from '../src/enemy-vehicle-requisition.mjs';
import {enemyCarArcStep} from '../src/enemy-car-steering.mjs';
import {planBuildingShell} from '../src/building-shell.mjs';

assert.equal(vehicleDynamics.types.tanqueta.maxF,24,'El jugador conserva la velocitat màxima');
assert.equal(REQUISITION.tankettePursuitSpeed,14);
assert.equal(REQUISITION.tanketteCornerSpeed,10);
const makeVehicle=t=>({t,v:0,hd:0,yawRate:0,sideV:0,strafeV:0});
const stationary=makeVehicle('tanqueta');
for(let i=0;i<50;i++)advanceVehicle(stationary,0,1,.05);
assert.equal(stationary.hd,0,'La tanqueta amb rodes no pot girar estacionària');
assert.equal(stationary.yawRate,0,'No pot retenir guinyada a velocitat nul·la');
const tank=makeVehicle('tanc');
for(let i=0;i<50;i++)advanceVehicle(tank,0,1,.05);
assert(tank.hd>.1,'El tanc amb erugues conserva el gir estacionari');

const player=makeVehicle('tanqueta'),enemy=makeVehicle('tanqueta');
let peak=0;
for(let i=0;i<300;i++){
 advanceVehicle(player,1,0,.05);
 const input=governedRequisitionInput(enemy,{forward:1,turn:0});
 assert(input.forward<=1&&input.forward>=-1);
 advanceVehicle(enemy,input.forward,input.turn,.05);
 peak=Math.max(peak,enemy.v);
}
assert(player.v>enemy.v+5,'El pilot jugador ha de poder superar la tanqueta requisada');
assert(player.v<=24+.001,'El jugador tampoc ha de superar el topall normal');
assert(peak<14.6,'La tanqueta enemiga no pot disparar-se per damunt de 14');
assert(Math.abs(enemy.v-14)<.7,'L’enemic ha de convergir a velocitat moderada');
const turnInput=governedRequisitionInput(enemy,{forward:1,turn:1});
assert.equal(turnInput.vehicleSpeedLimit,10);
assert(turnInput.forward<0,'Ha de frenar abans d’una corba pronunciada');
assert.equal(governedRequisitionInput(player,{forward:1,turn:0}).vehicleSpeedLimit,14);
assert.deepEqual(governedRequisitionInput({t:'cotxe',v:22},{forward:1,turn:1}),{forward:1,turn:1});

const stopped=enemyCarArcStep({x:0,z:0,heading:0,targetHeading:Math.PI/2,
 distance:0,radius:14});
assert.equal(stopped.heading,0,'Cap gir sobre el lloc als NPC de rodes');
const arc=enemyCarArcStep({x:0,z:0,heading:0,targetHeading:Math.PI/2,
 distance:7,radius:14});
assert(arc.distance>0&&arc.heading>.2&&arc.heading<.6,
 'Un gir de la tanqueta es fa avançant amb radi ampli');
assert(Math.hypot(arc.x,arc.z)>6.5,'El canvi de rumb acompanya moviment real');

const nav=readFileSync(new URL('../src/enemy-navigation.js',import.meta.url),'utf8');
const ai=readFileSync(new URL('../src/enemy-ai.js',import.meta.url),'utf8');
assert(nav.includes("const car=u.t==='jeep'||u.t==='tanqueta'"));
assert(nav.includes("radius:u.t==='tanqueta'?14:undefined"));
assert(ai.includes('enemyRequisition.governedRequisitionInput(v,attack)'));
assert(ai.includes("&&u.t!=='tanqueta')"),'No s’ha de forçar el rumb de la tanqueta cap al jugador');
assert(ai.includes("if(u.t!=='tanqueta')u.hd=Math.atan2(u.x-u.tx,u.z-u.tz);"),
 'El canvi de punt de patrulla no pot fer girar la tanqueta sobre el lloc');

const shell=planBuildingShell(36,38,18,
 {hangar:true,doorSide:0,doorWidth:30,openDoor:true,noPartitions:true},()=>.25);
assert.equal(shell.wallHp,10);
assert.equal(shell.segments.filter(s=>s.hangarRearWall).length,1,
 'El shell ja conté una única paret posterior arquejada');
const core=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
const compound=readFileSync(new URL('../src/compound-generation.js',import.meta.url),'utf8');
assert(core.includes('buildingVisual.addHangarRearWall(g,{lx,lz,sx,sz,material:wm})'));
assert(!compound.includes("new THREE.ExtrudeGeometry(shape,"),
 'El complex afegia un segon mur a sobre del semicercle de mkB()');
assert(!compound.includes('hangarRear:true'),
 'No hi pot haver un segon col·lisionador posterior de 10 PV');
console.log('PASS: mirilles sense canvis de física; tanqueta NPC <=14 i gir per arc, hangar 1 mur de 10 PV');
