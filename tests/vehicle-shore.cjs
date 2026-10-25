'use strict';
// CPU-only shoreline regressions: real movement function, no browser or WebGL.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),win={};
vm.runInNewContext(fs.readFileSync(path.join(root,'src/vehicle-dynamics.js'),'utf8'),
 {window:win,Math});
const dynamics=win.HUNTER_VEHICLE_DYNAMICS,shore=dynamics.shore;
const core=fs.readFileSync(path.join(root,'src/game-core.js'),'utf8'),
  a=core.indexOf('function stepV('),b=core.indexOf('function animateTankTracks',a);
assert(a>=0&&b>a,'read the production stepV implementation');
const sea=()=>0,bed=(x,z)=>-4-z*.14;
const dimensions={cotxe:[5.33,8.385],camio:[6.525,14.138],
 llanxa:[12.87,31.0],moto_aquatica:[1.84,4.1],
 barca_rems:[2.7,6.1],hover:[5.5,10.2],ferry:[32,63]};
const box=(v,x=v.x,z=v.z,hd=v.hd)=>{
 const [w,d]=dimensions[v.t]||[5,10];return{x,z,hd,w,d};
};
const event={damage:[],splash:[],escape:[],explosions:0},env={
 VT:dynamics.types,window:win,H:2500,VS:{cotxe:1.3,hover:1.3},
 hAt:bed,groundAt:bed,wy:sea,elapsed:0,
 vehicleBox:box,vehicleRadius:()=>8,
 puff:(...a)=>event.splash.push(a),wallCandidates:()=>[],
 ferryForVehicle:()=>null,vehicleObstacles:()=>[],handleVehicleImpacts:()=>{},
 crush:()=>{},escapeSubmergedVehicle:v=>{event.escape.push(v);env.cv=null},
 collisionDamageVehicle:(v,d)=>event.damage.push({type:v.t,d}),
 vehicleImpactFx:()=>{},msg:'',msgT:0,cv:null
};
win.HUNTER_AIR_OBSTACLES={hit:()=>null};
const step=new Function('env','with(env){'+core.slice(a,b)+'return stepV;}')(env);
const make=(t,z,hd=0)=>({t,x:0,z,hd,v:0,sideV:0,strafeV:0,
 o:{userData:{}},life:10,envCd:0});
const move=(v,seconds,drive)=>{const frames=Math.ceil(seconds/.05);
 for(let i=0;i<frames;i++){env.elapsed+=.05;step(v,drive,0,0,.05)}
};
const car=make('cotxe',-43,Math.PI);env.cv=car;
move(car,1.0,1);
assert(car.z>-43&&car.v>1&&!car.waterIngress.dead,'car crosses beach continuously');
move(car,6.5,1);
assert(car.waterIngress.dead&&car.sunk,'deep-water car irreversibly floods');
assert.equal(event.escape.length,1,'driver can always swim free');
assert.equal(event.explosions,0,'immersion is not an explosion');
assert(event.splash.length>0,'shallow-water movement emits splashes');
assert.equal(shore.wetLand(car,-2,.05).engine,0,'sunken engine cannot restart on dry terrain');

const boat=make('llanxa',-5);env.elapsed=0;move(boat,9,1);
const grounded=shore.clearance(boat,boat.x,boat.z,box(boat),bed,sea);
assert(boat.grounded,'launch grounds at bow or side before reaching shore');
assert(grounded>=shore.beachLimit.llanxa-.01,'hull never crosses solid seabed limit');
const edge=boat.z;
move(boat,9,-1);
assert(boat.z>edge+8,'grounded boat can back out to deeper water');
assert(!boat.grounded,'reversing removes grounding');

const jet=make('moto_aquatica',-5);
assert(shore.beachLimit.moto_aquatica<0&&shore.beachLimit.llanxa>0,
 'jet ski may slide farther onto sand than a motorboat');
assert(shore.draft.ferry>shore.draft.llanxa&&shore.draft.llanxa>shore.draft.barca_rems,
 'large craft need deeper water');
const hover=make('hover',-43,Math.PI);move(hover,5,1);
assert(hover.z>-20&&!hover.waterIngress&&!hover.grounded,'hovercraft remains amphibious');
const deck=make('camio',0),dry=shore.wetLand(deck,-Infinity,.1);
assert.equal(dry.wet,0,'a truck aboard a ferry is not submerged');
assert(!deck.waterIngress.dead,'dry ferry deck does not stall truck motor');
assert(core.includes('onFerryDeck=land&&(v.carrier||ferryForVehicle'),
 'stepV accounts for ferry cargo before checking immersion');
console.log('PASS shoreline: flooding, splash, automatic swimming escape, hull contact, reversing, jet ski, ferry and hovercraft');
