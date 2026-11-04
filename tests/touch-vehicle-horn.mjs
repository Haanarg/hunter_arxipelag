import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const joystickSource=readFileSync(new URL('../src/joystick.js',import.meta.url),'utf8');
const gameCore=readFileSync(new URL('../src/game-core.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const coop=readFileSync(new URL('../src/coop-world-runtime.js',import.meta.url),'utf8');
class FakeElement{
  constructor(){this.handlers=new Map();this.attrs=new Map();this.dataset={};this.style={};
    this.textContent='';this.title='';this.captured=null;
    const names=new Set();
    this.classList={
      add:n=>names.add(n),remove:n=>names.delete(n),contains:n=>names.has(n),
      toggle:(n,force)=>{const enabled=force===undefined?!names.has(n):!!force;
        if(enabled)names.add(n);else names.delete(n);return enabled;}
    };
  }
  addEventListener(type,fn){const list=this.handlers.get(type)||[];list.push(fn);this.handlers.set(type,list);}
  dispatch(type,fields={}){const event={pointerId:0,button:0,clientX:74,clientY:74,
    preventDefault(){this.defaultPrevented=true;},...fields};
    for(const fn of this.handlers.get(type)||[])fn(event);
    return event;
  }
  setPointerCapture(id){this.captured=id;}
  getBoundingClientRect(){return {left:0,top:0,width:148,height:148};}
  setAttribute(name,value){this.attrs.set(name,String(value));}
  querySelector(sel){return this.children?.get(sel)||null;}
}

const root=new FakeElement(),knob=new FakeElement();
root.children=new Map([['.joy-knob',knob]]);
const horn=new FakeElement(),icon=new FakeElement(),label=new FakeElement();
horn.children=new Map([['.horn-icon',icon],['.horn-label',label]]);
const body=new FakeElement(),audio=[],alerts=[],commands=[],windowEvents=new Map();
const context=vm.createContext({
  window:{HUNTER_ENEMY_PERCEPTION:{VEHICLE_SIGNAL_SOUNDS:{
    cotxe:'hornCar',cotxe_civil:'hornCar',camio:'hornTruck',
    moto:'hornMoto',bici:'bikeBell'
  }},HUNTER_STEALTH:{emit:(...args)=>alerts.push(args)}},
  document:{body,getElementById:id=>id==='vehicleHornButton'?horn:null},
  addEventListener:(name,fn)=>windowEvents.set(name,fn),
  root,started:true,paused:false,over:false,hp:10,
  cv:{t:'cotxe',x:2,z:3,o:{position:{y:1}}},
  playerFall:null,playerEject:null,scopeActive:false,nativeCoopSession:null,
  K:{},P:{y:0},snd:(...args)=>audio.push(args)
});
vm.runInContext(joystickSource,context);
const joystick=vm.runInContext('window.HUNTER_JOYSTICK.create(root)',context);
context.joystick=joystick;
const first=gameCore.indexOf('// Botó independent del joystick:');
const last=gameCore.indexOf('function readPlayerControls(',first);
assert.ok(first>=0&&last>first,'the horn code must be separate from movement');
const hornSource=gameCore.slice(first,last);
assert.ok(!hornSource.includes('joystick.state.running'),
  'horn is not activated by sliding the joystick into the running zone');
vm.runInContext(hornSource,context);
const update=()=>vm.runInContext('updateVehicleSpecialAction()',context);

joystick.setVehicleMode('cotxe');
joystick.setRunEnabled(true);
root.dispatch('pointerdown',{pointerId:7});
root.dispatch('pointermove',{pointerId:7,clientX:80,clientY:-18});
assert.equal(joystick.state.running,false,'vehicle joystick may not trigger the run/special action');
assert.equal(audio.length,0,'driving the joystick cannot make a horn sound');
update();
assert.equal(body.classList.contains('vehicle-horn-active'),true);
assert.equal(label.textContent,'CLÀXON');
assert.equal(icon.textContent,'📣');
const down=horn.dispatch('pointerdown',{pointerId:8});
assert.equal(down.defaultPrevented,true);
assert.equal(audio.length,1,'immediate horn: short presses between frames count');
assert.equal(alerts.length,1,'horn makes an enemy-alerting noise');
assert.equal(joystick.state.active,true,'holding the horn does not release joystick steering');
root.dispatch('pointermove',{pointerId:7,clientX:130,clientY:74});
assert.ok(joystick.state.x>.5,'steering responds while the independent horn is held');
update();update();
assert.equal(audio.length,1,'no repeated horn when held');
horn.dispatch('pointerup',{pointerId:8});
assert.equal(horn.attrs.get('aria-pressed'),'false');
horn.dispatch('pointerdown',{pointerId:9});
assert.equal(audio.length,2,'a fresh press produces a fresh signal');
horn.dispatch('pointercancel',{pointerId:9});
root.dispatch('pointerup',{pointerId:7});

context.cv={t:'bici',x:5,z:6,o:{position:{y:0}}};
joystick.setVehicleMode('bici');update();
assert.equal(label.textContent,'TIMBRE');
assert.equal(icon.textContent,'🔔');
horn.dispatch('pointerdown',{pointerId:10});
assert.equal(audio.at(-1)[0],'bikeBell');
horn.dispatch('pointerup',{pointerId:10});
context.paused=true;update();
assert.equal(body.classList.contains('vehicle-horn-active'),false);
horn.dispatch('pointerdown',{pointerId:11});
assert.equal(audio.length,3,'paused game cannot emit horn noises');
context.paused=false;

context.cv={t:'camio',x:10,z:0,o:{position:{y:1}}};
context.nativeCoopSession={
  gameOver:false,state:{status:'running'},
  channel:{inventory:(...args)=>{commands.push(args);return true;}}
};
update();
horn.dispatch('pointerdown',{pointerId:12});
assert.equal(audio.at(-1)[0],'hornTruck');
assert.equal(commands.length,1,'COOP server must be notified once');
assert.equal(commands[0].join(','),'signal,vehicle');
horn.dispatch('pointerup',{pointerId:12});
context.K.ShiftLeft=true;update();update();
assert.equal(commands.length,2,'Shift remains a valid one-shot keyboard shortcut');
context.K.ShiftLeft=false;update();
context.cv=null;update();
assert.equal(body.classList.contains('vehicle-horn-active'),false);

joystick.setVehicleMode(null);joystick.setRunEnabled(true);
root.dispatch('pointerdown',{pointerId:15});
root.dispatch('pointermove',{pointerId:15,clientX:74,clientY:-20});
assert.equal(joystick.state.running,true,'the on-foot run/swim joystick extension still works');
root.dispatch('pointerup',{pointerId:15});

assert.ok(html.indexOf('id="vehicleHornButton"')>html.indexOf('id="joystick"'),
  'the horn button is a sibling outside the joystick element');
assert.ok(html.includes('body.vehicle-horn-active #vehicleHornButton{display:flex}'),
  'dedicated button is visible only in touch mode with supported vehicle');
assert.ok(!html.includes('class="special-label"'),
  'obsolete integrated special-action control is removed');
assert.ok(coop.includes('joystick.setRunEnabled(!cv&&'),
  'COOP joystick also disables the run extension in vehicles');
console.log('Vehicle touch horn: multitouch, one-shot sound, bicycle bell, COOP, pause and on-foot run OK');
