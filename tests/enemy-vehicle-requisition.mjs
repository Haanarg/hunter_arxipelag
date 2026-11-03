import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {candidateVehicles,requisitionChance,requisitionRoll,vehicleSeatPosition,
  pursuitInput,observeFleeing,seatVisual,passengerMuzzle,
  boatBoardingRoute,boatBoardingReady,requisitionBoat,boatCrewMuzzle,
  avoidVehicleBarbedWire,requisitionFenceDetour,REQUISITION} from '../src/enemy-vehicle-requisition.mjs';
import {createEnemyVehicleController} from '../server/enemy-vehicle-controller.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

assert.ok(requisitionChance(.6)<requisitionChance(1));
assert.ok(requisitionChance(1)<requisitionChance(1.5));
assert.equal(requisitionChance(.6),.25);
assert.equal(requisitionChance(1),.50);
assert.equal(requisitionChance(1.5),.75);
assert.ok(requisitionChance(1,true)>requisitionChance(1));
assert.equal(requisitionChance(1.5,true),.95);
const observer={x:0,z:0},runner={id:'player',x:25,z:0},track={};
assert.equal(observeFleeing(observer,runner,0,track),false);
runner.x=26.5;
assert.equal(observeFleeing(observer,runner,.1,track),true,
  'Una fugida radial activa la reacció reforçada');
runner.x=26.3;
assert.equal(observeFleeing(observer,runner,.2,track),true,
  'La fugida recent es conserva durant un interval breu');
assert.equal(observeFleeing(observer,runner,4,track),false,
  'La bonificació no dura indefinidament');
assert.equal(requisitionRoll('soldier-1',67),requisitionRoll('soldier-1',67));
assert.notEqual(requisitionRoll('soldier-1',67),requisitionRoll('soldier-2',67));
const neutral=(id,t,x,z)=>({id,t,x,z,y:1,v:0,hd:0,seats:[null,null]});
const cars=[neutral('near','cotxe',5,0),neutral('heavy','camio',18,0),
  neutral('other','cotxe_civil',7,0)];
const search=candidateVehicles({x:0,z:0},cars,{visible:()=>true});
assert.equal(search[0].vehicle.id,'heavy',
  'Si hi ha dos vehicles comparables, s’escull el de massa superior');
cars[1].seats[0]='host';
assert.ok(!candidateVehicles({x:0,z:0},cars)[0]?.vehicle.seats.some(Boolean),
  'No es poden requisar vehicles de jugadors');
cars[1].seats[0]=null;
assert.equal(candidateVehicles({x:0,z:0},cars,{visible:()=>false}).length,3,
  'La requisició no depèn de la línia de visió');
assert.equal(candidateVehicles({x:0,z:0},[neutral('far','tanc',65,0)]).length,0);
assert.equal(candidateVehicles({x:0,z:0},[neutral('far','tanc',65,0)],
  {range:REQUISITION.fleeingSearchRadius}).length,1);
for(const type of ['tanc','tanqueta','moto']){
  const v=neutral(type,type,8,0);
  assert.equal(candidateVehicles({x:0,z:0},[v]).length,1,
    type+' ha de ser requisable');
  assert.ok(vehicleSeatPosition(v,0).x!==v.x);
}
const dockBoat=neutral('dock-boat','llanxa',0,14);
const dockPier={x:0,z:7,ux:0,uz:1,px:1,pz:0,length:16,width:4,y:2.4};
const dockRamp={x:0,z:0,nx:0,nz:-1,length:12,width:3.6,top:2.4,bottom:.6,ramp:true,pierAccess:true};
assert.equal(candidateVehicles({x:0,z:-11},[dockBoat]).length,0,
  'No es requisarà una llanxa si no hi ha moll accessible');
const dockRoute=boatBoardingRoute(dockBoat,[dockPier],[dockRamp]);
assert.ok(dockRoute?.length>=3,
  'La ruta de la llanxa ha de passar per la rampa i el pantalà');
