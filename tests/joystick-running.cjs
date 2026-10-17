#!/usr/bin/env node
// Regressió: cursa dins el mateix joystick i transicions sense botó independent.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const events=new Map(),classes=new Set(),knob={style:{}};
const root={
  querySelector:()=>knob,
  getBoundingClientRect:()=>({left:100,top:100,width:148,height:148}),
  classList:{
    toggle:(name,on)=>on?classes.add(name):classes.delete(name),
    remove:name=>classes.delete(name)
  },
  addEventListener:(name,fn)=>events.set(name,fn),
  setPointerCapture:()=>{}
};
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/joystick.js'),'utf8'),context);
const joystick=context.window.HUNTER_JOYSTICK.create(root);
const fire=(type,x,y,id=1)=>{
  const fn=events.get(type);assert.ok(fn,'Listener missing: '+type);
  fn({pointerId:id,clientX:x,clientY:y,preventDefault:()=>{}});
};
joystick.setRunEnabled(true);
assert.ok(classes.has('run-enabled'));
fire('pointerdown',174,174);
fire('pointermove',174,125);
assert.equal(joystick.state.running,false,'Dins el cercle només camina');
assert.ok(joystick.state.y<0);
fire('pointermove',174,94);
assert.equal(joystick.state.running,true,'Fora per dalt corre');
assert.equal(joystick.state.y,-1);
assert.ok(classes.has('running'));
fire('pointermove',248,94);
assert.equal(joystick.state.running,false,'Fora pels costats no corre');
fire('pointermove',174,94);
joystick.setRunEnabled(false);
assert.equal(joystick.state.running,false,'L'estat de vehicle/mira desactiva córrer');
assert.ok(!classes.has('run-enabled'));
joystick.setRunEnabled(true);
fire('pointerup',174,94);
assert.equal(joystick.state.active,false);
assert.equal(joystick.state.running,false);
assert.equal(joystick.state.y,0);
assert.ok(!classes.has('running'));
console.log('OK joystick: caminar, córrer, límits, inhabilitació i alliberament');
