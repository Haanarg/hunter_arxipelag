#!/usr/bin/env node
// Dany real de les col·lisions i de les explosions en la nova escala de 20 PV.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'src',name),'utf8');
const combat=read('combat.js'),core=read('game-core.js'),ai=read('enemy-ai.js');
const section=(s,a,b)=>{
 const i=s.indexOf(a),j=s.indexOf(b,i);
 assert.ok(i>=0&&j>i,'No s’ha trobat '+a);
 return s.slice(i,j);
};
const ctx={
 Math,E:[],V:[],PL:[],cv:null,P:{x:50,y:0,z:0},hp:20,over:0,
 playerFall:null,playerEject:null,elapsed:0,sphG:{},fx:[],
 walls:[],buildings:[],enemies:[],vehicles:[],
 world:{add(){}},THREE:{Mesh:class{constructor(){this.position={set(){}}}},
   MeshBasicMaterial:class{}},
 snd(){},rn(a,b){return (a+b)/2},hAt(){return 0},wy(){return 0},
 wallCandidates(){return ctx.walls},buildingCandidates(){return ctx.buildings},
 enemyCandidatesAt(){return ctx.enemies},vehicleCandidatesAt(){return ctx.vehicles},
 vehicleRadius(){return 3},vehicleHitType(t){return t==='jeep'?'cotxe':t},
 VT:{cotxe:{mass:1},tanc:{mass:5},tanqueta:{mass:3.2},camio:{mass:2.2}},
 circleVehicleOverlap(){return false},terminalRampHeight(){return null},
 pedestrianFerry(){return null},hangarRoofSegmentT(){return null},
 bunkerProjectileSurface(x,z,y){return y<0?-9:0},
 explosionDistanceToVehicleHull(v,x,y,z){
   return Math.max(0,Math.hypot(v.x-x,(v.o.position.y||0)+1-y,v.z-z)-2);
 },
 hurtP(d){ctx.hp-=d},hurtE(u,d){u.hp-=d},damageVehicle(v,d){v.life-=d},
 dmgW(w,d){w.hp-=d},dmgP(t,d){t.hp-=d},roofBreak(b){b.rhp=0},
 blastImpulseAt(){return {vx:5,vz:0,vy:13}}
};
vm.createContext(ctx);
vm.runInContext([
 section(combat,'function wholeDamage(','function impactDamage('),
 section(combat,'function impactDamage(','function shoot('),
 section(combat,'function segmentAabbT(','function segmentSphereT('),
 section(combat,'function explosionDamage(','function plant('),
 section(core,'function collisionDamageVehicle(','function ramSpeedFactor('),
 section(core,'function vehiclePushPlayer(','const PL=[],FA=')
].join('\n'),ctx);

// A/B: les col·lisions de vehicles són simètriques i els enemics fan servir
// velocitat real, incloent-hi quan atropellen el jugador a peu.
assert.equal(ctx.impactDamage(6,1,1),0);
assert.equal(ctx.impactDamage(30,1,1),4);
assert.equal(ctx.impactDamage(100,1,1),5);
assert.ok(ctx.impactDamage(15,.55,5)>ctx.impactDamage(15,5,.55));
assert.equal(ctx.relativeVehicleImpactSpeed({hd:0,v:15},{hd:0,v:15}),0);
assert.ok(Math.abs(ctx.relativeVehicleImpactSpeed({hd:0,v:10},
  {navHd:Math.PI,impactSpeed:10})-20)<1e-8);
const hostile={t:'jeep',hp:5,destroyed:false};
ctx.E.push(hostile);ctx.impactVehicle(hostile,2);
assert.equal(hostile.hp,3,'Els vehicles enemics reben dany de col·lisió');
const car={t:'cotxe',life:5,destroyed:false};
ctx.impactVehicle(car,2);
assert.equal(car.life,3,'El cotxe del jugador perd els mateixos PV');
assert.match(core,/v\.v\?\?v\.impactSpeed\?\?0/,'L’atropellament enemic té velocitat real');
assert.match(ai,/u\.impactSpeed=dt>/,'La IA publica la velocitat observada');

// C: una mateixa fórmula per als atropellaments rebuts i provocats.
assert.equal(ctx.runoverDamage(6,5),0,'Per sota del llindar no hi ha dany');
assert.equal(ctx.runoverDamage(29,2.2),10,'Camió a velocitat punta: 10 PV');
assert.equal(ctx.runoverDamage(24,3.2),10,'Tanqueta: massa completa i límit 10');
assert.equal(ctx.runoverDamage(21,5),10,'Tanc: massa completa i límit 10');
assert.equal(ctx.runoverDamage(17,.2),1,'Bicicleta: dany mínim');
assert.ok(ctx.runoverDamage(10,2.2)<ctx.runoverDamage(29,2.2),
 'Un camió lent ha de fer menys mal');