assert.equal(dockRoute[0].z,-12);
assert.equal(candidateVehicles({x:0,z:-11},[dockBoat],{
  piers:[dockPier],stairs:[dockRamp]
}).length,1,'Una llanxa neutral amb moll sí que és requisable');
assert.ok(boatBoardingReady(dockRoute.at(-1),dockBoat,dockRoute));
assert.equal(requisitionBoat('llanxa_coets'),true);
const fence={barbed:true,x0:-8,z0:-12,x1:8,z1:-12,
  ax:-8,az:-12,bx:8,bz:-12};
const pursuitCar={...neutral('car','cotxe',0,0),v:14};
const approaching=pursuitInput(pursuitCar,{x:0,z:-100});
const avoiding=avoidVehicleBarbedWire(pursuitCar,approaching,[fence],{});
assert.equal(avoiding.avoidingFence,true);
assert.ok(avoiding.forward<approaching.forward,
  'La IA ha de frenar abans de la filferrada');
assert.equal(avoidVehicleBarbedWire(pursuitCar,approaching,[],{}),approaching,
  'Sense obstacle, la física i la velocitat originals no canvien');
assert.ok(source('src/compound-generation.js').includes('u.rate=5')&&
  source('server/coop-combat.mjs').includes('rocket?5:'),
  'La cadència de les armes pesades és de 5 segons en tots dos modes');
// Les portes d'un recinte han de ser accessibles des de qualsevol costat.
const compoundWire=[];
const addWire=(ax,az,bx,bz)=>compoundWire.push({barbed:true,ax,az,bx,bz,hp:8});
for(let x=-42;x<42;x+=6)if(x!==-6&&x!==0)addWire(x,-30,x+6,-30);
for(let z=-30;z<30;z+=6){
 addWire(-42,z,-42,z+6);addWire(42,z,42,z+6);
}
for(let x=-42;x<42;x+=6)addWire(x,30,x+6,30);
for(const start of [{x:25,z:-70},{x:58,z:0},{x:-60,z:0}]){
 const path=requisitionFenceDetour(start,{x:24,z:0},compoundWire);
 assert.ok(path?.length===2,
   'La IA ha de trobar una obertura del recinte encara que estigui en un altre costat');
 assert.ok(path[0].z<-30&&path[1].z>-30,
   'Primer va a la banda exterior del pas i després creua la porta');
}
const completeWire=compoundWire.concat([
 {barbed:true,ax:-6,az:-30,bx:0,bz:-30,hp:8},
 {barbed:true,ax:0,az:-30,bx:6,bz:-30,hp:8}
]);
assert.equal(requisitionFenceDetour({x:25,z:-70},{x:24,z:0},completeWire),null,
 'Mai no ha d\'inventar-se un pas a través d\'una filferrada intacta');
assert.equal(requisitionFenceDetour({x:0,z:-80},{x:0,z:-60},compoundWire),null,
 'Sense cap tanca al camí, la IA no necessita desviar-se');
assert.ok(boatCrewMuzzle(neutral('boat','llanxa',0,0),0).x<0&&
  boatCrewMuzzle(neutral('boat','llanxa',0,0),1).x>0,
 'La boca del fusell del pilot i la del llançacoets del passatger tenen seients diferents');
const marineVisual=source('src/marine-patrol.js'),crewVisual=source('src/enemy-ai.js');
assert.ok(!marineVisual.includes('createMount(')&&
 !marineVisual.includes('marineAimGun(')&&
 marineVisual.includes('attachEnemyBoatCrew(boat)'),
 'Les patrulleres no construeixen metralladores ni canons muntats al casc');
assert.ok(crewVisual.includes('return attachEnemyBoatCrew(car,{initiallyHidden})')&&
 marineVisual.includes('ensureEnemyVehicleFlag')&&
 crewVisual.includes("ensureEnemyVehicleFlag(g,'patrulla_marina')"),
 'Les llanxes requisades i les patrulleres comparteixen riders i bandera');
assert.ok(marineVisual.includes('aimEnemyBoatCrew(u.o,0,target,dt)')&&
 marineVisual.includes('aimEnemyBoatCrew(u.o,1,target,dt)')&&
 source('src/coop-world-runtime.js').includes('aimEnemyBoatCrew(e.o,1,aim,dt)'),
 'El fusell i el llançacoets giren amb els comandos a solo i cooperatiu');
