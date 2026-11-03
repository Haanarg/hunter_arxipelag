import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const markup={value:''};
const nodes=new Map();
const document={
 getElementById(id){
   assert.ok(markup.value.includes('id="'+id+'"'), 'Missing pause control '+id);
   if(!nodes.has(id))nodes.set(id,{style:{},checked:false,disabled:false,
     textContent:'',onclick:null,onchange:null});
   return nodes.get(id);
 }
};
const panel={style:{},querySelector(){return {classList:{toggle(){}}}}};
const body={get innerHTML(){return markup.value;},
 set innerHTML(value){markup.value=value;nodes.clear();}};
const title={textContent:''},resumeButton={style:{}};
const window={HUNTER_COMBAT_BALANCE:{player:25}};
vm.runInNewContext(get('src/ui.js'),{window,document,performance:{now:()=>0}});
let ui,muted=null,autosave=null;
const state={
 started:true,autosave:{enabled:true,message:'Desament disponible'},muted:false,
 cheats:{items:false,invisible:false,immune:false,fly:false},
 palmsDisabled:false,waterDisabled:false,shadowsDisabled:false,
 performanceStatsVisible:false,stealthLayers:{sight:false,noise:false},
 performance:{fps:60,drawCalls:90,drawCategories:{terrain:20}}
};
let resumed=0;
const actions={
 resume(){resumed++;},open(mode){ui.show(mode);},
 setAutosave(value){autosave=value;},
 setAudioMuted(value){muted=value;},
 setPalmsDisabled(){},setWaterDisabled(){},setShadowsDisabled(){},
 setPerformanceStatsVisible(){},setStealthLayer(){},setCheat(){return true;}
};
ui=window.HUNTER_UI.create({hud:{innerHTML:''},panel,title,body,resumeButton,
 minimap:{},getState:()=>state,actions});
ui.show('pause');
assert.equal(ui.getMode(),'pause');
for(const id of ['pauseContinue','keysMenu','accountMenu','savesMenu',
 'autosaveEnabledPause','restartMenu','performanceMenu','chetosMenu'])document.getElementById(id);
assert.doesNotMatch(markup.value,/id="historyMenu"|Compte \/ núvol|\? ambre|contacte · ◇/i);
assert.match(markup.value,/class="pause-joker"/);
assert.ok(markup.value.indexOf('id="savesMenu"')<markup.value.indexOf('id="autosaveEnabledPause"'));
const autosaveToggle=document.getElementById('autosaveEnabledPause');
assert.equal(autosaveToggle.checked,true);
autosaveToggle.checked=false;autosaveToggle.onchange();
assert.equal(autosave,false);
document.getElementById('keysMenu').onclick();
assert.equal(ui.getMode(),'keys');
assert.equal(title.textContent,'Tecles i controls');
assert.match(markup.value,/WASD \/ fletxes/);
assert.match(markup.value,/ESC \/ P/);
assert.match(markup.value,/1–7 \/ V/);
document.getElementById('keysBack').onclick();
assert.equal(ui.getMode(),'pause');
document.getElementById('performanceMenu').onclick();
assert.equal(ui.getMode(),'performance');
assert.equal(title.textContent,'Opcions');
assert.match(markup.value,/id="audioEnabledPause"/);
const sound=document.getElementById('audioEnabledPause');
sound.checked=false;sound.onchange();
assert.equal(muted,true);
assert.match(markup.value,/<details class="pause-diagnostics">/);
document.getElementById('performanceBack').onclick();
assert.equal(ui.getMode(),'pause');
document.getElementById('chetosMenu').onclick();
assert.equal(ui.getMode(),'cheats');
document.getElementById('cheatsBack').onclick();
assert.equal(ui.getMode(),'pause');
document.getElementById('pauseContinue').onclick();
assert.equal(resumed,1);
const engine=get('src/game-core.js');
assert.ok(engine.includes("if(c==='Escape'||c==='KeyP')"));
assert.ok(engine.includes("ui?.getMode?.()!=='pause'"));
assert.ok(engine.includes("if(!paused)panel('pause');"));
const html=get('index.html');
assert.match(html,/#gamepanel \.card\.pause-card\{/);
assert.match(html,/#gamepanel \.pause-card button\.pause-joker\{/);
console.log('Pause menu navigation, buttons, Esc fallback and gold styling verified');
