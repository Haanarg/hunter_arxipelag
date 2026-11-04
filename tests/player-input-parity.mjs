import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createReader,canCrouch,canStrafe,canRun,canSpecial} from '../src/player-input-core.mjs';
// Baseline independent captured from v0.6.132's inline reader.
const legacy=new Function('K','joystick','strafePointers','playerCrouched','strafeEnabled','canRun',
 "function readPlayerControls(strafeEnabled,canRun){\nconst jf=-joystick.state.y,jtr=-joystick.state.x,\n      f=Math.max(-1,Math.min(1,(K.KeyW||K.ArrowUp?1:0)-(K.KeyS||K.ArrowDown?1:0)+jf)),\n      tr=Math.max(-1,Math.min(1,(K.KeyA||K.ArrowLeft?1:0)-(K.KeyD||K.ArrowRight?1:0)+jtr)),\n      strafe=strafeEnabled?Math.max(-1,Math.min(1,\n        (K.KeyU?1:0)-(K.KeyY?1:0)+(strafePointers.right!==null?1:0)-(strafePointers.left!==null?1:0))):0,\n      ud=(K.KeyH||K.Space?1:0)-(K.KeyJ||K.ShiftLeft?1:0);\nconst running=canRun&&!playerCrouched&&f>.1&&(joystick.state.running||K.ShiftLeft||K.ShiftRight);\nreturn {f,tr,strafe,ud,running};\n}"+';return readPlayerControls(strafeEnabled,canRun);');
const oldCrouch=(started,paused,over,cv,swimming,scopeActive,playerFall,playerEject)=>
 started&&!paused&&!over&&!cv&&!swimming&&!scopeActive&&!playerFall&&!playerEject;
const oldStrafe=(scopeActive,cv,vehicles,playerEject,playerFall)=>
 !scopeActive&&(cv?vehicles.has(cv.t):!playerEject&&(!playerFall||!!playerFall.parachute));
const oldRun=(started,paused,over,cv,playerFall,playerEject,scopeActive)=>
 !!started&&!paused&&!over&&!cv&&!playerFall&&!playerEject&&!scopeActive;
const oldSpecial=(started,paused,over,hp,cv,playerFall,playerEject,scopeActive)=>
 !!started&&!paused&&!over&&hp>0&&!!cv&&!playerFall&&!playerEject&&!scopeActive;
let seed=0x6f5a317;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
const choose=a=>a[Math.floor(random()*a.length)];
const keys=['KeyW','ArrowUp','KeyS','ArrowDown','KeyA','ArrowLeft','KeyD','ArrowRight','KeyU','KeyY','KeyH','Space','KeyJ','ShiftLeft','ShiftRight'];
const bits=[undefined,false,true,0,1,2,-1];
let checks=0;
for(let i=0;i<6000;i++){
 const K={};for(const key of keys)K[key]=choose(bits);
 const state={x:choose([-1,-.8,0,.6,1]),y:choose([-1,-.63,0,.24,1]),running:choose(bits)};
 const joystick={state},strafePointers={left:choose([null,null,0,7]),right:choose([null,null,0,5])};
 const crouched=choose(bits),strafeEnabled=choose(bits),canRunNow=choose(bits);
 const reader=createReader(K,joystick,strafePointers);
 assert.deepEqual(reader(strafeEnabled,canRunNow,crouched),
  legacy(K,joystick,strafePointers,crouched,strafeEnabled,canRunNow),'input '+i);
 // Ensure closure uses the same live objects after keyboard, pointer and reset updates.
 K.KeyW=1;state.y=-.5;strafePointers.left=null;strafePointers.right=8;
 assert.deepEqual(reader(true,true,false),legacy(K,joystick,strafePointers,false,true,true),'live state '+i);
 checks+=2;
}
const vehicles=new Set(['hover','heli','heli_combat']);
for(const started of [0,1])for(const paused of [false,true])for(const over of [0,1])
 for(const scope of [false,true])for(const cv of [null,{t:'hover'},{t:'moto'}])
 for(const swimming of [false,true])for(const eject of [null,{t:1}])
 for(const fall of [null,{parachute:false},{parachute:true}]){
 assert.equal(canCrouch(started,paused,over,cv,swimming,scope,fall,eject),oldCrouch(started,paused,over,cv,swimming,scope,fall,eject));
 assert.equal(canStrafe(scope,cv,vehicles,eject,fall),oldStrafe(scope,cv,vehicles,eject,fall));
 assert.equal(canRun(started,paused,over,cv,fall,eject,scope),oldRun(started,paused,over,cv,fall,eject,scope));
 for(const hp of [-3,0,1,10]){
 assert.equal(canSpecial(started,paused,over,hp,cv,fall,eject,scope),oldSpecial(started,paused,over,hp,cv,fall,eject,scope));
 checks++;
 }
}
const core=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
const boot=readFileSync(new URL('../src/bootstrap.mjs',import.meta.url),'utf8');
const harness=readFileSync(new URL('./harness.cjs',import.meta.url),'utf8');
assert(core.includes('HUNTER_PLAYER_INPUT.createReader(K,joystick,strafePointers)'));
assert(core.includes('function readPlayerControls(strafeEnabled,canRun){'));
for(const name of ['canCrouch','canStrafe','canRun','canSpecial'])assert(core.includes('HUNTER_PLAYER_INPUT.'+name+'('));
assert(!core.includes('const jf=-joystick.state.y'),'old inlined sampler gone');
assert(boot.includes('window.HUNTER_PLAYER_INPUT=playerInput'));
assert(harness.includes('c.HUNTER_PLAYER_INPUT=await import('));
console.log('PASS player input parity '+checks+' samples and control eligibility cases');