assert.ok(source('server/enemy-vehicle-controller.mjs').includes('firePassenger(unit,v,tick,0)')&&
 source('server/coop-combat.mjs').includes('boatCrewMuzzle(boatPose,1,unit.y)'),
 'El pilot dispara el fusell i el passatger el llançacoets amb autoritat del Worker');
const motorcycle=neutral('bike','moto',3,0);
motorcycle.enemyCrew=['enemy-1',null];
assert.equal(candidateVehicles({x:0,z:0},[motorcycle]).length,0,
  'La moto no pot admetre copilot');
assert.ok(seatVisual('tanc',0).hidden&&seatVisual('tanqueta',0).hidden,
  'Els soldats dels blindats estan protegits dins del vehicle');
assert.equal(seatVisual('moto',0).x,0);
for(const seat of [0,1]){
  const pose=seatVisual('cotxe',seat);
  assert.ok(pose.y<.8&&pose.scale<=.31&&
    Math.abs(pose.x)>.8,'El soldat ha de quedar baix i a la seva plaça del Humvee');
}
const humvee=neutral('humvee','cotxe',0,0);
const muzzle=passengerMuzzle(humvee,1);
assert.ok(muzzle.x>2.05&&muzzle.y>3,
  'L’arma del copilot ha de sortir del lateral del Humvee');
assert.equal(passengerMuzzle(neutral('armored','tanc',0,0)),null,
  'El copilot no pot disparar a través del casc blindat');
assert.ok(source('src/combat.js').includes("v===p.sourceVehicle"),
  'Els projectils no poden impactar el seu vehicle d’origen');
assert.ok(source('src/combat.js').includes("claim.seat===0"),
  'La pistola del conductor queda desactivada');
assert.ok(source('server/coop-combat.mjs').includes('passengerMuzzle(v,v.y)'));
assert.ok(source('src/game-core.js').includes("v.enemyCrew?.[0]?.enemyVehicleClaim?.phase==='riding'"),
 'Un vehicle conduït per enemics no rep una segona física en punt mort');
assert.ok(source('src/enemy-ai.js').includes("z=truck?-1.93*truckFit"),
 'Els pilots del camió estan alineats amb els seients de la cabina A4.3');
assert.ok(source('src/combat.js').includes('vehicleOccupantHeadWorld(')&&
 source('server/coop-combat.mjs').includes('vehicleOccupantHeadWorld('),
 'En individual i cooperatiu la retícula apunta al cap del passatger');
assert.ok(pursuitInput(cars[0],{x:-25,z:-30}).turn>0,
  'El conductor segueix la direcció del jugador');
assert.ok(pursuitInput(cars[0],{x:0,z:-80},{passenger:false}).forward>.5,
  'Sense passatger intenta acostar-se per atropellar');
assert.ok(pursuitInput(cars[0],{x:0,z:-5},{passenger:true}).forward<0,
  'Amb passatger manté distància per disparar');