assert.match(core,/const dmg=runoverDamage\(speed,c\.mass\|\|1\)/,
 'Els soldats reben la fórmula comuna');
assert.match(core,/dmg=runoverDamage\(sp,VT\[vehicleHitType\(v\.t\)\]\?\.mass\|\|1\)/,
 'El jugador rep la mateixa fórmula sense reducció');
assert.match(ai,/u\.impactFromX=oldX;u\.impactFromZ=oldZ/,
 'Els vehicles enemics guarden el trajecte real');
assert.equal(ctx.runoverSweepHit(0,0,20,0,10,2,3),true,
 'El vehicle no pot travessar un soldat entre fotogrames');
assert.equal(ctx.runoverSweepHit(0,0,20,0,10,4,3),false,
 'No es detecta atropellament quan passa prou lluny');
// Exercitam la col·lisió real contra el jugador, sense solapament final.
ctx.E=[{t:'jeep',x:20,z:0,impactFromX:0,impactFromZ:0,
 impactSpeed:22,destroyed:false}];
ctx.P={x:10,y:0,z:2};ctx.hp=20;
ctx.vehiclePushPlayer();
assert.equal(ctx.hp,20-ctx.runoverDamage(22,1),
 'El cotxe enemic aplica exactament la fórmula compartida');
ctx.vehiclePushPlayer();
assert.equal(ctx.hp,16,'El cooldown impedeix el dany repetit');
ctx.E=[];ctx.hp=20;

// D: la cobertura del búnquer impedeix el dany des de fora.
const w={x0:2,x1:2.5,z0:-1,z1:1,y0:-2,y1:4,hp:12,open:false,barbed:false};
ctx.walls=[w];
assert.equal(ctx.blastOccluded(0,1,0,4,1,0),true,'Mur físic = protecció');
assert.equal(ctx.blastOccluded(0,1,3,4,1,3),false,'Sense paret intermèdia');
w.open=true;
assert.equal(ctx.blastOccluded(0,1,0,4,1,0),false,'Porta oberta');
ctx.walls=[{x0:-4,x1:4,z0:-4,z1:4,y0:-.03,y1:.22,hp:Infinity,open:false,barbed:false}];
assert.equal(ctx.blastOccluded(0,1,0,0,-8,0),true,'Forjat protegeix el soterrani');

// E: foc amic a ambdós bàndols, sense perdre la protecció del pilot.
ctx.walls=[];ctx.enemies=[{t:'soldat',x:4,z:0,hp:8,o:{position:{y:0}},destroyed:false}];
ctx.boom(0,1.5,0,10,8,'e');
assert.ok(ctx.enemies[0].hp<8,'Una explosió enemiga fereix soldats enemics');
ctx.enemies=[];ctx.P={x:1,y:0,z:0};ctx.hp=20;
ctx.boom(0,1.5,0,10,8,'b');
assert.ok(ctx.hp<20,'La pròpia granada pot fer mal al jugador');
ctx.hp=20;ctx.cv={t:'cotxe'};
ctx.vehicles=[{t:'cotxe',x:1,z:0,life:5,o:{position:{y:0}},destroyed:false}];
ctx.boom(0,1.5,0,10,3,'e');
assert.equal(ctx.hp,20,'El vehicle protegeix el conductor');
assert.ok(ctx.vehicles[0].life<5,'El vehicle rep el dany');

// F: cap diferència oculta en dany de bales a objectes civils.
assert.doesNotMatch(combat,/p\.dmg\*\(p\.own==='e'\?\.5:1\)/);
assert.match(read('compound-generation.js'),/hp:16,m:side/,'No queden laterals d’hangar amb 110 PV');
assert.equal(ctx.explosionDamage(10,0,10),10);
assert.equal(ctx.explosionDamage(10,5,10),5);
assert.equal(ctx.wholeDamage(.4),1,'Qualsevol mal positiu és enter i mínim un punt');
assert.equal(ctx.wholeDamage(2.3),3);
assert.equal(ctx.wholeDamage(2),2);
assert.equal(ctx.wholeDamage(0),0);
assert.equal(ctx.wholeDamage(-.3),0);
console.log('OK dany coherent: col·lisions, màxim 10 atropellament, cobertura, foc amic i estructures');
