'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const core=fs.readFileSync(path.join(__dirname,'../src/game-core.js'),'utf8');
assert.match(html,/#mm\{[^}]*pointer-events:auto[^}]*touch-action:manipulation/);
assert.match(html,/<canvas id="mm"[^>]*role="button"[^>]*tabindex="0"/);
const begin=core.indexOf("mc.addEventListener('click',e=>{");
const end=core.indexOf('\nfunction vehicleImpactFx(',begin);
assert(begin>=0&&end>begin,'interactive minimap listener available');
const handler=core.slice(begin,end);
function scenario(started,over,generating){
  let opened=0;
  const listeners={};
  const mc={
    addEventListener:(name,fn)=>{listeners[name]=fn},
    click:()=>listeners.click({preventDefault(){},stopPropagation(){}})
  };
  const build=new Function('mc','panel','started','over','generationPromise',handler);
  build(mc,mode=>{assert.equal(mode,'map');opened++},started,over,generating);
  listeners.click({preventDefault(){},stopPropagation(){}});
  const clickOpened=opened;
  let prevented=false,stopped=false;
  listeners.keydown({code:'Enter',repeat:false,
    preventDefault(){prevented=true},stopPropagation(){stopped=true}});
  assert(prevented&&stopped,'keyboard activation is consumed');
  listeners.keydown({code:'Space',repeat:false,
    preventDefault(){},stopPropagation(){}});
  listeners.keydown({code:'KeyW',repeat:false,
    preventDefault(){throw new Error('unrelated key prevented')},
    stopPropagation(){throw new Error('unrelated key stopped')}});
  return {clickOpened,totalOpened:opened};
}
assert.deepEqual(scenario(true,false,null),{clickOpened:1,totalOpened:3});
assert.deepEqual(scenario(false,false,null),{clickOpened:0,totalOpened:0});
assert.deepEqual(scenario(true,true,null),{clickOpened:0,totalOpened:0});
assert.deepEqual(scenario(true,false,{}),{clickOpened:0,totalOpened:0});
console.log('OK minimap mouse, touch click and keyboard open the full map only during play');
