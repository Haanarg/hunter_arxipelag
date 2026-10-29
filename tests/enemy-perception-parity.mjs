import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {CONFIG,RADII,soldierView,recognizeSoldier,heardPosition} from '../src/enemy-perception-core.mjs';
import {inView} from '../src/combat-rules.mjs';
const fixture=createRequire(import.meta.url)('./fixtures/enemy-perception-v0651.cjs');
const context=vm.createContext({Math,window:{},inView,cv:null,over:false,playerCrouched:false,disg:false,hAt:()=>-10000,soldierVisibleShotHeight:()=>1.5,ENEMY_SENSE_DT:.1});
vm.runInContext(fixture.radiiSource+fixture.configSource+';var STEALTH={CONFIG,inView:(hd,dx,dy,dz,r)=>inView(hd,dx,dy,dz,r,CONFIG)};'+fixture.contactSource,context);
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(CONFIG)',context)),CONFIG);
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(RADII)',context)),RADII);
let checks=0;
for(const elite of [false,true])for(const crouched of [false,true])for(const disguised of [false,true])for(const sameBasement of [false,true])for(const heading of [0,.7,Math.PI])for(const distance of [1,6,12,29.75,49.3,60,85,100,111])for(const angle of [-Math.PI,-1.4,-.87,-.5,0,.5,.87,1.4,Math.PI])for(const height of [-3,0,3]){
 const y=sameBasement?-20:0,observer={x:3,y,z:5,heading,elite},target={x:3-Math.sin(heading+angle)*distance,y:y+height,z:5-Math.cos(heading+angle)*distance};
 Object.assign(context,{u:{x:observer.x,z:observer.z,hd:heading,elite,o:{position:{y}},...(sameBasement?{basement:{fy:0}}:{})},target,targetY:target.y,d:distance,playerCrouched:crouched,disg:disguised});
 const reference=vm.runInContext('soldierVisualContact(u,target,targetY,d)',context);
 assert.equal(soldierView(observer,target,{crouched,disguised,sameBasement}),reference,JSON.stringify({elite,crouched,disguised,sameBasement,heading,distance,angle,height}));checks++;
}
for(const crouched of [false,true])for(const distance of [1,11.99,12,60]){
 let value=0;Object.assign(context,{u:{recognition:0},d:distance,playerCrouched:crouched});
 for(const raw of [true,true,false,true,true,true,true,false,false,false,false,false]){
  context.raw=raw;value=recognizeSoldier(value,raw,distance,crouched);vm.runInContext(fixture.recognitionSource,context);assert.equal(value,context.u.recognition);checks++;
 }
}
for(const crouched of [false,true])for(const disguised of [false,true]){
 const observer={x:0,y:0,z:0,heading:0,elite:true},target={x:0,y:0,z:-100};assert.equal(soldierView(observer,target,{crouched,disguised,inVehicle:true}),inView(0,0,-.7,-100,115,CONFIG));
}
for(const kind of ['alert','pistol','knife','explosion'])for(let id=1;id<=30;id++){const listener={x:id*.31,z:-id*2},noise={id,kind,radius:RADII[kind],x:30,y:4,z:10};Object.assign(context,{u:{...listener},noise});vm.runInContext('{'+fixture.heardSource+'}',context);assert.deepEqual(heardPosition(listener,noise),{x:context.u.lastSeenX,y:context.u.lastSeenY,z:context.u.lastSeenZ});checks++;}
console.log('original perception parity: '+checks+' view/elite/basement/crouch/disguise/recognition comparisons passed');
