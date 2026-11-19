import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {readFileSync} from 'node:fs';

const callbacks=[],listeners={};
const el=tag=>({
 tagName:tag,children:[],style:{},textContent:'',onclick:null,
 append(...children){this.children.push(...children)},
 setAttribute(name,value){this[name]=value}
});
const body=el('body');
const ctx={URLSearchParams,location:{search:'?avatarAudit=1'},
  document:{body,createElement:el},
  requestAnimationFrame:fn=>callbacks.push(fn),
  window:{HUNTER_READY:false,HUNTER_VERSION:'0.6.249',
    addEventListener:(name,fn)=>{listeners[name]=fn}}
};
runInNewContext(readFileSync(new URL('../src/avatar-audit-boot.js',import.meta.url),'utf8'),ctx);
const audit=ctx.window.HUNTER_AVATAR_AUDIT;
assert(audit,'Panell carregat sense Three.js ni el motor del joc');
function frame(t){const fn=callbacks.shift();assert(fn);fn(t)}
frame(0);
assert.match(audit.readout.textContent,/Càrrega real: en curs/);
audit.paint('Carregant el motor 3D…');
ctx.window.HUNTER_READY=true;ctx.window.HUNTER_RUNTIME_MODE='bundle';
frame(350);
assert.match(audit.readout.textContent,/Sonda del joc: NO CONNECTADA/);
assert.match(audit.readout.textContent,/ALERTA: el motor juga/);
const j={hipL:{rotation:{x:0.15}},hipR:{rotation:{x:-0.17}},
 shoulderR:{rotation:{x:0.18}}};
const rig={visible:true,traverse(fn){fn({isMesh:true,castShadow:true})}};
const player={visible:true,userData:{
 humanGameCanonicalRig:rig,humanGameCanonicalJoints:j,
 humanGamePose(){},gameLandMove:1,gameSwimBlend:.25,
 gameSwimStyle:'B3',ph:1.45,runBlend:.1
}};
audit.attach({player,quality:'desktop',
 state:()=>({started:true,paused:false,swimming:true,frames:71,poseCalls:40}),
 shadow:()=>({enabled:true,sun:true,disabled:false,playerCasters:1,active:2})});
frame(700);
assert.match(audit.readout.textContent,/Sonda del joc: CONNECTADA/);
assert.match(audit.readout.textContent,/V18: true/);
assert.match(audit.readout.textContent,/Malucs L\/R: 0.15 \/ -0.17/);
assert.match(audit.readout.textContent,/Ombres: mapa=true sol=true/);
const button=audit.panel.children[2];button.onclick();
frame(1050);
assert.match(audit.readout.textContent,/Prova forçada: ACTIVADA/);
assert.equal(audit.forced,true);
assert.equal(typeof listeners.error,'function');
console.log('PASS avatar audit: loader independent, ready without runtime probe, live V18/shadow state, forced toggle');