const fleet=Array.from({length:4},(_,i)=>neutral('truck-'+i,'camio',i*100+12,0));
const actors=[{id:'host',hp:25,x:75,y:1,z:0,fall:null,swimming:false}];
const roster=Array.from({length:4},(_,i)=>{
  const identity=Array.from({length:200},(_,j)=>'soldier-'+i+'-'+j)
    .find(id=>requisitionRoll(id,67)<requisitionChance(1));
  assert.ok(identity);return {id:identity,t:'soldat',hp:4,x:i*100,y:1,z:0,navPhase:0,state:'attack'};
});
let visible=true,shots=0,drives=0;
const fleetApi={
  live:()=>fleet,
  enemyReserve(id,uid,seat){
    const v=fleet.find(v=>v.id===id);
    if(!v||v.seats.some(Boolean))return false;
    v.enemyCrew??=[null,null];
    if(v.enemyCrew[seat]||seat===1&&!v.enemyCrew[0])return false;
    v.enemyCrew[seat]=uid;return true;
  },
  enemyPromote(id,driverId,passengerId){
    const v=fleet.find(v=>v.id===id);
    if(v?.enemyCrew?.[0]!==driverId||v.enemyCrew[1]!==passengerId)return false;
    v.enemyCrew[0]=passengerId;v.enemyCrew[1]=null;return true;
  },
  enemyRelease(uid){
    for(const v of fleet)if(v.enemyCrew?.includes(uid)){
      v.enemyCrew[v.enemyCrew.indexOf(uid)]=null;return true;
    }
    return false;
  },
  enemyAccept(id,uid,input,tick){
    const v=fleet.find(v=>v.id===id);
    if(!v||v.enemyCrew?.[0]!==uid)return false;
    v.lastDrive={input,tick};drives++;return true;
  }
};
const control=createEnemyVehicleController({
  meta:{id:'mission',mode:'native',seed:67,difficulty:1},
  vehicles:fleetApi,targets:roster,players:()=>actors,
  visible:()=>visible,world:()=>({heightAt:()=>1}),
  navigate(u){
    const s=u.enemyRequisition,v=fleet.find(v=>v.id===s.vehicleId),
      p=vehicleSeatPosition(v,s.seat),dx=p.x-u.x,dz=p.z-u.z,
      d=Math.hypot(dx,dz),amount=Math.min(2,d);
    if(d){u.x+=dx/d*amount;u.z+=dz/d*amount;}
  },
  firePassenger:()=>{shots++;}
});
for(const [i,unit] of roster.entries()){
  actors[0].x=i*100+75;
  assert.equal(control.acquire(unit,actors[0],0),true);
}
assert.equal(fleet.filter(v=>v.enemyCrew?.[0]).length,4,
  'No hi ha límit d’una única persecució per sector');
for(let tick=0;tick<300;tick+=3)for(const unit of roster)control.step(unit,tick);
assert.ok(roster.every(u=>u.enemyVehicleId&&u.enemyRequisition?.phase==='riding'));
assert.ok(drives>40,'Els conductors reben entrades de conducció del Worker');
actors[0].x=fleet[0].x+55; // contacte recent perquè el conductor esperi el copilot
const first=fleet[0],driver=roster[0],
  buddyId=Array.from({length:200},(_,j)=>'copilot-'+j)
    .find(id=>requisitionRoll(id,67)<requisitionChance(1)),
  buddy={id:buddyId,t:'soldat',hp:4,x:first.x,y:1,z:1,navPhase:0,state:'attack'};
roster.push(buddy);
assert.equal(control.acquire(buddy,actors[0],300),true,
  'Un segon soldat pot reservar el seient del passatger');
assert.equal(buddy.enemyRequisition.seat,1);
for(let tick=300;tick<390;tick+=3)for(const unit of roster)control.step(unit,tick);
assert.equal(buddy.enemyVehicleId,first.id);
assert.ok(shots>0,'El copilot pot disparar quan el vehicle persegueix el jugador');
actors[0].x=10000; // fora del radi: l'ocultació visual per si sola no atura el vehicle
visible=false;
for(let tick=390;tick<850;tick+=3)for(const unit of roster)control.step(unit,tick);
assert.ok(roster.every(u=>!u.enemyRequisition),
  'Després de perdre el contacte els soldats abandonen la persecució');
assert.ok(fleet.every(v=>!v.enemyCrew?.some(Boolean)),
  'No queden vehicles reservats fantasma');

