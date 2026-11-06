import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planBuildingShell} from '../src/building-shell.mjs';
import {advanceVehicle} from '../src/vehicle-dynamics-core.mjs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const game=source('src/game-core.js'),compound=source('src/compound-generation.js');
const hangar=planBuildingShell(32,40,11,{hangar:true,doorWidth:30,doorSide:0},()=>0);
assert.equal(hangar.roofHp,10,'hangar roof must have exactly 10 HP');
assert.equal(planBuildingShell(25,28,8,{},()=>0).roofHp,16,
  'other roof HP remain unchanged');
assert(compound.includes('hp:10,m:rear,parts:[rear]')&&
  compound.includes('hangarRear:true'),
  'the existing arched rear wall has exactly 10 HP');
assert.equal(hangar.segments.filter(s=>s.hangarBackHeight!=null).length,0,
  'no duplicate rear wall or redundant colliders in building shell');

const first=game.indexOf('function handleVehicleImpacts('),
  last=game.indexOf('// Hitboxes físics de les cobertes.',first);
assert(first>=0&&last>first);
const makeHandler=new Function('env','with(env){'+game.slice(first,last)+
  ';return handleVehicleImpacts;}');
for(const type of ['cotxe','camio','moto','bici','llanxa','heli','tanc','tanqueta']){
 const rock={x:0,z:0,r:1.5,s:1.2,topY:3,bottomY:0,rock:true},
   nautical=type==='llanxa',air=type==='heli',
   V={t:type,x:1,z:0,v:8,envCd:0,bump:0,ramCd:0,alt:1,
     o:{position:{y:1}}},damages=[],sparks=[];
 const env={
   VT:{[type]:{m:air?'a':nautical?'w':'l',mass:1}},VS:{[type]:1},
   vehicleRadius:()=>3,
   window:{HUNTER_VEHICLE_ENVIRONMENT:{
      rockVerticalBand:()=>({baseY:-5,topY:8}),
      rockImpact:()=>({damage:2,speedFactor:-.12,bump:.22,cooldown:.32})
   }},
   fa:[],hAt:()=>1,wy:()=>0,nearbyRock:()=>env.rock,
   rock,collisionDamageVehicle:(v,d)=>damages.push(d),
   vehicleImpactFx:(...v)=>sparks.push(v),runoverSweepHit:()=>false,
   E:[],prisonerSystem:{entities:[]},treeAt:()=>null,
   cv:null,msg:'',msgT:0
 };
 const handler=makeHandler(env);
 handler(V,.2,0,0);
 assert.equal(V.x,1,type+' crosses small rock without being pushed backwards');
 assert.equal(V.z,0);
 assert.equal(damages.length,type==='tanc'||type==='tanqueta'?0:1,
   type+' has correct one-point rock damage exception');
 if(damages.length)assert.equal(damages[0],1);
 assert.equal(sparks.length,1,type+' produces impact sparks');
 handler(V,.2,0,0);
 assert.equal(sparks.length,1,type+' does not repeat sparks while overlapping');
 assert.equal(damages.length,type==='tanc'||type==='tanqueta'?0:1,
   'one damage per contact even with multiple simulation steps');
 V.x=80;env.rock=null;handler(V,.2,80,0);
 assert.equal(V.lastSmallRock,null,'leaving the rock clears the contact');
 V.x=1;env.rock=rock;V.envCd=0;handler(V,.2,0,0);
 assert.equal(sparks.length,2,'re-entering the rock is a new collision');
}
{
 const rock={x:0,z:0,r:4,s:3,rock:true},v={t:'cotxe',x:1,z:0,v:12,alt:1};
 let damage=0;
 const env={VT:{cotxe:{m:'l',mass:1}},VS:{cotxe:1},fa:[],vehicleRadius:()=>3,
   window:{HUNTER_VEHICLE_ENVIRONMENT:{
     rockVerticalBand:()=>({baseY:0,topY:4}),
     rockImpact:()=>({damage:2,speedFactor:-.12,bump:.22,cooldown:.32})
   }},
   hAt:()=>1,nearbyRock:()=>rock,collisionDamageVehicle:()=>damage++,
   vehicleImpactFx:()=>{},msg:'',msgT:0
 };
 makeHandler(env)(v,.05,0,0);
 assert(v.x>1&&damage===1,'large rocks still block and damage fast vehicles');
}

for(const type of ['tanc','tanqueta']){
 for(const speed of [-.005,0,.005]){
   const v={t:type,v:speed,hd:0,sideV:0,strafeV:0,yawRate:0};
   advanceVehicle(v,0,1,1/30);
   assert(v.hd>0,type+' A/joystick-left must turn left from rest');
 }
 const reverse={t:type,v:-3,hd:0,sideV:0,strafeV:0,yawRate:0};
 advanceVehicle(reverse,0,1,1/30);
 assert(reverse.hd<0,type+' still reverses steering when actively reversing');
}
{
 const a=game.indexOf('if(scopeActive){\n  // El joystick'),
   b=game.indexOf('}else if(cv){',a);
 assert(a>0&&b>a);
 const control=new Function('e','with(e){'+game.slice(a,b)+'}}\nreturn {yaw:e.scopeYaw,pitch:e.scopePitch};');
 const run=(keys,x,y)=>{const e={scopeActive:true,scopeYaw:0,scopePitch:0,
    K:keys,joystick:{state:{x,y}},dt:1,f:0,tr:0};
   return control(e)};
 const turnTouch=run({},-1,0),turnKeyboard=run({KeyA:true},0,0);
 const pitchTouch=run({},0,-1),pitchKeyboard=run({KeyW:true},0,0);
 assert(Math.abs(turnTouch.yaw/turnKeyboard.yaw-.18)<1e-6,
   'scope joystick yaw is 18% of keyboard');
 assert(Math.abs(pitchTouch.pitch/pitchKeyboard.pitch-.18)<1e-6,
   'scope joystick pitch is 18% of keyboard');
}
console.log('PASS: hangar 10HP, no duplicate rear wall, small-rock collisions, stationary tracks and precise scoped joystick');