// Regressió: el conductor d'un blindat requisat entra al camí de foc
// autoritatiu igual que el pilot d'una llanxa, i no perd el control.
for(const armoredType of ['tanc','tanqueta']){
  const tank=neutral('armored-test-'+armoredType,armoredType,0,0);
  tank.enemyCrew=['armored-driver',null];
  tank.seats=[null,null];tank.v=0;
  const rider={id:'armored-driver',t:'soldat',hp:4,x:0,y:0,z:0,
    navPhase:0,enemyVehicleId:tank.id,
    enemyRequisition:{vehicleId:tank.id,seat:0,phase:'riding',
      lastContact:0,goal:{x:30,y:0,z:0},fleeUntil:0}};
  const hunter={id:'victim',hp:25,x:30,y:0,z:0,fall:null,swimming:false};
  let cannonCalls=0,steeringCalls=0;
  const controller=createEnemyVehicleController({
    meta:{id:'armored',mode:'native',seed:67,difficulty:1},
    vehicles:{live:()=>[tank],enemyAccept:()=>{steeringCalls++;return true;}},
    targets:[rider],players:()=>[hunter],
    world:()=>({heightAt:()=>0}),
    firePassenger:(u,v,tick,seat)=>{
      assert.equal(u,rider);assert.equal(v,tank);assert.equal(seat,0);
      cannonCalls++;
    }
  });
  assert.equal(controller.step(rider,3),true);
  assert.equal(cannonCalls,1,
    'El conductor enemic de '+armoredType+' ha d'activar el canó');
  assert.equal(steeringCalls,1,
    'El conductor de '+armoredType+' continua conduint després del tir');
}
const solo=source('src/enemy-ai.js'),
  coop=source('server/coop-combat.mjs'),
  vehicles=source('server/coop-vehicles.mjs'),
  client=source('src/coop-world-runtime.js');
assert.ok(solo.includes('enemyVehicleReserve(u,{fleeing})')&&
  solo.includes('stepV(v,input.forward,input.turn,0,Math.min(dt,.1))')&&
  solo.includes("if(u.t==='soldat'&&u.enemyVehicleClaim"));
assert.ok(source('src/game-core.js').includes(
    "['waiting','riding'].includes(u.enemyVehicleClaim.phase)"),
  'Els conductors i copilots embarcats no poden ser atropellats pel propi vehicle');
assert.ok(source('server/coop-combat.mjs').includes(
    "!target.enemyVehicleId&&!['waiting','riding'].includes(target.enemyRequisition?.phase)"),
  'El Worker també exclou els tripulants dels atropellaments');
assert.ok(solo.includes("['tanc','tanqueta'].includes(v.t)")&&
    solo.includes('HUNTER_VEHICLES.aimTurret(THREE,v.o,goal,dt)')&&
    solo.includes("SMALL_ARMS_SCALE,u,true"),
  'El canó del tanc apunta i dispara des de la torreta en mode individual');
assert.ok(source('src/combat.js').includes('!mountedCannon')&&
    source('src/combat.js').includes("sourceVehicle:own==='e'&&claim"),
  'Es permet el canó, però no la pistola del conductor ni impactar el propi casc');
assert.ok(coop.includes("seat===0&&['tanc','tanqueta'].includes(v.t)")&&
    coop.includes('stepVehicleTurret(v,[dx/len,dy/len,dz/len],.1)')&&
    coop.includes("unit.nextAttackTick=tick+Math.ceil((v.t==='tanc'?5:.16)*30)"),
  'El tanc requisat orienta el canó i dispara cada cinc segons en cooperatiu');
assert.ok(coop.includes('enemyVehicles.tryAcquire(unit,tick)')&&
  coop.includes('enemyVehicles.step(t,tick)')&&
  coop.includes("if(meta.mode==='native'&&v.enemyCrew?.[0])"));
assert.ok(vehicles.includes('enemyReserve,enemyRelease,enemyPromote,enemyAccept')&&
  vehicles.includes("code='ENEMY_OCCUPIED'")&&
  vehicles.includes('stepRangeVehicle(v,input'));
assert.ok(client.includes('e.nativeBoardedVehicle=boarded'));
assert.ok(solo.includes('function attachEnemyCarCrew(car')&&
  solo.includes('HUNTER_ENEMY_CREW_VISUAL')&&
  solo.includes('enemyCarRifleShot({'),
  'El mode individual reaprofita els ocupants i l’arma del Humvee de patrulla');
assert.ok(client.includes('HUNTER_ENEMY_CREW_VISUAL.show')&&
  client.includes('e.o.visible=false'),
  'El mode cooperatiu amaga els soldats drets i mostra el rider reutilitzat');
assert.ok(source('src/combat.js').includes('HUNTER_ENEMY_CREW_VISUAL?.show(vehicle,0,true)'),
  'La substitució del conductor també actualitza el rider');
assert.ok(source('src/operation-runtime.js').includes(
  "if(kind==='enemies'&&entity.enemyVehicleClaim)"));
console.log('OK: fugida, distància sense LOS, tancs, tanquetes, motos, seients, copilot, persecució il·limitada i pèrdua de contacte');
